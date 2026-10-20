const {app,BrowserWindow}=require('electron');let service,closing=false;
app.whenReady().then(async()=>{
 const {startServer}=await import('../src/server.js');service=await startServer({home:process.env.PROTEUS_HOME,port:0,timers:false,withSeed:false,providers:{copilot:{run:async({ask,emit})=>{
   await ask({type:'permission',question:'Synthetic pending command',details:{kind:'shell',fullCommandText:'synthetic command'}});
   await ask({type:'permission',question:'Mandatory synthetic approval',details:{kind:'shell',fullCommandText:'synthetic managed command',managedApprovalRequired:true}});
   emit('assistant','Approval fixture finished');
 }}}});
 service.engine.createRun({schemaVersion:1,id:'pending-approval',name:'Pending approval fixture',chatTitleManual:true,enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'copilot',model:'fixture',workspace:{cwd:process.env.PROTEUS_HOME,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic approval fixture'},'chat');
 const window=new BrowserWindow({width:1100,height:900,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});await window.loadURL(service.url);
});
app.on('before-quit',event=>{if(closing||!service)return;event.preventDefault();closing=true;service.close().finally(()=>app.quit());});
