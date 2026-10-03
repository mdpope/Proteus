import { _electron as electron } from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-composer-ui-'));let app;
try {
 app=await electron.launch({args:['.','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const id=await app.evaluate(async(_,home)=>{
  const service=process.mainModule.require(process.cwd()+'/desktop/main.cjs').getService(),engine=service.engine;
  await service.catalogs.codex.pending;
  const controls={reasoningEfforts:['low','high'],contextTiers:[{id:'default',promptTokens:272000},{id:'long_context',promptTokens:872000}],serviceTiers:[{id:'fast',name:'Fast'}]};
  service.catalogs.codex.load=async()=>({available:true,models:[{id:'fixture-one',name:'Fixture One',controls},{id:'fixture-two',name:'Fixture Two',controls},{id:'minimal',name:'Minimal',controls:{contextTiers:[{id:'default'}]}}]});await service.catalogs.codex.get(true);
  engine.providers.codex={steer:async()=>{},run:async()=>{}};engine.drain=async()=>{};
  const run=engine.createRun({...engine.schedules.list()[0],provider:'codex',model:'fixture-one',workspace:{cwd:home,additionalDirectories:[]}});run.status='completed';engine.persist(run);return run.id;
 },home);
 await page.locator('[data-page="runs"]').click();await page.locator(`[data-run="${id}"]`).click();
 assert.equal(await page.locator('#cancel').count(),0);assert.equal(await page.locator('#steer').count(),0);
 for(const select of ['run-model','run-model-effort','run-model-speed','run-model-context'])assert.ok(await page.locator('.composer-footer #'+select).isVisible());
 await page.locator('#run-model').selectOption('fixture-two');await page.locator('#run-model-effort').selectOption('high');await page.locator('#run-model-speed').selectOption('fast');await page.locator('#run-model-context').selectOption('long_context');
 await page.locator('#followup').fill('Next turn with selected options');await page.locator('#continue').click();
 await page.waitForFunction(()=>document.querySelector('#continue').textContent==='Queue');
 const before=await app.evaluate((_,id)=>process.mainModule.require(process.cwd()+'/desktop/main.cjs').getService().engine.getRun(id).schedule,id);assert.equal(before.model,'fixture-two');assert.equal(before.serviceTier,'fast');assert.equal(before.contextTier,'long_context');
 assert.equal(await page.locator('#cancel').count(),0,'Not yet running');
 await app.evaluate((_,id)=>{const e=process.mainModule.require(process.cwd()+'/desktop/main.cjs').getService().engine,r=e.getRun(id);r.status='running';e.running={id,controller:new AbortController()};e.persist(r);},id);
 await page.locator('.composer-footer #cancel').waitFor();
 await page.locator('#run-model').selectOption('fixture-one');await page.locator('#followup').fill('A steering note');await page.locator('#steer').click();
 await page.waitForFunction(()=>document.querySelector('#followup').value==='');
 const activeModel=await app.evaluate((_,id)=>process.mainModule.require(process.cwd()+'/desktop/main.cjs').getService().engine.getRun(id).schedule.model,id);assert.equal(activeModel,'fixture-two');assert.equal(await page.locator('#run-model').inputValue(),'fixture-one','Steering preserves draft next-turn choice');
 await page.locator('#followup').fill('Queued model change');await page.locator('#continue').click();await page.locator('[data-remove-message]').waitFor();
 const queued=await app.evaluate((_,id)=>process.mainModule.require(process.cwd()+'/desktop/main.cjs').getService().engine.getRun(id).queuedMessages[0],id);assert.equal(queued.modelOptions.model,'fixture-one');
 await page.locator('#run-model').selectOption('minimal');assert.equal(await page.locator('#run-model-effort').isVisible(),false);assert.equal(await page.locator('#run-model-speed').isVisible(),false);assert.equal(await page.locator('#run-model-context').isVisible(),false);
 await page.locator('#run-model').selectOption('fixture-two');await page.screenshot({path:'/private/tmp/proteus-composer-mac.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['compact footer selectors','separate queue/steer/stop','stop only while running','next-turn model/effort/speed/context','steer retains current model','unsupported controls hidden']}));
} finally {if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
