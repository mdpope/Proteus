// Synthetic tabs only; conversion must retain its slot and navigation container.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
import {until} from './remote-client.mjs';
const f=await sidebarFixture();let app;
try{
 app=await electron.launch({args:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,CODEX_HOME:f.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.locator('body.window-design-preview').waitFor();
 const session=()=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 for(const parentId of [null,f.parentId])for(const choice of ["Files","Terminal"]){
  if(parentId){if(await page.locator(`[data-preview-project="${f.project.id}"]`).count()===0)await page.locator(`[data-preview-workspace-expand="${f.studio.id}"]`).click();await page.locator(`[data-preview-project="${f.project.id}"]`).first().click();}
  const create=async()=>{await page.evaluate(parent=>document.querySelector(parent?'[data-chat-add="browser"]':'#browser').click(),parentId);await page.locator('#browser-home-url').waitFor();await until(async()=>{const s=await session();return s.tabs.some(t=>t.id===s.active&&t.type==='browser'&&!t.url);});return (await session()).active;};
  const blank=await create(),other=await create();assert.notEqual(blank,other);
  const selector=parentId?'data-chat-subtab':'data-tab';await page.locator(`[${selector}="${blank}"]`).click();await page.locator('#browser-home-url').waitFor();
  assert.match(await page.locator(`[${selector}="${blank}"]`).innerText(),/New Tab/);
  const before=await session(),index=before.tabs.findIndex(t=>t.id===blank);
  await page.locator('[data-new-tab-action]').filter({hasText:choice}).click();
  if(choice==='Terminal'){await page.locator('#terminal-session').selectOption('process');await page.locator('#dialog-submit').click();}
  const expected=choice==='Files'?'files':'terminal';
  await until(async()=>{const s=await session();return s.tabs[index]?.type===expected&&s.active===s.tabs[index].id;});
  const after=await session();assert.equal(after.tabs[index].parentId||null,parentId);assert.ok(after.tabs.some(t=>t.id===other));assert.ok(!after.tabs.some(t=>t.id===blank));
  await page.reload();await page.locator('body.window-design-preview').waitFor();await until(async()=>{const s=await session();return s.tabs[index]?.type===expected;});
 }
 console.log('PASS New Tab title, Files and Terminal conversion in existing non-final slot, parent placement and reload');
}finally{await app?.close();await f.cleanup();}
