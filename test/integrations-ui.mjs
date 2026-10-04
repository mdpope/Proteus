import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-features-ui-'));
const pipeline=path.join(home,'native');fs.mkdirSync(pipeline);fs.mkdirSync(path.join(pipeline,'logs'));fs.mkdirSync(path.join(home,'automations'));
fs.writeFileSync(path.join(pipeline,'config.json'),JSON.stringify({state_dir:pipeline}));fs.writeFileSync(path.join(pipeline,'omi_worker.py'),'# Synthetic, do not execute');
fs.writeFileSync(path.join(pipeline,'logs/launchd.out.log'),JSON.stringify({free_bytes:123456,processed:3,token:'synthetic-secret',transcript:'private synthetic text'})+'\n');
let app;
try{
 app=await electron.launch({cwd:root,args:[root,'--user-data-dir='+path.join(home,'browser')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('heading',{name:'Work that keeps moving.'}).waitFor();
 await page.route('**/api/usage',route=>route.fulfill({json:{providers:{
  copilot:{provider:'copilot',windows:[{id:'premium',label:'Premium requests',remainingPercent:82,resetAt:'2030-01-01T00:00:00Z'}],checkedAt:new Date().toISOString()},
  codex:{provider:'codex',windows:[{id:'primary',label:'Five-hour window',remainingPercent:74,resetAt:'2030-01-01T12:00:00Z'},{id:'weekly',label:'Weekly',remainingPercent:65}],checkedAt:new Date().toISOString()},
  claude:{provider:'claude',windows:[],error:'Synthetic account not signed in'}
 }}}));
 await page.locator('[data-usage-provider="codex"]').click();await page.locator('#usage-refresh').click();
 await page.getByText('74% remaining',{exact:true}).waitFor();await page.getByText('65% remaining',{exact:true}).waitFor();await page.getByText('Resets ',{exact:false}).waitFor();
 await page.locator('#usage-close').click();assert.match(await page.locator('[data-usage-provider="codex"]').innerText(),/65%/);assert.match(await page.locator('[data-usage-provider="claude"]').innerText(),/—/);

 await app.evaluate(async({app},{pipeline,home})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();const s=service.omi.getSettings();await service.omi.saveSettings({...s,pipelineRoot:pipeline,configPath:pipeline+'/config.json',workerPath:pipeline+'/omi_worker.py',pythonPath:process.execPath,automationRoot:home+'/automations'},s.revision);},{pipeline,home});
 await page.locator('[data-page="omi"]').click();
 await page.getByText('Observation mode · execution disabled',{exact:true}).waitFor();
 await page.screenshot({path:path.join(os.tmpdir(),'proteus-omi-overview.png')});
 await page.getByRole('tab',{name:'Settings',exact:true}).click();
 await page.locator('[name="timeoutMinutes"]').fill('90');
 await page.getByRole('tab',{name:'Overview',exact:true}).click();
 await page.getByRole('tab',{name:'Settings',exact:true}).click();
 assert.equal(await page.locator('[name="timeoutMinutes"]').inputValue(),'90');
 await page.getByRole('button',{name:'Discard draft'}).click();
 await page.getByRole('tab',{name:'Schedules',exact:true}).click();
 await page.getByRole('button',{name:'Prepare disabled schedules'}).click();
 await page.locator('[data-omi-schedule="omi-audio-worker"]').waitFor();
 const schedules=await page.evaluate(async()=> (await fetch('/api/state').then(r=>r.json())).schedules.filter(s=>s.integration?.type==='omi'));
 assert.equal(schedules.length,3);assert.ok(schedules.every(s=>!s.enabled));
 await page.locator('[data-omi-schedule="omi-audio-worker"]').click();
 await page.locator('#managed-cron').fill('*/5 * * * *');await page.locator('#managed-timezone').focus();
 await app.evaluate(async({app})=>{const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService(); const saved=s.engine.schedules.get('omi-audio-worker'); const fs=process.mainModule.require('node:fs'),path=process.mainModule.require('node:path');fs.writeFileSync(path.join(s.home,'schedules/omi-audio-worker.json'),JSON.stringify({...saved,name:'Omi external rename'}));s.engine.emit('change');});
 await page.locator('#managed-timezone').blur();
 await page.getByText('The schedule changed outside Proteus.',{exact:false}).waitFor();
 assert.equal(await page.locator('#managed-cron').inputValue(),'*/5 * * * *');
 await page.locator('#managed-save').click();await page.getByText('This file changed outside the app. Reload before saving.',{exact:true}).waitFor();
 await page.locator('#managed-reload').click();await page.locator('#managed-run').click();
 await page.getByText('Omi processing is disabled in Proteus. Existing native services retain ownership.',{exact:true}).waitFor();
 await page.locator('[data-page="omi"]').click();await page.getByRole('tab',{name:'Logs',exact:true}).click();
 await page.getByRole('button',{name:'Read recent metadata'}).click();await page.getByText('123456',{exact:false}).waitFor();
 assert.ok(!(await page.locator('#omi-log-output').innerText()).includes('synthetic-secret'));
 assert.equal(await page.locator('[data-page="life"]').count(),0);
 assert.equal(await page.locator('#topbar').count(),0);
 assert.equal(await page.locator('#tabs .tab-actions button').count(),3);
 await page.locator('[data-page="schedules"]').click();
 assert.equal(await page.locator('[data-tab="feature-omi"]').count(),1);
 await page.locator('[data-tab="feature-omi"]').click();
 await page.getByRole('tab',{name:'Logs',exact:true}).waitFor();
 await page.reload();await page.locator('[data-tab="feature-omi"]').waitFor();
 await page.locator('#hide-usage').click();await page.locator('#provider-usage').waitFor({state:'hidden'});
 await page.reload();await page.locator('[data-page="settings"]').click();
 assert.equal(await page.locator('#settings-show-usage').isChecked(),false);
 await page.locator('#settings-show-usage').check();await page.locator('#save-settings').click();
 await page.locator('#provider-usage').waitFor({state:'visible'});

 // Real WebContentsView must disappear while the HTML file picker is modal.
 await app.evaluate(async({app},{home})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();const fs=process.mainModule.require('node:fs');fs.mkdirSync(home+'/workspace/Nested',{recursive:true});fs.writeFileSync(home+'/workspace/Nested/Existing.md','# Existing note');const config=service.context.config();service.context.mutate(value=>{value.workspaces[0].cwd=home+'/workspace';value.workspaces[0].additionalDirectories=[];},config.revision);},{home});
 await page.locator('#browser').click();await page.locator('#browser-area').waitFor();
 await page.waitForFunction(()=>document.querySelector('#browser-area').getBoundingClientRect().height>100);
 const browserTabId=await page.locator('.tabitem.selected [data-tab]').getAttribute('data-tab');
 const visibleViews=()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.getTitle().includes('Proteus')).contentView.children.filter(view=>view.getVisible()).length);
 assert.equal(await visibleViews(),1); // Prove a native browser view was actually showing.
 await page.locator('#markdown').click();await page.locator('#md-root').waitFor();
 await page.locator('[data-md-path="Nested"]').click();await page.getByRole('tab',{name:'New file',exact:true}).click();
 await page.locator('#md-file-name').fill('Test note');await page.getByText('Initial content (optional)',{exact:true}).click();await page.locator('#md-content').fill('# Synthetic note');
 await page.locator('#md-folder-name').fill('New child');await page.locator('#md-create-folder').click();
 await page.getByText('Folder created. New files will be saved here.',{exact:true}).waitFor();
 assert.equal(await page.locator('#md-file-name').inputValue(),'Test note');
 assert.equal(await visibleViews(),0); // contentView children are native browser views only.
 assert.equal(await page.locator('#md-file-name').isVisible(),true);
 assert.equal(await page.locator('#dialog').evaluate(dialog=>dialog.scrollWidth<=dialog.clientWidth+1),true,'Picker must not overflow horizontally');
 assert.equal(await page.locator('#markdown-picker').evaluate(host=>host.getBoundingClientRect().left>=host.closest('dialog').getBoundingClientRect().left),true,'Picker left edge must remain visible');
 await page.screenshot({path:path.join(os.tmpdir(),'proteus-markdown-picker.png')});
 await page.locator('#dialog-submit').click();await page.getByRole('heading',{name:'Test note.md',exact:true}).waitFor();
 assert.equal(fs.readFileSync(path.join(home,'workspace/Nested/New child/Test note.md'),'utf8'),'# Synthetic note');
 await page.locator('#markdown').click();await page.locator('[data-md-path="Nested"]').click();await page.locator('[data-md-path="Nested/Existing.md"]').click();await page.locator('#dialog-submit').click();
 await page.getByRole('heading',{name:'Existing.md',exact:true}).waitFor();
 assert.equal(await page.locator('[data-tab^="markdown:"]').count(),2);
 fs.writeFileSync(path.join(home,'workspace/Nested/Existing.md'),'# Updated externally');
 await page.locator('#markdown').click();await page.locator('[data-md-path="Nested"]').click();await page.locator('[data-md-path="Nested/Existing.md"]').click();await page.locator('#dialog-submit').click();
 await page.getByRole('heading',{name:'Updated externally',exact:true}).waitFor();
 assert.equal(await page.locator('[data-tab^="markdown:"]').count(),2,'Reopening refreshes the existing tab');
 // Existing browser tab remains usable, and cancelling a dialog restores its view.
 await page.locator('[data-tab="'+browserTabId+'"]').click();
 await page.locator('#browser-area').waitFor();
 await page.waitForFunction(()=>document.querySelector('#browser-area').getBoundingClientRect().height>100);
 assert.equal(await visibleViews(),1);
 await page.locator('#markdown').click();await page.locator('#md-root').waitFor();
 assert.equal(await visibleViews(),0);
 await page.locator('#close-dialog').click();
 await page.waitForTimeout(100);assert.equal(await visibleViews(),1);
 await page.locator('[data-page="providers"]').click();await page.getByRole('heading',{name:'Claude',exact:true}).waitFor();
 await page.locator('#new-chat').click();await page.locator('#chat-provider').selectOption('claude');assert.equal(await page.locator('#chat-provider').inputValue(),'claude');await page.locator('#close-dialog').click();
 // A late allowance refresh must not replace a newly opened chat dialog.
 let releaseUsage,usageEntered;const usageGate=new Promise(resolve=>releaseUsage=resolve),usageStarted=new Promise(resolve=>usageEntered=resolve);
 await page.route('**/api/usage',async route=>{usageEntered();await usageGate;await route.fallback();});
 await page.locator('[data-usage-provider="codex"]').click();await page.locator('#usage-refresh').click();await usageStarted;
 await page.locator('#usage-close').click();await page.locator('#new-chat').click();await page.locator('#chat-prompt').fill('Preserve this synthetic draft');
 releaseUsage();await page.waitForTimeout(200);
 assert.equal(await page.locator('#chat-prompt').inputValue(),'Preserve this synthetic draft');
 await page.locator('#close-dialog').click();
 // Exercise full-shell Life wiring with a real database created only in this fixture.
 await app.evaluate(async({app})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();const plan=await service.life.planSetup({mode:'local-new',ownerName:'Synthetic owner',ownerEmail:'fixture@example.test',workspaceName:'Synthetic personal records'});await service.life.applySetup({planId:plan.planId,confirmation:'APPLY'});});
 await page.reload();await page.locator('[data-page="life"]').waitFor();
 await page.locator('[data-page="life"]').click();await page.getByRole('heading',{name:'Life',exact:true}).waitFor();
 await page.locator('[data-life-section="overview"]').click();
 await page.getByRole('heading',{name:'Your personal records',exact:true}).waitFor();
 assert.equal(await page.locator('#life-page iframe').count(),0,'Life is native app content');
 await page.locator('[data-usage-provider="codex"]').click();await page.locator('#usage-refresh').click();await page.getByText('65% remaining',{exact:true}).waitFor();await page.locator('#usage-close').click();
 assert.match(await page.locator('[data-usage-provider="codex"]').innerText(),/65%/);
 await page.screenshot({path:path.join(os.tmpdir(),'proteus-life-shell.png')});
 await page.locator('[data-page="schedules"]').click();
 assert.equal(await page.locator('[data-tab="feature-life"]').count(),1);
 await page.locator('[data-tab="feature-omi"]').click();await page.getByRole('tab',{name:'Overview',exact:true}).waitFor();
 assert.equal(await page.locator('[data-tab="feature-life"]').count(),1);
 await page.locator('#new-chat').click();await page.locator('#chat-prompt').fill('Synthetic unsent chat');
 assert.equal(await page.locator('[data-tab="feature-life"]').count(),1);await page.locator('#close-dialog').click();
 await page.locator('[data-tab="feature-life"]').click();await page.getByRole('heading',{name:'Your personal records',exact:true}).waitFor();
 await page.reload();await page.locator('[data-tab="feature-life"]').waitFor();await page.locator('[data-tab="feature-omi"]').waitFor();
 await page.locator('[data-page="settings"]').click();await page.locator('#life-enabled').waitFor();assert.equal(await page.locator('#life-enabled').isChecked(),true);
 await page.locator('#life-enabled').uncheck();await page.locator('[data-page="life"]').waitFor({state:'detached'});await page.locator('[data-tab="feature-life"]').waitFor({state:'detached'});
 assert.equal(await page.locator('[data-tab="feature-omi"]').count(),1);
 await page.reload();await page.locator('[data-tab="feature-omi"]').waitFor();
 assert.equal(await page.locator('[data-page="life"]').count(),0);assert.equal(await page.locator('[data-tab="feature-life"]').count(),0);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['Omi disabled gate','five sections','settings draft persistence','three paused native schedules','managed stale-edit preservation','private logs withheld','Life opt-in visibility','persistent Omi tab','usage visibility persistence','compact icon tab actions','browser modal visibility','nested Markdown folders and multiple files','Markdown modal fits','explicit Markdown reopen refreshes','late usage refresh preserves other dialogs','Claude selection','native Life shell','Life and Omi tabs coexist','both feature tabs restore','Life disable removes only Life']}));
}finally{if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
