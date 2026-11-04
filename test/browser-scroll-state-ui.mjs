// Disposable owner: verify streamed text does not refresh unrelated owner catalogs,
// while real mutations and event-stream loss still refresh the desktop.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 let fullRequests=0;page.on('request',request=>{if(new URL(request.url()).pathname==='/api/state')fullRequests++;});
 // Wait beyond the previous three-second stream cutoff before measuring.
 await page.waitForTimeout(3800);fullRequests=0;
 await app.evaluate(async({app})=>{
  const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
  for(let i=0;i<16;i++){service.engine.emit('change',{id:'synthetic-offscreen-stream'},{stream:true});await new Promise(resolve=>setTimeout(resolve,250));}
 });await page.waitForTimeout(200);assert.equal(fullRequests,0,'Offscreen streaming must not assemble full owner state');
 await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().engine.emit('change',{id:'synthetic-mutation'},{stream:false}));
 await page.waitForFunction(()=>true);for(let i=0;i<20&&!fullRequests;i++)await page.waitForTimeout(100);assert.ok(fullRequests>0,'A real mutation must immediately refresh');
 const mutationRequests=fullRequests;
 await page.evaluate(()=>{window.syntheticActivity=[];window.desktop.onBrowserActivity(rows=>window.syntheticActivity.push(...rows));});
 const activityId=await app.evaluate(async({app})=>(await process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().create('https://example.invalid/activity',null,null,{unloaded:true,title:'Synthetic activity'})).id);
 await page.locator('[data-tab="'+activityId+'"]').waitFor();
 const touched=await app.evaluate(({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=b.get(id);for(let i=0;i<100;i++){b.touch(tab);b.activityChanged(tab);}b.flushActivity();return {id:tab.id,at:new Date(tab.lastTouchedAt).toISOString()};},activityId);
 await page.waitForFunction(id=>window.syntheticActivity.some(row=>row.id===id),touched.id);
 const activity=await page.evaluate(id=>window.syntheticActivity.filter(row=>row.id===id),touched.id);assert.equal(activity.length,1);assert.equal(activity[0].lastTouchedAt,touched.at);assert.deepEqual(Object.keys(activity[0]).sort(),['id','lastActivityAt','lastTouchedAt','windowId']);
 let saved=false;for(let i=0;i<35&&!saved;i++){await page.waitForTimeout(500);saved=await page.evaluate(async({id,at})=>(await window.desktop.workspaceSession({action:'get'})).tabs.some(tab=>tab.id===id&&tab.lastTouchedAt===at),touched);}
 assert.equal(saved,true,'Narrow activity must retain deferred session persistence');
 await page.route('**/api/events',route=>route.abort());await page.reload();await page.locator('#topbar-home').waitFor();await page.waitForTimeout(1000);fullRequests=0;
 await page.waitForTimeout(2200);assert.ok(fullRequests>0,'Push loss must retain the existing fallback refresh');
 console.log(JSON.stringify({passed:true,offscreenStreamFullRefreshes:0,mutationRequests,activityBurstRows:activity.length,activityPersisted:saved,pushLossFallbackRequests:fullRequests,synthetic:true}));
}finally{await app?.close();await fixture.cleanup();}
