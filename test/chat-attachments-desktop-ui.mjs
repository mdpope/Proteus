import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-attachments-ui-')));
const workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const image=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c636000020000050001a5f645400000000049454e44ae426082','hex');
const messages=[],errors=[];let app;
try{
  app=await electron.launch({args:['.','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/state',async route=>{const response=await route.fetch(),data=await response.json();data.attachmentMediaTypes={...data.attachmentMediaTypes,rehearsal:['image/png'],copilot:['image/png']};await route.fulfill({json:data});});
  await page.route('**/api/attachments',async route=>{const value=route.request().postDataJSON();messages.push(value);const result=value.action==='begin'?{uploadId:'synthetic-upload'}:value.action==='finish'?{attachmentId:'synthetic-attachment',name:'tiny.png',mediaType:'image/png',size:image.length,sha256:'synthetic'}:value.action==='authorize'?{consentId:'synthetic-consent'}:{};await route.fulfill({json:result});});
  await page.route('**/api/chat',async route=>{const value=route.request().postDataJSON();if(value.attachments?.length){messages.push({chat:value});await route.fulfill({json:{id:'11111111-1111-4111-8111-111111111111',title:'Synthetic chat'}});}else await route.continue();});
  await page.reload();await page.locator('#tab-add-menu summary').click();await page.locator('#new-chat').click();await page.locator('#chat-prompt').fill('A harmless rehearsal.');await page.locator('#dialog-submit').click();await page.locator('#followup').waitFor();
  await page.locator('#followup').fill('Describe this other tiny test image.');await page.locator('#run-attachments input[type=file]').setInputFiles({name:'tiny.png',mimeType:'image/png',buffer:image});
  await page.route('**/api/runs/*/send',async route=>{messages.push({followup:route.request().postDataJSON()});await route.fulfill({json:{ok:true}});});
  await page.locator('#continue').click();await page.getByRole('button',{name:'Confirm Send'}).click();
  for(let i=0;i<50&&!messages.some(item=>item.followup);i++)await new Promise(resolve=>setTimeout(resolve,50));
  const followup=messages.find(item=>item.followup)?.followup;assert.equal(followup?.providerId,'rehearsal');assert.equal(followup?.mode,'queue');assert.deepEqual(followup?.attachments,['synthetic-attachment']);assert.equal(followup?.consentId,'synthetic-consent');
  await page.reload();await page.locator('#tab-add-menu summary').click();await page.locator('#new-chat').click();
  await page.locator('#chat-provider').selectOption('copilot');await page.locator('#chat-prompt').fill('Describe this tiny test image.');
  await page.locator('#chat-attachments input[type=file]').setInputFiles({name:'tiny.png',mimeType:'image/png',buffer:image});
  await page.locator('#chat-attachments .attachment-chip img').waitFor();await page.locator('#chat-attachments [data-attach-preview]').click();await page.locator('#attachment-image-preview').waitFor();await page.keyboard.press('Escape');await page.locator('#attachment-image-preview').waitFor({state:'detached'});
  await page.locator('#dialog-submit').click();await page.getByRole('heading',{name:'Send these files?'}).waitFor();assert.match(await page.locator('.attachment-confirm').innerText(),/This Mac · new chat[\s\S]*Copilot[\s\S]*tiny.png/);
  await page.getByRole('button',{name:'Confirm Send'}).click();
  for(let i=0;i<50&&!messages.some(item=>item.chat);i++)await new Promise(resolve=>setTimeout(resolve,50));
  assert.deepEqual(messages.filter(item=>item.action).map(item=>item.action),['begin','chunk','finish','authorize','begin','chunk','finish','authorize']);
  assert.deepEqual(messages.find(item=>item.chat)?.chat.attachments,['synthetic-attachment']);assert.equal(messages.find(item=>item.chat)?.chat.providerId,'copilot');
  assert.deepEqual(errors,[]);console.log('Desktop local new-chat and follow-up file picker, preview, explicit consent and bounded upload passed.');
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
