const {BrowserWindow,ipcMain,screen,app}=require('electron');
const path=require('node:path');
const panels=new WeakMap();
async function openDownloads({parent,manager,owner,x,y,colors={}}){
 if(panels.has(parent)){panels.get(parent).close();return;}
 colors=Object.fromEntries(Object.entries(colors).filter(([key,value])=>['background','text','muted','border','hover','accent','track'].includes(key)&&typeof value==='string'&&/^(?:#[a-f\d]{3,8}|rgba?\([\d.,% /]+\))$/i.test(value)));
 const area=screen.getDisplayMatching(parent.getBounds()).workArea,bounds=parent.getContentBounds(),width=Math.min(480,area.width-16),height=Math.min(510,area.height-20);
 const popup=new BrowserWindow({parent,title:'Downloads',show:false,frame:false,resizable:false,minimizable:false,maximizable:false,fullscreenable:false,skipTaskbar:true,width,height,x:Math.round(Math.max(area.x+8,Math.min(area.x+area.width-width-8,bounds.x+(Number(x)||0)-width))),y:Math.round(Math.max(area.y+8,Math.min(area.y+area.height-height-8,bounds.y+(Number(y)||0)))),backgroundColor:colors.background||'#223129',webPreferences:{preload:path.join(__dirname,'browser-download-panel-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'proteus-download-panel'}});
 panels.set(parent,popup);let closed=false,ready=false,unsubscribe;const icons=new Map(),channel='proteus:downloads-panel';
 const valid=()=>!closed&&!parent.isDestroyed()&&!popup.isDestroyed();
 const inOwner=fn=>manager.browser.windowRegistry?manager.browser.windowRegistry.run(owner,fn):fn();
 const update=()=>{if(!valid()||!ready)return;const state=manager.list({},owner);const count=Math.min(state.items.length,6),nextHeight=Math.min(510,Math.max(116,64+count*76),area.height-20);popup.setSize(width,nextHeight);popup.setPosition(popup.getBounds().x,Math.max(area.y+8,Math.min(popup.getBounds().y,area.y+area.height-nextHeight-8)));popup.webContents.send(channel,{state,colors,icons:Object.fromEntries(icons)});for(const row of state.items){if(icons.has(row.id)||row.state!=='completed')continue;icons.set(row.id,null);void app.getFileIcon(row.file,{size:'small'}).then(icon=>{if(valid()&&!icon.isEmpty()){icons.set(row.id,icon.toDataURL());update();}}).catch(()=>{});}};
 return new Promise((resolve,reject)=>{
  const cleanup=()=>{if(closed)return;closed=true;unsubscribe?.();ipcMain.removeListener(channel,receive);parent.removeListener('closed',parentClosed);panels.delete(parent);if(!popup.isDestroyed())popup.destroy();resolve();};
  const receive=async(event,value)=>{if(event.sender!==popup.webContents||event.senderFrame!==popup.webContents.mainFrame||!valid())return;if(value?.action==='close'){cleanup();return;}if(!['open','show','pause','resume','retry','cancel','folder'].includes(value?.action))return;try{await inOwner(()=>manager.command({action:'downloads-'+value.action,downloadId:value.id}));update();}catch(error){if(valid())popup.webContents.send(channel,{error:error.message});}};
  function parentClosed(){cleanup();}
  ipcMain.on(channel,receive);parent.once('closed',parentClosed);popup.once('closed',cleanup);popup.on('blur',cleanup);
  unsubscribe=manager.subscribe(owner,update);popup.webContents.setWindowOpenHandler(()=>({action:'deny'}));popup.webContents.on('will-navigate',event=>event.preventDefault());popup.webContents.on('will-attach-webview',event=>event.preventDefault());popup.webContents.on('context-menu',event=>event.preventDefault());
  popup.webContents.once('did-finish-load',()=>{if(!valid())return;ready=true;update();popup.show();});
  popup.loadFile(path.join(__dirname,'browser-download-panel.html')).catch(error=>{cleanup();reject(error);});
 });
}
module.exports={openDownloads};
