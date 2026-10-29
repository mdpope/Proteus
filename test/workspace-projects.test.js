import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {cleanupStack} from './helpers/cleanup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SettingsStore} from '../src/services/settings/settings.js';
import {ContextStore} from '../src/services/workspaces/context.js';
import {WorkspaceProjects} from '../src/services/workspaces/workspace-projects.js';
import {atomicJSON} from '../src/shared/files.js';
import {codexSandbox} from '../src/providers/codex.js';
import {TabManagement} from '../src/services/workspaces/tab-management.js';
import {ContentTabs} from '../src/services/workspaces/content-tabs.js';
import {Engine} from '../src/engine.js';

test('the common typed-tab move route moves chat membership to a project without changing captured execution access',async t=>{
 const f=fixture(t),engine=new Engine(f.home,{rehearsal:{async run(){}}});f.cleanup(()=>engine.close());engine.drain=async()=>{};
 const projects=new WorkspaceProjects(f.home,f.context),contentTabs=new ContentTabs(f.home),catalog=projects.read(),source=catalog.projects[0];
 projects.projects({action:'create',workspaceId:source.workspaceId,name:'Destination',expectedRevision:catalog.revision},engine);const destination=projects.read().projects.at(-1);
 const run=engine.createRun({schemaVersion:1,id:'move-chat-fixture',name:'Synthetic chat',provider:'rehearsal',enabled:false,model:'',workspace:{cwd:f.cwd,additionalDirectories:[]},context:{workspaceId:source.workspaceId},cron:'0 9 * * 1-5',timezone:'UTC',misfire:'skip',prompt:'Synthetic test'},'chat');run.workspaceId=source.workspaceId;run.projectId=source.id;engine.persist(run);const before=structuredClone(run.schedule);
 contentTabs.mutate({scope:'project',id:source.id,expectedRevision:0,operations:[{action:'open',tab:{id:'chat-view',type:'chat',chatId:run.id,title:'Synthetic chat'}}]});
 const manager=new TabManagement({home:f.home,engine,context:f.context,contentTabs,workspaceProjects:projects});
 await manager.handle({action:'move',scope:'project',id:source.id,tabId:'chat:'+run.id,expectedRevision:contentTabs.get('project',source.id).revision,destination:{scope:'project',id:destination.id,expectedRevision:0}});
 assert.equal(run.projectId,destination.id);assert.deepEqual(run.schedule,{...before,context:{...before.context,followsWorkspace:false}});assert.equal(contentTabs.list({type:'chat'}).filter(tab=>tab.chatId===run.id).length,1);
});

function fixture(t){
 const cleanup=cleanupStack(t);
 const root=fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-project-migration-'))),home=path.join(root,'data'),cwd=path.join(root,'work'),library=path.join(root,'library');
 fs.mkdirSync(cwd);fs.mkdirSync(library);fs.writeFileSync(path.join(library,'AGENTS.md'),'# Synthetic source\nPreserve selection.');
 cleanup(()=>fs.rmSync(root,{recursive:true,force:true}));
 const settings=new SettingsStore(home,cwd),context=new ContextStore(home,settings);
 context.mutate(config=>{config.workspaces[0].libraryFolders=[library];config.workspaces[0].universalFolders=[library];config.extension={retain:true};},context.config().revision);
 const entry=context.get().entries.find(entry=>entry.path===path.join(library,'AGENTS.md'));
 context.mutate(config=>{config.workspaces[0].defaults={selectedIds:[entry.id],includeDefaults:false};config.workspaces[0].favorites=[entry.id];config.workspaces[0].approvals={mode:'custom',folders:[{path:cwd,access:'read-write'}],rules:[],readOnlyTools:false};},context.config().revision);
 return {root,home,cwd,library,settings,context,entry,cleanup};
}

