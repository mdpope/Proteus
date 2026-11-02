const { app, BrowserWindow, ipcMain, shell, dialog, clipboard, Tray, Menu, nativeImage, screen, safeStorage, Notification, powerMonitor, powerSaveBlocker } = require('electron');
const path = require('node:path');
const { BrowserTabs } = require('./browser/browser.cjs');
const { launchPath, closeToTray, protocolURL } = require('./services/platform.cjs');
const {ExternalURLs,webURL}=require('./services/external-urls.cjs');
const { windowChromeOptions, installWindowChrome } = require('./windows/window-chrome.cjs');
const { WorkspaceSession } = require('./windows/workspace-session.cjs');
const {HistoryService}=require('./browser/history-service.cjs');
const { createProcessSampler, trackedChildren, trackedPids, resourceTotals } = require('./services/resource-metrics.cjs');
const { ArtifactPreview } = require('./documents/artifact-preview.cjs');
const {RendererRecovery}=require('./windows/renderer-recovery.cjs');
const {KeepAwake}=require('./services/keep-awake.cjs');
const keepAwake=new KeepAwake(powerSaveBlocker);
let hostMenu;
const {configureDesktopPreview,stageCodexAuthentication,preparePreviewFixtures}=require('./preview-runtime.cjs');
const desktopPreview=configureDesktopPreview(app);
let service, window, browser, preview, credentials, terminals, peers, tray, standupWindow, windows, createAppWindow, closing = false;
const showWindow = () => { const target=windows?.current()?.window;if(!target){if(createAppWindow)void createAppWindow();return;}if(target.isMinimized())target.restore();target.show();target.focus(); };

