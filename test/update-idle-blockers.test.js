import test from 'node:test';
import assert from 'node:assert/strict';
import {updateIdleBlockers} from '../src/services/updates/idle-blockers.js';

test('idle inventory names every execution, retry, coordinator and owner blocker without cancelling work',()=>{
 const runs=[{id:'coordinator',title:'Update chat',status:'running'},{id:'retry',schedule:{name:'Retry chat'},status:'failed',capacityRetry:{nextAttemptAt:'2026-11-04T00:00:00Z'}},{id:'background',title:'Media task',status:'completed'},{id:'approval',title:'Needs review',status:'awaiting_input'}];
 const engine={listRuns:()=>runs,running:new Map([['coordinator',{}]]),backgroundRuns:new Map([['media-lane',{id:'background'}]])};
 const before=JSON.stringify(runs),rows=updateIdleBlockers(engine,{runId:'coordinator'},['Browser operation still active.'],{job:{running:true,phase:'building'}});
 assert.deepEqual(rows.map(row=>row.chatId).filter(Boolean),['coordinator','retry','background','approval']);
 assert.equal(rows[0].coordinator,true);assert.deepEqual(rows[0].reasons.map(r=>r.code),['running','execution']);
 assert.equal(rows[1].reasons[0].nextAttemptAt,'2026-11-04T00:00:00Z');assert.equal(rows[2].reasons[0].code,'background');
 assert.equal(rows[4].kind,'build');assert.equal(rows[5].reasons[0].text,'Browser operation still active.');assert.equal(JSON.stringify(runs),before);assert.equal(engine.backgroundRuns.size,1);
 engine.running.clear();engine.backgroundRuns.clear();runs[0].status='completed';runs[3].status='completed';delete runs[1].capacityRetry;
 assert.deepEqual(updateIdleBlockers(engine,{runId:'coordinator'}),[]);
});

test('execution ownership without a listed chat still blocks idle',()=>{
 const engine={listRuns:()=>[],running:new Map([['unlisted',{}]]),backgroundRuns:new Map([['lane',{id:'background'}]])};
 assert.deepEqual(updateIdleBlockers(engine,{}).map(row=>row.chatId),['unlisted','background']);
});
