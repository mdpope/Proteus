const { app, BrowserWindow, ipcMain, shell, dialog, clipboard, Tray, Menu, nativeImage, screen, safeStorage, Notification, powerMonitor } = require('electron');
const path = require('node:path');
const { BrowserTabs } = require('./browser.cjs');
const { launchPath, closeToTray } = require('./platform.cjs');
const { WorkspaceSession } = require('./workspace-session.cjs');
const {HistoryService}=require('./history-service.cjs');
const { createProcessSampler, trackedChildren, trackedPids, resourceTotals } = require('./resource-metrics.cjs');
const { ArtifactPreview } = require('./artifact-preview.cjs');
let service, window, browser, preview, credentials, terminals, peers, tray, standupWindow, closing = false;
const showWindow = () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } };
app.setName('Proteus');
if (process.platform === 'linux') app.setDesktopName('proteus.desktop');
process.env.PATH = launchPath(process.platform, require('node:os').homedir(), process.env.PATH);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  // CLI-driven updates and service stops use the same graceful shutdown as Quit.
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => app.quit());
  app.on('second-instance', showWindow);
  let lifeCallback,chatLink;
  app.on('open-url', (event, url) => { event.preventDefault(); try { const value=new URL(url); if(value.protocol==='proteus:'&&value.hostname==='chat'){chatLink=url;if(window&&!window.isDestroyed())window.webContents.send('proteus:open-chat-link',url);showWindow();return;}if(value.protocol!=='proteus:'||value.hostname!=='life-oauth'||value.pathname!=='/callback')return; } catch { return; } if(service)void service.life.callback(url).catch(()=>{}); else lifeCallback=url; showWindow(); });
  app.on('activate', showWindow);
  app.whenReady().then(async () => {
    const appIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    app.dock?.setIcon(appIcon);
    const { startServer } = await import('../src/server.js');
    const { isWithin } = await import('../src/files.js');
    const { CredentialBroker } = await import('../src/credentials.js');
    const { TerminalStore } = await import('../src/terminals.js');
    // The provider only receives this bounded interface, never Electron or a CDP endpoint.
    service = await startServer({ port: Number(process.env.PORT || 4317), openExternal: url => shell.openExternal(url), browser: { manageTabs:(args,runId)=>service.tabManagement.handle(args),agent: (...args) => browser.agent(...args), openDocument:async(args,runId)=>(await import('../src/document-tools.js')).openChatDocument(service,args,runId) }, background: true, lifeOptions: { safeStorage, Notification, powerMonitor } });
    if (lifeCallback) { const value=lifeCallback; lifeCallback=null; void service.life.callback(value).catch(()=>{}); }
    window = new BrowserWindow({ width: 1440, height: 960, minWidth: 850, minHeight: 650, title: 'Proteus', icon: appIcon, backgroundColor: '#111716',
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    const browsingHistory=new HistoryService(service.browserHistory,{onError:error=>window.webContents.send('proteus:browser-action',{type:'error',message:error.message})});
    const {browserDestination,browserDestinations}=await import('../src/browser-destinations.js');
    await service.browserProfiles.refresh().catch(()=>{});
    browser = new BrowserTabs(window, service.origin,{home:service.home,diagnostics:service.performanceDiagnostics,history:browsingHistory,agentDestination:(runId,value)=>browserDestination(service,runId,value),agentDestinations:runId=>browserDestinations(service,runId),profiles:service.browserProfiles,onLoadError:({error,url,detail,tabId})=>{return service.activity.log('warning','browser.load-failed',`${error}\n${url||''}`,{hostId:service.remote.info().hostId,tabId,error:detail,url});}});
    service.previewAllowed=tab=>browser.profileAvailable({profileId:tab.profileId||'default'})&&!browser.extensions?.protected(tab.profileId||'default');
    service.browserAttention=()=>browser.permissions.list();
    window.webContents.on('did-finish-load',()=>{if(chatLink){window.webContents.send('proteus:open-chat-link',chatLink);chatLink=null;}});
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
    let notices;
    ipcMain.handle('proteus:notice',(event,value)=>{trusted(event);if(event.senderFrame!==window.webContents.mainFrame||closing)throw new Error('Notification access unavailable.');return (notices??=new (require('./notice-window.cjs').NoticeWindow)(window)).show(value);});
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
    peers = new DesktopPeers(service.home, { safeStorage, localHostId: service.remote.info().hostId,browserHistory:service.browserHistory, diagnostics: service.performanceDiagnostics });
    ipcMain.handle('proteus:desktop-peers', (event, value) => { trusted(event); if(event.senderFrame.parent!==null||event.senderFrame.routingId!==window.webContents.mainFrame.routingId||event.senderFrame.processId!==window.webContents.mainFrame.processId||closing)throw new Error('Desktop peer access is unavailable.');return peers.handle(value); });
    peers.on('event', value => { if(window&&!window.isDestroyed()&&new URL(window.webContents.getURL()).origin===service.origin)window.webContents.send('proteus:desktop-peer-event',value); });
    service.peers=peers;
    void service.browserHistory.importAccount(service.account).catch(()=>{});
    const {LiveBrowser}=await import('../src/live-browser.js');
    service.liveBrowser=new LiveBrowser({
      list:chatId=>browser.list().filter(info=>{const tab=browser.get(info.id);return info.loaded&&browser.profileAvailable(tab)&&!browser.extensions?.protected(tab.profileId)&&(tab.parentId===chatId||tab.owner===chatId||tab.resumeOwner===chatId||tab.automationRuns?.has(chatId));}).map(({id,title,agentControlling})=>({id,title,agentControlling})),
      current:(id,revision)=>{const tab=browser.tabs.get(id);return !!tab?.view?.webContents&&browser.profileAvailable(tab)&&!browser.extensions?.protected(tab.profileId)&&!tab.view.webContents.isDestroyed()&&revision===`${tab.view.webContents.id}:${tab.captureRevision||0}`;},
      capture:async(chatId,id)=>{
        const tab=browser.get(id),wc=tab.view?.webContents;if(!browser.profileAvailable(tab)||browser.extensions?.protected(tab.profileId))throw new Error('This profile is private to you.');if(!wc||wc.isDestroyed())throw new Error('Browser tab is unloaded.');
        const revision=`${wc.id}:${tab.captureRevision||0}`,size=tab.view.getBounds();
        const image=await wc.capturePage(undefined,{stayHidden:true});if(image.isEmpty())throw new Error('The browser has not rendered a frame yet.');
        const resized=image.resize({width:Math.min(1440,image.getSize().width)});let bytes=resized.toJPEG(65);
        if(bytes.length>350000)bytes=resized.toJPEG(35);if(bytes.length>500000)throw new Error('Browser frame is too large.');
        return {revision,width:size.width,height:size.height,image:'data:image/jpeg;base64,'+bytes.toString('base64'),pointer:tab.agentPointer||null};
      }
    });

    powerMonitor.on('resume',()=>peers?.resumeConnections());
    const workspaceSession = new WorkspaceSession(service.home);
    const tabActions=new Map();
    ipcMain.handle('proteus:tab-action-result',(event,value)=>{trusted(event);const pending=tabActions.get(value?.requestId);if(!pending)return;clearTimeout(pending.timer);tabActions.delete(value.requestId);if(value.error)pending.reject(new Error(String(value.error).slice(0,1000)));else pending.resolve(value.result);});
    const runtimeIdentity=(tab,saved)=>{
      if(tab.contentTabId)return tab.contentTabId;
      if(tab.type==='markdown'&&tab.file){const parent=saved.tabs?.find(item=>item.id===tab.parentId),owner=parent?.type==='workspace'?'workspace:'+parent.workspaceId:parent?.type==='run'?parent.runId||parent.id:saved.team?.tabs?.includes(tab)?'team':'main';return 'document:'+require('node:crypto').createHash('sha256').update(owner+'\0'+tab.file).digest('hex');}
      if(tab.type==='terminal'&&tab.terminal?.id)return 'terminal:'+tab.terminal.id;
      if(['run','workspace-chat'].includes(tab.type))return 'chat:'+(tab.runId||tab.id);
      return tab.id;
    };
    service.tabInventory=()=>{
      const saved=workspaceSession.get();if(!saved)return [];
      const records=[...(saved.tabs||[]),...(saved.team?.tabs||[])].filter(tab=>!tab.navigationClosed).map(tab=>({
        id:runtimeIdentity(tab,saved),runtimeId:tab.id,
        manageable:!['overview','omi','life','team','engine','home','standup'].includes(tab.type),type:tab.type==='workspace'?'workspace':['run','remote-run'].includes(tab.type)?'chat':tab.type==='markdown'||tab.type==='remote-document'?'document':tab.type==='browser'?'browser':['terminal','agent-terminal'].includes(tab.type)?'terminal':'viewer',
        scope:'shell',scopeId:'shell',browserId:tab.type==='browser'?tab.browserId||tab.id:undefined,location:(()=>{const parent=saved.tabs?.find(item=>item.id===tab.parentId);return parent?.type==='workspace'?{scope:'workspace',id:parent.workspaceId,hostId:parent.hostId||null}:['run','remote-run'].includes(parent?.type)?{scope:'chat',id:parent.runId||parent.id,hostId:parent.hostId||null}:{scope:saved.team?.tabs?.includes(tab)?'team':'main',id:saved.team?.tabs?.includes(tab)?'team':'main'};})(),group:saved.team?.tabs?.includes(tab)?'team':'main',liveSession:tab.type==='agent-terminal',parentId:tab.parentId||null,title:tab.customTitle||tab.label||tab.title||'Tab',
        url:tab.type==='browser'?require('./browser-history.cjs').safeHistoryURL(tab.url)||null:tab.type==='markdown'&&tab.file?require('node:url').pathToFileURL(tab.file).href:null,
        openedAt:tab.openedAt||null,lastTouchedAt:tab.lastTouchedAt||null,hidden:tab.hidden===true,persist:tab.persist===true,
        ...(tab.workspaceId?{workspaceId:tab.workspaceId}:{}),...(tab.hostId?{hostId:tab.hostId}:{}),...(tab.terminal?.id?{terminalId:tab.terminal.id}:{}),...(tab.runId||tab.type==='run'?{chatId:tab.runId||tab.id}:{}),...(tab.favicon?{favicon:tab.favicon}:{})
      }));
      for(const record of records)if(record.type==='browser'){const tab=[...browser.tabs.values()].find(tab=>tab.id===record.runtimeId||saved.team?.tabs?.some(item=>item.id===record.runtimeId&&item.browserId===tab.id));if(tab){const info=browser.state(tab);Object.assign(record,{loaded:info.loaded,profileId:info.profileId,persist:info.persist,shared:info.shared,developerShared:info.developerShared===true,pid:info.pid||null,openedAt:info.openedAt,lastTouchedAt:info.lastTouchedAt,favicon:info.favicon});}}
      const revision=require('node:crypto').createHash('sha256').update(JSON.stringify(records)).digest('hex');return records.map(record=>({...record,revision}));
    };
    service.tabRuntime=async value=>{
      if(value.action==='shell-action'){
        if(value.operation==='move'&&value.tab.type==='browser'){const native=[...browser.tabs.values()].find(tab=>tab.id===(value.tab.browserId||value.tab.runtimeId));if(native)await browser.command({action:'transfer',id:native.id,group:value.destination.scope==='team'?'team':'main',parentId:value.destination.scope==='workspace'?'workspace:local:'+value.destination.id:['chat','shell'].includes(value.destination.scope)?value.destination.id:null});}
        if(value.operation==='reorder'&&Array.isArray(value.ids)){const rows=service.tabInventory();value={...value,ids:value.ids.map(id=>rows.find(tab=>tab.id===id)?.runtimeId||id)};}
        const requestId=require('node:crypto').randomUUID();
        return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{tabActions.delete(requestId);reject(new Error('The app view did not acknowledge this operation. Refresh the inventory before retrying.'));},10000);tabActions.set(requestId,{resolve,reject,timer});window.webContents.send('proteus:tab-management',{...value,requestId});});
      }
      if(value.action==='chat-moved'){if(!window.isDestroyed())window.webContents.send('proteus:tab-management',value);return;}
      if(value.action==='workspace-deleted'){if(!window.isDestroyed())window.webContents.send('proteus:tab-management',value);return;}
      const saved=workspaceSession.get(),descriptor=value.tab;
      if(!descriptor)return;
      let sourceFile;if(descriptor.type==='document'){try{sourceFile=JSON.parse(require('node:fs').readFileSync(service.contentTabs.sourcesFile,'utf8'))[descriptor.documentId]?.file;}catch{}}
      const savedTab=[...(saved?.tabs||[]),...(saved?.team?.tabs||[])].find(tab=>runtimeIdentity(tab,saved)===descriptor.id||descriptor.terminalId&&tab.terminal?.id===descriptor.terminalId||sourceFile&&tab.type==='markdown'&&tab.file===sourceFile);
      const browserTab=descriptor.type==='browser'&&[...browser.tabs.values()].find(tab=>tab.id===descriptor.id||tab.id===savedTab?.browserId||tab.id===savedTab?.id);
      if(value.action==='prepare-move'){if(browserTab?.agentActions)throw new Error('Wait for the active browser operation to finish before moving this tab.');return {ready:true};}
      if(browserTab){
        if(value.action==='close')await browser.close(browserTab.id);
        else if(value.action==='persist')await browser.command({action:'persist',id:browserTab.id,enabled:value.enabled});
        else if(value.action==='move'){const parentId=value.destination.scope==='workspace'?'workspace:local:'+value.destination.id:value.destination.scope==='chat'?value.destination.id:null;await browser.command({action:'transfer',id:browserTab.id,group:value.destination.scope==='team'?'team':'main',parentId});}
      }
      if(value.action==='close'&&descriptor.type==='terminal'&&terminals.sessions.has(descriptor.terminalId))await terminals.close(descriptor.terminalId);
      if(!window.isDestroyed()){
        const requestId=require('node:crypto').randomUUID();
        await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{tabActions.delete(requestId);reject(new Error('The app did not acknowledge the tab placement. Refresh its inventory.'));},10000);tabActions.set(requestId,{resolve,reject,timer});window.webContents.send('proteus:tab-management',{...value,requestId,runtimeId:browserTab?.id||savedTab?.id});});
      }
    };
    try{service.contentTabs.seedWorkspace(workspaceSession.get());}catch(error){service.activity.log('warn','tabs.restore-failed',error.message);}
    service.contentTabDocument = value => {
      if(!['chat','workspace','main','team'].includes(value.scope)||!/^[a-f0-9]{64}$/.test(value.documentId||''))throw new Error('Choose a host-bound chat document.');
      if(value.scope==='chat')service.engine.getRun(value.id);else if(value.scope==='workspace')service.context.scope(value.id);
      const file=service.contentTabs.documentSource(value.id,value.documentId,value.scope),descriptor=service.contentTabs.get(value.scope,value.id).tabs.find(tab=>tab.documentId===value.documentId);
      for(const root of service.workspaceFiles.roots().roots.filter(root=>root.available)){const relative=path.relative(root.path,file);if(relative&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))return {...service.workspaceFiles.read({rootId:root.id,file:relative}),title:descriptor.title,mediaType:'text/markdown'};}
      throw new Error('Document is outside a currently authorized workspace.');
    };
    const {chatResourcePlacement}=await import('../public/chat-resource-placement.js');
    service.chatResourcePlacement=run=>chatResourcePlacement(run.id,workspaceSession.get(),{workspaceId:Object.hasOwn(run,'workspaceId')?run.workspaceId:run.schedule.context?.workspaceId});
    service.onDocumentOpened=value=>{if(window&&!window.isDestroyed())window.webContents.send('proteus:open-document',value);};
    service.engine.releaseBrowser=runId=>browser.releaseRun(runId).catch(()=>{});
    const sampleProcesses=createProcessSampler();
    service.resources={
      list:async()=>{
        const [psOutput,tmuxState]=await Promise.all([sampleProcesses(),terminals.tmux.statusAsync()]);
        const tabs=browser.list().map(({id,title,url,group,loaded,pid,error})=>({id,title,url,group,loaded,pid,error}));
        let descriptors=[];try{descriptors=workspaceSession.get()?.tabs||[];}catch{}
        const rendererPid=window&&!window.isDestroyed()&&!window.webContents.isDestroyed()?window.webContents.getOSProcessId():null;
        for(const tab of descriptors)if(tab.type!=='browser')tabs.push({id:tab.id,title:tab.label,group:tab.type,loaded:!!rendererPid,pid:rendererPid,sharedProcess:true});
        const processes=app.getAppMetrics().map(p=>({pid:p.pid,type:p.type,name:p.name||p.serviceName||p.type,cpuPercent:p.cpu.percentCPUUsage,memoryBytes:(p.memory.workingSetSize||0)*1024,tabIds:tabs.filter(t=>t.pid===p.pid).map(t=>t.id)}));
        const terminalPids=new Set([...terminals.sessions.values()].map(record=>record.child?.pid).filter(Number.isSafeInteger));
        const children=trackedChildren(process.pid,new Set(processes.map(item=>item.pid)),psOutput);
        for(const child of children)if(terminalPids.has(child.pid)){child.type='terminal';child.name='Terminal process';}
        processes.push(...children);
        const knownPids=new Set(processes.map(item=>item.pid));
        const persistent=trackedPids(tmuxState.managedPids,knownPids,psOutput);
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

    ipcMain.handle('proteus:workspace-session', (event, value) => { trusted(event); if(value?.action==='get')return workspaceSession.get(); if(value?.action==='save'&&!closing){const saved=service.performanceDiagnostics.measureSync('desktop.session.save',()=>workspaceSession.save(value.session));service.contentTabs.seedWorkspace(saved);return;} });
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
    window.on('close', event => { if (!closing) { event.preventDefault(); if (closeToTray(process.platform)) window.hide(); else window.minimize(); } });
    const mac = process.platform === 'darwin';
    const icon = nativeImage.createFromPath(path.join(__dirname, mac ? 'trayTemplate.png' : 'icon.png')).resize({ width: mac ? 18 : 24, height: mac ? 18 : 24 });
    if (mac) icon.setTemplateImage(true);
    const hostMenu = [
      { label: 'Open Proteus', click: showWindow },
      { label: 'Connections…', click: () => { showWindow(); window.webContents.send('proteus:remote'); } },
      { type: 'separator' },
      { label: closeToTray(process.platform) ? 'Closing the window keeps the host running' : 'Closing the window minimizes; the host keeps running', enabled: false },
      { label: 'Quit Proteus and stop runs', click: () => app.quit() }
    ];
    try {
      tray = new Tray(icon); tray.setToolTip('Proteus — schedules and chats');
      tray.setContextMenu(Menu.buildFromTemplate(hostMenu));
      tray.on(process.platform === 'linux' ? 'click' : 'double-click', showWindow);
    } catch (error) { if (process.platform !== 'linux') throw error; console.warn('System tray unavailable:', error.message); }
    if (process.platform === 'linux') Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'File', submenu: [...hostMenu.slice(0, 2), { type: 'separator' }, { label: 'Quit Proteus and stop runs', accelerator: 'Control+Q', click: () => app.quit() }] },
      { role: 'editMenu' }, { role: 'viewMenu' }
    ]));
    await window.loadURL(service.url).catch(error=>{if(error.code!=='ERR_ABORTED'&&error.errno!==-3)throw error;});
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
