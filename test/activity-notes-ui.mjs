// Exercises default activity grouping in the real renderer with disposable saved chats, without provider turns.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'activity-compare-'))),home=path.join(root,'preview');let app,page;
const launch=async()=>{app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:home,PORT:'0'},timeout:60000});page=await app.firstWindow();page.setDefaultTimeout(20000);await page.locator('#topbar-home').waitFor();};
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
try{
 await launch();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const fixture=await app.evaluate(({app},home)=>{
  const {engine}=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();engine.drain=async()=>{};
  const make=provider=>{const run=engine.createRun({schemaVersion:1,id:'synthetic-'+provider,name:'Synthetic '+provider,enabled:false,cron:'0 9 * * *',timezone:'UTC',provider,model:'synthetic-model',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic activity comparison'},'chat',null,{deferStart:true});run.status='completed';run.title='Synthetic comparison '+provider;
   run.events=Array.from({length:32},(_,i)=>({role:i%2?'assistant':'user',at:'2026-10-12T11:00:00Z',text:'Earlier synthetic message '+i+'\n'+('An earlier paragraph for reading-position verification.\n'.repeat(6))}));
   const note=provider==='mtplx'?{role:'system',text:'MTPLX is thinking.'}:{role:'assistant',text:'Synthetic explicit commentary',data:{phase:'commentary'}};
   const tool=id=>({role:'tool',at:'2026-10-12T12:00:03Z',data:{tool:{callId:id,name:'read_file',summary:'Synthetic read '+id,status:'completed',durationMs:2000,startedAt:'2026-10-12T12:00:01Z',finishedAt:'2026-10-12T12:00:03Z',arguments:'{"path":"synthetic.md"}',output:'Synthetic tool output '+id}}});
   run.events.push({role:'user',text:'Synthetic saved request'}, {...structuredClone(note),at:'2026-10-12T12:00:00Z'},tool('one'),{...structuredClone(note),at:'2026-10-12T12:00:04Z'},tool('two'),
    {role:'system',text:'Synthetic captured phase',data:{activity:{id:'phase',provider,kind:'thinking',label:'Thinking',source:'Synthetic protocol fixture',status:'completed',startedAt:'2026-10-12T12:00:00Z',finishedAt:'2026-10-12T12:00:08Z',durationMs:8000,...(provider==='codex'?{summary:'Synthetic public provider summary.'}:{})}}},
    {role:'system',text:'Synthetic usage',data:{activity:{id:'usage',provider,kind:'usage',label:'Usage',source:'Synthetic usage fixture',scope:'model-request',status:'completed',values:{inputTokens:10,outputTokens:5,cachedInputTokens:0,reasoningTokens:2}}}},
    {role:'system',text:'Synthetic warning stays visible'}, {role:'system',text:'Synthetic answered question',data:{question:{id:'question-'+provider,status:'answered'}}},{role:'user',text:'Synthetic reply',data:{questionReply:{requestId:'question-'+provider}}},{role:'assistant',agentName:provider==='mtplx'?'Proteus':({codex:'Codex',claude:'Claude',copilot:'Copilot'}[provider]),text:'Synthetic final answer',data:{phase:'final_answer'}});
   engine.persist(run);return {id:run.id,file:engine.runsDir+'/'+run.id+'.json'};};return Object.fromEntries(['mtplx','codex','claude','copilot'].map(provider=>[provider,make(provider)]));
 },home);
 const before=Object.fromEntries(Object.entries(fixture).map(([provider,r])=>[provider,hash(r.file)]));
 await page.locator('[data-page="runs"]').first().click();
 for(const provider of ['mtplx','codex','claude','copilot']){
  await page.locator('.chat-index-row').filter({hasText:'Synthetic comparison '+provider}).click();
  await page.locator('#followup').waitFor();assert.equal(await page.locator('[data-activity-view],.activity-comparison').count(),0);
  await page.locator('#followup').fill('Retained unsent comparison draft');const composer=await page.locator('#followup').elementHandle();
  const visibleNote=provider==='mtplx'?page.locator('.conversation-messages>.message.system').filter({hasText:'MTPLX is thinking.'}):page.locator('.conversation-messages>.message.assistant').filter({hasText:'Synthetic explicit commentary'});
  assert.equal(await visibleNote.count(),provider==='mtplx'?0:2);assert.equal(await page.locator('.activity-group').count(),provider==='mtplx'?1:2);
  assert.equal(await page.locator('.activity-group-item').count(),0);for(const group of await page.locator('.activity-group').all())await group.evaluate(e=>e.open=true);
  await page.waitForFunction(()=>document.querySelectorAll('.activity-group-item[data-tool-call-id]').length===2);
  assert.equal(await page.locator('.provider-activity').count(),2);for(const details of await page.locator('.provider-activity>details').all())await details.evaluate(e=>e.open=true);
  await page.locator('.provider-activity').getByText('Reasoning tokens',{exact:true}).waitFor();assert.match(await page.locator('[data-provider-activity=thinking]').textContent(),/8s/);assert.match(await page.locator('[data-provider-activity=usage]').textContent(),/Not reported/);if(provider==='codex')assert.match(await page.locator('[data-provider-activity=thinking]').textContent(),/Synthetic public provider summary/);
  if(provider==='mtplx'){assert.equal(await page.locator('.activity-note').count(),2);await page.locator('.activity-note details').first().evaluate(e=>e.open=true);assert.match(await page.locator('.activity-note').first().textContent(),/duration were not recorded/);}
  assert.equal(await page.locator('.conversation-messages>.message.system').filter({hasText:'Synthetic warning stays visible'}).count(),1);assert.equal(await page.locator('.agent-question').count(),1);
  const final=page.locator('.message.assistant').filter({hasText:'Synthetic final answer'});assert.equal(await final.count(),1);assert.ok((await final.locator('.role').textContent()).includes({mtplx:'MTPLX',codex:'Codex',claude:'Claude',copilot:'Copilot'}[provider]));
  assert.equal(await composer.evaluate(e=>e.isConnected),true);assert.equal(await page.locator('#followup').inputValue(),'Retained unsent comparison draft');assert.equal(hash(fixture[provider].file),before[provider]);
  // Re-render a streaming fragment without sending it to a provider.
  await app.evaluate(({app},id)=>{const e=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().engine,r=e.getRun(id);r.liveMessages={synthetic:'Synthetic live response'};e.emit('change');},fixture[provider].id);
  await page.locator('.message.assistant').filter({hasText:'Synthetic live response'}).waitFor();assert.equal(await page.locator('[data-activity-view]').count(),0);if(provider==='mtplx')assert.equal(await page.locator('.activity-note details').first().getAttribute('open'),'');
  await page.locator('[data-page="runs"]').first().click();
 }
 await page.locator('.chat-index-row').filter({hasText:'Synthetic comparison mtplx'}).click();await page.locator('#followup').waitFor();
 const window=await app.browserWindow(page);await window.evaluate(w=>{w.setMinimumSize(640,650);w.setSize(640,850);});await page.waitForFunction(()=>innerWidth<=640);assert.ok(await page.locator('.chat-pane').evaluate(e=>e.scrollWidth<=e.clientWidth+2));
 if(await page.locator('.jump-latest').isVisible())await page.locator('.jump-latest').click();
 else assert.ok(await page.locator('#conversation').evaluate(e=>e.scrollHeight-e.scrollTop-e.clientHeight<120),'A hidden jump button must mean the current reading position is already at the end');
 await page.locator('.activity-group').evaluate(e=>e.open=false);
 await page.screenshot({path:path.join(root,'grouped-activity.png')});assert.deepEqual(errors,[]);
 const receipt={passed:true,noProviderTurns:true,unchangedSavedHistory:true,providers:['mtplx','codex','claude','copilot'],checks:['default grouping without a switcher','known notices only; all commentary stays inline','captured phase duration and provider summary','reported scoped usage and missing values','original event drill-down','lazy disclosures survive streaming','draft/composer/history preservation','640px layout'],root};fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}catch(error){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});throw error;}finally{if(app)await app.close();}
