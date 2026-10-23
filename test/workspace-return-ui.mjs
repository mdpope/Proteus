// Disposable real desktop: complete browser histories and deep workspace memory
// survive top-level selection and a real process restart.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const f=await sidebarFixture();let app,page;const errors=[];
const session=()=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
async function launch(){app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,CODEX_HOME:f.auth,PORT:'0'}});page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));await page.locator(`[data-preview-workspace="${f.studio.id}"]`).waitFor();}
async function stop(){if(!app)return;const child=app.process();child.kill('SIGTERM');await new Promise((resolve,reject)=>{if(child.exitCode!==null)return resolve();const timer=setTimeout(()=>reject(Error('Fixture did not stop gracefully')),15000);child.once('exit',()=>{clearTimeout(timer);resolve();});});app=null;}
try{
 await launch();
 await page.locator(`[data-preview-workspace="${f.studio.id}"]`).click();if(await page.locator(`[data-preview-workspace-expand="${f.studio.id}"]`).getAttribute('aria-expanded')!=='true')await page.locator(`[data-preview-workspace-expand="${f.studio.id}"]`).click();await page.locator(`[data-preview-project="${f.project.id}"]`).click();if(await page.locator(`[data-preview-expand="${f.project.id}"]`).getAttribute('aria-expanded')!=='true')await page.locator(`[data-preview-expand="${f.project.id}"]`).click();
 const initial=await session(),browser=initial.tabs.find(tab=>tab.type==='browser'&&!tab.hidden),doc=initial.tabs.find(tab=>tab.type==='markdown');
 await page.locator(`[data-preview-resource="${doc.id}"]`).click();await page.getByRole('heading',{name:'Synthetic sidebar document',exact:true}).first().waitFor();
 await page.locator(`[data-preview-workspace="${f.personal.id}"]`).click();
 const secondRoot='workspace:local:'+f.personal.id;const second=(await session()).tabs.find(tab=>tab.id===secondRoot);assert.ok(second);
 for(let i=0;i<3;i++){
  await page.locator(`[data-tab-container="${f.workspaceId}"]`).click();await page.getByRole('heading',{name:'Synthetic sidebar document',exact:true}).first().waitFor();assert.equal((await session()).active,doc.id);
  await page.locator(`[data-tab-container="${secondRoot}"]`).click();assert.equal((await session()).active,secondRoot);assert.equal((await session()).tabs.find(tab=>tab.id===secondRoot).workspacePage,second.workspacePage);
 }
 await page.locator(`[data-tab-container="${f.workspaceId}"]`).click();
 const before=await session();assert.equal(before.selectedChildren[f.workspaceId],f.parentId);assert.equal(before.selectedChildren[f.parentId],doc.id);
 assert.equal(before.tabs.find(tab=>tab.type==='browser'&&!tab.hidden).contentTabId,browser.contentTabId,'Inactive browser identity stays intact');
 await stop();await launch();
 await page.locator(`[data-tab-container="${secondRoot}"]`).waitFor();await page.locator(`[data-tab-container="${secondRoot}"]`).click();await page.locator(`[data-tab-container="${f.workspaceId}"]`).click();await page.getByRole('heading',{name:'Synthetic sidebar document',exact:true}).first().waitFor();
 const after=await session();assert.equal(after.active,doc.id);assert.equal(after.selectedChildren[f.workspaceId],f.parentId);assert.equal(after.selectedChildren[f.parentId],doc.id);assert.equal(after.tabs.filter(tab=>tab.type==='markdown'&&tab.file===doc.file).length,1);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,checks:['workspace/project/document return','independent workspace page','repeated top-nav selection','real process restart','stable resource identity'],synthetic:true}));
}finally{await stop();await f.cleanup();}
