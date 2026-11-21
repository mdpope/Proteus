import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';

const fixture=await sidebarFixture();
const nativeBundle=process.env.PROTEUS_SHARE_NATIVE_BUNDLE;
const png=fs.readFileSync(new URL('../desktop/icon.png',import.meta.url));
const note='Screenshot drop rehearsal.md';
fs.writeFileSync(path.join(fixture.studio.cwd,note),'# Drop rehearsal\n');
let app, shareRehearsal;
try {
  app=await electron.launch({
    executablePath:nativeBundle?path.join(nativeBundle,'Contents','MacOS','Proteus Design Preview'):process.env.PROTEUS_TEST_EXECUTABLE,
    args:[...(nativeBundle?[]:['.']),'--use-mock-keychain'],
    env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_AUTH:'none',PROTEUS_PREVIEW_HOME:fixture.locations.root,PORT:'0'},
  });
  const page=await app.firstWindow(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.setDefaultTimeout(12000);
  await page.route('**/app.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nwindow.shareFixture={state,openFileBrowser,get ready(){return workspaceReady&&!workspaceRestoring;}};'});
  });
  await page.reload();
  await page.waitForFunction(()=>window.shareFixture?.ready);
  await page.locator('[data-page=home]').first().click();
  const card=page.locator('.screenshot-tray-item');
  if(nativeBundle){
    const ready=await app.evaluate(({app})=>!!process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getScreenshotShare()?.file);
    assert.equal(ready,true,'The signed preview must publish its App Group descriptor.');
    console.log('Signed rehearsal ready in Home, with no chat selected.');
    if(process.env.PROTEUS_SHARE_NATIVE_HELPER){
      shareRehearsal=spawn(process.env.PROTEUS_SHARE_NATIVE_HELPER,[path.resolve('desktop/icon.png')],{stdio:'inherit'});
    }
  }else{
    const {port,token}=await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getScreenshotShare().start());
    const id=randomUUID();
    for(let i=0;i<2;i++){
      const response=await fetch('http://127.0.0.1:'+port+'/screenshot',{method:'POST',headers:{
        authorization:'Bearer '+token,'x-proteus-screenshot':id,'content-type':'image/png',
      },body:png});
      assert.equal(response.status,200,await response.text());
    }
  }
  const received=card.first().waitFor({timeout:nativeBundle?300000:12000});
  if(shareRehearsal)await Promise.race([received,new Promise((_,reject)=>{
    shareRehearsal.once('error',reject);
    shareRehearsal.once('exit',code=>reject(Error('Share rehearsal exited before receipt ('+code+').')));
  })]);else await received;
  if(nativeBundle){
    assert.ok(await card.first().getByRole('img').evaluate(image=>image.complete&&image.naturalWidth>0));
    console.log(JSON.stringify({passed:true,nativeShareService:true,receivedWithoutChat:true}));
  }else{
    assert.equal(await card.count(),1);
    const [,chat]=fixture.user;
    await page.locator('[data-page=runs]').first().click();
    await page.locator('#chat-index-query').fill(chat.title);
    await page.locator('[data-field=title]').filter({hasText:chat.title}).click();
    await page.locator('#followup').fill('Keep this draft');
    await page.locator('#run-attachments input[type=file]').setInputFiles({name:'Existing.png',mimeType:'image/png',buffer:png});
    await page.evaluate(()=>{
      window.dragTrace=[];
      for(const type of ['dragstart','dragover','drop','dragend'])document.addEventListener(type,event=>{
        window.dragTrace.push({type,target:event.target.id||event.target.className,types:[...event.dataTransfer.types]});
      },true);
    });
    await card.dragTo(page.locator('#followup'),{sourcePosition:{x:4,y:8},targetPosition:{x:24,y:14}});
    await page.getByRole('button',{name:'Remove Screenshot.png'}).waitFor().catch(async error=>{
      console.error(JSON.stringify(await page.evaluate(()=>({trace:window.dragTrace.slice(-12),toast:document.querySelector('#toast').textContent}))));
      throw error;
    });
    await page.getByRole('button',{name:'Remove Existing.png'}).waitFor();
    assert.equal(await page.locator('#followup').inputValue(),'Keep this draft');

    await page.evaluate(id=>shareFixture.openFileBrowser(shareFixture.state.tabs.find(tab=>tab.id===id)),fixture.parentId);
    const browser=page.locator('.workspace-file-browser');
    const row=browser.getByRole('row').filter({hasText:note});
    await row.waitFor();
    await card.dragTo(browser.getByText('docs',{exact:true}));
    await browser.getByRole('status').filter({hasText:'Saved Screenshot-'}).waitFor();
    const folder=path.join(fixture.studio.cwd,'docs');
    const file=fs.readdirSync(folder).find(name=>/^Screenshot-[a-f0-9]+\.png$/.test(name));
    assert.deepEqual(fs.readFileSync(path.join(folder,file)),png);
    await row.click();
    await browser.getByRole('button',{name:'Edit this file'}).click();
    await card.dragTo(browser.locator('.cm-content'),{sourcePosition:{x:4,y:8},targetPosition:{x:25,y:8}});
    await browser.getByRole('button',{name:'Save changes'}).click();
    await page.waitForFunction(()=>!document.querySelector('[aria-label="Save changes"]')||document.querySelector('[aria-label="Save changes"]').hidden);
    assert.match(fs.readFileSync(path.join(fixture.studio.cwd,note),'utf8'),/!\[\[pasted-[a-f0-9]{64}\.png\]\]/);

    await page.locator('[data-page=scratchpad]').first().click();
    await page.getByLabel('Scratchpad storage folder',{exact:true}).fill(fixture.personal.cwd);
    await page.getByRole('button',{name:'Use this folder',exact:true}).click();
    await page.getByRole('button',{name:'New scratch',exact:true}).click();
    await page.getByLabel('Scratch title',{exact:true}).fill('Screenshot scratch');
    const scratch=page.locator('.scratch-code-editor .cm-content').first();
    await card.dragTo(scratch,{sourcePosition:{x:4,y:8},targetPosition:{x:24,y:10}});
    await page.waitForFunction(()=>document.querySelector('textarea[aria-label="Scratch content"]')?.value.includes('![[Scratch Attachments/pasted-'));
    assert.equal(await card.count(),1);
    assert.equal(await page.locator('#screenshot-tray-panel').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(214, 236, 196)');
    assert.notEqual(await card.evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(214, 236, 196)');
    if(process.env.PROTEUS_TRAY_SCREENSHOT)await page.screenshot({path:process.env.PROTEUS_TRAY_SCREENSHOT});
    await page.getByRole('button',{name:'Hide screenshot tray'}).click();
    await page.getByRole('button',{name:'Screenshots 1',exact:true}).click();
    await card.waitFor();
    await page.getByRole('button',{name:'Remove screenshot 1'}).click();
    await card.waitFor({state:'detached'});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,receivedWithoutChat:true,localChat:true,workspaceFolder:true,markdownEditor:true,scratchpad:true,trayRetention:true}));
  }
}finally{
  shareRehearsal?.kill();
  await app?.close().catch(()=>{});
  await fixture.cleanup();
}
