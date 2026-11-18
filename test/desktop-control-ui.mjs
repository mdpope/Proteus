// Actual Engine Room page with an isolated home. The driver path is forced to a missing
// file, so no real driver is started and no desktop is observed or controlled.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
const home=fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-desktop-control-ui-')));let app;
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0',PROTEUS_CUA_DRIVER_PATH:path.join(home,'missing-driver'),PROTEUS_PEEKABOO_PATH:path.join(home,'missing-peekaboo')},timeout:60000});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);await page.locator('#home-screen').waitFor();
 await page.evaluate(()=>{document.querySelector('[data-page="engine"]')?.click();});
 await page.locator('[data-engine-section="desktop-control"],[data-section="desktop-control"]').first().click();
 await page.locator('[data-desktop-verify]').waitFor();
 assert.match(await page.locator('[data-desktop-steps]').innerText(),/official installer/,'first-run steps are on the page');
 assert.match(await page.locator('section.card',{hasText:'Desktop Control'}).innerText(),/Not verified since Proteus started/);
 await page.locator('[data-desktop-verify]').click();
 await page.locator('[data-desktop-verification]').waitFor();
 const report=await page.locator('[data-desktop-verification]').innerText();
 assert.match(report,/Not ready yet/);assert.match(report,/not installed where Proteus can find it/);assert.doesNotMatch(report,/Verified on this computer/);
 assert.equal(await page.locator('[data-desktop-install]').count(),process.platform==='darwin'?2:1);
 await page.locator('[data-desktop-install="cua"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-desktop-result]')?.textContent.includes('Configure the update coordinator'));
 await app.evaluate(async ({app})=>{
  const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
  service.engine.drain=async()=>{};
  service.catalogs.codex.get=async()=>({models:[{id:'synthetic-setup',controls:{reasoningEfforts:['high'],contextTiers:[{id:'default'}],serviceTiers:[]}}]});
  service.settings.save({...service.settings.get(),updateCoordinator:{provider:'codex',model:'synthetic-setup',reasoningEffort:'high'}},service.settings.get().revision);
 });
 const backend=process.platform==='darwin'?'peekaboo':'cua';
 await page.locator(`[data-desktop-install="${backend}"]`).click();
 const setup=await app.evaluate(async ({app})=>{
  const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
  const rows=service.engine.listRuns().filter(run=>run.schedule.purpose==='desktop-control-setup');
  return rows.map(run=>({id:run.id,backend:run.schedule.desktopSetup.backend,model:run.schedule.model,authorization:run.schedule.updateAuthorization}));
 });
 assert.equal(setup.length,1);assert.equal(setup[0].backend,backend);assert.equal(setup[0].model,'synthetic-setup');assert.equal(setup[0].authorization,undefined);
 await page.evaluate(()=>document.querySelector('[data-page="engine"]')?.click());
 await page.locator('[data-engine-section="desktop-control"],[data-section="desktop-control"]').first().click();
 await page.locator(`[data-desktop-install="${backend}"]`).waitFor();
 assert.equal(await page.locator(`[data-desktop-install="${backend}"]`).innerText(),'Continue setup');
 assert.equal(await page.locator(`[data-desktop-open="${backend}"]`).isVisible(),true);
 await page.locator(`[data-desktop-install="${backend}"]`).click();
 assert.equal(await app.evaluate(async ({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().engine.listRuns().filter(run=>run.schedule.purpose==='desktop-control-setup').length),1);
 console.log('PASS Engine Room reports missing drivers/defaults, starts selected-backend setup and reopens the same chat without an installer or model turn');
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),10000);try{await app.close();}finally{clearTimeout(timer);}}fs.rmSync(home,{recursive:true,force:true});}
