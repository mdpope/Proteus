import {addTabIcons} from './add-tab-menu.js';
let workingTimer,previews=[],ui, overlay, opening = false, scope = 'main';
export function initBrowserOverview(options) { ui = options; }
export const isBrowserOverviewOpen = () => !!overlay || opening;
export async function showBrowserOverview(requestedScope='main') {
  if (!window.desktop?.browser || opening) return;
  if (overlay) { overlay.focus(); return; }
  opening = true;scope=requestedScope;
  try {
    const [result,cached] = await Promise.all([window.desktop.browser({action:'overview'}),ui.loadCached?.(scope)||[]]);
    overlay = document.createElement('dialog'); overlay.className = 'browser-overview';
    overlay.setAttribute('aria-label',scope==='main'?'App tab overview':'Tab overview'); document.body.append(overlay);
    let backdropPressed=false;
    const outside=event=>{const r=overlay.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
    overlay.addEventListener('pointerdown',event=>{backdropPressed=event.target===overlay&&outside(event);});
    overlay.addEventListener('click',event=>{if(backdropPressed&&event.target===overlay&&outside(event)){event.preventDefault();event.stopPropagation();void close();}backdropPressed=false;});
    overlay.addEventListener('cancel', event => { event.preventDefault(); void close(); });
    previews=[...(result.tabs||[]),...cached];paint(ui.overviewGroups(previews,scope)); overlay.showModal();workingTimer=setInterval(()=>{if(!overlay)return;const rows=ui.overviewGroups([],scope).flatMap(group=>group.items);for(const item of rows){const title=overlay.querySelector('[data-overview-select="'+CSS.escape(item.id)+'"] strong');if(!title)continue;const spinner=title.querySelector('.overview-working');if(item.working&&!spinner){const node=document.createElement('span');node.className='overview-working';node.setAttribute('role','status');node.setAttribute('aria-label','Chat working');title.prepend(node);}else if(!item.working)spinner?.remove();}},1000);
    requestAnimationFrame(()=>{const selected=overlay?.querySelector('[aria-current="page"]');selected?.scrollIntoView({block:"center"});selected?.focus({preventScroll:true});});
  } catch (error) { await window.desktop.browser({action:'overview-end'}).catch(()=>{});ui.restore(); ui.toast(error.message); }
  finally { opening = false; }
}
function itemIcon(item){const kind=['run','remote-run','chat'].includes(item.kind)?'chat':['agent-terminal','terminal'].includes(item.kind)?'terminal':['markdown','remote-document','document'].includes(item.kind)?'markdown':item.kind;const paths=addTabIcons[kind]||(kind==='workspace'?'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>':addTabIcons.markdown);return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${paths}</svg>`;}
function paint(groups) {
  const total=groups.reduce((count,group)=>count+group.items.length,0),title=scope==='main'?'App tab overview':'Tab overview';
  overlay.innerHTML=`<div class="heading"><div><h1>${title}</h1><p class="note">${total} ${total===1?'tab':'tabs'}</p></div><button data-overview-done>Done</button></div>${groups.map(group=>`<section class="overview-group" data-overview-group="${ui.escape(group.id)}">${group.title?`<h2>${ui.escape(group.title)}</h2>`:''}<div class="browser-overview-grid">${group.items.map(item=>`<article draggable="true" data-overview-drag="${ui.escape(item.id)}" class="browser-overview-card ${item.selected?'current':''}"><button data-overview-select="${ui.escape(item.id)}" class="browser-overview-select" ${item.selected?'aria-current="page"':''} title="${ui.escape(item.url||item.title)}"><div class="browser-overview-preview">${item.thumbnail?`<img src="${ui.escape(item.thumbnail)}" alt="">`:itemIcon(item)}</div><strong>${item.working?'<span class="overview-working" role="status" aria-label="Chat working"></span>':''}${itemIcon(item)}<span class="overview-title">${ui.escape(item.title)}</span></strong><span class="note">${ui.escape(item.url||({run:'Chat','remote-run':'Chat','agent-terminal':'Terminal',markdown:'Document','remote-document':'Document'})[item.kind]||item.kind||'')}</span>${item.loaded===false?'<span class="pill">Unloaded</span>':''}</button>${item.closable?`<button data-overview-close="${ui.escape(item.id)}" aria-label="Close ${ui.escape(item.title)}" title="Close tab">×</button>`:''}</article>`).join('')||(scope==='main'?'<p class="note">No open app tabs.</p>':'<p class="note">No open tabs in this project.</p>')}</div></section>`).join('')||'<p class="empty">No open content tabs.</p>'}`;
  const all=groups.flatMap(group=>group.items);
  let dragged=null;
  overlay.querySelectorAll('[data-overview-drag]').forEach(card=>{
    card.ondragstart=event=>{dragged=all.find(item=>item.id===card.dataset.overviewDrag);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',dragged.id);};
    card.ondragover=event=>{const target=all.find(item=>item.id===card.dataset.overviewDrag);if(dragged&&dragged!==target&&dragged.team===target.team&&dragged.parentId===target.parentId){event.preventDefault();event.dataTransfer.dropEffect='move';}};
    card.ondrop=async event=>{event.preventDefault();const target=all.find(item=>item.id===card.dataset.overviewDrag);if(!dragged||!target||dragged.id===target.id)return;const source=dragged;dragged=null;try{await ui.reorder(source,target,event.clientX>card.getBoundingClientRect().left+card.clientWidth/2);paint(ui.overviewGroups(previews,scope));}catch(error){ui.toast(error.message);}};
    card.onkeydown=async event=>{if(!event.altKey||!['ArrowLeft','ArrowRight'].includes(event.key))return;const item=all.find(item=>item.id===card.dataset.overviewDrag),siblings=all.filter(other=>other.parentId===item.parentId&&other.team===item.team),target=siblings[siblings.indexOf(item)+(event.key==='ArrowRight'?1:-1)];if(!target)return;event.preventDefault();try{await ui.reorder(item,target,event.key==='ArrowRight');paint(ui.overviewGroups(previews,scope));overlay.querySelector('[data-overview-drag="'+CSS.escape(item.id)+'"] button')?.focus();}catch(error){ui.toast(error.message);}};
  });
  overlay.querySelector('[data-overview-done]').onclick=()=>void close();
  overlay.querySelectorAll('[data-overview-select]').forEach(button=>button.onclick=async()=>{const item=all.find(entry=>entry.id===button.dataset.overviewSelect);await close(false);if(item)ui.selectOverview(item);});
  overlay.querySelectorAll('[data-overview-close]').forEach(button=>button.onclick=async()=>{
    button.disabled=true;try{const item=all.find(entry=>entry.id===button.dataset.overviewClose);if(item)await ui.closeOverview(item);if(overlay)paint(ui.overviewGroups(previews,scope));}
    catch(error){button.disabled=false;ui.toast(error.message);}
  });
}
async function close(restore=true){clearInterval(workingTimer);workingTimer=null;const current=overlay;overlay=null;current?.close();current?.remove();await window.desktop.browser({action:'overview-end'});if(restore)ui.restore();}
