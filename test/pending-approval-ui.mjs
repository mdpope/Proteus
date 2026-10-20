import {_electron as electron} from 'playwright';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-pending-approval-'));let app;
try{
 app=await electron.launch({args:['test/pending-approval-ui-host.cjs','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home}});
 const page=await app.firstWindow();await page.locator('[data-page=runs]').first().click();await page.locator('.chat-index-row').filter({hasText:'Pending approval fixture'}).click();
 await page.locator('#pending-chat-autoapprove').waitFor();assert.equal(await page.locator('#approve').isVisible(),true);assert.equal(await page.locator('#deny').isVisible(),true);
 const read=()=>JSON.parse(fs.readFileSync(path.join(home,'runs',fs.readdirSync(path.join(home,'runs'))[0])));
 const old=read().pending.id;await page.locator('#followup').fill('Preserve my unsent draft');await page.locator('#pending-chat-autoapprove').click();await page.getByText('Mandatory synthetic approval',{exact:true}).waitFor();
 assert.equal(await page.locator('#pending-chat-autoapprove').isDisabled(),true);assert.equal(await page.locator('#approve').isVisible(),true);assert.equal(await page.locator('#followup').inputValue(),'Preserve my unsent draft');
 const run=read();assert.notEqual(run.pending.id,old);assert.equal(run.chatPermission.mode,'autopilot');assert.equal(run.status,'awaiting_input');assert.ok(run.pending.permissionReason);assert.equal(run.automaticApprovals,1);
 await page.screenshot({path:'/private/tmp/proteus-pending-approval.png'});await page.locator('#approve').click();await page.getByText('Approval fixture finished',{exact:true}).waitFor();
 console.log('PASS: pending chat-only approval, automatic recheck, mandatory approval retained with reason, unchanged draft and ordinary Approve/Deny');
}finally{if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
