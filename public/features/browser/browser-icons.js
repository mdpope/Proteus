// Icons are bounded raster data received from the embedded browser session.
export function browserTabIcon(info={},escape=value=>String(value)) {
  if(info.agentControlling)return '<svg class="browser-tab-icon agent-cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3v17l5-5 4 7 3-2-4-7h7z" fill="currentColor"/></svg><span class="sr-only">Agent controlling this tab. </span>';
  const icon=typeof info.favicon==='string'&&info.favicon.length<=98304&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(info.favicon)?info.favicon:'';
  return icon?`<img class="browser-tab-icon" src="${escape(icon)}" alt="">`:'<span class="browser-tab-icon browser-tab-fallback" aria-hidden="true">◎</span>';
}
// Audio belongs to this window's page, not the shared project descriptor.
export function browserAudioIcon(info={}) {
  if(!info.audioPlaying&&!info.audioMuted)return '';
  const label=info.audioMuted?'Tab muted':'Audio playing';
  return `<span class="tab-audio" title="${label}" role="img" aria-label="${label}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4z"/>${info.audioMuted?'<path d="m16 9 6 6m0-6-6 6"/>':'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}</svg></span>`;
}
export const teamTabIcon='<svg class="feature-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="8" cy="7" r="3"/><path d="M2 20v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m1 3a5 5 0 0 1 5 5v2"/></svg>';
export const standupTabIcon='<svg class="feature-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="11" cy="18" r="2" fill="currentColor"/></svg>';
