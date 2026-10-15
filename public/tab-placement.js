// Placement is a one-shot creation action, never part of persisted tab metadata.
export function placeTabAfter(tabs, id, sourceId) {
  if (!sourceId || id === sourceId) return false;
  const tab = tabs.find(item => item.id === id), source = tabs.find(item => item.id === sourceId);
  if (!tab || !source || (tab.parentId || null) !== (source.parentId || null)) return false;
  tabs.splice(tabs.indexOf(tab), 1);
  tabs.splice(tabs.indexOf(source) + 1, 0, tab);
  return true;
}
export function destinationSections(tabs,{excludeId,runs=[]}={}){
 const recent=tab=>Math.max(0,...[tab.lastTouchedAt,tab.info?.lastTouchedAt,runs.find(run=>run.id===(tab.runId||tab.id))?.updatedAt,tab.openedAt,...(tab.type==='workspace'?tabs.filter(child=>child.parentId===tab.id).flatMap(child=>[child.lastTouchedAt,child.info?.lastTouchedAt]):[])].map(value=>Date.parse(value)||0));
 const eligible=tabs.filter(tab=>tab.id!==excludeId&&['workspace','run','remote-run'].includes(tab.type));
 const sorted=type=>eligible.filter(tab=>type==='workspace'?tab.type===type:tab.type!=='workspace').sort((a,b)=>recent(b)-recent(a)||String(a.label||'').localeCompare(String(b.label||'')));
 return [{label:'Workspaces',tabs:sorted('workspace')},{label:'Chats',tabs:sorted('chat')}];
}
