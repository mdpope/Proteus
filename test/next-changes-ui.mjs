import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';

// Playwright 1.58 polls the truthiness of a Promise without awaiting its value.
// Poll in Node so false async results retry and only a fulfilled true completes.
async function waitUntil(predicate, {timeout = 18000, interval = 50} = {}) {
  const deadline = Date.now() + timeout;
  do {
    if (await predicate() === true) return;
    await new Promise(resolve => setTimeout(resolve, interval));
  } while (Date.now() < deadline);
  throw new Error('Async condition did not become true within ' + timeout + 'ms');
}

const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-next-ui-')));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const fixture=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Next changes fixture</title><body style="font:20px system-ui"><h1>Synthetic browser</h1><a href="https://example.com/full/path?q=1#part">Inspect link</a><input value="Typed content"></body>');});
await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+fixture.address().port+'/fixture';
let app;
try{
  app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,COPILOT_HOME:path.join(home,'copilot'),PORT:'0'},timeout:60000});
  const page=await app.firstWindow();page.setDefaultTimeout(12000);
 const waitForAsync = (predicate, arg, options) => waitUntil(() => page.evaluate(predicate, arg), options);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.locator('#tab-add-menu summary').waitFor();
  const browser=value=>page.evaluate(value=>window.desktop.browser(value),value);
  const first=await browser({action:'create',url});await page.locator('[data-tab="'+first.id+'"]').click();await page.locator('#browser-url').waitFor();
  const httpCertificate=await browser({action:'certificate',id:first.id});assert.equal(httpCertificate.available,false);assert.match(httpCertificate.reason,/HTTPS/);
  const copied=await browser({action:'copy-url',id:first.id});assert.equal(copied.url,url);
  // The native close command must close the focused tab without closing the window.
  await page.locator('#browser-url').focus();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.sendInputEvent({type:'keyDown',keyCode:'W',modifiers:['meta']}));
  await page.waitForFunction(id=>!document.querySelector('[data-tab="'+id+'"]'),first.id);
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed()).length),1);
  const second=await browser({action:'create',url});await page.locator('[data-tab="'+second.id+'"]').click();
  const third=await browser({action:'create',url:url+'?other=1'});await page.locator('[data-tab="'+third.id+'"]').click();
  // A browser page receives the same shortcut even when its own WebContents owns focus.
  await app.evaluate(({app},id)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();const wc=browser.get(id).view.webContents;wc.focus();wc.sendInputEvent({type:'keyDown',keyCode:'W',modifiers:['meta']});},third.id);
  await page.waitForFunction(id=>!document.querySelector('[data-tab="'+id+'"]'),third.id);assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed()).length),1);
  await page.locator('[data-tab="'+second.id+'"]').click();
  const hover=await app.evaluate(async({app},id)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),wc=browser.get(id).view.webContents;wc.send('proteus:link-hover','https://example.com/full/path?q=1#part');await new Promise(resolve=>setTimeout(resolve,80));return wc.executeJavaScript('(()=>{const hosts=[...document.documentElement.children].filter(node=>node.style?.pointerEvents===\"none\"&&node.style?.position===\"fixed\");return hosts.map(node=>({width:node.getBoundingClientRect().width,bottom:getComputedStyle(node).bottom,pointer:getComputedStyle(node).pointerEvents}));})()');},second.id);
  assert.ok(hover.some(item=>item.width>0&&item.pointer==='none'),'Hover overlay is rendered in the embedded page without intercepting pointer events');
  // A first outward zoom event at baseline must leave the page visible.
  await app.evaluate(({app},id)=>{const wc=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents;wc.emit('zoom-changed',{},'out');},second.id);
  assert.equal(await page.locator('.browser-overview').count(),0);
  await app.evaluate(async({app},id)=>{const wc=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents;await new Promise(resolve=>setTimeout(resolve,170));wc.emit('zoom-changed',{},'out');await new Promise(resolve=>setTimeout(resolve,170));wc.emit('zoom-changed',{},'out');},second.id);
  await page.locator('.browser-overview').waitFor();await page.locator('[data-overview-done]').click();
  // The overview contains standalone content without a Main heading.
  assert.equal(await page.locator('.browser-overview').count(),0);
  const orderBefore=await page.locator('#tabs .tabitem').evaluateAll(nodes=>nodes.map(node=>node.dataset.tabContainer));assert.ok(orderBefore.includes(second.id));
  const extra=await browser({action:'create',url:url+'?extra=1'});await page.locator('[data-tab="'+extra.id+'"]').waitFor();
  const orderToMove=await page.locator('#tabs .tabitem').evaluateAll(nodes=>nodes.map(node=>node.dataset.tabContainer));await page.locator('[data-tab="'+second.id+'"]').focus();await page.keyboard.press('Alt+Shift+ArrowRight');
  const reordered=await page.locator('#tabs .tabitem').evaluateAll(nodes=>nodes.map(node=>node.dataset.tabContainer));assert.equal(reordered.indexOf(second.id),Math.min(orderToMove.indexOf(second.id)+1,reordered.length-1),'Keyboard reorder moves one content tab right');
  await page.waitForTimeout(150);await page.reload();await page.locator('[data-tab="'+second.id+'"]').waitFor();
  const restored=await page.locator('#tabs .tabitem').evaluateAll(nodes=>nodes.map(node=>node.dataset.tabContainer));assert.deepEqual(restored,reordered,'Tab order survives renderer reload');
  await page.locator('[data-tab="'+second.id+'"]').click();
  await app.evaluate(({app},id)=>{const wc=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents;wc.executeJavaScript('document.querySelector("input").value="retained"');},second.id);
  const countBefore=await page.locator('#tabs .tabitem').count();
  await app.evaluate(({Menu})=>{const original=Menu.buildFromTemplate;Menu.buildFromTemplate=function(template){Menu.buildFromTemplate=original;const menu=original(template);menu.popup=()=>{const item=menu.items.find(entry=>entry.label==='Browser');setTimeout(()=>item?.click?.(),0);};return menu;};});
  await page.locator('#tab-add-menu summary').click();await page.waitForFunction(count=>document.querySelectorAll('#tabs .tabitem').length===count+1,countBefore);
  const retained=await app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.executeJavaScript('document.querySelector("input").value'),second.id);assert.equal(retained,'retained','Native + menu choice does not reload the browser page');

  // A synthetic paired host validates repeated remote rerenders without real pairing or chats.
  // Terminal focus uses the same native shortcut and closes only its content tab.
  await page.locator('#topbar-home').click();await page.locator('#tab-add-menu summary').click();await page.locator('#terminal').click();
  await page.locator('#dialog-submit').click();await page.locator('.terminal-canvas').waitFor();
  const terminalId=await page.locator('#tabs .tabitem.selected').getAttribute('data-tab-container');
  await page.locator('.terminal-canvas').click();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.sendInputEvent({type:'keyDown',keyCode:'W',modifiers:['meta']}));
  await page.waitForFunction(id=>!document.querySelector('[data-tab="'+id+'"]'),terminalId);
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed()).length),1);
  const peerHost='00000000-0000-4000-8000-000000000001',peerChat='00000000-0000-4000-8000-000000000002';
  await app.evaluate(({app},args)=>{const peers=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getDesktopPeers();globalThis.__fixtureEvents=Array.from({length:50},(_,i)=>({role:i%2?'assistant':'user',text:'Synthetic message '+i+' repeated content '.repeat(10),at:new Date().toISOString()}));globalThis.__fixtureEventStart=1;globalThis.__fixtureArchiveCount=0;peers.handle=async value=>{const list=[{hostId:args.host,label:'Fixture Mac',status:'online',unread:false}];if(value.action==='list'||value.action==='read')return list;if(value.action==='connect')return {status:'online'};if(value.action==='request'){if(value.method==='sync')return {state:{attachmentMediaTypes:{},runs:[]}};if(value.method==='provider.status')return {models:[{id:'fixture-model',name:'Fixture model',controls:{}}]};if(value.method==='chat.archive'){globalThis.__fixtureArchiveCount++;return {id:args.chat,archivedAt:new Date().toISOString()};}if(value.method==='chat.get')return {id:args.chat,title:'Synthetic remote chat',titleRevision:'fixture-revision',status:'completed',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),archivedAt:null,eventStart:globalThis.__fixtureEventStart,eventCount:51,earlier:false,events:globalThis.__fixtureEvents,schedule:{provider:'rehearsal',model:'fixture-model',workspace:{cwd:'/synthetic',additionalDirectories:[]}},permissionContext:null,usage:{observed:false},context:{entries:[]}};}return null;};}, {host:peerHost,chat:peerChat});
  await page.evaluate(async args=>{const remote=await import('/services/remote/remote-desktops.js');remote.openRemoteChat(args.host,args.chat,'Synthetic remote chat');},{host:peerHost,chat:peerChat});
  await page.locator('#peer-chat-archive').waitFor();await page.locator('#peer-next-model').waitFor();assert.equal(await page.getByText('Next turn',{exact:false}).count(),0);assert.equal(await page.locator('#peer-model-slot details').count(),0);await page.locator('#peer-refresh-models').click();
  await page.locator('#peer-conversation .conversation').evaluate(node=>node.scrollTop=300);
  for(let i=0;i<5;i++)await page.evaluate(async()=>{const remote=await import('/services/remote/remote-desktops.js');const tab=document.querySelector('#main')?.dataset?.peerRunKey;const parts=tab.split(':');await remote.renderRemoteRun({id:'peer:'+tab,hostId:parts[0],runId:parts[1],label:'Synthetic remote chat'});});
  const heldTop=await page.locator('#peer-conversation .conversation').evaluate(node=>node.scrollTop);assert.ok(heldTop>200,'Remote reading position survives repeated refreshes');
  assert.equal(await page.locator('#peer-chat-archive').count(),1);assert.equal(await page.locator('#peer-chat-delete').count(),1);
  const anchorBefore=await page.locator('#peer-conversation .conversation').evaluate(scroll=>{const rect=scroll.getBoundingClientRect(),node=[...scroll.querySelectorAll('.message')].find(item=>item.getBoundingClientRect().bottom>rect.top+1);return {key:node?.dataset.key,offset:node?.getBoundingClientRect().top-rect.top};});
  await app.evaluate(()=>{globalThis.__fixtureEvents.unshift({role:'assistant',text:'Inserted earlier synthetic message '.repeat(20),at:new Date().toISOString()});globalThis.__fixtureEventStart=0;});
  await page.evaluate(async()=>{const remote=await import('/services/remote/remote-desktops.js');const key=document.querySelector('#main').dataset.peerRunKey;const parts=key.split(':');await remote.renderRemoteRun({id:'peer:'+key,hostId:parts[0],runId:parts[1],label:'Synthetic remote chat'});});
  const anchorAfter=await page.locator('#peer-conversation .conversation').evaluate((scroll,key)=>{const rect=scroll.getBoundingClientRect(),node=[...scroll.querySelectorAll('.message')].find(item=>item.dataset.key===key);return node?.getBoundingClientRect().top-rect.top;},anchorBefore.key);
  assert.ok(Math.abs(anchorAfter-anchorBefore.offset)<12,`Visible remote message shifted after prepend: ${anchorBefore.offset} -> ${anchorAfter}`);
  await page.locator('#peer-chat-archive').click();assert.equal(await app.evaluate(()=>globalThis.__fixtureArchiveCount),1,'One click invokes one archive action after repeated refreshes');
  const layout=await page.evaluate(()=>{const header=document.querySelector('.remote-run-main>.heading').getBoundingClientRect(),composer=document.querySelector('#peer-reply-form').getBoundingClientRect(),viewport=document.querySelector('#main').getBoundingClientRect(),chat=document.querySelector('#peer-conversation .conversation').getBoundingClientRect();return {header:header.bottom,composer:composer.bottom,bottom:viewport.bottom,chat:chat.height,scroll:document.querySelector('#main').scrollHeight-document.querySelector('#main').clientHeight,documentOverflow:document.documentElement.scrollHeight-innerHeight};});
  assert.ok(layout.header<layout.bottom&&layout.composer<=layout.bottom+2&&layout.chat>60&&layout.scroll<=2&&layout.documentOverflow<=2,JSON.stringify(layout));
  await page.mouse.move(0,0);
  const composerGeometry=await page.evaluate(()=>{const rect=selector=>document.querySelector(selector)?.getBoundingClientRect(),main=rect('#main'),subtabs=rect('#chat-subtabs'),plus=rect('#peer-run-attachments .attachment-add'),model=rect('#peer-model-slot'),send=rect('#peer-send'),footer=rect('#peer-reply-form .composer-footer'),archive=getComputedStyle(document.querySelector('#peer-chat-archive')),deleted=getComputedStyle(document.querySelector('#peer-chat-delete'));return {subtabGap:subtabs.top-main.top,plusRight:plus.right,modelLeft:model.left,plusY:(plus.top+plus.bottom)/2,modelY:(model.top+model.bottom)/2,sendRight:send.right,footerRight:footer.right,archiveBackground:archive.backgroundColor,deleteBackground:deleted.backgroundColor};});
  assert.ok(composerGeometry.subtabGap<=2&&composerGeometry.plusRight<=composerGeometry.modelLeft+2&&Math.abs(composerGeometry.plusY-composerGeometry.modelY)<9&&composerGeometry.sendRight<=composerGeometry.footerRight+2&&composerGeometry.archiveBackground==='rgba(0, 0, 0, 0)'&&composerGeometry.deleteBackground==='rgba(0, 0, 0, 0)',JSON.stringify(composerGeometry));
  await page.screenshot({path:'/private/tmp/proteus-review-synthetic-remote-layout.png'});
  assert.deepEqual(errors,[]);
  console.log('Passed: isolated Cmd-W, native hover/zoom gate, URL actions, grouped overview, remote refresh singleton and constrained composer.');
  // Public valid HTTPS certificate read, with no trust changes.
  const secure=await browser({action:'create',url:'https://example.com/'});await page.locator('[data-tab="'+secure.id+'"]').click();
  await waitForAsync(async id=>{const tab=(await window.desktop.browser({action:'list'})).find(item=>item.id===id);return tab?.url.startsWith('https://example.com')&&tab.loading===false;},secure.id);
  const certificate=await browser({action:'certificate',id:secure.id});assert.equal(certificate.available,true,certificate.reason);assert.equal(certificate.host,'example.com');assert.ok(certificate.chain[0].subject);assert.ok(certificate.chain[0].issuer);assert.ok(certificate.chain[0].validFrom);assert.ok(certificate.chain[0].validTo);assert.ok(certificate.chain[0].fingerprint256||certificate.source==='chromium-security-details');console.log('Passed: live valid HTTPS connection details returned read-only.');
}catch(error){if(app){const page=await app.firstWindow();await page.screenshot({path:'/private/tmp/proteus-next-ui-failure.png'}).catch(()=>{});console.error((await page.locator('#main').innerText().catch(()=>'' )).slice(0,1200));}throw error;}
finally{await app?.close();await new Promise(resolve=>fixture.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
