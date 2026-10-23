// Keep the actual Chromium player/WebContents alive. Never reload a media URL in
// another profile: authenticated, streaming and DRM players own more than a URL.
const {BrowserWindow,WebContentsView,ipcMain,screen}=require('electron');
const path=require('node:path');
const {resizeVideoWindow,moveVideoWindow}=require('./video-window-geometry.cjs');
class BrowserVideoPopout {
 constructor(browser){
  this.browser=browser;
  this.control=(event)=>{for(const tab of browser.tabs.values())if(tab.videoPopout?.controls.webContents===event.sender&&event.senderFrame===event.sender.mainFrame)this.close(tab);};
  this.activity=event=>{const tab=[...browser.tabs.values()].find(tab=>tab.view?.webContents===event.sender);if(tab?.videoPopout)this.wake(tab);};
  this.gesture=(event,value)=>{
   const tab=[...browser.tabs.values()].find(tab=>tab.view?.webContents===event.sender),item=tab?.videoPopout;
   if(!item||item.window.isDestroyed()||!item.window.isFocused()||!event.sender.mainFrame.framesInSubtree.includes(event.senderFrame))return;
   const bounds=item.window.getBounds();
   if(value?.action==='drag-start'&&Number.isFinite(value.x)&&Number.isFinite(value.y)){item.drag={x:value.x,y:value.y,bounds,frame:event.senderFrame};return;}
   if(value?.action==='drag-end'){item.drag=null;return;}
   if(value?.action==='drag'&&item.drag?.frame===event.senderFrame&&Number.isFinite(value.x)&&Number.isFinite(value.y)){
    const area=screen.getDisplayNearestPoint({x:Math.round(value.x),y:Math.round(value.y)}).workArea;
    item.window.setBounds(moveVideoWindow(item.drag.bounds,area,value.x-item.drag.x,value.y-item.drag.y));
   }else if(value?.action==='pinch'&&Number.isFinite(value.factor)&&value.factor>=.5&&value.factor<=2){
    item.drag=null;item.window.setBounds(resizeVideoWindow(bounds,screen.getDisplayMatching(bounds).workArea,value.factor));
   }
  };
  ipcMain.on('proteus:video-window-gesture',this.gesture);
  ipcMain.on('proteus:video-popout-close',this.control);ipcMain.on('proteus:video-activity',this.activity);
 }
 bind(tab){
  const wc=tab.view.webContents;let epoch=0;
  wc.on('enter-html-full-screen',async()=>{
   try {
   const current=++epoch,frames=wc.mainFrame.framesInSubtree;
   const found=await Promise.allSettled(frames.map(frame=>frame.executeJavaScript('new Promise(resolve=>{let timer;const inspect=()=>{clearTimeout(timer);document.removeEventListener("fullscreenchange",inspect);const element=document.fullscreenElement;resolve(Boolean(element&&(element.matches("video")||element.querySelector("video"))));};if(document.fullscreenElement)inspect();else{document.addEventListener("fullscreenchange",inspect,{once:true});timer=setTimeout(inspect,250);}})')));
   if(current!==epoch||wc.isDestroyed()||this.browser.shuttingDown)return;
   this.browser.withTabWindow(tab,()=>{
    if(this.browser.active!==tab.id||!this.browser.profileAvailable(tab))return this.exit(wc);
    if(found.some(result=>result.status==='fulfilled'&&result.value===true))this.open(tab);
    else {const window=this.browser.window;const layout=()=>{const {width,height}=window.getContentBounds();tab.view.setBounds({x:0,y:0,width,height});};tab.websiteFullscreen={window,layout,wasFullscreen:window.isFullScreen()};window.on('resize',layout);window.setFullScreen(true);layout();}
   });
   }catch{this.close(tab);this.browser.actions.send({type:'error',message:'The video window could not open. Try the player’s fullscreen button again.'});}
  });
  wc.on('leave-html-full-screen',()=>{epoch++;this.close(tab,false);});
  wc.on('did-start-navigation',details=>{if(details.isMainFrame&&!details.isSameDocument){epoch++;this.close(tab,false);}});
  wc.once('destroyed',()=>{epoch++;this.close(tab,false);});
  wc.on('before-input-event',(event,input)=>{if(tab.videoPopout&&input.type==='keyDown'&&(input.key==='Escape'||(input.meta||input.control)&&input.key.toLowerCase()==='w')){event.preventDefault();this.close(tab);}});
 }
 exit(wc){if(!wc||wc.isDestroyed())return;for(const frame of wc.mainFrame.framesInSubtree)void frame.executeJavaScript('document.fullscreenElement ? document.exitFullscreen().catch(()=>{}) : undefined').catch(()=>{});}
 wake(tab){const wc=tab.videoPopout?.controls.webContents;if(wc&&!wc.isDestroyed())wc.send('proteus:video-popout-wake');}
 open(tab){
  if(tab.videoPopout)return;
  const owner=this.browser.window,view=tab.view,bounds=owner.getBounds();
  const window=new BrowserWindow({...bounds,frame:false,show:false,alwaysOnTop:true,resizable:true,minWidth:240,minHeight:160,backgroundColor:'#000000',title:'Proteus video',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  const controls=new WebContentsView({webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,preload:path.join(__dirname,'browser-video-controls-preload.cjs')}});
  controls.setBackgroundColor('#00000000');
  tab.videoPopout={window,owner,controls,view};
  for(const frame of view.webContents.mainFrame.framesInSubtree)try{frame.send('proteus:video-popout-state',true);}catch{}
  window.on('blur',()=>{if(tab.videoPopout)tab.videoPopout.drag=null;});
  // Explicit removal also makes returning the view deterministic across platforms.
  owner.contentView.removeChildView(view);window.contentView.addChildView(view);window.contentView.addChildView(controls);
  const layout=()=>{if(window.isDestroyed())return;const {width,height}=window.getContentBounds();view.setBounds({x:0,y:0,width,height});controls.setBounds({x:0,y:0,width,height:44});};
  window.on('resize',layout);window.on('close',event=>{event.preventDefault();this.close(tab);});const ownerClosed=()=>this.close(tab,false);tab.videoPopout.ownerClosed=ownerClosed;owner.once('closed',ownerClosed);
  controls.webContents.setWindowOpenHandler(()=>({action:'deny'}));controls.webContents.on('will-navigate',event=>event.preventDefault());
  void controls.webContents.loadFile(path.join(__dirname,'browser-video-controls.html')).catch(()=>this.close(tab));
  layout();view.setVisible(true);window.show();view.webContents.focus();this.browser.updateThrottling();
 }
 close(tab,exit=true){
  const full=tab.websiteFullscreen;delete tab.websiteFullscreen;if(full&&!full.window.isDestroyed()){full.window.removeListener('resize',full.layout);if(!full.wasFullscreen)full.window.setFullScreen(false);this.browser.withTabWindow(tab,()=>this.browser.show(this.browser.active,this.browser.bounds));}
  const item=tab.videoPopout;if(!item){if(exit)this.exit(tab.view?.webContents);return;}
  delete tab.videoPopout;
  if(!item.view.webContents.isDestroyed())for(const frame of item.view.webContents.mainFrame.framesInSubtree)try{frame.send('proteus:video-popout-state',false);}catch{}
  item.owner.removeListener('closed',item.ownerClosed);
  if(exit)this.exit(item.view.webContents);
  if(!item.window.isDestroyed())item.window.contentView.removeChildView(item.view);
  if(!item.owner.isDestroyed()&&!item.view.webContents.isDestroyed()){
   item.owner.contentView.addChildView(item.view);
   this.browser.withTabWindow(tab,()=>this.browser.show(this.browser.active,this.browser.bounds));
  }
  if(!item.controls.webContents.isDestroyed())item.controls.webContents.close();
  if(!item.window.isDestroyed())item.window.destroy();
 }
 dispose(){for(const tab of this.browser.tabs.values())this.close(tab,false);ipcMain.removeListener('proteus:video-popout-close',this.control);ipcMain.removeListener('proteus:video-activity',this.activity);ipcMain.removeListener('proteus:video-window-gesture',this.gesture);}
}
module.exports={BrowserVideoPopout};
