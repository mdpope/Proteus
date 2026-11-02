import {Worker} from 'node:worker_threads';
import fs from 'node:fs';import path from 'node:path';
import {atomicJSON} from '../../src/shared/files.js';
import {planWindowContentRecovery} from '../../src/services/workspaces/window-content-recovery.js';
import {workspaceContentScopes} from '../../src/services/workspaces/content-tabs.js';

// File scanning/JSON parsing use a disposable bounded worker. Only the existing
// owner service authorizes and commits descriptor mutations; no second runner.
export class WindowContentRecovery{
 constructor(service){this.service=service;this.busy=false;}
 async audit(){
  const service=this.service;
  const {sources,gaps}=await new Promise((resolve,reject)=>{
   let received=false;
   const worker=new Worker(new URL('./recovery-sources-worker.cjs',import.meta.url),{workerData:{home:service.home,since:Date.now()-2*86400000},resourceLimits:{maxOldGenerationSizeMb:256}});
   const timer=setTimeout(()=>{void worker.terminate();reject(Error('Window recovery scan timed out; no tabs changed.'));},30000);
   worker.once('message',value=>{received=true;clearTimeout(timer);void worker.terminate();value.error?reject(Error(value.error)):resolve(value);});worker.once('error',error=>{clearTimeout(timer);reject(error);});worker.once('exit',()=>{clearTimeout(timer);if(!received)reject(Error('Window recovery worker stopped without a result. No tabs changed.'));});
  });
  for(const source of sources)source.session=service.workspaceProjects.remapSession(source.session,service.engine);
  const catalog=service.workspaceProjects.get(service.engine),workspaceIds=new Set(service.context.get().workspaces.map(row=>row.id)),projectIds=new Set(catalog.projects.map(row=>row.id));
  const available=row=>row.scope==='project'?projectIds.has(row.id):workspaceIds.has(row.id);
  const keys=new Map();
  for(const source of sources)for(const row of workspaceContentScopes(source.session))if(['project','workspace'].includes(row.scope)&&available(row))keys.set(row.scope+':'+row.id,row);
  const scopes=[];let historyBytes=0;
  for(const row of keys.values()){
   const scope=await service.contentTabs.getAsync(row.scope,row.id);
   for(const tab of scope.tabs)if(tab.type==='browser'&&tab.history?.hasMore){
    const entries=[];let cursor;
    do{
     const page=await service.contentTabs.history({scope:row.scope,id:row.id,tabId:tab.id,limit:200,...(cursor?{cursor}:{start:true})});
     if(page.revision!==tab.history.revision||page.offset!==entries.length)throw Error('History changed during recovery scan. Retry the scan.');
     const next=page.entries||page.history?.entries||[];if(page.hasMore&&(!next.length||!page.nextCursor))throw Error('Incomplete history page. No tabs changed.');
     historyBytes+=Buffer.byteLength(JSON.stringify(next));if(historyBytes>128*1024*1024)throw Error('Recovery history budget exceeded. No tabs changed.');
     entries.push(...next);cursor=page.hasMore?page.nextCursor:null;
    }while(cursor);
    const index=entries.findIndex(entry=>entry.id===tab.history.currentEntryId);if(index<0)throw Error('Current history entry is unavailable. No tabs changed.');
    tab.history={entries,index,revision:tab.history.revision,currentEntryId:tab.history.currentEntryId};
   }
   scopes.push(scope);
  }
  if(service.contentTabs.historyStore){
   // Closing a descriptor retains its worker navigation for recovery. Inspect it
   // through that owner boundary before choosing a saved snapshot as the stack.
   for(const source of sources)for(const row of workspaceContentScopes(source.session)){
    const scope=scopes.find(scope=>scope.scope===row.scope&&scope.id===row.id);if(!scope)continue;
    for(const tab of row.tabs)if(tab.type==='browser'&&!scope.tabs.some(current=>current.id===tab.id)&&!Object.hasOwn(scope.retainedNavigation||{},tab.id)){
     const entries=[];let cursor,revision,currentEntryId,total;
     do{
      const page=await service.contentTabs.historyStore.navigationGet({tabId:service.contentTabs.navigationKey(row.scope,row.id,tab.id),limit:200,...(cursor?{cursor}:{start:true})});
      revision??=page.revision;currentEntryId??=page.currentEntryId;total??=page.total;
      if(page.revision!==revision||page.currentEntryId!==currentEntryId||page.offset!==entries.length||page.total!==total)throw Error('Retained history changed during recovery scan.');
      const next=page.entries||[];historyBytes+=Buffer.byteLength(JSON.stringify(next));if(historyBytes>128*1024*1024)throw Error('Recovery history budget exceeded.');
      if(page.hasMore&&(!next.length||!page.nextCursor))throw Error('Retained history page is incomplete.');
      entries.push(...next);cursor=page.hasMore?page.nextCursor:null;
     }while(cursor);
     scope.retainedNavigation??={};scope.retainedNavigation[tab.id]=entries.length?{entries,index:entries.findIndex(entry=>entry.id===currentEntryId),revision,currentEntryId}:null;
     if(entries.length&&(entries.length!==total||scope.retainedNavigation[tab.id].index<0))throw Error('Retained history coverage is incomplete.');
    }
   }
  }
  // Include identity-only descriptors elsewhere to avoid undoing a later Move.
  for(const row of service.contentTabs.list())if(!scopes.some(scope=>scope.scope===row.scope&&scope.id===row.scopeId))scopes.push({scope:row.scope,id:row.scopeId,revision:row.revision,tabs:service.contentTabs.get(row.scope,row.scopeId).tabs});
  return {...planWindowContentRecovery({sources,scopes,available}),gaps};
 }
 async restore({planId,ids}){
  if(this.busy)throw Error('Window recovery is already in progress.');this.busy=true;
  let receipt,file;
  try{
   const plan=await this.audit();if(plan.id!==planId)throw Error('Tabs or recovery sources changed. Review a fresh scan before restoring.');
   if(plan.gaps.length)throw Error('Some retained sessions could not be read. Original records were preserved.');
   if(!Array.isArray(ids)||!ids.length||ids.length>1000||new Set(ids).size!==ids.length)throw Error('Choose recovery tabs from the current scan.');
   const items=ids.map(id=>{const item=plan.items.find(row=>row.tab.id===id);if(!item)throw Error('Recovery tab is no longer in this scan.');return item;});
   // Validate every destination and chat membership before the first commit.
   for(const item of items){
    if(item.scope==='project')this.service.workspaceProjects.projectFor({projectId:item.id});else this.service.context.scope(item.id);
    if(item.tab.type==='chat'){
     const membership=this.service.workspaceProjects.membership(this.service.engine.getRun(item.tab.chatId));
     if((item.scope==='project'?membership.projectId:membership.workspaceId)!==item.id)throw Error('A saved chat changed projects. Refresh the scan.');
    }
   }
   const restored=[],revisions=new Map(items.map(item=>[item.scope+':'+item.id,item.revision]));
   const directory=path.join(this.service.home,'window-recovery');fs.mkdirSync(directory,{recursive:true,mode:0o700});file=path.join(directory,plan.id+'.json');
   if(fs.existsSync(file))throw Error('This recovery attempt already has a receipt. Refresh the scan before continuing.');
   receipt={schemaVersion:1,planId:plan.id,startedAt:new Date().toISOString(),sources:plan.sources,selected:items.map(item=>({scope:item.scope,id:item.id,tabId:item.tab.id,kind:item.kind})),restored,phase:'prepared'};atomicJSON(file,receipt);
   for(const item of items){
    const current=await this.service.contentTabs.getAsync(item.scope,item.id);
    const key=item.scope+':'+item.id;
    if(current.revision!==revisions.get(key))throw Error('Tabs changed during recovery. '+restored.length+' tabs restored; review a fresh scan for the remainder.');
    if(current.tabs.some(tab=>tab.id===item.tab.id))continue;
    receipt.phase='mutation-intent';receipt.intent={scope:item.scope,id:item.id,tabId:item.tab.id,expectedRevision:current.revision};atomicJSON(file,receipt);
    // mutateAsync guards the fresh revision and seeds only a previously absent
    // identity. In particular, it cannot replace a current navigation stack.
    const result=await this.service.mutateContentTabs({scope:item.scope,id:item.id,expectedRevision:current.revision,operations:[{action:current.closed?.[item.tab.id]?'reopen':'open',...(current.closed?.[item.tab.id]?{closedRevision:current.closed[item.tab.id]}:{}),tab:item.tab}]});revisions.set(key,result.revision);restored.push(item.tab.id);receipt.phase='mutation-confirmed';receipt.intent=null;atomicJSON(file,receipt);
   }
   receipt.phase='complete';receipt.completedAt=new Date().toISOString();atomicJSON(file,receipt);
   return {restored,qualification:plan.qualification};
  }catch(error){
   if(receipt){receipt.phase='attention';receipt.error=String(error.message).slice(0,1000);try{atomicJSON(file,receipt);}catch{/* The prior intent remains; never replay an ambiguous mutation. */}}
   throw error;
  }finally{this.busy=false;}
 }
}
