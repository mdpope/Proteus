// Rehearsal: the real empty-strip gesture must retain one usable selected tab.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';

const fixture=await sidebarFixture();let app;
try{
 const savedFile=path.join(fixture.locations.home,'desktop-workspace.json');
 const saved=JSON.parse(fs.readFileSync(savedFile,'utf8'));
 saved.tabs.push({id:'existing-main-tab',type:'browser',label:'Existing main browser',url:fixture.origin+'/existing-main',unloaded:true});
 fs.writeFileSync(savedFile,JSON.stringify(saved));
 app=await electron.launch({args:['.','--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.locator('body.window-design-preview').waitFor();
 await app.context().route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('refresh().then(restoreWorkspace)','window.stripReady=refresh().then(restoreWorkspace)')+'\nwindow.stripFixture={state,contentTabSync,refresh};\n'});});
 await page.reload();await page.evaluate(()=>window.stripReady);
 await app.evaluate(({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();browser.blocker.ensure=async()=>{};browser.window.setBounds({x:80,y:70,width:1400,height:900});});
 const command=value=>page.evaluate(value=>window.desktop.browser(value),value);
 for(const scope of ['main','project']){
  if(scope==='project'){
   await page.locator(`[data-preview-workspace-expand="${fixture.studio.id}"]`).click();
   const empty=fixture.projects.find(project=>project.name==='Synthetic project 1');
   await page.locator(`[data-preview-project="${empty.id}"]`).first().click();
  }
  const root=scope!=='project',selector=root?'#tabs .tab-list':'#chat-subtabs .chat-subtab-list';
  const before=new Set((await command({action:'list'})).map(tab=>tab.id));
  const strip=page.locator(selector),box=await strip.boundingBox();assert.ok(box);
  await strip.dblclick({position:{x:box.width-6,y:box.height-8}});
  await page.locator('#browser-home-url').waitFor();
  const created=await page.evaluate(()=>window.stripFixture.state.tab);
  assert.ok(!before.has(created));
  await page.evaluate(async()=>{await window.stripFixture.contentTabSync.all();await window.stripFixture.refresh(true);});
  await page.waitForTimeout(1000);
  const snapshot=await page.evaluate(()=>({selected:window.stripFixture.state.tab,tabs:window.stripFixture.state.tabs.map(tab=>({id:tab.id,parentId:tab.parentId,type:tab.type,hidden:tab.hidden,pendingOpen:!!tab.pendingOpen}))}));
  assert.equal(snapshot.selected,created,JSON.stringify({scope,created,snapshot}));
  assert.equal(snapshot.tabs.find(tab=>tab.id===created)?.pendingOpen,false,'Creation intent is cleared after owner acceptance');
  assert.ok((await command({action:'list'})).some(tab=>tab.id===created),`Native ${scope} tab survives reconciliation`);
  await page.locator(`[${root?'data-tab':'data-chat-subtab'}="${created}"]`).waitFor();
  const url=fixture.origin+'/strip-'+scope;
  await page.locator('#browser-home-url').fill(url);await page.locator('#browser-home-url').press('Enter');
  await page.waitForFunction(async({created,url})=>(await window.desktop.browser({action:'list'})).some(tab=>tab.id===created&&tab.url===url),{created,url});
  // The host can resize without a window resize or a tab switch. The native
  // view must follow it both when space is taken and when it is restored.
  const nativeBounds=()=>app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view?.getBounds(),created);
  const area=page.locator('#browser-area');
  await page.waitForFunction(()=>document.querySelector('#browser-area')?.getBoundingClientRect().height>300);
  await area.evaluate(node=>{node.style.marginBottom='160px';});
  await page.waitForFunction(async id=>{const r=document.querySelector('#browser-area')?.getBoundingClientRect();const result=await window.desktop.browser({action:'list'});return !!r&&result.some(tab=>tab.id===id&&tab.loaded);},created);
  await expectBounds(area,nativeBounds);
  await area.evaluate(node=>{node.style.marginBottom='0px';});
  await expectBounds(area,nativeBounds);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: main/project empty-strip double-click retains its selected tab and navigates after owner reconciliation');
}finally{
 if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),5000);await app.close().catch(()=>{});clearTimeout(timer);}
 await fixture.cleanup();
}

async function expectBounds(area,nativeBounds){
 for(let attempt=0;attempt<50;attempt++){
  const rect=await area.boundingBox(),bounds=await nativeBounds();
  if(rect&&bounds&&['x','y','width','height'].every(key=>Math.abs(Math.round(rect[key])-bounds[key])<=1))return;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.fail('Native browser view did not follow its host area');
}
