const { app, Menu, shell, clipboard, dialog, nativeImage, WebContentsView } = require('electron');
const path = require('node:path');
const {editContextItems}=require('../services/edit-context-menu.cjs');
const { safeHistoryURL } = require('./browser-history.cjs');
const {BrowserDownloads}=require('./browser-downloads.cjs');
const {pageWebPreferences}=require('./browser-page-preferences.cjs');

class BrowserActions {
  constructor(browser) {
    this.browser = browser; this.downloads = new Map();this.downloadManager=browser.options?.home?new BrowserDownloads(browser):null;
    this.downloadHandler = (event, item, contents) => {
      const grant = this.downloads.get(contents?.id);
      const chain = item.getURLChain();
      if(this.downloadManager){
        if(!this.downloadManager.adopt(event,item,contents,grant))return;
        if(grant){grant.claimed=true;clearTimeout(grant.timer);item.once('done',()=>this.disposeDownload(contents.id));}
        return;
      }
      if (!grant || grant.claimed || chain[0] !== grant.url || chain.some(url => !this.link(url))) { event.preventDefault(); return; }
      grant.claimed = true; clearTimeout(grant.timer); item.setSavePath(grant.file);
      item.once('done', (_event, state) => { this.disposeDownload(contents.id); if (state !== 'completed') this.send({type:'error',message:'The linked file could not be downloaded.'}); });
    };
    browser.partition.on('will-download', this.downloadHandler);
  }
  link(value) {
    try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) && !url.username && !url.password && url.origin !== this.browser.appOrigin ? url.href : null; } catch { return null; }
  }
  send(value) { if(this.browser.sendAction)return this.browser.sendAction(value);if (!this.browser.shuttingDown && !this.browser.window.isDestroyed()) this.browser.window.webContents.send('proteus:browser-action',value); }
  icon(name) {
    if (process.platform !== 'darwin') return {};
    try { const image = nativeImage.createFromNamedImage(name).resize({width:16,height:16}); if (!image.isEmpty()) { image.setTemplateImage(true); return {icon:image}; } } catch {}
    return {};
  }
  profileItems() {
    const items=this.browser.options.profiles?.list().items||[];
    const list=items.length?items:[{id:'default',name:'Default'}];
    return [...list.filter(profile=>profile.id==='default'),...list.filter(profile=>profile.id!=='default')];
  }
  menu(tab, params) {
    const url = this.link(params.linkURL);
    // Capture ownership when the menu opens, before another surface can become active.
    const source={profileId:tab.profileId,group:tab.group,parentId:tab.parentId||null,destination:tab.destination,workspaceName:tab.workspaceName,associationChatId:tab.associationChatId};
    // Native Menu callbacks run after the originating IPC/webContents scope ends.
    // Re-enter that tab's window before any async creation or selection occurs.
    const run = action => () => { if (this.browser.shuttingDown || !this.browser.tabs.has(tab.id)) return; Promise.resolve().then(()=>this.browser.withTabWindow?this.browser.withTabWindow(tab,action):action()).catch(error => this.send({type:'error',id:tab.id,message:error.message})); };
    const items=[];
    if(params.isEditable){
      items.push(...editContextItems(tab.view.webContents,params));
    } else if(params.selectionText){
      items.push({label:'Copy Selection',role:'copy'},{role:'selectAll'});
    }
    const inspect=tab.view?.webContents?{label:'Inspect Element',...this.icon('NSRevealFreestandingTemplate'),click:run(()=>this.browser.command({action:'devtools',id:tab.id,x:params.x,y:params.y}))}:null;
    if(!url){
      const editing=items.splice(0);
      const wc=tab.view?.webContents;
      if(wc){
        if(items.length)items.push({type:'separator'});
        items.push({label:'Back',enabled:wc.navigationHistory.canGoBack(),click:run(()=>this.browser.command({action:'back',id:tab.id}))},
          {label:'Forward',enabled:wc.navigationHistory.canGoForward(),click:run(()=>this.browser.command({action:'forward',id:tab.id}))},
          {label:'Reload',click:run(()=>this.browser.command({action:'reload',id:tab.id}))});
      }
      if(editing.length){if(items.length)items.push({type:'separator'});items.push(...editing);}
      if(inspect){if(items.length)items.push({type:'separator'});items.push(inspect);}
      return items.length?Menu.buildFromTemplate(items):null;
    }
    let browserName = 'Default Browser';
    try { browserName = app.getApplicationNameForProtocol('https://') || browserName; } catch {}
    return Menu.buildFromTemplate([
      // One entry per configured profile, Default first; the former generic
      // "New Tab" duplicated whichever profile the source tab used.
      ...this.profileItems().slice(0,1).map(profile=>({label:`Open Link in New ${String(profile.name||'Default').replace(/[\r\n]/g,' ').replace(/&/g,'&&')} Browser Tab`,...this.icon('NSAddTemplate'),click:run(async()=>{const info=await this.browser.create(url,null,null,{...source,profileId:profile.id});this.send({type:'select-tab',info,afterId:tab.id});})})),
      {label:'Open Link in Background Tab',...this.icon('NSAddTemplate'),click:run(async()=>{const info=await this.browser.create(url,null,null,{...source,hidden:false,unloaded:false,background:true});this.send({type:'background-tab',info,afterId:tab.id});})},
      ...this.profileItems().slice(1).map(profile=>({label:`Open Link in New ${String(profile.name||'Default').replace(/[\r\n]/g,' ').replace(/&/g,'&&')} Browser Tab`,...this.icon('NSAddTemplate'),click:run(async()=>{const info=await this.browser.create(url,null,null,{...source,profileId:profile.id});this.send({type:'select-tab',info,afterId:tab.id});})})),
      {label:'Open Link in Unloaded Tab',...this.icon('NSAddTemplate'),click:run(async()=>{const info=await this.browser.create(url,null,null,{...source,hidden:true,unloaded:true,title:String(params.linkText||'').trim().slice(0,200)});this.send({type:'unloaded-tab',info,afterId:tab.id});})},
      {label:`Open Link in ${browserName.replace(/[\r\n]/g,' ').replace(/&/g,'&&')}`, ...this.icon('NSFollowLinkFreestandingTemplate'), click:run(() => shell.openExternal(url))},
      {type:'separator'},
      {label:'Copy Link',...this.icon('NSLinkTemplate'),click:run(() => clipboard.writeText(url))},
      {label:'Download Linked File As…',...this.icon('NSTouchBarDownloadTemplate'),click:run(() => this.download(url,tab.profileId))},
      {type:'separator'},
      {label:'Start New Chat with Link',...this.icon('NSTouchBarComposeTemplate'),click:run(() => this.send({type:'chat-link',url}))},
      ...(items.length?[{type:'separator'},...items]:[]),
      ...(inspect?[{type:'separator'},inspect]:[]),
    ]);
  }
  async download(url,profileId='default') {
    let filename = 'download';
    try { filename = path.basename(decodeURIComponent(new URL(url).pathname)).replace(/[\x00-\x1f/\\:]/g,'_').slice(0,180) || filename; } catch {}
    const result = await dialog.showSaveDialog(this.browser.window,{title:'Save link as',defaultPath:path.join(this.downloadManager?.settings().directory||app.getPath('downloads'),filename),buttonLabel:'Save'});
    if (result.canceled || !result.filePath || this.browser.shuttingDown) return;
    return this.startDownload(url,profileId,result.filePath);
  }
  startDownload(url,profileId,file,options={}) {
    if(!this.link(url)||!this.browser.profileAvailable({profileId}))throw Error('This download source or profile is unavailable.');
    // A page cannot consume this grant: only a new, never-navigated webContents may download.
    const view = new WebContentsView({webPreferences:pageWebPreferences({session:this.browser.sessionFor(profileId)})});
    const wc = view.webContents;
    this.downloads.set(wc.id,{view,url,profileId,file,windowId:this.browser.windowId?.()||'main',...options,claimed:false,timer:setTimeout(() => this.disposeDownload(wc.id),60000)});
    try { wc.downloadURL(url); } catch (error) { this.disposeDownload(wc.id); throw error; }
  }
  disposeDownload(id) { const grant = this.downloads.get(id); if (!grant) return; this.downloads.delete(id); clearTimeout(grant.timer); if (!grant.view.webContents.isDestroyed()) grant.view.webContents.close(); }
  async overview(group) {
    const browser = this.browser;
    browser.overviewOpen = true;
    const tabs = browser.list(true).filter(tab => !group || tab.group === group);
    for(const info of tabs){const tab=browser.tabs.get(info.id);if(tab&&browser.profileAvailable(tab))Object.assign(info,browser.thumbnails?.get(browser.thumbnailKey(tab))||{});}
    browser.show(null);return {tabs};
  }
  dispose() { this.downloadManager?.close();for (const id of this.downloads.keys()) this.disposeDownload(id); for(const partition of this.browser.sessions.values())partition.removeListener('will-download',this.downloadHandler); }
}
module.exports = { BrowserActions };
