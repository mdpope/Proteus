const {BrowserWindow,ipcMain,screen}=require('electron');
const path=require('node:path');
const {randomUUID}=require('node:crypto');

function chooseScreenSource(parent,origin,sources,palette={}){
 const workArea=screen.getDisplayMatching(parent.getBounds()).workAreaSize;
 const panel=new BrowserWindow({parent,modal:true,show:false,width:Math.min(700,workArea.width),height:Math.min(610,workArea.height),title:'Share screen or window',
  minimizable:false,maximizable:false,fullscreenable:false,
  webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,preload:path.join(__dirname,'screen-source-preload.cjs')}});
 const events='proteus:screen-share-choice';
 const token=randomUUID();
 panel.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 panel.webContents.on('will-navigate',event=>event.preventDefault());
 return new Promise(resolve=>{
  const finish=source=>{
   ipcMain.removeListener(events,select);
   panel.removeListener('closed',cancel);
   parent.removeListener('closed',cancel);
   if(!panel.isDestroyed())panel.destroy();
   resolve(source);
  };
  const cancel=()=>finish(null);
  const select=(event,value)=>{
   if(event.sender!==panel.webContents||event.senderFrame!==panel.webContents.mainFrame||value?.token!==token)return;
   if(value.index===null)return cancel();
   if(Number.isInteger(value.index)&&sources[value.index])finish(sources[value.index]);
  };
  ipcMain.on(events,select);
  panel.once('closed',cancel);parent.once('closed',cancel);
  void panel.loadFile(path.join(__dirname,'screen-source-picker.html')).then(()=>{
   if(panel.isDestroyed())return;
   panel.webContents.send('proteus:screen-share-sources',{token,origin,palette,
    items:sources.map(({id,name,thumbnail})=>{
     const item={name:name.slice(0,180),display:id.startsWith('screen:')};
     if(!thumbnail||thumbnail.isEmpty())return item;
     const {width,height}=thumbnail.getSize();
     return {...item,preview:'data:image/jpeg;base64,'+thumbnail.toJPEG(75).toString('base64'),aspect:width/height};
    })});
   panel.show();
  }).catch(cancel);
 });
}
module.exports={chooseScreenSource};
