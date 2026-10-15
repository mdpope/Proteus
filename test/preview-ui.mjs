import http from 'node:http';
import assert from 'node:assert/strict';
export async function previewFixture(host){
 let revision=1;
 const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url.endsWith('.js')?'application/javascript':'text/html');res.end(req.url.endsWith('.js')?`document.querySelector('button').onclick=()=>document.querySelector('p').textContent='Changed ${revision}';`:`<title>Automatic design rehearsal</title><p>Version ${revision}</p><button>Change sample</button><script type="module" src="./main.js"></script>`);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const source='http://127.0.0.1:'+server.address().port+'/design.html';
 const schedule=await host.buildChatSchedule({name:'Automatic design rehearsal',prompt:'Synthetic local preview',provider:'rehearsal'}),run=host.engine.createRun(schedule,'chat',null,{deferStart:true});
 host.contentTabs.mutate({scope:'chat',id:run.id,expectedRevision:0,operations:[{action:'open',tab:{id:'desktop-originated-preview',type:'browser',title:'Design',url:source}}]});
 for(const device of host.remote.config.devices)host.remote.setDocumentAccess(device.id,true);
 return {run,source,update(){revision++;for(const value of host.previews.cache.values())value.checkedAt=0;},close:()=>new Promise(resolve=>server.close(resolve))};
}
export async function exerciseWebPreview(page,host,errors=[]){
 const fixture=await previewFixture(host),previewErrorStart=errors.length;
 try{
  await page.locator('[data-shell-nav=chats]').click();await page.locator('#chat-index-refresh').click();await page.locator(`[data-run="${fixture.run.id}"]`).click();
  const tab=page.locator('[data-chat-document]').filter({hasText:'Automatic design rehearsal'});await tab.waitFor();await tab.click();
  const frame=page.frameLocator('#remote-html-frame').frameLocator('#artifact');await frame.getByText('Version 1',{exact:true}).waitFor();
  await page.locator('#remote-preview-enable').click();await frame.getByRole('button',{name:'Change sample'}).click();await frame.getByText('Changed 1',{exact:true}).waitFor();
  fixture.update();await frame.getByText('Version 2',{exact:true}).waitFor();assert.equal(await tab.count(),1);assert.equal(await page.locator('#remote-preview-enable').isVisible(),true);
  await page.reload();await page.waitForFunction(()=>document.querySelector('#remote-status')?.textContent.endsWith(' · Connected'));await page.locator(`[data-shell-chat="${fixture.run.id}"] a`).click();await tab.waitFor();await tab.click();await frame.getByText('Version 2',{exact:true}).waitFor();assert.equal(await tab.count(),1);
  assert.ok(errors.slice(previewErrorStart).every(error=>/Blocked script execution|Content Security Policy/.test(error)));errors.splice(previewErrorStart);
 }finally{host.engine.cancel(fixture.run.id);await fixture.close();}
}
export async function exerciseDesktopPreview(page,app,host){
 const fixture=await previewFixture(host);
 try{
  await page.locator('[data-page="runs"]').first().click();await page.locator('#chat-index-refresh').click();const row=page.locator('.chat-index-row').filter({hasText:'Automatic design rehearsal'});await row.waitFor();await row.click();
  const tab=page.locator('[data-chat-subtab]').filter({hasText:'Automatic design rehearsal'});await tab.waitFor();await tab.click();await page.locator('#peer-artifact-scripts').waitFor();
  const probe=async(script)=>app.evaluate(async({webContents},script)=>{const preview=webContents.getAllWebContents().find(w=>w.getURL().startsWith('data:text/html'));const child=preview?.mainFrame.frames[0];return child?.executeJavaScript(script);},script);
  await page.locator('#peer-artifact-scripts').click();
  await page.waitForTimeout(300);assert.match(await probe('document.body.innerText'),/Version 1/);await probe("document.querySelector('button').click()");assert.match(await probe('document.body.innerText'),/Changed 1/);
  fixture.update();await page.waitForFunction(()=>document.querySelector('#peer-document-status')?.textContent.includes('Static design snapshot'));
  await page.waitForFunction(()=>document.querySelector('#peer-artifact-source')?.textContent.includes('Version 2'));
  assert.equal(await tab.count(),1);assert.equal(await page.locator('#peer-artifact-scripts').isVisible(),true);
  await page.locator('#peer-artifact-scripts').click();await page.waitForTimeout(300);assert.match(await probe('document.body.innerText'),/Version 2/);
 }finally{host.engine.cancel(fixture.run.id);await fixture.close();}
}
