// Placement is a one-shot creation action, never part of persisted tab metadata.
export function placeTabAfter(tabs, id, sourceId) {
  if (!sourceId || id === sourceId) return false;
  const tab = tabs.find(item => item.id === id), source = tabs.find(item => item.id === sourceId);
  if (!tab || !source || (tab.parentId || null) !== (source.parentId || null)) return false;
  tabs.splice(tabs.indexOf(tab), 1);
  tabs.splice(tabs.indexOf(source) + 1, 0, tab);
  return true;
}
export function destinationSections(tabs,{excludeId,runs=[],catalog,workspaces=[]}={}){
 const recent=tab=>Math.max(0,...[tab.lastTouchedAt,tab.info?.lastTouchedAt,runs.find(run=>run.id===(tab.runId||tab.id))?.updatedAt,tab.openedAt,...(tab.type==='workspace'?tabs.filter(child=>child.parentId===tab.id).flatMap(child=>[child.lastTouchedAt,child.info?.lastTouchedAt]):[])].map(value=>Date.parse(value)||0));
 const eligible=tabs.filter(tab=>tab.id!==excludeId&&['workspace','run','remote-run'].includes(tab.type));
 const sorted=type=>eligible.filter(tab=>type==='workspace'?tab.type===type&&!tab.projectId:type==='project'?tab.type==='workspace'&&tab.projectId:tab.type!=='workspace').sort((a,b)=>recent(b)-recent(a)||String(a.label||'').localeCompare(String(b.label||'')));
 const roots=workspaces.length?workspaces:sorted('workspace').map(tab=>({id:tab.workspaceId,name:tab.workspaceName||tab.label,hostId:tab.hostId}));
 const groups=roots.map(workspace=>{
  const host=workspace.hostId||'local',projects=(catalog?.projects||[]).filter(project=>project.workspaceId===workspace.id);
  const children=projects.length?projects.map(project=>tabs.find(tab=>tab.type==='workspace'&&tab.projectId===project.id&&(tab.hostId||'local')===host)||{id:'project:'+host+':'+project.id,type:'workspace',workspaceId:workspace.id,projectId:project.id,label:project.name,workspaceName:workspace.name,...(host!=='local'?{hostId:host}:{})}):sorted('project').filter(tab=>tab.workspaceId===workspace.id&&(tab.hostId||'local')===host);
  return {label:workspace.name||'Workspace',workspaceId:workspace.id,hostId:host,tabs:(children.length?children:sorted('workspace').filter(tab=>tab.workspaceId===workspace.id&&(tab.hostId||'local')===host)).filter(tab=>tab.id!==excludeId)};
 });
 if(!groups.length&&sorted('project').length)groups.push(...Object.values(Object.groupBy(sorted('project'),tab=>(tab.hostId||'local')+':'+tab.workspaceId)).map(rows=>({label:rows[0].workspaceName||'Workspace',tabs:rows})));
 return [...groups,{label:'Chats',tabs:sorted('chat')}];
}
