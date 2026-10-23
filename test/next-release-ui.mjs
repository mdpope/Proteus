import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app,page;
const wait=async fn=>{for(let index=0;index<250;index++){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Next-release UI condition timed out.');};
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});page=await app.firstWindow();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();await page.locator('[data-preview-project-page="tabs"]').click();
 const session=()=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'})),before=await session(),rows=page.locator('[data-managed-tab]'),count=await rows.count();assert.ok(count>2);
 await page.getByRole('searchbox',{name:'Filter tabs'}).fill('favicon');assert.equal(await rows.count(),1);await page.getByRole('searchbox',{name:'Filter tabs'}).fill('');assert.equal(await rows.count(),count);
 await page.getByRole('combobox',{name:'Filter tab type'}).selectOption('document');assert.equal(await rows.count(),1);await page.getByRole('combobox',{name:'Filter tab type'}).selectOption('all');assert.deepEqual((await session()).tabs.map(tab=>tab.id),before.tabs.map(tab=>tab.id));
 await page.locator('[data-preview-new-chat]').click();const setup=page.locator('.new-chat-tab-panel');await setup.locator('select[id$="-provider"]').selectOption('rehearsal');await setup.getByRole('textbox',{name:'Message',exact:true}).fill('Synthetic next-release new chat selection');
 await setup.locator('[data-chat-setup-submit]').click();
 const selected=await wait(async()=>{const value=await session(),tab=value.tabs.find(tab=>tab.id===value.active);return tab?.type==='run'?tab:null;});assert.equal(selected.parentId,fixture.parentId);assert.ok(selected.runId||selected.id);assert.equal((await session()).selectedChildren[fixture.parentId],selected.id);
 await page.locator('[data-preview-workspace="'+fixture.personal.id+'"]').click();await page.locator('[data-tab-container="'+fixture.workspaceId+'"]').click();await wait(async()=>(await session()).active===selected.id);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,synthetic:true,titleAndTypeFilter:true,filterDoesNotChangeTabs:true,newChatKeepsProjectSelection:true,workspaceReturnRestoresNewChat:true}));
}catch(error){await page?.screenshot({path:process.cwd()+'/.runtime-tests/next-release-ui-failure.png'}).catch(()=>{});throw error;}finally{await app?.close();await fixture.cleanup();}
