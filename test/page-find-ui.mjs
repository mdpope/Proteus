// Actual Chromium Find on long, synthetic pages; no live profiles or website content.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-find-ui-')));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const server=http.createServer((req,res)=>{const matches=req.url.startsWith('/second')?12:40;res.setHeader('content-type','text/html');res.end('<!doctype html><title>Synthetic long Find page</title><style>body{background:#e8eee5;color:#223322;font:20px system-ui;padding:30px}p{height:500px}</style><h1>Synthetic scrolling fixture</h1>'+Array.from({length:matches},(_,i)=>'<p>NeedleToken occurrence '+(i+1)+'</p>').join(''));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const until=async(fn,label)=>{const end=Date.now()+20000;do{if(await fn())return;await new Promise(r=>setTimeout(r,50));}while(Date.now()<end);throw new Error('Timed out: '+label);};
let app;
const owner=(fn,value)=>app.evaluate(async({app},{code,value})=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');return new Function('main','value','return ('+code+')(main,value)')(main,value);},{code:fn.toString(),value});
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 await until(()=>app.windows().some(page=>!page.url().endsWith('/notice.html')&&page.url().startsWith('http:')),'main window');
 const page=app.windows().find(page=>!page.url().endsWith('/notice.html')&&page.url().startsWith('http:'));page.setDefaultTimeout(15000);await page.locator('#topbar-home').waitFor();
 const win=await app.browserWindow(page);await win.evaluate(window=>window.setSize(1280,900));
 const command=value=>page.evaluate(value=>window.desktop.browser(value),value);
 const tab=await command({action:'create',url:origin+'/first'});await page.locator('[data-tab="'+tab.id+'"]').click();
 await until(()=>owner((main,id)=>{const b=main.getBrowser(),t=b.get(id);return b.active===id&&!t.view.webContents.isLoading()&&b.state(t).findRevision>0;},tab.id),'native document');
 await owner((main,id)=>{const wc=main.getBrowser().get(id).view.webContents;global.findEvidence={find:[],stop:[],results:[]};const find=wc.findInPage.bind(wc),stop=wc.stopFindInPage.bind(wc);wc.findInPage=(text,options)=>{global.findEvidence.find.push({text,options});return find(text,options);};wc.stopFindInPage=action=>{global.findEvidence.stop.push(action);return stop(action);};wc.on('found-in-page',(_event,result)=>{if(result.finalUpdate)global.findEvidence.results.push(result);});},tab.id);
 const find=page.getByRole('searchbox',{name:'Find in page'}),count=page.locator('.page-find [role="status"]');
 await page.keyboard.press('Meta+f');await find.fill('NeedleToken');await until(async()=>(await count.textContent())==='1 of 40','first match');
 await page.getByRole('button',{name:'Next match',exact:true}).click();await until(async()=>(await count.textContent())==='2 of 40','next match');
 await page.getByRole('button',{name:'Previous match',exact:true}).click();await until(async()=>(await count.textContent())==='1 of 40','previous match');
 await page.getByRole('button',{name:'Next match',exact:true}).click();await until(async()=>(await count.textContent())==='2 of 40','second match');
 await page.evaluate(()=>{document.activeElement.blur();window.findPolling=0;const fetch=window.fetch;window.fetch=(...args)=>{if(String(args[0]).startsWith('/api/state'))window.findPolling++;return fetch(...args);};});
 await owner(async(main,id)=>{const wc=main.getBrowser().get(id).view.webContents;await wc.executeJavaScript('window.scrollTo(0,12000)');wc.focus();},tab.id);
 const before=await owner(main=>structuredClone(global.findEvidence));
 for(let i=0;i<3;i++){await page.locator('#main').evaluate(root=>{const node=document.createElement('span');node.hidden=true;node.textContent='Unrelated synthetic shell update';root.append(node);node.remove();});await page.waitForTimeout(160);}
 for(let i=0;i<8;i++){await owner(main=>main.getBrowser().changed());await page.waitForTimeout(1000);}
 const after=await owner(async(main,id)=>({...global.findEvidence,scroll:await main.getBrowser().get(id).view.webContents.executeJavaScript('scrollY')}),tab.id);
 assert.equal(after.find.length,before.find.length,'Polling/mutations cannot restart native Find');assert.equal(after.stop.length,before.stop.length,'Polling/mutations cannot clear native selection');assert.equal(after.scroll,12000,'Manual native scroll stays put');assert.equal(await count.textContent(),'2 of 40');
 const polls=await page.evaluate(()=>window.findPolling);assert.ok(polls>=3,'Actual app polling ran: '+polls);
 // A deliberate reload (including same URL) and a different document each refresh exactly once.
 let n=after.find.length;
 await command({action:'reload',id:tab.id});await until(()=>owner((main,n)=>global.findEvidence.find.length===n+1,n),'same-URL reload Find');await page.waitForTimeout(700);assert.equal((await owner(main=>global.findEvidence)).find.length,n+1);await until(async()=>(await count.textContent())==='1 of 40','reloaded count');
 n++;
 await command({action:'navigate',id:tab.id,url:origin+'/second'});await until(async()=>(await count.textContent())==='1 of 12','new-document count');assert.equal((await owner(main=>global.findEvidence)).find.length,n+1);
 await page.getByRole('button',{name:'Next match',exact:true}).click();await until(async()=>(await count.textContent())==='2 of 12','new document next');
 await page.screenshot({path:process.env.PROTEUS_FIND_SCREENSHOT||'/private/tmp/proteus-find-native.png'});
 await owner(async(main,{id,file})=>{const fs=process.mainModule.require('node:fs');fs.writeFileSync(file,(await main.getBrowser().get(id).view.webContents.capturePage()).toPNG());},{id:tab.id,file:process.env.PROTEUS_FIND_PAGE_SCREENSHOT||'/private/tmp/proteus-find-page.png'});
 await page.getByRole('button',{name:'Close find',exact:true}).click();await find.waitFor({state:'hidden'});
 const closed=await owner(main=>structuredClone(global.findEvidence));await owner(main=>main.getBrowser().changed());await page.waitForTimeout(400);assert.equal((await owner(main=>global.findEvidence)).find.length,closed.find.length);
 // Switching tabs clears only the prior native target; the next target starts independently.
 await page.keyboard.press('Meta+f');await until(async()=>(await count.textContent())==='1 of 12','reopen');const stopsBefore=(await owner(main=>global.findEvidence)).stop.length;
 const other=await command({action:'create',url:origin+'/first?other'});await page.locator('[data-tab="'+other.id+'"]').click();await find.waitFor({state:'hidden'});await until(()=>owner((main,n)=>global.findEvidence.stop.length===n+1,stopsBefore),'old target stop');
 await page.keyboard.press('Meta+f');await until(async()=>(await count.textContent())==='1 of 40','other target');await page.getByRole('button',{name:'Close find',exact:true}).click();assert.equal((await owner(main=>global.findEvidence)).find.length,closed.find.length+1,'Other target did not search the old tab');
 console.log(JSON.stringify({passed:true,synthetic:true,polls,passiveFindCalls:after.find.length-before.find.length,passiveStopCalls:after.stop.length-before.stop.length,manualScroll:after.scroll,stableMatch:'2 of 40',explicitInputAndArrows:true,reload:true,navigation:true,tabSwitch:true,close:true}));
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),10000);try{await app.close();}finally{clearTimeout(timer);}}server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