test('production catalog migration is additive, idempotent and preserves source execution context and durable files',async t=>{
 const f=fixture(t),before=f.context.capture();
 const run={id:'legacy',workspaceId:'default',providerSessionId:'same-session',pending:{requestId:'pending'},draft:{text:'unsent'},events:[{role:'user',text:'synthetic'}],schedule:{workspace:before.workspace,context:before}};
 const protectedFiles=['context.json','settings.json','permissions.json','runs/legacy.json','workspace-session.json','browser-profiles.json'];
 atomicJSON(path.join(f.home,'permissions.json'),{schemaVersion:1,workspaces:[],extension:'keep'});
 atomicJSON(path.join(f.home,'runs/legacy.json'),run);atomicJSON(path.join(f.home,'workspace-session.json'),{tabs:[],drafts:{legacy:'unsent'}});atomicJSON(path.join(f.home,'browser-profiles.json'),{cookies:'synthetic'});
 const bytes=Object.fromEntries(protectedFiles.map(file=>[file,fs.readFileSync(path.join(f.home,file))]));
 const service=new WorkspaceProjects(f.home,f.context);await f.context.refreshAsync();
 const first=service.read(),project=first.projects[0];
 assert.equal(first.projects.length,1);assert.equal(first.defaultProjectIds.default,project.id);assert.equal(first.sourceLibrary[0].path,f.library);
 assert.deepEqual(service.membership(run),{projectId:project.id,projectName:'General',workspaceId:'default',workspaceName:''});
 const after=f.context.capture();for(const key of ['workspace','baseWorkspace','selectedIds','includeDefaults','configurationRevision'])assert.deepEqual(after[key],before[key]);
 assert.equal(after.entries[0].id,before.entries[0].id);
 for(const file of protectedFiles)assert.deepEqual(fs.readFileSync(path.join(f.home,file)),bytes[file],file);
 for(const file of ['desktop-preview.json','preview-projects.json','preview-codex'])assert.equal(fs.existsSync(path.join(f.home,file)),false);
 const saved=service.read();saved.extension={keep:true};service.write(saved);const catalogBytes=fs.readFileSync(service.file);
 const restarted=new WorkspaceProjects(f.home,new ContextStore(f.home,f.settings,{skipRefresh:true}));
 assert.deepEqual(fs.readFileSync(service.file),catalogBytes);assert.deepEqual(restarted.read().extension,{keep:true});assert.equal(restarted.read().projects[0].id,project.id);
 assert.throws(()=>service.projects({action:'rename',projectId:project.id,name:'Bad stale edit',expectedRevision:first.revision}),/changed/);
 assert.throws(()=>service.write({...service.read(),projects:[...service.read().projects,{id:project.id,workspaceId:'default',name:'duplicate'}]}),/Invalid/);
 assert.deepEqual(fs.readFileSync(service.file),catalogBytes);
});

test('legacy chat placement gains a project without recreating resources or altering optional workspace tabs',t=>{
 const f=fixture(t),service=new WorkspaceProjects(f.home,f.context),project=service.read().projects[0];
 const source={active:'chat-view',drafts:{chat:'retain'},extension:true,selectedChildren:{'workspace:local:default':'chat-view'},tabs:[{id:'workspace:local:default',type:'workspace',workspaceId:'default'},{id:'chat-view',type:'run',runId:'chat',parentId:'workspace:local:default',custom:'keep'},{id:'browser',type:'browser',parentId:'workspace:local:default',info:{id:'native',profile:'private'}},{id:'terminal',type:'terminal',parentId:'chat-view',sessionId:'running',startupCommand:'never replay'},{id:'doc',type:'document',parentId:'chat-view',source:{chatId:'chat',authorization:'original'}},{id:'remote',type:'run',hostId:'another',parentId:'workspace:local:default'}]};
 const before=structuredClone(source),mapped=service.remapSession(source),parent='project:local:'+project.id;
 assert.deepEqual(source,before);assert.equal(mapped.tabs.find(tab=>tab.id==='chat-view').parentId,parent);assert.equal(mapped.tabs.find(tab=>tab.id===parent).projectId,project.id);
 for(const id of ['browser','terminal','doc','remote'])assert.deepEqual(mapped.tabs.find(tab=>tab.id===id),source.tabs.find(tab=>tab.id===id));
 assert.equal(mapped.active,source.active);assert.deepEqual(mapped.drafts,source.drafts);assert.equal(mapped.selectedChildren[parent],'chat-view');
 assert.deepEqual(service.remapSession(mapped),mapped);
 assert.equal(service.membership({workspaceId:null}).projectId,null);
});

