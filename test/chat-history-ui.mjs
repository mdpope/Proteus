// Disposable mixed transcript shaped like a long tool-heavy update chat.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-history-ui-'));let app;
try{
 app=await electron.launch({args:['test/account-queue-ui-host.cjs','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PROTEUS_TEST_LONG_HISTORY:'1'}});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.locator('[data-page=runs]').first().click();await page.locator('.chat-index-row').filter({hasText:'Long mixed history fixture'}).click();
 await page.getByText('History marker 2506',{exact:false}).waitFor();const pane=page.locator('.conversation');
 let start=Number(await pane.getAttribute('data-event-start')),steps=0;assert.ok(start>2400);
 // A wheel at an already stationary top must still request the next page.
 while(start>0&&steps++<240){
  await pane.evaluate(p=>{p.scrollTop=0;});await pane.hover();await page.mouse.wheel(0,-600);
  await page.waitForFunction(prior=>Number(document.querySelector('.conversation').dataset.eventStart)<prior,start);
  start=Number(await pane.getAttribute('data-event-start'));await page.waitForTimeout(270);
 }
 assert.equal(start,0,'Every event must remain reachable, including across host transport pages');
 assert.ok(steps<45,'Tool-heavy history should advance in meaningful batches');
 assert.equal(await pane.locator('.activity-group-item').count(),0,'Collapsed groups must not build heavy descendants');
 const group=pane.locator('.activity-group').first();await group.locator(':scope>summary').click();await group.locator('.activity-group-item').first().waitFor();await group.locator(':scope>summary').click();await group.locator('.activity-group-item').first().waitFor({state:'detached'});
 assert.equal(await pane.locator('.message.user').count(),105);await page.getByText('History marker 0 ',{exact:false}).first().waitFor();
 await page.getByRole('button',{name:'↓ Jump to latest'}).click();
 const end=await pane.evaluate(p=>({gap:p.scrollHeight-p.clientHeight-p.scrollTop,last:p.querySelector('[data-key="event-2506"]')?.getBoundingClientRect().bottom,bottom:p.getBoundingClientRect().bottom}));assert.ok(end.gap<5,JSON.stringify(end));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,eventCount:2507,steps,allHistoryReachable:true}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
