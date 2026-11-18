import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';

/** Default projects Proteus manages inside the Life workspace. Chats started from a Life feature live in its project. */
export const lifeProjectKinds=Object.freeze({ask:'Ask',home:'Smart Home',nutrition:'Nutrition',garage:'Garage',fuel:'Fuel & mileage'});

// Placement is account-bound metadata. The chat still captures its own empty,
// per-request execution folder and never inherits workspace tools or permissions.
export class LifeAskPlacement {
  constructor(service){this.service=service;this.file=path.join(service.home,'life-workspace.json');}
  /** The operator-chosen folder, or null until one is chosen (older installs keep their app-data folder). */
  folder(){const value=readJSON(this.file,{}).path;return typeof value==='string'&&path.isAbsolute(value)?value:null;}
  key(binding){return createHash('sha256').update(JSON.stringify([binding.accountID,binding.hostID])).digest('hex');}
  workspaceId(binding){return 'life-'+this.key(binding).slice(0,24);}
  /** Choose where the Life workspace lives. An existing workspace is repointed; its files are not moved. */
  setFolder(binding,chosen){
    if(typeof chosen!=='string'||!path.isAbsolute(chosen))throw Error('Choose an absolute folder for the Life workspace.');
    fs.mkdirSync(chosen,{recursive:true,mode:0o700});const folder=fs.realpathSync(chosen);
    if(!fs.statSync(folder).isDirectory())throw Error('Choose a folder.');
    atomicJSON(this.file,{schemaVersion:1,path:folder});
    const id=this.workspaceId(binding),config=this.service.context.config(),existing=config.workspaces.find(row=>row.id===id);
    if(existing&&existing.lifeAskBinding===this.key(binding)&&existing.cwd!==folder)this.service.context.mutate(value=>{value.workspaces.find(row=>row.id===id).cwd=folder;},config.revision);
    return folder;
  }
  /** Workspace, chosen folder and each managed project, creating missing projects on demand. */
  state(binding){
    const id=this.workspaceId(binding),config=this.service.context.config(),workspace=config.workspaces.find(row=>row.id===id&&row.lifeAskBinding===this.key(binding));
    const projects=this.service.workspaceProjects.read().projects.filter(row=>workspace&&row.workspaceId===id&&!row.deletedAt);
    return {folder:this.folder(),workspaceId:workspace?id:null,currentFolder:workspace?.cwd||null,needsFolder:!this.folder(),projects:Object.entries(lifeProjectKinds).map(([kind,name])=>({kind,name,id:projects.find(row=>row.lifeProjectKind===kind||kind==='ask'&&row.name==='Ask'&&row.lifeAskBinding===this.key(binding))?.id||null}))};
  }
  /** Return the project id for a Life feature, creating the Life workspace and the project when needed. */
  ensureKind(binding,kind){
    if(!lifeProjectKinds[kind])throw Error('Unknown Life project.');
    if(!binding?.accountID)throw Error('Sign in to Life first.');
    if(kind!=='ask'&&!this.folder()&&!this.service.context.config().workspaces.some(row=>row.id===this.workspaceId(binding)))throw Error('Choose a folder for the Life workspace first.');
    const key=this.key(binding);
    let existing=this.state(binding).projects.find(row=>row.kind===kind)?.id;
    if(existing)return {workspaceId:this.workspaceId(binding),projectId:existing};
    if(kind==='ask')return {workspaceId:this.workspaceId(binding),projectId:this.ensure(binding)};
    this.ensureWorkspace(binding);
    const catalog=this.service.workspaceProjects.read(),project={id:randomUUID(),workspaceId:this.workspaceId(binding),name:lifeProjectKinds[kind],createdAt:new Date().toISOString(),lifeAskBinding:key,lifeProjectKind:kind};
    catalog.projects.push(project);this.service.workspaceProjects.write(catalog);
    return {workspaceId:project.workspaceId,projectId:project.id};
  }
  ensureWorkspace(binding){
    const workspaceId=this.workspaceId(binding),{context}=this.service,key=this.key(binding),config=context.config();
    if(!config.workspaces.some(row=>row.id===workspaceId)){
      if(config.archivedWorkspaces?.some(row=>row.id===workspaceId))throw Error('The Life workspace was removed. Review its placement before enabling Life features.');
      const cwd=this.folder()||path.join(this.service.home,'life-ask-workspaces',key);fs.mkdirSync(cwd,{recursive:true,mode:0o700});
      context.mutate(value=>value.workspaces.push({id:workspaceId,name:'Life',cwd,additionalDirectories:[],defaults:{includeDefaults:false,selectedIds:[]},lifeAskBinding:key}),config.revision);
    }else if(context.scope(workspaceId).lifeAskBinding!==key)throw Error('The Life workspace belongs to another account.');
    return workspaceId;
  }
  ensure(binding,previous){
    const {context,workspaceProjects:projects,home}=this.service;
    const key=createHash('sha256').update(JSON.stringify([binding.accountID,binding.hostID])).digest('hex');
    if(previous?.projectId&&previous.accountID===binding.accountID&&previous.hostID===binding.hostID){this.resolve(previous.projectId,key);return previous.projectId;}
    let catalog=projects.read(),project=catalog.projects.find(row=>row.lifeAskBinding===key&&(row.lifeProjectKind||'ask')==='ask');
    if(project){this.resolve(project.id,key);return project.id;}
    const workspaceId=this.ensureWorkspace(binding);
    catalog=projects.read();project={id:randomUUID(),workspaceId,name:'Ask',createdAt:new Date().toISOString(),lifeAskBinding:key,lifeProjectKind:'ask'};
    catalog.projects.push(project);catalog.defaultProjectIds[workspaceId]??=project.id;projects.write(catalog);
    return project.id;
  }
  resolve(projectId,key){
    const project=this.service.workspaceProjects.read().projects.find(row=>row.id===projectId);
    if(!project||project.lifeAskBinding!==key)throw Error('The Life Ask project is unavailable. Review its placement before continuing.');
    this.service.context.scope(project.workspaceId);return project;
  }
  associate(run,receipt,projectId){
    if(run.lifeAskPlacementAssigned)return;
    const key=createHash('sha256').update(JSON.stringify([receipt.accountID,receipt.hostID])).digest('hex');
    const project=this.resolve(projectId,key);
    run.lifeAskPlacementAssigned=true;
    this.service.workspaceProjects.associate(run,project,this.service.engine);
  }
}
