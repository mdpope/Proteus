// Actual desktop renderer and owner API; provider requests are explicitly synthetic.
// No real provider login, model turn or external command is performed.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-preview-permissions-ui-'))),previewRoot=path.join(root,'preview');let app,page;
const source=path.resolve('.'),moduleURL=file=>pathToFileURL(path.join(source,file)).href;
const until=async(check,label)=>{const end=Date.now()+15000;while(Date.now()<end){const result=await check();if(result)return result;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
try{
 const host=path.join(root,'host.cjs');fs.writeFileSync(host,`
const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.commandLine.appendSwitch('use-mock-keychain');let service,closing=false;
app.whenReady().then(async()=>{
 const {initializePreviewRoot,preparePreviewFixtures}=require(${JSON.stringify(path.join(source,'desktop/preview-runtime.cjs'))});
 const locations=initializePreviewRoot(${JSON.stringify(previewRoot)}),workFolders=preparePreviewFixtures(locations);
 const {seedDesktopPreview}=await import(${JSON.stringify(moduleURL('src/desktop-preview.js'))});await seedDesktopPreview({home:locations.home,workFolders});
 const {startServer}=await import(${JSON.stringify(moduleURL('src/server.js'))});
 service=await startServer({home:locations.home,port:0,timers:false,withSeed:false,desktopPreview:{codexHome:locations.codexHome},providers:{codex:{status:async()=>({provider:'codex',available:true,models:[{id:'synthetic-model',name:'Synthetic model',isDefault:true,controls:{reasoningEfforts:[],contextTiers:[{id:'default'}],serviceTiers:[]}}]}),run:async({run,ask,emit})=>{
 if(!run.providerSessionId){run.providerSessionId='synthetic-session';const file=path.join(run.schedule.workspace.cwd,'permission-ui.txt');const answer=await ask({type:'permission',question:'Synthetic file edit',details:{kind:'write',fileName:file,intention:'Write a synthetic test file'}});if(['approve','approve-auto'].includes(answer))fs.writeFileSync(file,'synthetic approved edit');}
 else for(let i=0;i<2;i++)await ask({type:'permission',question:'Synthetic command',details:{kind:'shell',fullCommandText:'synthetic-inspection --sample'}});
 emit('assistant','Synthetic request completed; no model or command executed.');
 }}}});
 const window=new BrowserWindow({width:1440,height:1000,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});await window.loadURL(service.url);
});app.on('before-quit',event=>{if(closing||!service)return;event.preventDefault();closing=true;service.close().finally(()=>app.quit());});
`);
 app=await electron.launch({args:[host,`--user-data-dir=${path.join(root,'electron')}`]});page=await app.firstWindow();page.setDefaultTimeout(20000);
 const api=route=>page.evaluate(async route=>(await fetch(route)).json(),route);
 await page.locator('[data-preview-open-project]').filter({hasText:'Design review'}).click();await page.locator('[data-preview-new-chat]').click();
 await page.locator('#chat-title').fill('Synthetic permissions test');await page.locator('#chat-prompt').fill('Synthetic permission request');await page.locator('#dialog-submit').click();
 await page.locator('.pending .preview-approval-request').waitFor();assert.equal(await page.locator('.pending details').count(),0);assert.equal(await page.locator('.pending').getByRole('button',{name:'Allow once',exact:true}).count(),1);
 await page.locator('#followup').fill('Keep this draft while permissions change');
 assert.equal(await page.locator('#preview-composer-permissions').count(),0);assert.equal(await page.locator('#dialog').evaluate(el=>el.open),false);assert.equal(await page.locator('[data-preview-permissions]').isVisible(),true);
 assert.equal(await page.locator('[data-preview-permissions] details').count(),0);assert.match(await page.locator('[data-preview-permissions]').innerText(),/No saved folders/);assert.equal(await page.locator('[data-preview-permissions] [data-save-permissions]').count(),0);assert.equal(await page.getByText('Bounded Autopilot · unavailable',{exact:true}).count(),0);
 await page.locator('[data-preview-permission-help]').click();assert.match(await page.locator('#dialog').innerText(),/requests? received from the provider/);await page.locator('#close-dialog').click();
 await page.locator('[data-preview-remember]').click();assert.equal(await page.locator('[data-preview-remember-choice=trust-folder-chat]').count(),1);await page.locator('[data-preview-remember-choice=trust-folder-chat]').click();await page.locator('#dialog-submit').click();
 const run=await until(async()=>{const state=await api('/api/state');const value=state.runs.find(item=>item.title==='Synthetic permissions test');return value?.status==='completed'&&value;},'approved file turn');
 assert.equal(fs.readFileSync(path.join(run.schedule.workspace.cwd,'permission-ui.txt'),'utf8'),'synthetic approved edit');assert.equal(run.chatPermission.folders[0].access,'read-write');assert.equal(await page.locator('#followup').inputValue(),'Keep this draft while permissions change');
 await page.locator('[data-preview-add-folder]').click();const helper=path.join(previewRoot,'workspaces','inbox');await page.locator('#preview-folder-path').fill(helper);await page.locator('#dialog-submit').click();
 await until(async()=>{const state=await api('/api/state');return state.runs.find(item=>item.id===run.id)?.chatPermission?.folders.some(folder=>folder.path===helper&&folder.access==='read');},'chat read grant');
 await page.locator('[data-revoke-chat-folder]').filter({hasText:'Revoke'}).last().click();await until(async()=>{const state=await api('/api/state');return !state.runs.find(item=>item.id===run.id)?.chatPermission?.folders.some(folder=>folder.path===helper);},'chat grant revoked');
 await page.locator('[data-preview-chat-mode=ask]').click();await until(async()=>await page.locator('[data-preview-chat-mode=ask]').getAttribute('aria-pressed')==='true','Ask override');assert.equal(await page.locator('[data-preview-read-only]').isDisabled(),true);assert.equal(await page.locator('#followup').inputValue(),'Keep this draft while permissions change');
 await page.locator('[data-preview-chat-mode=custom]').click();await until(async()=>await page.locator('[data-preview-chat-mode=custom]').getAttribute('aria-pressed')==='true','Saved override');
 await page.locator('[data-preview-read-only]').check();await until(async()=>await page.locator('[data-preview-read-only-inherit]').count()===1,'read-only override');await page.locator('[data-preview-read-only-inherit]').click();await until(async()=>await page.locator('[data-preview-read-only-inherit]').count()===0,'read-only inherited');
 await page.locator('[data-preview-chat-mode=inherit]').click();await until(async()=>await page.locator('[data-preview-chat-mode=inherit]').getAttribute('aria-pressed')==='true','inherited mode');
 await page.locator('#followup').fill('Continue synthetic operation');await page.locator('#continue').click();await page.locator('[data-preview-remember]').waitFor();await page.locator('[data-preview-remember]').click();assert.deepEqual(await page.locator('[data-preview-remember-choice]').evaluateAll(items=>items.map(item=>item.dataset.previewRememberChoice)),['always-tool-chat','always-tool']);await page.locator('[data-preview-remember-choice=always-tool-chat]').click();await page.locator('#dialog-submit').click();
 const finished=await until(async()=>{const state=await api('/api/state');const value=state.runs.find(item=>item.id===run.id);return value?.status==='completed'&&value.automaticApprovals>0&&value;},'saved command reused');
 assert.ok(finished.events.some(event=>event.data?.permission?.automatic===true&&event.data.permission.kind==='shell'));assert.equal(await page.locator('.pending').count(),0);assert.equal(finished.chatPermission.rules.length,1);await page.locator('[data-preview-revoke-rule]').click();await until(async()=>{const state=await api('/api/state');return !state.runs.find(item=>item.id===run.id)?.chatPermission?.rules?.length;},'chat rule removed');
 await page.locator('[data-preview-permissions]').scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/proteus-permission-controls-chat.png'});
 await page.locator('[data-preview-workspace-permissions]').click();await page.locator('[data-config-section=approvals][open]').waitFor();assert.match(await page.locator('[data-config-section=approvals]').innerText(),/Studio/);
 const working=page.locator('[data-working-access]').first();await working.selectOption('read-write');await page.locator('[data-approval-mode]').selectOption('custom');await page.locator('[data-workspace-read-only]').check();await page.locator('[data-save-approvals]').click();await until(async()=>{const state=await api('/api/state');const profile=state.context.workspaces.find(item=>item.id===run.schedule.context.workspaceId);return profile.approvals.mode==='custom'&&profile.approvals.readOnlyTools&&profile.approvals.folders.some(folder=>folder.path===profile.cwd&&folder.access==='read-write');},'workspace approved working folder');
 await page.locator('[data-working-access]').first().scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/proteus-permission-controls-workspace.png'});
 console.log(JSON.stringify({passed:true,synthetic:true,checks:['single permissions sidebar without composer duplicate','compact request and separate Help','chat folder remember/Add/Revoke use real owner API','draft preserved','inline Ask/Saved/workspace modes and read-only override preserve draft','Remember exact command reuses saved rule','workspace link opens captured configuration']}));
}catch(error){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error('Synthetic UI failure evidence: '+root);throw error;}finally{await app?.close();fs.rmSync(root,{recursive:true,force:true});}
