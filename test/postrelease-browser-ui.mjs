import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-postrelease-browser-'));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const server=http.createServer((req,res)=>res.end('<title>Synthetic context tab</title><h1>Context retained</h1><input aria-label="Draft" value="unsent page work">'));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();await page.locator('#home-screen').waitFor();
 const result=await app.evaluate(async({app},url)=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
  const a=await browser.agent({action:'open',url},'synthetic-chat');browser.show(a.id,{x:220,y:150,width:700,height:500});
  const visible=browser.get(a.id).view.webContents.getBackgroundThrottling();browser.show(null);
  const hidden=browser.get(a.id).view.webContents.getBackgroundThrottling();
  const wc=browser.get(a.id).view.webContents,flags=[],set=wc.setBackgroundThrottling.bind(wc);wc.setBackgroundThrottling=value=>{flags.push(value);return set(value);};
  const before=await browser.agent({action:'snapshot',tabId:a.id},'synthetic-chat');await browser.releaseRun('synthetic-chat');
  const tab=browser.get(a.id),released=!tab.owner&&!tab.connection&&!tab.connecting;
  const found=(await browser.agent({action:'list'},'synthetic-chat')).some(t=>t.id===a.id),privateElsewhere=!(await browser.agent({action:'list'},'unrelated')).some(t=>t.id===a.id);
  const after=await browser.agent({action:'snapshot',tabId:a.id},'synthetic-chat');await browser.releaseRun('synthetic-chat');await browser.unload(a.id);
  const unloaded=browser.get(a.id).view===null;const restored=await browser.agent({action:'snapshot',tabId:a.id},'synthetic-chat');
  await browser.command({action:'share',id:a.id,shared:false});const revoked=!(await browser.agent({action:'list'},'synthetic-chat')).some(t=>t.id===a.id);
  await browser.close(a.id);return {automationUnthrottled:flags.includes(false),visible,hidden,released,found,privateElsewhere,same:before.id===after.id&&after.id===restored.id,unloaded,revoked,snapshot:restored.snapshot};
 },'http://127.0.0.1:'+server.address().port);
 assert.equal(result.visible,false);assert.equal(result.hidden,true);for(const key of ['automationUnthrottled','released','found','privateElsewhere','same','unloaded','revoked'])assert.equal(result[key],true,key);assert.match(result.snapshot,/Context retained/);

 const tabs=[];for(let i=0;i<16;i++)tabs.push(await page.evaluate(()=>window.desktop.browser({action:'create',url:''})));
 await page.locator('[data-tab="'+tabs.at(-1).id+'"]').click();await page.locator('#all-tabs-overview').click();await page.locator('.browser-overview [aria-current="page"]').waitFor();
 await page.waitForFunction(()=>document.querySelector('.browser-overview').scrollTop>0);
 const current=await page.locator('.browser-overview [aria-current="page"]').evaluate(node=>{const card=node.getBoundingClientRect(),dialog=node.closest('dialog').getBoundingClientRect();return {id:node.dataset.overviewSelect,visible:card.top>=dialog.top&&card.bottom<=dialog.bottom,outline:getComputedStyle(node.parentElement).outlineWidth};});
 assert.equal(current.id,tabs.at(-1).id);assert.equal(current.visible,true);assert.equal(current.outline,'2px');await page.screenshot({path:'/private/tmp/proteus-postrelease-overview.png'});await page.locator('[data-overview-done]').click();
 for(const tab of tabs)await page.evaluate(id=>window.desktop.browser({action:'close',id}),tab.id);
 const runId=await app.evaluate(({app},home)=>{const engine=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().engine;const schedule=engine.schedules.list()[0];const run=engine.createRun({...schedule,provider:'rehearsal',workspace:{cwd:home,additionalDirectories:[]},prompt:'Synthetic reusable message'},'chat',null,{deferStart:true});run.status='cancelled';run.events=Array.from({length:160},(_,i)=>({role:'user',text:'Synthetic message '+i,at:engine.now()}));engine.persist(run);return run.id;},home);
 await page.locator('[data-page="runs"]').click();await page.locator('.chat-index-row').filter({hasText:'Synthetic reusable message'}).click();await page.locator('[data-edit-message]').last().click();assert.equal(await page.locator('#followup').inputValue(),'Synthetic message 159');assert.equal(await page.locator('#continue').isEnabled(),true);
 await page.locator('[data-local-earlier]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-edit-message]').length===160);assert.equal(await page.locator('#followup').inputValue(),'Synthetic message 159');
 await page.screenshot({path:'/private/tmp/proteus-postrelease-message-reuse.png'});
 console.log(JSON.stringify({passed:true,result}));
}finally{await app?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
