import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-activity-ui-'));let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const id=await app.evaluate((_,home)=>{
  const engine=process.mainModule.require(process.cwd()+'/desktop/main.cjs').getService().engine;engine.drain=async()=>{};
  const run=engine.createRun({...engine.schedules.list()[0],workspace:{cwd:home,additionalDirectories:[]}},'chat',null,{deferStart:true});
  run.title='Synthetic activity relationships';run.status='running';run.turns=[{id:'turn',intervals:[['2026-10-12T12:00:00Z','2026-10-12T12:00:02Z'],['2026-10-12T12:00:06Z','2026-10-12T12:00:10Z']]}];
  run.events=Array.from({length:24},(_,i)=>({role:i%2?'assistant':'user',at:'2026-10-12T11:00:00Z',text:'Earlier synthetic message '+i+'\n'+('A paragraph to hold the reading position.\n'.repeat(5))}));
  run.events.push({role:'user',text:'Check the synthetic file',at:'2026-10-12T12:00:00Z'},
   {role:'tool',at:'2026-10-12T12:00:00Z',data:{tool:{name:'read_file',callId:'read-123',summary:'Read synthetic notes',status:'completed',startedAt:'2026-10-12T12:00:00Z',finishedAt:'2026-10-12T12:00:07Z',durationMs:7000,arguments:'{"path":"synthetic.md"}',output:'SYNTHETIC_LAZY_OUTPUT'}}},
   {role:'system',at:'2026-10-12T12:00:01Z',data:{permission:{automatic:true,toolCallId:'read-123',reason:'Synthetic trusted read',request:'{"toolCallId":"read-123","path":"synthetic.md"}'}}},
   {role:'system',at:'2026-10-12T12:00:03Z',text:'Synthetic **warning** retained'},
   {role:'system',at:'2026-10-12T12:00:05Z',data:{permission:{automatic:false,decision:'deny',request:'{"toolCallId":"failed-456","command":"synthetic validation"}'}}},
   {role:'tool',at:'2026-10-12T12:00:05Z',data:{tool:{name:'shell',callId:'failed-456',summary:'Synthetic validation',status:'failed',finishedAt:'2026-10-12T12:00:09Z',durationMs:4000,error:'Synthetic failure'}}},
   {role:'tool',at:'2026-10-12T12:00:05Z',data:{tool:{name:'legacy',summary:'Legacy timing unavailable',status:'completed'}}},
   {role:'system',at:'2026-10-12T12:00:09Z',text:'**Question**\n\nSynthetic explanation before continuing?\n\n• Continue\n• Stop',data:{question:{id:'fixture-question',status:'answered',answer:'Continue'}}},
   {role:'user',at:'2026-10-12T12:00:09Z',text:'Continue',data:{questionReply:{requestId:'fixture-question'}}},
   {role:'assistant',at:'2026-10-12T12:00:10Z',text:'Synthetic final response'},
   {role:'system',at:'2026-10-12T12:00:11Z',text:'Synthetic later system entry'});
  engine.persist(run);return run.id;
 },home);
 await page.locator('[data-page="runs"]').first().click();await page.locator('.chat-index-row').filter({hasText:'Synthetic activity relationships'}).click();
 await page.locator('.agent-question[data-request-id="fixture-question"]').getByText('Synthetic explanation before continuing?').waitFor();assert.equal(await page.locator('[data-request-id="fixture-question"]').count(),2);
 const groups=page.locator('.activity-group');assert.equal(await groups.count(),2);assert.equal(await page.locator('.activity-group-item').count(),0,'collapsed groups keep bodies lazy');
 await groups.first().evaluate(node=>node.open=true);await page.locator('.activity-group-item').first().waitFor();
 assert.equal(await groups.first().locator('.activity-group-item').count(),6);
 const system=groups.first().locator('.message.system');assert.equal(await system.count(),1);assert.match(await system.textContent(),/Synthetic warning retained/);
 assert.equal(await system.evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(23, 32, 28)');
 const read=groups.first().locator('[data-tool-call-id="read-123"]').first();assert.match(await read.textContent(),/7s/);assert.match(await read.textContent(),/12:00:07|6:00:07/);
 const legacy=groups.first().locator('.activity-group-item').filter({hasText:'Legacy timing unavailable'});assert.match(await legacy.textContent(),/Completion time unavailable.*Unavailable/s);
 assert.equal(await page.getByText('SYNTHETIC_LAZY_OUTPUT',{exact:true}).count(),0);
 const details=read.locator('details');await details.evaluate(node=>node.open=true);await page.getByText('SYNTHETIC_LAZY_OUTPUT',{exact:true}).waitFor();
 const approval=groups.first().locator('.permission-entry').first(),request=approval.locator('details');await request.evaluate(node=>node.open=true);assert.match(await request.textContent(),/read-123.*synthetic.md/s);
 assert.match(await groups.first().locator('.permission-entry').last().textContent(),/Tool call failed-456/);
 await groups.first().evaluate(node=>node.open=false);await page.waitForFunction(()=>!document.querySelector('.activity-group-items').childElementCount);await groups.first().evaluate(node=>node.open=true);
 await page.waitForFunction(()=>document.querySelector('.permission-entry details')?.open===true);assert.equal(await groups.first().locator('[data-tool-call-id="read-123"]').first().locator('details').getAttribute('open'),'');
 const scroll=page.locator('#conversation');await scroll.evaluate(node=>{node.dispatchEvent(new WheelEvent('wheel',{deltaY:-200}));node.scrollTop=200;node.dispatchEvent(new Event('scroll'));});const top=await scroll.evaluate(node=>node.scrollTop);
 await page.locator('#followup').fill('Retained synthetic draft');const composer=await page.locator('#followup').elementHandle();
 await app.evaluate((_,id)=>{const engine=process.mainModule.require(process.cwd()+'/desktop/main.cjs').getService().engine,run=engine.getRun(id);run.events.find(event=>event.data?.tool?.callId==='read-123').data.tool.output='Updated SYNTHETIC_LAZY_OUTPUT';engine.persist(run);},id);
 await page.getByText('Updated SYNTHETIC_LAZY_OUTPUT',{exact:true}).waitFor();
 assert.equal(await groups.first().locator('.permission-entry details').first().getAttribute('open'),'');assert.equal(await composer.evaluate(node=>node.isConnected),true);assert.equal(await page.locator('#followup').inputValue(),'Retained synthetic draft');assert.ok(Math.abs(await scroll.evaluate(node=>node.scrollTop)-top)<4,'expanded activity update keeps reading position');
 await page.locator('.jump-latest').click();await page.screenshot({path:'/private/tmp/proteus-activity-presentation-wide.png'});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(640,850));assert.ok(await page.locator('.chat-pane').evaluate(node=>node.scrollWidth<=node.clientWidth+2),'narrow activity fits the existing chat pane');
 await page.screenshot({path:'/private/tmp/proteus-activity-presentation-narrow.png'});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,checks:['chronological mixed activity','system styling','recorded timing','approval relationships','lazy body and disclosure restoration','reading position and composer stability','narrow layout']}));
}finally{if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
