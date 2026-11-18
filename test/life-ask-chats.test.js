import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Engine} from '../src/engine.js';
import {LifeAskChats} from '../src/services/life/life-ask-chats.js';

function fixture(t){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-ask-chat-'));const engine=new Engine(home);
 t.after(async()=>{await engine.close();fs.rmSync(home,{recursive:true,force:true});});
 let accountID='synthetic';const receipt={requestId:randomUUID(),chatId:randomUUID(),accountID,hostID:randomUUID(),audioSha256:'a'.repeat(64)};fs.mkdirSync(path.join(home,receipt.requestId));
 const store={binding:()=>({accountID,hostID:receipt.hostID}),directory:id=>path.join(home,id)};
 let refreshes=0;const catalog={get:async force=>{assert.equal(force,true);refreshes++;return {models:[{id:'gpt-6.1-terra',controls:{reasoningEfforts:['medium']}}]};}};
 const buildChatSchedule=async value=>({schemaVersion:1,id:'synthetic',name:value.name,prompt:value.prompt,enabled:false,provider:value.provider,model:value.model,reasoningEffort:value.reasoningEffort,cron:'0 9 * * 1-5',timezone:'UTC',misfire:'skip',workspace:value.workspace});
 const starts=[];engine.startDeferredRun=id=>{starts.push(id);const run=engine.getRun(id);delete run.deferredStart;run.status='running';engine.persist(run);};
 return {engine,receipt,catalog,starts,adapter:new LifeAskChats({store,engine,catalog,buildChatSchedule}),refreshes:()=>refreshes,switchAccount:()=>{accountID='other';}};
}
test('chat creation uses the frozen claim, refreshed model and one durable run',async t=>{
 const f=fixture(t);await f.adapter.ensure(f.receipt,{transcript:'Synthetic question'});await f.adapter.ensure(f.receipt,{transcript:'Same question'});
 assert.equal(f.engine.runs.size,1);assert.deepEqual(f.starts,[f.receipt.chatId]);assert.equal(f.refreshes(),1);
 const run=f.engine.getRun(f.receipt.chatId);assert.equal(run.chatType,'life-ask');assert.equal(run.schedule.lifeAsk.audioSha256,f.receipt.audioSha256);assert.equal(run.events[0].text,'Synthetic question');
 assert.throws(()=>f.engine.createRun({...run.schedule,id:'another'},'chat',null,{runId:run.id,deferStart:true}),/claimed chat identity/);
 run.status='interrupted';f.engine.persist(run);await f.adapter.ensure(f.receipt,{transcript:'Retry'});assert.equal(f.starts.length,1);assert.equal((await f.adapter.inspect(f.receipt)).state,'interrupted');
});
test('deleted or foreign chat claims are never replaced',async t=>{
 const f=fixture(t);f.engine.tombstones[f.receipt.chatId]={};await assert.rejects(f.adapter.ensure(f.receipt,{transcript:'Question'}),/deleted/);assert.equal(f.engine.runs.size,0);
 delete f.engine.tombstones[f.receipt.chatId];await f.adapter.ensure(f.receipt,{transcript:'Question'});
 f.engine.getRun(f.receipt.chatId).schedule.lifeAsk.accountID='foreign';await assert.rejects(f.adapter.ensure(f.receipt,{transcript:'Question'}),/another request/);
});
test('account switch during catalog refresh prevents creation',async t=>{
 const f=fixture(t),get=f.catalog.get;f.catalog.get=async force=>{const result=await get(force);f.switchAccount();return result;};
 await assert.rejects(f.adapter.ensure(f.receipt,{transcript:'Question'}),/binding changed/);assert.equal(f.engine.runs.size,0);
});
test('structured result is taken from the first answer even after follow-ups',async t=>{
 const f=fixture(t);await f.adapter.ensure(f.receipt,{transcript:'Question'});const run=f.engine.getRun(f.receipt.chatId);
 run.events.push({role:'assistant',text:JSON.stringify({kind:'search',answer:'Initial answer',item:'',professional:false}),at:new Date(4000).toISOString(),data:{phase:'final'}},{role:'user',text:'Follow up'},{role:'assistant',text:'Ordinary rich response'});run.status='running';
 const result=await f.adapter.inspect(f.receipt);assert.equal(result.state,'completed');assert.equal(result.result.answer,'Initial answer');assert.equal(result.answeredAt,4000);
});