test('production owner API and remote adapter advertise projects, route creation and preserve preview isolation',async t=>{
 const f=fixture(t),{startServer}=await import('../src/server.js'),{remoteState}=await import('../src/services/remote/remote.js');
 const app=await startServer({home:f.home,port:0,timers:false,withSeed:false,providers:{rehearsal:{async run(){}}}});f.cleanup(()=>app.close());app.engine.drain=async()=>{};
 const call=async(route,value)=>{const response=await fetch(app.origin+route,{headers:{authorization:'Bearer '+app.token,'content-type':'application/json'},...(value?{method:'POST',body:JSON.stringify(value)}:{})});return {status:response.status,data:await response.json()};};
 const state=(await call('/api/state')).data;assert.equal(state.desktopPreview,undefined);assert.equal(state.workspaceProjects.enabled,true);assert.equal(app.desktopPreview,null);assert.equal(app.engine.permissions.preserveInheritedDefaults,true);
 assert.equal((await call('/api/desktop-preview')).status,404);let catalog=(await call('/api/workspace-projects')).data;
 catalog=(await call('/api/workspace-projects/projects',{action:'create',workspaceId:'default',name:'Synthetic project',expectedRevision:catalog.revision})).data;
 const project=catalog.projects.at(-1),created=(await call('/api/chat',{projectId:project.id,provider:'rehearsal',prompt:'Synthetic migration acceptance',model:''})).data;
 assert.equal(created.projectId,project.id);assert.equal(created.schedule.context.workspaceId,'default');
 assert.equal((await call('/api/chats/index')).data.items.find(row=>row.id===created.id).projectId,project.id);
 const ownerRead=app.workspaceProjects.read.bind(app.workspaceProjects);let projectionReads=0;app.workspaceProjects.read=()=>{projectionReads++;return ownerRead();};
 const permissionRead=app.engine.permissions.get.bind(app.engine.permissions);let permissionReads=0;app.engine.permissions.get=()=>{permissionReads++;return permissionRead();};
 const polled=(await call('/api/state?summaries=1')).data;
 assert.equal(permissionReads,4,'State uses two projection reads and fresh revision checks before and after the worker, independent of chat count');app.engine.permissions.get=permissionRead;
 assert.ok(app.performanceDiagnostics.snapshot().phases.some(phase=>phase.name==='http.state.assemble'&&phase.kind==='sync'));
 assert.equal(projectionReads,2,'State uses one project snapshot plus the context source-library projection');assert.equal(polled.runs.find(run=>run.id===created.id).projectId,polled.workspaceProjects.memberships[created.id].projectId);
 projectionReads=0;
 const remote=remoteState(app);assert.equal(projectionReads,2,'Remote state reuses projected memberships');app.workspaceProjects.read=ownerRead;assert.ok(remote.capabilities.includes('projects.v1'));assert.ok(remote.capabilities.includes('source-library.v1'));assert.equal(remote.workspaceProjects.memberships[created.id].projectId,project.id);
 assert.equal(codexSandbox(created.schedule,{mode:'custom',folders:[{path:f.cwd,access:'read-write'}]},{permissionControls:true}).sandbox,'workspace-write');
 const peer={device:{id:'synthetic-paired-web'}};app.remote.config.devices.push({...peer.device,resourceAccess:true,documentAccess:true});
 const execute=(method,args={})=>app.remote.execute(peer,method,args);
 assert.equal((await execute('projects.get')).revision,catalog.revision);
 let scope=await execute('tabs.get',{scope:'project',id:project.id});
 scope=await execute('tabs.mutate',{scope:'project',id:project.id,expectedRevision:scope.revision,operations:[{action:'open',tab:{id:'synthetic-browser',type:'browser',url:'https://example.com'}}]});
 scope=await execute('tabs.manage',{action:'hide',scope:'project',id:project.id,tabId:'synthetic-browser',expectedRevision:scope.revision});assert.equal(scope.tabs[0].hidden,true);
 await assert.rejects(()=>execute('tabs.get',{scope:'project',id:'missing-project'}),/unavailable/);
 const other=state.workspaceProjects.projects[0];
 await assert.rejects(()=>execute('tabs.mutate',{scope:'project',id:other.id,expectedRevision:0,operations:[{action:'open',tab:{id:created.id,type:'chat',chatId:created.id}}]}),/another project/);
 assert.equal((await execute('chat.get',{id:created.id})).projectId,project.id);
 assert.equal(fs.existsSync(path.join(f.home,'desktop-preview.json')),false);
});

