const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString():'—';
const icon=tab=>tab.type==='browser'&&/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(tab.favicon||'')?`<img src="${esc(tab.favicon)}" alt="Browser">`:`<span aria-label="${esc(tab.type)}">${({browser:'◎',terminal:'⌘',chat:'▱',run:'▱','remote-run':'▱',document:'▤',markdown:'▤','remote-document':'▤'})[tab.type]||'▧'}</span>`;
const columns=[['Type',40,28],['Title',360,140],['URL',null,80],['Opened',150,100],['Last interaction',150,100],['Actions',320,240]];
const widthsKey='proteus.workspace-tabs.column-widths.v1';
export function mountWorkspaceTabs(container,{tabs,act,refresh,notify=()=>{}}){
 let widths=[];try{const saved=JSON.parse(localStorage.getItem(widthsKey)||'[]');widths=columns.map((column,i)=>Number.isFinite(saved[i])?Math.min(1600,Math.max(column[2],saved[i])):column[1]);}catch{widths=columns.map(column=>column[1]);}
 const resize=(index,value)=>{widths[index]=Math.min(1600,Math.max(columns[index][2],value));const grid=container.querySelector('.workspace-tab-manager');grid.style.setProperty('--tab-columns',widths.map(width=>width===null?'minmax(80px,1fr)':width+'px').join(' '));grid.style.setProperty('--tab-min-width',(widths.reduce((sum,width)=>sum+(width??120),0)+60)+'px');container.querySelectorAll('[data-resize-column]').forEach((handle,i)=>handle.setAttribute('aria-valuenow',Math.round(widths[i]??handle.parentElement.getBoundingClientRect().width)));};
 const saveWidths=()=>{try{localStorage.setItem(widthsKey,JSON.stringify(widths));}catch{}};
 const draw=()=>{
  container.innerHTML=`<div class="heading"><h2>Open tabs</h2><span class="note">${tabs.length} tabs · hidden tabs stay open</span></div><div class="workspace-tab-manager"><div class="workspace-tab-row workspace-tab-head">${columns.map(([label,,min],i)=>`<span>${label}<span class="workspace-column-resizer" data-resize-column="${i}" role="separator" tabindex="0" aria-label="Resize ${label} column" aria-orientation="vertical" aria-valuemin="${min}" aria-valuemax="1600"></span></span>`).join('')}</div>${tabs.map((tab,index)=>`<div class="workspace-tab-row ${tab.hidden?'is-hidden':''}" data-managed-tab="${esc(tab.id)}"><div class="workspace-tab-icon">${icon(tab)}</div><button type="button" class="workspace-tab-title" data-action="open" title="${esc(tab.title||tab.label)}">${esc(tab.title||tab.label||'New tab')}${tab.hidden?'<small>Hidden</small>':''}</button><div class="workspace-tab-url" title="${esc(tab.url)}">${esc(tab.url||'—')}</div><time>${esc(date(tab.openedAt))}</time><time>${esc(date(tab.lastTouchedAt))}</time><div class="actions"><button data-action="up" ${index===0?'disabled':''} aria-label="Move ${esc(tab.title||tab.label)} up">↑</button><button data-action="down" ${index===tabs.length-1?'disabled':''} aria-label="Move ${esc(tab.title||tab.label)} down">↓</button><button data-action="${tab.hidden?'restore':'hide'}">${tab.hidden?'Restore':'Hide'}</button><button data-action="move">Move</button><button data-action="close" class="danger">Close</button></div></div>`).join('')||'<p class="note">No open tabs in this workspace.</p>'}</div>`;
  resize(0,widths[0]);
  container.querySelectorAll('[data-resize-column]').forEach(handle=>{
   const index=Number(handle.dataset.resizeColumn);
   handle.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();const start=event.clientX,width=handle.parentElement.getBoundingClientRect().width;handle.setPointerCapture(event.pointerId);handle.onpointermove=move=>resize(index,width+move.clientX-start);const finish=()=>{handle.onpointermove=null;handle.onpointerup=null;handle.onpointercancel=null;saveWidths();};handle.onpointerup=finish;handle.onpointercancel=finish;};
   handle.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();resize(index,event.key==='Home'?(columns[index][1]??240):(widths[index]??handle.parentElement.getBoundingClientRect().width)+(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?40:10));saveWidths();};
   handle.ondblclick=()=>{widths[index]=columns[index][1];resize(0,widths[0]);saveWidths();};
  });
  container.querySelectorAll('[data-action]').forEach(button=>button.onclick=async()=>{
   const tab=tabs.find(tab=>tab.id===button.closest('[data-managed-tab]').dataset.managedTab);if(!tab)return;
   button.disabled=true;try{await act(button.dataset.action,tab);if(button.dataset.action==='open')return;const next=await refresh?.();if(next)tabs=next;draw();}catch(error){notify(error.message);button.disabled=false;}
  });
 };draw();return {update(next){tabs=next;draw();}};
}
