const {BrowserWindow,ipcMain}=require('electron');
const path=require('node:path');

// A small child window stays above native browser views without hiding them or
// intercepting clicks elsewhere in the application. Only the app can create it.
class NoticeWindow {
 constructor(parent,{onAction,offsetY=16}={}){
  this.parent=parent;this.current=null;this.height=90;
  this.window=new BrowserWindow({parent,show:false,frame:false,transparent:true,hasShadow:false,resizable:false,minimizable:false,maximizable:false,fullscreenable:false,skipTaskbar:true,width:720,height:90,webPreferences:{preload:path.join(__dirname,'notice-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
  this.window.webContents.setWindowOpenHandler(()=>({action:'deny'}));this.window.webContents.on('will-navigate',event=>event.preventDefault());
  this.ready=this.window.loadFile(path.join(__dirname,'notice.html'));
  this.move=()=>{if(this.window.isDestroyed())return;const bounds=parent.getContentBounds(),width=Math.min(720,bounds.width-32);this.window.setBounds({x:Math.round(bounds.x+(bounds.width-width)/2),y:bounds.y+(typeof offsetY==='function'?offsetY():offsetY),width,height:this.height});};
  parent.on('move',this.move);parent.on('resize',this.move);parent.on('hide',()=>this.window.hide());parent.on('minimize',()=>this.window.hide());parent.on('show',()=>{if(this.current)this.window.showInactive();});
  this.action=(event,value)=>{if(event.sender!==this.window.webContents||event.senderFrame!==event.sender.mainFrame||value?.id!==this.current?.id)return;if(value.action==='height'){if(Number.isFinite(value.height)){this.height=Math.max(64,Math.min(320,Math.ceil(value.height)));this.move();}return;}if(value.action==='dismiss'||Number.isInteger(value.action)&&value.action>=0&&value.action<this.current.actions.length){if(onAction)onAction(value);else parent.webContents.send('proteus:notice-action',value);}};
  ipcMain.on('proteus:notice-action',this.action);
  parent.webContents.on('did-start-navigation',details=>{if(details.isMainFrame&&!details.isSameDocument){this.current=null;this.window.hide();}});
  parent.on('closed',()=>{ipcMain.removeListener('proteus:notice-action',this.action);});
 }
 async show(value){
  if(value?.action==='dismiss'){if(this.current?.id===value.id){this.current=null;this.window.hide();}return;}
  if(typeof value?.id!=='string'||value.id.length>64||typeof value.message!=='string'||value.message.length>10000||!Array.isArray(value.actions)||value.actions.length>6||value.actions.some(label=>typeof label!=='string'||label.length>100))throw new Error('Invalid notification.');
  this.current={id:value.id,message:value.message,actions:value.actions};await this.ready;if(this.current?.id!==value.id)return;
  this.move();this.window.webContents.send('proteus:notice',this.current);if(this.parent.isVisible()&&!this.parent.isMinimized())this.window.showInactive();
 }
}
module.exports={NoticeWindow};