test('project content scopes preserve document origins and reconcile deleted project browser history',async t=>{
 const f=fixture(t),{ContentTabs,workspaceContentScopes}=await import('../src/services/workspaces/content-tabs.js'),service=new WorkspaceProjects(f.home,f.context),tabs=new ContentTabs(f.home),engine={listRuns:()=>[]};
 const original=service.read();service.projects({action:'create',workspaceId:'default',name:'Temporary',expectedRevision:original.revision},engine);
 const catalog=service.read(),target=catalog.projects[0],source=catalog.projects[1],documentId='a'.repeat(64),file=path.join(f.cwd,'note.md');fs.writeFileSync(file,'# Synthetic document');
 atomicJSON(tabs.sourcesFile,{[documentId]:{chatId:'original-chat',file,extension:'keep'}});
 const session={tabs:[{id:'project:local:'+source.id,type:'workspace',projectId:source.id,workspaceId:'default'},{id:'viewer',type:'markdown',contentTabId:'document:'+documentId,file,associationChatId:'original-chat',parentId:'project:local:'+source.id},{id:'terminal',type:'terminal',terminal:{id:'running-session'},parentId:'project:local:'+source.id}]};
 assert.equal(workspaceContentScopes(session)[0].scope,'project');tabs.seedWorkspace(session);
 assert.equal(tabs.documentSource(source.id,documentId,'project'),file);assert.equal(JSON.parse(fs.readFileSync(tabs.sourcesFile))[documentId].chatId,'original-chat');
 let stored=tabs.get('project',source.id);tabs.mutate({scope:'project',id:source.id,expectedRevision:stored.revision,operations:[{action:'open',tab:{id:'browser',type:'browser',url:'https://example.com',history:{entries:[{url:'https://example.com',title:'Synthetic'}],index:0}}}]});
 service.projects({action:'delete',projectId:source.id,expectedRevision:catalog.revision},engine);await service.reconcileContentTabs(tabs,engine);
 const moved=tabs.get('project',target.id);assert.equal(moved.tabs.length,3);assert.equal(tabs.get('project',source.id).tabs.length,0);assert.equal(moved.tabs.find(tab=>tab.id==='terminal:running-session').terminalId,'running-session');
 assert.equal(tabs.documentSource(target.id,documentId,'project'),file);assert.equal(JSON.parse(fs.readFileSync(tabs.sourcesFile))[documentId].chatId,'original-chat');
 const bytes=fs.readFileSync(tabs.file);await service.reconcileContentTabs(tabs,engine);assert.deepEqual(fs.readFileSync(tabs.file),bytes);
});

