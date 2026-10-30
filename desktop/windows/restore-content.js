import {reconcileWindowSession} from '../../public/shared/navigation/window-session-reconcile.js';

// Use the existing owner's history/document services. Incomplete or changing
// history aborts restore instead of saving a partial stack over the layout.
export async function restoreWindowContent(session,service){
 const scopes=new Map(),key=(scope,id)=>JSON.stringify([scope,id]);
 const add=(scope,id)=>scopes.set(key(scope,id),{scope,id});
 const tabs=session.tabs||[],parents=new Set(tabs.map(tab=>tab.id));
 const collect=tab=>{
  if(tab.hostId||tab.navigationClosed||tab.connectionPaused)return;
  if(tab.type==='workspace')add(tab.projectId?'project':'workspace',tab.projectId||tab.workspaceId);
  else if(tab.type==='run')add('chat',tab.runId||tab.id);
  for(const child of tabs)if(child.parentId===tab.id)collect(child);
 };
 for(const tab of tabs)if(!tab.parentId||!parents.has(tab.parentId))collect(tab);
 if(session.team)add('team','team');
 let bytes=0;
 for(const [name,scope]of scopes){
  const owner=await service.contentTabs.getAsync(scope.scope,scope.id,{historyLimit:200});
  for(const tab of owner.tabs){
   const initial=tab.type==='browser'&&tab.history;if(!initial)continue;
   if(initial.hasMore||initial.offset>0||initial.total>initial.entries.length){
    const entries=[],entryIds=new Set();let cursor,historyBytes=2;
    do{
     const page=await service.contentTabs.history({...scope,tabId:tab.id,limit:200,...(cursor?{cursor}:{start:true})});
     if(page.revision!==initial.revision||page.currentEntryId!==initial.currentEntryId||page.offset!==entries.length||page.total!==initial.total)throw Error('Browser history changed during window restore. Retry; the saved layout is intact.');
     if(page.hasMore&&(!page.entries?.length||!page.nextCursor))throw Error('Incomplete browser history during window restore. The saved layout is intact.');
     for(const entry of page.entries){
      if(entryIds.has(entry.id))throw Error('Inconsistent browser history during window restore. The saved layout is intact.');
      entryIds.add(entry.id);historyBytes+=Buffer.byteLength(JSON.stringify(entry))+1;
     }
     if(historyBytes>8*1024*1024)throw Error('Saved-window history exceeds its session budget. The original layout and owner history are intact.');
     entries.push(...page.entries);
     cursor=page.hasMore?page.nextCursor:null;
    }while(cursor);
    const index=entries.findIndex(entry=>entry.id===initial.currentEntryId);
    if(entries.length!==initial.total||index<0)throw Error('Incomplete browser history during window restore. The saved layout is intact.');
    tab.history={entries,index,currentEntryId:initial.currentEntryId,revision:initial.revision};
   }
   bytes+=Buffer.byteLength(JSON.stringify(tab.history));if(bytes>8*1024*1024)throw Error('Saved-window history exceeds its session budget. The original layout and owner history are intact.');
  }
  scopes.set(name,owner);
 }
 // A later scope read can yield while an earlier scope changes. Validate all
 // captured memberships together before producing the replacement session.
 for(const [name,owner]of scopes){
  const [scope,id]=JSON.parse(name);
  if(service.contentTabs.get(scope,id).revision!==owner.revision)throw Error('Shared tabs changed during window restore. Retry; the saved layout is intact.');
 }
 return reconcileWindowSession(session,(scope,id)=>scopes.get(key(scope,id)),{documentFile:(scope,id,tab)=>service.contentTabs.documentSource(id,tab.documentId,scope)});
}
