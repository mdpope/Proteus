import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.js';
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw new Error('Timed out');};
const fixture=()=>{const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-delivery-'));const turns=[],steers=[];let finish;const provider={run:async({prompt,signal})=>{turns.push(prompt);await new Promise((resolve,reject)=>{finish=resolve;signal.addEventListener('abort',()=>reject(new Error('Cancelled')),{once:true});});},steer:async(_,text)=>steers.push(text)};const engine=new Engine(home,{copilot:provider});const run=engine.createRun({schemaVersion:1,id:'delivery',name:'Delivery',provider:'copilot',model:'fixture',cron:'0 9 * * *',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},prompt:'First',misfire:'skip',enabled:false});return {engine,run,provider,turns,steers,finish:()=>finish(),close:async()=>{await engine.close();await new Promise(r=>setTimeout(r,10));fs.rmSync(home,{recursive:true,force:true});}};};
test('queued messages persist, remove, deduplicate and run in order without concurrent turns',async()=>{const f=fixture();try{await until(()=>f.turns.length===1);await f.engine.send(f.run.id,'Second','queue','second');await f.engine.send(f.run.id,'Second','queue','second');await f.engine.send(f.run.id,'Remove me','queue','remove');f.engine.removeQueued(f.run.id,'remove');assert.equal(f.run.queuedMessages.length,1);assert.deepEqual(f.turns,['First']);f.finish();await until(()=>f.turns.length===2);assert.deepEqual(f.turns,['First','Second']);assert.equal(f.run.events.filter(e=>e.data?.delivery?.id==='second').length,1);f.finish();await until(()=>f.run.status==='completed');await f.engine.send(f.run.id,'Third','queue','third');await f.engine.send(f.run.id,'Third','queue','third');await until(()=>f.turns.length===3);assert.equal(f.run.queuedMessages.length,0);f.finish();await until(()=>f.run.status==='completed');}finally{await f.close();}});
test('steering reaches the active provider, and failure remains visible without silently queuing',async()=>{const f=fixture();try{await until(()=>f.turns.length===1);await f.engine.send(f.run.id,'Adjustment','steer','steer-1');assert.deepEqual(f.steers,['Adjustment']);assert.equal(f.run.status,'running');f.provider.steer=async()=>{throw new Error('Turn ended');};await assert.rejects(f.engine.send(f.run.id,'Late','steer','steer-2'),/Turn ended/);assert.equal(f.run.events.at(-1).data.delivery.state,'failed');assert.ok(!f.run.queuedMessages?.length);f.finish();await until(()=>f.run.status==='completed');}finally{await f.close();}});
test('cancel holds queued work; restart never silently replays it',async()=>{const f=fixture();try{await until(()=>f.turns.length===1);await f.engine.send(f.run.id,'Held','queue','held');f.engine.cancel(f.run.id);await until(()=>f.run.status==='cancelled');assert.deepEqual(f.turns,['First']);assert.equal(f.run.queuedMessages.length,1);const restored=new Engine(f.engine.home);assert.equal(restored.getRun(f.run.id).status,'cancelled');assert.equal(restored.getRun(f.run.id).queuedMessages.length,1);await restored.close();}finally{await f.close();}});
test('queued model choices apply in order, keep the live turn unchanged and retain session history', async()=>{
  const f=fixture();try{
    await until(()=>f.turns.length===1);f.run.providerSessionId='existing-session';
    const first={model:'next-model',reasoningEffort:'high',contextTier:'long_context',serviceTier:'fast'};
    const second={model:'later-model',reasoningEffort:'low',contextTier:'default',serviceTier:''};
    await f.engine.send(f.run.id,'Second','queue','model-second',first);
    await f.engine.send(f.run.id,'Third','queue','model-third',second);
    assert.equal(f.run.schedule.model,'fixture');assert.deepEqual(f.run.queuedMessages.map(m=>m.modelOptions),[first,second]);
    const restored=new Engine(f.engine.home);assert.deepEqual(restored.getRun(f.run.id).queuedMessages[0].modelOptions,first);await restored.close();
    await assert.rejects(f.engine.send(f.run.id,'Wrong','steer','model-steer',first),/Steering keeps/);
    await f.engine.send(f.run.id,'Adjust','steer','model-steer-ok');assert.equal(f.run.schedule.model,'fixture');
    f.finish();await until(()=>f.turns.length===2);assert.equal(f.run.schedule.model,'next-model');assert.equal(f.run.schedule.reasoningEffort,'high');
    assert.equal(f.run.initialSchedule.model,'fixture');assert.equal(f.run.modelHistory.length,1);assert.equal(f.run.providerSessionId,'existing-session');
    f.finish();await until(()=>f.turns.length===3);assert.equal(f.run.schedule.model,'later-model');assert.equal(f.run.modelHistory.length,2);
    f.finish();await until(()=>f.run.status==='completed');await f.engine.send(f.run.id,'Fourth','queue','model-fourth');
    await until(()=>f.turns.length===4);assert.equal(f.run.schedule.model,'later-model');assert.ok(f.run.events.some(e=>e.text==='Second'));
    f.finish();await until(()=>f.run.status==='completed');
  }finally{await f.close();}
});
