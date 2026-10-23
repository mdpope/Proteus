import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-notices-'));
const hostId='11111111-1111-4111-8111-111111111111';
fs.mkdirSync(path.join(home,'workspace'));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:path.join(home,'workspace'),additionalDirectories:[]},skillDirectories:[],mcpServers:{},appearance:{showProviderUsage:false}}));
let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('#tab-add-menu').waitFor();
 await app.evaluate(({ipcMain},hostId)=>{
   globalThis.noticeFixture={offline:false,reads:0};ipcMain.removeHandler('proteus:desktop-peers');
   ipcMain.handle('proteus:desktop-peers',(_event,value)=>{
     if(value.action==='list')return [{hostId,label:'Synthetic peer',status:globalThis.noticeFixture.offline?'reconnecting':'online'}];
     if(value.action==='request'&&value.method==='tabs.get'){globalThis.noticeFixture.reads++;if(globalThis.noticeFixture.offline)throw Error('Connect the selected Mac first. No local action was taken.');return {revision:1,tabs:[]};}
     return {};
   });
 },hostId);
 await page.evaluate(async hostId=>window.desktop.workspaceSession({action:'save',session:{schemaVersion:1,active:'overview',page:'home',tabs:[{id:'peer:'+hostId+':fixture',type:'remote-run',hostId,runId:'fixture',label:'Synthetic chat'}]}}),hostId);
 await page.reload();await page.locator('#tab-add-menu').waitFor();
 for(let i=0;i<50&&(await app.evaluate(()=>globalThis.noticeFixture.reads))===0;i++)await page.waitForTimeout(100);
 assert.ok(await app.evaluate(()=>globalThis.noticeFixture.reads)>0);
 const before=await app.evaluate(()=>{globalThis.noticeFixture.offline=true;return globalThis.noticeFixture.reads;});
 await page.waitForTimeout(4000);assert.ok(await app.evaluate(()=>globalThis.noticeFixture.reads)>before);assert.equal(await page.locator('#toast').isVisible(),false,'background disconnect does not raise a toast');
 await page.evaluate(async()=>{const {createToast}=await import('/shared/ui/toast.js');window.testNotice=createToast(document.querySelector('#toast'),{duration:700,repeatWindow:1200});window.testNotice("Error invoking remote method 'proteus:desktop-peers': Error: Reconnecting automatically.");});
 assert.equal(await page.locator('#toast [role=status]').innerText(),'Reconnecting automatically.');
 for(let i=0;i<4;i++){await page.waitForTimeout(220);await page.evaluate(()=>window.testNotice('Reconnecting automatically.'));}
 assert.equal(await page.locator('#toast').isVisible(),false,'duplicate notices do not reset expiry');
 await page.evaluate(()=>window.testNotice('A different notice'));await page.getByRole('button',{name:'Dismiss notification'}).click();
 await page.evaluate(()=>window.testNotice('A different notice'));assert.equal(await page.locator('#toast').isVisible(),false,'dismissed duplicate stays hidden');
 await page.evaluate(()=>window.testNotice('Keyboard notice'));await page.getByRole('button',{name:'Dismiss notification'}).focus();await page.keyboard.press('Escape');assert.equal(await page.locator('#toast').isVisible(),false);
 await page.evaluate(()=>window.testNotice('A new notice still appears'));assert.equal(await page.locator('#toast').isVisible(),true);await page.screenshot({path:'/private/tmp/proteus-connection-notice.png'});
 assert.deepEqual(errors,[]);console.log('PASS: background offline sync, finite expiry, duplicate suppression, mouse/keyboard dismissal, plain-language IPC errors');
}finally{if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
