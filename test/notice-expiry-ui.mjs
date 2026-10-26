// The native overlay must expire even when the renderer's clock cannot advance.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-notice-expiry-'));let app;
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_APP_PATH?{executablePath:process.env.PROTEUS_TEST_APP_PATH}:{}),args:[...(!process.env.PROTEUS_TEST_APP_PATH?['.']:[]),'--use-mock-keychain','--user-data-dir='+path.join(home,'browser')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();await page.locator('#tab-add-menu').waitFor();
 await page.clock.install();await page.clock.pauseAt(new Date());
 await page.evaluate(()=>{document.dispatchEvent(new CustomEvent('proteus-notice',{detail:{message:'Synthetic chat completed',actions:[{label:'Open chat',run:()=>{window.expiryActionInvoked=true;}}]}}));});
 const until=async fn=>{for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Native notice checkpoint timed out');};
 const visible=()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().some(w=>w.webContents.getURL().endsWith('/notice.html')&&w.isVisible()));
 await until(visible);const started=Date.now();
 await new Promise(r=>setTimeout(r,4300));assert.equal(await visible(),true,'Notification remains actionable before its five-second lifetime');
 await until(async()=>!await visible());assert.ok(Date.now()-started<6200,'Native owner expires the notice without renderer timers');
 assert.equal(await page.evaluate(()=>window.expiryActionInvoked===true),false,'Expiry never invokes Open chat');
 await app.evaluate(({BrowserWindow})=>{const overlay=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/notice.html')),parent=overlay.getParentWindow();parent.hide();parent.showInactive();});
 assert.equal(await visible(),false,'Showing the parent cannot resurrect an expired notification');
 const expiryObservedMs=Date.now()-started;
 await page.evaluate(()=>{document.dispatchEvent(new CustomEvent('proteus-notice',{detail:{message:'Synthetic slow action',actions:[{label:'Open synthetic chat',run:()=>new Promise(resolve=>window.resolveNoticeAction=resolve)}]}}));document.dispatchEvent(new CustomEvent('proteus-notice',{detail:{message:'Synthetic next notification'}}));});
 await until(visible);const popup=app.windows().find(p=>p.url().endsWith('/notice.html'));
 await popup.getByRole('button',{name:'Open synthetic chat',exact:true}).click();
 await until(()=>page.evaluate(()=>typeof window.resolveNoticeAction==='function'));
 await popup.getByRole('status').filter({hasText:'Synthetic next notification'}).waitFor({timeout:6500});
 await page.evaluate(()=>window.resolveNoticeAction());await new Promise(r=>setTimeout(r,150));
 assert.equal(await visible(),true,'A completed action from the expired notice cannot dismiss the next notification');
 assert.equal(await popup.getByRole('status').innerText(),'Synthetic next notification');
 console.log(JSON.stringify({passed:true,synthetic:true,rendererClockPaused:true,lifetimeMs:5000,expiryObservedMs,actionNotInvoked:true,noResurrection:true,queuedNoticeSurvivesOlderAction:true}));
}finally{if(app){const timeout=setTimeout(()=>app.process().kill('SIGKILL'),10000);await app.close().catch(()=>{});clearTimeout(timeout);}fs.rmSync(home,{recursive:true,force:true});}
