#!/usr/bin/env node
import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..'),home=process.env.PROTEUS_PREVIEW_HOME||path.join(os.homedir(),'Library/Application Support/Proteus Design Preview');
const connection=path.join(home,'app-data','connection.json'),retainedSession=fs.existsSync(path.join(home,'app-data','desktop-workspace.json'));
if(fs.existsSync(connection)){const {pid}=JSON.parse(fs.readFileSync(connection,'utf8'));try{process.kill(pid,0);throw Error('This demo is already running. Close its window before restarting the demo.');}catch(error){if(error.code!=='ESRCH')throw error;}}
// The normal preview runtime validates its marker and isolates host/profile/
// credentials. No production session, Life credential or pairing is imported.
const app=await electron.launch({args:['.'],cwd:root,env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_DESIGN_DEMO:'1',PROTEUS_PREVIEW_HOME:home,PROTEUS_PREVIEW_AUTH:'none',PORT:'0'},timeout:120000});
const page=await app.firstWindow().catch(async error=>{await app.close();throw error;});page.setDefaultTimeout(20000);
await page.locator('[data-page=scratchpad]').waitFor();
await page.reload();await page.locator('[data-page=scratchpad]').waitFor();
const seeded=await app.evaluate(async({app})=>{
 const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
 if(!service.desktopPreview)throw Error('Isolated preview service required.');
 const config=service.context.config(),folder=config.workspaces[0].cwd;
 const status=service.scratchpad.settings();if(!status.configured){await service.scratchpad.configure({folder,expectedRevision:status.revision});await service.scratchpad.handle({action:'create',title:'Welcome to Scratchpad',body:'# A place to think\n\nThis is synthetic demo content. Try **formatting**, lists and project associations.\n\n- Capture an idea\n- Keep a useful snippet\n- Open a browser beside this note',format:'markdown',category:'Ideas',operationId:process.mainModule.require('node:crypto').randomUUID()});}
 return {configured:true};
}).catch(error=>({configured:false,error:error.message}));
if(!retainedSession)await page.locator('[data-page=reminders]').click();
console.log(JSON.stringify({ready:true,synthetic:true,home,scratchpad:seeded,watching:true}));
// Renderer edits are immediately reviewable without replacing the installed
// application. Host/desktop code uses an explicit demo restart, preserving data.
let timer,stopping=false;const watcher=fs.watch(path.join(root,'public'),{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(()=>void page.evaluate(()=>{
 if(!document.querySelector('.scratchpad-editor,[data-reminder-form],[data-list-form]'))return true;
 if(!document.querySelector('#demo-reload-ready')){const banner=document.createElement('aside');banner.id='demo-reload-ready';banner.className='banner';banner.style.position='fixed';banner.style.bottom='12px';banner.style.right='12px';banner.style.zIndex='9999';banner.append(document.createTextNode('Design changes ready. Your editor stays open. '));const button=document.createElement('button');button.textContent='Reload demo';button.onclick=()=>location.reload();banner.append(button);document.body.append(banner);}return false;
 }).then(reload=>reload?page.reload():undefined).catch(()=>{}),500);});
const stop=async()=>{if(stopping)return;stopping=true;watcher.close();clearTimeout(timer);await app.context().request.dispose();await app.close();};process.once('SIGTERM',stop);process.once('SIGINT',stop);
await new Promise(resolve=>app.once('close',resolve));watcher.close();
