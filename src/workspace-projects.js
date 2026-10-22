// Host-owned projects and source registrations. Execution/authorization stays in context and runs.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicJSON, readJSON } from './files.js';
import { revision } from './schedules.js';
import { SettingsStore } from './settings.js';
import { ContextStore, discoveryExclusions } from './context.js';
import { chatMembership } from '../public/chat-membership.js';
import { resolvePreviewProject, remapPreviewProjectSession, remapPreviewBrowserPlacement } from '../public/preview-project-placement.js';
const scope = () => ({libraryFolders:[],universalFolders:[],documents:[],modes:{},favorites:[],workspaceFiles:[],defaults:{includeDefaults:false,selectedIds:[]},discovery:{exclusions:[...discoveryExclusions],inclusions:[],maxFolders:60000},approvals:{mode:'ask',folders:[],rules:[],readOnlyTools:false}});
const canonicalFolder = value => {
  if (typeof value !== 'string' || !path.isAbsolute(value) || !fs.statSync(value).isDirectory()) throw new Error('Choose an existing absolute folder.');
  return fs.realpathSync(value);
};
const validName = value => { if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error('Choose a name of 1–200 characters.'); return value.trim(); };

export class WorkspaceProjects {
  constructor(home,context,{isolatedPreview=false,marker=null}={}) {
    this.marker=marker;this.isolatedPreview=isolatedPreview;this.home=home;this.context=context;this.file=path.join(home,isolatedPreview?'preview-projects.json':'projects.json');
    if(!isolatedPreview)this.migrate();
    this.libraryHome=path.join(home,isolatedPreview?'preview-source-library':'source-library');
    this.emptyRoot=path.join(this.libraryHome,'empty');fs.mkdirSync(this.emptyRoot,{recursive:true,mode:0o700});
    this.library=new ContextStore(this.libraryHome,new SettingsStore(this.libraryHome,this.emptyRoot),{skipRefresh:true});
    const get=context.get.bind(context),refresh=context.refreshAsync.bind(context),capture=context.capture.bind(context);
    context.get=(workspaceId,options)=>{
      const catalog=get(workspaceId,options),projects=this.read(),ids=new Set(catalog.entries.map(entry=>entry.id));
      const external=this.sourceEntries(projects).filter(entry=>!ids.has(entry.id)).map(entry=>({...entry,defaultMode:entry.kind==='mcp'?'disabled':'available',mode:catalog.modes[entry.id]||(entry.kind==='mcp'?'disabled':'available')}));
      const sourceLibraryRoots=projects.sourceLibrary.filter(source=>!source.removedAt).map(source=>source.path);
      const libraryErrors=(this.library.catalog.errors||[]).filter(error=>sourceLibraryRoots.some(root=>error.path===root||error.path.startsWith(root+path.sep)));
      return {...catalog,sourceLibraryRoots,rootStatus:{...catalog.rootStatus,...Object.fromEntries(Object.entries(this.library.catalog.rootStatus||{}).filter(([root])=>sourceLibraryRoots.includes(root)))},errors:[...(catalog.errors||[]),...libraryErrors],entries:[...catalog.entries,...external]};
    };
    context.refreshAsync=async options=>{const libraryRoot=options?.root&&this.read().sourceLibrary.some(source=>!source.removedAt&&source.path===options.root);if(!libraryRoot)await refresh(options);await this.refreshSources(libraryRoot?{root:options.root}:{});return context.get(options?.workspaceId);};
    context.capture=options=>{
      const selected=context.scope(options?.workspaceId),ids=options?.selectedIds??selected.defaults.selectedIds??[];
      this.assertAvailable({selectedIds:ids,agentId:options?.agentId??selected.defaults.agentId,entries:Object.entries(selected.modes).filter(([,mode])=>mode==='universal').map(([id])=>({id}))});
      const snapshot=capture(options),base=new Set([snapshot.baseWorkspace.cwd,...snapshot.baseWorkspace.additionalDirectories]);
      // Existing configured roots keep their execution meaning. Owner library registration
      // alone never adds execution roots or permissions.
      if(!this.isolatedPreview)for(const folder of [...selected.libraryFolders,...selected.universalFolders])base.add(folder);
      if(!this.isolatedPreview)for(const entry of get(options?.workspaceId).entries)for(const root of entry.roots||[])base.add(root);
      const canonicalBase=new Set([...base].map(folder=>{try{return fs.realpathSync(folder);}catch{return folder;}}));
      snapshot.workspace={...snapshot.workspace,additionalDirectories:snapshot.workspace.additionalDirectories.filter(folder=>canonicalBase.has(folder))};
      return snapshot;
    };
    this.ensureProjects();
  }
  migrate(){
    // One additive atomic catalog commit. Never rewrite runs, schedules, context,
    // permissions, browser profiles or session/draft files during migration.
    if(fs.existsSync(this.file)){this.read();return;}
    const config=this.context.config(),createdAt=new Date().toISOString();
    const projects=config.workspaces.map(workspace=>({id:randomUUID(),workspaceId:workspace.id,name:'General',createdAt}));
    const paths=[...new Set(config.workspaces.flatMap(workspace=>[...workspace.libraryFolders,...workspace.universalFolders]))];
    const sourceLibrary=paths.map(folder=>({id:randomUUID(),path:folder,available:fs.existsSync(folder),entryIds:(this.context.catalog.entries||[]).filter(entry=>entry.roots?.includes(folder)).map(entry=>entry.id),createdAt}));
    this.write({schemaVersion:1,projects,defaultProjectIds:Object.fromEntries(projects.map(project=>[project.workspaceId,project.id])),sourceLibrary,migration:{version:1,createdAt,contextRevision:config.revision}});
  }
  read(){const value=readJSON(this.file);this.validate(value);return {...value,revision:revision(value)};}
  validate(value){
    if(value.schemaVersion!==1||!Array.isArray(value.projects)||!value.defaultProjectIds||typeof value.defaultProjectIds!=='object'||Array.isArray(value.defaultProjectIds)||!Array.isArray(value.sourceLibrary))throw new Error('Invalid project catalog.');
    const ids=new Set();
    for(const project of value.projects){if(!project||typeof project.id!=='string'||!project.id||ids.has(project.id)||typeof project.workspaceId!=='string'||!project.workspaceId||typeof project.name!=='string'||!project.name.trim())throw new Error('Invalid project catalog project.');ids.add(project.id);}
    for(const source of value.sourceLibrary)if(!source||typeof source.id!=='string'||!source.id||!path.isAbsolute(source.path||'')||!Array.isArray(source.entryIds))throw new Error('Invalid source registration.');
  }
  write(value){const clean=structuredClone(value);delete clean.revision;this.validate(clean);atomicJSON(this.file,clean);return this.read();}
  remapBrowserPlacement(value){return remapPreviewBrowserPlacement(value,this.read());}
  reconcileProjectMoves(engine){
    const catalog=this.read();
    for(const [id,moves] of Object.entries(catalog.projectMoves||{})){
      const project=catalog.projects.find(row=>row.id===id);if(!project)continue;
      for(const move of moves)for(const runId of move.chatIds||[]){
        let run;try{run=engine.getRun(runId);}catch{continue;}
        if(run.projectId&&run.projectId!==id||chatMembership(run).workspaceId!==move.from||run.projectMoveReceipts?.includes(move.id))continue;
        run.initialSchedule??=structuredClone(run.schedule);
        if(run.schedule.context)run.schedule.context={...run.schedule.context,followsWorkspace:false};
        run.workspaceMoves??=[];run.workspaceMoves.push({from:move.from,to:move.to,fromProjectId:id,toProjectId:id,at:move.at});
        run.projectMoveReceipts=[...(run.projectMoveReceipts||[]),move.id];
        run.projectId=id;run.projectName=project.name;run.workspaceId=move.to;run.workspaceName=move.workspaceName;engine.persist(run);
      }
    }
  }
  async reconcileContentTabs(tabs,engine){
    this.reconcileProjectMoves(engine);
    const catalog=this.read();
    // Durable catalog redirects are the retry receipt. A failed relocation can be
    // resumed on restart without reopening a resource or replaying a terminal.
    for(const tab of tabs.list({scope:'project'})){
      const target=resolvePreviewProject(catalog,tab.scopeId);
      if(!target||target.id===tab.scopeId)continue;
      await tabs.moveAsync({scope:'project',id:tab.scopeId,tabId:tab.id,expectedRevision:tabs.get('project',tab.scopeId).revision,destination:{scope:'project',id:target.id,expectedRevision:tabs.get('project',target.id).revision}});
    }
    // Placement order belongs to the saved navigation, not newest-first runs.
    // Take the complete source sequence before any relocation removes entries.
    const runs=new Map(engine.listRuns().map(run=>[run.id,run])),changes=[],membershipCatalog=this.read();
    for(const tab of tabs.list({type:'chat'})){
      if(!['workspace','project'].includes(tab.scope))continue;
      const run=runs.get(tab.chatId);if(!run)continue;
      const member=this.membership(run,membershipCatalog);
      if(member.projectId)changes.push({chatId:run.id,...member,name:run.title});
    }
    tabs.rehouseChats(changes,{preserveMain:true});
  }
  remapSession(value){
    if(!value||!Array.isArray(value.tabs))return value;
    const {catalog}=this.snapshot();
    const session=remapPreviewProjectSession(value,catalog),roots=new Set(session.tabs.map(tab=>tab.id)),required=new Map();
    const tabs=session.tabs.map(tab=>{
      // Keep optional resources directly under a workspace. Only chat views gain
      // default project placement; child resource origins and parents stay intact.
      if(tab.type!=='run'||tab.hostId||typeof tab.parentId!=='string'||!tab.parentId.startsWith('workspace:local:'))return tab;
      const workspaceId=tab.parentId.slice('workspace:local:'.length),project=catalog.projects.find(row=>row.id===catalog.defaultProjectIds[workspaceId]&&row.workspaceId===workspaceId);
      if(!project)return tab;
      const parentId='project:local:'+project.id;required.set(parentId,project);
      return {...tab,parentId,workspaceId,projectId:project.id};
    });
    for(const [id,project] of required)if(!roots.has(id)){
      const index=tabs.findIndex(tab=>tab.parentId===id);
      tabs.splice(index<0?tabs.length:index,0,{id,type:'workspace',workspaceId:project.workspaceId,projectId:project.id,label:project.name,workspacePage:'chats'});
    }
    const selectedChildren={...(session.selectedChildren||{})};
    for(const [id,project] of required){const parent='workspace:local:'+project.workspaceId,selected=selectedChildren[parent];if(tabs.some(tab=>tab.parentId===id&&tab.id===selected)){selectedChildren[id]??=selected;selectedChildren[parent]=id;}}
    return {...session,tabs,...(session.selectedChildren?{selectedChildren}:{})};
  }
  check(expectedRevision){const value=this.read();if(expectedRevision!==value.revision)throw new Error('Project catalog changed. Refresh before saving.');return value;}
  // Request-local snapshots share a fresh catalog/configuration only for this synchronous projection.
  // Nothing is retained across requests; mutation revision checks still reread disk.
  snapshot(){const config=this.context.config();return {config,catalog:this.ensureProjects(config)};}
  ensureProjects(config=this.context.config(),value=this.read()){
    let changed=false;
    for(const workspace of config.workspaces)if(!value.projects.some(project=>project.id===value.defaultProjectIds[workspace.id]&&project.workspaceId===workspace.id)){
      const project={id:randomUUID(),workspaceId:workspace.id,name:'General',createdAt:new Date().toISOString()};value.projects.push(project);value.defaultProjectIds[workspace.id]=project.id;changed=true;
    }
    return changed?this.write(value):value;
  }
  sourceEntries(catalog=this.read()){const active=new Set(catalog.sourceLibrary.filter(source=>!source.removedAt).map(source=>source.path));return this.library.catalog.entries.filter(entry=>entry.roots.some(root=>active.has(root)));}
  assertAvailable(snapshot){
    const ids=new Set([...(snapshot?.selectedIds||[]),...(snapshot?.entries||[]).map(entry=>entry.id),snapshot?.agentId].filter(Boolean));
    const available=new Set(this.sourceEntries().filter(entry=>!entry.missing&&entry.roots.some(root=>fs.existsSync(root))).map(entry=>entry.id));
    for(const source of this.read().sourceLibrary.filter(source=>source.removedAt||source.available===false))if(source.entryIds.some(id=>ids.has(id)&&!available.has(id)))throw new Error('A selected source registration was removed. Re-add it or explicitly remove the unavailable source selection: '+source.path);
  }
  async refreshSources(options={}) {
    // Serialize catalog preparation with worker scans. A later registration must
    // not change the root configuration underneath an earlier pending scan.
    const prior=this.sourceScan||Promise.resolve();
    const pending=prior.catch(()=>{}).then(()=>this.scanSources(options));this.sourceScan=pending;
    try{return await pending;}finally{if(this.sourceScan===pending)this.sourceScan=null;}
  }
  async scanSources({root}={}) {
    const value=this.read(),active=value.sourceLibrary.filter(source=>!source.removedAt);
    if(root&&!active.some(source=>source.path===root))throw new Error('Choose a registered source folder.');
    const workspaces=(active.length?active.map(source=>({id:source.id,name:path.basename(source.path),cwd:source.path})): [{id:'empty',name:'Empty discovery catalog',cwd:this.emptyRoot}]).map(item=>({...item,...scope(),additionalDirectories:[]}));
    atomicJSON(this.library.file,{schemaVersion:1,workspaceConfigurationVersion:1,defaultWorkspaceId:workspaces[0].id,workspaces,...scope()});
    let failure;try{await this.library.refreshAsync({...(root?{root}:{}),nestedMcp:true});}catch(error){failure=error;}
    // Read again after the asynchronous scan so concurrent catalog edits survive.
    const current=this.read(),scanned=new Set(active.filter(source=>!root||source.path===root).map(source=>source.id));let changed=false;
    for(const source of current.sourceLibrary.filter(source=>!source.removedAt&&scanned.has(source.id))){
      const entries=this.sourceEntries().filter(entry=>entry.roots.includes(source.path)),status=this.library.catalog.rootStatus?.[source.path];
      const errors=failure?[{path:source.path,message:failure.message}]:(this.library.catalog.errors||[]).filter(error=>error.path===source.path||error.path.startsWith(source.path+path.sep));
      source.available=fs.existsSync(source.path);
      if(!failure)source.entryIds=entries.map(entry=>entry.id);
      source.scan={status:failure||!source.available?'error':errors.length?'partial':entries.length?'complete':'empty',entryCount:source.entryIds.length,scannedFolders:status?.scannedFolders||0,completedAt:new Date().toISOString(),errors};changed=true;
    }
    if(changed)this.write(current);
    if(failure)throw failure;
  }
  projectFor(value={},snapshot=this.snapshot()){
    const {catalog,config}=snapshot;
    const workspaceId=value.workspaceId||config.defaultWorkspaceId;
    const project=catalog.projects.find(item=>item.id===(value.projectId||catalog.defaultProjectIds[workspaceId]));
    if(!project||!config.workspaces.some(workspace=>workspace.id===project.workspaceId))throw new Error('Project is unavailable.');
    if(value.workspaceId&&project.workspaceId!==value.workspaceId)throw new Error('Project does not belong to this workspace.');
    return project;
  }
  membership(run,catalog=this.read()){
    const member=chatMembership(run);
    const project=resolvePreviewProject(catalog,run.projectId,member.workspaceId)||catalog.projects.find(item=>item.id===catalog.defaultProjectIds[member.workspaceId]&&item.workspaceId===member.workspaceId);
    return {projectId:project?.id||null,projectName:project?.name||'',...member};
  }
  associate(run,project,engine){run.projectId=project.id;run.projectName=project.name;run.workspaceId=project.workspaceId;run.workspaceName=this.context.scope(project.workspaceId).name;engine.persist(run);return run;}
  get(engine,snapshot=this.snapshot()){
    const {catalog:value,config}=snapshot;
    const sourceLibrary=value.sourceLibrary.map(source=>({...source,usedBy:config.workspaces.filter(workspace=>{
      const ids=new Set([...(workspace.defaults.selectedIds||[]),workspace.defaults.agentId,...Object.keys(workspace.modes).filter(id=>workspace.modes[id]!=='disabled')]);
      return source.entryIds.some(id=>ids.has(id))||[...workspace.libraryFolders,...workspace.universalFolders].includes(source.path);
    }).map(({id,name})=>({id,name}))}));
    return {...value,enabled:true,label:this.marker?.label||'',sourceLibrary,sourceEntries:this.sourceEntries(value),workspaces:config.workspaces.map(workspace=>({...workspace,defaultProjectId:value.defaultProjectIds[workspace.id]})),memberships:Object.fromEntries((engine?.listRuns()||[]).map(run=>[run.id,this.membership(run,value)]))};
  }
  projects(value,engine){
    // A retry after a lost renderer acknowledgement resumes the same committed
    // reassignment. A different stale review still fails the normal revision check.
    if(value.action==='move-project'){const moves=this.read().projectMoves?.[value.projectId]||[];if(moves.some(move=>move.expectedRevision===value.expectedRevision&&move.to===value.workspaceId)){this.reconcileProjectMoves(engine);return this.get(engine);}}
    const receipt=value.action==='delete'&&this.read().projectRedirects?.[value.projectId];
    if(receipt&&receipt.expectedRevision===value.expectedRevision&&(!value.workspaceId||value.workspaceId===receipt.workspaceId))return this.get(engine);
    const catalog=this.check(value.expectedRevision);
    if(value.action==='move-chat'){
      const run=engine.getRun(value.chatId||value.id);
      if(typeof value.expectedUpdatedAt!=='string'||value.expectedUpdatedAt!==run.updatedAt)throw new Error('Chat changed. Refresh before moving.');
      const project=this.projectFor(value);
      if(this.membership(run).projectId===project.id)return this.get(engine);
      // One durable run write keeps location and captured execution settings together.
      run.initialSchedule??=structuredClone(run.schedule);
      if(run.schedule.context)run.schedule.context={...run.schedule.context,followsWorkspace:false};
      run.workspaceMoves??=[];run.workspaceMoves.push({from:chatMembership(run).workspaceId,to:project.workspaceId,fromProjectId:run.projectId||null,toProjectId:project.id,at:engine.now()});
      this.associate(run,project,engine);
      return this.get(engine);
    }
    if(value.action==='create'){
      this.context.scope(value.workspaceId);catalog.projects.push({id:randomUUID(),workspaceId:value.workspaceId,name:validName(value.name),createdAt:new Date().toISOString()});
    }else if(value.action==='reorder'){
      this.context.scope(value.workspaceId);
      if(typeof value.after!=='boolean')throw new Error('Choose a project reorder position.');
      const source=catalog.projects.find(project=>project.id===value.projectId),target=catalog.projects.find(project=>project.id===value.targetId);
      if(!source||!target||source.workspaceId!==value.workspaceId||target.workspaceId!==value.workspaceId)throw new Error('Projects can only be reordered within their current workspace.');
      if(source!==target){
        const ordered=catalog.projects.filter(project=>project.workspaceId===value.workspaceId&&project!==source);
        ordered.splice(ordered.indexOf(target)+(value.after?1:0),0,source);
        let index=0;catalog.projects=catalog.projects.map(project=>project.workspaceId===value.workspaceId?ordered[index++]:project);
      }
    }else{
      const project=catalog.projects.find(item=>item.id===value.projectId);if(!project)throw new Error('Project not found.');
      if(value.action==='move-project'){
        const destination=this.context.scope(value.workspaceId);if(destination.id===project.workspaceId)return this.get(engine);
        const from=project.workspaceId,at=new Date().toISOString();
        const chatIds=engine.listRuns().filter(run=>this.membership(run,catalog).projectId===project.id).map(run=>run.id);
        // Commit one catalog receipt first. Run membership and all saved view
        // writers reconcile this receipt on retry/startup; execution context stays put.
        catalog.projectMoves??={};catalog.projectMoves[project.id]??=[];
        catalog.projectMoves[project.id].push({id:randomUUID(),from,to:destination.id,workspaceName:destination.name,at,chatIds,expectedRevision:value.expectedRevision});
        project.workspaceId=destination.id;
        if(catalog.defaultProjectIds[from]===project.id){const replacement={id:randomUUID(),workspaceId:from,name:'General',createdAt:at};catalog.projects.push(replacement);catalog.defaultProjectIds[from]=replacement.id;}
      }
      else if(value.action==='rename')project.name=validName(value.name);
      else if(value.action==='default')catalog.defaultProjectIds[project.workspaceId]=project.id;
      else if(value.action==='delete'){
        if(value.workspaceId&&value.workspaceId!==project.workspaceId)throw new Error('Project does not belong to this workspace.');
        const target=catalog.projects.find(item=>item.id===catalog.defaultProjectIds[project.workspaceId]&&item.workspaceId===project.workspaceId);
        if(!target)throw new Error('Choose a default project before deleting this project.');
        if(target.id===project.id)throw new Error('The default project cannot be deleted. Make another project the default first.');
        // Membership resolves this durable, fixed destination without touching
        // active run files, captured settings, approval requests or activity age.
        catalog.projectRedirects??={};
        catalog.projectRedirects[project.id]={workspaceId:project.workspaceId,projectId:target.id,deletedAt:new Date().toISOString(),expectedRevision:value.expectedRevision};
        catalog.projects=catalog.projects.filter(item=>item!==project);
      }
      else throw new Error('Unknown project action.');
    }
    this.write(catalog);this.reconcileProjectMoves(engine);return this.get(engine);
  }
  async sources(value,engine){
    const catalog=this.check(value.expectedRevision);
    if(value.action==='add'){
      const folder=canonicalFolder(value.path),existing=catalog.sourceLibrary.find(source=>source.path===folder);
      if(existing){delete existing.removedAt;existing.available=true;}
      else catalog.sourceLibrary.push({id:randomUUID(),path:folder,available:true,entryIds:[],createdAt:new Date().toISOString()});
    }else if(value.action==='remove'){
      const source=catalog.sourceLibrary.find(source=>source.id===value.id);if(!source)throw new Error('Source registration not found.');
      source.available=false;source.removedAt=new Date().toISOString();
    }else if(value.action==='refresh'){
      const source=catalog.sourceLibrary.find(source=>source.id===value.id&&!source.removedAt);if(!source)throw new Error('Source registration not found.');
      await this.refreshSources({root:source.path});return this.get(engine);
    }else throw new Error('Unknown source library action.');
    this.write(catalog);await this.refreshSources();return this.get(engine);
  }
}