if(!desktopPreview)app.setName('Proteus');
if (process.platform === 'linux') app.setDesktopName('proteus.desktop');
process.env.PATH = launchPath(process.platform, require('node:os').homedir(), process.env.PATH);
if(process.platform==='win32')require('../src/shared/private-paths.cjs').ensurePrivateHome(app.getPath('userData'));
if (!app.requestSingleInstanceLock()) app.quit();
else {
  // CLI-driven updates and service stops use the same graceful shutdown as Quit.
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => app.quit());
  let lifeCallback,chatLink,authWindowId,linkRouter,externalLinksStarted=false;
  const externalURLs=new ExternalURLs({
    target:async()=>{if(!externalLinksStarted||closing)return null;if(!windows.current())await createAppWindow();const ctx=windows.current();return ctx?.externalURLReady&&!ctx.closing?ctx:null;},
    open:async(ctx,url)=>linkRouter?linkRouter.route(url):windows.run(ctx.id,async()=>{const info=await browser.create(url,null,null,{profileId:'default',explicitParent:true});ctx.window.webContents.send('proteus:browser-action',{type:'select-tab',info});showWindow();}),
    onError:error=>{console.error('Opening website link: '+error.message);if(window&&!window.isDestroyed())window.webContents.send('proteus:browser-action',{type:'error',message:'Could not open an incoming website link. '+error.message});}
  });
  const returnToAuthWindow=()=>{const ctx=windows?.contexts.get(authWindowId)||windows?.current();if(ctx)windows.run(ctx.id,showWindow);else showWindow();};
  const receiveURL=raw=>{linkRouter?.noteIncoming?.(raw);if(externalURLs.receive(raw))return;const url=protocolURL([raw]);if(!url)return;const value=new URL(url);if(value.protocol==='proteus:'){chatLink=url;if(window&&!window.isDestroyed()){window.webContents.send('proteus:open-chat-link',url);chatLink=null;}showWindow();return;}if(service)void service.life.callback(url).catch(()=>{});else lifeCallback=url;returnToAuthWindow();};
  app.on('second-instance',(_event,argv)=>{const urls=argv.filter(raw=>webURL(raw)||protocolURL([raw]));if(urls.length)urls.forEach(receiveURL);else showWindow();});
  app.on('open-url',(event,url)=>{event.preventDefault();receiveURL(url);});
  if(process.platform!=='darwin')process.argv.filter(raw=>webURL(raw)||protocolURL([raw])).forEach(receiveURL);
  app.on('activate', showWindow);
  app.whenReady().then(async () => {
    const updateBridge={handle:(value,runId)=>service.updates?.handle(value,runId)||Promise.reject(Error('Supervised updates are not ready.'))};
    const appIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    app.dock?.setIcon(appIcon);
    const { startServer } = await import('../src/server.js');
    const { isWithin,defaultHome } = await import('../src/shared/files.js');
    const {Updates,pendingUpdate}=await import('../src/services/updates/updates.js');
    const freshHome=!require('node:fs').existsSync(defaultHome());
    const installation=app.isPackaged?(process.platform==='darwin'?path.resolve(app.getAppPath(),'../../..'):path.resolve(app.getAppPath(),'../..')):null;
    const pendingRecovery=installation&&!desktopPreview?pendingUpdate(defaultHome(),installation):null;if(pendingRecovery)process.env.PROTEUS_UPDATE_JOB=pendingRecovery;
    const { CredentialBroker } = await import('../src/services/integrations/credentials.js');
    const { TerminalStore } = await import('../src/services/tools/terminals.js');
    if(desktopPreview){
      const fs=require('node:fs');
      const {seedDesktopPreview,assertDesktopPreviewHome}=await import('../src/desktop-preview.js');
      if(fs.existsSync(path.join(desktopPreview.home,'desktop-preview.json')))assertDesktopPreviewHome(desktopPreview.home);
      else {
        const workFolders=preparePreviewFixtures(desktopPreview);
        await seedDesktopPreview({home:desktopPreview.home,workFolders,sourceFolders:[desktopPreview.sourceRoot]});
      }
      stageCodexAuthentication(desktopPreview);
    }
    // The provider only receives this bounded interface, never Electron or a CDP endpoint.
    service = await startServer({updateRecovery:!!pendingRecovery, ...(desktopPreview?{home:desktopPreview.home,port:0,desktopPreview:{codexHome:desktopPreview.codexHome},withSeed:false}:{port:Number(process.env.PORT || 4317)}), openExternal:url=>require('./link-routing/preferred-browser.cjs').openPreferredBrowser(url,{preference:service?.settings.get().preferences?.clickedLinks,system:value=>shell.openExternal(value),embedded:browser?async value=>{authWindowId=windows.current()?.id;const info=await browser.create(value,null,null,{explicitParent:true});browser.actions.send({type:'select-tab',info});showWindow();}:null}), browser: {terminal:(args,runId)=>{if(!terminals)throw Error('Terminal service is not ready.');return terminals.agentAccess.handle(args,runId);},updates:updateBridge, projects:true,preview:!!desktopPreview,manageTabs:(args,runId)=>service.tabManagement.handle(args,runId),agent:async(value,runId)=>{if(!windows?.contexts.size)await createAppWindow();return browser.agent(value,runId);}, openDocument:async(args,runId)=>(await import('../src/services/chats/document-tools.js')).openChatDocument(service,args,runId) }, background: true, lifeOptions: { safeStorage, Notification, powerMonitor,client:'desktop',callbackURL:'proteus-desktop://life-oauth/callback',openExternal:async url=>{authWindowId=windows?.current()?.id;if(service.settings.get().preferences?.clickedLinks==='system')return shell.openExternal(url);const info=await browser.create(url);browser.actions.send({type:'select-tab',info});} } });
    if (lifeCallback) { const value=lifeCallback; lifeCallback=null; void service.life.callback(value).catch(()=>{}); }
    keepAwake.onChange=enabled=>{const saved=service.settings.get();service.settings.save({...saved,preferences:{...saved.preferences,keepScreenAwake:enabled}},saved.revision);};
    try{keepAwake.setEnabled(service.settings.get().preferences?.keepScreenAwake===true);}catch(error){console.warn('Keep Screen Awake: '+error.message);}
    windows=new (require('./windows/windows.cjs').WindowRegistry)(service.home,{ipcMain,screen});
    service.contentTabs.migrateWindowTeams();
    const records=windows.records(),firstRecord=records[0];
    const makeWindow=record=>new BrowserWindow({ ...windows.bounds(record), ...windowChromeOptions(), minWidth: 850, minHeight: 650, title: desktopPreview?.name||'Proteus', icon: appIcon, backgroundColor: '#121512',
      ...(process.platform==='darwin'?{titleBarStyle:'hidden',trafficLightPosition:{x:15,y:19}}:{}),
      webPreferences: { additionalArguments:['--proteus-window-id='+record.id,'--proteus-window-preview'],preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    const firstWindow=makeWindow(firstRecord);windows.attach(firstWindow,firstRecord.id);window=windows.proxy();
    if(desktopPreview)window.on('page-title-updated',event=>{event.preventDefault();window.setTitle(desktopPreview.name);});
    const browsingHistory=new HistoryService(service.browserHistory,{onError:error=>window.webContents.send('proteus:browser-action',{type:'error',message:error.message})});
    const {resolvedPalette,defaultPalette}=await import('../public/shared/ui/palette.js');
    const errorPalette=()=>resolvedPalette(service.settings.get().appearance?.palette||defaultPalette());
    const {browserDestination,browserDestinations,previewChatResourcePlacement}=await import('../src/services/browser/browser-destinations.js');
    const projects=service.workspaceProjects||service.desktopPreview;
    const {remapPreviewProjectSession,resolvePreviewProject,remapPreviewBrowserPlacement}=await import('../public/features/workspaces/preview-project-placement.js');
    const {restoreWindowContent}=await import('./windows/restore-content.js');
    const resolvePreviewPlacement=value=>projects.remapBrowserPlacement(value);
    await service.browserProfiles.refresh().catch(()=>{});
    browser = new BrowserTabs(firstWindow, service.origin,{errorPalette,windowRegistry:windows,newWindow:()=>createAppWindow?.(),projects:true,preview:!!desktopPreview,resolvePreviewPlacement,retainedTabs:()=>service.settings.get().browser?.loadedTabLimit??6,home:service.home,handleCallback:url=>{if(!url.startsWith('proteus-desktop://life-oauth/callback?'))return false;void service.life.callback(url).catch(error=>browser.actions.send({type:'error',message:error.message}));returnToAuthWindow();return true;},diagnostics:service.performanceDiagnostics,history:browsingHistory,agentDestination:(runId,value)=>browserDestination(service,runId,value,{preview:!!projects}),agentDestinations:runId=>browserDestinations(service,runId,{preview:!!projects}),profiles:service.browserProfiles,onSiteNotification:(item,tab)=>{service.activity.websiteNotification({windowId:tab.windowId||'main',tabId:tab.id,logicalTabId:tab.thumbnailId,profileId:item.profileId,origin:item.origin,siteNotificationId:item.id,title:item.title,body:item.body,silent:item.silent,hostId:service.remote.info().hostId,hostName:require('node:os').hostname()});service.notify();service.remote.changed();},onLoadError:({error,url,detail,tabId,windowId})=>{const log=service.activity.log('warning','browser.load-failed',`${error}\n${url||''}`,{hostId:service.remote.info().hostId,tabId,error:detail,url});let site='this page';try{site=new URL(url).host;}catch{}const item=service.activity.browserIssue({kind:'load-error',windowId,tabId,logId:log.id,title:'Could not load '+site,body:error});service.notify();return {...log,notificationId:item.id};}});
    browser.options.closeLogicalTab=(await import('./browser/logical-close.js')).logicalBrowserCloser(service);
    service.previewAllowed=tab=>browser.profileAvailable({profileId:tab.profileId||'default'});
    service.browserAttention=()=>browser.permissions.list().filter(item=>item.kind!=='site-notification');
    const closeCurrentTab=()=>{const ctx=windows.current();if(ctx&&!closing)ctx.window.webContents.send('proteus:close-current-tab');};
    browser.closeCurrentTab=closeCurrentTab;

    windows.current().preview=new ArtifactPreview(firstWindow);preview=windows.proxy('preview');
    credentials = new CredentialBroker(service.home);
    const trusted = event => { if (new URL(event.senderFrame.url).origin !== service.origin || event.sender !== window.webContents) throw new Error('Untrusted renderer.'); };
    const configureWindowChrome=installWindowChrome({windows,trusted,Menu,isClosing:()=>closing});
    const notices=new Map();
    windows.handle('proteus:notice',(event,value)=>{trusted(event);if(event.senderFrame!==window.webContents.mainFrame||closing)throw new Error('Notification access unavailable.');return (()=>{const ctx=windows.current();if(!notices.has(ctx.id))notices.set(ctx.id,new (require('./features/notifications/notice-window.cjs').NoticeWindow)(ctx.window));return notices.get(ctx.id).show(value);})();});
    const openBrowserNotification=(item,intent='review')=>{let issue=item?.browserIssue;if(!issue)throw Error('Browser notification not found.');if(item.type==='website.notification'&&issue.logicalTabId){const target=[...browser.tabs.values()].find(tab=>tab.thumbnailId===issue.logicalTabId&&tab.profileId===issue.profileId);if(target)issue={...issue,tabId:target.id,windowId:target.windowId||issue.windowId};}if(issue.kind==='site-notification'&&intent==='review'){intent='open-tab';try{browser.permissions.read(issue.siteNotificationId,true);}catch{}}const actions=issue.kind==='history-conflict'?['review','keep-history','open-copy']:['review','open-tab','reload','logs'];if(!actions.includes(intent))throw Error('Choose an available notification action.');const ctx=windows.contexts.get(issue.windowId);if(!ctx||ctx.window.isDestroyed())throw Error('Restore the original window in Engine Room → Windows before reviewing this browser issue.');windows.run(ctx.id,()=>{ctx.window.show();ctx.window.focus();ctx.window.webContents.send('proteus:notification-open',{browserIssueId:item.id,issueAction:intent,browserIssueTarget:issue});});if(item.type==='website.notification'){service.activity.read(item.id);service.notify();service.remote.changed();}return {dispatched:true};};
    service.openWebsiteNotification=id=>{const item=service.activity.notifications().items.find(item=>item.id===id&&item.type==='website.notification');if(!item)throw Error('Website notification is no longer available.');return openBrowserNotification(item);};
    windows.handle('proteus:browser-notification',(event,value)=>{trusted(event);if(event.senderFrame!==window.webContents.mainFrame||closing)throw Error('Browser notification access unavailable.');if(value?.action==='record'){const item=service.activity.browserIssue({...value,windowId:windows.current().id});service.notify();return item;}if(value?.action==='act'){const item=service.activity.notifications().items.find(item=>item.id===value.id&&['browser.issue','website.notification'].includes(item.type));return openBrowserNotification(item,value.intent);}throw Error('Choose a browser notification action.');});
    windows.handle('proteus:default-browser',event=>{trusted(event);return app.getApplicationNameForProtocol('https:')||null;});
    windows.handle('proteus:open-link',(event,value)=>{trusted(event);if(event.senderFrame.parent!==null)throw new Error('Untrusted frame.');const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Use an HTTP or HTTPS link without credentials.');return shell.openExternal(url.href);});
    windows.handle('proteus:open-external',(event,value)=>{trusted(event);if(event.senderFrame.parent!==null)throw new Error('Untrusted frame.');const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use an HTTPS website address.');return shell.openExternal(url.href);});
    windows.handle('proteus:life-account', (event, value) => { trusted(event); if(event.senderFrame.parent!==null||event.senderFrame.routingId!==window.webContents.mainFrame.routingId||event.senderFrame.processId!==window.webContents.mainFrame.processId||closing)throw new Error('Life account access is unavailable.'); if(['begin','upgrade'].includes(value?.action))authWindowId=windows.current().id;return service.life.auth(value?.action, value); });
    // PTYs are desktop-only. Neither the HTTP API nor embedded web pages receive this bridge.
    terminals = new TerminalStore(service.home, { workspaceFiles: service.workspaceFiles });
    terminals.agentAccess.active=owner=>owner==='operator'||['running','awaiting_input'].includes(service.engine.getRun(owner)?.status);
    service.terminalAgent=(args,owner)=>terminals.agentAccess.handle(args,owner);
    windows.handle('proteus:terminal', (event, value) => { trusted(event); if (event.senderFrame.parent !== null || event.senderFrame.routingId !== window.webContents.mainFrame.routingId || event.senderFrame.processId !== window.webContents.mainFrame.processId || closing) throw new Error('Terminal access is unavailable.'); return terminals.handle(value); });
    windows.handle('proteus:artifact-preview', (event, value) => { trusted(event); if(event.senderFrame.parent!==null||event.senderFrame.routingId!==window.webContents.mainFrame.routingId||event.senderFrame.processId!==window.webContents.mainFrame.processId||closing)throw new Error('Document preview is unavailable.');if(value?.action==='hide')return preview.hide();if(value?.action==='show')return preview.show(value);if(value?.action==='follow-scroll')return preview.followScroll(value);throw new Error('Unknown document preview action.'); });
    terminals.on('event', value => windows.broadcast('proteus:terminal-event',value));
    const { DesktopPeers } = await import('../src/services/remote/desktop-peers.js');
    peers = new DesktopPeers(service.home, { safeStorage, localHostId: service.remote.info().hostId,browserHistory:service.browserHistory, diagnostics: service.performanceDiagnostics,accessPolicy:service.computerAccess });
    windows.handle('proteus:desktop-peers', (event, value) => { trusted(event); if(event.senderFrame.parent!==null||event.senderFrame.routingId!==window.webContents.mainFrame.routingId||event.senderFrame.processId!==window.webContents.mainFrame.processId||closing)throw new Error('Desktop peer access is unavailable.');return peers.handle(value); });
    peers.on('event', value => windows.broadcast('proteus:desktop-peer-event',value));
    service.peers=peers;
    void service.browserHistory.importAccount(service.account).catch(()=>{});
    const {LiveBrowser}=await import('../src/services/browser/live-browser.js');
    service.liveBrowser=new LiveBrowser({
      list:chatId=>browser.list().filter(info=>{const tab=browser.get(info.id);return info.loaded&&browser.profileAvailable(tab)&&(tab.parentId===chatId||tab.owner===chatId||tab.resumeOwner===chatId||tab.automationRuns?.has(chatId));}).map(({id,title,agentControlling})=>({id,title,agentControlling})),
      current:(id,revision)=>{const tab=browser.tabs.get(id);return !!tab?.view?.webContents&&browser.profileAvailable(tab)&&!tab.view.webContents.isDestroyed()&&revision===`${tab.view.webContents.id}:${tab.captureRevision||0}`;},
      capture:async(chatId,id)=>{
        const tab=browser.get(id),wc=tab.view?.webContents;if(!browser.profileAvailable(tab))throw new Error('This browser profile is unavailable.');if(!wc||wc.isDestroyed())throw new Error('Browser tab is unloaded.');
        const revision=`${wc.id}:${tab.captureRevision||0}`,size=tab.view.getBounds();
        const image=await wc.capturePage(undefined,{stayHidden:true});if(image.isEmpty())throw new Error('The browser has not rendered a frame yet.');
        const resized=image.resize({width:Math.min(1440,image.getSize().width)});let bytes=resized.toJPEG(65);
        if(bytes.length>350000)bytes=resized.toJPEG(35);if(bytes.length>500000)throw new Error('Browser frame is too large.');
        return {revision,width:size.width,height:size.height,image:'data:image/jpeg;base64,'+bytes.toString('base64'),pointer:tab.agentPointer||null};
      }
    });

    powerMonitor.on('resume',()=>peers?.resumeConnections());
    const makeSession=id=>new WorkspaceSession(service.home,{windowId:id,projects:true,sharedTeam:true,remap:value=>projects.remapSession(value,service.engine)});
    windows.current().session=makeSession(firstRecord.id);const workspaceSession=windows.proxy('session');
    service.navigationSessions=()=>[...windows.contexts.values()].filter(ctx=>ctx.session).map(ctx=>({id:ctx.id,session:ctx.session.get()}));
    const tabActions=new Map();
    const windowLayouts=new (require('./windows/window-layouts.cjs').WindowLayouts)(service.home);
    const {WindowContentRecovery}=await import('./windows/content-recovery.js');
    const windowContentRecovery=new WindowContentRecovery(service);
    const checkpointWindow=ctx=>ctx.recovery?.restoring||ctx.window.webContents.isCrashed()?Promise.resolve():new Promise((resolve,reject)=>{const requestId=require('node:crypto').randomUUID();const timer=setTimeout(()=>{tabActions.delete(requestId);reject(Error('The window did not finish saving. Try again after it responds.'));},10000);tabActions.set(requestId,{resolve,reject,timer,windowId:ctx.id});ctx.window.webContents.send('proteus:tab-management',{action:'window-checkpoint',requestId});});
    const windowPositions=id=>{const prefix='window:'+id+':';return viewPositions.get().flatMap(([key,position])=>key.startsWith(prefix)?[[key.slice(prefix.length),position]]:id==='main'&&!key.startsWith('window:')?[[key,position]]:[]);};
    const captureWindow=(ctx,kind,name,expectedRevision)=>windowLayouts.capture({windowId:ctx.id,session:ctx.session.get(),positions:windowPositions(ctx.id),bounds:ctx.window.getNormalBounds(),maximized:ctx.window.isMaximized(),kind,name},expectedRevision);
    if(windowLayouts)windows.checkpointForQuit=async()=>{for(const ctx of windows.contexts.values()){ctx.checkpointing=true;try{await checkpointWindow(ctx);captureWindow(ctx,'previous');}finally{ctx.checkpointing=false;}}};
    windows.handle('proteus:window-layouts',async(event,value)=>{
      trusted(event);if(!windowLayouts)throw Error('Window sessions are available in the design preview.');
      if(value?.action==='audit-content')return windowContentRecovery.audit();
      if(value?.action==='recover-content')return windowContentRecovery.restore(value);
      if(value?.action==='list')return windowLayouts.list(windows);
      if(value?.action==='new'){await createAppWindow();return windowLayouts.list(windows);}
      if(value?.action==='rename'){if(!windows.contexts.has(value.id))throw Error('Choose an open window.');windowLayouts.rename(value.id,value.name,value.expectedRevision);}
      else if(value?.action==='rename-session')windowLayouts.renameLayout(value.id,value.name,value.expectedRevision);
      else if(value?.action==='save'){const ctx=windows.contexts.get(value.id);if(!ctx)throw Error('Choose an open window.');await checkpointWindow(ctx);captureWindow(ctx,'named',value.name,value.expectedRevision);}
      else if(value?.action==='focus'){const ctx=windows.contexts.get(value.id);if(!ctx)throw Error('The window is closed. Refresh the list.');ctx.window.show();ctx.window.focus();}
      else if(value?.action==='restore'){
        const data=windowLayouts.read();if(data.revision!==value.expectedRevision)throw Error('Window sessions changed. Refresh and retry.');const row=data.layouts.find(row=>row.id===value.id);if(!row)throw Error('This saved session is unavailable.');
        const open=windows.contexts.get(row.windowId);if(open){open.window.show();open.window.focus();return windowLayouts.list(windows);}
        const snapshot=windowLayouts.snapshot(row.id),session=await restoreWindowContent(snapshot.session,service);makeSession(row.windowId).save({...session,windowId:row.windowId});for(const [key,position]of snapshot.positions)viewPositions.set('window:'+row.windowId+':'+key,position);
        await createAppWindow({id:row.windowId,bounds:row.bounds,maximized:row.maximized});
      }else if(value?.action==='remove')windowLayouts.remove(value.id,value.expectedRevision);
      else if(value?.action!=='rename')throw Error('Choose a window-session action.');
      return windowLayouts.list(windows);
    });
    windows.handle('proteus:tab-action-result',(event,value)=>{trusted(event);const pending=tabActions.get(value?.requestId);if(!pending)return;if(pending.windowId!==windows.current().id)throw Error('This action belongs to another app window.');clearTimeout(pending.timer);tabActions.delete(value.requestId);if(value.error)pending.reject(new Error(String(value.error).slice(0,1000)));else pending.resolve(value.result);});
    const reconcileWindowProjects=async()=>{
      // The catalog redirect is the durable commit. Normalize every session
      // writer as well, so a late save cannot resurrect deleted project roots.
      const saved=workspaceSession.get();if(saved)workspaceSession.save(saved);
      browser.reparentPreviewProjects(resolvePreviewPlacement);
      if(window.isDestroyed())return;
      const requestId=require('node:crypto').randomUUID();
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{tabActions.delete(requestId);reject(new Error('Project deletion was saved. Refresh Proteus to finish updating its tabs.'));},10000);
        tabActions.set(requestId,{resolve,reject,timer,windowId:windows.current().id});
        window.webContents.send('proteus:tab-management',{action:'project-catalog',catalog:projects.get(service.engine),requestId});
      });
    };
    if(projects)service.reconcileWorkspaceProjects=service.reconcilePreviewProjects=async()=>{for(const ctx of windows.contexts.values())await windows.run(ctx.id,reconcileWindowProjects);};
    const runtimeIdentity=(tab,saved)=>{
      if(tab.contentTabId)return tab.contentTabId;
      if(tab.type==='markdown'&&tab.file){const parent=saved.tabs?.find(item=>item.id===tab.parentId),owner=parent?.type==='workspace'?'workspace:'+parent.workspaceId:parent?.type==='run'?parent.runId||parent.id:saved.team?.tabs?.includes(tab)?'team':windows.current().id==='main'?(saved.team?.tabs?.includes(tab)?'team':'main'):'window:'+windows.current().id;return 'document:'+require('node:crypto').createHash('sha256').update(owner+'\0'+tab.file).digest('hex');}
      if(tab.type==='terminal'&&tab.terminal?.id)return 'terminal:'+tab.terminal.id;
      if(['run','workspace-chat'].includes(tab.type))return 'chat:'+(tab.runId||tab.id);
      return tab.id;
    };
    const windowInventory=()=>{
      const saved=workspaceSession.get();if(!saved)return [];
      const records=[...(saved.tabs||[]),...(saved.team?.tabs||[])].filter(tab=>!tab.navigationClosed).map(tab=>({
        id:runtimeIdentity(tab,saved),runtimeId:tab.id,
        manageable:!['overview','omi','life','team','engine','home','standup'].includes(tab.type),type:tab.type==='workspace'?'workspace':['run','remote-run'].includes(tab.type)?'chat':tab.type==='markdown'||tab.type==='remote-document'?'document':tab.type==='browser'?'browser':['terminal','agent-terminal'].includes(tab.type)?'terminal':'viewer',
        scope:'shell',scopeId:'shell',browserId:tab.type==='browser'?tab.browserId||tab.id:undefined,location:(()=>{const parent=saved.tabs?.find(item=>item.id===tab.parentId);return parent?.type==='workspace'?{scope:parent.projectId?'project':'workspace',id:parent.projectId||parent.workspaceId,hostId:parent.hostId||null}:['run','remote-run'].includes(parent?.type)?{scope:'chat',id:parent.runId||parent.id,hostId:parent.hostId||null}:{scope:saved.team?.tabs?.includes(tab)?'team':'main',id:saved.team?.tabs?.includes(tab)?'team':windows.current().id==='main'?(saved.team?.tabs?.includes(tab)?'team':'main'):'window:'+windows.current().id};})(),group:saved.team?.tabs?.includes(tab)?'team':'main',liveSession:tab.type==='agent-terminal',parentId:tab.parentId||null,title:tab.customTitle||tab.label||tab.title||'Tab',
        url:tab.type==='browser'?require('./browser/browser-history.cjs').safeHistoryURL(tab.url)||null:tab.type==='markdown'&&tab.file?require('node:url').pathToFileURL(tab.file).href:null,
        openedAt:tab.openedAt||null,lastTouchedAt:tab.lastTouchedAt||null,...(projects?{lastActivityAt:tab.lastActivityAt||null}:{}),hidden:tab.hidden===true,persist:tab.persist===true,
        ...(tab.workspaceId?{workspaceId:tab.workspaceId}:{}),...(tab.hostId?{hostId:tab.hostId}:{}),...(tab.terminal?.id?{terminalId:tab.terminal.id}:{}),...(tab.runId||tab.type==='run'?{chatId:tab.runId||tab.id}:{}),...(tab.favicon?{favicon:tab.favicon}:{})
      }));
      for(const record of records)if(record.type==='browser'){const tab=browser.windowTabs().find(tab=>tab.id===record.runtimeId||saved.team?.tabs?.some(item=>item.id===record.runtimeId&&item.browserId===tab.id));if(tab){const info=browser.state(tab);Object.assign(record,{loaded:info.loaded,profileId:info.profileId,persist:info.persist,shared:info.shared,developerShared:info.developerShared===true,pid:info.pid||null,openedAt:info.openedAt,lastTouchedAt:info.lastTouchedAt,...(projects?{lastActivityAt:info.lastActivityAt}:{}),favicon:info.favicon});}}
      const revision=require('node:crypto').createHash('sha256').update(JSON.stringify(records)).digest('hex');return records.map(record=>({...record,revision}));
    };
    service.tabInventory=()=>[...windows.contexts.values()].flatMap(ctx=>windows.run(ctx.id,()=>windowInventory().map(row=>({...row,logicalId:row.id,id:'view:'+ctx.id+':'+row.runtimeId,windowId:ctx.id}))));
    const windowRuntime=async value=>{
      // Validated owner navigation metadata lets the first placement succeed in
      // windows whose project catalog has not caught up yet. This supplies no
      // execution roots or permission grants.
      if(value.destination?.scope==='project'&&projects&&(value.action==='move'||value.action==='shell-action'&&value.operation==='move')){const project=projects.projectFor({projectId:value.destination.id}),workspace=service.context.scope(project.workspaceId),catalog=projects.read();value={...value,navigationCatalog:{revision:catalog.revision,projects:catalog.projects,defaultProjectIds:catalog.defaultProjectIds},destination:{...value.destination,project:{id:project.id,name:project.name,workspaceId:project.workspaceId},workspace:{id:workspace.id,name:workspace.name}}};}
      if(value.action==='shell-action'){
        if(['load','unload'].includes(value.operation)){if(value.tab.type!=='browser')throw new Error('Load/unload applies to browser pages.');const tab=browser.get(value.tab.browserId||value.tab.runtimeId||value.tab.id);return value.operation==='unload'?browser.unload(tab.id):browser.reload(tab.id,true,{background:true});}
        if(value.operation==='move'&&value.tab.type==='browser'){const native=browser.windowTabs().find(tab=>tab.id===(value.tab.browserId||value.tab.runtimeId));if(native)await browser.command({action:'transfer',id:native.id,group:value.destination.scope==='team'?'team':'main',parentId:value.destination.scope==='project'?'project:local:'+value.destination.id:value.destination.scope==='workspace'?'workspace:local:'+value.destination.id:['chat','shell'].includes(value.destination.scope)?value.destination.id:null});}
        if(value.operation==='reorder'&&Array.isArray(value.ids)){const rows=service.tabInventory();value={...value,ids:value.ids.map(id=>rows.find(tab=>tab.id===id)?.runtimeId||id)};}
        const requestId=require('node:crypto').randomUUID();
        return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{tabActions.delete(requestId);reject(new Error('The app view did not acknowledge this operation. Refresh the inventory before retrying.'));},10000);tabActions.set(requestId,{resolve,reject,timer,windowId:windows.current().id});window.webContents.send('proteus:tab-management',{...value,requestId});});
      }
      if(value.action==='chat-moved'){if(!window.isDestroyed())window.webContents.send('proteus:tab-management',value);return;}
      if(value.action==='workspace-deleted'){if(!window.isDestroyed())window.webContents.send('proteus:tab-management',value);return;}
      const saved=workspaceSession.get(),descriptor=value.tab;
      if(!descriptor)return;
      let sourceFile;if(descriptor.type==='document'){try{sourceFile=JSON.parse(require('node:fs').readFileSync(service.contentTabs.sourcesFile,'utf8'))[descriptor.documentId]?.file;}catch{}}
      const savedTab=[...(saved?.tabs||[]),...(saved?.team?.tabs||[])].find(tab=>runtimeIdentity(tab,saved)===descriptor.id||descriptor.terminalId&&tab.terminal?.id===descriptor.terminalId||sourceFile&&tab.type==='markdown'&&tab.file===sourceFile);
      const browserTab=descriptor.type==='browser'&&browser.windowTabs().find(tab=>tab.id===descriptor.id||tab.id===savedTab?.browserId||tab.id===savedTab?.id);
      if(value.action==='prepare-move'){if(browserTab?.agentActions)throw new Error('Wait for the active browser operation to finish before moving this tab.');return {ready:true};}
      if(browserTab){
        if(value.action==='load'||value.action==='unload')return value.action==='unload'?browser.unload(browserTab.id):browser.reload(browserTab.id,true,{background:true});
        if(projects&&['hide','restore'].includes(value.action)){if(value.notifyOnly!==true)await browser.command({action:'visibility',id:browserTab.id,hidden:value.action==='hide'});}
        else if(value.action==='close')await browser.close(browserTab.id);
        else if(value.action==='persist')await browser.command({action:'persist',id:browserTab.id,enabled:value.enabled});
        else if(value.action==='move'){const parentId=value.destination.scope==='project'?'project:local:'+value.destination.id:value.destination.scope==='workspace'?'workspace:local:'+value.destination.id:value.destination.scope==='chat'?value.destination.id:null;await browser.command({action:'transfer',id:browserTab.id,group:value.destination.scope==='team'?'team':'main',parentId});}
      }
      if(projects&&value.nativeOnly===true&&['hide','restore'].includes(value.action))return {ready:true};
      if(value.action==='close'&&descriptor.type==='terminal'&&terminals.sessions.has(descriptor.terminalId))await terminals.close(descriptor.terminalId);
      if(!window.isDestroyed()){
        const requestId=require('node:crypto').randomUUID();
        await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{tabActions.delete(requestId);reject(new Error('The app did not acknowledge the tab placement. Refresh its inventory.'));},10000);tabActions.set(requestId,{resolve,reject,timer,windowId:windows.current().id});window.webContents.send('proteus:tab-management',{...value,requestId,runtimeId:browserTab?.id||savedTab?.id});});
      }
    };
    service.tabRuntime=async value=>{
      const entries=[...windows.contexts.values()];
      if(['chat-moved','workspace-deleted'].includes(value.action)){for(const ctx of entries)await windows.run(ctx.id,()=>windowRuntime(value));return;}
      if(value.action==='shell-action'){
        const ctx=entries.find(ctx=>ctx.id===value.tab.windowId);if(!ctx)throw Error('The owning window was closed. Refresh the inventory.');
        return windows.run(ctx.id,()=>windowRuntime({...value,tab:{...value.tab,id:value.tab.logicalId||value.tab.id}}));
      }
      const matches=entries.filter(ctx=>windows.run(ctx.id,()=>windowInventory().some(row=>row.id===value.tab?.id||row.runtimeId===value.tab?.id)));
      let result;for(const ctx of matches){const answer=await windows.run(ctx.id,()=>windowRuntime(value));if(answer!==undefined)result=answer;}return result;
    };
    try{service.contentTabs.seedWorkspace(workspaceSession.get());}catch(error){service.activity.log('warning','tabs.restore-failed',error.message);}
    service.contentTabDocument = value => {
      if(!['chat','workspace','project','main','team'].includes(value.scope)||!/^[a-f0-9]{64}$/.test(value.documentId||''))throw new Error('Choose a host-bound chat document.');
      if(value.scope==='chat')service.engine.getRun(value.id);else if(value.scope==='workspace')service.context.scope(value.id);else if(value.scope==='project')projects.projectFor({projectId:value.id});
      const file=service.contentTabs.documentSource(value.id,value.documentId,value.scope),descriptor=service.contentTabs.get(value.scope,value.id).tabs.find(tab=>tab.documentId===value.documentId);
      for(const root of service.workspaceFiles.roots().roots.filter(root=>root.available)){const relative=path.relative(root.path,file);if(relative&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)){const document=value.metadataOnly===true?{file:service.workspaceFiles.resolve(root.id,relative).resolved}:service.workspaceFiles.read({rootId:root.id,file:relative});return {...document,title:descriptor.title,mediaType:'text/markdown'};}}
      throw new Error('Document is outside a currently authorized workspace.');
    };
    const {chatResourcePlacement}=await import('../public/features/chats/chat-resource-placement.js');
    const {agentWindow}=require('./windows/agent-origin.cjs');
    const agentWindowFor=(runId,explicitWindowId)=>{
      const run=service.engine.getRun(runId),destination=browserDestination(service,runId,undefined,{preview:!!projects});
      return agentWindow({contexts:[...windows.contexts.values()],origin:run.turnOrigin,currentId:windows.current()?.id,runId,parentId:destination.parentId,explicitWindowId});
    };
    browser.options.agentWindow=agentWindowFor;
    service.windowForChat=runId=>windows.contexts.get(agentWindowFor(runId).id);
    service.agentTabInventory=runId=>{const target=agentWindowFor(runId);return {window:target,tabs:service.tabInventory().filter(tab=>tab.windowId===target.id)};};
    service.chatResourcePlacement=run=>{const ctx=service.windowForChat(run.id),saved=ctx?.session.get();return {...(projects?previewChatResourcePlacement(service,run,saved):chatResourcePlacement(run.id,saved,{workspaceId:Object.hasOwn(run,'workspaceId')?run.workspaceId:run.schedule.context?.workspaceId})),windowId:ctx?.id};};
    service.onDocumentOpened=value=>{const ctx=windows.contexts.get(value.placement?.windowId)||service.windowForChat(value.runId);if(ctx&&!ctx.window.isDestroyed())ctx.window.webContents.send('proteus:open-document',value);};
    service.engine.releaseBrowser=runId=>browser.releaseRun(runId).catch(()=>{});
    const sampleProcesses=createProcessSampler();
    service.resources={
      list:async()=>{
        const [psOutput,tmuxState]=await Promise.all([sampleProcesses(),terminals.tmux.statusAsync()]);
        const tabs=browser.list().map(({id,title,url,group,loaded,pid,error,persist})=>({id,title,url,group,loaded,pid,error,persist,logicalId:browser.tabs.get(id)?.thumbnailId||id,canUnload:loaded&&!persist,canClose:true,windowId:browser.tabs.get(id)?.windowId}));
        for(const row of service.contentTabs.list({type:'browser'}))if(!tabs.some(tab=>tab.id===row.id||tab.logicalId===row.id))tabs.push({...row,loaded:false,canUnload:false,canClose:true,canonical:true});
        for(const ctx of windows.contexts.values()){
          let descriptors=[];try{const saved=ctx.session?.get();descriptors=[...(saved?.tabs||[]),...(saved?.team?.tabs||[])];}catch{}
          const rendererPid=!ctx.window.isDestroyed()&&!ctx.window.webContents.isDestroyed()?ctx.window.webContents.getOSProcessId():null;
          for(const tab of descriptors)if(tab.type!=='browser')tabs.push({id:'view:'+ctx.id+':'+tab.id,runtimeId:tab.id,windowId:ctx.id,title:tab.label,group:tab.type,loaded:!!rendererPid,pid:rendererPid,sharedProcess:true,canUnload:false,canClose:!['overview','home','engine','team','terminal','workspace'].includes(tab.type)});
        }
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
        const canonical=service.contentTabs.list({type:'browser'}).find(row=>row.id===value.tabId);
        if(canonical&&(value.action==='close'||!browser.tabs.has(value.tabId))){if(value.action==='unload')throw Error('This logical tab has no loaded page.');await service.tabManagement.handle({action:'close',scope:canonical.scope,id:canonical.scopeId,tabId:canonical.id,expectedRevision:canonical.revision});}
        else if(browser.tabs.has(value.tabId)){if(value.action==='unload')await browser.unload(value.tabId);else await browser.close(value.tabId);}
        else {const row=service.tabInventory().find(tab=>tab.id===value.tabId);if(!row)throw new Error('Tab not found.');if(!row.manageable)throw new Error('This permanent application surface stays open.');if(row.type==='terminal')throw new Error('Close terminal sessions from their terminal tab.');if(value.action==='unload')throw new Error('This tool shares the app renderer. Close its view to release its data; its execution stays on the host.');windows.contexts.get(row.windowId).window.webContents.send('proteus:close-tool',row.runtimeId);}
        return service.resources.list();
      }
    };
    service.activity.on('notification',item=>{const p=service.activity.data.preferences;if(item.silent||!p.systemEnabled||p[item.type]===false||!Notification.isSupported())return;const notification=new Notification({title:item.title,body:item.body,silent:item.sound===false});notification.on('click',()=>{if(item.browserIssue){try{openBrowserNotification(item);}catch{showWindow();}return;}const ctx=service.windowForChat(item.runId);if(ctx)windows.run(ctx.id,()=>{showWindow();ctx.window.webContents.send('proteus:notification-open',item);});else showWindow();});notification.show();});

    windows.handle('proteus:workspace-session', async (event, value) => { trusted(event); if(value?.action==='reconcile-peer-projects'&&!closing){const hostId=value.hostId;if(!/^[a-f0-9-]{36}$/i.test(hostId||''))throw new Error('Choose a paired computer.');const catalog=await peers.request(hostId,'projects.get',{});const prefix='project:'+hostId+':';const current=workspaceSession.get();if(current)workspaceSession.save(remapPreviewProjectSession(current,catalog,{hostId}));browser.reparentPreviewProjects(placement=>{if(!placement.parentId?.startsWith(prefix))return placement;return remapPreviewBrowserPlacement(placement,catalog,{hostId});});return {catalog};} if(value?.action==='get'){const saved=workspaceSession.get(),recovery=windows.current().recovery;return saved?{...saved,rendererRecovery:recovery?.restoring===true,recoveryGeneration:recovery?.generation||0}:saved;}if(value?.action==='ready'){const ctx=windows.current();const recovered=ctx.recovery?.ready(value.generation)===true;if(recovered){ctx.externalURLReady=true;void externalURLs.drain();}return recovered;} if(value?.action==='save'&&(!closing||windows.current()?.checkpointing)){const saved=service.performanceDiagnostics.measureSync('desktop.session.save',()=>workspaceSession.save(value.session));service.contentTabs.seedWorkspace(saved);return;} });
    const viewPositions=new (require('./windows/view-positions.cjs').ViewPositions)(service.home);
    windows.handle('proteus:view-positions',(event,value)=>{trusted(event);const prefix='window:'+windows.current().id+':';if(value?.action==='get')return viewPositions.get().flatMap(([key,position])=>key.startsWith(prefix)?[[key.slice(prefix.length),position]]:windows.current().id==='main'&&!key.startsWith('window:')?[[key,position]]:[]);if(value?.action==='set')return viewPositions.set(prefix+value.key,value.position);throw Error('Choose a reading-position action.');});
    const pendingThumbnails=new Map();
    windows.handle('proteus:thumbnails',async(event,value)=>{
      trusted(event);if(event.senderFrame!==event.sender.mainFrame)throw Error('Use the app window for thumbnails.');
      const cache=browser.thumbnails;if(!cache)return [];
      if(value?.action==='get'){if(!Array.isArray(value.keys)||value.keys.length>200||value.keys.some(key=>typeof key!=='string'||!key.startsWith('chat:')||key.length>1024))throw Error('Choose bounded chat thumbnails.');return value.keys.map(key=>({key,...cache.get(key)}));}
      for(const [token,row] of pendingThumbnails)if(row.expires<Date.now())pendingThumbnails.delete(token);
      if(value?.action==='commit'){const row=pendingThumbnails.get(value.token);if(!row||row.sender!==event.sender.id)throw Error('Thumbnail capture expired.');pendingThumbnails.delete(value.token);return cache.set(row.key,row.bytes);}
      if(value?.action==='capture'){
        if(typeof value.key!=='string'||!value.key.startsWith('chat:')||value.key.length>1024||pendingThumbnails.size>=4)throw Error('Choose a bounded chat capture.');
        const rect=value.bounds,bounds=window.getContentBounds();if(!rect||!['x','y','width','height'].every(key=>Number.isFinite(rect[key])&&rect[key]>=0)||rect.width<24||rect.height<24||rect.x+rect.width>bounds.width+1||rect.y+rect.height>bounds.height+1)throw Error('The chat viewport changed.');
        const image=await event.sender.capturePage(Object.fromEntries(Object.entries(rect).map(([key,value])=>[key,Math.round(value)])));if(image.isEmpty())return null;
        const token=require('node:crypto').randomUUID();pendingThumbnails.set(token,{key:value.key,bytes:image.resize({width:360}).toJPEG(65),sender:event.sender.id,expires:Date.now()+30000});return {token};
      }
      throw Error('Choose a thumbnail action.');
    });
    windows.handle('proteus:open-path', async (event, file) => {
      trusted(event);
      const settings = service.settings.get();
      const roots = [service.home, ...(service.omi && require('node:fs').existsSync(service.omi.getSettings().pipelineRoot) ? [service.omi.getSettings().pipelineRoot] : []), ...service.context.roots(), ...service.context.config().documents.map(doc => path.dirname(doc.path)), ...service.engine.listRuns().flatMap(run => [run.nativeSessionPath, ...(run.providerSessionId && run.schedule.provider==='copilot' ? [path.join(run.providerHome || process.env.COPILOT_HOME || require('node:os').homedir()+'/.copilot', 'session-state', run.providerSessionId)] : [])]).filter(Boolean), settings.workspace.cwd, ...settings.workspace.additionalDirectories, ...service.engine.schedules.list().filter(s => !s.error).flatMap(s => [s.workspace.cwd, ...s.workspace.additionalDirectories])];
      if (typeof file !== 'string' || !isWithin(file, roots)) throw new Error('Path is outside the configured workspaces.');
      const error = await shell.openPath(file); if (error) throw new Error(error);
    });
    windows.handle('proteus:credentials', async (event, value) => {
      trusted(event);
      if (value.action === 'get') return credentials.get();
      if (value.action === 'save') return credentials.save(value.config, value.expectedRevision);
      if (['status', 'unlock', 'lock'].includes(value.action)) return credentials.operation(value.providerId, value.action, value.password);
      if (value.action === 'fill') return browser.fillLogin(value.tabId, value.bindingId, credentials);
      throw new Error('Unknown credential action.');
    });
    windows.handle('proteus:copy-text', (event, text) => { trusted(event); if (typeof text !== 'string' || text.length > 1_000_000) throw new Error('Invalid clipboard text.'); clipboard.writeText(text); });
    windows.handle('proteus:choose-paths', async (event, options) => {
      trusted(event); const folder = options.kind === 'folder';
      const result = await dialog.showOpenDialog(windows.current().window, { properties: [...(options.kind==='update-candidate'?['openFile','openDirectory','treatPackageAsDirectory']:[folder?'openDirectory':'openFile']), ...(options.multiple ? ['multiSelections'] : [])], ...(folder||options.kind==='update-candidate' ? {} : { filters: [{ name: options.kind === 'workspace' ? 'VS Code workspace' : options.kind === 'update-release' ? 'Signed Proteus release' : options.kind === 'life-profile' ? 'Private database profile' : options.kind === 'life-backup' ? 'Private SQL backup' : 'Markdown', extensions: options.kind === 'workspace' ? ['code-workspace'] : ['life-profile','update-release'].includes(options.kind) ? ['json'] : options.kind === 'life-backup' ? ['sql'] : ['md'] }] }) });
      return result.canceled ? [] : result.filePaths;
    });
    windows.handle('proteus:browser', (event, value) => {
      trusted(event);
      if(event.senderFrame !== window.webContents.mainFrame)throw new Error('Browser access is unavailable from this document.');
      // Checkpointing can finish a renderer paint after quit begins. Its surface
      // cleanup is already superseded by owner shutdown; never dispatch it or
      // turn it into another error notification. All other commands stay closed.
      if(closing){if(value?.action==='hide'||value?.action==='overlay')return;throw new Error('Browser access is unavailable from this document.');}
      return browser.command(value);
    });
    windows.handle('proteus:standup-popout', async (event, width) => {
      trusted(event);
      if (standupWindow && !standupWindow.isDestroyed()) { standupWindow.show(); standupWindow.focus(); return; }
      const area = screen.getDisplayMatching(window.getBounds()).workArea;
      standupWindow = new BrowserWindow({ x: area.x, y: area.y, width: Math.round(Math.max(180, Math.min(320, Number(width) || 230))), height: area.height,
        title: 'Proteus Standup', frame: false, alwaysOnTop: true, minimizable: false, fullscreenable: false, minWidth: 180, minHeight: 300, backgroundColor: '#19201e',
        webPreferences: { preload: path.join(__dirname, 'features/standup/standup-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
      standupWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      standupWindow.webContents.on('will-navigate', event => event.preventDefault());
      standupWindow.on('closed', () => { standupWindow = null; });
      await standupWindow.loadFile(path.join(__dirname, 'features/standup/standup.html'));
    });
    const trustedStandup = event => { if (!standupWindow || event.sender !== standupWindow.webContents || event.senderFrame !== standupWindow.webContents.mainFrame) throw new Error('Untrusted standup renderer.'); };
    ipcMain.handle('proteus:standup-current', event => { trustedStandup(event); return service.standup.get().current; });
    ipcMain.handle('proteus:standup-close', event => { trustedStandup(event); standupWindow.close(); });
    const configureWindow=ctx=>{
      const target=ctx.window,id=ctx.id;
      configureWindowChrome(target);
      ctx.recovery=new RendererRecovery(target,{url:service.url,closing:()=>closing||ctx.closing===true,prepare:windows.bind(id,()=>{
        ctx.externalURLReady=false;browser.invalidateRendererSelection();void ctx.preview.hide().catch(()=>{});
        for(const [key,pending]of tabActions)if(pending.windowId===id){clearTimeout(pending.timer);tabActions.delete(key);pending.reject(Error('The window renderer restarted. Refresh the owner inventory before retrying; the action was not replayed.'));}
      }),log:detail=>service.activity.log(detail.reason==='recovered'?'info':'warning','desktop.renderer-recovery','Window renderer recovery',{windowId:id,...detail})});
      if(desktopPreview)target.on('page-title-updated',event=>{event.preventDefault();target.setTitle(desktopPreview.name);});
      target.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      target.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==service.origin)event.preventDefault();});
      target.webContents.on('did-start-navigation',windows.bind(id,details=>{if(details.isMainFrame&&!details.isSameDocument){ctx.externalURLReady=false;browser.invalidateRendererSelection();}}));
      target.webContents.on('did-finish-load',windows.bind(id,()=>{if(chatLink){target.webContents.send('proteus:open-chat-link',chatLink);chatLink=null;}}));
      target.webContents.on('before-input-event',windows.bind(id,(event,input)=>{
        if(input.type!=='keyDown'||!(input.meta||input.control)||input.shift||input.alt)return;
        const key=String(input.key).toLowerCase();
        if(key==='w'){event.preventDefault();closeCurrentTab();}
        else if(key==='n'){event.preventDefault();void createAppWindow();}
        else if(key==='t'){event.preventDefault();browser.requestNewTab();}
      }));
      target.on('resize',()=>target.webContents.send('proteus:browser-resize'));
      target.on('close',event=>{
        if(closing||ctx.finishedClose)return;event.preventDefault();if(ctx.closing)return;ctx.closing=true;
        void windows.run(id,async()=>{if(windowLayouts){await checkpointWindow(ctx);captureWindow(ctx,'closed');}target.webContents.send('proteus:shutdown');await ctx.preview.hide();await browser.closeWindow(id);windows.forget(id);ctx.finishedClose=true;notices.delete(id);target.destroy();}).catch(error=>{ctx.closing=false;console.error('Window close: '+error.message);target.webContents.send('proteus:browser-action',{type:'error',message:error.message});});
      });
    };
    createAppWindow=async(record={id:require('node:crypto').randomUUID()})=>{
      if(closing)throw Error('Proteus is shutting down.');
      const target=makeWindow(record),ctx=windows.attach(target,record.id);browser.addWindow(target,record.id);ctx.session=makeSession(record.id);ctx.preview=new ArtifactPreview(target);configureWindow(ctx);
      await target.loadURL(service.url).catch(()=>ctx.recovery.failed('initial-load-failed'));if(record.maximized)target.maximize();return target;
    };
    configureWindow(windows.contexts.get(firstRecord.id));
    if(process.platform==='darwin'){
      linkRouter=new (require('./link-routing/controller.cjs').LinkRouter)({service,windows,browser,createWindow:()=>createAppWindow(),app,preview:!!desktopPreview});
      windows.handle('proteus:link-routing',(event,value)=>{trusted(event);if(closing)throw Error('Proteus is shutting down.');return linkRouter.preferences(value);});
    }
    service.updateUIHealth=async()=>{for(const ctx of windows.contexts.values()){if(ctx.window.isDestroyed()||ctx.window.webContents.isLoading()||!await ctx.window.webContents.executeJavaScript("!!(document.querySelector('#topbar-home')&&document.querySelector('#main')&&window.desktop)"))return false;}return windows.contexts.size>0;};
    service.windowCount=()=>[...windows.contexts.values()].filter(ctx=>!ctx.window.isDestroyed()&&!ctx.window.webContents.isLoading()).length;
    service.updates=new Updates(service,{packaged:app.isPackaged&&!desktopPreview,installation,freshHome,browserHome:app.getPath('userData'),quit:()=>app.quit(),blockers:()=>terminals.updateBlockers().concat([...browser.tabs.values()].some(tab=>tab.agentActions||tab.downloads?.size)?['A browser operation or download is active.']:[])});
    service.onUpdateResumed=runId=>{const ctx=service.windowForChat(runId);if(ctx)windows.run(ctx.id,()=>{showWindow();ctx.window.webContents.send('proteus:notification-open',{runId});});};
    const mac = process.platform === 'darwin';
    const icon = nativeImage.createFromPath(path.join(__dirname, mac ? 'trayTemplate.png' : 'icon.png')).resize({ width: mac ? 18 : 24, height: mac ? 18 : 24 });
    if (mac) icon.setTemplateImage(true);
    const hostMenuTemplate = [
      { label: 'Open '+(desktopPreview?.name||'Proteus'), click: showWindow },
      { label: 'Connections…', click: () => { showWindow(); window.webContents.send('proteus:remote'); } },
      { id:'keep-screen-awake', label:'Keep Screen Awake', type:'checkbox', checked:keepAwake.enabled, click:item=>{
        try { keepAwake.setEnabled(item.checked); }
        catch(error) { dialog.showErrorBox('Keep Screen Awake unavailable', error.message); }
        item.checked=keepAwake.enabled;
        tray?.setContextMenu(hostMenu);
        tray?.setToolTip(keepAwake.enabled?'Proteus — keeping screen awake':desktopPreview?'Proteus Design Preview — synthetic data':'Proteus — schedules and chats');
      } },
      { type: 'separator' },
      { label: closeToTray(process.platform) ? 'Closing a window keeps the host running' : 'Closing the window minimizes; the host keeps running', enabled: false },
      { label: 'Quit Proteus and stop runs', click: () => app.quit() }
    ];
    hostMenu=Menu.buildFromTemplate(hostMenuTemplate);
    try {
      tray = new Tray(icon); tray.setToolTip(desktopPreview?'Proteus Design Preview — synthetic data':'Proteus — schedules and chats');
      tray.setContextMenu(hostMenu);
      tray.on(process.platform === 'linux' ? 'click' : 'double-click', showWindow);
    } catch (error) { if (process.platform !== 'linux') throw error; console.warn('System tray unavailable:', error.message); }
    const menuWindow=action=>['linux','win32'].includes(process.platform)?(_item,target)=>{const ctx=[...windows.contexts.values()].find(ctx=>ctx.window===target)||windows.current();if(ctx)return windows.run(ctx.id,action);}:action;
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform==='darwin'?[{label:app.name,submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]}]:[]),
      {label:'File',submenu:[{label:'New Window',accelerator:'CommandOrControl+N',click:()=>void createAppWindow()},{label:'New Tab',accelerator:'CommandOrControl+T',click:menuWindow(()=>browser.requestNewTab())},{type:'separator'},{label:'Close Window',accelerator:'CommandOrControl+Shift+W',click:menuWindow(()=>windows.current()?.window.close())},{label:'Close Tab',accelerator:'CommandOrControl+W',click:menuWindow(closeCurrentTab)},...(['linux','win32'].includes(process.platform)?[{type:'separator'},{label:'Connections…',click:menuWindow(()=>window.webContents.send('proteus:remote'))},{type:'separator'},{label:'Quit Proteus and stop runs',accelerator:'Control+Q',click:()=>app.quit()}]:[])]},{role:'editMenu'},{label:'View',submenu:[{id:'refresh-current-tab',label:'Refresh Current Tab',accelerator:'CommandOrControl+R',click:menuWindow(()=>windows.current()?.window.webContents.send('proteus:browser-action',{type:'refresh-current-tab'}))},{id:'reload-window',label:'Reload Window',click:menuWindow(()=>windows.current()?.recovery.reload())},{role:'forceReload'},{role:'toggleDevTools'},{type:'separator'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{type:'separator'},{role:'togglefullscreen'}]},{role:'windowMenu'}
    ]));
    if(['linux','win32'].includes(process.platform))for(const ctx of windows.contexts.values())ctx.window.setMenuBarVisibility(false);
    await firstWindow.loadURL(service.url).catch(()=>windows.contexts.get(firstRecord.id).recovery.failed('initial-load-failed'));if(firstRecord.maximized)firstWindow.maximize();
    for(const record of records.slice(1))await createAppWindow(record);
    externalLinksStarted=true;void externalURLs.drain();
  }).catch(error => { console.error(error.message); app.quit(); });
  app.on('window-all-closed', () => {});
  app.on('before-quit', event => {
    keepAwake.dispose();linkRouter?.close();
    if (closing || !service) return;
    event.preventDefault(); closing = true;
    (async () => { if(windows?.checkpointForQuit)try{await windows.checkpointForQuit();}catch(error){console.error('Window session checkpoint: '+error.message);}windows?.prepareQuit();browser?.prepareShutdown();windows?.broadcast('proteus:shutdown');credentials?.close(); peers?.close(); await Promise.all([...windows.contexts.values()].map(ctx=>ctx.preview.hide())); await terminals?.dispose(); await browser?.dispose(); await service.close(); })().catch(error => { console.error('Proteus shutdown: ' + error.message); }).finally(() => { tray?.destroy(); app.quit(); });
  });
}
// Main-process integration tests use the same broker as the provider adapter.
module.exports.getBrowser = () => browser;
module.exports.getService = () => service;
module.exports.getTray = () => tray;
module.exports.getHostMenu = () => hostMenu;

module.exports.getTerminals = () => terminals;

module.exports.getDesktopPeers = () => peers;

module.exports.getWindows=()=>windows;
module.exports.createWindow=()=>createAppWindow();
