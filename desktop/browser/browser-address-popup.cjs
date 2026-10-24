const {BrowserWindow,ipcMain,screen}=require('electron');
const path=require('node:path');
const popups=new WeakMap();
function updateAddressPopup(parent,value,{valid,choose}){
 let state=popups.get(parent);
 if(value.visible===false){if(state?.token===value.token)state.close();return;}
 if(typeof value.token!=='string'||value.token.length>100||!Array.isArray(value.items)||value.items.length>30)throw Error('Invalid address suggestions.');
 const items=value.items.map(item=>({title:String(item.title||'').slice(0,1000),url:String(item.url||'').slice(0,8192),detail:String(item.detail||'').slice(0,300)}));
 for(const item of items){const url=new URL(item.url);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid suggested address.');}
 if(state&&state.token!==value.token)state.close();
 state=popups.get(parent);
 if(!state){
  // This auxiliary child must never acquire its own macOS fullscreen Space.
  const popup=new BrowserWindow({parent,title:'Address suggestions',show:false,focusable:false,frame:false,resizable:false,minimizable:false,maximizable:false,fullscreenable:false,skipTaskbar:true,backgroundColor:'#223129',webPreferences:{preload:path.join(__dirname,'browser-address-popup-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,partition:'proteus-address-popup'}});
  state={token:value.token,popup,ready:false,valid,choose};popups.set(parent,state);
  const dismissEvents=['blur','closed','move','resize','enter-full-screen','leave-full-screen'];
  state.close=()=>{if(popups.get(parent)===state)popups.delete(parent);ipcMain.removeListener('proteus:address-choice',receive);for(const event of dismissEvents)parent.removeListener(event,state.close);if(!popup.isDestroyed())popup.destroy();};
  const receive=(event,index)=>{if(event.sender!==popup.webContents||event.senderFrame!==popup.webContents.mainFrame)return;const item=state.items[index];if(!item||!state.valid()){state.close();return;}state.close();state.choose(item.url);};
  ipcMain.on('proteus:address-choice',receive);popup.once('closed',state.close);for(const event of dismissEvents)parent.on(event,state.close);
  popup.webContents.setWindowOpenHandler(()=>({action:'deny'}));popup.webContents.on('will-navigate',event=>event.preventDefault());
  popup.webContents.once('did-finish-load',()=>{if(popup.isDestroyed())return;state.ready=true;state.send();});
  state.send=()=>{if(!state.ready)return;if(!state.valid()){state.close();return;}popup.webContents.send('proteus:address-update',{items:state.items,selected:state.selected,colors:state.colors});popup.showInactive();};
  popup.loadFile(path.join(__dirname,'browser-address-popup.html')).catch(()=>state.close());
 }
 state.items=items;state.selected=Number.isInteger(value.selected)?value.selected:-1;
 state.colors=Object.fromEntries(Object.entries(value.colors||{}).filter(([key,color])=>['background','text','border','hover','accent'].includes(key)&&typeof color==='string'&&/^(?:#[a-f\d]{3,8}|rgba?\([\d.,% /]+\))$/i.test(color)));
 const area=screen.getDisplayMatching(parent.getBounds()).workArea,bounds=parent.getContentBounds(),width=Math.max(180,Math.min(Number(value.width)||600,area.width-16)),height=Math.min(360,Math.max(40,items.length*67),area.height-24);
 state.popup.setBounds({x:Math.round(Math.max(area.x+4,Math.min(bounds.x+(Number(value.x)||0),area.x+area.width-width-4))),y:Math.round(Math.max(area.y+4,Math.min(bounds.y+(Number(value.y)||0),area.y+area.height-height-4))),width:Math.round(width),height:Math.round(height)});state.send();
}
module.exports={updateAddressPopup};
