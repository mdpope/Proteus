const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const { BrowserTabs } = require('./browser.cjs');
let service, window, browser;
app.setName('Proteus');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { window?.show(); window?.focus(); });
  app.whenReady().then(async () => {
    const { startServer } = await import('../src/server.js');
    const { isWithin } = await import('../src/files.js');
    // The provider only receives this bounded interface, never Electron or a CDP endpoint.
    service = await startServer({ port: Number(process.env.PORT || 4317), browser: { agent: (...args) => browser.agent(...args) } });
    window = new BrowserWindow({ width: 1440, height: 960, minWidth: 850, minHeight: 650, title: 'Proteus', backgroundColor: '#111716',
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    browser = new BrowserTabs(window, service.origin);
    const trusted = event => { if (new URL(event.senderFrame.url).origin !== service.origin || event.sender !== window.webContents) throw new Error('Untrusted renderer.'); };
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== service.origin) event.preventDefault(); });
    ipcMain.handle('proteus:open-path', async (event, file) => {
      trusted(event);
      const settings = service.settings.get();
      const roots = [service.home, settings.workspace.cwd, ...settings.workspace.additionalDirectories, ...service.engine.schedules.list().filter(s => !s.error).flatMap(s => [s.workspace.cwd, ...s.workspace.additionalDirectories])];
      if (typeof file !== 'string' || !isWithin(file, roots)) throw new Error('Path is outside the configured workspaces.');
      const error = await shell.openPath(file); if (error) throw new Error(error);
    });
    ipcMain.handle('proteus:browser', (event, value) => { trusted(event); return browser.command(value); });
    window.on('resize', () => window.webContents.send('proteus:browser-resize'));
    window.on('close', event => { if (!closing) { event.preventDefault(); app.quit(); } });
    await window.loadURL(service.url);
  }).catch(error => { console.error(error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
  let closing = false;
  app.on('before-quit', event => {
    if (closing || !service) return;
    event.preventDefault(); closing = true;
    (async () => { await browser?.dispose(); await service.close(); })().finally(() => app.quit());
  });
}
// Main-process integration tests use the same broker as the provider adapter.
module.exports.getBrowser = () => browser;
