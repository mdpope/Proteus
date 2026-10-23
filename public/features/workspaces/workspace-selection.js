// Project roots share a top-level workspace tab without changing their real
// placement/authorization parent. Remember that presentation edge as well.
function selectionParent(tab,tabs,projects){
 if(tab.parentId)return tabs.find(parent=>parent.id===tab.parentId);
 if(projects&&tab.type==='workspace'&&tab.projectId)return tabs.find(parent=>parent.type==='workspace'&&!parent.projectId&&parent.workspaceId===tab.workspaceId&&(parent.hostId||'')===(tab.hostId||''));
}
export function rememberTabSelection(tabs,id,selected,{projects=false}={}){
 let child=tabs.find(tab=>tab.id===id);if(!child)return;
 selected.delete(child.id);
 const seen=new Set([child.id]);
 for(let parent=selectionParent(child,tabs,projects);parent&&!seen.has(parent.id);parent=selectionParent(child,tabs,projects)){
  seen.add(parent.id);selected.set(parent.id,child.id);child=parent;
 }
}
export function restoreTabSelection(tabs,id,selected,{projects=false}={}){
 let current=tabs.find(tab=>tab.id===id);if(!current)return id;
 const seen=new Set([id]);
 while(selected.has(current.id)){
  const child=tabs.find(tab=>tab.id===selected.get(current.id));
  if(!child||seen.has(child.id)||child.hidden||child.navigationClosed||child.connectionPaused||selectionParent(child,tabs,projects)?.id!==current.id)break;
  seen.add(child.id);current=child;
 }
 return current.id;
}
