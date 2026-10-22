// Official Apple extension, disposable profile. Never enter a pairing code or read a vault.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const until=async(fn)=>{for(let n=0;n<200;n++){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Apple extension state did not settle');};
try{
 app=await electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(30000);await page.locator('body.window-design-preview').waitFor();
 await page.locator('[data-page="engine"]').click();await page.locator('[data-engine-section="preferences"]').click();
 const panel=page.locator('[data-apple-passwords-panel]').first(),button=panel.locator('button');await button.filter({hasText:'Set up Apple Passwords…'}).waitFor();
 await app.evaluate(({app,dialog})=>{globalThis.appleOriginalDialog=dialog.showMessageBox;dialog.showMessageBox=async()=>({response:0});});
 await button.click();await until(async()=>!(await button.isDisabled()));assert.equal(await button.innerText(),'Set up Apple Passwords…','Cancel creates no installation');
 assert.equal(await app.evaluate(async({app})=>(await process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().command({action:'extensions-list',profileId:'default'})).length),0);
 await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1});const cp=process.mainModule.require('node:child_process'),spawn=cp.spawn;globalThis.appleProbe=[];cp.spawn=function(file,...args){const child=spawn.call(this,file,...args);if(String(file).endsWith('/PasswordManagerBrowserExtensionHelper')){const row={spawned:true};globalThis.appleProbe.push(row);child.on('exit',(code,signal)=>Object.assign(row,{code,signal}));}return child;};});
 await button.click();await button.filter({hasText:'Open Apple Passwords'}).waitFor();
 const popup=await until(()=>app.windows().find(page=>page.url().startsWith('chrome-extension://pejdijmoenmkgeppbflobdenhhabjlaj/page_popup.html?popupWindow=1')));
 await popup.locator('body').waitFor({state:'attached'});console.log('Popup DOM visibility',await popup.evaluate(()=>({body:getComputedStyle(document.body).display,visibility:getComputedStyle(document.body).visibility,opacity:getComputedStyle(document.body).opacity,rect:document.body.getBoundingClientRect().toJSON()})));await popup.waitForFunction(()=>/Enable Password AutoFill|verification code|requires macOS/i.test(document.body.innerText));
 const helper=await app.evaluate(({app})=>{const host=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().extensions.host('default');return {attempts:globalThis.appleProbe,connected:Object.values(host.adapter.api.runtime.hostMap).some(value=>value?.connected)};});
 assert.ok(helper.attempts.some(row=>row.spawned),'Official extension attempted to launch Apple’s helper');
 console.log('Native helper status (not credential acceptance)',JSON.stringify(helper));

 await popup.waitForFunction(()=>getComputedStyle(document.body).backgroundColor==='rgb(36, 49, 40)');
 assert.equal(await popup.locator('#fromiCloudPasswords').isVisible(),false,'Vendor window mode avoids a duplicate title');
 const appearance=await popup.evaluate(()=>({text:getComputedStyle(document.body).color,background:getComputedStyle(document.body).backgroundColor,input:getComputedStyle(document.querySelector('.PIN')).color}));assert.notEqual(appearance.text,appearance.background);assert.notEqual(appearance.input,appearance.background);assert.equal(await popup.locator('#divPIN').evaluate(el=>getComputedStyle(el).opacity),'1','Visible controls do not fade out during helper retries');
 const bounds=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('chrome-extension://pejdijmoenmkgeppbflobdenhhabjlaj/'));return w?.getBounds();});assert.ok(bounds.height<300,'Popup fits its contents instead of a 600px white panel');
 await popup.screenshot({path:'/private/tmp/proteus-apple-passwords-pairing.png'});
 if(!popup.isClosed()){try{await popup.keyboard.press('Escape');}catch(error){if(!popup.isClosed())throw error;}}await until(()=>popup.isClosed());
 await button.click();const reopened=await until(()=>app.windows().find(page=>page.url().startsWith('chrome-extension://pejdijmoenmkgeppbflobdenhhabjlaj/page_popup.html?popupWindow=1')));await reopened.locator('body').waitFor();
 const rows=await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().command({action:'extensions-list',profileId:'default'}));assert.equal(rows.length,1);assert.equal(rows[0].id,'pejdijmoenmkgeppbflobdenhhabjlaj');
 await app.evaluate(({dialog})=>{dialog.showMessageBox=globalThis.appleOriginalDialog;delete globalThis.appleOriginalDialog;});
 console.log('PASS Apple Passwords permission-review cancellation, official store install/identity, Apple helper startup attempt, readable themed/content-sized setup screen and reopen without duplicate installation. Pairing, credential fill/save and passkeys intentionally require separate human acceptance.');
}finally{if(app){app.process().kill('SIGKILL');await app.close().catch(()=>{});}await fixture.cleanup();}
