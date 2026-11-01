// Chrome's action popup belongs to its browser window; it is not a new active
// website tab. Keep sender/current/last-focused semantics inside this profile.
function installExtensionWindowContext(host,{windowForSender,ownerForPopup,createWindow,openPopup}){
 const {ctx,api}=host.adapter,handlers=ctx.router.handlers;
 // The pinned adapter mutates every cached tab on activation. Chrome keeps an
 // active tab in each window, including windows that are not focused.
 const activate=api.tabs.onActivated.bind(api.tabs);
 api.tabs.onActivated=id=>{
  activate(id);
  for(const [tabId,details] of ctx.store.tabDetailsCache){
   const tab=ctx.store.getTabById(tabId);
   if(tab)details.active=ctx.store.getActiveTabFromWebContents(tab)?.id===tabId;
  }
 };
 const current=event=>{
  const owner=ownerForPopup(event.sender);if(owner&&!owner.isDestroyed())return owner;
  const window=ctx.store.tabToWindow.get(event.sender)||windowForSender(event.sender);
  return window&&!window.isDestroyed()&&ctx.store.windows.has(window)?window:ctx.store.getLastFocusedWindow();
 };
 const query=handlers.get('tabs.query'),original=query.callback;
 query.callback=(event,info={})=>{
  const window=current(event),last=ctx.store.getLastFocusedWindow();
  const input={...info,...(info.windowId===-2&&window?{windowId:window.id}:{})};
  return original(event,input).filter(tab=>
   (typeof info.currentWindow!=='boolean'||(tab.windowId===window?.id)===info.currentWindow)&&
   (typeof info.lastFocusedWindow!=='boolean'||(tab.windowId===last?.id)===info.lastFocusedWindow));
 };
 const details=api.windows.createWindowDetails.bind(api.windows);
 api.windows.createWindowDetails=window=>{const value={...details(window),type:window.extensionWindowType||'normal'};ctx.store.windowDetailsCache.set(window.id,value);return value;};
 handlers.get('windows.getCurrent').callback=event=>{const window=current(event);return window?api.windows.getWindowDetails(window):{id:-1};};
 handlers.get('windows.create').callback=async(event,options={})=>{
  const window=await createWindow(options,event.extension,current(event));
  return api.windows.createWindowDetails(window);
 };
 handlers.get('windows.remove').callback=(event,id=-2)=>{
  const window=id===-2?current(event):ctx.store.getWindowById(id);
  if(window&&!window.isDestroyed())window.close();
 };
 const popup=handlers.get('browserAction.openPopup');
 if(popup)popup.callback=(event,options={})=>{
  const window=typeof options.windowId==='number'?ctx.store.getWindowById(options.windowId):current(event);
  if(window&&!window.isDestroyed())return openPopup(event.extension,window);
 };
}
module.exports={installExtensionWindowContext};
