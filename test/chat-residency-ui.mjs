// Disposable owner + real paged conversation; no installed profile or provider calls.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-residency-ui-'));let app;
try{
 app=await electron.launch({args:['test/account-queue-ui-host.cjs','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PROTEUS_TEST_LONG_HISTORY:'1'}});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
 const open=async()=>{await page.locator('[data-page=runs]').first().click();await page.locator('.chat-index-row').filter({hasText:'Long mixed history fixture'}).click();await page.locator('.conversation').waitFor();};await open();
 const before=await page.locator('.conversation').evaluate(async root=>{const {captureConversationPosition,applyConversationPosition}=await import('/features/chats/conversation.js');if(!await applyConversationPosition(root,{key:'event-1200',index:1200,offset:8,follow:false}))throw Error('Could not reach historical reading position '+JSON.stringify({start:root.dataset.eventStart,connected:root.isConnected,status:root.parentElement?.querySelector('.history-status')?.textContent,position:captureConversationPosition(root)}));return captureConversationPosition(root);});assert.equal(before.key,'event-1200');
 await page.locator('#followup').fill('Keep my unsent draft while its transcript is unloaded');
 await page.locator('[data-page=home]').first().click();
 const unloaded=await page.evaluate(async()=>{const {viewResidency}=await import('/models/view-residency.js');const prior=[...viewResidency.entries].filter(([,entry])=>entry.kind==='chat').map(([key,entry])=>({key,slots:[...entry.slots.keys()]}));viewResidency.now=()=>Date.now()+11*60000;viewResidency.sweep();return {prior,remaining:[...viewResidency.entries.keys()]};});assert.ok(unloaded.prior.some(entry=>entry.slots.includes('history')&&entry.slots.includes('conversation')));assert.equal(unloaded.remaining.length,0);
 await open();await page.waitForFunction(()=>document.querySelector('.conversation [data-key="event-1200"]'));
 await page.waitForFunction(async()=>{const {captureConversationPosition}=await import('/features/chats/conversation.js');const position=captureConversationPosition(document.querySelector('.conversation'));return position?.key==='event-1200'&&Math.abs(position.offset-8)<2;});
 assert.equal(await page.locator('#followup').inputValue(),'Keep my unsent draft while its transcript is unloaded');
 await page.locator('[data-page=engine]').first().click();await page.locator('[data-engine-section=resources]').click();await page.locator('[data-memory-chat]').fill('2');await page.locator('[data-memory-document]').fill('3');await page.locator('[data-memory-idle]').fill('5');await page.locator('[data-memory-save]').click();await page.locator('[data-memory-status]').getByText('Saved for this computer.',{exact:false}).waitFor();
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home,'settings.json'))).resources,{chatViewLimit:2,documentViewLimit:3,inactiveMinutes:5});assert.deepEqual(errors,[]);
 if(process.env.PROTEUS_TEST_EVIDENCE)await page.screenshot({path:path.join(process.env.PROTEUS_TEST_EVIDENCE,'oct30-memory-settings.png')});
 console.log(JSON.stringify({passed:true,synthetic:true,inactiveTranscriptAndDOMEvicted:true,exactHistoricalAnchorRestored:true,transportPagesReloaded:true,unsentDraftPreserved:true,resourceSettingsSavedInUI:true}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
