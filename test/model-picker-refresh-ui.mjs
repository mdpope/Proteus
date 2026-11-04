// Real mounted controls: host-state catalog updates must survive a fresh cache.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const server=createServer((req,res)=>{
  const pathname=new URL(req.url,'http://fixture').pathname,file=path.resolve(root,'.'+pathname);
  if(pathname.startsWith('/public/')&&file.startsWith(root+path.sep)&&fs.existsSync(file)) {res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(file));}
  else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="host"></div>');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try {
  browser=await chromium.launch({headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(async()=>{
    const ui=await import('/public/shared/ui/features.js');
    const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const controls={reasoningEfforts:['low','high'],contextTiers:[{id:'default'}],serviceTiers:[]};
    const first={id:'saved',name:'Saved model',controls};
    const state={data:{providerStatuses:{copilot:{available:true,checkedAt:new Date().toISOString(),models:[first],fusion:{available:false,note:'Auto is a separate choice; Fusion is not advertised.'}}}}};
    window.fixture={ui,state,controls,requests:0};
    ui.initFeatures({state,escape,toast:message=>{throw Error(message);},api:async()=>{fixture.requests++;return state.data.providerStatuses.copilot;}});
    document.querySelector('#host').innerHTML='<select id="provider"><option value="copilot">Copilot</option></select>'+ui.modelPicker('model','saved','copilot')+ui.modelControls('model',{reasoningEffort:'high'});
    await ui.refreshModels('model','provider');
    state.data.providerStatuses.copilot={...state.data.providerStatuses.copilot,models:[first,{id:'new-provider-id',name:'Newly advertised model',controls}]};
    await ui.refreshModels('model','provider');
  });
  assert.equal(await page.locator('#model option[value="new-provider-id"]').count(),1,'fresh owner-state choices populate an already mounted picker');
  assert.equal(await page.locator('#model').inputValue(),'saved');
  assert.equal(await page.locator('#model-effort').inputValue(),'high');
  assert.equal(await page.evaluate(()=>fixture.requests),0,'hydration does not bypass catalog TTL');
  assert.match(await page.locator('#model-capabilities').textContent(),/Auto is a separate choice/);
  await page.evaluate(async()=>{fixture.state.data.providerStatuses.copilot.models=fixture.state.data.providerStatuses.copilot.models.slice(1);await fixture.ui.refreshModels('model','provider');});
  assert.equal(await page.locator('#model').inputValue(),'saved');
  assert.match(await page.locator('#model option:checked').textContent(),/unavailable/);
  console.log('PASS mounted model picker receives fresh owner catalog without a network request, preserving saved model/effort and showing Fusion availability');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
