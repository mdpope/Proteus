import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-computer-status-')),appHome=path.join(home,'data'),workspace=path.join(home,'workspace');
fs.mkdirSync(appHome);fs.mkdirSync(workspace);fs.writeFileSync(path.join(appHome,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
let app;try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PORT:'0',PROTEUS_HOME:appHome}});const page=await app.firstWindow();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let running=true,hostPlatform='linux';await page.route('**/api/state*',async route=>{const response=await route.fetch(),data=await response.json();data.hostName='Synthetic Office PC';if(hostPlatform)data.hostPlatform=hostPlatform;else delete data.hostPlatform;data.runs=[['user','running'],['internet','running'],['scheduled','running'],['waiting','awaiting_input'],['queue','queued'],['done','completed']].map(([id,status])=>({id,title:id,trigger:id==='scheduled'?'schedule':'chat',chatType:id==='internet'?'internet':'user',status:status==='running'&&!running?'completed':status,createdAt:new Date().toISOString(),schedule:{provider:'rehearsal'}}));await route.fulfill({response,json:data});});
 for(const [platform,label]of [['linux','Linux'],['darwin','macOS'],[null,'']]){hostPlatform=platform;await page.reload();await page.getByRole('heading',{name:'On Synthetic Office PC'+(label?' · '+label:''),exact:true}).waitFor();assert.match(await page.locator('.home-desktop').innerText(),/background when you close its window/);}
 await page.reload();await page.waitForFunction(()=>document.querySelector('[data-page=runs] .count')?.textContent==='3');
 assert.match(await page.locator('.sidebottom').innerText(),/Synthetic Office PC/);
 await page.locator('[data-page=context]').click();await page.locator('[data-workspace-list]').waitFor();assert.match(await page.locator('[data-workspace-list]').innerText(),/Synthetic Office PC/);
 await page.locator('[data-workspace-configure]').first().click();await page.locator('[data-starting-folder]').waitFor();assert.match(await page.locator('#main>.heading').innerText(),/Synthetic Office PC/);
 running=false;await page.waitForFunction(()=>document.querySelector('[data-page=runs] .count')?.textContent==='0');
 await page.locator('#tab-add-menu summary').click();await page.locator('#new-chat').click();assert.equal(await page.locator('#chat-destination option[value=""]').innerText(),'Synthetic Office PC');await page.locator('#close-dialog').click();
 assert.deepEqual(errors,[]);console.log('PASS authenticated Linux/macOS/legacy Home labels; configured computer label in shell/workspace/chat destination; running-only ALL categories badge updates inside workspace configuration');
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
