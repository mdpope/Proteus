const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {AsyncLocalStorage}=require('node:async_hooks');
const validId=id=>id==='main'||/^[a-f0-9-]{36}$/i.test(id||'');
function windowBounds(value,areas){
 const fallback={width:1440,height:960};
 if(!value||!['x','y','width','height'].every(key=>Number.isFinite(value[key]))||Math.abs(value.x)>100000||Math.abs(value.y)>100000||value.width<100||value.height<100)return fallback;
 const area=areas.find(area=>value.x+80<area.x+area.width&&value.x+value.width-80>area.x&&value.y+60<area.y+area.height&&value.y+value.height-60>area.y)||areas[0];
 if(!area)return fallback;
 const width=Math.min(Math.max(850,value.width),area.width),height=Math.min(Math.max(650,value.height),area.height);
 return {x:Math.round(Math.max(area.x,Math.min(value.x,area.x+area.width-width))),y:Math.round(Math.max(area.y,Math.min(value.y,area.y+area.height-height))),width:Math.round(width),height:Math.round(height)};
}
class WindowRegistry{
 constructor(home,{ipcMain,screen}={}){this.home=home;this.file=path.join(home,'desktop-windows.json');this.ipcMain=ipcMain;this.screen=screen;this.scope=new AsyncLocalStorage();this.contexts=new Map();this.handlers=new Set();this.closed=false;this.document=this.read();}
 read(){try{const stat=fs.statSync(this.file);if(stat.size>128*1024)throw Error();const data=JSON.parse(fs.readFileSync(this.file,'utf8'));if(data.schemaVersion!==1||!Array.isArray(data.windows)||data.windows.length>16||data.windows.some(row=>!validId(row.id))||new Set(data.windows.map(row=>row.id)).size!==data.windows.length)throw Error();return data;}catch(error){if(error.code==='ENOENT')return {schemaVersion:1,windows:[{id:'main'}]};throw Error('Saved windows could not be read. The original record was preserved.');}}
 save(){fs.mkdirSync(this.home,{recursive:true,mode:0o700});const temporary=this.file+'.tmp';fs.writeFileSync(temporary,JSON.stringify(this.document)+'\n',{mode:0o600});atomicRename(temporary,this.file);}
 records(){return this.document.windows.length?this.document.windows.map(row=>({...row})):[{id:randomUUID()}];}
 current(){const id=this.scope.getStore();if(id!==undefined)return this.contexts.get(id);return [...this.contexts.values()].find(ctx=>ctx.window.isFocused?.())||this.contexts.get(this.focused)||this.contexts.values().next().value;}
 run(id,action){if(!this.contexts.has(id))throw Error('This app window is closed.');return this.scope.run(id,action);}
 bind(id,action){return (...args)=>{if(this.contexts.has(id))return this.run(id,()=>action(...args));};}
 attach(window,id=randomUUID()){
  if(!validId(id)||this.contexts.has(id)||this.contexts.size>=16)throw Error('Choose a unique app window (maximum 16).');
  const context={id,window};this.contexts.set(id,context);if(!this.document.windows.some(row=>row.id===id))this.document.windows.push({id});
  let timer;const remember=()=>{clearTimeout(timer);timer=setTimeout(()=>this.remember(id),200);timer.unref?.();};
  window.on('move',remember);window.on('resize',remember);window.on('focus',()=>{this.focused=id;});
  window.on('closed',()=>{clearTimeout(timer);if(!this.closed)this.forget(id);this.contexts.delete(id);});
  this.save();return context;
 }
 bounds(record){return windowBounds(record.bounds,this.screen?.getAllDisplays().map(display=>display.workArea)||[]);}
 remember(id){const context=this.contexts.get(id),row=this.document.windows.find(row=>row.id===id);if(!context||!row||context.window.isDestroyed())return;row.bounds=context.window.getNormalBounds?.()||context.window.getBounds();row.maximized=context.window.isMaximized?.()===true;this.save();}
 forget(id){this.document.windows=this.document.windows.filter(row=>row.id!==id);this.save();}
 prepareQuit(){for(const id of this.contexts.keys())this.remember(id);this.closed=true;}
 handle(channel,handler){
  if(this.handlers.has(channel))throw Error('Window IPC already registered: '+channel);this.handlers.add(channel);
  this.ipcMain.handle(channel,(event,...args)=>{
   const context=[...this.contexts.values()].find(ctx=>ctx.window.webContents===event.sender);
   if(!context||event.senderFrame!==event.sender.mainFrame)throw Error('This action requires an app window.');
   return this.run(context.id,()=>handler(event,...args));
  });
 }
 broadcast(channel,value){for(const ctx of this.contexts.values())if(!ctx.window.isDestroyed())ctx.window.webContents.send(channel,value);}
 proxy(member='window'){return new Proxy(Object.create(null),{get:(_target,key)=>{const target=this.current()?.[member];const value=target?.[key];return typeof value==='function'?value.bind(target):value;},set:(_target,key,value)=>{const target=this.current()?.[member];if(!target)throw Error('This app window is closed.');target[key]=value;return true;}});}
}
module.exports={WindowRegistry,windowBounds,validId};
