import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-terminal-ui-')));const workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
let app;const errors=[];const until=async cb=>{for(let i=0;i<100;i++){if(await cb())return;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out');};
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_APP?{executablePath:process.env.PROTEUS_TEST_APP}:{}),args:[...(process.env.PROTEUS_TEST_APP?[]:['.']),'--user-data-dir='+path.join(home,'browser')],env:{...process.env,PROTEUS_HOME:home,COPILOT_HOME:path.join(home,'copilot'),PORT:'0'},timeout:60000});
 const page=await app.firstWindow();page.on('console',m=>{if(m.type()==='error')console.error(m.text());});page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);await page.locator('#terminal').waitFor();
 await page.evaluate(async()=>{const state=await window.desktop.terminal({action:'state'});const profiles=state.profiles.profiles;profiles[0]={...profiles[0],name:'Interactive test',shell:'/bin/sh',command:'sleep 1; printf "READY_FOR_INPUT\\n"; read answer; printf "RECEIVED:%s\\n" "$answer"; read finish'};await window.desktop.terminal({action:'save-profiles',profiles,expectedRevision:state.profiles.revision});});
 await page.locator('#terminal').click();await page.getByRole('button',{name:'Open terminal',exact:true}).click();
 await page.locator('.terminal-canvas canvas').waitFor();
 let session=(await page.evaluate(()=>window.desktop.terminal({action:'state'}))).sessions[0];assert.ok(session);
 const snapshot=()=>page.evaluate(id=>window.desktop.terminal({action:'snapshot',id}),session.id);
 await until(async()=> (await snapshot()).data.includes('READY_FOR_INPUT'));
 await page.locator('.terminal-canvas').click();await page.keyboard.type('SYNTHETIC_TYPED_INPUT');await page.keyboard.press('Enter');
 await until(async()=> (await snapshot()).data.includes('RECEIVED:SYNTHETIC_TYPED_INPUT'));
 assert.equal((await snapshot()).session.status,'running');
 await page.locator('[data-page="schedules"]').click();assert.equal((await snapshot()).session.status,'running');await page.locator('[data-tab="terminal:'+session.id+'"]').click();await page.locator('.terminal-canvas canvas').waitFor();assert.equal((await page.evaluate(()=>window.desktop.terminal({action:'state'}))).sessions.length,1);
 // A renderer load failure must reconnect the existing shell, never launch a duplicate.
 await page.route('**/terminal/ghostty-vt.wasm',route=>route.abort());await page.reload();await page.getByRole('button',{name:'Reconnect view'}).waitFor();assert.equal((await page.evaluate(()=>window.desktop.terminal({action:'state'}))).sessions.length,1);await page.unroute('**/terminal/ghostty-vt.wasm');await page.getByRole('button',{name:'Reconnect view'}).click();await page.locator('.terminal-canvas canvas').waitFor();assert.equal((await snapshot()).session.id,session.id);
 await page.getByRole('button',{name:'Profiles',exact:true}).click();await page.locator('[data-profile-field="fontSize"]').fill('16');await page.getByRole('button',{name:'Save profiles',exact:true}).click();assert.equal((await page.evaluate(()=>window.desktop.terminal({action:'state'}))).profiles.profiles[0].fontSize,16);
 await page.screenshot({path:'/private/tmp/proteus-terminal-interactive.png'});
 assert.equal(await page.evaluate(async()=> (await fetch('/api/terminal')).status),404);
 await page.locator('[data-close="terminal:'+session.id+'"]').click();assert.equal((await page.evaluate(()=>window.desktop.terminal({action:'state'}))).sessions.length,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,checks:8,screenshot:'/private/tmp/proteus-terminal-interactive.png'}));
}catch(error){if(app){const page=await app.firstWindow();console.error((await page.locator('body').innerText()).slice(-6000));console.error(errors);await page.screenshot({path:'/private/tmp/proteus-terminal-failure.png'});}throw error;}finally{if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
