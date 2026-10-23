// Saved windows restore presentation; current owner registries own shared content.
export function reconcileWindowSession(value,read){
 const session=structuredClone(value),parents=new Map((session.tabs||[]).map(tab=>[tab.id,tab]));
 const reconcile=(tabs,scope,id)=>{const owner=read(scope,id);if(!owner||owner.revision===0)return tabs;return tabs.flatMap(tab=>{
  const logical=tab.contentTabId||(['run','remote-run'].includes(tab.type)?'chat:'+(tab.runId||tab.id):tab.type==='terminal'?'terminal:'+tab.terminal?.id:tab.id),descriptor=owner.tabs.find(row=>row.id===logical);
  if(!descriptor)return [];
  return [{...tab,contentTabId:descriptor.id,customTitle:descriptor.customTitle,hidden:!!descriptor.hidden,label:descriptor.title,title:descriptor.title,...(descriptor.type==='browser'?{url:descriptor.url,history:descriptor.history,profileId:descriptor.profileId||'default',unloaded:true,loaded:false}:{})}];
 });};
 session.tabs=(session.tabs||[]).flatMap(tab=>{const parent=parents.get(tab.parentId);if(!parent)return [tab];const scope=parent.type==='workspace'?(parent.projectId?'project':'workspace'):['run','remote-run'].includes(parent.type)?'chat':null;if(!scope||parent.hostId)return [tab];return reconcile([tab],scope,parent.projectId||parent.workspaceId||parent.runId||parent.id);});
 if(session.team)session.team.tabs=reconcile(session.team.tabs||[],'team','team');
 if(!session.tabs.some(tab=>tab.id===session.active&&!tab.hidden)){const old=parents.get(session.active);session.active=session.tabs.some(tab=>tab.id===old?.parentId)?old.parentId:'overview';}
 if(session.team&&!session.team.tabs.some(tab=>tab.id===session.team.active)&&!['overview','standup'].includes(session.team.active))session.team.active='overview';
 return session;
}
