import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJSON} from '../src/shared/files.js';
import {LifeAskStore} from '../src/services/life/life-ask.js';
import {LifeAskExecutor,lifeAnswerEventId} from '../src/services/life/life-ask-executor.js';
import {ReminderConfirmationPending,ReminderClarification} from '../src/services/life/life-reminder-intent.js';

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-ask-executor-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 let account='synthetic',now=5000;const hostID=randomUUID(),chats=new Map(),calls={transcribe:0,file:0,ensure:0,notify:0,mirror:0};
 const store=new LifeAskStore(root,{identity:()=>({accountId:account}),hostId:()=>hostID,enabled:()=>true});
 const admit=()=>{const requestId=randomUUID(),receipt={requestId,receiptId:randomUUID(),accountID:'synthetic',hostID,audioSha256:'a'.repeat(64),state:'received',times:{admittedAt:now++},resultRevision:0};fs.mkdirSync(store.directory(requestId),{recursive:true});atomicJSON(path.join(store.directory(requestId),'receipt.json'),receipt);return requestId;};
 const native={transcribe:async receipt=>{calls.transcribe++;return {requestId:receipt.requestId,transcript:'Synthetic question',times:{asrStartedAt:1000,asrEndedAt:2000}};},file:async()=>{calls.file++;return {savedPath:'Inbox/Mnemosyne/synthetic.md'};}};
 const chat={ensure:async receipt=>{calls.ensure++;if(!chats.has(receipt.chatId))chats.set(receipt.chatId,{id:receipt.chatId,state:'completed',result:{kind:'memory',item:'Synthetic memory',answer:'Synthetic answer',model:'fixture',professional:false},answeredAt:4000});return {id:receipt.chatId,startedAt:3000};},inspect:async receipt=>chats.get(receipt.chatId)};
 const options={store,native,chat,mirror:async()=>{calls.mirror++;return {at:6000};},notify:async()=>{calls.notify++;return {at:5500};},now:()=>now};
 return {store,chats,calls,options,admit,setAccount:value=>{account=value;},advance:()=>{now+=31000;}};
}
test('executor freezes one chat, filing and event identity across completed retries',async t=>{
 const f=fixture(t),id=f.admit(),executor=new LifeAskExecutor(f.options);
 await Promise.all([executor.tick(),executor.tick()]);await executor.tick();
 const receipt=f.store.read(id);assert.equal(receipt.state,'answered');assert.equal(receipt.effectsComplete,true);
 assert.deepEqual(f.calls,{transcribe:1,file:1,ensure:1,notify:1,mirror:1});assert.equal(f.chats.size,1);
 assert.equal(receipt.notificationEventId,lifeAnswerEventId(id));assert.match(receipt.notificationEventId,/^[a-f0-9-]{14}5/);
 assert.equal(receipt.times.answeredAt,4000);assert.equal(receipt.times.notificationPostedAt,5500);
});
test('restart after durable chat creation resolves the same claim without retranscription',async t=>{
 const f=fixture(t),id=f.admit(),ensure=f.options.chat.ensure;
 f.options.chat.ensure=async receipt=>{await ensure(receipt);f.setAccount('other');throw Error('simulated process loss after durable chat claim');};
 await new LifeAskExecutor(f.options).tick();const claim=f.store.read(id).chatId;
 assert.equal(f.chats.size,1);assert.equal(f.calls.file,0);
 f.setAccount('synthetic');f.options.chat.ensure=ensure;await new LifeAskExecutor(f.options).tick();
 assert.equal(f.store.read(id).chatId,claim);assert.equal(f.chats.size,1);assert.equal(f.calls.transcribe,1);assert.equal(f.calls.file,1);
});
test('unfinished first chat holds later requests; interrupted original is never replayed',async t=>{
 const f=fixture(t),first=f.admit(),second=f.admit(),ensure=f.options.chat.ensure;
 f.options.chat.ensure=async receipt=>{const claim=await ensure(receipt);f.chats.get(claim.id).state='running';return claim;};
 const executor=new LifeAskExecutor(f.options);await executor.tick();await executor.tick();
 assert.equal(f.calls.transcribe,1);assert.equal(f.store.read(second).state,'received');
 f.options.chat.ensure=ensure;f.chats.get(f.store.read(first).chatId).state='interrupted';await executor.tick();
 assert.equal(f.store.read(first).state,'needs-attention');assert.equal(f.chats.size,1);
 await executor.tick();assert.equal(f.store.read(second).state,'answered');assert.equal(f.chats.size,2);
});
test('offline iCloud does not delay notification or subsequent requests; mirror resumes alone',async t=>{
 const f=fixture(t),first=f.admit();let offline=true;
 f.options.mirror=async()=>{f.calls.mirror++;if(offline)throw Error('cloud offline');return {at:6000};};
 const executor=new LifeAskExecutor(f.options);await executor.tick();
 assert.equal(f.calls.notify,1);assert.equal(f.store.read(first).state,'answered');assert.equal(f.store.read(first).notificationComplete,true);
 const second=f.admit();await executor.tick();assert.equal(f.store.read(second).state,'answered');assert.equal(f.calls.notify,2);
 offline=false;f.advance();await executor.tick();await executor.tick();
 assert.equal(f.calls.transcribe,2);assert.equal(f.calls.file,2);assert.equal(f.calls.notify,2);
 assert.equal(f.store.read(first).effectsComplete,true);assert.equal(f.store.read(second).effectsComplete,true);
 assert.equal(f.store.read(first).deliveryNeedsAttention,false,'successful delivery clears the previous warning');
});
test('account changes after transcription preserve pending request without filing or publishing',async t=>{
 const f=fixture(t),id=f.admit(),transcribe=f.options.native.transcribe;
 f.options.native.transcribe=async receipt=>{const result=await transcribe(receipt);f.setAccount('other');return result;};
 await new LifeAskExecutor(f.options).tick();assert.equal(f.store.read(id).state,'transcribing');
 assert.equal(f.calls.ensure,0);assert.equal(f.calls.file,0);assert.equal(f.calls.notify,0);assert.equal(f.calls.mirror,0);
});

