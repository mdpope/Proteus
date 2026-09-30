const { app, BrowserWindow, WebContentsView, ipcMain, shell, session } = require('electron');
const path = require('node:path');
let service, window, browser;
app.setName('Proteus');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { window?.show(); window?.focus(); });
  app.whenReady().then(async () => {
    const { startServer } = await import('../src/server.js');
    const { isWithin } = await import('../src/files.js');
    service = await startServer({ port: Number(process.env.PORT || 4317) });
    window = new BrowserWindow({ width: 1440, height: 960, minWidth: 850, minHeight: 650, title: 'Proteus', backgroundColor: '#111716',
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    const trusted = event => { if (new URL(event.senderFrame.url).origin !== service.origin || event.sender !== window.webContents) throw new Error('Untrusted renderer.'); };
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== service.origin) event.preventDefault(); });
    ipcMain.handle('proteus:open-path', async (event, file) => {
      trusted(event);
      const roots = [service.home, ...service.engine.schedules.list().filter(s => !s.error).flatMap(s => [s.workspace.cwd, ...s.workspace.additionalDirectories])];
      if (typeof file !== 'string' || !isWithin(file, roots)) throw new Error('Path is outside the configured workspaces.');
      const error = await shell.openPath(file); if (error) throw new Error(error);
    });
    ipcMain.handle('proteus:open-browser', async (event, { url, bounds }) => {
      trusted(event); const parsed = new URL(url); if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Use an HTTP or HTTPS URL.');
      for (const key of ['x','y','width','height']) if (!Number.isFinite(bounds[key]) || bounds[key] < 0) throw new Error('Invalid browser bounds.');
      if (!browser) {
        const partition = session.fromPartition('persist:proteus-browser');
        partition.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
        partition.setPermissionCheckHandler(() => false);
        browser = new WebContentsView({ webPreferences: { session: partition, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
        browser.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//.test(url)) void browser.webContents.loadURL(url); return { action: 'deny' }; });
        browser.webContents.on('will-navigate', (event, next) => { if (!/^https?:\/\//.test(next)) event.preventDefault(); });
        window.contentView.addChildView(browser);
      }
      browser.setBounds(bounds); browser.setVisible(true); await browser.webContents.loadURL(parsed.href);
    });
    ipcMain.handle('proteus:hide-browser', event => { trusted(event); browser?.setVisible(false); });
    window.on('resize', () => browser?.setVisible(false));
    window.on('closed', () => { browser?.webContents.close(); browser = null; window = null; });
    await window.loadURL(service.url);
  }).catch(error => { console.error(error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
  let closing = false;
  app.on('before-quit', event => {
    if (closing || !service) return;
    event.preventDefault(); closing = true;
    service.close().finally(() => app.quit());
  });
}
