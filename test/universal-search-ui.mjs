import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';

const fixture=await sidebarFixture();
const name='design-review-report.md';
fs.writeFileSync(path.join(fixture.studio.cwd,name),'# Searchable report');
let app;
try {
  app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_AUTH:'none',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});
  const page=await app.firstWindow(),errors=[];
  const scratchTitle='Orchards & Weather';
  await app.evaluate(async({app},{folder,workspaceId,projectId,title})=>{
    const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
    const status=service.scratchpad.settings();
    await service.scratchpad.configure({folder,expectedRevision:status.revision});
    await service.scratchpad.handle({action:'create',title,workspaceId,projectId,body:'A synthetic scratch.',operationId:process.mainModule.require('node:crypto').randomUUID()});
  },{folder:fixture.studio.cwd,workspaceId:fixture.project.workspaceId,projectId:fixture.project.id,title:scratchTitle});
  page.on('pageerror',error=>errors.push(error.message));
  await page.locator('#topbar-home').waitFor();
  await page.route('**/app.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nwindow.searchFixture={state,openTab,get ready(){return workspaceReady&&!workspaceRestoring;}};'});
  });
  await page.reload();
  await page.waitForFunction(()=>window.searchFixture?.ready);
  const browserId=await page.evaluate(async ({origin,parentId})=>{
    const info=await window.desktop.browser({action:'create',url:origin+'/search-browser',title:'Demo browser for search',parentId});
    searchFixture.openTab({id:info.id,type:'browser',info,parentId,customTitle:'Demo browser for search',label:'Demo browser for search'});
    return info.id;
  },{origin:fixture.origin,parentId:fixture.parentId});
  await page.keyboard.press('Meta+p');
  const overlay=page.getByRole('dialog',{name:'Search Proteus'});
  const box=overlay.getByRole('combobox');
  await overlay.waitFor();
  assert.ok(await box.evaluate(node=>document.activeElement===node));
  await box.fill('studio');
  await overlay.getByRole('group',{name:'Projects'}).waitFor();
  const groups=await overlay.locator('[role=group]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));
  assert.ok(groups.indexOf('Projects')<groups.indexOf('Workspaces'));
  const browserResult=overlay.getByRole('option').filter({hasText:'Demo browser for search'});
  await browserResult.waitFor();
  assert.match(await browserResult.locator('small').innerText(),/Studio.*Design review/);
  await overlay.getByRole('button',{name:'Clear search'}).click();
  assert.equal(await box.inputValue(),'');
  await box.fill('design review report');
  const fileResult=overlay.getByRole('option').filter({hasText:name});
  await fileResult.waitFor();
  await fileResult.click();
  await page.getByRole('heading',{name:'Searchable report'}).waitFor();
  await page.keyboard.press('Meta+p');
  await box.fill(scratchTitle);
  const scratchResult=overlay.getByRole('group',{name:'Scratches'}).getByRole('option',{name:/Orchards & Weather/});
  assert.match(await scratchResult.locator('small').innerText(),/Studio.*Design review.*Scratchpad/);
  await scratchResult.click();
  await page.getByRole('textbox',{name:'Scratch title',exact:true}).waitFor();
  assert.equal(await page.getByRole('textbox',{name:'Scratch title',exact:true}).inputValue(),scratchTitle);
  await page.keyboard.press('Meta+p');
  await box.fill('Browser Preferences');
  await overlay.getByRole('group',{name:'Settings'}).getByRole('option',{name:/Browser Preferences/}).waitFor();
  await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:'Browser Preferences',exact:true}).waitFor();
  await page.keyboard.press('Meta+p');
  await page.keyboard.press('Escape');
  assert.equal(await overlay.isVisible(),false);
  await page.evaluate(id=>searchFixture.openTab(searchFixture.state.tabs.find(tab=>tab.id===id)),browserId);
  const sendBrowserShortcut=async()=>{
    return app.evaluate(({app},id)=>{
      const tab=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id);
      if(!tab?.view?.webContents || tab.view.webContents.isLoading())return false;
      tab.view.webContents.focus();
      tab.view.webContents.sendInputEvent({type:'keyDown',keyCode:'P',modifiers:['meta']});
      return true;
    },browserId);
  };
  let sent=false;
  for(let attempt=0;attempt<50&&!sent;attempt++){
    sent=await sendBrowserShortcut();
    if(!sent)await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(sent,'The synthetic embedded browser loaded');
  await overlay.waitFor();
  await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);
  if(process.env.PROTEUS_SEARCH_SCREENSHOT){
    await page.keyboard.press('Meta+p');await box.fill('studio');await browserResult.waitFor();
    await page.waitForFunction(()=>!document.querySelector('.universal-search-status').textContent.startsWith('Searching'));
    await page.screenshot({path:process.env.PROTEUS_SEARCH_SCREENSHOT});
  }
  console.log('Universal Search shortcut, ranking, file routing, clear, Escape and settings routing verified.');
}finally{
  await app?.close().catch(()=>{});
  await fixture.cleanup();
}
