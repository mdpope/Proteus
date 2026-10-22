const {DownloadSpeed}=require('./download-speed.cjs');
const fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const {app,shell}=require('electron');
const {safeHistoryURL}=require('./browser-history.cjs');
function downloadName(value){const name=path.basename(String(value||'download').replaceAll('\\','/')).replace(/[\x00-\x1f\x7f/:]/g,'_').slice(0,180);return name&&name!=='.'&&name!=='..'?name:'download';}
function reserveDownload(directory,name){const base=downloadName(name),extension=path.extname(base),stem=base.slice(0,base.length-extension.length);for(let i=0;i<10000;i++){const file=path.join(directory,i?`${stem} (${i})${extension}`:base);try{fs.closeSync(fs.openSync(file,'wx',0o600));return file;}catch(error){if(error.code!=='EEXIST')throw error;}}throw new Error('Choose another download filename.');}
class BrowserDownloads {
 constructor(browser){this.browser=browser;this.active=new Map();this.speeds=new Map();this.settingsFile=path.join(browser.options.home,'browser-download-settings.json');this.rows=[];this.listeners=new Map();this.closedWindows=new Set();
  // Retire metadata from the old persistent list, never the downloaded files.
  fs.rmSync(path.join(browser.options.home,'browser-downloads.json'),{force:true});
 }
 owner(){return this.browser.windowId?.()||'main';}
 settings(){let saved={};try{saved=JSON.parse(fs.readFileSync(this.settingsFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw new Error('Download preferences could not be read.');}return {directory:saved.directory||app.getPath('downloads'),defaultDirectory:app.getPath('downloads')};}
 notify(){for(const [owner,listeners]of this.listeners)for(const listener of listeners)listener(this.list({},owner));if(this.browser.windowRegistry){for(const ctx of this.browser.windowRegistry.contexts.values())if(!ctx.window.isDestroyed())this.browser.windowRegistry.run(ctx.id,()=>this.browser.actions.send({type:'downloads',active:this.list({},ctx.id).active}));}else this.browser.actions.send({type:'downloads',active:this.active.size});}
 schedule(){if(this.progressTimer)return;this.progressTimer=setTimeout(()=>{this.progressTimer=null;this.notify();if(this.rows.some(row=>row.state==='progressing'&&this.active.has(row.id)))this.schedule();},250);}
 list({offset=0,limit=200}={},owner=this.owner()){offset=Math.max(0,Math.floor(Number(offset)||0));limit=Math.max(1,Math.min(1000,Math.floor(Number(limit)||200)));const rows=this.rows.filter(row=>row.windowId===owner).sort((a,b)=>Number(this.active.has(b.id))-Number(this.active.has(a.id))||Date.parse(b.startedAt)-Date.parse(a.startedAt));return {items:rows.slice(offset,offset+limit).map(row=>{const item=this.active.get(row.id);return {...row,speedBytesPerSecond:row.state==='progressing'?this.speeds.get(row.id)?.value()||0:0,canPause:!!item&&row.state==='progressing',canResume:!!item&&item.canResume(),canRetry:!item&&['interrupted','cancelled'].includes(row.state)&&!!row.url&&this.browser.profileAvailable({profileId:row.profileId})};}),total:rows.length,hasMore:offset+limit<rows.length,active:rows.filter(row=>this.active.has(row.id)).length,settings:this.settings()};}
 subscribe(owner,listener){const listeners=this.listeners.get(owner)||new Set();listeners.add(listener);this.listeners.set(owner,listeners);return ()=>{listeners.delete(listener);if(!listeners.size)this.listeners.delete(owner);};}
 adopt(event,item,contents,grant){
  const tab=[...this.browser.tabs.values()].find(tab=>tab.view?.webContents===contents),chain=item.getURLChain();
  const validURL=value=>{try{const url=new URL(value);if(url.protocol==='blob:')return !!tab&&url.origin===new URL(contents.getURL()).origin;return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&url.origin!==this.browser.appOrigin;}catch{return false;}};
  if((!grant&&(!tab||!this.browser.profileAvailable(tab)))||!chain.length||chain.some(url=>!validURL(url))||this.active.size>=32){event.preventDefault();return false;}
  if(grant&&(grant.claimed||chain[0]!==grant.url)){event.preventDefault();return false;}
  const owner=tab?.windowId||grant?.windowId||this.owner();if(this.closedWindows.has(owner)){event.preventDefault();return false;}
  let file,reserved=false;
  try{if(grant){file=grant.file;reserved=grant.reserved===true;}else{const {directory}=this.settings();fs.mkdirSync(directory,{recursive:true});file=reserveDownload(directory,item.getFilename());reserved=true;}item.setSavePath(file);}catch(error){event.preventDefault();this.browser.actions.send({type:'error',message:'Download could not start: '+error.message});return false;}
  const retry=grant?.retryId&&this.rows.find(row=>row.id===grant.retryId&&row.windowId===owner);
  const row=Object.assign(retry||{id:randomUUID()},{windowId:owner,tabId:tab?.id||null,profileId:tab?.profileId||grant?.profileId||'default',name:downloadName(item.getFilename()),file,url:safeHistoryURL(chain[0])||null,startedAt:new Date().toISOString(),downloadedAt:null,finishedAt:null,state:'progressing',receivedBytes:0,totalBytes:item.getTotalBytes(),cleanupOnCancel:reserved});
  if(!retry)this.rows.push(row);this.active.set(row.id,item);const speed=new DownloadSpeed();speed.reset();this.speeds.set(row.id,speed);this.notify();this.schedule();
  item.on('updated',(_event,state)=>{if(row.state==='cancelled')return;row.state=item.isPaused()?'paused':state;row.receivedBytes=item.getReceivedBytes();row.totalBytes=item.getTotalBytes();if(row.state==='progressing')speed.update(row.receivedBytes);else speed.reset(row.receivedBytes);this.schedule();});
  item.once('done',(_event,state)=>{row.state=row.state==='cancelled'?'cancelled':state;row.receivedBytes=item.getReceivedBytes();row.totalBytes=item.getTotalBytes();row.finishedAt=new Date().toISOString();if(state==='completed')row.downloadedAt=row.finishedAt;this.active.delete(row.id);this.speeds.delete(row.id);if(state!=='completed'&&reserved){try{fs.unlinkSync(file);}catch{}}this.notify();});return true;
 }
 async command(value){
  if(value.action==='downloads-list')return this.list(value);
  if(value.action==='downloads-panel')return require('./browser-download-panel.cjs').openDownloads({parent:this.browser.window,manager:this,owner:this.owner(),x:value.x,y:value.y,colors:value.colors});
  if(value.action==='downloads-folder'){fs.mkdirSync(this.settings().directory,{recursive:true});const error=await shell.openPath(this.settings().directory);if(error)throw new Error(error);return {opened:true};}
  if(value.action==='downloads-settings'){if(typeof value.directory!=='string'||!path.isAbsolute(value.directory)||!fs.statSync(value.directory).isDirectory())throw new Error('Choose an existing download folder on this computer.');const temp=this.settingsFile+'.tmp';fs.writeFileSync(temp,JSON.stringify({directory:fs.realpathSync(value.directory)}),{mode:0o600});fs.renameSync(temp,this.settingsFile);return this.list();}
  const row=this.rows.find(row=>row.id===value.downloadId&&row.windowId===this.owner());if(!row)throw new Error('Download no longer exists in this window.');const item=this.active.get(row.id);
  if(value.action==='downloads-pause'){if(!item||row.state!=='progressing')throw Error('This download cannot be paused.');item.pause();this.speeds.get(row.id)?.reset(row.receivedBytes);row.state='paused';this.notify();return this.list();}
  if(value.action==='downloads-resume'){if(!item?.canResume())throw Error('This download cannot resume.');this.speeds.get(row.id)?.reset(row.receivedBytes);item.resume();row.state='progressing';this.notify();return this.list();}
  if(value.action==='downloads-retry'){if(!this.list().items.find(item=>item.id===row.id)?.canRetry)throw Error('This download cannot restart.');const file=reserveDownload(path.dirname(row.file),row.name);try{this.browser.actions.startDownload(row.url,row.profileId,file,{windowId:row.windowId,retryId:row.id,reserved:true});}catch(error){fs.rmSync(file,{force:true});throw error;}return this.list();}
  if(value.action==='downloads-cancel'){if(item){row.state='cancelled';item.cancel();this.notify();}return this.list();}
  if(value.action==='downloads-open'){if(row.state!=='completed'||!fs.statSync(row.file).isFile())throw new Error('Completed file is unavailable.');const error=await shell.openPath(row.file);if(error)throw new Error(error);return {opened:true};}
  if(value.action==='downloads-show'){shell.showItemInFolder(row.file);return {shown:true};}throw new Error('Unknown download operation.');
 }
 openWindow(owner){this.closedWindows.delete(owner);}
 closeWindow(owner){this.closedWindows.add(owner);for(const row of this.rows)if(row.windowId===owner)this.speeds.delete(row.id);this.rows=this.rows.filter(row=>row.windowId!==owner);this.listeners.delete(owner);for(const [id,grant]of this.browser.actions.downloads||[])if(grant.windowId===owner)this.browser.actions.disposeDownload(id);}
 close(){clearTimeout(this.progressTimer);this.progressTimer=null;for(const item of this.active.values())item.cancel();this.rows=[];this.speeds.clear();this.listeners.clear();}
}
module.exports={BrowserDownloads,downloadName,reserveDownload};
