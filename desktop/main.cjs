const { app, BrowserWindow, ipcMain, shell, dialog, clipboard, Tray, Menu, nativeImage, screen, safeStorage } = require('electron');
const path = require('node:path');
const { BrowserTabs } = require('./browser.cjs');
const { WorkspaceSession } = require('./workspace-session.cjs');
let service, window, browser, credentials, terminals, peers, tray, standupWindow, closing = false;
const showWindow = () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } };
app.setName('Proteus');
// Finder launches lack the interactive shell PATH; match the repository launcher.
if (process.platform === 'darwin') process.env.PATH = [...new Set(['/opt/homebrew/bin', '/usr/local/bin', ...(process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin').split(':')])].join(':');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  // CLI-driven updates and service stops use the same graceful shutdown as Quit.
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => app.quit());
  app.on('second-instance', showWindow);
  app.on('activate', showWindow);
  app.whenReady().then(async () => {
    const appIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    app.dock?.setIcon(appIcon);
    const { startServer } = await import('../src/server.js');
    const { isWithin } = await import('../src/files.js');
    const { CredentialBroker } = await import('../src/credentials.js');
    const { TerminalStore } = await import('../src/terminals.js');
    // The provider only receives this bounded interface, never Electron or a CDP endpoint.
    service = await startServer({ port: Number(process.env.PORT || 4317), openExternal: url => shell.openExternal(url), browser: { agent: (...args) => browser.agent(...args) }, background: true });
    window = new BrowserWindow({ width: 1440, height: 960, minWidth: 850, minHeight: 650, title: 'Proteus', icon: appIcon, backgroundColor: '#111716',
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    browser = new BrowserTabs(window, service.origin);
    credentials = new CredentialBroker(service.home);
    const trusted = event => { if (new URL(event.senderFrame.url).origin !== service.origin || event.sender !== window.webContents) throw new Error('Untrusted renderer.'); };
    // PTYs are desktop-only. Neither the HTTP API nor embedded web pages receive this bridge.
    terminals = new TerminalStore(service.home, { workspaceFiles: service.workspaceFiles });
    ipcMain.handle('proteus:terminal', (event, value) => { trusted(event); if (event.senderFrame.parent !== null || event.senderFrame.routingId !== window.webContents.mainFrame.routingId || event.senderFrame.processId !== window.webContents.mainFrame.processId || closing) throw new Error('Terminal access is unavailable.'); return terminals.handle(value); });
    terminals.on('event', value => { if (window && !window.isDestroyed() && new URL(window.webContents.getURL()).origin === service.origin) window.webContents.send('proteus:terminal-event', value); });
    const { DesktopPeers } = await import('../src/desktop-peers.js');
    peers = new DesktopPeers(service.home, { safeStorage, localHostId: service.remote.info().hostId });
    ipcMain.handle('proteus:desktop-peers', (event, value) => { trusted(event); if(event.senderFrame.parent!==null||event.senderFrame.routingId!==window.webContents.mainFrame.routingId||event.senderFrame.processId!==window.webContents.mainFrame.processId||closing)throw new Error('Desktop peer access is unavailable.');return peers.handle(value); });
    peers.on('event', value => { if(window&&!window.isDestroyed()&&new URL(window.webContents.getURL()).origin===service.origin)window.webContents.send('proteus:desktop-peer-event',value); });
    const workspaceSession = new WorkspaceSession(service.home);
    ipcMain.handle('proteus:workspace-session', (event, value) => { trusted(event); if(value?.action==='get')return workspaceSession.get(); if(value?.action==='save'&&!closing)return workspaceSession.save(value.session); });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== service.origin) event.preventDefault(); });
    ipcMain.handle('proteus:open-path', async (event, file) => {
      trusted(event);
      const settings = service.settings.get();
      const roots = [service.home, ...(service.omi && require('node:fs').existsSync(service.omi.getSettings().pipelineRoot) ? [service.omi.getSettings().pipelineRoot] : []), ...service.context.roots(), ...service.context.config().documents.map(doc => path.dirname(doc.path)), ...service.engine.listRuns().flatMap(run => [run.nativeSessionPath, ...(run.providerSessionId && run.schedule.provider==='copilot' ? [path.join(run.providerHome || process.env.COPILOT_HOME || require('node:os').homedir()+'/.copilot', 'session-state', run.providerSessionId)] : [])]).filter(Boolean), settings.workspace.cwd, ...settings.workspace.additionalDirectories, ...service.engine.schedules.list().filter(s => !s.error).flatMap(s => [s.workspace.cwd, ...s.workspace.additionalDirectories])];
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
      const result = await dialog.showOpenDialog(window, { properties: [folder ? 'openDirectory' : 'openFile', ...(options.multiple ? ['multiSelections'] : [])], ...(folder ? {} : { filters: [{ name: options.kind === 'workspace' ? 'VS Code workspace' : options.kind === 'life-profile' ? 'Private database profile' : options.kind === 'life-backup' ? 'Private SQL backup' : 'Markdown', extensions: options.kind === 'workspace' ? ['code-workspace'] : options.kind === 'life-profile' ? ['json'] : options.kind === 'life-backup' ? ['sql'] : ['md'] }] }) });
      return result.canceled ? [] : result.filePaths;
    });
    ipcMain.handle('proteus:browser', (event, value) => { trusted(event); return browser.command(value); });
    ipcMain.handle('proteus:standup-popout', async (event, width) => {
      trusted(event);
      if (standupWindow && !standupWindow.isDestroyed()) { standupWindow.show(); standupWindow.focus(); return; }
      const area = screen.getDisplayMatching(window.getBounds()).workArea;
      standupWindow = new BrowserWindow({ x: area.x, y: area.y, width: Math.round(Math.max(180, Math.min(320, Number(width) || 230))), height: area.height,
        title: 'Proteus Standup', frame: false, alwaysOnTop: true, minimizable: false, fullscreenable: false, minWidth: 180, minHeight: 300, backgroundColor: '#19201e',
        webPreferences: { preload: path.join(__dirname, 'standup-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
      standupWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      standupWindow.webContents.on('will-navigate', event => event.preventDefault());
      standupWindow.on('closed', () => { standupWindow = null; });
      await standupWindow.loadFile(path.join(__dirname, 'standup.html'));
    });
    const trustedStandup = event => { if (!standupWindow || event.sender !== standupWindow.webContents || event.senderFrame !== standupWindow.webContents.mainFrame) throw new Error('Untrusted standup renderer.'); };
    ipcMain.handle('proteus:standup-current', event => { trustedStandup(event); return service.standup.get().current; });
    ipcMain.handle('proteus:standup-close', event => { trustedStandup(event); standupWindow.close(); });
    window.on('resize', () => window.webContents.send('proteus:browser-resize'));
    window.on('close', event => { if (!closing) { event.preventDefault(); window.hide(); } });
    const icon = nativeImage.createFromPath(path.join(__dirname, 'trayTemplate.png')).resize({ width: 18, height: 18 }); icon.setTemplateImage(true);
    tray = new Tray(icon); tray.setToolTip('Proteus — schedules and chats');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open Proteus', click: showWindow },
      { label: 'Remote Access…', click: () => { showWindow(); window.webContents.send('proteus:remote'); } },
      { type: 'separator' },
      { label: 'Closing the window keeps the host running', enabled: false },
      { label: 'Quit Proteus and stop runs', click: () => app.quit() }
    ]));
    tray.on('double-click', showWindow);
    await window.loadURL(service.url);
  }).catch(error => { console.error(error.message); app.quit(); });
  app.on('window-all-closed', () => {});
  app.on('before-quit', event => {
    if (closing || !service) return;
    event.preventDefault(); closing = true;
    browser?.prepareShutdown(); window?.webContents.send('proteus:shutdown');
    (async () => { credentials?.close(); peers?.close(); await terminals?.dispose(); await browser?.dispose(); await service.close(); })().catch(error => { console.error('Proteus shutdown: ' + error.message); }).finally(() => { tray?.destroy(); app.quit(); });
  });
}
// Main-process integration tests use the same broker as the provider adapter.
module.exports.getBrowser = () => browser;
module.exports.getService = () => service;
module.exports.getTray = () => tray;

module.exports.getTerminals = () => terminals;

module.exports.getDesktopPeers = () => peers;
