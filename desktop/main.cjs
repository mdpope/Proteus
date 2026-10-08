const { app, BrowserWindow, ipcMain, shell, dialog, clipboard, Tray, Menu, nativeImage, screen, safeStorage, Notification, powerMonitor } = require('electron');
const path = require('node:path');
const { BrowserTabs } = require('./browser.cjs');
const { WorkspaceSession } = require('./workspace-session.cjs');
const { BrowsingHistory } = require('./browsing-history.cjs');
const { trackedChildren, trackedPids, resourceTotals } = require('./resource-metrics.cjs');
const { ArtifactPreview } = require('./artifact-preview.cjs');
let service, window, browser, preview, credentials, terminals, peers, tray, standupWindow, closing = false;
const showWindow = () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } };
app.setName('Proteus');
// Finder launches lack the interactive shell PATH; match the repository launcher.
if (process.platform === 'darwin') process.env.PATH = [...new Set(['/opt/homebrew/bin', '/usr/local/bin', ...(process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin').split(':')])].join(':');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  // CLI-driven updates and service stops use the same graceful shutdown as Quit.
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => app.quit());
  app.on('second-instance', showWindow);
  let lifeCallback;
  app.on('open-url', (event, url) => { event.preventDefault(); try { const value=new URL(url); if(value.protocol!=='proteus:'||value.hostname!=='life-oauth'||value.pathname!=='/callback')return; } catch { return; } if(service)void service.life.callback(url).catch(()=>{}); else lifeCallback=url; showWindow(); });
  app.on('activate', showWindow);
  app.whenReady().then(async () => {
    const appIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    app.dock?.setIcon(appIcon);
    const { startServer } = await import('../src/server.js');
    const { isWithin } = await import('../src/files.js');
    const { CredentialBroker } = await import('../src/credentials.js');
    const { TerminalStore } = await import('../src/terminals.js');
    // The provider only receives this bounded interface, never Electron or a CDP endpoint.
    service = await startServer({ port: Number(process.env.PORT || 4317), openExternal: url => shell.openExternal(url), browser: { agent: (...args) => browser.agent(...args), openDocument:async(args,runId)=>(await import('../src/document-tools.js')).openChatDocument(service,args,runId) }, background: true, lifeOptions: { safeStorage, Notification, powerMonitor } });
    if (lifeCallback) { const value=lifeCallback; lifeCallback=null; void service.life.callback(value).catch(()=>{}); }
    window = new BrowserWindow({ width: 1440, height: 960, minWidth: 850, minHeight: 650, title: 'Proteus', icon: appIcon, backgroundColor: '#111716',
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    const browsingHistory = new BrowsingHistory(service.home,{device:()=>{const host=service.remote.info();return {id:host.hostId,name:host.label};},onVisit:item=>service.activity.queue('history',{...item,title:item.title.slice(0,160),createdAt:item.visitedAt,hostId:service.remote.info().hostId})});
    browser = new BrowserTabs(window, service.origin,{history:browsingHistory});
    window.webContents.on('did-start-navigation', details => {
      if(details.isMainFrame && !details.isSameDocument)browser.invalidateRendererSelection();
    });
    const closeCurrentTab = () => { if (!closing && !window.isDestroyed()) window.webContents.send('proteus:close-current-tab'); };
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && (input.meta || input.control) && !input.shift && !input.alt && String(input.key).toLowerCase() === 'w') {
        event.preventDefault(); closeCurrentTab();
      }
    });
    browser.closeCurrentTab = closeCurrentTab;
    preview = new ArtifactPreview(window);
    credentials = new CredentialBroker(service.home);
    const trusted = event => { if (new URL(event.senderFrame.url).origin !== service.origin || event.sender !== window.webContents) throw new Error('Untrusted renderer.'); };
    ipcMain.handle('proteus:default-browser',event=>{trusted(event);return app.getApplicationNameForProtocol('https:')||null;});
    ipcMain.handle('proteus:open-link',(event,value)=>{trusted(event);if(event.senderFrame.parent!==null)throw new Error('Untrusted frame.');const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Use an HTTP or HTTPS link without credentials.');return shell.openExternal(url.href);});
    ipcMain.handle('proteus:open-external',(event,value)=>{trusted(event);if(event.senderFrame.parent!==null)throw new Error('Untrusted frame.');const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use an HTTPS website address.');return shell.openExternal(url.href);});
    ipcMain.handle('proteus:life-account', (event, value) => { trusted(event); if(event.senderFrame.parent!==null||event.senderFrame.routingId!==window.webContents.mainFrame.routingId||event.senderFrame.processId!==window.webContents.mainFrame.processId||closing)throw new Error('Life account access is unavailable.'); return service.life.auth(value?.action, value); });
    // PTYs are desktop-only. Neither the HTTP API nor embedded web pages receive this bridge.
    terminals = new TerminalStore(service.home, { workspaceFiles: service.workspaceFiles });
    ipcMain.handle('proteus:terminal', (event, value) => { trusted(event); if (event.senderFrame.parent !== null || event.senderFrame.routingId !== window.webContents.mainFrame.routingId || event.senderFrame.processId !== window.webContents.mainFrame.processId || closing) throw new Error('Terminal access is unavailable.'); return terminals.handle(value); });
    ipcMain.handle('proteus:artifact-preview', (event, value) => { trusted(event); if(event.senderFrame.parent!==null||event.senderFrame.routingId!==window.webContents.mainFrame.routingId||event.senderFrame.processId!==window.webContents.mainFrame.processId||closing)throw new Error('Document preview is unavailable.');if(value?.action==='hide')return preview.hide();if(value?.action==='show')return preview.show(value);throw new Error('Unknown document preview action.'); });
    terminals.on('event', value => { if (window && !window.isDestroyed() && new URL(window.webContents.getURL()).origin === service.origin) window.webContents.send('proteus:terminal-event', value); });
    const { DesktopPeers } = await import('../src/desktop-peers.js');
    peers = new DesktopPeers(service.home, { safeStorage, localHostId: service.remote.info().hostId });
    ipcMain.handle('proteus:desktop-peers', (event, value) => { trusted(event); if(event.senderFrame.parent!==null||event.senderFrame.routingId!==window.webContents.mainFrame.routingId||event.senderFrame.processId!==window.webContents.mainFrame.processId||closing)throw new Error('Desktop peer access is unavailable.');return peers.handle(value); });
    peers.on('event', value => { if(window&&!window.isDestroyed()&&new URL(window.webContents.getURL()).origin===service.origin)window.webContents.send('proteus:desktop-peer-event',value); });
    service.peers=peers;
    powerMonitor.on('resume',()=>peers?.resumeConnections());
    const workspaceSession = new WorkspaceSession(service.home);
    try{service.contentTabs.seedWorkspace(workspaceSession.get());}catch(error){service.activity.log('warn','tabs.restore-failed',error.message);}
    service.contentTabDocument = value => {
      if(value.scope!=='chat'||!/^[a-f0-9]{64}$/.test(value.documentId||''))throw new Error('Choose a host-bound chat document.');
      service.engine.getRun(value.id);
      const file=service.contentTabs.documentSource(value.id,value.documentId),descriptor=service.contentTabs.get('chat',value.id).tabs.find(tab=>tab.documentId===value.documentId);
      for(const root of service.workspaceFiles.roots().roots.filter(root=>root.available)){const relative=path.relative(root.path,file);if(relative&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))return {...service.workspaceFiles.read({rootId:root.id,file:relative}),title:descriptor.title,mediaType:'text/markdown'};}
      throw new Error('Document is outside a currently authorized workspace.');
    };
    service.onDocumentOpened=value=>{if(window&&!window.isDestroyed())window.webContents.send('proteus:open-document',value);};
    service.engine.releaseBrowser=runId=>browser.releaseRun(runId).catch(()=>{});
    service.resources={
      list:()=>{
        const tabs=browser.list().map(({id,title,url,group,loaded,pid,error})=>({id,title,url,group,loaded,pid,error}));
        let descriptors=[];try{descriptors=workspaceSession.get()?.tabs||[];}catch{}
        for(const tab of descriptors)if(tab.type!=='browser')tabs.push({id:tab.id,title:tab.label,group:tab.type,loaded:true,pid:window.webContents.getOSProcessId(),sharedProcess:true});
        const processes=app.getAppMetrics().map(p=>({pid:p.pid,type:p.type,name:p.name||p.serviceName||p.type,cpuPercent:p.cpu.percentCPUUsage,memoryBytes:(p.memory.workingSetSize||0)*1024,tabIds:tabs.filter(t=>t.pid===p.pid).map(t=>t.id)}));
        const terminalPids=new Set([...terminals.sessions.values()].map(record=>record.child?.pid).filter(Number.isSafeInteger));
        const children=trackedChildren(process.pid,new Set(processes.map(item=>item.pid)));
        for(const child of children)if(terminalPids.has(child.pid)){child.type='terminal';child.name='Terminal process';}
        processes.push(...children);
        const knownPids=new Set(processes.map(item=>item.pid));
        const persistent=trackedPids(terminals.tmux.sessions().managedPids,knownPids);
        processes.push(...persistent);
        return {supported:true,processes,tabs,totals:resourceTotals(processes),scope:'Proteus Electron, tracked child processes, and tagged persistent tmux sessions',observedAt:new Date().toISOString()};
      },
      action:async value=>{
        if(!['unload','close'].includes(value.action)||typeof value.tabId!=='string')throw new Error('Choose Close or Unload for a tab.');
        if(browser.tabs.has(value.tabId)){if(value.action==='unload')await browser.unload(value.tabId);else await browser.close(value.tabId);}
        else {const saved=workspaceSession.get(),tab=saved?.tabs.find(t=>t.id===value.tabId);if(!tab)throw new Error('Tab not found.');if(tab.type==='overview')throw new Error('The Schedules overview stays open.');if(tab.type==='terminal')throw new Error('Close terminal sessions from their terminal tab.');if(value.action==='unload')throw new Error('This tool shares the app renderer. Close its view to release its data; its execution stays on the host.');window.webContents.send('proteus:close-tool',value.tabId);}
        return service.resources.list();
      }
    };
    service.activity.on('notification',item=>{const p=service.activity.data.preferences;if(!p.systemEnabled||p[item.type]===false||!Notification.isSupported())return;const notification=new Notification({title:item.title,body:item.body,silent:false});notification.on('click',()=>{showWindow();window.webContents.send('proteus:notification-open',item);});notification.show();});

    ipcMain.handle('proteus:workspace-session', (event, value) => { trusted(event); if(value?.action==='get')return workspaceSession.get(); if(value?.action==='save'&&!closing){workspaceSession.save(value.session);service.contentTabs.seedWorkspace(workspaceSession.get());return;} });
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
    ipcMain.handle('proteus:browser', (event, value) => {
      trusted(event);
      if(event.senderFrame !== window.webContents.mainFrame || closing)throw new Error('Browser access is unavailable from this document.');
      return browser.command(value);
    });
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
      { label: 'Connections…', click: () => { showWindow(); window.webContents.send('proteus:remote'); } },
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
    (async () => { credentials?.close(); peers?.close(); await preview?.hide(); await terminals?.dispose(); await browser?.dispose(); await service.close(); })().catch(error => { console.error('Proteus shutdown: ' + error.message); }).finally(() => { tray?.destroy(); app.quit(); });
  });
}
// Main-process integration tests use the same broker as the provider adapter.
module.exports.getBrowser = () => browser;
module.exports.getService = () => service;
module.exports.getTray = () => tray;

module.exports.getTerminals = () => terminals;

module.exports.getDesktopPeers = () => peers;
