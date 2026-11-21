import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root = path.resolve('public');
const server = createServer(async (req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://fixture').pathname);
  if (file === root) {
    res.setHeader('Content-Type','text/html');
    return res.end('<!doctype html><div id="host"></div>');
  }
  if (!file.startsWith(root+path.sep) || !file.endsWith('.js')) { res.writeHead(404);return res.end(); }
  try {
    const bytes=await readFile(file);
    res.setHeader('Content-Type','text/javascript');
    res.end(bytes);
  } catch { res.writeHead(404);res.end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(async()=>{
    const ui=await import('/shared/ui/features.js');
    const {mountOpenRouterSettings}=await import('/features/settings/openrouter.js');
    const root=document.querySelector('#host');
    const models=Array.from({length:480},(_,index)=>({
      id:'provider/model-'+index,name:'Model '+index,pricing:{input:0.000001,output:0.000002},
      controls:{contextTiers:[{id:'default',totalTokens:131072}]},
    }));
    const catalog={provider:'openrouter',available:true,credentialConfigured:true,models,checkedAt:new Date().toISOString()};
    const state={data:{providerStatuses:{openrouter:{available:true,checkedAt:catalog.checkedAt,modelCount:480}}}};
    const commands=[];
    window.fixture={ui,state,commands};
    ui.initFeatures({state,escape:value=>String(value??''),toast:message=>{throw Error(message);},
      api:async(path,value)=>{commands.push({path,value});return catalog;}});
    root.innerHTML='<select id="provider"><option value="openrouter">OpenRouter</option><option value="rehearsal">Rehearsal</option></select>'+ui.modelPicker('model','','openrouter')+ui.modelControls('model')+'<section id="settings"></section>';
    mountOpenRouterSettings(document.querySelector('#settings'),state.data.providerStatuses.openrouter,{
      api:async(path,value)=>{commands.push({path,value});return catalog;},openExternal:()=>{},refresh:()=>{},toast:message=>{throw Error(message);},
    });
    await ui.refreshModels('model','provider');
    const model=root.querySelector('#model');
    window.modelEvents=[];
    for(const type of ['change','input']) root.addEventListener(type,event=>{
      if(event.target===model) modelEvents.push([type,model.value]);
    });
  });
  assert.equal(await page.locator('#model option').count(),2);
  assert.equal(await page.getByRole('button',{name:'Browse models…',exact:true}).count(),0);
  const browse=()=>page.selectOption('#model',{label:'Browse models…'});
  await browse();
  assert.equal(await page.locator('#model').inputValue(),'');
  assert.deepEqual(await page.evaluate(()=>modelEvents),[]);
  assert.equal(await page.locator('.openrouter-model-row').count(),50);
  await page.getByRole('searchbox',{name:'Search OpenRouter models'}).fill('provider/model-479');
  await page.getByRole('button',{name:'Favorite Model 479'}).click();
  await page.getByRole('button',{name:/^Model 479/}).click();
  assert.equal(await page.locator('#model').inputValue(),'provider/model-479');
  assert.equal(await page.locator('#model option').count(),3);
  assert.deepEqual(await page.evaluate(()=>modelEvents),[['change','provider/model-479']]);
  assert.equal(await page.locator('#model-effort').isVisible(),false);
  assert.equal(await page.locator('#model-speed').isVisible(),false);
  await browse();
  await page.getByRole('button',{name:'Done',exact:true}).click();
  assert.equal(await page.locator('#model').inputValue(),'provider/model-479');
  assert.deepEqual(await page.evaluate(()=>modelEvents),[['change','provider/model-479']]);
  await page.getByRole('button',{name:'Browse models & favorites'}).click();
  assert.equal(await page.getByRole('button',{name:'Remove favorite Model 479'}).count(),1);
  await page.keyboard.press('Escape');
  await page.getByLabel('API key').fill('sk-or-v1-fixture-no-real-key');
  await page.getByRole('button',{name:'Save API key'}).click();
  assert.equal(await page.getByLabel('API key').inputValue(),'');
  assert.ok(await page.evaluate(()=>fixture.commands.some(c=>c.path==='/api/openrouter/connection'&&c.value.action==='connect')));
  await page.selectOption('#provider','rehearsal');
  await page.evaluate(()=>fixture.ui.refreshModels('model','provider'));
  assert.equal(await page.locator('#model option[data-openrouter-browse-option]').count(),0);
  console.log('PASS OpenRouter searchable catalog, favorites, provider switching and key-entry controls');
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
