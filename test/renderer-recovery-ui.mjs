// Actual renderer termination, isolated app home, synthetic held turns; no model calls.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const f=await sidebarFixture();let app;
const until=async(fn,label)=>{for(let i=0;i<250;i++){try{if(await fn())return;}catch{}await new Promise(resolve=>setTimeout(resolve,80));}throw Error('Timed out: '+label);};
const host=(fn,value)=>app.evaluate(async({app},{fn,value})=>new Function('main','value','return ('+fn+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{fn:fn.toString(),value});
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+f.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,PROTEUS_HOME:f.locations.home,CODEX_HOME:f.auth,PORT:'0'}});
 const first=await app.firstWindow();await first.locator('#topbar-home').waitFor();const created=app.waitForEvent('window');await host(main=>main.createWindow());const second=await created;await second.locator('#topbar-home').waitFor();
 const ids=await Promise.all([first,second].map(page=>page.evaluate(()=>window.desktop.windowId)));
 const browsers=[];
 for(const [index,page]of [first,second].entries()){
  if(index){await page.locator('[data-page="team"]').click();await page.locator('.team-tab-add>summary').click();}else await page.locator('#tab-add-menu>summary').click();
  const address=page.locator(index?'#team-browser-url':'#browser-url');await address.fill(f.origin+'/recovery-'+index);await address.press('Enter');await until(()=>address.inputValue().then(url=>url===f.origin+'/recovery-'+index),'page navigation');
  const row=await page.evaluate(()=>window.desktop.browser({action:'list'}));browsers.push(row.find(tab=>tab.url.endsWith('/recovery-'+index)).id);
  if(index)await until(()=>page.evaluate(async url=>(await window.desktop.workspaceSession({action:'get'})).team?.tabs.some(tab=>tab.url===url),f.origin+'/recovery-'+index),'Team navigation persisted before crash');
  await page.evaluate(async index=>{const saved=await window.desktop.workspaceSession({action:'get'});await window.desktop.workspaceSession({action:'save',session:{...saved,chatDrafts:{...saved.chatDrafts,'synthetic-draft':'Unsent recovery draft '+index}}});await window.desktop.viewPositions({action:'set',key:'document:recovery',position:[['root',{top:200+index,left:0}]]});},index);
 }
 const background=await first.evaluate(url=>window.desktop.browser({action:'create',url}),f.origin+'/background-form');browsers.push(background.id);
 for(let i=0;i<10;i++)await first.evaluate(()=>window.desktop.browser({action:'create'}));
 const turns=await host(main=>{
  const service=main.getService(),engine=service.engine;service.recoveryProbe={starts:0,ends:0,aborts:0,ticks:0};const probe=service.recoveryProbe;
  probe.originalTick=engine.tick;engine.tick=function(...args){probe.ticks++;return probe.originalTick.apply(this,args);};
  engine.providers.rehearsal={async run({run,emit,ask,signal}){let finished=false;probe.starts++;signal.addEventListener('abort',()=>{if(!finished)probe.aborts++;});emit('assistant','Synthetic crash-recovery rehearsal; no provider called.');if(run.schedule.prompt==='pending')await ask({type:'permission',question:'Synthetic approval retained',details:{kind:'write',path:run.schedule.workspace.cwd+'/synthetic-recovery.txt',toolName:'apply_patch'}});else await new Promise(resolve=>probe.release=resolve);finished=true;probe.ends++;emit('assistant','Synthetic turn finished exactly once.');},async status(){return {available:true,label:'Synthetic recovery rehearsal'};},async close(){}};
  const base=structuredClone(engine.listRuns()[0].schedule);base.provider='rehearsal';base.model='';base.enabled=false;base.permissions={mode:'ask'};
  return ['pending','held'].map(prompt=>engine.createRun({...structuredClone(base),id:'synthetic-recovery-'+prompt,prompt},'chat').id);
 });
 await until(()=>host((main,turns)=>{const service=main.getService();return service.recoveryProbe.starts===2&&service.engine.getRun(turns[0]).pending&&service.engine.getRun(turns[1]).status==='running';},turns),'two synthetic provider invocations held');
 const before=await host((main,{ids,browsers,turns})=>({pid:process.pid,pending:structuredClone(main.getService().engine.getRun(turns[0]).pending),windows:ids.map(id=>({id,session:main.getWindows().contexts.get(id).session.get(),generation:main.getWindows().contexts.get(id).recovery.generation})),pages:browsers.map(id=>{const wc=main.getBrowser().get(id).view.webContents;void wc.executeJavaScript('window.syntheticRecoveryMarker="retained-form-state"');return {id,wc:wc.id,pid:wc.getOSProcessId()};}),ticks:main.getService().recoveryProbe.ticks}),{ids,browsers,turns});
 await first.locator('#all-tabs-overview').click();await first.getByRole('dialog',{name:'App tab overview',exact:true}).waitFor();
 const crashed=first.waitForEvent('crash');await host((main,id)=>main.getWindows().contexts.get(id).window.webContents.forcefullyCrashRenderer(),ids[0]);await crashed;
 await until(()=>host((main,ids)=>ids.every(id=>{const ctx=main.getWindows().contexts.get(id);return !ctx.recovery.restoring&&!ctx.window.webContents.isCrashed();}),ids),'both window controllers healthy after real renderer death');
 // Playwright permanently flags the old Page target as crashed. Observe the
 // replacement renderer through its same host-owned WebContents after real IPC ready.
 assert.equal(await host(async(main,ids)=>(await Promise.all(ids.map(id=>main.getWindows().contexts.get(id).window.webContents.executeJavaScript("!!(document.querySelector('#topbar-home')&&document.querySelector('#browser-form,#team-browser-form'))")))).every(Boolean),ids),true);
 await until(()=>host((main,id)=>main.getWindows().contexts.get(id).window.webContents.executeJavaScript("(()=>{const tab=document.querySelector('#tabs .tabitem.selected')?.getBoundingClientRect(),strip=document.querySelector('#tabs .tab-list')?.getBoundingClientRect();return tab&&strip&&tab.left>=strip.left-1&&tab.right<=strip.right+1;})()"),ids[0]),'restored selected tab revealed rather than last restored tab');
 const verify=async()=>{
  const after=await host(async(main,{ids,browsers,turns})=>({pid:process.pid,windows:ids.map(id=>({id,session:main.getWindows().contexts.get(id).session.get(),restoring:main.getWindows().contexts.get(id).recovery.restoring})),pending:main.getService().engine.getRun(turns[0]).pending,pages:await Promise.all(browsers.map(async id=>{const wc=main.getBrowser().get(id).view?.webContents;return {id,wc:wc?.id,pid:wc?.getOSProcessId(),marker:wc&&await wc.executeJavaScript('window.syntheticRecoveryMarker')};})),probe:{starts:main.getService().recoveryProbe.starts,ends:main.getService().recoveryProbe.ends,aborts:main.getService().recoveryProbe.aborts,ticks:main.getService().recoveryProbe.ticks}}),{ids,browsers,turns});
  assert.equal(after.pid,before.pid);assert.deepEqual(after.pending,before.pending);assert.equal(after.probe.starts,2);assert.equal(after.probe.aborts,0);assert.equal(after.probe.ends,0);assert.ok(after.probe.ticks>before.ticks);
  for(const [index,row]of after.windows.entries()){assert.equal(row.session.active,before.windows[index].session.active);assert.deepEqual(row.session.tabs.map(tab=>tab.id),before.windows[index].session.tabs.map(tab=>tab.id));assert.deepEqual(row.session.chatDrafts,before.windows[index].session.chatDrafts);assert.equal(row.session.page,before.windows[index].session.page);assert.equal(row.session.team?.active,before.windows[index].session.team?.active);assert.deepEqual(row.session.team?.tabs.map(tab=>[tab.id,tab.contentTabId,tab.browserId,tab.url]),before.windows[index].session.team?.tabs.map(tab=>[tab.id,tab.contentTabId,tab.browserId,tab.url]));}
  assert.deepEqual(after.pages.map(({marker,...row})=>row),before.pages);assert.ok(after.pages.every(row=>row.marker==='retained-form-state'));
 };
 await until(()=>host((main,ticks)=>main.getService().recoveryProbe.ticks>ticks,before.ticks),'actual scheduler polling continues');await verify();assert.equal(await host((main,id)=>main.getWindows().contexts.get(id).window.webContents.executeJavaScript("document.querySelectorAll('dialog[open]').length"),ids[0]),0);
 assert.equal(await host((main,id)=>main.getWindows().run(id,()=>{const browser=main.getBrowser();return browser.get(browser.active).view.getVisible()&&!browser.overviewOpen&&!browser.overlays.size;}),ids[0]),true,'The stale overview cannot leave a black native page');
 // Exercise recovery again with the other window owning selection/focus.
 const otherCrash=second.waitForEvent('crash');await host((main,id)=>main.getWindows().contexts.get(id).window.webContents.forcefullyCrashRenderer(),ids[1]);await otherCrash;
 await until(()=>host((main,ids)=>ids.every(id=>!main.getWindows().contexts.get(id).recovery.restoring&&!main.getWindows().contexts.get(id).window.webContents.isCrashed()),ids),'second window recovers');await verify();
 for(const [index,id]of ids.entries()){const rows=await host((main,id)=>main.getWindows().contexts.get(id).window.webContents.executeJavaScript("window.desktop.viewPositions({action:'get'})"),id);assert.equal(rows.find(([key])=>key==='document:recovery')[1][0][1].top,200+index);}
 // Fail the app-ready acknowledgement, rather than replacing the crash event,
 // to exercise the actual local recovery page and the native View menu retry.
 await host((main,id)=>{const recovery=main.getWindows().contexts.get(id).recovery;recovery.originalReady=recovery.ready;recovery.ready=()=>false;recovery.delays=[1];recovery.timeout=100;recovery.reload();},ids[1]);
 await until(()=>host(async(main,id)=>{const ctx=main.getWindows().contexts.get(id);return ctx.recovery.fallback&&await ctx.window.webContents.executeJavaScript("document.body.innerText.includes('could not recover automatically')");},ids[1]),'visible bounded recovery page');
 await assert.rejects(host((main,id)=>main.getWindows().contexts.get(id).window.webContents.executeJavaScript("window.desktop.workspaceSession({action:'get'})"),ids[1]),/Untrusted renderer/);
 await host((main,id)=>{const recovery=main.getWindows().contexts.get(id).recovery;recovery.ready=recovery.originalReady;recovery.delays=[250,1000,3000];recovery.timeout=30000;const {Menu}=process.mainModule.require('electron');main.getWindows().run(id,()=>Menu.getApplicationMenu().getMenuItemById('reload-window').click());},ids[1]);
 await until(()=>host((main,id)=>{const recovery=main.getWindows().contexts.get(id).recovery;return !recovery.restoring&&!recovery.fallback;},ids[1]),'native View reload recovers original window');await verify();
 await host(main=>{const probe=main.getService().recoveryProbe;probe.release();});await host((main,turns)=>{const run=main.getService().engine.getRun(turns[0]);main.getService().engine.reply(run.id,'approve',run.pending.id);},turns);
 await until(()=>host((main,turns)=>turns.every(id=>main.getService().engine.getRun(id).status==='completed'),turns),'same two turns finish');
 assert.deepEqual(await host(main=>{const p=main.getService().recoveryProbe;main.getService().engine.tick=p.originalTick;return {starts:p.starts,ends:p.ends,aborts:p.aborts};}),{starts:2,ends:2,aborts:0});
 console.log('PASS real renderer crashes in main-browser and Team windows; host/scheduler continue, native browser processes and form state survive, independent tabs/drafts/reading positions and pending approval retained, exactly two original turns finish once');
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),10000);try{await app.close();}finally{clearTimeout(timer);}}await f.cleanup();}
