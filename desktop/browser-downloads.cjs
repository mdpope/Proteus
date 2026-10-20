const fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const {app,shell}=require('electron');
const {safeHistoryURL}=require('./browser-history.cjs');
function downloadName(value){const name=path.basename(String(value||'download').replaceAll('\\','/')).replace(/[\x00-\x1f\x7f/:]/g,'_').slice(0,180);return name&&name!=='.'&&name!=='..'?name:'download';}
function reserveDownload(directory,name){const base=downloadName(name),extension=path.extname(base),stem=base.slice(0,base.length-extension.length);for(let i=0;i<10000;i++){const file=path.join(directory,i?`${stem} (${i})${extension}`:base);try{fs.closeSync(fs.openSync(file,'wx',0o600));return file;}catch(error){if(error.code!=='EEXIST')throw error;}}throw new Error('Choose another download filename.');}
class BrowserDownloads {
 constructor(browser){this.browser=browser;this.active=new Map();this.file=path.join(browser.options.home,'browser-downloads.json');this.settingsFile=path.join(browser.options.home,'browser-download-settings.json');this.rows=[];try{const saved=JSON.parse(fs.readFileSync(this.file,'utf8'));if(saved.schemaVersion!==1||!Array.isArray(saved.items))throw new Error('Invalid downloads history.');this.rows=saved.items.slice(-1000).map(row=>({...row,...(['progressing','paused'].includes(row.state)?{state:'interrupted',finishedAt:new Date().toISOString()}:{} )}));}catch(error){if(error.code!=='ENOENT')this.error='Download history could not be read; its original file was preserved.';}}
 settings(){let saved={};try{saved=JSON.parse(fs.readFileSync(this.settingsFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw new Error('Download preferences could not be read.');}return {directory:saved.directory||app.getPath('downloads'),defaultDirectory:app.getPath('downloads')};}
 save(){if(this.error)return;const items=this.rows.filter(row=>this.active.has(row.id)).concat(this.rows.filter(row=>!this.active.has(row.id)).slice(-1000));const temp=this.file+'.tmp';fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(temp,JSON.stringify({schemaVersion:1,items}),{mode:0o600});fs.renameSync(temp,this.file);this.rows=items;}
 notify(){this.browser.actions.send({type:'downloads',active:this.active.size});}
 schedule(){if(this.progressTimer)return;this.progressTimer=setTimeout(()=>{this.progressTimer=null;this.save();this.notify();},1000);}
 list({offset=0,limit=50}={}){offset=Math.max(0,Math.floor(Number(offset)||0));limit=Math.max(1,Math.min(200,Math.floor(Number(limit)||50)));return {items:[...this.rows].sort((a,b)=>Number(this.active.has(b.id))-Number(this.active.has(a.id))||Date.parse(b.startedAt)-Date.parse(a.startedAt)).slice(offset,offset+limit).map(row=>({...row})),total:this.rows.length,hasMore:offset+limit<this.rows.length,active:this.active.size,settings:this.settings(),error:this.error||null};}
 adopt(event,item,contents,grant){
  const tab=[...this.browser.tabs.values()].find(tab=>tab.view?.webContents===contents),chain=item.getURLChain();
  const validURL=value=>{try{const url=new URL(value);if(url.protocol==='blob:')return !!tab&&url.origin===new URL(contents.getURL()).origin;return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&url.origin!==this.browser.appOrigin;}catch{return false;}};
  if((!grant&&(!tab||!this.browser.profileAvailable(tab)))||!chain.length||chain.some(url=>!validURL(url))||this.active.size>=32){event.preventDefault();return false;}
  if(grant&&(grant.claimed||chain[0]!==grant.url)){event.preventDefault();return false;}
  if(this.error){event.preventDefault();this.browser.actions.send({type:'error',message:this.error});return false;}
  let file,reserved=false;
  try{if(grant)file=grant.file;else{const {directory}=this.settings();fs.mkdirSync(directory,{recursive:true});file=reserveDownload(directory,item.getFilename());reserved=true;}item.setSavePath(file);}catch(error){event.preventDefault();this.browser.actions.send({type:'error',message:'Download could not start: '+error.message});return false;}
  const row={id:randomUUID(),tabId:tab?.id||null,profileId:tab?.profileId||grant?.profileId||'default',name:downloadName(item.getFilename()),file,url:safeHistoryURL(chain[0])||null,startedAt:new Date().toISOString(),downloadedAt:null,state:'progressing',receivedBytes:0,totalBytes:item.getTotalBytes()};
  if(reserved)row.cleanupOnCancel=true;this.rows.push(row);this.active.set(row.id,item);this.save();this.notify();
  item.on('updated',(_event,state)=>{if(row.state==='cancelled')return;row.state=item.isPaused()?'paused':state;row.receivedBytes=item.getReceivedBytes();row.totalBytes=item.getTotalBytes();this.schedule();});
  item.once('done',(_event,state)=>{row.state=row.state==='cancelled'?'cancelled':state;row.receivedBytes=item.getReceivedBytes();row.totalBytes=item.getTotalBytes();row.finishedAt=new Date().toISOString();if(state==='completed')row.downloadedAt=row.finishedAt;this.active.delete(row.id);if(state!=='completed'&&reserved){try{fs.unlinkSync(file);}catch{}}this.save();this.notify();});
  return true;
 }
 async command(value){
  if(value.action==='downloads-list')return this.list(value);
  if(value.action==='downloads-folder'){fs.mkdirSync(this.settings().directory,{recursive:true});const error=await shell.openPath(this.settings().directory);if(error)throw new Error(error);return {opened:true};}
  if(value.action==='downloads-settings'){
   if(typeof value.directory!=='string'||!path.isAbsolute(value.directory)||!fs.statSync(value.directory).isDirectory())throw new Error('Choose an existing download folder on this computer.');
   const temp=this.settingsFile+'.tmp';fs.writeFileSync(temp,JSON.stringify({directory:fs.realpathSync(value.directory)}),{mode:0o600});fs.renameSync(temp,this.settingsFile);return this.list();
  }
  const row=this.rows.find(row=>row.id===value.downloadId);if(!row)throw new Error('Download no longer exists.');
  if(value.action==='downloads-cancel'){const item=this.active.get(row.id);if(item){row.state='cancelled';row.finishedAt=new Date().toISOString();this.active.delete(row.id);item.cancel();if(row.cleanupOnCancel){try{fs.unlinkSync(row.file);}catch{}}this.save();this.notify();}return this.list();}
  if(value.action==='downloads-open'){if(row.state!=='completed'||!fs.statSync(row.file).isFile())throw new Error('Completed file is unavailable.');const error=await shell.openPath(row.file);if(error)throw new Error(error);return {opened:true};}
  if(value.action==='downloads-show'){shell.showItemInFolder(row.file);return {shown:true};}
  throw new Error('Unknown download operation.');
 }
 close(){clearTimeout(this.progressTimer);this.progressTimer=null;for(const item of this.active.values())item.cancel();this.save();}
}
module.exports={BrowserDownloads,downloadName,reserveDownload};
