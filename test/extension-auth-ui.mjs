// Synthetic extension, authentication window and form only. No real vault/login.
import {_electron as electron} from 'playwright';
import {extensionWindow} from './extension-window-fixture.mjs';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-extension-auth-')));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const server=http.createServer((req,res)=>res.end('<title>Synthetic sign-in form</title><h1>Disposable form</h1><input id="username" autocomplete="username"><input id="password" type="password" autocomplete="current-password"><script>window.inputs=0;document.addEventListener("input",()=>inputs++)</script>'));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
let app;
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'}});
 const first=await app.firstWindow();await first.locator('#topbar-home').waitFor();
 const native=async(fn,value)=>app.evaluate(async({app},payload)=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');return await eval('('+payload.code+')')(main,payload.value);},{code:fn.toString(),value});
 const installed=await app.evaluate(async({app,dialog},source)=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');await main.getService().browserProfiles.handle({action:'settings',id:'default',settings:{blockingEnabled:false}});const oldOpen=dialog.showOpenDialog,oldMessage=dialog.showMessageBox;dialog.showOpenDialog=async()=>({canceled:false,filePaths:[source]});dialog.showMessageBox=async()=>({response:1});try{return await main.getBrowser().command({action:'extensions-install',profileId:'default'});}finally{dialog.showOpenDialog=oldOpen;dialog.showMessageBox=oldMessage;}},path.resolve('test/fixtures/tab-extension'));
 const create=async(page,url)=>native(async(main,value)=>main.getWindows().run(value.windowId,async()=>{const browser=main.getBrowser(),info=await browser.command({action:'create',url:value.url});browser.actions.send({type:'select-tab',info});return {id:info.id,nativeId:browser.get(info.id).view.webContents.id,windowId:browser.window.id};}),{windowId:await page.evaluate(()=>window.desktop.windowId),url});
 await native(main=>{main.extensionFocusTrace=[];for(const ctx of main.getWindows().contexts.values())ctx.window.on('focus',()=>main.extensionFocusTrace.push({window:ctx.window.id,at:Date.now()}));});
 const a=await create(first,origin+'/first');
 const popupEvent=extensionWindow(app,installed[0].id,'/popup.html');await native((main,id)=>main.getBrowser().command({action:'extensions-open',extensionId:id}),installed[0].id);const popup=await popupEvent;await popup.getByText(/Extension API ready/).waitFor();
 await popup.evaluate(id=>new Promise(resolve=>chrome.tabs.update(id,{active:true},resolve)),a.nativeId);await first.locator('[data-tab-container="'+a.id+'"].selected').waitFor();
 const secondEvent=app.waitForEvent('window');await native(main=>main.createWindow());const second=await secondEvent;await second.locator('#topbar-home').waitFor();const b=await create(second,origin+'/second');
 await popup.evaluate(id=>new Promise(resolve=>chrome.tabs.update(id,{active:true},resolve)),b.nativeId);await native((main,id)=>{const ctx=[...main.getWindows().contexts.values()].find(ctx=>ctx.window.id===id);ctx.window.focus();},b.windowId);
 await second.locator('[data-tab-container="'+b.id+'"].selected').waitFor();
 await native((main,id)=>{const ctx=[...main.getWindows().contexts.values()].find(ctx=>ctx.window.id===id);process.mainModule.require('electron').app.focus({steal:true});ctx.window.show();ctx.window.focus();},b.windowId);
 await popup.waitForFunction(async id=>(await chrome.tabs.query({active:true,lastFocusedWindow:true})).some(tab=>tab.id===id),b.nativeId);
 const contexts=await popup.evaluate(async()=>({current:await chrome.windows.getCurrent(),lastWindow:await chrome.windows.getLastFocused(),all:await chrome.tabs.query({active:true}),tabs:await chrome.tabs.query({active:true,currentWindow:true}),last:await chrome.tabs.query({active:true,lastFocusedWindow:true})}));
 console.log(JSON.stringify({synthetic:true,a,b,contexts,trace:await native(main=>({focus:main.extensionFocusTrace,store:[...main.getBrowser().extensions.profiles.values()].map(host=>({last:host.adapter.ctx.store.lastFocusedWindowId,windows:[...host.adapter.ctx.store.windows].map(w=>w.id)}))}))}));
 assert.equal(contexts.current.id,a.windowId);assert.deepEqual(contexts.tabs.map(tab=>tab.id),[a.nativeId]);assert.deepEqual(contexts.all.map(tab=>tab.id).sort(),[a.nativeId,b.nativeId].sort());assert.deepEqual(contexts.last.map(tab=>tab.id),contexts.all.filter(tab=>tab.windowId===contexts.lastWindow.id).map(tab=>tab.id));
 const authenticationEvent=extensionWindow(app,installed[0].id,'/auth.html');await popup.locator('#unlock').click();const authentication=await authenticationEvent;await authentication.locator('#complete').waitFor();const closed=authentication.waitForEvent('close');await authentication.locator('#complete').click();await closed;
 await popup.getByText('Synthetic vault unlocked',{exact:true}).waitFor();assert.equal(popup.isClosed(),false);
 // The popup fills lastFocusedWindow. Restore the asserted destination after
 // exercising the second-window query above, then verify the same API sees it.
 await native((main,id)=>{const ctx=[...main.getWindows().contexts.values()].find(ctx=>ctx.window.id===id);process.mainModule.require('electron').app.focus({steal:true});ctx.window.show();ctx.window.focus();},a.windowId);
 await popup.waitForFunction(async id=>(await chrome.tabs.query({active:true,lastFocusedWindow:true})).some(tab=>tab.id===id),a.nativeId);
 await popup.locator('#fill').click();await popup.getByText('Synthetic form filled',{exact:true}).waitFor();
 const form=await native(async(main,id)=>main.getBrowser().get(id).view.webContents.executeJavaScript('({user:document.querySelector("#username").value,password:document.querySelector("#password").value,inputs:window.inputs})'),a.id);
 assert.deepEqual(form,{user:'synthetic-user',password:'SYNTHETIC-ONLY-PASSWORD',inputs:2});
 const untouched=await native(async(main,id)=>main.getBrowser().get(id).view.webContents.executeJavaScript('document.querySelector("#password").value'),b.id);assert.equal(untouched,'');
 console.log(JSON.stringify({passed:true,synthetic:true,currentWindowBoundToPopupParent:true,lastFocusedWindowFiltering:true,authenticationWindowCreatesAndCloses:true,originalPopupRetained:true,autofillAfterAuthentication:true,otherWindowUntouched:true,realVaultCredentialsAccessed:false}));
}finally{await app?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
