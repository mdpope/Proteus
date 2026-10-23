import assert from 'node:assert/strict';
import {until} from './remote-client.mjs';

// Real authenticated web controls and encrypted host commands; synthetic providers only.
export async function exerciseWebCorrections(page,app){
 const engine=app.engine,provider=engine.providers.copilot,original={...provider};
 let attempts=0,finish,steered=[],prompts=[];
 try{
  provider.acceptedSteeringMediaTypes=['text/plain'];
  provider.steer=async(run,prompt,files)=>{steered.push({id:run.id,prompt,files});return true;};
  provider.run=async({emit,signal,prompt})=>{
   attempts++;prompts.push(prompt);
   if(attempts===1)throw Error('Selected model is at capacity. Synthetic web retry.');
   if(attempts===2)await new Promise((resolve,reject)=>{finish=resolve;signal.addEventListener('abort',()=>reject(Error('Cancelled')),{once:true});});
   emit('assistant','Synthetic correction completed: '+prompt);
  };
  const schedule=engine.schedules.get(engine.schedules.list()[0].id);
  const run=engine.createRun({...schedule,name:'Web correction fixture',provider:'copilot',model:'synthetic'},'chat',null,{deferStart:true});
  run.title='Web correction fixture';run.status='failed';delete run.deferredStart;delete run.nextPrompt;
  run.failureEventAt=engine.now();
  engine.event(run,'system','Selected model is at capacity. Synthetic web initial failure.',{failure:{kind:'capacity'}});
  run.queuedMessages=[{id:'web-retained-queue',prompt:'Synthetic retained follow-up',at:engine.now()}];engine.persist(run);app.remote.changed();
  await page.locator('[data-shell-nav=chats]').click();
  await page.locator(`[data-run="${run.id}"]`).click();
  const controls=page.locator('.chat-recovery-controls');await controls.waitFor();
  assert.equal(await controls.locator('xpath=ancestor::*[contains(@class,"remote-activity")]').count(),0);
  const draft=page.locator('#remote-composer [name=prompt]');await draft.fill('Unsent web draft');
  await controls.getByRole('button',{name:'Retry every 60 seconds',exact:true}).click();
  await until(()=>!!run.capacityRetry);const started=Date.now();
  assert.equal(attempts,0);assert.equal(run.queuedMessages[0].id,'web-retained-queue');
  await until(()=>attempts===1,70000);assert.ok(Date.now()-started>=59000,'actual one-minute retry');
  await until(()=>run.status==='failed');await controls.getByRole('button',{name:'Stop retrying',exact:true}).waitFor();
  await controls.getByRole('button',{name:'Stop retrying',exact:true}).click();await until(()=>!run.capacityRetry);
  assert.equal(await draft.inputValue(),'Unsent web draft');assert.equal(run.queuedMessages[0].id,'web-retained-queue');
  await controls.getByRole('button',{name:'Continue chat',exact:true}).click();await until(()=>attempts===2&&!!finish);
  await page.locator('#remote-steer').waitFor();assert.equal(run.queuedMessages[0].id,'web-retained-queue');
  await draft.fill('Synthetic steering with file');
  await page.locator('#remote-attachment-picker').setInputFiles({name:'steer.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic steering bytes')});
  await page.locator('#remote-steer').click();await page.locator('[data-attachment-confirm]').waitFor();
  assert.equal(steered.length,0,'no provider delivery before explicit consent');
  await page.locator('[data-attachment-confirm]').click();await until(()=>steered.length===1);
  assert.equal(steered[0].prompt,'Synthetic steering with file');assert.equal(Buffer.from(steered[0].files[0].bytes).toString(),'Synthetic steering bytes');
  assert.equal(run.queuedMessages[0].id,'web-retained-queue');
  // A turn ending while the explicit consent dialog is open must retain the draft/files.
  await draft.fill('Keep stale steering draft');
  await page.locator('#remote-attachment-picker').setInputFiles({name:'stale.txt',mimeType:'text/plain',buffer:Buffer.from('Must not be sent')});
  await page.locator('#remote-steer').click();await page.locator('[data-attachment-confirm]').waitFor();
  finish();await until(()=>run.status==='completed'&&!engine.running.has(run.id));
  await page.locator('[data-attachment-confirm]').click();
  await page.getByText('The active turn or supported attachment types changed. Review the message again.',{exact:true}).waitFor();
  assert.equal(steered.length,1);assert.equal(await draft.inputValue(),'Keep stale steering draft');
  assert.equal(await page.locator('[data-attachment-remove]').count(),1);
  assert.equal(prompts[2],'Synthetic retained follow-up','queue runs after continuation');
  for(const width of [390,920,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  console.log('PASS web corrections: actual 60s retry/stop, Continue, queue/draft preservation, standalone failure, exact consenting steer files and stale-turn rejection');
 }finally{finish?.();Object.assign(provider,original);}
}
