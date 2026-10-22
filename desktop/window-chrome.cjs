// Linux draws its controls in the shell; other desktops retain their native frame.
const windowChromeOptions = (platform = process.platform) => platform === 'linux' ? { frame: false } : {};
const windowChromeState = target => ({ maximized: target.isMaximized(), fullscreen: target.isFullScreen(), focused: target.isFocused() });

function installWindowChrome({ windows, trusted, Menu, isClosing, platform = process.platform }) {
  windows.handle('proteus:window-chrome', async (event, value) => {
    trusted(event);
    if (platform !== 'linux' || isClosing()) throw Error('Linux window controls are unavailable.');
    const target = windows.current().window;
    switch (value?.action) {
      case 'state': break;
      case 'minimize': target.minimize(); break;
      case 'toggle-maximize':
        if (target.isFullScreen()) target.setFullScreen(false);
        else if (target.isMaximized()) target.unmaximize();
        else target.maximize();
        break;
      case 'close': target.close(); return;
      case 'menu': {
        const menu = Menu.getApplicationMenu();
        if (!menu) throw Error('The application menu is unavailable.');
        const [width, height] = target.getContentSize();
        const coordinate = (value, limit) => Math.round(Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), Math.max(0, limit - 1)));
        await new Promise(resolve => menu.popup({ window: target, x: coordinate(value.x, width), y: coordinate(value.y, height), callback: resolve }));
        break;
      }
      default: throw Error('Choose a window control.');
    }
    if (!target.isDestroyed()) return windowChromeState(target);
  });
  return target => {
    if (platform !== 'linux') return;
    // Keep the native menu/accelerators registered without a second menu-bar row.
    target.setAutoHideMenuBar(false);
    target.setMenuBarVisibility(false);
    const publish = () => { if (!target.isDestroyed()) target.webContents.send('proteus:window-chrome-state', windowChromeState(target)); };
    for (const event of ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen', 'focus', 'blur']) target.on(event, publish);
  };
}

module.exports = { windowChromeOptions, windowChromeState, installWindowChrome };