test('production synchronized navigation retains more than one hundred legacy resources and refuses overflow without truncation',t=>{
 const f=fixture(t),service=new WorkspaceProjects(f.home,f.context),project=service.read().projects[0];
 return import('../src/services/workspaces/content-tabs.js').then(({ContentTabs})=>{
  const tabs=new ContentTabs(f.home),session={tabs:[{id:'project:local:'+project.id,type:'workspace',projectId:project.id,workspaceId:'default'},...Array.from({length:120},(_,i)=>({id:'browser-'+i,type:'browser',url:'https://example.com/'+i,parentId:'project:local:'+project.id}))]};
  tabs.seedWorkspace(session);assert.equal(tabs.get('project',project.id).tabs.length,120);const bytes=fs.readFileSync(tabs.file);tabs.seedWorkspace(session);assert.deepEqual(fs.readFileSync(tabs.file),bytes);
  const tooMany={tabs:[{id:'workspace:local:overflow',type:'workspace',workspaceId:'overflow'},...Array.from({length:1001},(_,i)=>({id:'overflow-'+i,type:'browser',url:'https://example.com/'+i,parentId:'workspace:local:overflow'}))]};
  assert.throws(()=>tabs.seedWorkspace(tooMany),/limit/);assert.deepEqual(fs.readFileSync(tabs.file),bytes);
 });
});

test('project migration retires top-level chat aliases while retaining child registries and their revisions',async t=>{
 const f=fixture(t),{ContentTabs}=await import('../src/services/workspaces/content-tabs.js'),service=new WorkspaceProjects(f.home,f.context),tabs=new ContentTabs(f.home),project=service.read().projects[0];
 const chat={id:'saved-chat',title:'Synthetic',workspaceId:'default'},browser={id:'browser',type:'browser',title:'Retained',url:'https://example.test/'};
 atomicJSON(tabs.file,{schemaVersion:1,scopes:{'main:main':{revision:680,desktopSeedVersion:2,tabs:[{id:'chat:saved-chat',type:'chat',chatId:chat.id,title:chat.title}]},'chat:saved-chat':{revision:42,desktopSeedVersion:2,tabs:[browser]},'workspace:default':{revision:7,desktopSeedVersion:2,tabs:[{id:'chat:saved-chat',type:'chat',chatId:chat.id,title:chat.title}]}}});
 const main=tabs.get('main','main'),children=tabs.get('chat',chat.id);
 await service.reconcileContentTabs(tabs,{listRuns:()=>[chat]});
 assert.equal(tabs.get('main','main').tabs.length,0);assert.equal(tabs.get('main','main').revision,main.revision+1);assert.deepEqual(tabs.get('chat',chat.id),children);
 assert.equal(tabs.get('workspace','default').tabs.length,0);assert.equal(tabs.get('project',project.id).tabs[0].chatId,chat.id);
 const bytes=fs.readFileSync(tabs.file);await service.reconcileContentTabs(tabs,{listRuns:()=>[chat]});assert.deepEqual(fs.readFileSync(tabs.file),bytes);
});

test('workspace chat migration preserves saved order instead of newest-first run order in one registry commit',async t=>{
 const f=fixture(t),{ContentTabs}=await import('../src/services/workspaces/content-tabs.js'),service=new WorkspaceProjects(f.home,f.context),tabs=new ContentTabs(f.home),project=service.read().projects[0];
 const a={id:'older',title:'Older first',workspaceId:'default'},b={id:'newer',title:'Newer second',workspaceId:'default'},chat=run=>({id:'chat:'+run.id,type:'chat',chatId:run.id,title:run.title}),browser={id:'between',type:'browser',title:'Direct workspace resource',url:'https://example.test/'};
 atomicJSON(tabs.file,{schemaVersion:1,scopes:{'main:main':{revision:680,desktopSeedVersion:2,tabs:[chat(b),chat(a)]},'workspace:default':{revision:70,desktopSeedVersion:2,tabs:[chat(a),browser,chat(b)]},'chat:older':{revision:42,tabs:[{...browser,id:'child'}]}}});
 const main=tabs.get('main','main'),child=tabs.get('chat',a.id),write=tabs.write.bind(tabs);let writes=0;tabs.write=data=>{writes++;write(data);};
 await service.reconcileContentTabs(tabs,{listRuns:()=>[b,a]});
 assert.deepEqual(tabs.get('project',project.id).tabs.map(tab=>tab.chatId),[a.id,b.id]);assert.deepEqual(tabs.get('workspace','default').tabs,[browser]);assert.equal(tabs.get('main','main').tabs.length,0);assert.equal(tabs.get('main','main').revision,main.revision+2);assert.deepEqual(tabs.get('chat',a.id),child);assert.equal(writes,1,'Whole relocation has one atomic registry commit');
 const bytes=fs.readFileSync(tabs.file);await service.reconcileContentTabs(tabs,{listRuns:()=>[b,a]});assert.deepEqual(fs.readFileSync(tabs.file),bytes);assert.equal(writes,1);
});

