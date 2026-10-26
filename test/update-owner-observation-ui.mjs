// Opt-in actual Electron owner observation; no user profile or protected store.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import electron from 'electron';
import {observeUpdateOwner} from './update-owner-observation.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-owner-observation-'));
const home=path.join(root,'data'),browserHome=path.join(root,'browser'),log=path.join(root,'launch.log'),ready=path.join(root,'ready.json');
for(const name of ['data','browser','user-home'])fs.mkdirSync(path.join(root,name));
const desktop={XDG_CURRENT_DESKTOP:'KDE',XDG_SESSION_DESKTOP:'KDE',DESKTOP_SESSION:'plasma',KDE_FULL_SESSION:'true',KDE_SESSION_VERSION:'6',XDG_SESSION_TYPE:'x11'};
const script=path.join(root,'main.cjs');
fs.writeFileSync(script,'const {app}=require("electron");app.setPath("userData",'+JSON.stringify(browserHome)+');app.whenReady().then(()=>{require("node:fs").writeFileSync('+JSON.stringify(ready)+',JSON.stringify({pid:process.pid}));});');
const fd=fs.openSync(log,'a',0o600),env=Object.fromEntries(['PATH','DISPLAY','WAYLAND_DISPLAY','XAUTHORITY','XDG_RUNTIME_DIR','DBUS_SESSION_BUS_ADDRESS','TMPDIR','TMP','TEMP','SystemRoot'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]));
Object.assign(env,desktop,{HOME:path.join(root,'user-home'),PROTEUS_HOME:home});
const child=spawn(electron,['--inspect=127.0.0.1:0',process.platform==='darwin'?'--use-mock-keychain':'--password-store=basic',script,browserHome,ready],{env,stdio:['ignore',fd,fd]});fs.closeSync(fd);
let exited=false,passed=false;const exit=new Promise(resolve=>child.once('exit',()=>{exited=true;resolve();}));
try{
 const deadline=Date.now()+30000;
 while(!fs.existsSync(ready)){
  assert.equal(exited,false,'Disposable Electron must remain alive');
  assert.ok(Date.now()<deadline,'Disposable Electron must become ready');
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 const pid=JSON.parse(fs.readFileSync(ready)).pid,options={pid,home,browserHome,executable:electron,log,keys:Object.keys(desktop)};
 await assert.rejects(observeUpdateOwner({...options,pid:pid+1}),/exact relaunched disposable owner/,'Wrong owner is rejected before observing context');
 const observation=await observeUpdateOwner(options);assert.deepEqual(observation.desktop,desktop);
 assert.equal(observation.identity.pid,child.pid);
 console.log('PASS actual Electron owner identity and exact six-value context; wrong PID rejected');
 passed=true;
}catch(error){
 fs.writeFileSync(path.join(root,'failure.json'),JSON.stringify({error:error.message,stack:error.stack}));throw error;
}finally{
 if(!exited)child.kill('SIGTERM');
 let timer;await Promise.race([exit,new Promise(resolve=>timer=setTimeout(resolve,5000))]);clearTimeout(timer);
 if(!exited){child.kill('SIGKILL');await exit;}
 if(passed)fs.rmSync(root,{recursive:true,force:true});else console.error('Observation probe failure retained at',root);
}
