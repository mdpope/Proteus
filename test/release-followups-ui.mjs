import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
try{
 app=await electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.locator('body.window-design-preview').waitFor();
 const w=page.locator(`[data-preview-workspace-expand="${fixture.studio.id}"]`),p=page.locator(`[data-preview-expand="${fixture.project.id}"]`);
 await w.click();await p.click();assert.equal(await w.getAttribute('aria-expanded'),'true');assert.equal(await p.getAttribute('aria-expanded'),'true');
 await page.locator('[data-page="engine"]').click();
 for(const section of ['preferences','integrations','windows']){await page.locator(`[data-engine-section="${section}"]`).click();await page.locator(`#engine-content[data-section="${section}"]`).waitFor();assert.equal(await w.getAttribute('aria-expanded'),'true');assert.equal(await p.getAttribute('aria-expanded'),'true');}
 await page.reload();await page.locator('body.window-design-preview').waitFor();assert.equal(await w.getAttribute('aria-expanded'),'true');assert.equal(await p.getAttribute('aria-expanded'),'true');
 const info=await page.evaluate(url=>window.desktop.browser({action:'create',url}),fixture.origin+'/duplicate');
 await page.locator(`[data-tab="${info.id}"]`).click();
 const copy=await page.evaluate(id=>window.desktop.browser({action:'duplicate',id}),info.id);assert.notEqual(copy.id,info.id);assert.equal(copy.profileId,info.profileId);assert.deepEqual(copy.history.entries.map(e=>e.url),info.history.entries.map(e=>e.url));assert.equal(copy.history.index,info.history.index);
 await page.evaluate(id=>window.desktop.browser({action:'unload',id}),copy.id);const unloaded=await page.evaluate(id=>window.desktop.browser({action:'duplicate',id}),copy.id);assert.equal(unloaded.loaded,false);
 await page.evaluate(async()=>{
  const {renderIntegrations}=await import('/integrations.js');const panel=document.createElement('div');panel.id='integration-test';document.querySelector('#main').replaceChildren(panel);
  const consumers=Array.from({length:310},(_,i)=>({id:'session-'+i,server:'mail',chatTitle:'Scheduled chat '+i,provider:'fake',profile:{},connection:'unknown',authentication:'unverified',access:'unverified',stale:true,canCheck:true,canRecover:true}));
  window.integrationFixture={consumers,sourceRevision:'expected-revision',configurations:[{id:'mail-config',sourceId:'source-mail',name:'Mail',path:'/synthetic/.mcp.json',discovered:true,favorite:false,sessionCount:310,summary:'No recent connection evidence',consumers},{id:'unused-config',name:'Unused',path:'/synthetic/other.json',discovered:true,sessionCount:0,summary:'Not connected in a chat',consumers:[]}]};window.integrationActions=[];
  const request=async(action,args)=>{window.integrationActions.push({action,args});return window.integrationFixture;};await renderIntegrations(panel,{request});
 });
 assert.equal(await page.locator('[data-configuration]').count(),2);assert.equal(await page.locator('[data-consumer]').count(),10);
 await page.locator('[data-configuration="mail-config"] > summary').click();await page.locator('[data-star]').first().click();assert.equal(await page.locator('[data-configuration="mail-config"]').getAttribute('open'),'');
 const star=await page.evaluate(()=>window.integrationActions.find(row=>row.action==='favorite'));assert.equal(star.args.expectedRevision,'expected-revision');assert.equal(star.args.id,'source-mail');
 await page.locator('[data-more-sessions]').click();assert.equal(await page.locator('[data-consumer]').count(),20);
 await page.locator('[data-filter]').fill('Unused');assert.equal(await page.locator('[data-configuration]').count(),1);await page.locator('[data-filter]').fill('');
 await page.evaluate(async()=>{const {renderIntegrations}=await import('/integrations.js');await renderIntegrations(document.querySelector('#integration-test'),{readOnly:true,request:async()=>window.integrationFixture});});
 assert.equal(await page.locator('[data-check],[data-recover],[data-edit],[data-star],[data-scan],[data-login]').count(),0);
 console.log('PASS: sidebar navigation/reload, loaded and unloaded duplicate history, grouped integrations, pagination, favorites and read-only peers');
}finally{await app?.close();await fixture.cleanup();}
