let ui, overlay, group, opening = false;
export function initBrowserOverview(options) { ui = options; }
export const isBrowserOverviewOpen = () => !!overlay || opening;
export async function showBrowserOverview(selectedGroup = 'main') {
  if (!window.desktop?.browser || opening) return;
  if (overlay) { overlay.focus(); return; }
  opening = true; group = selectedGroup;
  try {
    const result = await window.desktop.browser({action:'overview',group});
    overlay = document.createElement('dialog'); overlay.className = 'browser-overview';
    overlay.setAttribute('aria-label','Browser tab overview'); document.body.append(overlay);
    overlay.addEventListener('cancel',event => { event.preventDefault(); void close(); });
    paint(result.tabs); overlay.showModal();
  } catch (error) { await window.desktop.browser({action:'overview-end'}).catch(()=>{}); ui.toast(error.message); }
  finally { opening = false; }
}
function paint(tabs) {
  overlay.innerHTML = `<div class="heading"><div><h1>${group==='team'?'Team browser tabs':'Browser tabs'}</h1><p class="note">${tabs.length} ${tabs.length===1?'tab':'tabs'} · Select an unloaded tab to load it.</p></div><button data-overview-done>Done</button></div><div class="browser-overview-grid">${tabs.map(tab=>`<article class="browser-overview-card"><button data-overview-select="${ui.escape(tab.id)}" class="browser-overview-select" title="${ui.escape(tab.url||'New tab')}"><div class="browser-overview-preview">${tab.thumbnail?`<img src="${ui.escape(tab.thumbnail)}" alt="">`:`<span aria-hidden="true">${tab.loaded?'◎':'◌'}</span>`}</div><strong>${ui.escape(tab.title||'New tab')}</strong><span class="note">${ui.escape(tab.url||'Browser home')}</span>${!tab.loaded?'<span class="pill">Unloaded</span>':''}</button><button data-overview-close="${ui.escape(tab.id)}" aria-label="Close ${ui.escape(tab.title||'tab')}" title="Close tab">×</button></article>`).join('')||'<p class="empty">No browser tabs in this group.</p>'}</div>`;
  overlay.querySelector('[data-overview-done]').onclick = () => void close();
  overlay.querySelectorAll('[data-overview-select]').forEach(button => button.onclick = async () => { const tab = tabs.find(tab => tab.id===button.dataset.overviewSelect); await close(false); ui.select(tab); });
  overlay.querySelectorAll('[data-overview-close]').forEach(button => button.onclick = async () => {
    button.disabled = true;
    try { await window.desktop.browser({action:'close',id:button.dataset.overviewClose});ui.closed(button.dataset.overviewClose); if(overlay)paint(tabs.filter(tab=>tab.id!==button.dataset.overviewClose)); }
    catch(error) { button.disabled=false;ui.toast(error.message); }
  });
}
async function close(restore = true) {
  const current=overlay;overlay=null;current?.close();current?.remove();
  await window.desktop.browser({action:'overview-end'});
  if(restore)ui.restore();
}
