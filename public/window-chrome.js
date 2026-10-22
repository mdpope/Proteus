const icon = paths => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
export function createWindowChrome(desktop, notify) {
  if (desktop?.platform !== 'linux') return { html: '', mount() {} };
  document.body.classList.add('linux-window-chrome');
  let root, menuOpen = false;
  const maximize = icon('<rect x="6" y="6" width="12" height="12" rx="1"/>');
  const restore = icon('<path d="M9 6V4h11v11h-2"/><rect x="4" y="9" width="11" height="11" rx="1"/>');
  function update(state) {
    if (!root?.isConnected || !state) return;
    const button = root.querySelector('[data-window-action="toggle-maximize"]');
    const expanded = state.maximized || state.fullscreen;
    button.innerHTML = expanded ? restore : maximize;
    button.title = button.ariaLabel = state.fullscreen ? 'Leave full screen' : expanded ? 'Restore window' : 'Maximize window';
    root.classList.toggle('inactive', !state.focused);
  }
  desktop.onWindowChromeState(update);
  async function act(action, button) {
    if (action === 'menu') {
      if (menuOpen) return;
      menuOpen = true; button.setAttribute('aria-expanded', 'true');
    }
    try {
      const rect = button.getBoundingClientRect();
      update(await desktop.windowChrome({ action, ...(action === 'menu' ? { x: rect.left, y: rect.bottom } : {}) }));
    } catch (error) { notify(error.message); }
    finally {
      if (action === 'menu') { menuOpen = false; button.setAttribute('aria-expanded', 'false'); if (button.isConnected) button.focus(); }
    }
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'F10' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !root?.isConnected) return;
    event.preventDefault(); void act('menu', root.querySelector('[data-window-action="menu"]'));
  });
  const control = (action, label, image, extra = '') => `<button type="button" data-window-action="${action}" title="${label}" aria-label="${label}" ${extra}>${image}</button>`;
  return {
    html: `<div id="linux-window-controls" role="group" aria-label="Window controls">${control('close', 'Close window', icon('<path d="m7 7 10 10M7 17 17 7"/>'))}${control('minimize', 'Minimize window', icon('<path d="M6 12h12"/>'))}${control('toggle-maximize', 'Maximize window', maximize)}${control('menu', 'Application menu', icon('<circle cx="12" cy="12" r="9"/><g fill="currentColor" stroke="none"><circle cx="8" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="16" cy="12" r="1"/></g>'), 'aria-haspopup="menu" aria-expanded="false"')}</div>`,
    mount(host) {
      root = host.querySelector('#linux-window-controls');
      for (const button of root.querySelectorAll('[data-window-action]')) button.onclick = () => void act(button.dataset.windowAction, button);
      void desktop.windowChrome({ action: 'state' }).then(update).catch(error => notify(error.message));
    }
  };
}
