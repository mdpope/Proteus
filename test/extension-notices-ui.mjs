// Synthetic missing native host only: no password manager, vault or live profile is used.
import {_electron as electron} from 'playwright';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-extension-notice-ui-'));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{},appearance:{showProviderUsage:false}}));
let app,page;
const start=async()=>{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 await app.evaluate(async({app,session})=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
  await browser.extensions.initialize('default',browser.sessionFor('default'));
  await browser.extensions.initialize('synthetic-notice-other',session.fromPartition('persist:synthetic-native-notice'));
  const extension={id:'a'.repeat(32),name:'iCloud Passwords',manifest:{permissions:['nativeMessaging']}},send=browser.actions.send.bind(browser.actions);
  globalThis.noticeRehearsal={sent:0,attempts:0};browser.actions.send=value=>{if(value.type==='notice'&&value.message.startsWith(extension.name))globalThis.noticeRehearsal.sent++;send(value);};
  globalThis.failNativeNotice=async profile=>{
   const host=browser.extensions.profiles.get(profile);host.adapter.api.permissions.permissionMap.set(extension.id,{permissions:['nativeMessaging'],origins:[]});
   globalThis.noticeRehearsal.attempts++;
   try{await host.adapter.ctx.router.handlers.get('runtime.sendNativeMessage').callback({extension,sender:browser.window.webContents},'com.proteus.synthetic.nonexistent_host',{});throw Error('Synthetic missing host unexpectedly connected');}
   catch(error){if(error.message==='Synthetic missing host unexpectedly connected')throw error;}
  };
 });
};
const fail=profile=>app.evaluate((_,profile)=>globalThis.failNativeNotice(profile),profile);
const notice=()=>app.windows().find(window=>window.url().endsWith('/desktop/features/notifications/notice.html'));
const visible=()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(window=>window.webContents.getURL().endsWith('/desktop/features/notifications/notice.html')&&window.isVisible()).length);
try{
 await start();await fail('default');
 for(let i=0;i<50&&!notice();i++)await page.waitForTimeout(100);
 const popup=notice();assert.ok(popup);await popup.getByRole('status').filter({hasText:'iCloud Passwords could not connect'}).waitFor();assert.equal(await visible(),1);
 await popup.screenshot({path:'/private/tmp/proteus-extension-once-notice.png'});
 await popup.getByRole('button',{name:'Dismiss notification'}).click();await page.waitForTimeout(150);assert.equal(await visible(),0);
 await fail('default');await fail('synthetic-notice-other');await page.reload();await page.locator('#topbar-home').waitFor();await fail('default');
 assert.deepEqual(await app.evaluate(()=>globalThis.noticeRehearsal),{sent:1,attempts:4});assert.equal(await visible(),0);
 await app.close();app=null;await start();await fail('synthetic-notice-other');
 for(let i=0;i<50&&await visible()===0;i++)await page.waitForTimeout(100);
 assert.equal(await visible(),1,'Restart allows a fresh warning');await page.waitForTimeout(16000);assert.equal(await visible(),0,'The single notice expires normally');
 await fail('default');assert.deepEqual(await app.evaluate(()=>globalThis.noticeRehearsal),{sent:1,attempts:2});assert.equal(await visible(),0,'Background retry cannot revive an expired notice');
 console.log('PASS synthetic native failures: one notice across profiles, dismissal, shell reload, actual app restart and finite expiry; retries still execute');
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
