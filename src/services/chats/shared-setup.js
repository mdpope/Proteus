// One explicit Send consumes one shared setup slot. A second device observes
// that chat instead of starting the same synchronized draft a second time.
export function sharedSetupStarts(service){
 const starting=new Set();
 return async(value,start)=>{
  if(!value.setupId)return start();
  if(!/^[a-zA-Z0-9_:.-]{1,256}$/.test(value.setupId))throw Error('Choose a valid setup tab.');
  const existing=[...service.engine.runs.values()].find(run=>run.setupId===value.setupId);
  if(existing){if(existing.deferredStart)throw Error('This setup awaits file confirmation on its original device.');return existing;}
  if(starting.has(value.setupId))throw Error('Another device is starting this setup. Wait for its result before retrying.');
  const scope=value.setupScope|| (value.projectId?'project':'workspace'),id=value.setupScopeId||value.projectId||value.workspaceId;
  if(!['project','workspace'].includes(scope))throw Error('Setup tabs belong to a project or workspace.');
  if(scope==='project'&&value.projectId!==id||scope==='workspace'&&value.workspaceId!==id)throw Error('Start this setup in its original project or workspace.');
  const before=service.contentTabs.get(scope,id),placeholder=before.tabs.find(tab=>tab.id===value.setupId&&tab.setup);
  if(!placeholder)throw Error('This setup tab is no longer open. Its text is kept on this device.');
  if((placeholder.setup.kind==='internet')!==(value.chatType==='internet'))throw Error('The setup tab kind changed. Reopen it before sending.');
  starting.add(value.setupId);
  try{
   const run=await start(),current=service.contentTabs.get(scope,id),chatId='chat:'+run.id;
   const ids=current.tabs.map(tab=>tab.id===value.setupId?chatId:tab.id).filter((id,index,all)=>all.indexOf(id)===index);
   if(!ids.includes(chatId))ids.push(chatId);
   service.contentTabs.mutate({scope,id,expectedRevision:current.revision,operations:[{action:'close',id:value.setupId},{action:'open',tab:{id:chatId,type:'chat',chatId:run.id,title:run.title}},{action:'reorder',ids}]});
   return run;
  }finally{starting.delete(value.setupId);}
 };
}
