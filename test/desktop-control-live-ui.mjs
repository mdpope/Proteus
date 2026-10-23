// Opt-in live desktop acceptance: install/grant the backends first. Only a disposable window is controlled.
import {_electron} from 'playwright';
import {DesktopControl,desktopTools} from '../src/services/remote/desktop-control.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-control-rehearsal-'));
const main=path.join(root,'main.cjs');
const html=`<title>Proteus Control Rehearsal</title><style>body{font:24px sans-serif;padding:40px;background:#13251b;color:white}button,input{font:24px sans-serif;padding:14px}</style><h1>Disposable control rehearsal</h1><button onclick="this.dataset.count=String(Number(this.dataset.count||0)+1);this.textContent=this.dataset.count==='1'?'Confirmed once':'Confirmed twice'">Verify control</button><p><input aria-label="Rehearsal text" /></p>`;
fs.writeFileSync(main,`const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(path.join(root,'profile'))});app.whenReady().then(()=>{app.setName('Proteus Control Rehearsal');app.setAccessibilitySupportEnabled(true);const w=new BrowserWindow({width:640,height:440,title:'Proteus Control Rehearsal'});w.loadURL('data:text/html,'+encodeURIComponent(${JSON.stringify(html)}));});app.on('window-all-closed',()=>app.quit());`);
const broker=new DesktopControl();let app;
const textResult=r=>(r.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
try{
 app=await _electron.launch({args:[main,'--use-mock-keychain'],timeout:20000});const page=await app.firstWindow({timeout:20000});await page.getByText('Disposable control rehearsal').waitFor();
 const pid=app.process().pid;
 const listed=await broker.handle({action:'call',tool:'list_windows',arguments:{pid}},'synthetic-control');fs.writeFileSync(path.join(root,'windows.json'),JSON.stringify(listed));
 const parsed=listed.structuredContent||JSON.parse(textResult(listed));const rows=parsed.windows||parsed.data?.windows||parsed.data||parsed;
 const window=(Array.isArray(rows)?rows:[]).find(w=>w.title==='Proteus Control Rehearsal');assert.ok(window,'synthetic window discovered');
 const window_id=window.window_id??window.id;
 const args={pid,window_id,tree_format:'elements',max_elements:70};
 let observed=await broker.handle({action:'call',tool:'get_window_state',arguments:args},'synthetic-control');
 const save=(r,name)=>fs.writeFileSync(path.join(root,name),JSON.stringify({...r,content:r.content?.map(b=>b.type==='image'?{...b,data:'[omitted]'}:b)}));save(observed,'observation.json');
 assert.ok(!observed.isError,textResult(observed));const image=observed.content.find(b=>b.type==='image');assert.ok(image,'actual screenshot embedded');fs.writeFileSync(path.join(root,'observed.png'),Buffer.from(image.data,'base64'));
 const payload=observed.structuredContent||{};const elements=payload.elements||[]; 
 const metadata=JSON.parse(observed.content[0].text);const button=elements.find(e=>e.label==='Verify control');assert.ok(button,'button exposed');
 const clicked=await broker.handle({action:'call',tool:'click',arguments:{pid,window_id,element_token:button.element_token},observationId:metadata.observationId},'synthetic-control');save(clicked,'click.json');assert.ok(!clicked.isError,textResult(clicked));
 await page.getByRole('button',{name:'Confirmed once'}).waitFor();
 observed=await broker.handle({action:'call',tool:'get_window_state',arguments:{...args,since:'latest'}},'synthetic-control');save(observed,'diff-result.json');if(observed.isError){console.log('DIFF OBSERVATION FAILED',textResult(observed));observed=await broker.handle({action:'call',tool:'get_window_state',arguments:args},'synthetic-control');}save(observed,'verified.json');assert.match(JSON.stringify(observed.structuredContent||{})+textResult(observed),/Confirmed once/);
 const cursor=await broker.handle({action:'call',tool:'get_agent_cursor_state',arguments:{}},'synthetic-control');save(cursor,'cursor.json');console.log('Cua session cursor enabled:',cursor.structuredContent?.enabled===true);
 const bridge=await desktopTools(broker,'synthetic-control')[0].handler({action:'call',tool:'get_window_state',arguments:args});assert.ok(bridge.binaryResultsForLlm?.some(b=>b.type==='image'||b.mimeType?.startsWith('image/')||b.data),'provider adapter retains actual image');
 const fallback=await broker.handle({action:'call',backend:'peekaboo',reason:'Cua structured diff observation returned typed_output_mismatch; test a fresh same-window fallback',tool:'see',arguments:{pid,window_id,max_elements:70}},'synthetic-control');save(fallback,'peekaboo-observed.json');
 assert.ok(!fallback.isError,textResult(fallback));assert.ok(fallback.content.some(b=>b.type==='image'),'Peekaboo embeds actual window pixels');
 const fallbackID=JSON.parse(fallback.content[0].text).observationId;
 const fallbackClick=await broker.handle({action:'call',backend:'peekaboo',reason:'Verify same-window fallback after Cua diff failure',tool:'click',arguments:{pid,window_id,query:'Confirmed once'},observationId:fallbackID},'synthetic-control');save(fallbackClick,'peekaboo-click.json');console.log('FALLBACK CLICK',textResult(fallbackClick));if(fallbackClick.isError)console.log('UNCERTAIN DISPATCH: re-observe only; input will not be replayed');
 const fallbackVerified=await broker.handle({action:'call',backend:'peekaboo',reason:'Verify prior fallback action',tool:'see',arguments:{pid,window_id,max_elements:70}},'synthetic-control');save(fallbackVerified,'peekaboo-verified.json');assert.ok(!fallbackVerified.isError,textResult(fallbackVerified));await page.getByRole('button',{name:'Confirmed twice'}).waitFor({timeout:5000});assert.match(textResult(fallbackVerified),/Confirmed twice/);
 console.log('PASS actual Peekaboo exact-window observation, pinned snapshot click and fresh verification');
 console.log('PASS actual Cua discovery, screenshot/AX, one native click, independent DOM verification, fresh re-observation and model-result image transport',root);
}catch(error){console.error('REHEARSAL ERROR',error.stack,'ARTIFACTS',root);throw error;}finally{await broker.close();if(app){await Promise.race([app.close(),new Promise(resolve=>setTimeout(()=>{app.process().kill('SIGTERM');resolve();},3000))]);}}
