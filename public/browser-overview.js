let ui, overlay, opening = false, scope = 'main';
export function initBrowserOverview(options) { ui = options; }
export const isBrowserOverviewOpen = () => !!overlay || opening;
export async function showBrowserOverview(requestedScope='main') {
  if (!window.desktop?.browser || opening) return;
  if (overlay) { overlay.focus(); return; }
  opening = true;scope=requestedScope;
  try {
    const result = await window.desktop.browser({action:'overview'});
    overlay = document.createElement('dialog'); overlay.className = 'browser-overview';
    overlay.setAttribute('aria-label','Tab overview'); document.body.append(overlay);
    let backdropPressed=false;
    const outside=event=>{const r=overlay.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
    overlay.addEventListener('pointerdown',event=>{backdropPressed=event.target===overlay&&outside(event);});
    overlay.addEventListener('click',event=>{if(backdropPressed&&event.target===overlay&&outside(event)){event.preventDefault();event.stopPropagation();void close();}backdropPressed=false;});
    overlay.addEventListener('cancel', event => { event.preventDefault(); void close(); });
    paint(ui.overviewGroups(result.tabs||[],scope)); overlay.showModal();
    requestAnimationFrame(()=>{const selected=overlay?.querySelector('[aria-current="page"]');selected?.scrollIntoView({block:"center"});selected?.focus({preventScroll:true});});
  } catch (error) { await window.desktop.browser({action:'overview-end'}).catch(()=>{});ui.restore(); ui.toast(error.message); }
  finally { opening = false; }
}
function paint(groups) {
  const total=groups.reduce((count,group)=>count+group.items.length,0);
  overlay.innerHTML=`<div class="heading"><div><h1>Tab overview</h1><p class="note">${total} ${total===1?'tab':'tabs'}</p></div><button data-overview-done>Done</button></div>${groups.map(group=>`<section class="overview-group" data-overview-group="${ui.escape(group.id)}">${group.title?`<h2>${ui.escape(group.title)}</h2>`:''}<div class="browser-overview-grid">${group.items.map(item=>`<article class="browser-overview-card ${item.selected?'current':''}"><button data-overview-select="${ui.escape(item.id)}" class="browser-overview-select" ${item.selected?'aria-current="page"':''} title="${ui.escape(item.url||item.title)}"><div class="browser-overview-preview">${item.thumbnail?`<img src="${ui.escape(item.thumbnail)}" alt="">`:`<span aria-hidden="true">${ui.escape(item.icon||'▤')}</span>`}</div><strong>${ui.escape(item.title)}</strong><span class="note">${ui.escape(item.url||item.kind||'')}</span>${item.loaded===false?'<span class="pill">Unloaded</span>':''}</button>${item.closable?`<button data-overview-close="${ui.escape(item.id)}" aria-label="Close ${ui.escape(item.title)}" title="Close tab">×</button>`:''}</article>`).join('')}</div></section>`).join('')||'<p class="empty">No open content tabs.</p>'}`;
  const all=groups.flatMap(group=>group.items);
  overlay.querySelector('[data-overview-done]').onclick=()=>void close();
  overlay.querySelectorAll('[data-overview-select]').forEach(button=>button.onclick=async()=>{const item=all.find(entry=>entry.id===button.dataset.overviewSelect);await close(false);if(item)ui.selectOverview(item);});
  overlay.querySelectorAll('[data-overview-close]').forEach(button=>button.onclick=async()=>{
    button.disabled=true;try{const item=all.find(entry=>entry.id===button.dataset.overviewClose);if(item)await ui.closeOverview(item);if(overlay)paint(ui.overviewGroups([],scope));}
    catch(error){button.disabled=false;ui.toast(error.message);}
  });
}
async function close(restore=true){const current=overlay;overlay=null;current?.close();current?.remove();await window.desktop.browser({action:'overview-end'});if(restore)ui.restore();}
