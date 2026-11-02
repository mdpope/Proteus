// Disposable synthetic data, mock Keychain and loopback content only.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
import {versionLabel} from '../public/shared/ui/release-label.js';
const metadata=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));
const fixture=await sidebarFixture();let app;
const until=async(fn,label)=>{for(let i=0;i<100;i++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
try{
 app=await electron.launch({...(process.env.PROTEUS_UI_EXECUTABLE?{executablePath:process.env.PROTEUS_UI_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_UI_EXECUTABLE?[]:[process.env.PROTEUS_TEST_APP_ROOT||'.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 await page.locator('[data-page=home]').click();await page.locator('#home-screen').waitFor();
 assert.equal(await page.locator('.home-build strong').textContent(),versionLabel(metadata));
 const tab=await page.evaluate(value=>window.desktop.browser({action:'create',...value}),{parentId:fixture.parentId,url:fixture.origin+'/geometry'});
 await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();
 await until(()=>page.locator('[data-chat-subtab="'+tab.id+'"]').count(),'new browser view');await page.locator('[data-chat-subtab="'+tab.id+'"]').click();
 const native=()=>app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view?.getBounds(),tab.id);
 const area=()=>page.locator('#browser-area').evaluate(node=>{const r=node.getBoundingClientRect();return Object.fromEntries(['x','y','width','height'].map(key=>[key,Math.round(r[key])]))});
 await until(async()=>JSON.stringify(await native())===JSON.stringify(await area()),'initial bounds');
 await page.waitForTimeout(500);await page.locator('#browser-form').evaluate(node=>node.style.minHeight='130px');
 await until(async()=>JSON.stringify(await native())===JSON.stringify(await area()),'changed surface bounds without selecting another tab');
 await page.locator('#browser-form').evaluate(node=>node.style.minHeight='');await until(async()=>JSON.stringify(await native())===JSON.stringify(await area()),'full reclaimed surface');
 // Run production IntegrationHealth inside Electron's owner event loop. No real
 // sessions/providers or persistent user context enter this synthetic monitor.
 await app.evaluate(async({app},root)=>{
  const require=process.mainModule.require.bind(process.mainModule),path=require('node:path'),IntegrationHealth=require(app.getAppPath()+'/desktop/main.cjs').getService().integrations.constructor;
  const runs=Array.from({length:600},(_,i)=>({id:'synthetic-'+i,title:'Synthetic',providerSessionId:'fake',schedule:{provider:'fake',context:{padding:'x'.repeat(27000)},mcpServers:{one:{command:'fake'},two:{command:'fake'}}}})),byId=new Map(runs.map(run=>[run.id,run]));
  let scans=0,probes=0;const engine={listRuns:()=>{scans++;return runs;},getRun:id=>byId.get(id),running:new Map(),providers:{fake:{sessions:new Map(),hasMcpSession:()=>true,mcpStatus:async()=>{probes++;return {servers:[{name:'one',status:'connected'},{name:'two',status:'connected'}]};}}}};
  const health=new IntegrationHealth(path.join(root,'synthetic-monitor'),{engine}),gaps=[],syncCosts={persist:0,consumers:0};let last=performance.now();
  for(const name of Object.keys(syncCosts)){const original=health[name].bind(health);health[name]=(...args)=>{const began=performance.now();try{return original(...args);}finally{syncCosts[name]=Math.max(syncCosts[name],performance.now()-began);}};}
  const timer=setInterval(()=>{const now=performance.now();gaps.push(now-last);last=now;},5),start=performance.now(),heap=process.memoryUsage().heapUsed;
  process.__nov1Monitor={done:false};
  process.__nov1Monitor.promise=(async()=>{try{for(let i=0;i<3;i++){health.data.observations={};await health.tick();}process.__nov1Monitor.result={elapsedMs:performance.now()-start,scans,probes,maxGapMs:Math.max(...gaps),p95GapMs:gaps.sort((a,b)=>a-b)[Math.floor(gaps.length*.95)],heapDeltaBytes:process.memoryUsage().heapUsed-heap,maxPersistMs:syncCosts.persist,maxConsumerProjectionMs:syncCosts.consumers};}finally{clearInterval(timer);await health.close();process.__nov1Monitor.done=true;}})();
 },fixture.temporary);
 const latencies=[];
 for(let i=0;i<10;i++){
  const start=Date.now();await page.locator('#browser-url').fill('synthetic typing '+i);await page.evaluate(()=>fetch('/api/state?summaries=1',{headers:{'Authorization':'Bearer '+new URLSearchParams(location.search).get('token')}}).then(response=>{if(!response.ok)throw Error('Loopback health failed');}));latencies.push(Date.now()-start);
  if(await app.evaluate(()=>process.__nov1Monitor.done))break;
 }
 await app.evaluate(()=>process.__nov1Monitor.promise);const metrics=await app.evaluate(()=>process.__nov1Monitor.result);
 console.log(JSON.stringify({synthetic:true,measurement:metrics,maxInputAndApiMs:Math.max(...latencies)}));
 assert.equal(metrics.scans,3);assert.equal(metrics.probes,1800);assert.ok(metrics.maxGapMs<100,JSON.stringify(metrics));assert.ok(Math.max(...latencies)<1000,JSON.stringify(latencies));
 assert.match(await page.locator('#browser-url').inputValue(),/^synthetic typing/);
 await page.screenshot({path:process.env.PROTEUS_UI_SCREENSHOT||'/private/tmp/proteus-nov1-synthetic-ui.png'});
 console.log(JSON.stringify({passed:true,synthetic:true,browserGeometryWithoutTabSwitch:true,typingAndLoopbackDuringBackgroundChecks:true,...metrics,maxInputAndApiMs:Math.max(...latencies)}));
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),10000);try{await app.close();}finally{clearTimeout(timer);}}await fixture.cleanup();}
