import {mountBrowserExtensions} from './browser-extensions-toolbar.js';
// Shared address field and agent access presentation for every desktop browser scope.
const robot = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8V4H9M2 13v4m20-4v4"/><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M9 12v2m6-2v2m-6 3h6"/></svg>';
const rendererEpoch = crypto.randomUUID();
const rendererStartedAt = performance.timeOrigin;
let selectedSurfaceRevision = 0;
const heldHistoryClicks = new Map();
export function browserSurfaceRevision() { return selectedSurfaceRevision; }
export function selectBrowserSurface() { return ++selectedSurfaceRevision; }
export function browserSurfaceIdentity(selectionRevision = selectedSurfaceRevision) {
  return { rendererEpoch, rendererStartedAt, selectionRevision };
}

export function browserAddress(prefix, label) {
  return `<div class="browser-address"><span data-browser-profile-label class="browser-profile-label" hidden></span><input id="${prefix}-url" aria-label="${label}" placeholder="Enter a website address" autocomplete="off" spellcheck="false"><button type="button" id="${prefix}-share" class="browser-agent-toggle" aria-pressed="false" aria-label="Agent access off. Private tab. Click to allow agents to use this tab." title="Agent access OFF — Private tab. Click to allow agents to use this tab.">${robot}</button><button type="button" data-browser-shield class="browser-shield" aria-label="Browser privacy"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z"/></svg><span>0</span></button></div>`;
}

export function updateAgentAccess(button, info = {}) {
  if (!button) return;
  button.disabled=info.extensionsEnabled===true;
  const fill=button.closest('.browserbar')?.querySelector('[id$="fill-login"]');if(fill){fill.hidden=info.extensionsEnabled===true;fill.title="Advanced: fill with configured CLI broker";}
  const enabled = !!(info.shared || info.owner || info.resumeOwner);
  const description = info.extensionsEnabled ? 'This profile is private while extensions are enabled.' : enabled
    ? 'Agent access ON — Agents may interact with this tab. Click to revoke access, disconnect automation and cancel pending agent actions.'
    : 'Agent access OFF — Private tab. Agents cannot interact with it. Click to allow agents to use this tab.';
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-label', description);
  button.title = description;
  const label=button.parentElement?.querySelector('[data-browser-profile-label]');if(label){label.hidden=!info.profileId||info.profileId==='default';label.textContent=info.profileName||'Profile';}
  mountBrowserExtensions(button.closest('.browserbar'),info);
  const shield=button.parentElement?.querySelector('[data-browser-shield]');if(shield){const protection=info.protection||{};shield.querySelector('span').textContent=String(protection.count||0);shield.classList.toggle('paused',!protection.enabled||protection.paused);shield.title=!protection.ready?'Ghostery filters need downloading':protection.paused?'Protection paused for this website':protection.enabled?'Ghostery · '+(protection.count||0)+' requests blocked':'Protection disabled for this profile';shield.setAttribute('aria-label',shield.title);shield.onclick=async()=>{try{const rect=shield.getBoundingClientRect(),choice=await window.desktop.browser({action:'popup-menu',items:[{id:'toggle',label:protection.paused?'Resume protection for this site':'Pause protection for this site',enabled:!!info.url},{id:'filters',label:protection.ready?'Update Ghostery filters':'Download Ghostery filters'},{id:'preferences',label:'Browser Preferences'}],x:rect.left,y:rect.bottom});if(choice==='toggle')await window.desktop.browser({action:'protection-toggle',id:info.id});else if(choice==='filters'){document.dispatchEvent(new CustomEvent('proteus-notice',{detail:'Updating Ghostery filters…'}));const status=await window.desktop.browser({action:'filters-update'});document.dispatchEvent(new CustomEvent('proteus-notice',{detail:'Ghostery filters updated '+new Date(status.updatedAt).toLocaleString()+'.'}));}else if(choice==='preferences')document.dispatchEvent(new CustomEvent('proteus-browser-preferences'));}catch(error){document.dispatchEvent(new CustomEvent('proteus-notice',{detail:error.message}));}};}

}

// Native menus stay above the embedded page. Keep the ordinary click separate
// from a held pointer so dismissing a history menu cannot also navigate once.
export function bindBrowserHistoryButton(button, { direction, tabId, isCurrent, command, selectionRevision, group, onError = () => {} }) {
  if (!button || !['back', 'forward'].includes(direction)) return;
  let holdTimer = null;
  const holdKey = `${group}:${tabId}:${direction}`;
  const cancelHold = () => { clearTimeout(holdTimer); holdTimer = null; };
  const current = () => button.isConnected && !button.disabled && isCurrent();
  const invoke = (action, extra = {}) => {
    try { Promise.resolve(command(action, extra)).catch(onError); }
    catch (error) { onError(error); }
  };
  const openHistory = (held = false) => {
    cancelHold();
    if (!current()) return;
    if (held) {
      // The browser-state event may rebuild this button while its menu is up.
      // Keep suppression with the tab/direction, not the replaced DOM node.
      heldHistoryClicks.set(holdKey, Date.now()+3000);
    }
    const bounds = button.getBoundingClientRect();
    invoke('history-menu', { direction, x: bounds.left, y: bounds.bottom, ...browserSurfaceIdentity(typeof selectionRevision==='function'?selectionRevision():selectionRevision), expectedGroup:group });
  };
  button.title = (direction === 'back' ? 'Back' : 'Forward') + ' · hold for history';
  button.setAttribute('aria-haspopup', 'menu');
  button.onpointerdown = event => {
    if (event.button !== 0 || !current()) return;
    cancelHold(); heldHistoryClicks.delete(holdKey);
    holdTimer = setTimeout(() => openHistory(true), 450);
  };
  button.onpointerup = () => {
    cancelHold();
    if((heldHistoryClicks.get(holdKey)||0)>Date.now())heldHistoryClicks.set(holdKey,Date.now()+750);
  };
  button.onpointercancel = cancelHold;
  button.onpointerleave = cancelHold;
  button.oncontextmenu = event => { event.preventDefault(); openHistory(); };
  button.onkeydown = event => {
    if (event.key === 'ArrowDown' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault(); openHistory();
    }
  };
  button.onclick = event => {
    cancelHold();
    const until=heldHistoryClicks.get(holdKey)||0;
    if(until){heldHistoryClicks.delete(holdKey);if(until>Date.now()){event.preventDefault();return;}}
    if (current()) invoke(direction);
  };
}
