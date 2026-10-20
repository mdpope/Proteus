// Synthetic startup regression: distinct local browser views can share a persisted descriptor.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-duplicate-restore-')));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
let app,page;const errors=[];
async function launch(){app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.stack));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});await page.locator('#topbar-home').waitFor();}
async function close(){if(!app)return;const current=app;app=null;const timer=setTimeout(()=>current.process().kill('SIGKILL'),5000);try{await current.close();}finally{clearTimeout(timer);}}
try{
 await launch();
 const seeded=await app.evaluate(async({app})=>{const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();const ids=[];for(const name of ['First synthetic chat','Other synthetic chat']){const schedule=await s.buildChatSchedule({workspaceId:'default',provider:'rehearsal',prompt:'Synthetic startup only',name});const run=await s.engine.createRun(schedule,'chat',null,{deferStart:true});ids.push(run.id);}return ids;});
 await close();
 const [one,two]=seeded,workspace='workspace:local:default',alias=workspace+':chat:'+one;
 const tabs=[{id:'overview',type:'overview',label:'Home'},{id:one,type:'run',label:'First synthetic chat'},{id:two,type:'run',label:'Other synthetic chat'},{id:workspace,type:'workspace',workspaceId:'default',label:'Synthetic workspace'},{id:alias,type:'run',runId:one,parentId:workspace,label:'First synthetic chat'},...['view-a','view-b'].map(id=>({id,type:'browser',contentTabId:'shared-browser',parentId:one,url:'https://example.test/synthetic',label:id,unloaded:true})),{id:'other-parent-view',type:'browser',contentTabId:'shared-browser',parentId:two,url:'https://example.test/other',label:'Other parent',unloaded:true}];
 fs.writeFileSync(path.join(home,'desktop-workspace.json'),JSON.stringify({schemaVersion:1,tabs,active:alias,page:'runs',selectedChildren:{[workspace]:alias}}));
 await launch();
 // Catch the original stack behind a toast without modifying production modules on disk.
 await page.route('**/app.js',async route=>{const response=await route.fetch();let body=await response.text();body=body.replaceAll('toast(error.message)','(console.error(error.stack),toast(error.message))').replaceAll('toast(e.message)','(console.error(e.stack),toast(e.message))');await route.fulfill({response,body});});
 await page.reload();
 await page.locator(`[data-tab="${workspace}"]`).waitFor();
 await page.waitForTimeout(2400);
 const toastText=await page.locator('.toast').allTextContents();
 assert.ok(!toastText.some(text=>/Cannot read properties/.test(text)),JSON.stringify({toastText,errors}));
 assert.ok(!errors.some(text=>/Cannot read properties/.test(text)),errors.join('\n'));
 const session=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 assert.ok(session.tabs.every(Boolean));
 assert.equal(session.tabs.filter(tab=>tab.type==='browser'&&tab.parentId===one).length,2,'Both restored local views retained');
 assert.equal(session.tabs.filter(tab=>tab.type==='browser'&&tab.parentId===two).length,1,'Other parent remains independent');
 // Trigger another apply cycle after startup; the persisted duplicate aliases must stay intact.
 await app.evaluate(async({app},id)=>{const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();const before=await s.contentTabs.getAsync('chat',id);await s.contentTabs.mutateAsync({scope:'chat',id,expectedRevision:before.revision,operations:[{action:'open',tab:{...before.tabs.find(tab=>tab.id==='shared-browser'),title:'Shared synthetic title'}}]});},one);
 await page.waitForTimeout(1700);
 const after=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 assert.equal(after.tabs.filter(tab=>tab.type==='browser'&&tab.parentId===one).length,2);
 assert.equal(after.tabs.filter(tab=>tab.type==='browser'&&tab.parentId===two).length,1);
 assert.ok(!errors.some(text=>/Cannot read properties/.test(text)),errors.join('\n'));
 await page.screenshot({path:'/private/tmp/proteus-duplicate-content-restore.png'});
 console.log(JSON.stringify({passed:true,synthetic:true,bothLocalAliasesRetained:true,otherParentUnaffected:true,startupAndSubsequentSync:true}));
}catch(error){console.error(error);console.error(errors.join('\n'));throw error;}finally{await close();fs.rmSync(home,{recursive:true,force:true});}
