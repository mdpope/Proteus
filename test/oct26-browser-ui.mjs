// Real website failure and page-notification integration in a disposable owner.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import http from 'node:http';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture(),server=http.createServer((_request,response)=>response.end('<!doctype html><title>Synthetic notification source</title><p>Local fixture</p>'));let app;
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();await page.waitForFunction(()=>document.querySelector('#workspace-launcher')||document.querySelector('#workspace-tree')||document.querySelector('#main'));
 const result=await app.evaluate(async({app},origin)=>{
  const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),browser=main.getBrowser(),service=main.getService();
  const failed=await browser.create('https://proteus-oct26-nonexistent.invalid/');
  const failure=browser.tabs.get(failed.id);for(let i=0;i<100;i++){if(failure.errorPage&&!failure.view.webContents.isLoading())break;await new Promise(resolve=>setTimeout(resolve,100));}
  const error=await failure.view.webContents.executeJavaScript('({title:document.title,text:document.body.innerText,retry:document.querySelector("a")?.href,background:getComputedStyle(document.documentElement).backgroundColor})');
  const logical=browser.state(failure).url;
  await service.browserProfiles.handle({action:'settings',id:'default',settings:{blockingEnabled:false,notifications:[{origin,permission:'allow'}]}});
  const source=await browser.create(origin),tab=browser.tabs.get(source.id),wc=tab.view.webContents;
  await wc.executeJavaScript('window.syntheticNotifications=[new Notification("First fixture",{body:"First permitted event"}),new Notification("Second fixture",{body:"Second permitted event"})];true');
  for(let i=0;i<100;i++){if(service.activity.data.notifications.filter(item=>item.browserIssue?.kind==='site-notification'&&item.browserIssue.tabId===tab.id).length===2)break;await new Promise(resolve=>setTimeout(resolve,50));}
  const notifications=service.activity.data.notifications.filter(item=>item.browserIssue?.kind==='site-notification'&&item.browserIssue.tabId===tab.id);
  // Replaying one exact page event cannot create another notification.
  const pageEvent=browser.permissions.alerts.find(item=>item.tabId===tab.id);
  browser.permissions.receive({sender:wc,senderFrame:wc.mainFrame},{id:pageEvent.pageId,title:'First fixture',body:'First permitted event'});
  const afterDuplicate=service.activity.data.notifications.filter(item=>item.browserIssue?.kind==='site-notification'&&item.browserIssue.tabId===tab.id).length;
  await wc.executeJavaScript('window.syntheticClicked=false;window.syntheticNotifications[0].onclick=()=>window.syntheticClicked=true;true');
  browser.permissions.read(pageEvent.id,true);await new Promise(resolve=>setTimeout(resolve,50));
  return {error,logical,notifications:notifications.map(item=>({title:item.title,body:item.body,source:item.browserIssue})),afterDuplicate,clicked:await wc.executeJavaScript('window.syntheticClicked')};
 },origin);
 assert.match(result.error.text,/DNS lookup failed/);assert.match(result.error.text,/proteus-oct26-nonexistent.invalid/);assert.equal(result.error.retry,'https://proteus-oct26-nonexistent.invalid/');assert.equal(result.logical,result.error.retry);assert.notEqual(result.error.background,'rgb(255, 255, 255)');
 assert.equal(result.notifications.length,2);assert.equal(result.afterDuplicate,2);assert.equal(result.clicked,true);assert.ok(result.notifications.every(item=>item.source.origin===origin&&item.source.profileId==='default'));console.log(JSON.stringify(result));
}finally{await app?.close();await new Promise(resolve=>server.close(resolve));await fixture.cleanup();}
