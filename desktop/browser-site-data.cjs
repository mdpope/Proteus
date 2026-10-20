const {WebContentsView}=require('electron');
const {randomUUID}=require('node:crypto');
const {siteOrigin}=require('./browser-site-settings.cjs');
const categories={localStorage:'local_storage',indexedDB:'indexeddb',cacheStorage:'cache_storage',serviceWorkers:'service_workers',fileSystems:'file_systems'};
const cookieKey=c=>JSON.stringify([c.name,c.domain,c.path,c.partitionKey||null]);
const cookieFor=(c,origin)=>{const host=new URL(origin).hostname,domain=c.domain.replace(/^\./,'');return host===domain||c.domain.startsWith('.')&&host.endsWith('.'+domain);};
// A separate, short-lived Chromium target inspects the same partition. Fetch
// fulfills an empty document locally, so inspection never loads the website,
// runs its scripts, wakes a sleeping tab or borrows an agent's debugger.
class BrowserSiteData{
 constructor(browser){this.browser=browser;this.snapshots=new Map();this.jobs=new Map();}
 async target(profileId,origin,callback){
  const b=this.browser,partition=b.sessionFor(profileId),partitionName=b.sessionNames.get(profileId);await b.cookieStores.get(profileId)?.ready;
  const view=new WebContentsView({webPreferences:{session:partition,sandbox:true,nodeIntegration:false,contextIsolation:true}}),wc=view.webContents;
  b.window.contentView.addChildView(view);view.setBounds({x:0,y:0,width:1,height:1});view.setVisible(false);await wc.loadURL('about:blank');
  wc.setWindowOpenHandler(()=>({action:'deny'}));wc.on('will-attach-webview',event=>event.preventDefault());
  const debug=wc.debugger;debug.attach('1.3');
  debug.on('message',(_event,method,params)=>{if(method==='Fetch.requestPaused')void debug.sendCommand('Fetch.fulfillRequest',{requestId:params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'},{name:'Content-Security-Policy',value:"default-src 'none'"}],body:Buffer.from('<!doctype html><title>Local storage inspection</title>').toString('base64')}).catch(()=>{});});
  try{await debug.sendCommand('Network.setBypassServiceWorker',{bypass:true});await debug.sendCommand('Fetch.enable',{patterns:[{urlPattern:'*'}]});
   if(origin){let timer;try{await Promise.race([wc.loadURL(origin+'/__proteus_storage_inspection__'),new Promise((_,reject)=>timer=setTimeout(()=>{if(!wc.isDestroyed())wc.stop();reject(new Error('Website storage inspection timed out. Retry when the browser is idle.'));},8000))]);}finally{clearTimeout(timer);}}
   const current=()=>{b.sessionFor(profileId);if(b.sessionNames.get(profileId)!==partitionName)throw new Error('The browser profile changed. Refresh website data.');};current();
   const bounded={sendCommand:(...args)=>{let timer;return Promise.race([debug.sendCommand(...args),new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Chromium storage request timed out.')),5000))]).finally(()=>clearTimeout(timer));}};
   return await callback(bounded,partition,current);
  }finally{if(!b.window.isDestroyed())b.window.contentView.removeChildView(view);if(!wc.isDestroyed())wc.close();}
 }
 async command(value){const profileId=value.profileId||'default';const prior=this.jobs.get(profileId)||Promise.resolve();const job=prior.catch(()=>{}).then(()=>this.perform({...value,profileId}));this.jobs.set(profileId,job);try{return await job;}finally{if(this.jobs.get(profileId)===job)this.jobs.delete(profileId);}}
 async perform(value){
  const b=this.browser,{profileId}=value,partition=b.sessionFor(profileId),partitionName=b.sessionNames.get(profileId);await b.cookieStores.get(profileId)?.ready;
  if(value.action==='site-data-list'){
   const cookies=await partition.cookies.get({}),origins=new Set(Object.keys(b.siteSettings.entries(partitionName)));
   for(const tab of b.tabs.values())if(tab.profileId===profileId){const origin=siteOrigin(b.state(tab).url);if(origin)origins.add(origin);}
   for(const c of cookies){const origin=siteOrigin((c.secure?'https://':'http://')+c.domain.replace(/^\./,''));if(origin)origins.add(origin);}
   return {profileId,sites:[...origins].sort().map(origin=>({origin,cookies:cookies.filter(c=>cookieFor(c,origin)).length})),discovery:'Sites visited since this version, open tabs and sites with cookies. You can also enter an origin to inspect older storage.'};
  }
  if(value.action==='site-data-remove'&&value.allProfile===true){b.sessionFor(profileId);if(value.confirm!==profileId)throw new Error('Confirm the browser profile before clearing all website data.');await partition.clearData({excludeOrigins:b.extensions?.storageOrigins(profileId,partition)||[],dataTypes:['cookies','localStorage','indexedDB','cache','serviceWorkers','fileSystems','webSQL','backgroundFetch']});await b.cookieStores.get(profileId)?.save();return {removed:true};}
  const origin=siteOrigin(value.origin);if(!origin||origin===b.appOrigin)throw new Error('Choose an HTTP or HTTPS website origin.');
  if(value.action==='site-data-inspect')return this.target(profileId,origin,async(debug,partition)=>{
   await debug.sendCommand('DOMStorage.enable');await debug.sendCommand('IndexedDB.enable');
   const items=[],errors=[],put=(kind,name,details,identity)=>items.push({id:randomUUID(),kind,name,details,identity});
   const cookies=(await partition.cookies.get({})).filter(c=>cookieFor(c,origin));for(const c of cookies)put('cookie',c.name,`${c.domain}${c.path} · ${c.session?'Session':new Date(c.expirationDate*1000).toLocaleDateString()}${c.httpOnly?' · HttpOnly':''}${c.partitionKey?' · Partitioned':''}`,c);
   const read=async(kind,fn)=>{try{await fn();}catch{errors.push(kind+' could not be inspected.');}};
   await read('Local storage',async()=>{const {entries}=await debug.sendCommand('DOMStorage.getDOMStorageItems',{storageId:{securityOrigin:origin,isLocalStorage:true}});for(const [key,data]of entries)put('localStorage',key,Buffer.byteLength(data)+' bytes',{key});});
   await read('IndexedDB',async()=>{const {databaseNames}=await debug.sendCommand('IndexedDB.requestDatabaseNames',{securityOrigin:origin});for(const name of databaseNames)put('indexedDB',name,'Database',{name});});
   await read('Cache storage',async()=>{const {caches}=await debug.sendCommand('CacheStorage.requestCacheNames',{securityOrigin:origin});for(const cache of caches)put('cacheStorage',cache.cacheName,'Cache',{cacheId:cache.cacheId});});
   let usage=null;await read('Storage usage',async()=>{usage=await debug.sendCommand('Storage.getUsageAndQuota',{origin});for(const [kind,type]of Object.entries(categories))if(['serviceWorkers','fileSystems'].includes(kind)){const bytes=usage.usageBreakdown.find(item=>item.storageType===type)?.usage||0;if(bytes)put(kind,kind==='serviceWorkers'?'Service workers':'File storage',bytes+' bytes',{type});}});
   const snapshot=randomUUID();for(const [id,row]of this.snapshots)if(row.expires<Date.now())this.snapshots.delete(id);while(this.snapshots.size>=20)this.snapshots.delete(this.snapshots.keys().next().value);
   this.snapshots.set(snapshot,{profileId,partitionName,origin,items,expires:Date.now()+600000});b.siteSettings.remember(partitionName,origin);
   return {profileId,origin,snapshot,items:items.map(({identity,...row})=>row),usage:usage?.usage??null,errors};
  });
  if(value.action!=='site-data-remove')throw new Error('Unknown website data action.');

  const saved=this.snapshots.get(value.snapshot);if(!saved||saved.profileId!==profileId||saved.partitionName!==partitionName||saved.origin!==origin||saved.expires<Date.now())throw new Error('Website data changed or expired. Refresh the list before removing items.');
  b.sessionFor(profileId);
  if(value.allSite===true){await partition.clearData({origins:[origin],originMatchingMode:'origin-in-all-contexts',dataTypes:['cookies','localStorage','indexedDB','cache','serviceWorkers','fileSystems','webSQL','backgroundFetch']});}
  else{
   if(!Array.isArray(value.ids)||!value.ids.length||value.ids.length>10000)throw new Error('Select website data to remove.');const selected=value.ids.map(id=>saved.items.find(item=>item.id===id));if(selected.some(item=>!item))throw new Error('Refresh website data before removing items.');
   await this.target(profileId,origin,async(debug,_partition,current)=>{await debug.sendCommand('DOMStorage.enable');await debug.sendCommand('IndexedDB.enable');const present=await partition.cookies.get({});for(const item of selected){current();const c=item.identity;
    if(item.kind==='cookie'){if(present.some(row=>cookieKey(row)===cookieKey(c)))await debug.sendCommand('Network.deleteCookies',{name:c.name,domain:c.domain,path:c.path,...(c.partitionKey?{partitionKey:c.partitionKey}:{})});}
    else if(item.kind==='localStorage')await debug.sendCommand('DOMStorage.removeDOMStorageItem',{storageId:{securityOrigin:origin,isLocalStorage:true},key:c.key});
    else if(item.kind==='indexedDB')await debug.sendCommand('IndexedDB.deleteDatabase',{securityOrigin:origin,databaseName:c.name});
    else if(item.kind==='cacheStorage')await debug.sendCommand('CacheStorage.deleteCache',{cacheId:c.cacheId});
    else await debug.sendCommand('Storage.clearDataForOrigin',{origin,storageTypes:categories[item.kind]});
   }});
  }
  this.snapshots.delete(value.snapshot);await partition.cookies.flushStore();await b.cookieStores.get(profileId)?.save();return {removed:true};
 }
}
module.exports={BrowserSiteData,cookieFor,cookieKey};
