import {_electron as electron} from 'playwright';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-chat-design-'));let app;
try{
 app=await electron.launch({args:['test/account-queue-ui-host.cjs','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home}});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.locator('[data-page=runs]').first().click();await page.locator('.chat-index-row').filter({hasText:'Queue and account fixture'}).click();await page.locator('#followup').waitFor();
 assert.equal(await page.locator('#continue').getAttribute('aria-label'),'Queue message');
 const actions=await page.locator('.composer-actions button').evaluateAll(nodes=>nodes.map(node=>({radius:getComputedStyle(node).borderRadius,width:node.clientWidth,height:node.clientHeight,svg:!!node.querySelector('svg')})));
 assert.ok(actions.every(button=>button.svg&&button.radius==='50%'&&button.width===button.height));
 const box=page.locator('#followup');await box.fill('Short');const short=await box.boundingBox();
 await box.fill(Array.from({length:70},(_,i)=>'A deliberately wrapped line '+i+' with enough text to occupy the editor.').join('\n'));
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('#followup')).overflowY==='auto');
 const layout=await box.evaluate(node=>({editor:node.clientHeight,composer:node.closest('.composer').getBoundingClientRect().height,pane:node.closest('.chat-pane').clientHeight,bottom:node.closest('.composer').getBoundingClientRect().bottom}));
 assert.ok(layout.editor>short.height);assert.ok(layout.composer<=layout.pane*.6+3,JSON.stringify(layout));
 await box.fill('Shrunk');await page.waitForFunction(()=>document.querySelector('#followup').clientHeight<80);
 const stats=page.locator('.runtime-stat');assert.ok(await stats.count());assert.equal(await stats.locator('strong').evaluate(node=>getComputedStyle(node).fontSize),'28px');
 assert.ok(await page.locator('.token-stats').count());assert.ok(await page.locator('.chat-details .explanation:not([open])').count());
 const usage=await page.locator('.runtime-stat,.token-stats>div').evaluateAll(nodes=>nodes.map(node=>{const label=node.querySelector('span').getBoundingClientRect(),value=node.querySelector('strong'),box=value.getBoundingClientRect();return {labelAbove:label.bottom<=box.top,background:getComputedStyle(value).backgroundColor,center:getComputedStyle(value).textAlign,top:box.top,bottom:box.bottom};}));
 assert.equal(usage.length,3);assert.ok(usage.every(row=>row.labelAbove&&row.background==='rgb(15, 23, 19)'&&row.center==='center'));assert.ok(usage[0].bottom<usage[1].top&&usage[1].bottom<usage[2].top);
 await page.locator('.chat-details').screenshot({path:'/private/tmp/proteus-final-usage-details.png'});
 for(const section of ['home','internet','context'])assert.ok(await page.locator(`[data-page=${section}] .nav-icon svg`).count());
 await page.screenshot({path:path.join(home,'desktop-wide.png')});
 await page.setViewportSize({width:580,height:850});await page.locator('.model-options').click();assert.equal(await page.locator('.model-options').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('.model-options').getAttribute('aria-expanded'),'false');
 await page.locator('#followup').fill('Original queued design test');await page.locator('#continue').click();await page.locator('[data-edit-queued]').waitFor();
 await page.setViewportSize({width:1200,height:950});await page.locator('#tab-add-menu>summary').click();await page.locator('#new-chat').click();
 await page.locator('#chat-provider').selectOption('copilot');await page.locator('#chat-model').selectOption('fixture');await page.locator('#chat-prompt').fill('Attachment layout rehearsal');
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lKkAAAAASUVORK5CYII=','base64');
 await page.locator('#chat-attachments input[type=file]').setInputFiles([1,2,3,4].map(i=>({name:'fixture-'+i+'.png',mimeType:'image/png',buffer:image})));
 assert.equal(await page.locator('#chat-attachments .attachment-chip').count(),4);
 for(const width of [1200,580]){
  await page.setViewportSize({width,height:950});
  await page.waitForFunction(()=>document.querySelector('#dialog-submit').getBoundingClientRect().width>0);
  const placement=await page.locator('.new-chat-composer').evaluate(composer=>{
   const footer=composer.querySelector('.composer-footer'),bounds=footer.getBoundingClientRect();
   const attach=composer.querySelector('.attachment-controls').getBoundingClientRect(),send=composer.querySelector('#dialog-submit').getBoundingClientRect(),strip=composer.querySelector('.attachment-strip').getBoundingClientRect();
   return {overflow:footer.scrollWidth>footer.clientWidth+1,sendInside:send.left>=bounds.left&&send.right<=bounds.right+1,sameRow:Math.abs((attach.top+attach.bottom)/2-(send.top+send.bottom)/2)<3,stripAbove:strip.bottom<=send.top+3};
  });
  assert.deepEqual(placement,{overflow:false,sendInside:true,sameRow:true,stripAbove:true});
 }
 await page.screenshot({path:'/private/tmp/proteus-newchat-attachments.png'});await page.locator('#close-dialog').click();
 assert.deepEqual(errors,[]);console.log('PASS production composer circles, queue delivery, labeled models, compact menu, editor growth/cap/shrink, details hierarchy and navigation SVGs');
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
