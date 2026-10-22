const {BrowserWindow,ipcMain,screen}=require('electron');
const path=require('node:path');

// A separate, sandboxed surface keeps the menu above the native website view.
// Its IPC can choose only the captured menu entries or adjust this page's scale.
async function openBrowserPageMenu({parent,items,x,y,scale,adjustScale,valid=()=>true,colors={},align='right',title='Browser page menu'}){
 colors=Object.fromEntries(Object.entries(colors&&typeof colors==='object'?colors:{}).filter(([key,value])=>['background','text','border','hover','accent'].includes(key)&&typeof value==='string'&&/^(?:#[a-f\d]{3,8}|rgba?\([\d.,% /]+\))$/i.test(value)));
 const width=284,area=screen.getDisplayMatching(parent.getBounds()).workArea,bounds=parent.getContentBounds();
 const height=Math.min((Number.isFinite(scale)?76:18)+items.length*32,Math.max(180,area.height-24));
 const popup=new BrowserWindow({parent,title,show:false,frame:false,resizable:false,minimizable:false,maximizable:false,fullscreenable:false,skipTaskbar:true,autoHideMenuBar:true,width,height,
  x:Math.round(Math.max(area.x+4,Math.min(area.x+area.width-width-4,bounds.x+(Number(x)||0)-(align==='right'?width:0)))),y:Math.round(Math.max(area.y+4,Math.min(area.y+area.height-height-4,bounds.y+(Number(y)||0)))),backgroundColor:colors.background||'#223129',
  webPreferences:{preload:path.join(__dirname,'browser-page-menu-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'proteus-page-menu'}});
 let settled=false;const channel='proteus:browser-page-menu';
 return new Promise((resolve,reject)=>{
  const finish=(choice,error)=>{if(settled)return;settled=true;ipcMain.removeListener(channel,receive);parent.removeListener('closed',parentClosed);if(!popup.isDestroyed())popup.destroy();if(error)reject(error);else resolve(choice);};
  const receive=(event,value)=>{
   if(event.sender!==popup.webContents||event.senderFrame!==popup.webContents.mainFrame)return;
   if(!valid()){finish(null);return;}
   if(value?.action==='close'){finish(null);return;}
   if(value?.action==='choose'){if(items.some(item=>item.id===value.id&&item.enabled!==false))finish(value.id);return;}
   if(value?.action==='scale'&&adjustScale&&['decrease','reset','increase'].includes(value.direction)){
    try{const percent=adjustScale(value.direction);popup.webContents.send(channel,{action:'scale',percent});}
    catch{finish(null);}
   }
  };
  function parentClosed(){finish(null);}
  ipcMain.on(channel,receive);popup.once('closed',()=>finish(null));popup.on('blur',()=>finish(null));parent.once('closed',parentClosed);
  popup.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  popup.webContents.on('will-navigate',event=>event.preventDefault());
  popup.webContents.on('will-attach-webview',event=>event.preventDefault());
  popup.webContents.on('context-menu',event=>event.preventDefault());
  popup.webContents.once('did-finish-load',()=>{if(settled)return;popup.webContents.send(channel,{action:'init',items,percent:scale,colors});popup.show();});
  popup.loadFile(path.join(__dirname,'browser-page-menu.html')).catch(error=>finish(null,error));
 });
}
module.exports={openBrowserPageMenu};
