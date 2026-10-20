import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-postrelease-browser-'));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const server=http.createServer((req,res)=>res.end('<title>Synthetic context tab</title><h1>Context retained</h1><p>Context second match</p><input aria-label="Draft" value="unsent page work">'));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();await page.locator('#home-screen').waitFor();
 const result=await app.evaluate(async({app},url)=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
  const a=await browser.agent({action:'open',url},'synthetic-chat');browser.show(a.id,{x:220,y:150,width:700,height:500});
  const view=browser.get(a.id).view,wcStable=view.webContents,counts={bounds:0,visibility:0,throttling:0};
  for(const [target,method,key] of [[view,'setBounds','bounds'],[view,'setVisible','visibility'],[wcStable,'setBackgroundThrottling','throttling']]){const original=target[method].bind(target);target[method]=(...args)=>{counts[key]++;return original(...args);};}
  await wcStable.executeJavaScript("document.querySelector('input').focus();document.querySelector('input').value='Retained synthetic draft';window.proteusPageIdentity=123");
  for(let i=0;i<20;i++)browser.show(a.id,{x:220,y:150,width:700,height:500});
  const stablePage=await wcStable.executeJavaScript("({draft:document.querySelector('input').value,focused:document.activeElement.tagName,identity:window.proteusPageIdentity})");
  const stableCounts={...counts};browser.show(a.id,{x:220,y:150,width:701,height:500});const resized=counts.bounds===1;
  const visible=browser.get(a.id).view.webContents.getBackgroundThrottling();browser.show(null);
  const hidden=browser.get(a.id).view.webContents.getBackgroundThrottling();
  const wc=browser.get(a.id).view.webContents,flags=[],set=wc.setBackgroundThrottling.bind(wc);wc.setBackgroundThrottling=value=>{flags.push(value);return set(value);};
  const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
  const findFirst=await browser.command({action:'find',id:a.id,text:'Context',direction:0});
  const findNext=await browser.command({action:'find',id:a.id,text:'Context',direction:1});await browser.command({action:'find-stop',id:a.id});
  browser.show(a.id,{x:220,y:150,width:701,height:500});
  const captured=await service.liveBrowser.frame('synthetic-chat',a.id);const frameValid=captured.image.startsWith('data:image/jpeg;base64,')&&captured.width===701&&captured.height===500;
  const noOtherFrames=service.liveBrowser.list('unrelated').length===0;
  const captureHasContent=frame=>{const bitmap=process.mainModule.require('electron').nativeImage.createFromDataURL(frame.image).toBitmap();return bitmap.length>0&&new Set(bitmap).size>8;};
  browser.show(null);service.liveBrowser.clear();const hiddenFrame=await service.liveBrowser.frame('synthetic-chat',a.id);const hiddenCapture=captureHasContent(hiddenFrame);
  const mainWindow=process.mainModule.require('electron').BrowserWindow.getAllWindows()[0];mainWindow.minimize();await new Promise(resolve=>setTimeout(resolve,250));service.liveBrowser.clear();const minimizedFrame=await service.liveBrowser.frame('synthetic-chat',a.id);const minimizedCapture=captureHasContent(minimizedFrame);mainWindow.restore();browser.show(a.id,{x:220,y:150,width:701,height:500});
  let fieldSeen=false,clickSeen=false;const send=wc.send.bind(wc);wc.send=(channel,value)=>{if(channel==='proteus:agent-pointer'&&value?.kind==='click')clickSeen=Number.isFinite(value.x)&&Number.isFinite(value.y);if(channel==='proteus:agent-pointer'&&value?.kind==='field')fieldSeen=value.width>0&&value.height>0;return send(channel,value);};
  await browser.agent({action:'fill',tabId:a.id,selector:'input',value:'Agent typed synthetic text'},'synthetic-chat');await browser.agent({action:'click',tabId:a.id,selector:'input'},'synthetic-chat');wc.send=send;await new Promise(resolve=>setTimeout(resolve,1300));const pointerRetained=!!browser.get(a.id).agentPointer;
  const before=await browser.agent({action:'snapshot',tabId:a.id},'synthetic-chat');await browser.releaseRun('synthetic-chat');
  const tab=browser.get(a.id),released=!tab.owner&&!tab.connection&&!tab.connecting;
  const found=(await browser.agent({action:'list'},'synthetic-chat')).some(t=>t.id===a.id),privateElsewhere=!(await browser.agent({action:'list'},'unrelated')).some(t=>t.id===a.id);
  const after=await browser.agent({action:'snapshot',tabId:a.id},'synthetic-chat');await browser.releaseRun('synthetic-chat');await browser.unload(a.id);
  const unloaded=browser.get(a.id).view===null;const restored=await browser.agent({action:'snapshot',tabId:a.id},'synthetic-chat');
  await browser.command({action:'share',id:a.id,shared:false});const revoked=!(await browser.agent({action:'list'},'synthetic-chat')).some(t=>t.id===a.id);
  await browser.close(a.id);return {hiddenCapture,minimizedCapture,clickSeen,findFirst,findNext,frameValid,noOtherFrames,fieldSeen,pointerRetained,stableCounts,stablePage,resized,automationUnthrottled:flags.includes(false),visible,hidden,released,found,privateElsewhere,same:before.id===after.id&&after.id===restored.id,unloaded,revoked,snapshot:restored.snapshot};
 },'http://127.0.0.1:'+server.address().port);
 assert.equal(result.hiddenCapture,true);assert.equal(result.minimizedCapture,true);assert.equal(result.findFirst.matches,2);assert.equal(result.findNext.activeMatchOrdinal,2);assert.equal(result.frameValid,true);assert.equal(result.noOtherFrames,true);assert.equal(result.fieldSeen,true);assert.equal(result.clickSeen,true);assert.equal(result.pointerRetained,true);assert.deepEqual(result.stableCounts,{bounds:0,visibility:0,throttling:0});assert.deepEqual(result.stablePage,{draft:'Retained synthetic draft',focused:'INPUT',identity:123});assert.equal(result.resized,true);assert.equal(result.visible,false);assert.equal(result.hidden,true);for(const key of ['automationUnthrottled','released','found','privateElsewhere','same','unloaded','revoked'])assert.equal(result[key],true,key);assert.match(result.snapshot,/Context retained/);

 const tabs=[];for(let i=0;i<16;i++)tabs.push(await page.evaluate(()=>window.desktop.browser({action:'create',url:''})));
 await page.locator('[data-tab="'+tabs.at(-1).id+'"]').click();await page.locator('#all-tabs-overview').click();await page.locator('.browser-overview [aria-current="page"]').waitFor();
 await page.waitForFunction(()=>document.querySelector('.browser-overview').scrollTop>0);
 const current=await page.locator('.browser-overview [aria-current="page"]').evaluate(node=>{const card=node.getBoundingClientRect(),dialog=node.closest('dialog').getBoundingClientRect();return {id:node.dataset.overviewSelect,visible:card.top>=dialog.top&&card.bottom<=dialog.bottom,outline:getComputedStyle(node.parentElement).outlineWidth};});
 assert.equal(current.id,tabs.at(-1).id);assert.equal(current.visible,true);assert.equal(current.outline,'2px');await page.screenshot({path:'/private/tmp/proteus-postrelease-overview.png'});await page.keyboard.press('Escape');await page.locator('.browser-overview').waitFor({state:'detached'});
 for(const tab of tabs)await page.evaluate(id=>window.desktop.browser({action:'close',id}),tab.id);
 const runId=await app.evaluate(({app},home)=>{const engine=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().engine;const schedule=engine.schedules.list()[0];const run=engine.createRun({...schedule,provider:'rehearsal',workspace:{cwd:home,additionalDirectories:[]},prompt:'Synthetic reusable message'},'chat',null,{deferStart:true});run.status='cancelled';run.events=Array.from({length:160},(_,i)=>({role:'user',text:'Synthetic message '+i,at:engine.now()}));engine.persist(run);return run.id;},home);
 await page.locator('[data-page="runs"]').click();await page.locator('.chat-index-row').filter({hasText:'Synthetic reusable message'}).click();await page.locator('[data-edit-message]').last().click();assert.equal(await page.locator('#followup').inputValue(),'Synthetic message 159');assert.equal(await page.locator('#continue').isEnabled(),true);
 await page.locator('#conversation').evaluate(node=>{node.scrollTop=0;node.dispatchEvent(new Event('scroll'));});await page.waitForFunction(()=>document.querySelectorAll('[data-edit-message]').length===160);assert.equal(await page.locator('#followup').inputValue(),'Synthetic message 159');
 await page.screenshot({path:'/private/tmp/proteus-postrelease-message-reuse.png'});
 // Real trusted wheel input exercises the renderer shortcut, including draft retention.
 const main=page.locator('#main');await page.locator('#followup').hover();await page.mouse.wheel(-180,0);await page.waitForTimeout(350);assert.equal(await page.locator(`[data-tab="${runId}"]`).count(),1);await main.hover({position:{x:350,y:180}});
 await page.mouse.wheel(-65,0);await page.waitForTimeout(500);assert.equal(await page.locator(`[data-tab="${runId}"]`).count(),1);
 await main.hover({position:{x:350,y:180}});await page.mouse.wheel(-180,0);await page.locator(`[data-tab="${runId}"]`).waitFor({state:'detached'});
 await page.waitForTimeout(950);await main.hover({position:{x:350,y:180}});await page.mouse.wheel(180,0);await page.locator('#followup').waitFor();assert.equal(await page.locator('#followup').inputValue(),'Synthetic message 159');
 // A loaded browser with no history closes through the native preload, then forward restores it.
 const swipeBrowser=await page.evaluate(()=>window.desktop.browser({action:'create',url:''}));await page.locator(`[data-tab="${swipeBrowser.id}"]`).click();
 await page.evaluate(({id,url})=>window.desktop.browser({action:'navigate',id,url}),{id:swipeBrowser.id,url:'http://127.0.0.1:'+server.address().port});
 // Native page history takes precedence over tab close/reopen.
 const swipeURL='http://127.0.0.1:'+server.address().port;
 await page.evaluate(({id,url})=>window.desktop.browser({action:'navigate',id,url}),{id:swipeBrowser.id,url:swipeURL+'/second'});
 const nativeWheel=delta=>app.evaluate(async({app},{id,delta})=>{const wc=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents;await new Promise(resolve=>setTimeout(resolve,1000));wc.sendInputEvent({type:'mouseWheel',x:400,y:250,deltaX:delta,deltaY:0,canScroll:true});},{id:swipeBrowser.id,delta});
 await nativeWheel(180);await page.waitForFunction(()=>document.querySelector('#browser-url')?.value.endsWith('/'));
 assert.equal(await page.locator(`[data-tab="${swipeBrowser.id}"]`).count(),1);
 await nativeWheel(-180);await page.waitForFunction(()=>document.querySelector('#browser-url')?.value.endsWith('/second'));
 await nativeWheel(180);await page.waitForFunction(()=>document.querySelector('#browser-url')?.value.endsWith('/'));
 await nativeWheel(180);
 await page.locator(`[data-tab="${swipeBrowser.id}"]`).waitFor({state:'detached'});await main.hover({position:{x:350,y:180}});await page.mouse.wheel(-180,0);await page.waitForTimeout(400);assert.equal(await page.locator(`[data-tab="${runId}"]`).count(),1);
 await page.waitForTimeout(1000);await main.hover({position:{x:350,y:180}});await page.mouse.wheel(180,0);
 await page.waitForFunction(()=>document.querySelector('#browser-url')?.value.startsWith('http://127.0.0.1:'));
 result.browserHistoryPrecedesTabClose=true;result.swipeChatClosedAndRestored=true;result.swipeBrowserClosedAndRestored=true;
 console.log(JSON.stringify({passed:true,result}));
}finally{await app?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
