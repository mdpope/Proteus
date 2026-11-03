// A same-tab renderer redraw must preserve both layout and native page identity.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';

const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-surface-redraw-')));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const server=createServer((req,res)=>res.end('<title>Browser surface fixture</title><body style="margin:0;background:#e8f0e4"><h1>Synthetic browser surface</h1><div style="height:5000px"></div>'));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let app;
try {
  app=await electron.launch({cwd:process.cwd(),...(process.env.PROTEUS_TEST_APP_PATH?{executablePath:process.env.PROTEUS_TEST_APP_PATH}:{}),args:[...(!process.env.PROTEUS_TEST_APP_PATH?[process.cwd()]:[]),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
  app.process().stderr.on('data',data=>process.stderr.write(data));
  console.log(await app.evaluate(({app})=>({path:app.getAppPath(),data:app.getPath('userData'),ready:app.isReady()})));
  const page=await app.firstWindow({timeout:60000});page.setDefaultTimeout(15000);
  // firstWindow can precede the owner's initial navigation. Reload only after
  // the trusted shell is installed; never race it with an about:blank load.
  await page.locator('#tab-add-menu').waitFor();
  await page.route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.surfaceRedrawFixture={render};\n'});});
  await page.reload();await page.locator('#tab-add-menu').waitFor();
  const tab=await page.evaluate(url=>window.desktop.browser({action:'create',url}),'http://127.0.0.1:'+server.address().port);
  await page.locator(`[data-tab="${tab.id}"]`).click();await page.locator('#browser-form').waitFor();
  await app.evaluate(async({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();await b.get(id).view.webContents.executeJavaScript('window.surfaceMarker=123;scrollTo(0,400)');},tab.id);
  await page.locator('#browser-url').fill('unfinished address');
  const form=await page.locator('#browser-form').elementHandle();
  const check=async stage=>{
    const shell=await page.evaluate(()=>{const main=document.querySelector('#main'),area=document.querySelector('#browser-area'),r=area.getBoundingClientRect();return {full:main.classList.contains('browser-main'),bottom:r.bottom,windowHeight:innerHeight,bounds:{x:r.x,y:r.y,width:r.width,height:r.height},padding:getComputedStyle(main).padding};});
    assert.ok(shell.full,stage+': full-size browser layout survives a same-toolbar redraw');
    assert.ok(Math.abs(shell.bottom-shell.windowHeight)<=1,stage+': browser fills available window height');
    let native;
    const deadline=Date.now()+5000;
    do {
      native=await app.evaluate(async({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),t=b.get(id);return {bounds:t.view.getBounds(),requested:b.bounds,overlays:[...b.overlays],overview:b.overviewOpen,active:b.active,revision:b.selectionRevision,page:await t.view.webContents.executeJavaScript('({marker:window.surfaceMarker,scroll:scrollY})')};},tab.id);
      if(['x','y','width','height'].every(key=>Math.abs(native.bounds[key]-Math.round(shell.bounds[key]))<=1))break;
      await new Promise(resolve=>setTimeout(resolve,50));
    }while(Date.now()<deadline);
    console.log(JSON.stringify({stage,shell,native}));
    for(const key of ['x','y','width','height'])assert.ok(Math.abs(native.bounds[key]-Math.round(shell.bounds[key]))<=1,stage+': native '+key+' matches the surface');
    assert.equal(native.active,tab.id);assert.deepEqual(native.page,{marker:123,scroll:400});
    assert.equal(await form.evaluate(node=>node.isConnected),true,stage+': toolbar remains mounted');
    assert.equal(await page.locator('#browser-url').inputValue(),'unfinished address');
  };
  await page.waitForTimeout(250);await check('initial');
  await page.evaluate(()=>window.surfaceRedrawFixture.render());await page.waitForTimeout(250);await check('same-tab render');
  await page.locator('#sidebar-toggle').click();
  // Leave the collapsed sidebar's intentional hover/focus overlay before
  // checking the website surface that it temporarily covers.
  await page.locator('#browser-url').focus();await page.mouse.move(700,70);
  await page.waitForTimeout(250);await check('sidebar resized');
  await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().window.setSize(1050,850));
  await page.waitForTimeout(300);await check('window resized');
  console.log('PASS browser surface redraw: no tab switch, no page reload, draft/scroll/native identity preserved');
} finally {await app?.close();server.closeAllConnections();server.close();fs.rmSync(home,{recursive:true,force:true});}
