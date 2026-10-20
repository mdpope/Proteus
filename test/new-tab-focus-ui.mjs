import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-new-tab-focus-')));let app;const pageErrors=[];
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const site=http.createServer((q,r)=>r.end('<title>Disposable focus page</title><input autofocus aria-label="Page input">'));await new Promise(r=>site.listen(0,'127.0.0.1',r));
const until=async(fn,label)=>{for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out: '+label);};
try{
 app=await _electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'browser')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'}});const page=await app.firstWindow();page.on('pageerror',error=>pageErrors.push(error.message));await page.locator('#topbar-home').waitFor();await app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();b.blocker.ensure=async()=>{};});
 await page.locator('#tab-add-menu summary').click();await page.locator('#browser-home-url').waitFor();await page.locator('#browser-home-url').fill('http://127.0.0.1:'+site.address().port+'/focus');await page.locator('#browser-home-url').press('Enter');await page.locator('#browser-home-url').waitFor({state:'detached'});
 await until(()=>app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return !!b.active&&!!b.tabs.get(b.active)?.view?.webContents.getURL();}),'native page loaded and selected');
 await app.evaluate(({app})=>{const m=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),b=m.getBrowser();app.focus({steal:true});b.window.show();b.window.focus();b.get(b.active).view.webContents.focus();});
 await until(()=>app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return b.get(b.active).view.webContents.isFocused();}),'native page owns keyboard focus');
 await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().requestNewTab());
 await page.locator('#browser-home-url').waitFor();await until(()=>app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().window.webContents.isFocused()),'new-tab shell owns native keyboard focus');
 assert.equal(await page.locator('#browser-home-url').evaluate(e=>document.activeElement===e),true);
 await app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();b.window.webContents.sendInputEvent({type:'char',keyCode:'f'});});await until(async()=>await page.locator('#browser-home-url').inputValue()==='f','typed character reaches address field');
 await page.locator('#browser-home-url').fill('http://127.0.0.1:'+site.address().port+'/focus-again');await page.locator('#browser-home-url').press('Enter');
 await until(()=>app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return !!b.active&&!!b.tabs.get(b.active)?.view?.webContents.getURL();}),'native page selected again');
 await app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();b.window.focus();b.get(b.active).view.webContents.focus();});
 // Delay owner creation while delivering real native input to whichever surface owns focus.
 await app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),create=b.create.bind(b);b.create=async(...args)=>{if(!args[0])await new Promise(resolve=>setTimeout(resolve,700));return create(...args);};});
 const earlyText='http://127.0.0.1:'+site.address().port+'/early-enter';
 await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().requestNewTab());
 await app.evaluate(({app},value)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();if(!b.window.webContents.isFocused())throw Error('Early input would go to the old native page');for(const c of value)b.window.webContents.sendInputEvent({type:'char',keyCode:c});b.window.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});b.window.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});},earlyText);
 await until(()=>app.evaluate(({app},url)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return b.tabs.get(b.active)?.view?.webContents.getURL()===url;},earlyText),'address and Enter typed before field creation reach the new page exactly');
 assert.equal(await page.locator('#pending-new-tab-address').count(),0);assert.deepEqual(pageErrors,[]);
 console.log('PASS native browser-to-New-tab focus, immediate address typing and buffered early URL/Enter');
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),5000);await app.close().catch(()=>{});clearTimeout(timer);}await new Promise(r=>site.close(r));fs.rmSync(home,{recursive:true,force:true});}
