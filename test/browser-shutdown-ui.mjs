// Real trusted IPC during a held disposable shutdown; no live profile or provider.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const f=await sidebarFixture();let app;
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,CODEX_HOME:f.auth,PORT:'0'}});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('body.window-design-preview').waitFor();
 await app.evaluate(async({app})=>{
  const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),service=main.getService(),browser=main.getBrowser(),close=service.close.bind(service),command=browser.command.bind(browser);
  globalThis.shutdownFixture={commands:[]};
  browser.command=value=>{globalThis.shutdownFixture.commands.push(value.action);return command(value);};
  service.close=async()=>{globalThis.shutdownFixture.atClose=true;await new Promise(resolve=>globalThis.shutdownFixture.release=resolve);return close();};
  app.quit();
 });
 // Keep the real renderer alive after the normal checkpoint/browser disposal.
 for(let i=0;i<200&&!await app.evaluate(()=>globalThis.shutdownFixture.atClose===true);i++)await new Promise(r=>setTimeout(r,25));
 assert.equal(await app.evaluate(()=>globalThis.shutdownFixture.atClose===true),true);
 const result=await page.evaluate(async()=>{
  const calls=[{action:'hide',surface:'synthetic-shutdown'},{action:'overlay',token:'synthetic-shutdown',visible:true},{action:'overlay',token:'synthetic-shutdown',visible:false},{action:'create',url:'https://example.invalid/'},{action:'history'},{action:'close',id:'synthetic-browser-favicon'}];
  return Promise.all(calls.map(async value=>{try{await window.desktop.browser(value);return {action:value.action,ok:true};}catch(error){return {action:value.action,ok:false,message:error.message};}}));
 });
 assert.deepEqual(result.map(row=>row.ok),[true,true,true,false,false,false]);
 assert.ok(result.slice(3).every(row=>row.message.includes('Browser access is unavailable')));
 assert.deepEqual(await app.evaluate(()=>globalThis.shutdownFixture.commands),[],'Shutdown requests cannot reach browser commands or change tabs');
 assert.deepEqual(errors,[],'No unhandled renderer errors during shutdown');
 console.log('PASS shutdown surface cleanup is inert; create/history/close remain rejected and no browser command runs');
}finally{
 if(app){await app.evaluate(()=>globalThis.shutdownFixture?.release?.()).catch(()=>{});await app.close();}
 await f.cleanup();
}
