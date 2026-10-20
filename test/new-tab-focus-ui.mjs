import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-new-tab-focus-')));let app;
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const site=http.createServer((q,r)=>r.end('<title>Disposable focus page</title><input autofocus aria-label="Page input">'));await new Promise(r=>site.listen(0,'127.0.0.1',r));
const until=async(fn,label)=>{for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out: '+label);};
try{
 app=await _electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'browser')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'}});const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();await app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();b.blocker.ensure=async()=>{};});
 await page.locator('#tab-add-menu summary').click();await page.locator('#browser-home-url').waitFor();await page.locator('#browser-home-url').fill('http://127.0.0.1:'+site.address().port+'/focus');await page.locator('#browser-home-url').press('Enter');await page.locator('#browser-home-url').waitFor({state:'detached'});
 await until(()=>app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return !!b.active&&!!b.tabs.get(b.active)?.view?.webContents.getURL();}),'native page loaded and selected');
 await app.evaluate(({app})=>{const m=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),b=m.getBrowser();b.window.show();b.window.focus();b.get(b.active).view.webContents.focus();});
 await until(()=>app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return b.get(b.active).view.webContents.isFocused();}),'native page owns keyboard focus');
 await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().window.webContents.send('proteus:new-tab'));
 await page.locator('#browser-home-url').waitFor();await until(()=>app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().window.webContents.isFocused()),'new-tab shell owns native keyboard focus');
 assert.equal(await page.locator('#browser-home-url').evaluate(e=>document.activeElement===e),true);
 await app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();b.window.webContents.sendInputEvent({type:'char',keyCode:'f'});});await until(async()=>await page.locator('#browser-home-url').inputValue()==='f','typed character reaches address field');
 console.log('PASS native browser-to-New-tab focus handoff and immediate address typing');
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),5000);await app.close().catch(()=>{});clearTimeout(timer);}await new Promise(r=>site.close(r));fs.rmSync(home,{recursive:true,force:true});}
