// Match the native feature and resource symbols without depending on platform fonts.
const paths={
 chat:'<path d="M3 4h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8l-4 3v-4a3 3 0 0 1-1-2V4Z M17 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3l-3 2v-4"/>',
 folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l3 4h6a2 2 0 0 1 2 2v11H3Z"/>',
 workspace:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 gear:'<path d="m10 2-.5 2.1-1.7.8-1.9-1.1-2.4 2.4 1.1 1.9-.8 1.7L2 10v4l2.1.5.8 1.7-1.1 1.9 2.4 2.4 1.9-1.1 1.7.8.5 2.1h4l.5-2.1 1.7-.8 1.9 1.1 2.4-2.4-1.1-1.9.8-1.7L22 14v-4l-2.1-.5-.8-1.7 1.1-1.9-2.4-2.4-1.9 1.1-1.7-.8L14 2h-4Z"/><circle cx="12" cy="12" r="3"/>',
 browser:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
 document:'<path d="M6 2h9l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z M15 2v5h4 M8 12h8 M8 16h8"/>',
 terminal:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m6 9 3 3-3 3 M11 16h6"/>',
 schedule:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 collapse:'<rect x="4" y="4" width="16" height="5" rx="1"/><rect x="4" y="15" width="16" height="5" rx="1"/>',
};
export const navIcon=type=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type]||paths.chat}</svg>`;
export const resourceIcon=tab=>tab.type==='browser'&&typeof tab.favicon==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(tab.favicon)&&tab.favicon.length<=16384?`<img src="${tab.favicon}" alt="">`:navIcon(tab.type==='markdown'?'document':tab.type);
export function relativeActivity(value,now=Date.now()){const at=Date.parse(value);if(!Number.isFinite(at))return '—';const minutes=Math.max(0,Math.floor((now-at)/60000));return minutes<1?'<1m':minutes<60?minutes+'m':minutes<1440?Math.floor(minutes/60)+'h':Math.floor(minutes/1440)+'d';}
export const navEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function recentItemMarkup(item,{selected=false,computer=''}={}){const at=item.lastActivityAt||item.createdAt||item.openedAt;return `<span class="web-tree-icon">${resourceIcon(item)}</span><span class="web-tree-copy"><span class="web-tree-title">${navEscape(item.title||item.type||'Chat')}</span>${computer?`<span class="web-tree-computer">${navEscape(computer)}</span>`:''}</span><small class="web-tree-age" title="${navEscape(at||'Activity time unavailable')}">${navEscape(relativeActivity(at))}</small>`;}
