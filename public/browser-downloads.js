const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let panel=null,visibleLimit=50;
export function mountDownloadIndicator(bar){
 if(!bar||!window.desktop?.browser)return;let button=bar.querySelector('[data-browser-downloads]');
 if(!button){button=document.createElement('button');button.type='button';button.dataset.browserDownloads='';button.textContent='↓';button.title='Downloads';button.setAttribute('aria-label','Downloads');const overview=bar.querySelector('[id$="overview"],[data-browser-overview]');if(overview)overview.before(button);else bar.querySelector('.browser-go')?.after(button);}
 button.onclick=()=>void showDownloads(button).catch(error=>document.dispatchEvent(new CustomEvent('proteus-notice',{detail:error.message})));
 void window.desktop.browser({action:'downloads-list'}).then(state=>{if(button.isConnected){button.classList.toggle('downloading',state.active>0);button.title=state.active?`Downloads · ${state.active} in progress`:'Downloads';button.setAttribute('aria-label',button.title);}}).catch(()=>{});
}
async function showDownloads(anchor){
 if(panel?.isConnected){panel.close();return;}
 visibleLimit=50;panel=document.createElement('dialog');panel.className='download-panel';panel.setAttribute('aria-label','Downloads');document.body.append(panel);panel.onclose=()=>{panel.remove();panel=null;void window.desktop.browser({action:'overlay',token:'downloads',visible:false});};
 await window.desktop.browser({action:'overlay',token:'downloads',visible:true});panel.showModal();await refreshDownloads();
}
export async function refreshDownloads(){
 const target=panel;if(!target?.isConnected)return;const state=await window.desktop.browser({action:'downloads-list',limit:visibleLimit});if(target!==panel)return;
 target.innerHTML=`<div class="heading"><h2>Downloads</h2><button data-download-close aria-label="Close downloads">×</button></div><div class="actions"><button data-download-folder>Open Downloads folder</button></div>${state.error?`<p class="banner">${esc(state.error)}</p>`:''}<div class="download-list">${state.items.map(row=>`<article class="download-row"><strong>${esc(row.name)}</strong><p class="note">${esc(row.state)} · ${esc(new Date(row.downloadedAt||row.startedAt).toLocaleString())}${row.downloadedAt?' · Downloaded':' · Started'}</p>${['progressing','paused'].includes(row.state)?`<progress max="${row.totalBytes||Math.max(row.receivedBytes,1)}" value="${row.receivedBytes}"></progress><button data-download-action="cancel" data-id="${esc(row.id)}">Cancel</button>`:row.state==='completed'?`<div class="actions"><button data-download-action="open" data-id="${esc(row.id)}">Open file</button><button data-download-action="show" data-id="${esc(row.id)}">Show in folder</button></div>`:''}</article>`).join('')||'<p class="note">No downloads yet.</p>'}</div>`;
 target.querySelector('[data-download-close]').onclick=()=>target.close();target.querySelector('[data-download-folder]').onclick=()=>void window.desktop.browser({action:'downloads-folder'});
 if(state.hasMore&&visibleLimit<200){const more=document.createElement('button');more.textContent='Show more downloads';more.onclick=()=>{visibleLimit=Math.min(200,visibleLimit+50);void refreshDownloads();};target.append(more);}
 target.querySelectorAll('[data-download-action]').forEach(button=>button.onclick=async()=>{try{await window.desktop.browser({action:'downloads-'+button.dataset.downloadAction,downloadId:button.dataset.id});await refreshDownloads();}catch(error){document.dispatchEvent(new CustomEvent('proteus-notice',{detail:error.message}));}});
}
export function downloadsChanged(){for(const bar of document.querySelectorAll('.browserbar'))mountDownloadIndicator(bar);void refreshDownloads();}
