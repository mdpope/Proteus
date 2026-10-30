import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {AttentionStore} from '../src/services/chats/attention-store.js';
import {attentionToken,needsAttention} from '../public/features/chats/attention-state.js';
function fixture(t){const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-attention-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));const runs=[{id:'waiting',status:'awaiting_input',pending:{id:'question-one',type:'question'},userQuestions:[]},{id:'failed',status:'failed',failureEventAt:'failure-one',userQuestions:[]}],items=[{id:'note',notificationId:'one',kind:'notification',title:'Synthetic notice',at:'first'}];let store;
 const service={home,engine:{listRuns:()=>runs,persist:run=>fs.writeFileSync(path.join(home,run.id+'.json'),JSON.stringify(run))},activity:{read:()=>{items.splice(0,1);}},remote:{changed(){}},notify(){},desktopAttention:()=>store.visible(items)};store=new AttentionStore(service);return {store,service,runs,items};}
test('bulk attention acknowledgement persists while pending work stays intact and new events still appear',t=>{
 const {store,service,runs}=fixture(t),snapshot=store.snapshot(),before=structuredClone(runs[0].pending);const result=store.clearLocal(snapshot);assert.equal(result.cleared,3);assert.equal(result.remaining,0);
 assert.deepEqual(runs[0].pending,before);assert.equal(runs[0].status,'awaiting_input');assert.equal(needsAttention(runs[0]),false);
 assert.equal(JSON.parse(fs.readFileSync(path.join(service.home,'waiting.json'))).attentionAcknowledged.token,attentionToken(runs[0]));
 assert.equal(new AttentionStore(service).snapshot().chats.length,0);
 runs[0].pending={id:'question-two',type:'permission'};assert.equal(needsAttention(runs[0]),true);
 runs[1].failureEventAt='failure-two';assert.equal(needsAttention(runs[1]),true);
});
test('a changed request survives a stale clear and retry returns the same completed operation',async t=>{
 const {store,runs}=fixture(t),snapshot=store.snapshot();runs[0].pending.id='new-during-clear';store.clearLocal(snapshot);assert.equal(needsAttention(runs[0]),true);
 const request={operationId:randomUUID(),issuedAt:new Date().toISOString()};const first=await store.clearAll(request);runs[0].pending.id='after-completion';const again=await store.clearAll(request);assert.deepEqual(again,first);assert.equal(needsAttention(runs[0]),true);
});
