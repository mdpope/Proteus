// Disposable Electron acceptance; no real provider, profile or business data.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-send-state-'));let app;
try{
 app=await electron.launch({args:['test/account-queue-ui-host.cjs','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PROTEUS_TEST_LONG_HISTORY:'1'}});
 const page=await app.firstWindow();await page.locator('[data-page=runs]').first().waitFor();
 await app.evaluate(()=>{const service=process.mainModule.require(process.cwd()+'/test/account-queue-ui-host.cjs').service();const run=service.engine.getRun('long-history-fixture');service.engine.runs.delete(run.id);run.id='dfc202d3-25f1-4f11-bb93-513a38bd63f7';service.engine.runs.set(run.id,run);service.engine.persist(run);});
 await page.reload();await page.locator('[data-page=runs]').first().click();
 await page.locator('.chat-index-row').filter({hasText:'Long mixed history fixture'}).click();await page.getByText('History marker 2506',{exact:false}).waitFor();
 await page.route('**/api/state?**',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Synthetic overview failure',code:'STATE_PROJECTION_TIMEOUT'})}));
 const ids=[];let dropped=false;
 await page.route('**/api/runs/dfc202d3-25f1-4f11-bb93-513a38bd63f7/send',async route=>{
  ids.push(route.request().postDataJSON().messageId);
  const response=await route.fetch();assert.equal(response.status(),200);
  if(!dropped){dropped=true;await route.abort('failed');}else await route.fulfill({response});
 });
 await page.locator('#followup').fill('Synthetic accepted message despite overview outage');await page.locator('#continue').click();
 await page.getByText('Failed to fetch',{exact:false}).waitFor();
 assert.equal(await page.locator('#followup').inputValue(),'Synthetic accepted message despite overview outage');
 await page.locator('#continue').click();await page.waitForFunction(()=>document.querySelector('#followup')?.value==='');
 await page.getByText('Synthetic accepted message despite overview outage',{exact:true}).first().waitFor();
 assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);
 const count=await app.evaluate(()=>{const service=process.mainModule.require(process.cwd()+'/test/account-queue-ui-host.cjs').service();return service.engine.getRun('dfc202d3-25f1-4f11-bb93-513a38bd63f7').events.filter(e=>e.role==='user'&&e.text==='Synthetic accepted message despite overview outage').length;});
 assert.equal(count,1);
 console.log(JSON.stringify({passed:true,synthetic:true,overviewUnavailable:true,acceptedMessageVisible:true,lostResponseRetriedWithSameId:true,ownerMessages:count}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
