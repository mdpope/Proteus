import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture(),baseline=process.argv.includes('--baseline'),activeMove=process.argv.includes('--active');let app,page;
fs.appendFileSync(fixture.document,'\n[Relative preview](../linked.md) · [Web preview](https://example.invalid/preview)\n');
const errors=[];
try{
 app=await _electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 if(baseline){await page.route('**/app.js',route=>route.fulfill({contentType:'text/javascript',body:execFileSync('git',['show','d0a30fd:public/app.js'],{encoding:'utf8'})}));await page.reload();}
 await page.locator('#topbar-home').waitFor();
 await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();await page.locator('[data-preview-project-page="tabs"]').click();
 const session=()=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 const source=(await session()).tabs.find(t=>t.type==='browser'&&t.parentId===fixture.parentId&&!t.hidden),destination=fixture.projects.find(p=>p.workspaceId===fixture.studio.id&&p.id!==fixture.project.id);
 if(activeMove){
  await page.locator('[data-chat-subtab="'+source.id+'"]').click();await page.waitForFunction(async id=>(await window.desktop.browser({action:'list'})).find(tab=>tab.id===id)?.loaded,source.id);
  await app.evaluate(({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),command=browser.command;browser.command=function(value,...args){if(value.action==='popup-menu')return Promise.resolve('move-tab');return command.call(this,value,...args);};});
  await page.locator('[data-chat-subtab="'+source.id+'"]').click({button:'right'});
 }else await page.locator('[data-managed-tab="'+source.id+'"] [data-action="move"]').click();
 await page.locator('[data-move-destination]').selectOption('project:local:'+destination.id);
 const started=Date.now();await page.locator('#dialog-submit').click();
 if(baseline){await page.locator('#toast').filter({hasText:'did not acknowledge'}).waitFor();console.log(JSON.stringify({passed:true,baselineAcknowledgementFailureReproduced:true,durationMs:Date.now()-started}));}
 else{
  await page.locator('#dialog').waitFor({state:'hidden',timeout:4500});const moveMs=Date.now()-started;assert.ok(moveMs<4000,'first move must not wait for acknowledgement timeout');
  const moved=(await session()).tabs.find(t=>t.id===source.id);assert.equal(moved.parentId,'project:local:'+destination.id);
  // Use the actual header-menu handler with a deterministic menu choice. All
  // placement, visibility, native unload and persistence still use real code.
  await page.locator('[data-preview-project="'+destination.id+'"]').first().click();
  await app.evaluate(({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),command=browser.command;browser.command=function(value,...args){if(value.action==='popup-menu')return Promise.resolve('hide');return command.call(this,value,...args);};});
  const header=page.locator('[data-chat-subtab="'+source.id+'"]');await header.waitFor();const hiding=Date.now();await header.click({button:'right'});
  await header.waitFor({state:'hidden',timeout:4500});const hideMs=Date.now()-hiding;
  assert.equal((await session()).tabs.find(t=>t.id===source.id).hidden,true);assert.ok(hideMs<4000);
  const ordinary=await page.evaluate(async id=>(await window.desktop.browser({action:'list'})).find(tab=>tab.id===id),source.id);assert.equal(ordinary.loaded,false);
  await page.evaluate(async id=>{await window.desktop.browser({action:'persist',id,enabled:true});await window.desktop.browser({action:'visibility',id,hidden:false});},source.id);
  await page.locator('[data-chat-subtab="'+source.id+'"]').waitFor();await page.locator('[data-chat-subtab="'+source.id+'"]').click();
  const persistedBefore=await page.evaluate(async id=>(await window.desktop.browser({action:'list'})).find(tab=>tab.id===id),source.id);
  await page.locator('[data-chat-subtab="'+source.id+'"]').click({button:'right'});await page.locator('[data-chat-subtab="'+source.id+'"]').waitFor({state:'hidden'});
  const persistedAfter=await page.evaluate(async id=>(await window.desktop.browser({action:'list'})).find(tab=>tab.id===id),source.id);assert.equal(persistedAfter.loaded,true);assert.equal(persistedAfter.persist,true);assert.equal(persistedAfter.hidden,true);assert.deepEqual(persistedAfter.history,persistedBefore.history);
  const coldId=await app.evaluate(({app},{project,url})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService(),current=service.contentTabs.get('project',project),id='synthetic-cold-logical-tab';service.contentTabs.mutate({scope:'project',id:project,expectedRevision:current.revision,operations:[{action:'open',tab:{id,type:'browser',profileId:'default',title:'Synthetic never instantiated',url}}]});return id;},{project:fixture.projects.at(-1).id,url:fixture.origin+'/never-loaded'});
  await page.locator('[data-page="engine"]').first().click();await page.locator('[data-resource-refresh]').waitFor();
  await page.locator('[data-resource-row]').first().waitFor();const unloaded=page.locator('[data-resource-state="unloaded"]');assert.ok(await unloaded.count()>0);
  await page.locator('[data-resource-kind="system"]').click();await page.locator('[data-resource-kind="loaded"]').click();assert.equal(await page.locator('[data-resource-state="system"],[data-resource-state="loaded"]').count(),0);
  await page.locator('[data-resource-filter]').fill('Synthetic');await page.locator('[data-resource-refresh]').click();assert.equal(await page.locator('[data-resource-filter]').inputValue(),'Synthetic');assert.equal(await page.locator('[data-resource-kind="system"]').getAttribute('aria-pressed'),'false');
  await page.locator('[data-resource-close="'+coldId+'"]').click();await page.locator('[data-resource-close="'+coldId+'"]').waitFor({state:'hidden'});assert.equal(fixture.requests.includes('/never-loaded'),false);
  await page.evaluate(()=>window.desktop.notice({id:'synthetic-bottom-notice',message:'Synthetic bottom notification',actions:[]}));
  await page.waitForTimeout(200);const notice=await app.evaluate(({BrowserWindow})=>{const child=BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().endsWith('/notice.html'));return {bounds:child.getBounds(),parent:child.getParentWindow().getContentBounds()};});assert.ok(notice.bounds.y>notice.parent.y+notice.parent.height/2);assert.ok(notice.bounds.y+notice.bounds.height<=notice.parent.y+notice.parent.height);await page.evaluate(()=>window.desktop.notice({action:'dismiss',id:'synthetic-bottom-notice'}));
  await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();await page.locator('[data-chat-subtab="markdown:'+fixture.document+'"]').click();
  await page.locator('.markdown-preview a').filter({hasText:'Relative preview'}).hover();await page.locator('.link-destination-preview').filter({hasText:'file://'+path.join(path.dirname(fixture.document),'../linked.md')}).waitFor();
  await page.locator('.markdown-preview a').filter({hasText:'Web preview'}).hover();await page.locator('.link-destination-preview').filter({hasText:'https://example.invalid/preview'}).waitFor();await page.mouse.move(0,0);await page.locator('.link-destination-preview').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,firstMoveMs:moveMs,hideHeaderMs:hideMs,stableBrowserIdentity:!!moved,ordinaryHideUnloaded:true,persistedHideKeepsPageAndHistory:true,unloadedResources:true,canonicalColdCloseWithoutLoad:true,refreshPreservesFilters:true,bottomNativeNotice:true,markdownFileAndWebPreview:true}));
 }
}catch(error){await page?.screenshot({path:process.cwd()+'/.runtime-tests/combined-tabs-failure.png'}).catch(()=>{});throw error;}
finally{await app?.close();await fixture.cleanup();}
