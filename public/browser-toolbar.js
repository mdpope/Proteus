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
  return `<div class="browser-address"><input id="${prefix}-url" aria-label="${label}" placeholder="Enter a website address" autocomplete="off" spellcheck="false"><button type="button" id="${prefix}-share" class="browser-agent-toggle" aria-pressed="false" aria-label="Agent access off. Private tab. Click to allow agents to use this tab." title="Agent access OFF — Private tab. Click to allow agents to use this tab.">${robot}</button></div>`;
}

export function updateAgentAccess(button, info = {}) {
  if (!button) return;
  const enabled = !!(info.shared || info.owner || info.resumeOwner);
  const description = enabled
    ? 'Agent access ON — Agents may interact with this tab. Click to revoke access, disconnect automation and cancel pending agent actions.'
    : 'Agent access OFF — Private tab. Agents cannot interact with it. Click to allow agents to use this tab.';
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-label', description);
  button.title = description;
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
