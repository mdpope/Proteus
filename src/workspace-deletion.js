import path from 'node:path';
import {atomicJSON,readJSON} from './files.js';
import {chatMembership} from '../public/chat-membership.js';
export class WorkspaceDeletion{
 constructor(service){this.service=service;this.file=path.join(service.home,'workspace-deletions.json');}
 async remove(value){
  const {context,engine,contentTabs}=this.service;
  const jobs=readJSON(this.file,{schemaVersion:1,jobs:[]});
  let job=jobs.jobs.find(job=>job.workspaceId===value.workspaceId&&job.status!=='complete');
  if(!job){
   const config=context.get(),profile=context.scope(value.workspaceId);
   if(config.revision!==value.expectedRevision)throw new Error('Workspace settings changed. Refresh before deleting.');
   if(value.moveToWorkspaceId===profile.id)throw new Error('Choose another workspace for its chats.');
   if(value.moveToWorkspaceId)context.scope(value.moveToWorkspaceId);
   const chatIds=engine.listRuns().filter(run=>chatMembership(run).workspaceId===profile.id).map(run=>run.id);
   const scopes=[{scope:'workspace',id:profile.id},...chatIds.map(id=>({scope:'chat',id}))];
   const tabs=scopes.flatMap(scope=>contentTabs.get(scope.scope,scope.id).tabs.map(tab=>({...tab,source:scope})));
   job={workspaceId:profile.id,target:value.moveToWorkspaceId||null,chatIds,scopes,tabs,status:'pending',createdAt:new Date().toISOString()};jobs.jobs.push(job);atomicJSON(this.file,jobs);
  }else if(job.target!==(value.moveToWorkspaceId||null))throw new Error('A workspace deletion is pending with another chat destination. Retry that operation first.');
  const checkpoint=()=>atomicJSON(this.file,jobs);
  const destination=job.target?context.scope(job.target):null;
  const associated=engine.listRuns().filter(run=>chatMembership(run).workspaceId===job.workspaceId).map(run=>run.id);
  job.chatIds=[...new Set([...job.chatIds,...associated])];
  job.scopes=[...new Map([...job.scopes,{scope:'workspace',id:job.workspaceId},...associated.map(id=>({scope:'chat',id}))].map(row=>[row.scope+':'+row.id,row])).values()];
  job.tabs=[...new Map([...job.tabs,...job.scopes.flatMap(source=>contentTabs.get(source.scope,source.id).tabs.map(tab=>({...tab,source})))].map(tab=>[tab.source.scope+':'+tab.source.id+':'+tab.id,tab])).values()];checkpoint();
  for(const id of job.chatIds){
   let run;try{run=engine.getRun(id);}catch{continue;}
   if(chatMembership(run).workspaceId!==job.workspaceId)continue;
   engine.moveWorkspace(id,{workspaceId:destination?.id||null,workspaceName:destination?.name||''});
  }
  job.status='chats-preserved';checkpoint();
  for(const tab of job.tabs){if(!contentTabs.get(tab.source.scope,tab.source.id).tabs.some(current=>current.id===tab.id))continue;await this.service.tabRuntime?.({action:'close',tab,source:tab.source});}
  contentTabs.clearScopes(job.scopes);job.status='tabs-closed';checkpoint();
  const current=context.get();
  if(current.workspaces.some(profile=>profile.id===job.workspaceId))context.deleteWorkspace(job.workspaceId,current.revision);
  await this.service.tabRuntime?.({action:'workspace-deleted',workspaceId:job.workspaceId,chatIds:job.chatIds});
  job.status='complete';job.completedAt=new Date().toISOString();delete job.tabs;
  jobs.jobs=jobs.jobs.filter(job=>job.status!=='complete').concat(jobs.jobs.filter(job=>job.status==='complete').slice(-64));checkpoint();
  this.service.notify?.();this.service.remote?.changed();
  return {deleted:true,workspaceId:job.workspaceId,chatIds:job.chatIds,moveToWorkspaceId:job.target,context:context.get()};
 }
}
