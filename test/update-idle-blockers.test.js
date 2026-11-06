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

test('browser idle observations distinguish progressing downloads and stalled actions without mutation',async()=>{
 const {browserUpdateActivity,browserUpdateBlockers,STALL_MS}=await import('../desktop/browser/browser-update-activity.cjs');
 const states=['progressing','paused','interrupted','completed','cancelled'];
 const tabs=states.map((state,index)=>({id:String(index),title:state,downloads:new Set([{getState:()=>state==='paused'?'progressing':state,isPaused:()=>state==='paused'}])}));
 tabs.push({id:'hung',title:'Hung action',agentActions:1,lastAgentProgressAt:100},{id:'active',title:'Current action',agentActions:1,lastAgentProgressAt:100+STALL_MS});
 const rows=browserUpdateActivity(tabs,100+STALL_MS);assert.deepEqual(rows.filter(r=>r.blocking).map(r=>r.tabId),['0','active']);
 assert.equal(rows.find(r=>r.tabId==='hung').state,'stalled');assert.equal(tabs.at(-2).agentActions,1);
 assert.match(browserUpdateBlockers(rows)[0],/download.*progressing.*0/);
 assert.equal(tabs.every(t=>!t.downloads||t.downloads.size===1),true);
});