test('ordered chat relocation validation failure preserves every original scope and revision',async t=>{
 const f=fixture(t),{ContentTabs}=await import('../src/services/workspaces/content-tabs.js'),tabs=new ContentTabs(f.home),chat=id=>({id:'chat:'+id,type:'chat',chatId:id,title:id});
 atomicJSON(tabs.file,{schemaVersion:1,scopes:{'workspace:default':{revision:70,tabs:[chat('a'),chat('b')]},'project:target':{revision:3,tabs:Array.from({length:999},(_,i)=>chat('existing-'+i))}}});
 const before=fs.readFileSync(tabs.file);assert.throws(()=>tabs.rehouseChats([{chatId:'a',projectId:'target'},{chatId:'b',projectId:'target'}],{preserveMain:true}),/too many/);assert.deepEqual(fs.readFileSync(tabs.file),before);
});

test('inactive legacy workspace selection migrates through native save to project and original chat',async t=>{
 const f=fixture(t),service=new WorkspaceProjects(f.home,f.context),{default:{WorkspaceSession}}=await import('../desktop/windows/workspace-session.cjs'),parent='workspace:local:default',project='project:local:'+service.read().defaultProjectIds.default;
 const store=new WorkspaceSession(f.home,{projects:true,remap:value=>service.remapSession(value)}),source={active:'terminal',tabs:[{id:parent,type:'workspace',workspaceId:'default'},{id:'chat-view',type:'run',runId:'chat',parentId:parent},{id:'terminal',type:'terminal',terminal:{id:'pty'}}],selectedChildren:{[parent]:'chat-view'}};
 store.save(source);const saved=store.get();assert.equal(saved.active,'terminal');assert.equal(saved.selectedChildren[parent],project);assert.equal(saved.selectedChildren[project],'chat-view');assert.equal(saved.tabs.find(tab=>tab.id==='chat-view').parentId,project);assert.deepEqual(store.get(),saved);
});

test('project projection reads one fresh catalog and context regardless of chat count',t=>{
 const f=fixture(t),service=new WorkspaceProjects(f.home,f.context),initial=service.read();
 initial.extension={retained:'x'.repeat(192*1024)};
 initial.sourceLibrary.push(...Array.from({length:128},(_,i)=>({id:'synthetic-source-'+i,path:path.join(f.root,'source-'+i),entryIds:Array.from({length:16},(_,j)=>'entry-'+i+'-'+j)})));
 service.write(initial);
 const read=service.read.bind(service),config=f.context.config.bind(f.context);let reads=0,configs=0;
 service.read=()=>{reads++;return read();};f.context.config=()=>{configs++;return config();};
 for(const count of [25,248]){
  reads=0;configs=0;
  const runs=Array.from({length:count},(_,i)=>({id:'synthetic-'+i,workspaceId:'default'}));
  const result=service.get({listRuns:()=>runs});
  assert.equal(reads,1);assert.equal(configs,1);assert.equal(Object.keys(result.memberships).length,count);
  for(const run of runs)assert.equal(result.memberships[run.id].projectId,initial.defaultProjectIds.default);
  assert.deepEqual(result.extension,initial.extension);
 }
});

