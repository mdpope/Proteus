import {browserLabel} from '../browser/browser-label.js';
import {chatIconPaths} from '../../shared/navigation/add-tab-menu.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString():'—';
const icon=(tab,preview)=>preview&&['chat','run','remote-run'].includes(tab.type)?`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" role="img" aria-label="Chat">${chatIconPaths}</svg>`:tab.type==='browser'&&/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(tab.favicon||'')?`<img src="${esc(tab.favicon)}" alt="Browser">`:`<span aria-label="${esc(tab.type)}">${({browser:'◎',terminal:'⌘',chat:'▱',run:'▱','remote-run':'▱',document:'▤',markdown:'▤','remote-document':'▤'})[tab.type]||'▧'}</span>`;
const columns=[['Type',40,28],['Title',360,140],['URL',null,80],['Opened',150,100],['Last interaction',150,100],['Actions',320,240]];
const widthsKey='proteus.workspace-tabs.column-widths.v1';
const selections=new Map();
export async function refreshMountedWorkspaceTabs(){await Promise.all([...selections.values()].map(selection=>selection.refreshView?.()));}
// Reorder one owner in its existing array slots: aggregate/filtered tables never reparent tabs.
export function reorderWorkspaceTabSiblings(tabs,{id,targetId,parentId,after}){
 if(typeof parentId!=='string'||!parentId||typeof after!=='boolean')throw new Error('Choose tabs in the same workspace or project.');
 const source=tabs.find(tab=>tab.id===id),target=tabs.find(tab=>tab.id===targetId);
 if(!source||!target)throw new Error('A tab was closed. Refresh Open tabs and try again.');
 if(source.parentId!==parentId||target.parentId!==parentId)throw new Error('Tabs can only be reordered within their current workspace or project.');
 const siblings=tabs.filter(tab=>tab.parentId===parentId),ordered=siblings.filter(tab=>tab!==source);
 if(source===target)return tabs.slice();
 ordered.splice(ordered.indexOf(target)+(after?1:0),0,source);
 let index=0;return tabs.map(tab=>tab.parentId===parentId?ordered[index++]:tab);
}
export function mountWorkspaceTabs(container,{tabs,act,refresh,notify=()=>{},preview=false,reorder,allowReorder=true,selectionKey='tabs',allTabs=()=>tabs,bulk,toolbar,notice=()=>null}){
 if(!selections.has(selectionKey))selections.set(selectionKey,{ids:new Set(),selecting:false,busy:false});const selection=selections.get(selectionKey);
 let refreshGeneration=0;
 selection.refreshView=async()=>{
  if(!container.isConnected||selection.busy)return;const generation=++refreshGeneration,next=await refresh?.();
  if(!container.isConnected||generation!==refreshGeneration)return;
  // Read focus after I/O, immediately before replacing controls. Concurrent
  // refreshes and typing may have replaced the earlier input or changed intent.
  const active=document.activeElement,query=active?.matches('[data-tab-query]')&&container.contains(active)?{start:active.selectionStart,end:active.selectionEnd}:null;
  if(next)tabs=next;draw();if(query){const input=container.querySelector('[data-tab-query]');input.focus({preventScroll:true});input.setSelectionRange(query.start,query.end);}
 };
 while(selections.size>100){const first=selections.keys().next().value;if(first===selectionKey)break;selections.delete(first);}
 const selectedRows=()=>allTabs().filter(tab=>selection.ids.has(tab.id));
 selection.query??='';selection.type??='all';
 const canReorder=allowReorder&&preview&&typeof reorder==='function';let cancelDrag=()=>{},busy=false;
 const focusTitle=id=>[...container.querySelectorAll('[data-managed-tab]')].find(row=>row.dataset.managedTab===id)?.querySelector('.workspace-tab-title')?.focus({preventScroll:true});
 const commitReorder=async(source,target,after)=>{
  if(busy)return;busy=true;
  try{await reorder(source,target,after);const next=await refresh?.();if(next)tabs=next;draw();focusTitle(source.id);}
  catch(error){notify(error.message);}
  finally{busy=false;}
 };

 let widths=[];try{const saved=JSON.parse(localStorage.getItem(widthsKey)||'[]');widths=columns.map((column,i)=>Number.isFinite(saved[i])?Math.min(1600,Math.max(column[2],saved[i])):column[1]);}catch{widths=columns.map(column=>column[1]);}
 const resize=(index,value)=>{widths[index]=Math.min(1600,Math.max(columns[index][2],value));const grid=container.querySelector('.workspace-tab-manager');grid.style.setProperty('--tab-columns',(selection.selecting?['36px']:[]).concat(widths.map(width=>width===null?'minmax(80px,1fr)':width+'px')).join(' '));grid.style.setProperty('--tab-min-width',(widths.reduce((sum,width)=>sum+(width??120),0)+60)+'px');container.querySelectorAll('[data-resize-column]').forEach((handle,i)=>handle.setAttribute('aria-valuenow',Math.round(widths[i]??handle.parentElement.getBoundingClientRect().width)));};
 const saveWidths=()=>{try{localStorage.setItem(widthsKey,JSON.stringify(widths));}catch{}};
 const draw=()=>{
  cancelDrag();
  const query=selection.query.trim().toLocaleLowerCase();
  const kind=tab=>['chat','run','remote-run'].includes(tab.type)?'chat':['document','markdown','remote-document'].includes(tab.type)?'document':tab.type;
  const visible=tabs.filter(tab=>(selection.type==='all'||kind(tab)===selection.type)&&(!query||[tab.title,tab.label,tab.url].some(value=>String(value||'').toLocaleLowerCase().includes(query))));
  const live=new Set(allTabs().map(tab=>tab.id));for(const id of selection.ids)if(!live.has(id))selection.ids.delete(id);
  container.innerHTML=`<div class="heading"><h2>Open tabs</h2><span class="note">${visible.length} of ${tabs.length} tabs · ${preview?'hidden browsers unload unless Persisted':'hidden tabs stay open'}</span></div>${notice()?`<p class="banner" data-tabs-restore-notice>${esc(notice().text)}</p>`:''}<div class="workspace-tab-filters"><label>Type<select data-tab-type aria-label="Filter tab type">${['all','browser','chat','document','terminal'].map(type=>`<option value="${type}" ${selection.type===type?'selected':''}>${type==='all'?'All types':type[0].toUpperCase()+type.slice(1)}</option>`).join('')}</select></label><label>Filter tabs<input data-tab-query type="search" aria-label="Filter tabs" placeholder="Title or URL" value="${esc(selection.query)}"></label></div><div class="workspace-tab-manager ${canReorder?'workspace-tab-reorder':''}"><div class="workspace-tab-row workspace-tab-head">${selection.selecting?'<label><input type="checkbox" data-select-all aria-label="Select all visible tabs"></label>':''}${columns.map(([label,,min],i)=>`<span>${preview&&i===4?'Last activity':label}<span class="workspace-column-resizer" data-resize-column="${i}" role="separator" tabindex="0" aria-label="Resize ${label} column" aria-orientation="vertical" aria-valuemin="${min}" aria-valuemax="1600"></span></span>`).join('')}</div>${visible.map((tab,index)=>`<div class="workspace-tab-row ${tab.hidden?'is-hidden':''}" data-managed-tab="${esc(tab.id)}" ${canReorder?'aria-keyshortcuts="Alt+Shift+ArrowUp Alt+Shift+ArrowDown"':''}>${selection.selecting?`<label><input type="checkbox" data-select-tab="${esc(tab.id)}" aria-label="Select ${esc(tab.title||tab.label||'tab')}" ${selection.ids.has(tab.id)?'checked':''}></label>`:''}<div class="workspace-tab-icon">${icon(tab,preview)}</div><button type="button" class="workspace-tab-title" data-action="open" ${canReorder?'aria-keyshortcuts="Alt+Shift+ArrowUp Alt+Shift+ArrowDown"':''} title="${esc(tab.title||tab.label)}${canReorder?' · Drag to reorder within this location; Alt+Shift+↑/↓':''}">${esc(browserLabel(tab))}${tab.hidden?'<small>Hidden</small>':''}</button><div class="workspace-tab-url" title="${esc(tab.url)}">${esc(tab.url||'—')}</div><time>${esc(date(tab.openedAt))}</time><time>${esc(date(preview?(tab.lastActivityAt||tab.info?.lastActivityAt||tab.openedAt):tab.lastTouchedAt))}</time><div class="actions">${!allowReorder||canReorder?'':`<button data-action="up" ${index===0?'disabled':''} aria-label="Move ${esc(tab.title||tab.label)} up">↑</button><button data-action="down" ${index===visible.length-1?'disabled':''} aria-label="Move ${esc(tab.title||tab.label)} down">↓</button>`}<button data-action="${tab.hidden?'restore':'hide'}">${tab.hidden?'Restore':'Hide'}</button><button data-action="move">Move</button><button data-action="close" class="danger">Close</button></div></div>`).join('')||'<p class="note">No open tabs in this workspace.</p>'}</div>`;
  const queryInput=container.querySelector('[data-tab-query]');
  queryInput.oninput=()=>{const position=queryInput.selectionStart;selection.query=queryInput.value;draw();const input=container.querySelector('[data-tab-query]');input.focus({preventScroll:true});input.setSelectionRange(position,position);};
  container.querySelector('[data-tab-type]').onchange=event=>{selection.type=event.target.value;draw();container.querySelector('[data-tab-type]').focus({preventScroll:true});};
  resize(0,widths[0]);
  selection.redraw=()=>{if(container.isConnected)draw();};
  const tools=toolbar||container.querySelector('.heading');tools.querySelector('[data-tab-bulk]')?.remove();const actions=document.createElement('div');actions.className='actions tab-bulk-actions';actions.dataset.tabBulk='';
  actions.innerHTML=`<span class="note">${selection.ids.size?selection.ids.size+' selected':''}</span><button data-bulk-select ${selection.busy?'disabled':''}>${selection.selecting?'Done':'Select'}</button>${['hide','move','close'].map(action=>`<button data-bulk-action="${action}" ${!selection.ids.size||selection.busy?'disabled':''}>${action[0].toUpperCase()+action.slice(1)}</button>`).join('')}`;tools.append(actions);
  actions.querySelector('[data-bulk-select]').onclick=()=>{selection.selecting=!selection.selecting;if(!selection.selecting)selection.ids.clear();draw();};
  const toggle=id=>{if(selection.busy)return;selection.selecting=true;selection.ids.has(id)?selection.ids.delete(id):selection.ids.add(id);draw();};
  container.querySelector('.workspace-tab-manager').addEventListener('click',event=>{if(!(event.metaKey||event.ctrlKey)||event.target.closest('.actions'))return;const row=event.target.closest('[data-managed-tab]');if(!row)return;event.preventDefault();event.stopImmediatePropagation();toggle(row.dataset.managedTab);},true);
  container.querySelectorAll('[data-select-tab]').forEach(input=>input.onchange=()=>toggle(input.dataset.selectTab));
  const all=container.querySelector('[data-select-all]');if(all){all.checked=!!visible.length&&visible.every(tab=>selection.ids.has(tab.id));all.indeterminate=!all.checked&&visible.some(tab=>selection.ids.has(tab.id));all.onchange=()=>{for(const tab of visible)all.checked?selection.ids.add(tab.id):selection.ids.delete(tab.id);draw();};}
  actions.querySelectorAll('[data-bulk-action]').forEach(button=>button.onclick=async()=>{if(selection.busy)return;const rows=selectedRows();if(!rows.length)return;selection.busy=true;draw();try{const result=bulk?await bulk(button.dataset.bulkAction,rows):await (async()=>{if(button.dataset.bulkAction==='move')throw Error('Bulk move is unavailable on this owner.');const completed=[],failures=[];for(const row of rows)try{await act(button.dataset.bulkAction,row);completed.push(row.id);}catch(error){failures.push({id:row.id,error:error.message});}return {completed,failures};})();if(!result?.cancelled){for(const id of result?.completed||[])selection.ids.delete(id);for(const failure of result?.failures||[])notify((rows.find(row=>row.id===failure.id)?.title||failure.id)+': '+failure.error);}}catch(error){notify(error.message);}finally{selection.busy=false;try{const next=await refresh?.();if(next)tabs=next;}catch(error){notify(error.message);}selection.redraw?.();}});

  container.querySelectorAll('[data-resize-column]').forEach(handle=>{
   const index=Number(handle.dataset.resizeColumn);
   handle.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();const start=event.clientX,width=handle.parentElement.getBoundingClientRect().width;handle.setPointerCapture(event.pointerId);handle.onpointermove=move=>resize(index,width+move.clientX-start);const finish=()=>{handle.onpointermove=null;handle.onpointerup=null;handle.onpointercancel=null;saveWidths();};handle.onpointerup=finish;handle.onpointercancel=finish;};
   handle.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();resize(index,event.key==='Home'?(columns[index][1]??240):(widths[index]??handle.parentElement.getBoundingClientRect().width)+(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?40:10));saveWidths();};
   handle.ondblclick=()=>{widths[index]=columns[index][1];resize(0,widths[0]);saveWidths();};
  });
  if(canReorder){
   const grid=container.querySelector('.workspace-tab-manager');let suppressClick=false;
   grid.addEventListener('pointerdown',()=>{suppressClick=false;},true);
   grid.addEventListener('click',event=>{if(suppressClick&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},true);
   grid.querySelectorAll('[data-managed-tab]').forEach(row=>{
    const source=tabs.find(tab=>tab.id===row.dataset.managedTab);
    row.querySelector('.workspace-tab-title').onkeydown=event=>{
     if(!event.altKey||!event.shiftKey||!['ArrowUp','ArrowDown'].includes(event.key))return;
     event.preventDefault();event.stopPropagation();
     const siblings=tabs.filter(tab=>tab.parentId===source.parentId),index=siblings.indexOf(source),target=siblings[index+(event.key==='ArrowUp'?-1:1)];
     if(target)void commitReorder(source,target,event.key==='ArrowDown');
    };
    row.ondragstart=event=>{if(!event.target.closest('a,input,textarea,[contenteditable]'))event.preventDefault();};
    row.onpointerdown=event=>{
     if(busy||event.button!==0||!event.isPrimary||event.target.closest('a,input,select,textarea,[contenteditable],[data-resize-column],button:not(.workspace-tab-title),.actions'))return;
     cancelDrag();suppressClick=false;
     const startX=event.clientX,startY=event.clientY,pointerId=event.pointerId;let dragging=false,target=null,after=false;
     const clearDrop=()=>grid.querySelectorAll('.workspace-tab-drop-before,.workspace-tab-drop-after').forEach(node=>node.classList.remove('workspace-tab-drop-before','workspace-tab-drop-after'));
     const finish=()=>{document.removeEventListener('pointermove',movePointer);document.removeEventListener('pointerup',upPointer);document.removeEventListener('pointercancel',cancelPointer);row.onlostpointercapture=null;document.removeEventListener('keydown',escape);clearDrop();row.classList.remove('workspace-tab-dragging');grid.classList.remove('workspace-tab-drop-invalid');if(row.hasPointerCapture(pointerId))row.releasePointerCapture(pointerId);cancelDrag=()=>{};};
     const escape=key=>{if(key.key==='Escape'){key.preventDefault();suppressClick=dragging;finish();}};
     cancelDrag=finish;document.addEventListener('keydown',escape);
     const movePointer=move=>{
      if(move.pointerId!==pointerId)return;
      if(!row.isConnected){finish();return;}
      if(!dragging&&Math.hypot(move.clientX-startX,move.clientY-startY)<6)return;
      if(!dragging){dragging=true;suppressClick=true;row.setPointerCapture(pointerId);row.classList.add('workspace-tab-dragging');}
      move.preventDefault();clearDrop();
      const destination=document.elementFromPoint(move.clientX,move.clientY)?.closest('[data-managed-tab]');
      const candidate=destination&&grid.contains(destination)?tabs.find(tab=>tab.id===destination.dataset.managedTab):null;
      target=candidate&&candidate.id!==source.id&&candidate.parentId===source.parentId?candidate:null;
      grid.classList.toggle('workspace-tab-drop-invalid',!!candidate&&candidate.parentId!==source.parentId);
      if(target){after=move.clientY>=destination.getBoundingClientRect().top+destination.getBoundingClientRect().height/2;destination.classList.add(after?'workspace-tab-drop-after':'workspace-tab-drop-before');}
     };
     const upPointer=up=>{if(up.pointerId!==pointerId)return;const destination=row.isConnected?target:null,position=after,wasDragging=dragging;finish();if(wasDragging){up.preventDefault();if(destination)void commitReorder(source,destination,position);}};
     const cancelPointer=()=>{suppressClick=dragging;finish();};row.onlostpointercapture=cancelPointer;
     document.addEventListener('pointermove',movePointer);document.addEventListener('pointerup',upPointer);document.addEventListener('pointercancel',cancelPointer);
    };
   });
  }
  container.querySelectorAll('[data-action]').forEach(button=>button.onclick=async()=>{
   const tab=tabs.find(tab=>tab.id===button.closest('[data-managed-tab]').dataset.managedTab);if(!tab)return;
   button.disabled=true;try{await act(button.dataset.action,tab);if(button.dataset.action==='open')return;const next=await refresh?.();if(next)tabs=next;draw();}catch(error){notify(error.message);button.disabled=false;}
  });
 };draw();return {update(next){tabs=next;draw();}};
}
