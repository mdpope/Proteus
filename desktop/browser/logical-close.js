// Native Close is a membership operation. Window disposal and passive mirror
// reconciliation explicitly bypass this boundary, retaining the owner's tabs.
export function logicalBrowserCloser(service){
 return async tab=>{
  const parent=tab.parentId||'',logicalId=tab.thumbnailId||tab.id;
  const session=service.navigationSessions?.().find(row=>row.id===(tab.windowId||'main'))?.session;
  const parentView=session?.tabs?.find(row=>row.id===parent);
  let scope;
  if(parentView&&['run','remote-run'].includes(parentView.type)){
   if(parentView.hostId||parentView.type==='remote-run')return;
   scope={scope:'chat',id:parentView.runId||parentView.id};
  }
  else if(parent.startsWith('project:local:'))scope={scope:'project',id:parent.slice(14)};
  else if(parent.startsWith('workspace:local:'))scope={scope:'workspace',id:parent.slice(16)};
  else if(parent.startsWith('project:')||parent.startsWith('workspace:')||parent.startsWith('peer:'))return;
  else if(parent)scope={scope:'chat',id:parent};
  else scope=tab.group==='team'?{scope:'team',id:'team'}:{scope:'main',id:!tab.windowId||tab.windowId==='main'?'main':'window:'+tab.windowId};
  for(let attempt=0;attempt<4;attempt++){
   const current=service.contentTabs.get(scope.scope,scope.id);
   if(Object.hasOwn(current.closed||{},logicalId))return;
   try{await service.contentTabs.mutateAsync({...scope,expectedRevision:current.revision,operations:[{action:'close',id:logicalId}]});return;}
   catch(error){if(!/Content tabs changed/.test(error.message)||attempt===3)throw error;}
  }
 };
}
