// Live provider acceptance. Only an explicitly created canvas window is observed.
import {_electron} from 'playwright';
import {CodexProvider} from '../src/providers/codex.js';
import {Engine} from '../src/engine.js';
import {DesktopControl} from '../src/services/remote/desktop-control.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
if(!process.argv.includes('--run-live')){console.log('Use --run-live for an actual provider image-delivery check.');process.exit(0);}
const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-control-provider-')),token=randomBytes(4).toString('hex').toUpperCase();
const main=path.join(root,'main.cjs');
fs.writeFileSync(main,`const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(path.join(root,'browser'))});app.whenReady().then(()=>{app.setAccessibilitySupportEnabled(true);const w=new BrowserWindow({width:640,height:440,title:'Proteus Provider Image Rehearsal'});w.loadURL('data:text/html,'+encodeURIComponent(${JSON.stringify('<title>Proteus Provider Image Rehearsal</title><body style="background:#11221a;color:white;font:22px sans-serif;padding:30px"><h1>Disposable image delivery check</h1><canvas width="500" height="170" aria-label="Synthetic image challenge"></canvas><script>const c=document.querySelector("canvas").getContext("2d");c.fillStyle="#15335a";c.fillRect(0,0,500,170);c.font="bold 64px monospace";c.fillStyle="white";c.fillText('+JSON.stringify(token)+',55,105);</script>')}));});app.on('window-all-closed',()=>app.quit());`);
const control=new DesktopControl(),context={providerContext:()=>({instructionText:'This is an authorized disposable image-delivery check. Use only the single requested native observation; no shell, files or other windows.',customAgents:[],disabledLegacyMcp:[],disabledSkills:[],mcpServers:{}})};
const provider=new CodexProvider({}, {browser:{desktopControl:control},context}),engine=new Engine(path.join(root,'data'),{codex:provider});let app;
const handle=control.handle.bind(control);control.handle=async(...args)=>{const r=await handle(...args);if(args[0].tool==='get_window_state')fs.writeFileSync(path.join(root,'backend-image-receipt.json'),JSON.stringify({content:r.content?.map(b=>({type:b.type,mimeType:b.mimeType,bytes:b.data?.length})),isError:r.isError}));return r;};
const connect=provider.connect.bind(provider);provider.connect=async()=>{const client=await connect();if(!client.imageReceipt){client.imageReceipt=true;client.on('request',request=>fs.appendFileSync(path.join(root,'requests.jsonl'),JSON.stringify(request)+'\n'));const respond=client.respond.bind(client);client.respond=(id,r)=>{if(r.contentItems)fs.writeFileSync(path.join(root,'protocol-image-receipt.json'),JSON.stringify(r.contentItems.map(b=>({type:b.type,bytes:b.imageUrl?.length,text:b.text?.slice(0,100)}))));return respond(id,r);};}return client;};
try{
 app=await _electron.launch({args:[main,'--use-mock-keychain']});const page=await app.firstWindow();await page.locator('canvas').waitFor();const pid=app.process().pid;
 const listing=await control.handle({action:'call',tool:'list_windows',arguments:{pid}},'discovery');const payload=listing.structuredContent||JSON.parse(listing.content.find(block=>block.type==='text').text),windows=payload.windows||payload.data?.windows||payload.data||payload;
 const window=windows.find(row=>row.title==='Proteus Provider Image Rehearsal');assert.ok(window);await control.stop('discovery');
 const window_id=window.window_id??window.id,status=await provider.status();assert.ok(status.available,status.error);const model=status.models.find(row=>row.isDefault)||status.models[0];
 const schedule={schemaVersion:1,id:'image-delivery',name:'Disposable provider image delivery',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'codex',model:model.id,reasoningEffort:model.controls.reasoningEfforts.includes('low')?'low':'',workspace:{cwd:root,additionalDirectories:[]},context:{entries:[],includeDefaults:false},misfire:'skip',prompt:`Call proteus_desktop exactly once with action "call", tool "get_window_state", arguments ${JSON.stringify({pid,window_id,tree_format:'elements',max_elements:40,include_screenshot:true})}. Read the eight-character uppercase hexadecimal token drawn in the blue canvas from the returned screenshot and reply with only that token. It is absent from accessibility text. Do not use any other tool, shell, files, navigation or input.`};
 engine.permissions.setMode(schedule,'trusted',engine.permissions.get().revision);const run=engine.createRun(schedule);const deadline=Date.now()+150000;
 while(['running','queued','awaiting_input'].includes(run.status)){
  if(run.pending){const d=run.pending.details;assert.equal(run.pending.type,'permission');assert.equal(d.toolName,'proteus_desktop');assert.equal(d.args.tool,'get_window_state');assert.equal(d.args.arguments.pid,pid);assert.equal(d.args.arguments.window_id,window_id);engine.reply(run.id,'approve',run.pending.id);}
  if(Date.now()>deadline)throw Error('Live provider image acceptance timed out.');await new Promise(resolve=>setTimeout(resolve,250));
 }
 fs.writeFileSync(path.join(root,'result.json'),JSON.stringify({status:run.status,events:run.events,usage:run.usage}));
 assert.equal(run.status,'completed',JSON.stringify(run.events.filter(event=>event.role==='system')));assert.ok(run.events.some(event=>event.role==='assistant'&&event.text.includes(token)),'actual provider must read the image-only canvas token');
 assert.ok(run.events.some(event=>event.data?.tool?.name==='proteus_desktop'&&event.data.tool.status==='completed'));
 console.log(JSON.stringify({passed:true,provider:'codex',model:model.id,usage:run.usage,checks:['actual Cua exact-window pixels','Proteus MCP image transport','real provider reads image-only canvas token'],artifacts:root}));
}catch(error){console.error(error.stack,'ARTIFACTS',root);throw error;}finally{await engine.close();await control.close();if(app){await Promise.race([app.close().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,3000))]);try{app.process().kill('SIGTERM');}catch{}}}
