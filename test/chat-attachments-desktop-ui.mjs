import {_electron as electron} from 'playwright';
import {exerciseComposerAttachments} from './composer-attachment-layout.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-attachments-ui-')));
const workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const image=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c636000020000050001a5f645400000000049454e44ae426082','hex');
const messages=[],errors=[];let app,page;
try{
  app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
  page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.locator('#topbar-home').waitFor();
  await page.route('**/api/state*',async route=>{const response=await route.fetch(),data=await response.json();data.hostName='Synthetic Attachment Workstation';data.attachmentMediaTypes={...data.attachmentMediaTypes,rehearsal:['image/png'],copilot:['image/png']};data.providerSteering={...data.providerSteering,rehearsal:true};data.providerSteeringMediaTypes={...data.providerSteeringMediaTypes,rehearsal:['image/png']};await route.fulfill({json:data});});
  // Attachment UI is synthetic; do not depend on a live provider catalog.
  await page.route('**/api/provider',route=>route.fulfill({json:{provider:'copilot',available:true,models:[{id:'synthetic-attachment',name:'Synthetic attachment model',controls:{reasoningEfforts:[],contextTiers:[],serviceTiers:[]}}]}}));
  await page.route('**/api/attachments',async route=>{const value=route.request().postDataJSON();messages.push(value);const result=value.action==='begin'?{uploadId:'synthetic-upload'}:value.action==='finish'?{attachmentId:'synthetic-attachment',name:'tiny.png',mediaType:'image/png',size:image.length,sha256:'synthetic'}:value.action==='authorize'?{consentId:'synthetic-consent'}:{};await route.fulfill({json:result});});
  await page.route('**/api/chat',async route=>{const value=route.request().postDataJSON();if(value.attachments?.length){messages.push({chat:value});await route.fulfill({json:{id:'11111111-1111-4111-8111-111111111111',title:'Synthetic chat'}});}else await route.continue();});
  await page.reload();await page.locator('#tab-add-menu summary').click();await page.locator('[data-new-tab-action]').filter({hasText:'New chat'}).click();await page.locator('[id$="-provider-route"]').selectOption('rehearsal');await page.locator('[data-chat-setup-prompt]').fill('A harmless rehearsal.');await page.locator('[data-chat-setup-submit]').click();await page.locator('#followup').waitFor();
  await page.locator('#followup').fill('Describe this other tiny test image.');await page.locator('#run-attachments input[type=file]').setInputFiles({name:'tiny.png',mimeType:'image/png',buffer:image});
  await page.route('**/api/runs/*/send',async route=>{messages.push({followup:route.request().postDataJSON()});await route.fulfill({json:{ok:true}});});
  await page.locator('#continue').click();await page.getByRole('button',{name:'Confirm Send'}).click();
  for(let i=0;i<50&&!messages.some(item=>item.followup);i++)await new Promise(resolve=>setTimeout(resolve,50));
  const followup=messages.find(item=>item.followup)?.followup;assert.equal(followup?.providerId,'rehearsal');assert.equal(followup?.mode,'queue');assert.deepEqual(followup?.attachments,['synthetic-attachment']);assert.equal(followup?.consentId,'synthetic-consent');
  await page.locator('#run-attachments input[type=file]').setInputFiles(Array.from({length:12},(_,index)=>({name:`batch-${index}.png`,mimeType:'image/png',buffer:image})));
  assert.equal(await page.locator('#run-attachments .attachment-chip').count(),12);
  for(const width of [1440,850]){
    await page.setViewportSize({width,height:960});
  const layout=await page.evaluate(()=>{const strip=document.querySelector('#run-attachments .attachment-strip').getBoundingClientRect(),control=document.querySelector('#run-attachments .attachment-controls').getBoundingClientRect(),send=document.querySelector('#continue').getBoundingClientRect();return {stripBottom:strip.bottom,stripHeight:strip.height,controlTop:control.top,controlCenter:control.top+control.height/2,sendCenter:send.top+send.height/2,footerWidth:document.querySelector('.composer-footer').clientWidth,footerScrollWidth:document.querySelector('.composer-footer').scrollWidth};});
  assert.ok(layout.stripBottom<=layout.controlTop+3,JSON.stringify(layout));
  assert.ok(layout.stripHeight<=115,JSON.stringify(layout));
  assert.ok(Math.abs(layout.controlCenter-layout.sendCenter)<20,JSON.stringify(layout));
  assert.ok(layout.footerScrollWidth<=layout.footerWidth+3,JSON.stringify(layout));
  }
  await page.setViewportSize({width:1440,height:960});
  await page.locator('#run-attachments [data-attach-preview]').first().click();await page.locator('#attachment-image-preview').waitFor();
  await page.mouse.click(3,3);await page.locator('#attachment-image-preview').waitFor({state:'detached'});
  await page.locator('#run-attachments').evaluate(host=>{while(host.querySelector('[data-attach-remove]'))host.querySelector('[data-attach-remove]').click();});
  await exerciseComposerAttachments(page,{input:'#run-attachments input[type=file]',textarea:'#followup',composer:'.chat-pane>.composer'});
  await app.evaluate(({app})=>{const engine=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().engine,run=engine.listRuns().find(run=>run.schedule.provider==='rehearsal');run.status='running';engine.persist(run);});
  await page.reload();await page.locator('#steer').waitFor();await page.locator('#followup').fill('Synthetic steering with an image');await page.locator('#run-attachments input[type=file]').setInputFiles({name:'tiny.png',mimeType:'image/png',buffer:image});
  await page.locator('#steer').click();await page.getByRole('heading',{name:'Send these files?'}).waitFor();await page.getByRole('button',{name:'Confirm Send'}).click();
  await page.waitForFunction(()=>!document.querySelector('#run-attachments .attachment-chip'));
  const steering=messages.find(item=>item.followup?.mode==='steer')?.followup;assert.ok(steering,'Image steering reaches the normal send route');assert.deepEqual(steering.attachments,['synthetic-attachment']);assert.equal(steering.consentId,'synthetic-consent');assert.equal(steering.providerId,'rehearsal');assert.equal(steering.modelOptions,undefined,'Steering preserves active-turn model options');
  await app.evaluate(({app})=>{const engine=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().engine,run=engine.listRuns().find(run=>run.schedule.provider==='rehearsal');run.status='completed';engine.persist(run);});
  if(process.env.PROTEUS_TEST_COMPOSER_ONLY==='1'){
    assert.deepEqual(errors,[]);console.log('PASS packaged desktop attachment layout, preview, consent and upload with visible fixed controls at desktop/phone widths');
  }else{
  await page.reload();await page.locator('#tab-add-menu summary').click();await page.locator('[data-new-tab-action]').filter({hasText:'New chat'}).click();
  await page.locator('[id$="-provider-route"]').selectOption('copilot');await page.locator('[id$="-model"]').selectOption('synthetic-attachment');await page.locator('[data-chat-setup-prompt]').fill('Describe this tiny test image.');
  await page.locator('[id$="-attachments"] input[type=file]').setInputFiles({name:'tiny.png',mimeType:'image/png',buffer:image});
  await page.locator('[id$="-attachments"] .attachment-chip img').waitFor();
  const newChatLayout=await page.evaluate(()=>{const control=document.querySelector('[id$="-attachments"] .attachment-controls').getBoundingClientRect(),send=document.querySelector('[data-chat-setup-submit]').getBoundingClientRect();return {controlCenter:control.top+control.height/2,sendCenter:send.top+send.height/2};});
  assert.ok(Math.abs(newChatLayout.controlCenter-newChatLayout.sendCenter)<20,JSON.stringify(newChatLayout));
  await page.locator('[id$="-attachments"] [data-attach-preview]').click();await page.locator('#attachment-image-preview').waitFor();await page.keyboard.press('Escape');await page.locator('#attachment-image-preview').waitFor({state:'detached'});
  await page.locator('[data-chat-setup-submit]').click();await page.getByRole('heading',{name:'Send these files?'}).waitFor();assert.match(await page.locator('.attachment-confirm').innerText(),/Synthetic Attachment Workstation · new chat[\s\S]*Copilot[\s\S]*tiny.png/);
  await page.getByRole('button',{name:'Confirm Send'}).click();
  for(let i=0;i<50&&!messages.some(item=>item.chat);i++)await new Promise(resolve=>setTimeout(resolve,50));
  assert.deepEqual(messages.filter(item=>item.action).map(item=>item.action),['begin','chunk','finish','authorize','begin','chunk','finish','authorize','begin','chunk','finish','authorize']);
  assert.deepEqual(messages.find(item=>item.chat)?.chat.attachments,['synthetic-attachment']);assert.equal(messages.find(item=>item.chat)?.chat.providerId,'copilot');
  assert.deepEqual(errors,[]);console.log('PASS desktop new-chat/queue/steer attachment consent and bounded upload; immediate chip clearing; fixed footer through many files, long drafts and pending questions at desktop/phone widths.');
}
}finally{if(page)await page.unrouteAll({behavior:'wait'}).catch(()=>{});await app?.close();fs.rmSync(home,{recursive:true,force:true});}
