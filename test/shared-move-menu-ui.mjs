import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app,page;const errors=[];
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();await page.locator('[data-preview-project-page="tabs"]').click();
 const session=()=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'})),before=await session(),sources=before.tabs.filter(tab=>tab.parentId===fixture.parentId&&['browser','markdown','run'].includes(tab.type));
 const types=new Set();
 for(const source of sources){if(types.has(source.type))continue;types.add(source.type);
  await page.locator('[data-managed-tab="'+source.id+'"] [data-action="move"]').click();const menu=page.locator('[data-move-destination]');await menu.waitFor();
  assert.equal(await menu.count(),1);assert.equal(await menu.inputValue(),source.type==='run'?fixture.project.id:fixture.parentId);assert.equal(await page.locator('#dialog-submit').isDisabled(),true);
  const labels=await menu.locator('optgroup').evaluateAll(nodes=>nodes.map(node=>node.label));assert.ok(labels.includes(fixture.studio.name));assert.ok(labels.includes(fixture.personal.name));await page.locator('#close-dialog').click();
 }
 assert.deepEqual([...types].sort(),['browser','markdown','run']);
 await page.locator('[data-bulk-select]').click();for(const source of sources.filter(tab=>tab.type!=='run').slice(0,2))await page.locator('[data-select-tab="'+source.id+'"]').check();await page.locator('[data-bulk-action="move"]').click();assert.equal(await page.locator('[data-move-destination]').inputValue(),fixture.parentId);await page.locator('#close-dialog').click();
 assert.deepEqual((await session()).tabs.map(tab=>({id:tab.id,parentId:tab.parentId})),before.tabs.map(tab=>({id:tab.id,parentId:tab.parentId})));assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,sharedMenuBrowserChatDocument:true,currentProjectInitiallySelected:true,bulkUsesSameMenu:true,cancelPreservesPlacement:true}));
}catch(error){await page?.screenshot({path:process.cwd()+'/.runtime-tests/shared-move-menu-failure.png'}).catch(()=>{});throw error;}finally{await app?.close();await fixture.cleanup();}
