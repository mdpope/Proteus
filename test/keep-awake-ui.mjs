// Disposable Electron UI/OS assertion rehearsal; no personal settings or providers.
import { _electron as electron } from 'playwright';
import { sidebarFixture } from './preview-sidebar-fixture.mjs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const fixture=await sidebarFixture(); let app;
const assertions=pid=>process.platform==='darwin'?execFileSync('/usr/bin/pmset',['-g','assertions'],{encoding:'utf8'}).split('\n').filter(line=>new RegExp(`pid\\s+${pid}\\(`).test(line)&&/PreventUserIdleDisplaySleep|NoDisplaySleepAssertion/.test(line)):[];
try {
  app=await electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
  const page=await app.firstWindow(); await page.locator('body.window-design-preview').waitFor();
  const state=enabled=>app.evaluate(({app},{enabled})=>{
    const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');
    const item=main.getHostMenu().getMenuItemById('keep-screen-awake');
    if(enabled!==null && item.checked!==enabled) item.click(item);
    return {checked:item.checked,label:item.label,tray:!main.getTray().isDestroyed(),pid:process.pid};
  },{enabled});
  const initial=await state(null); assert.equal(initial.checked,false); assert.equal(initial.label,'Keep Screen Awake'); assert.ok(initial.tray);
  assert.equal(assertions(initial.pid).length,0);
  await state(true); assert.equal((await state(null)).checked,true);
  if(process.platform==='darwin'){for(let i=0;i<50&&!assertions(initial.pid).length;i++)await new Promise(resolve=>setTimeout(resolve,100));assert.ok(assertions(initial.pid).length>0,'real display-sleep assertion');}
  await page.evaluate(()=>window.close());
  assert.equal((await state(null)).checked,true,'closing/hiding the UI retains background assertion');
  await state(false); for(let i=0;i<50&&assertions(initial.pid).length;i++)await new Promise(resolve=>setTimeout(resolve,100));assert.equal(assertions(initial.pid).length,0);
  await state(true); await app.close(); app=null;
  assert.equal(assertions(initial.pid).length,0,'quit releases the assertion');
  console.log('PASS: real tray toggle, native sleep assertion, background operation, off and quit cleanup');
} finally { await app?.close(); await fixture.cleanup(); }
