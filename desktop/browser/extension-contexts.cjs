const {randomUUID}=require('node:crypto');
const lists={contextIds:'string',contextTypes:'string',documentIds:'string',documentOrigins:'string',documentUrls:'string',frameIds:'number',tabIds:'number',windowIds:'number'};
function filterContexts(contexts,filter={}){
 if(!filter||typeof filter!=='object'||Array.isArray(filter)||Object.keys(filter).some(key=>!Object.hasOwn(lists,key)&&key!=='incognito'))throw Error('Invalid extension context filter.');
 for(const [key,type]of Object.entries(lists))if(filter[key]!==undefined&&(!Array.isArray(filter[key])||filter[key].length>1000||filter[key].some(value=>typeof value!==type)))throw Error('Invalid extension context filter.');
 if(filter.incognito!==undefined&&typeof filter.incognito!=='boolean')throw Error('Invalid extension context filter.');
 const properties={contextIds:'contextId',contextTypes:'contextType',documentIds:'documentId',documentOrigins:'documentOrigin',documentUrls:'documentUrl',frameIds:'frameId',tabIds:'tabId',windowIds:'windowId'};
 return contexts.filter(context=>Object.entries(properties).every(([key,property])=>!filter[key]||filter[key].includes(context[property]))&&(filter.incognito===undefined||context.incognito===filter.incognito));
}
// Chromium's Electron getContexts omits host-created extension BrowserWindows.
// Publish only this extension's live pages in this session through its existing
// authenticated extension router. A context ID is per document; no native
// documentId is invented for APIs that use Chromium's own addressing.
function installExtensionContexts(host,windows){
 const documents=new WeakMap();
 host.adapter.ctx.router.apiHandler()('runtime.getContexts',(event,filter={})=>{
  const contexts=[];
  for(const window of windows()){
   const wc=window.webContents;
   if(window.isDestroyed()||wc.isDestroyed()||wc.session!==host.session||window.extensionOwnerID!==event.extension.id)continue;
   let url;try{url=new URL(wc.getURL());}catch{continue;}
   if(url.protocol!=='chrome-extension:'||url.hostname!==event.extension.id)continue;
   let document=documents.get(wc);
   if(!document){document={id:randomUUID()};documents.set(wc,document);wc.on('did-start-navigation',(_event,_url,inPlace,mainFrame)=>{if(mainFrame&&!inPlace)document.id=randomUUID();});}
   const parent=window.extensionActionPopup?window.getParentWindow():null;
   contexts.push({contextId:document.id,contextType:window.extensionActionPopup?'POPUP':'TAB',documentUrl:url.href,documentOrigin:url.origin==='null'?'chrome-extension://'+url.hostname:url.origin,frameId:0,tabId:window.extensionActionPopup?-1:wc.id,windowId:parent&&!parent.isDestroyed()?parent.id:window.id,incognito:!host.session.isPersistent()});
  }
  return filterContexts(contexts,filter);
 });
}
module.exports={filterContexts,installExtensionContexts};
