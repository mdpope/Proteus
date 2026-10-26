// Disposable owner only: unsent search drafts and local display preferences.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const f=await sidebarFixture();let app,page;const errors=[];
const launch=async()=>{app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,CODEX_HOME:f.auth,PORT:'0'}});page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.locator('body.window-design-preview').waitFor();};
try{
 await launch();await page.locator('#internet-search').evaluate(el=>el.click());
 const setup=page.locator('#main [data-chat-setup]'),prompt=setup.locator('textarea[aria-label=Search]');await prompt.waitFor();
 assert.equal(await page.locator('dialog[open]').count(),0);const first=await setup.getAttribute('data-chat-setup');
 await prompt.fill('Synthetic search draft, never sent');assert.ok(await setup.locator('[data-search-provider]').count());
 await page.locator('#internet-search').evaluate(el=>el.click());await prompt.waitFor();const second=await setup.getAttribute('data-chat-setup');assert.notEqual(first,second);await prompt.fill('Independent second draft');
 await page.locator(`[data-tab-container="${first}"]`).click();assert.equal(await prompt.inputValue(),'Synthetic search draft, never sent');
 await page.reload();await prompt.waitFor();assert.equal(await prompt.inputValue(),'Synthetic search draft, never sent');
 await app.close();await launch();await page.locator('#main textarea[aria-label=Search]').waitFor();assert.equal(await page.locator('#main textarea[aria-label=Search]').inputValue(),'Synthetic search draft, never sent');
 const result=await page.evaluate(async()=>{
  const {renderUpdateCard}=await import('/features/settings/updates.js');const root=document.createElement('div');root.innerHTML='<div id="conversation-host"></div>';document.body.append(root);
  const job={id:'synthetic-complete-job',runId:'synthetic-chat',phase:'complete',outcome:'updated',continuation:{id:'once'}};
  const draw=()=>renderUpdateCard(root,{job},job.runId,String,()=>{});draw();const hadDismiss=!!root.querySelector('[data-dismiss-update-notice]');root.querySelector('[data-dismiss-update-notice]').click();draw();const staysDismissed=!root.querySelector('.update-chat-card');
  job.phase='attention';draw();const attentionVisible=!!root.querySelector('.update-chat-card')&&!root.querySelector('[data-dismiss-update-notice]');job.id='synthetic-other-job';job.phase='complete';draw();const nextVisible=!!root.querySelector('[data-dismiss-update-notice]');root.remove();return {hadDismiss,staysDismissed,attentionVisible,nextVisible};
 });assert.deepEqual(result,{hadDismiss:true,staysDismissed:true,attentionVisible:true,nextVisible:true});
 await page.reload();await page.locator('body.window-design-preview').waitFor();assert.equal(await page.evaluate(async()=>{const {renderUpdateCard}=await import('/features/settings/updates.js');const root=document.createElement('div');root.innerHTML='<div id="conversation-host"></div>';renderUpdateCard(root,{job:{id:'synthetic-complete-job',runId:'synthetic-chat',phase:'complete'}},'synthetic-chat',String,()=>{});return !!root.querySelector('.update-chat-card');}),false);
 assert.deepEqual(errors,[]);
 console.log('PASS independent non-modal search drafts survive switching, reload and restart; completed update dismissals persist without hiding attention or later jobs');
}finally{await app?.close();await f.cleanup();}
