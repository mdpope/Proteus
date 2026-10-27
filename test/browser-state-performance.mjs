// Comparable synthetic event bursts in a real disposable Electron owner.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();await page.waitForFunction(()=>document.querySelector('#workspace-launcher')||document.querySelector('#workspace-tree')||document.querySelector('#main'));
 const result=await app.evaluate(async({app})=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
  for(let i=0;i<6;i++)await browser.create('https://example.test/fixture-'+i,null,null,{unloaded:true,title:'Synthetic performance tab '+i});
  await new Promise(resolve=>setTimeout(resolve,100));const flush=browser.flushChanged.bind(browser);let flushes=0;browser.flushChanged=()=>{flushes++;flush();};
  const measure=async batched=>{flushes=0;const before=process.cpuUsage(),rss=process.memoryUsage().rss,start=performance.now();for(let i=0;i<500;i++)batched?browser.changed():browser.flushChanged();const enqueueMs=performance.now()-start;await new Promise(resolve=>setTimeout(resolve,100));return {flushes,enqueueMs,cpuMicros:process.cpuUsage(before),rssBefore:rss,rssAfter:process.memoryUsage().rss,tabs:browser.list().length,loaded:browser.list().filter(tab=>tab.loaded).length,processes:app.getAppMetrics().length};};
  const baseline=await measure(false),batched=await measure(true);browser.flushChanged=flush;return {baseline,batched,projectionDelayMs:16,workload:'500 identical owner state-change notifications; six unloaded synthetic website tabs; no model or external website fetch'};
 });
 assert.equal(result.baseline.flushes,500);assert.ok(result.batched.flushes<=5);assert.equal(result.baseline.tabs,result.batched.tabs);assert.equal(result.baseline.loaded,result.batched.loaded);console.log(JSON.stringify(result));
}finally{await app?.close();await fixture.cleanup();}