test('request-local project snapshots retain revision checks and observe disk changes and fixed deletion redirects',t=>{
 const f=fixture(t),service=new WorkspaceProjects(f.home,f.context),initial=service.get(),general=initial.projects[0];
 const runs=[{id:'legacy',workspaceId:'default'},{id:'unhoused',workspaceId:null}],engine={listRuns:()=>runs};
 const old=service.snapshot(),external={...initial,extension:{keep:'out-of-band'},projects:[{...general,name:'Changed outside client'},{id:'temporary',workspaceId:'default',name:'Temporary'}]};
 delete external.revision;delete external.memberships;delete external.workspaces;delete external.sourceEntries;delete external.enabled;delete external.label;
 atomicJSON(service.file,external);
 assert.equal(service.membership(runs[0],old.catalog).projectName,'General','A captured projection remains internally consistent');
 const fresh=service.get(engine);
 assert.equal(fresh.memberships.legacy.projectName,'Changed outside client');assert.equal(fresh.memberships.unhoused.projectId,null);assert.deepEqual(fresh.extension,{keep:'out-of-band'});
 assert.throws(()=>service.projects({action:'rename',projectId:general.id,name:'Stale overwrite',expectedRevision:old.catalog.revision},engine),/changed/);
 runs.push({id:'moved',workspaceId:'default',projectId:'temporary',pending:{id:'unchanged'},providerSessionId:'same'});const runBytes=JSON.stringify(runs);
 const deleted=service.projects({action:'delete',projectId:'temporary',workspaceId:'default',expectedRevision:fresh.revision},engine);
 assert.equal(deleted.memberships.moved.projectId,general.id);assert.equal(JSON.stringify(runs),runBytes);
 const changedDefault={...service.read(),projects:[...service.read().projects,{id:'later-default',workspaceId:'default',name:'Later default'}],defaultProjectIds:{default:'later-default'}};
 delete changedDefault.revision;atomicJSON(service.file,changedDefault);
 const next=service.get(engine);
 assert.equal(next.memberships.legacy.projectId,'later-default');assert.equal(next.memberships.moved.projectId,general.id,'Deletion redirects remain at their original receiving project');
 assert.equal(service.projectFor({workspaceId:'default'}).id,'later-default');
 assert.deepEqual(next.extension,{keep:'out-of-band'});
 // A context file changed by another client is read on the next projection too.
 const context=f.context.config();context.workspaces[0].name='New owner name';delete context.revision;atomicJSON(f.context.file,context);
 assert.equal(service.get(engine).workspaces[0].name,'New owner name');
});

