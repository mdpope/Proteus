// Disposable real Electron navigation failures; no workplace site or account.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import net from 'node:net';import http from 'node:http';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-browser-errors-'));
const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));const failed=`http://127.0.0.1:${port}/missing?token=synthetic-secret`;
const server=http.createServer((req,res)=>res.end(`<title>Healthy fixture</title><h1>Healthy page</h1><iframe src="${failed}"></iframe>`));await new Promise(r=>server.listen(0,'127.0.0.1',r));let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.locator('#home-screen').waitFor();
 const tab=await page.evaluate(url=>window.desktop.browser({action:'create',url}),failed);let notice;for(let i=0;i<100;i++){notice=app.windows().find(p=>p.url().endsWith('/notice.html'));if(notice)break;await page.waitForTimeout(50);}assert.ok(notice);await notice.waitForFunction(()=>document.querySelector('article span')?.textContent.includes('ERR_CONNECTION_REFUSED'));assert.match(await notice.locator('article span').innerText(),/ERR_CONNECTION_REFUSED/);
 await page.locator(`[data-tab="${tab.id}"]`).click();assert.equal(await page.locator('#browser-status').count(),0);
 let logs=await app.evaluate(async({app})=>(await process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().activity.logs()).items.filter(x=>x.event==='browser.load-failed'));
 assert.equal(logs.length,1);assert.match(logs[0].message,/ERR_CONNECTION_REFUSED/);assert.ok(!logs[0].message.includes('synthetic-secret'));
 await notice.getByRole('button',{name:'View logs',exact:true}).click();await page.getByRole('heading',{name:'Logs',exact:true}).waitFor();await page.getByText('browser.load-failed',{exact:false}).first().waitFor();
 assert.equal(await page.locator('[data-log-id="'+logs[0].id+'"]').evaluate(el=>document.activeElement===el),true,'View logs focuses the associated event');
 // Already-visible Logs must refresh; an open dialog must not cover the destination.
 await page.evaluate(()=>{const dialog=document.querySelector('#dialog');dialog.innerHTML='<input id="retained-draft" value="Unsent rehearsal draft">';dialog.showModal();});
 await page.evaluate(({id,url})=>window.desktop.browser({action:'navigate',id,url}),{id:tab.id,url:failed.replace('127.0.0.1','localhost')+'&attempt=2'});
 await notice.getByRole('button',{name:'View logs',exact:true}).click();
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-log-id]')].filter(el=>el.textContent.includes('browser.load-failed')).length===2&&!document.querySelector('dialog[open]'));
 assert.equal(await page.locator('#retained-draft').inputValue(),'Unsent rehearsal draft');
 logs=await app.evaluate(async({app})=>(await process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().activity.logs()).items.filter(x=>x.event==='browser.load-failed'));
 assert.equal(await page.locator('[data-log-id="'+logs[0].id+'"]').evaluate(el=>document.activeElement===el),true);
 // An evicted/missing event still opens Logs without selecting a different event.
 await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().actions.send({type:'load-error',id:'missing',logId:'evicted',message:'Synthetic historical failure'}));
 await notice.getByText('Synthetic historical failure',{exact:true}).waitFor();
 await notice.getByRole('button',{name:'View logs',exact:true}).click();
 await page.getByRole('heading',{name:'Logs',exact:true}).waitFor();
 await page.screenshot({path:'/private/tmp/proteus-browser-error-logs.png'});
 await page.evaluate(({id,url})=>window.desktop.browser({action:'navigate',id,url}),{id:tab.id,url:'http://127.0.0.1:'+server.address().port});
 const healthy=await page.evaluate(id=>window.desktop.browser({action:'list'}).then(tabs=>tabs.find(tab=>tab.id===id)),tab.id);assert.equal(healthy.error,null);
 logs=await app.evaluate(async({app})=>(await process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().activity.logs()).items.filter(x=>x.event==='browser.load-failed'));assert.equal(logs.length,2,'A failing embedded frame must not produce a whole-page notification');
 console.log(JSON.stringify({passed:true,persistentBannerRemoved:true,oneNotificationPerAttempt:true,logsRetained:true,associatedEntryFocused:true,modalDismissedDraftRetained:true,alreadyOpenRefreshed:true,missingEntryFallback:true,secretsRedacted:true,healthyNavigationClearsError:true,subframeErrorsIgnored:true}));
}catch(error){console.error(JSON.stringify({error:error.message,windows:app?.windows().map(p=>p.url()),notices:await Promise.all((app?.windows()||[]).filter(p=>p.url().includes('notice.html')).map(p=>p.locator('body').innerText().catch(()=>'')))}));throw error;}finally{await app?.close();await new Promise(r=>server.close(r));fs.rmSync(home,{recursive:true,force:true});}
