import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-browser-backlog-'));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Browser fixture</title><style>body{height:10000px;background:#eee}#nested{width:300px;overflow:auto}#nested div{width:1200px}</style><h1>Synthetic browser</h1><a target="_blank" href="/opened">New tab</a><div id="nested"><div>Nested horizontal area</div></div>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 const result=await app.evaluate(async({app,dialog},{origin,store})=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
  const wait=async predicate=>{const deadline=Date.now()+15000;while(!predicate()){if(Date.now()>deadline)throw new Error('Browser fixture timeout');await new Promise(resolve=>setTimeout(resolve,30));}};
  const first=await browser.create(origin+'/start',null,null,{parentId:'chat-a',group:'main'});
  const source=browser.get(first.id),menu=browser.actions.menu(source,{linkURL:origin+'/menu'});source.parentId='chat-b';menu.items[0].click();
  await wait(()=>browser.list().some(tab=>tab.url===origin+'/menu'));
  const fromMenu=browser.list().find(tab=>tab.url===origin+'/menu');
  await source.view.webContents.executeJavaScript("window.open('/opened','_blank')");await wait(()=>browser.list().some(tab=>tab.url===origin+'/opened'));
  const popup=browser.list().find(tab=>tab.url===origin+'/opened');
  browser.tabs.set('lifecycle-fixture',{id:'lifecycle-fixture',view:{},profileId:'default',group:'main',parentId:null,snapshot:{url:'',title:'Missing contents'},lastTouchedAt:Date.now()});
  for(let n=0;n<4;n++){await browser.command({action:'transfer',id:first.id,parentId:n%2?'chat-a':'internet-chat',group:'main'});await source.view.webContents.loadURL(origin+'/request-'+n);}
  const transferred=browser.state(source);browser.tabs.delete('lifecycle-fixture');
  source.view.webContents.send('proteus:link-hover',origin+'/long?'+('query=x&'.repeat(500)));
  await new Promise(resolve=>setTimeout(resolve,100));
  const hover=await source.view.webContents.executeJavaScript(`(()=>{const node=[...document.querySelectorAll('div')].find(e=>e.style.zIndex==='2147483647'&&e.style.bottom==='10px');const r=node.getBoundingClientRect();return {width:r.width,height:r.height,viewport:innerWidth}})()`);
  const filter=browser.blocker,original=filter.update;let coalesced;
  // Real blocker serialization/cache replacement and failure recovery are separately tested.
  const oldEngine=filter.engine;filter.engine={onBeforeRequest(_d,cb){cb({});},onHeadersReceived(_d,cb){cb({});}};
  await source.view.webContents.loadURL(origin+'/protected');filter.engine=oldEngine;
  let extension=null;
  if(store){const originalDialog=dialog.showMessageBox;dialog.showMessageBox=async()=>({response:1});try{
   const rows=await browser.command({action:'extensions-store-install',url:'https://chromewebstore.google.com/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh'});extension=rows.find(row=>row.store);if(!extension)throw new Error('Store install did not persist');
   await browser.command({action:'extensions-enable',extensionId:extension.id,enabled:false});const disabled=!browser.extensions.protected('default');await browser.command({action:'extensions-enable',extensionId:extension.id,enabled:true});
   const host=browser.extensions.host('default'),row=host.rows.find(r=>r.id===extension.id),version=row.version,originalLoad=host.session.extensions.loadExtension.bind(host.session.extensions);row.version='0.0.0';let failed=false;host.session.extensions.loadExtension=async(...args)=>{if(!failed){failed=true;throw new Error('Synthetic incompatible update');}return originalLoad(...args);};let rollback=false;try{await browser.command({action:'extensions-store-update',extensionId:extension.id});}catch(error){rollback=/Synthetic incompatible/.test(error.message)&&!!host.session.extensions.getExtension(extension.id);}finally{host.session.extensions.loadExtension=originalLoad;row.version=version;browser.extensions.save(host);}
   await host.session.cookies.set({url:origin,name:'fixture-session',value:'preserved'});
   extension={id:extension.id,name:extension.name,version:extension.version,disabled,reEnabled:browser.extensions.protected('default'),rollback};
  }finally{dialog.showMessageBox=originalDialog;}}
  return {menuParent:fromMenu.parentId,popupParent:popup.parentId,transferParent:transferred.parentId,hover,extension};
 },{origin,store:process.env.PROTEUS_STORE_LIVE==='1'});
 assert.equal(result.menuParent,'chat-a');assert.equal(result.popupParent,'chat-b');assert.equal(result.transferParent,'chat-a');assert.ok(result.hover.height<35);assert.ok(result.hover.width<=result.hover.viewport-19);
 if(result.extension){assert.equal(result.extension.disabled,true);assert.equal(result.extension.reEnabled,true);assert.equal(result.extension.rollback,true);}
 const recents=await page.evaluate(async()=>{
  const {bindBrowserRecents}=await import('/browser-recents.js'),{setBrowserDefaultEngine}=await import('/browser-home.js');setBrowserDefaultEngine('duckduckgo');
  document.body.insertAdjacentHTML('beforeend','<form id="fixture-form" style="position:fixed;top:100px;left:200px;z-index:99999;background:white"><input id="fixture-address"></form>');const field=document.querySelector('#fixture-address');let navigate=null;
  const visits=Array.from({length:40},(_,i)=>({url:'https://fixture.test/'+i,title:i===0?'Older needle':'Recent '+i,visitedAt:new Date(10000+i).toISOString()}));
  bindBrowserRecents(field,{load:async()=>{await new Promise(r=>setTimeout(r,40));return visits;},navigate:url=>navigate=url});field.focus();field.value='needle';field.dispatchEvent(new Event('input'));await new Promise(r=>setTimeout(r,180));const older=document.getElementById(field.getAttribute('aria-controls')).textContent;
  field.value='two words';field.dispatchEvent(new Event('input'));await new Promise(r=>setTimeout(r,180));const labels=[...document.getElementById(field.getAttribute('aria-controls')).querySelectorAll('strong')].map(x=>x.textContent);field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));const implicit=navigate;
  field.focus();field.dispatchEvent(new Event('click'));await new Promise(r=>setTimeout(r,80));field.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));return {older,labels,implicit,selected:navigate};
 });
 assert.match(recents.older,/Older needle/);assert.equal(recents.labels[0],'Search with DuckDuckGo · Default');assert.equal(recents.implicit,null);assert.equal(recents.selected,'https://duckduckgo.com/?q=two%20words');
 let restarted=false;if(result.extension){await app.close();app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});await (await app.firstWindow()).locator('#topbar-home').waitFor();const restored=await app.evaluate(async({app},origin)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),rows=await b.command({action:'extensions-list'});return {rows,cookies:await b.sessionFor('default').cookies.get({url:origin})};},origin);assert.equal(restored.rows[0].id,result.extension.id);assert.equal(restored.rows[0].enabled,true);assert.ok(restored.cookies.some(c=>c.name==='fixture-session'&&c.value==='preserved'));restarted=true;}
 console.log(JSON.stringify({passed:true,restarted,...result,recents,liveStore:!!result.extension,physicalTrackpad:'requires operator feel verification',authenticatedExtensionFlows:'not tested'}));
}finally{await app?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
