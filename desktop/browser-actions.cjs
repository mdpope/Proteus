const { app, Menu, shell, clipboard, dialog, nativeImage, WebContentsView } = require('electron');
const path = require('node:path');
const { safeHistoryURL } = require('./browser-history.cjs');

class BrowserActions {
  constructor(browser) {
    this.browser = browser; this.downloads = new Map();
    this.downloadHandler = (event, item, contents) => {
      const grant = this.downloads.get(contents?.id);
      const chain = item.getURLChain();
      if (!grant || grant.claimed || chain[0] !== grant.url || chain.some(url => !this.link(url))) { event.preventDefault(); return; }
      grant.claimed = true; clearTimeout(grant.timer); item.setSavePath(grant.file);
      item.once('done', (_event, state) => { this.disposeDownload(contents.id); if (state !== 'completed') this.send({type:'error',message:'The linked file could not be downloaded.'}); });
    };
    browser.partition.on('will-download', this.downloadHandler);
  }
  link(value) {
    try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) && !url.username && !url.password && url.origin !== this.browser.appOrigin ? url.href : null; } catch { return null; }
  }
  send(value) { if (!this.browser.shuttingDown && !this.browser.window.isDestroyed()) this.browser.window.webContents.send('proteus:browser-action',value); }
  icon(name) {
    if (process.platform !== 'darwin') return {};
    try { const image = nativeImage.createFromNamedImage(name).resize({width:16,height:16}); if (!image.isEmpty()) { image.setTemplateImage(true); return {icon:image}; } } catch {}
    return {};
  }
  menu(tab, params) {
    const url = this.link(params.linkURL); if (!url) return;
    const run = action => () => { if (this.browser.shuttingDown || !this.browser.tabs.has(tab.id)) return; Promise.resolve().then(action).catch(error => this.send({type:'error',message:error.message})); };
    let browserName = 'Default Browser';
    try { browserName = app.getApplicationNameForProtocol('https://') || browserName; } catch {}
    return Menu.buildFromTemplate([
      {label:'Open Link in New Tab',...this.icon('NSAddTemplate'),click:run(async () => { const info = await this.browser.create(url,null,null,{group:tab.group}); this.send({type:'select-tab',info}); })},
      {label:`Open Link in ${browserName.replace(/[\r\n]/g,' ').replace(/&/g,'&&')}`, ...this.icon('NSFollowLinkFreestandingTemplate'), click:run(() => shell.openExternal(url))},
      {type:'separator'},
      {label:'Copy Link',...this.icon('NSLinkTemplate'),click:run(() => clipboard.writeText(url))},
      {label:'Download Linked File As…',...this.icon('NSGoDownTemplate'),click:run(() => this.download(url))},
      {type:'separator'},
      {label:'Start New Chat with Link',...this.icon('NSCommentTemplate'),click:run(() => this.send({type:'chat-link',url}))},
    ]);
  }
  async download(url) {
    let filename = 'download';
    try { filename = path.basename(decodeURIComponent(new URL(url).pathname)).replace(/[\x00-\x1f/\\:]/g,'_').slice(0,180) || filename; } catch {}
    const result = await dialog.showSaveDialog(this.browser.window,{title:'Download Linked File As',defaultPath:filename,buttonLabel:'Download'});
    if (result.canceled || !result.filePath || this.browser.shuttingDown) return;
    // A page cannot consume this grant: only a new, never-navigated webContents may download.
    const view = new WebContentsView({webPreferences:{session:this.browser.partition,nodeIntegration:false,contextIsolation:true,sandbox:true}});
    const wc = view.webContents;
    this.downloads.set(wc.id,{view,url,file:result.filePath,claimed:false,timer:setTimeout(() => this.disposeDownload(wc.id),60000)});
    try { wc.downloadURL(url); } catch (error) { this.disposeDownload(wc.id); throw error; }
  }
  disposeDownload(id) { const grant = this.downloads.get(id); if (!grant) return; this.downloads.delete(id); clearTimeout(grant.timer); if (!grant.view.webContents.isDestroyed()) grant.view.webContents.close(); }
  async overview(group) {
    const browser = this.browser;
    browser.show(null); browser.overviewOpen = true;
    const tabs = browser.list(true).filter(tab => !group || tab.group === group);
    await Promise.all(tabs.slice(0,30).map(async info => {
      const tab = browser.tabs.get(info.id), wc = tab?.view?.webContents;
      if (!info.loaded || !wc || wc.isDestroyed() || !safeHistoryURL(info.url,browser.appOrigin)) return;
      try { const image = await wc.capturePage(); if (!image.isEmpty()) info.thumbnail = image.resize({width:360}).toDataURL(); } catch {}
    }));
    return {tabs};
  }
  dispose() { for (const id of this.downloads.keys()) this.disposeDownload(id); this.browser.partition.removeListener('will-download',this.downloadHandler); }
}
module.exports = { BrowserActions };
