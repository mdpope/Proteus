// Isolated desktop fixture; no real provider or external tools.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
let service, closing=false;
app.whenReady().then(async()=>{
  const { startServer }=await import('../src/server.js');
  service=await startServer({home:process.env.PROTEUS_HOME,port:0,timers:true,withSeed:false,providers:{copilot:{run:async({ask,emit})=>{
    for(const name of ['first.md','second.md'])await ask({type:'permission',question:'Synthetic file change',details:{kind:'write',fileName:path.join(process.env.PROTEUS_HOME,name),diff:'+ fixture only'}});
    for(let i=0;i<2;i++)await ask({type:'permission',question:'Synthetic command',details:{kind:'shell',fullCommandText:'node fixture.js'}});
    const answer=await ask({type:'question',question:'Which fixture result should be kept?'});emit('assistant',`Rehearsal: ${answer}`);
  }}}});
  service.engine.schedules.save({schemaVersion:1,id:'permissions-fixture',name:'Permission UI fixture',enabled:false,cron:'0 9 * * 1-5',timezone:'UTC',provider:'copilot',model:'fixture',workspace:{cwd:process.env.PROTEUS_HOME,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic permission UI test. No actual tools execute.'});
  const window=new BrowserWindow({width:1440,height:1000,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  await window.loadURL(service.url);
});
app.on('before-quit',event=>{if(closing||!service)return;event.preventDefault();closing=true;service.close().finally(()=>app.quit());});
