const {BrowserWindow,ipcMain,screen}=require('electron');
const path=require('node:path');
/** One keyboard-first, sandboxed picker per incoming-link queue. No page privileges. */
class LinkPicker{
  async choose({url,targets,warning,colors,safariSelector=false}){
    if(this.pending)throw Error('A link picker is already open.');
    const display=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()),area=display.workArea;
    const width=Math.min(867,area.width-32),groups=new Set(targets.map(t=>[t.hostId,t.workspaceId].join(':'))).size;
    const height=Math.min(area.height-48,Math.max(260,176+Math.min(792,targets.length*60+groups*30+8)));
    const panel=this.window=new BrowserWindow({show:false,width,height,x:Math.round(area.x+(area.width-width)/2),y:Math.round(area.y+(area.height-height)/2+area.height*.06),frame:false,transparent:true,hasShadow:true,resizable:false,alwaysOnTop:true,minimizable:false,maximizable:false,fullscreenable:false,skipTaskbar:true,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'picker-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
    panel.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
    panel.webContents.setWindowOpenHandler(()=>({action:'deny'}));panel.webContents.on('will-navigate',event=>event.preventDefault());
    const result=new Promise(resolve=>{this.pending=resolve;});
    const finish=value=>{const resolve=this.pending;if(!resolve)return;this.pending=null;ipcMain.removeListener('proteus:link-picker-choice',listener);if(!panel.isDestroyed())panel.destroy();this.window=null;resolve(value);};
    const listener=(event,value)=>{
      if(event.sender!==panel.webContents||event.senderFrame!==event.sender.mainFrame)return;
      if(value?.cancel===true){finish(null);return;}
      if(safariSelector&&value?.external==='safariselector'){finish({external:'safariselector'});return;}
      const target=targets.find(target=>target.key===value?.key);if(target)finish({target,newWindow:value.newWindow===true});
    };
    ipcMain.on('proteus:link-picker-choice',listener);panel.on('closed',()=>finish(null));panel.on('blur',()=>finish(null));
    try{await panel.loadFile(path.join(__dirname,'picker.html'));if(this.pending){panel.webContents.send('proteus:link-picker',{url,targets,warning,colors,safariSelector});panel.show();panel.focus();}}catch(error){finish(null);throw error;}
    return result;
  }
  close(){this.window?.close();}
}
module.exports={LinkPicker};
