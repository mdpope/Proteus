const { app, BrowserWindow, ipcMain, shell, dialog, clipboard } = require('electron');
const path = require('node:path');
const { BrowserTabs } = require('./browser.cjs');
let service, window, browser, credentials;
app.setName('Proteus');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { window?.show(); window?.focus(); });
  app.whenReady().then(async () => {
    const { startServer } = await import('../src/server.js');
    const { isWithin } = await import('../src/files.js');
    const { CredentialBroker } = await import('../src/credentials.js');
    // The provider only receives this bounded interface, never Electron or a CDP endpoint.
    service = await startServer({ port: Number(process.env.PORT || 4317), browser: { agent: (...args) => browser.agent(...args) } });
    window = new BrowserWindow({ width: 1440, height: 960, minWidth: 850, minHeight: 650, title: 'Proteus', backgroundColor: '#111716',
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    browser = new BrowserTabs(window, service.origin);
    credentials = new CredentialBroker(service.home);
    const trusted = event => { if (new URL(event.senderFrame.url).origin !== service.origin || event.sender !== window.webContents) throw new Error('Untrusted renderer.'); };
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== service.origin) event.preventDefault(); });
    ipcMain.handle('proteus:open-path', async (event, file) => {
      trusted(event);
      const settings = service.settings.get();
      const roots = [service.home, ...service.context.roots(), ...service.context.config().documents.map(doc => path.dirname(doc.path)), ...service.engine.listRuns().flatMap(run => [run.nativeSessionPath, ...(run.providerSessionId && run.schedule.provider==='copilot' ? [path.join(run.providerHome || process.env.COPILOT_HOME || require('node:os').homedir()+'/.copilot', 'session-state', run.providerSessionId)] : [])]).filter(Boolean), settings.workspace.cwd, ...settings.workspace.additionalDirectories, ...service.engine.schedules.list().filter(s => !s.error).flatMap(s => [s.workspace.cwd, ...s.workspace.additionalDirectories])];
      if (typeof file !== 'string' || !isWithin(file, roots)) throw new Error('Path is outside the configured workspaces.');
      const error = await shell.openPath(file); if (error) throw new Error(error);
    });
    ipcMain.handle('proteus:credentials', async (event, value) => {
      trusted(event);
      if (value.action === 'get') return credentials.get();
      if (value.action === 'save') return credentials.save(value.config, value.expectedRevision);
      if (['status', 'unlock', 'lock'].includes(value.action)) return credentials.operation(value.providerId, value.action, value.password);
      if (value.action === 'fill') return browser.fillLogin(value.tabId, value.bindingId, credentials);
      throw new Error('Unknown credential action.');
    });
    ipcMain.handle('proteus:copy-text', (event, text) => { trusted(event); if (typeof text !== 'string' || text.length > 1_000_000) throw new Error('Invalid clipboard text.'); clipboard.writeText(text); });
    ipcMain.handle('proteus:choose-paths', async (event, options) => {
      trusted(event); const folder = options.kind === 'folder';
      const result = await dialog.showOpenDialog(window, { properties: [folder ? 'openDirectory' : 'openFile', ...(options.multiple ? ['multiSelections'] : [])], ...(folder ? {} : { filters: [{ name: options.kind === 'workspace' ? 'VS Code workspace' : 'Markdown', extensions: options.kind === 'workspace' ? ['code-workspace'] : ['md'] }] }) });
      return result.canceled ? [] : result.filePaths;
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
    (async () => { credentials?.close(); await browser?.dispose(); await service.close(); })().finally(() => app.quit());
  });
}
// Main-process integration tests use the same broker as the provider adapter.
module.exports.getBrowser = () => browser;
