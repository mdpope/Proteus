import {navIcon,navEscape as e,recentItemMarkup} from './navigation-icons.js';
// One read-only owner inventory supplies the tree on every page, including Engine Room.
// Expansion fetches descriptors; it never opens a tab or advances its activity time.
export function createWorkspaceTree(ui){
 const storageKey='proteus.workspace-tree.v1.'+ui.account;let expanded=new Set(),lastFeature;const pages=new Map(),tabs=new Map(),loading=new Map(),failures=new Map();
 try{const saved=JSON.parse(localStorage.getItem(storageKey));if(Array.isArray(saved))expanded=new Set(saved.filter(v=>typeof v==='string'));}catch{}
 let otherExpanded=true;try{otherExpanded=localStorage.getItem(storageKey+'.other-computers')!=='false';}catch{}
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify([...expanded]));}catch{}};
 const key=(host,id)=>host+':'+id;
 const open=fn=>Promise.resolve().then(fn).catch(error=>ui.notify?.(error.message));
 function collapse(){expanded.clear();pages.clear();save();render();}
 document.querySelector('#shell-collapse-workspaces')?.addEventListener('click',collapse);
 function load(row,project){const id=key(row.hostId,project.id);if(loading.has(id))return;const task=ui.request(row.hostId,'tabs.get',{scope:'project',id:project.id}).then(value=>{tabs.set(id,value);failures.delete(id);}).catch(error=>failures.set(id,error.message)).finally(()=>{loading.delete(id);render();});loading.set(id,task);}
 function invalidate(hostId,change){if(change?.event==='tabs'){if(Array.isArray(change.data?.tabs))tabs.set(key(hostId,change.data.id),change.data);else tabs.delete(key(hostId,change.data?.id));failures.delete(key(hostId,change.data?.id));}render();}
 function render(){
  const node=document.querySelector('#shell-recent-workspaces');if(!node)return;
  const feature=document.body.dataset.activeFeature||document.body.dataset.shellSection;if(lastFeature&&lastFeature!==feature)pages.clear();lastFeature=feature;
  const rows=ui.workspaces(),active=ui.active?.(),primary=ui.primaryHost?.();node.hidden=!rows.length;node.replaceChildren();
  const otherRows=rows.filter(row=>row.hostId!==primary),containers=new Map();
  let other;
  if(otherRows.length){
   other=document.createElement('section');other.className='web-other-computers';
   const toggle=document.createElement('button');toggle.className='web-other-computers-toggle';toggle.dataset.otherComputers='';toggle.setAttribute('aria-expanded',String(otherExpanded));toggle.innerHTML=`<span>Other Computers</span><span aria-hidden="true">${otherExpanded?'⌄':'›'}</span>`;
   toggle.onclick=()=>{otherExpanded=!otherExpanded;try{localStorage.setItem(storageKey+'.other-computers',String(otherExpanded));}catch{}render();};other.append(toggle);
   const body=document.createElement('div');body.className='web-other-computers-body';body.hidden=!otherExpanded;other.append(body);
   for(const row of otherRows){if(containers.has(row.hostId))continue;const host=document.createElement('section');host.className='web-computer-group';host.dataset.treeComputer=row.hostId;const title=document.createElement('h3');title.className='web-computer-heading';title.textContent=row.hostName||'Computer';host.append(title);body.append(host);containers.set(row.hostId,host);}
  }
  for(const row of rows){
   const status=ui.status?.(row.hostId)||{online:true,supported:true},unavailable=!status.supported?'Update this computer to use projects.':!status.online?'Computer offline · showing last known projects.':'';
   const wk=key(row.hostId,row.id),children=ui.projects(row.hostId).filter(p=>p.workspaceId===row.id),selected=active?.hostId===row.hostId&&active?.id===row.id;
   const group=document.createElement('section');group.className='web-workspace-group'+(selected?' active':'');group.dataset.treeWorkspace=row.id;group.dataset.treeHost=row.hostId;
   group.innerHTML=`<div class="web-group-heading"><button data-open title="${e(row.name)} · ${e(row.hostName)}">${navIcon('workspace')}<span class="web-workspace-name">${e(row.name)}</span></button><span class="web-tree-count" aria-label="${e(unavailable||children.length+' projects')}">${status.supported?children.length:'—'}</span><button data-expand aria-label="${expanded.has(wk)?'Collapse':'Expand'} ${e(row.name)}" aria-expanded="${expanded.has(wk)}">${expanded.has(wk)?'⌄':'›'}</button></div>`;
   group.querySelector('[data-open]').onclick=()=>open(()=>ui.open(row));
   group.querySelector('[data-expand]').onclick=()=>{if(expanded.has(wk)){expanded.delete(wk);pages.delete(wk);for(const id of pages.keys())if(id.startsWith(wk+':'))pages.delete(id);}else expanded.add(wk);save();render();};
   if(expanded.has(wk)){
    if(unavailable){const notice=document.createElement('p');notice.className='web-tree-empty';notice.textContent=unavailable;group.append(notice);}
    for(const p of children.slice(0,pages.get(wk)||7)){
     const pk=wk+':'+p.id,tk=key(row.hostId,p.id),projectActive=selected&&active?.projectId===p.id,section=document.createElement('section');
     const observed=ui.tabs?.(row.hostId,row.id,p.id);if(observed&&(!tabs.has(tk)||observed.revision>tabs.get(tk).revision))tabs.set(tk,observed);
     if(status.online&&status.supported&&!tabs.has(tk)&&!loading.has(tk)&&!failures.has(tk))load(row,p);
     const resources=tabs.get(tk)?.tabs||[],chatTabs=new Set(resources.filter(t=>t.type==='chat').map(t=>t.chatId));
     const chats=ui.chats(row.hostId,p.id).filter(r=>!r.archivedAt||chatTabs.has(r.id)).map(r=>({...r,type:'chat',chatId:r.id})),known=new Set(chats.map(c=>c.id));
     const items=[...chats,...resources.filter(t=>t.type!=='chat'||!known.has(t.chatId)).map(t=>({...t,...(t.type==='chat'?{id:t.chatId}:{} )}))].sort((a,b)=>(Date.parse(b.lastActivityAt||b.createdAt||b.openedAt)||0)-(Date.parse(a.lastActivityAt||a.createdAt||a.openedAt)||0));
     section.className='web-project-group'+(projectActive?' active':'')+(expanded.has(pk)?' expanded':'');section.dataset.treeProject=p.id;
     section.innerHTML=`<div class="web-group-heading"><button data-open>${navIcon('folder')}<span>${e(p.name)}</span></button><span class="web-tree-count" aria-label="${items.length} items">${items.length}</span><button data-expand aria-label="${expanded.has(pk)?'Collapse':'Expand'} ${e(p.name)}" aria-expanded="${expanded.has(pk)}">${expanded.has(pk)?'⌄':'›'}</button></div>`;
     section.querySelector('[data-open]').onclick=()=>open(()=>ui.open({...row,projectId:p.id}));
     section.querySelector('[data-expand]').onclick=()=>{if(expanded.has(pk)){expanded.delete(pk);pages.delete(pk);}else expanded.add(pk);save();render();};
     if(expanded.has(pk)){
      for(const item of items.slice(0,pages.get(pk)||7)){const button=document.createElement('button'),isSelected=projectActive&&active?.tab===(item.type==='chat'?'chat:'+item.chatId:item.id);button.className='web-project-chat web-tree-item'+(isSelected?' active':'');button.dataset.treeItem=item.type==='chat'?'chat:'+item.chatId:item.id;button.title=item.title||item.type;button.innerHTML=recentItemMarkup(item);button.onclick=()=>open(()=>ui.open({...row,projectId:p.id},item));section.append(button);}
      if(failures.has(tk)){const retry=document.createElement('button');retry.className='web-tree-more';retry.textContent='Retry tab inventory';retry.title=failures.get(tk);retry.onclick=()=>{failures.delete(tk);load(row,p);};section.append(retry);}
      else if(!items.length){const empty=document.createElement('p');empty.className='web-tree-empty';empty.textContent=loading.has(tk)?'Loading tabs…':'No chats or tabs yet.';section.append(empty);}
      if(items.length>(pages.get(pk)||7))section.append(more(pk));
     }group.append(section);
    }
    if(children.length>(pages.get(wk)||7))group.append(more(wk));
   }(row.hostId===primary?node:containers.get(row.hostId)).append(group);
  }
  if(other)node.append(other);
 }
 function more(id){const button=document.createElement('button');button.className='web-tree-more';button.textContent='More';button.onclick=()=>{pages.set(id,(pages.get(id)||7)+4);render();};return button;}
 return {render,invalidate,collapse};
}
