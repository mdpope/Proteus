// Disposable native six-window regression. Pass an executable containing this source.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
if(!process.argv[2])throw Error('Pass the test executable path.');
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-live-events-'));
const env={...process.env,PROTEUS_HOME:home,PORT:'0',PROTEUS_CODEX_PATH:path.join(home,'no-codex'),COPILOT_CLI_PATH:path.join(home,'no-copilot'),PROTEUS_CLAUDE_PATH:path.join(home,'no-claude')};
let app;
try {
  app=await electron.launch({executablePath:path.resolve(process.argv[2]),args:['--password-store=basic','--user-data-dir='+path.join(home,'browser')],env,timeout:60000});
  const first=await app.firstWindow();await first.locator('#topbar-home').waitFor({timeout:30000});
  const pages=[first];
  for(let i=1;i<6;i++){
    const next=app.waitForEvent('window',{timeout:30000});
    await app.evaluate(({Menu,BrowserWindow})=>{const item=Menu.getApplicationMenu().items.find(x=>x.label==='File').submenu.items.find(x=>x.label==='New Window');item.click(item,BrowserWindow.getAllWindows()[0],{});});
    pages.push(await next);
  }
  for(const page of pages){
    await page.waitForFunction(()=>!!document.querySelector('#topbar-home'),null,{timeout:30000});
    await page.evaluate(async()=>{const {createLiveEvents}=await import('/services/live-events.js');window.testLiveEvents=createLiveEvents();window.testPackets=[];for(const type of ['change','content-tabs','project-follow'])window.testLiveEvents.addEventListener(type,event=>window.testPackets.push([type,event.data]));});
    await page.waitForFunction(()=>window.testLiveEvents.readyState===1,null,{timeout:15000});
    assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/home');return r.status;}),200);
  }
  const publish=()=>app.evaluate(({app})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();service.projectFollow.changed({scope:'workspace',id:'test',state:null});service.contentTabs.onChange({scope:'workspace',id:'test',revision:1});service.engine.emit('change',{id:'test'},{stream:true});});
  const receive=page=>page.waitForFunction(()=>['change','content-tabs','project-follow'].every(type=>window.testPackets.some(packet=>packet[0]===type)),null,{timeout:15000});
  await publish();await Promise.all(pages.map(receive));
  for(const page of pages.slice(0,5))await page.close();
  await pages[5].evaluate(()=>{window.testPackets=[];});
  await publish();await receive(pages[5]);
  console.log(JSON.stringify({passed:true,checks:['six windows fetch Home','all three event types reach every window','remaining window receives events after five close']}));
} finally {if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