test('whole-project move retains sessions, approval origin, archived chats and replays only unfinished membership receipts',async t=>{
 const f=fixture(t),service=new WorkspaceProjects(f.home,f.context);f.context.mutate(config=>{config.workspaces.push({...structuredClone(config.workspaces[0]),id:'destination',name:'Destination',defaults:{selectedIds:[],includeDefaults:true}});},f.context.config().revision);service.ensureProjects();
 const catalog=service.read(),project=catalog.projects[0],snapshot=f.context.capture();const runs=[false,true].map((archived,i)=>({id:'move-'+i,projectId:project.id,workspaceId:project.workspaceId,providerSessionId:'native-'+i,archivedAt:archived?'2026-01-01T00:00:00Z':null,pending:{id:'approval-'+i},schedule:{provider:'codex',workspace:snapshot.workspace,context:structuredClone(snapshot)},events:[],draft:{text:'retain'}}));
 let writes=0;const engine={listRuns:()=>runs,getRun:id=>runs.find(r=>r.id===id),persist:()=>{writes++;}};
 const before=runs.map(r=>({session:r.providerSessionId,pending:structuredClone(r.pending),cwd:r.schedule.workspace.cwd,origin:r.schedule.context.workspaceId,archivedAt:r.archivedAt}));
 const value={action:'move-project',projectId:project.id,workspaceId:'destination',expectedRevision:catalog.revision};service.projects(value,engine);
 assert.equal(service.read().projects.find(p=>p.id===project.id).workspaceId,'destination');assert.notEqual(service.read().defaultProjectIds.default,project.id);assert.equal(writes,2);
 for(const [i,run]of runs.entries()){assert.equal(run.workspaceId,'destination');assert.equal(run.projectId,project.id);assert.equal(run.schedule.context.followsWorkspace,false);assert.deepEqual({session:run.providerSessionId,pending:run.pending,cwd:run.schedule.workspace.cwd,origin:run.schedule.context.workspaceId,archivedAt:run.archivedAt},before[i]);}
 service.projects(value,engine);assert.equal(writes,2,'lost acknowledgments must not duplicate membership writes');assert.throws(()=>service.projects({...value,workspaceId:'default'},engine),/changed/);
 const saved=service.read(),session={tabs:[{id:'project:local:'+project.id,type:'workspace',projectId:project.id,workspaceId:'default'},{id:'terminal',type:'terminal',parentId:'project:local:'+project.id,terminal:{id:'same-pty',cwd:f.cwd}},{id:'draft',type:'browser',parentId:'project:local:'+project.id,newChatDraft:{workspaceId:'default',projectId:project.id,form:{prompt:'keep',workspace:'default',cwd:f.cwd},selection:{selectedIds:['old']}}}]};
 const remapped=service.remapSession(session);assert.equal(remapped.tabs[0].workspaceId,'destination');assert.deepEqual(remapped.tabs[1].terminal,session.tabs[1].terminal);assert.equal(remapped.tabs[2].newChatDraft.workspaceId,'destination');assert.equal(remapped.tabs[2].newChatDraft.form.prompt,'keep');assert.equal(remapped.tabs[2].newChatDraft.selection,undefined);
 assert.equal(saved.projectMoves[project.id][0].chatIds.length,2);
});

test('paired saved project views follow a same-ID move without changing resource or authorization identity',async()=>{
 const {remapPreviewProjectSession,remapPreviewBrowserPlacement,resolvePreviewProject}=await import('../public/features/workspaces/preview-project-placement.js');
 const catalog={projects:[{id:'project',workspaceId:'gaming',name:'Game'}],workspaces:[{id:'gaming',name:'Gaming'}],projectMoves:{project:[{from:'video',to:'gaming'}]}};
 const hostId='paired-host',parentId='project:'+hostId+':project';
 const route={parentId,destination:{type:'project',id:'project',workspaceId:'video'}};
 const browser={id:'browser-stable',type:'browser',hostId,parentId,info:{...route,profileId:'social',history:{entries:[{id:'history',url:'https://example.test'}]}}};
 const doc={id:'document-stable',type:'remote-document',hostId,parentId,runId:'origin-chat',documentId:'approved-document',source:'source.md'};
 const session={active:browser.id,selectedChildren:{[parentId]:browser.id},tabs:[{id:parentId,type:'workspace',hostId,projectId:'project',workspaceId:'video'},browser,doc]};
 const next=remapPreviewProjectSession(session,catalog,{hostId});
 assert.equal(next.tabs[0].workspaceId,'gaming');assert.equal(next.tabs[0].workspaceName,'Gaming');assert.equal(next.active,browser.id);assert.equal(next.selectedChildren[parentId],browser.id);
 assert.deepEqual(next.tabs[2],doc);assert.deepEqual(next.tabs[1].info.history,browser.info.history);assert.equal(next.tabs[1].info.profileId,'social');assert.equal(next.tabs[1].info.destination.workspaceId,'gaming');
 assert.equal(remapPreviewBrowserPlacement(route,catalog,{hostId}).destination.workspaceId,'gaming');
 assert.equal(resolvePreviewProject(catalog,'project','unrelated'),null);
 const deleted={...catalog,projects:[{id:'default',workspaceId:'gaming',name:'General'}],projectRedirects:{project:{workspaceId:'gaming',projectId:'default'}}};
 assert.equal(resolvePreviewProject(deleted,'project','video').id,'default','A subsequent deletion resolves the prior move before its same-workspace redirect');
});
