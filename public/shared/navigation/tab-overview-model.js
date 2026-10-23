const visible=tab=>!tab.hidden&&!tab.navigationClosed&&!tab.connectionPaused;
const features=new Set(['overview','omi','life','team','engine','home','standup']);
export function tabOverviewGroups({tabs,catalog,scope='main',selectedId,topId,team={tabs:[]}}){
 const byId=new Map(tabs.map(tab=>[tab.id,tab]));
 const ancestors=tab=>{const rows=[],seen=new Set();while(tab&&!seen.has(tab.id)){seen.add(tab.id);rows.push(tab);tab=byId.get(tab.parentId);}return rows;};
 const eligible=tab=>visible(tab)&&ancestors(tab).every(visible);
 const selected=byId.get(selectedId),selectedChain=ancestors(selected);
 const scopeTab=byId.get(scope),scoped=ancestors(scopeTab).find(tab=>tab.type==='workspace')||scopeTab||selectedChain.find(tab=>tab.type==='workspace');
 if(scope==='main')return [{id:'main',title:'Top-level tabs',tabs:tabs.filter(tab=>eligible(tab)&&!tab.parentId&&!tab.projectId&&!features.has(tab.type)),selectedId:topId||selectedId}];
 if(scope==='team')return [{id:'team',title:'Team Tools',team:true,tabs:team.tabs.filter(visible),selectedId:team.active}];
 const host=scoped?.hostId||'local',workspaceId=scoped?.workspaceId;
 if(workspaceId){
  const projectOf=tab=>ancestors(tab).find(row=>row.type==='workspace'&&row.projectId&&row.workspaceId===workspaceId&&(row.hostId||'local')===host);
  const current=scoped.projectId||selectedChain.find(row=>row.projectId)?.projectId;
  const projects=(catalog?.projects||[]).filter(project=>project.workspaceId===workspaceId);
  for(const tab of tabs)if(tab.type==='workspace'&&tab.workspaceId===workspaceId&&tab.projectId&&(tab.hostId||'local')===host&&!projects.some(p=>p.id===tab.projectId))projects.push({id:tab.projectId,name:tab.projectName||tab.label,workspaceId});
  projects.sort((a,b)=>(a.id===current?-1:b.id===current?1:0)||String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'})||a.id.localeCompare(b.id));
  const groups=projects.map(project=>({id:'project:'+host+':'+project.id,title:project.name||'Project',selectedId,tabs:tabs.filter(tab=>eligible(tab)&&tab.type!=='workspace'&&projectOf(tab)?.projectId===project.id)}));
  const direct=tabs.filter(tab=>eligible(tab)&&tab.type!=='workspace'&&ancestors(tab).some(row=>row.type==='workspace'&&!row.projectId&&row.workspaceId===workspaceId&&(row.hostId||'local')===host)&&!projectOf(tab));
  const legacyRoot=tabs.find(tab=>tab.type==='workspace'&&!tab.projectId&&tab.workspaceId===workspaceId&&(tab.hostId||'local')===host);
  if(direct.length)groups.push({id:'workspace:'+host+':'+workspaceId,title:legacyRoot?.workspaceName||legacyRoot?.label||scoped.workspaceName||'Workspace',selectedId,tabs:direct});
  return groups;
 }
 const parent=byId.get(scope);return parent?[{id:parent.id,title:parent.label||'Chat',selectedId,tabs:[parent,...tabs.filter(tab=>eligible(tab)&&tab.parentId===parent.id)].filter(eligible)}]:[];
}