test('lost reminder commit response resumes the same operation without failure push or private notes filing',async t=>{
 const f=fixture(t),id=f.admit(),ensure=f.options.chat.ensure;let attempts=0,mirrored;
 f.options.chat.ensure=async receipt=>{const claim=await ensure(receipt);f.chats.get(claim.id).result={kind:'reminder',professional:false,item:'',answer:'Proposal',reminder:{title:'Water plants'}};return claim;};
 f.options.reminders={commit:async receipt=>{assert.equal(receipt.requestId,id);attempts++;if(attempts===1)throw new ReminderConfirmationPending('Waiting for Life.');return {kind:'reminder',answer:'Saved Water plants',reminder:{id:'saved'},confirmation:{eventId:'same-server-event'},answeredAt:4000};}};
 f.options.mirror=async(_receipt,value)=>{mirrored=value;return {at:6000};};
 const executor=new LifeAskExecutor(f.options);await executor.tick();
 assert.equal(f.store.read(id).state,'running');assert.equal(f.calls.notify,0);assert.equal(f.calls.file,0);
 await executor.tick();assert.equal(attempts,1,'backoff holds an uncertain receipt');
 f.advance();await new LifeAskExecutor(f.options).tick();
 assert.equal(attempts,2);assert.equal(f.calls.ensure,1);assert.equal(f.calls.notify,1);assert.equal(f.calls.file,0);
 assert.equal(mirrored.savedPath,null);assert.equal(mirrored.reminder.id,'saved');assert.equal(f.store.read(id).effectsComplete,true);
});
test('ambiguous reminder returns a durable clarification without claiming a save',async t=>{
 const f=fixture(t),id=f.admit(),ensure=f.options.chat.ensure;let answer;
 f.options.chat.ensure=async receipt=>{const claim=await ensure(receipt);f.chats.get(claim.id).result={kind:'reminder',professional:false,item:'',answer:'Proposal'};return claim;};
 f.options.reminders={commit:async()=>{throw new ReminderClarification('Which list should I use?');}};
 f.options.notify=async(_receipt,value)=>{answer=value;return {at:5500};};
 await new LifeAskExecutor(f.options).tick();assert.equal(answer.kind,'clarification');assert.equal(answer.answer,'Which list should I use?');assert.equal(answer.destination.chatId,f.store.read(id).chatId);assert.equal(f.calls.file,0);assert.equal(f.store.read(id).state,'answered');
});
