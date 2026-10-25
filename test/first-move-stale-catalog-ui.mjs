// Reproduces the placement acknowledgement failure when the owning renderer's
// project catalog lags the canonical owner. All data and windows are disposable.
import {_electron} from 'playwright';import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture(),baseline=process.argv.includes('--baseline');let app,page;
try{
 app=await _electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 page=await app.firstWindow();page.setDefaultTimeout(15000);
 if(baseline){await page.route('**/app.js',route=>route.fulfill({contentType:'text/javascript',body:execFileSync('git',['show','d0a30fd:public/app.js'],{encoding:'utf8'})}));await page.reload();}
 await page.locator('#topbar-home').waitFor();await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();await page.locator('[data-preview-project-page="tabs"]').click();
 const result=await app.evaluate(async({app},workspaceId)=>{
  const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService(),catalog=service.workspaceProjects.read();
  service.workspaceProjects.projects({action:'create',workspaceId,name:'Synthetic newer owner destination',expectedRevision:catalog.revision},service.engine);
  const target=service.workspaceProjects.read().projects.find(p=>p.name==='Synthetic newer owner destination'),source=service.contentTabs.list({type:'browser'}).find(t=>t.id==='synthetic-browser-favicon'),destination=service.contentTabs.get('project',target.id),started=Date.now();
  let error;try{await service.tabManagement.handle({action:'move',scope:source.scope,id:source.scopeId,tabId:source.id,expectedRevision:source.revision,destination:{scope:'project',id:target.id,expectedRevision:destination.revision}});}catch(failure){error=failure.message;}
  return {error,durationMs:Date.now()-started,targetId:target.id,canonicalMoved:service.contentTabs.get('project',target.id).tabs.some(tab=>tab.id===source.id)};
 },fixture.studio.id);
 if(baseline){assert.match(result.error,/did not acknowledge the tab placement/);assert.equal(result.canonicalMoved,true);console.log(JSON.stringify({passed:true,oldRendererFailureReproduced:true,...result}));}
 else{assert.equal(result.error,undefined);assert.ok(result.durationMs<4000);assert.equal(result.canonicalMoved,true);const saved=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));assert.equal(saved.tabs.find(tab=>(tab.contentTabId||tab.id)==='synthetic-browser-favicon').parentId,'project:local:'+result.targetId);console.log(JSON.stringify({passed:true,firstAttemptAcknowledged:true,stableBrowserIdentity:true,...result}));}
}finally{await app?.close();await fixture.cleanup();}
