// Disposable Electron/profile only. No real website, provider, account or grants.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';

const fixture=await sidebarFixture();
const server=http.createServer((req,res)=>{
 res.setHeader('Content-Type','text/html');
 if(req.url==='/frame')res.end('<script>alert("frame ad request");window.result={confirm:confirm("Allow ads?")};</script>');
 else res.end('<!doctype html><title>Dialog fixture</title><p id="ready">Synthetic page</p><dialog id="html-dialog"><button>Close page dialog</button></dialog>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let app;
try{
 app=await electron.launch({args:[process.env.PROTEUS_TEST_APPLICATION||'.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const shell=await app.firstWindow();shell.setDefaultTimeout(15000);await shell.locator('body.window-design-preview').waitFor();
 await app.evaluate(async({app})=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');await main.getService().browserProfiles.handle({action:'settings',id:'default',settings:{blockingEnabled:false}});});
 const command=value=>shell.evaluate(value=>window.desktop.browser(value),value);
 const page=await command({action:'create',url:origin+'/dialogs'}),other=await command({action:'create',url:origin+'/other'});
 // Check the real target before executing any script: the unfixed baseline fails
 // here without opening an app-blocking native dialog in the test process.
 const preferences=await app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.getLastWebPreferences(),page.id);
 assert.equal(preferences.disableDialogs,true,'Website content must not inherit Electron native dialogs');
 for(const background of [false,true]){
  await shell.locator(`[data-tab="${background?other.id:page.id}"]`).first().click();
  const result=await app.evaluate(async({app},id)=>{const wc=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents;return wc.executeJavaScript('(()=>{try{alert("Please allow ads on this site.");const result={confirm:confirm("Click OK to enable ads")};for(let i=0;i<10;i++)confirm("Repeated request");return result;}catch(error){return {error:error.message};}})()');},page.id);
  assert.deepEqual(result,{confirm:false});
  await shell.evaluate(()=>{const button=document.createElement('button');button.id='synthetic-dialog-control';button.textContent='Synthetic shell control';button.style.cssText='position:fixed;left:8px;top:80px;z-index:2147483647';button.onclick=()=>button.dataset.clicked='yes';document.body.append(button);});
  await shell.locator('#synthetic-dialog-control').click();assert.equal(await shell.locator('#synthetic-dialog-control').getAttribute('data-clicked'),'yes');await shell.locator('#synthetic-dialog-control').evaluate(e=>e.remove());
 }
 const frame=await app.evaluate(async({app},{id,url})=>{const wc=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents;await wc.executeJavaScript(`new Promise(resolve=>{const frame=document.createElement('iframe');frame.src=${JSON.stringify(url)};frame.onload=resolve;document.body.append(frame);})`);return wc.mainFrame.framesInSubtree.find(f=>f.url===url).executeJavaScript('window.result');},{id:page.id,url:origin+'/frame'});
 assert.deepEqual(frame,{confirm:false});
 const html=await app.evaluate(async({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.executeJavaScript('document.querySelector("#html-dialog").showModal();document.querySelector("#html-dialog").open'),page.id);
 assert.equal(html,true,'HTML dialogs still work inside their page');
 const unsaved=await app.evaluate(async({app},id)=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),wc=browser.get(id).view.webContents;
  await wc.executeJavaScript('document.querySelector("#html-dialog").close();window.onbeforeunload=()=>false;null',true);
  try{await browser.unload(id);return {blocked:false};}
  catch(error){return {blocked:/unsaved work/.test(error.message),pageRetained:!wc.isDestroyed()};}
  finally{if(!wc.isDestroyed())await wc.executeJavaScript('window.onbeforeunload=null');}
 },page.id);
 assert.deepEqual(unsaved,{blocked:true,pageRetained:true},'Suppressing native JS dialogs must retain unsaved-page unload protection');
 // Right-clicking a background tab copies that tab's tool ID, without activating
 // it or changing Persisted. Capture clipboard writes only in this fixture.
 await app.evaluate(({clipboard})=>{globalThis.syntheticTabCopies=[];clipboard.writeText=value=>globalThis.syntheticTabCopies.push(value);});
 await shell.locator(`[data-tab="${other.id}"]`).first().click();
 await shell.locator(`[data-tab="${page.id}"]`).first().click({button:'right'});
 let menu;
 for(let i=0;i<100&&!menu;i++){menu=app.windows().find(p=>p.url().endsWith('/browser-page-menu.html'));if(!menu)await new Promise(resolve=>setTimeout(resolve,50));}
 assert.ok(menu,'Browser tab context menu opens');
 const labels=await menu.getByRole('menuitem').allTextContents();
 assert.equal(labels[labels.indexOf('Persist tab')-1],'Copy tab ID');
 await menu.getByRole('menuitem',{name:'Copy tab ID',exact:true}).click();
 for(let i=0;i<100;i++){if(await app.evaluate(()=>globalThis.syntheticTabCopies.length))break;await new Promise(resolve=>setTimeout(resolve,25));}
 assert.deepEqual(await app.evaluate(()=>globalThis.syntheticTabCopies),[page.id]);
 assert.equal((await command({action:'list'})).find(t=>t.id===page.id).persist,false);
 // Exercise the actual extension popup creation boundary as well.
 const extension=path.join(fixture.temporary,'dialog-extension');fs.mkdirSync(extension);
 fs.writeFileSync(path.join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Synthetic dialog extension',version:'1.0',action:{default_popup:'popup.html'}}));
 fs.writeFileSync(path.join(extension,'popup.html'),'<p>Synthetic extension</p>');
 const extensionResult=await app.evaluate(async({app},source)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),session=browser.sessionFor('default');const extension=await session.extensions.loadExtension(source);const popup=browser.extensions.openPage(browser.extensions.host('default'),extension.url+'popup.html');try{const disabled=popup.webContents.getLastWebPreferences().disableDialogs;if(!disabled)return {disabled};await new Promise(resolve=>popup.webContents.once('did-finish-load',resolve));return {disabled,result:await popup.webContents.executeJavaScript('confirm("Enable ads from extension?")')};}finally{popup.destroy();session.extensions.removeExtension(extension.id);}},extension);
 assert.deepEqual(extensionResult,{disabled:true,result:false});
 // Host-owned approvals remain available; the page preference is not global.
 assert.notEqual(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('http://127.0.0.1:')).webContents.getLastWebPreferences().disableDialogs),true);
 console.log(JSON.stringify({passed:true,foregroundAndBackgroundSuppressed:true,repeatedDialogsSuppressed:true,iframeSuppressed:true,extensionSuppressed:true,shellInteractive:true,htmlDialogRetained:true,unsavedPageProtectionRetained:true,copyTabIdAbovePersist:true,copiedClickedTabId:true,persistenceUnchanged:true,hostApprovalsUnchanged:true}));
}finally{
 if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),10000);try{await app.close();}finally{clearTimeout(timer);}}
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await fixture.cleanup();
}
