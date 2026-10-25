import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Engine} from '../src/engine.js';
import {AllowanceContinuation,allowanceReset,allowanceFailure} from '../src/services/chats/allowance-continuation.js';
import {recoverRemoteChat} from '../public/services/remote/remote-chat-recovery.js';
import {resourceRows,filterResourceRows} from '../public/features/settings/resources.js';
import {CopilotProvider} from '../src/providers/copilot.js';
import {fakeSession} from './fake-copilot.js';
const start=Date.parse('2026-10-25T06:00:00Z');
test('Copilot retains structured allowance causes from the SDK without treating billing setup as exhaustion',async()=>{
 const session=fakeSession({async send(){this.event('session.error',{message:'Synthetic account refusal',errorType:'quota',errorCode:'quota_exceeded'});this.event('session.idle');}}),provider=new CopilotProvider();provider.connect=async()=>({listModels:async()=>[{id:'fixture'}],createSession:async()=>session});
 const run={id:'fixture',events:[],providerHome:'/synthetic/copilot',schedule:{model:'fixture',workspace:{cwd:'/synthetic',additionalDirectories:[]}},usage:{}};
 await assert.rejects(provider.run({run,prompt:'Synthetic only',signal:new AbortController().signal,update(){},emit(){},ask:async()=>assert.fail('No tools requested')}),error=>error.code==='quota_exceeded'&&allowanceFailure(error));
 assert.equal(allowanceFailure({code:'billing_not_configured',message:'Billing configuration required'}),false);assert.equal(allowanceFailure({message:'You have exceeded your premium request allowance.'}),true);
});
function fixture(t){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-allowance-'));let now=start,quota={available:true,windows:[{id:'five_hour',remainingPercent:0,resetAt:new Date(start+60000).toISOString()}]};
 const make=()=>{const engine=new Engine(home,{},()=>new Date(now),{permissionControls:true});engine.drain=async()=>{};void engine.allowance.close();engine.allowance=new AllowanceContinuation(engine,{intervalMs:3600000,readQuota:async()=>structuredClone(quota)});return engine;};
 let engine=make();const run=engine.createRun({schemaVersion:1,id:'synthetic',name:'Allowance fixture',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic only'},'scheduled',null,{deferStart:true});
 Object.assign(run,{status:'failed',providerSessionId:'retained-session',failureEventAt:engine.now(),queuedMessages:[{id:'retained-followup',prompt:'Retain this queued input',at:engine.now()}]});delete run.deferredStart;delete run.nextPrompt;run.schedule.provider='claude';run.schedule.model='sonnet';run.events.push({role:'system',text:'Claude rate_limit',at:engine.now(),data:{failure:{kind:'allowance'}}});engine.persist(run);
 t.after(async()=>{await engine.close();fs.rmSync(home,{recursive:true,force:true});});
 return {home,get engine(){return engine;},get run(){return engine.getRun(run.id);},advance:ms=>{now+=ms;},quota:value=>{quota=value;},restart:async()=>{await engine.close();engine=make();},command:args=>engine.recovery.command(run.id,{expectedFailureEventAt:engine.getRun(run.id).failureEventAt,...args})};
}
test('explicit allowance wait survives restart and sleep and sends exactly once into the same scheduled session',async t=>{
 const f=fixture(t);assert.equal(f.run.allowanceContinuation,undefined);await f.command({action:'allowance-arm'});
 const pending=structuredClone(f.run.allowanceContinuation.pending),schedule=structuredClone(f.run.schedule);assert.equal(pending.nextAttemptAt,new Date(start+65000).toISOString());
 await f.restart();f.advance(64000);await f.engine.allowance.tick();assert.equal(f.run.status,'failed');
 f.advance(3600000);f.quota({available:true,windows:[{id:'five_hour',remainingPercent:100}]});await Promise.all([f.engine.allowance.tick(),f.engine.allowance.tick()]);
 assert.equal(f.run.status,'queued');assert.equal(f.run.providerSessionId,'retained-session');assert.deepEqual(f.run.schedule,schedule);assert.equal(f.run.queuedMessages[0].id,'retained-followup');assert.equal(f.run.events.filter(e=>e.data?.delivery?.id===pending.id).length,1);assert.match(f.run.nextPrompt,/do not repeat completed external actions/);
 await f.engine.allowance.tick();assert.equal(f.run.events.filter(e=>e.data?.delivery?.id===pending.id).length,1);
});
test('reset selection uses the last exhausted applicable window and rejects stale, inferred, missing and past resets',()=>{
 const run={schedule:{provider:'claude',model:'sonnet'}},windows=[{id:'five_hour',remainingPercent:0,resetAt:new Date(start+10000).toISOString()},{id:'seven_day',remainingPercent:0,resetAt:new Date(start+30000).toISOString()},{id:'seven_day_opus',remainingPercent:0,resetAt:new Date(start+90000).toISOString()}];
 assert.equal(allowanceReset(run,{available:true,windows},start).resetAt,windows[1].resetAt);
 assert.equal(allowanceReset({schedule:{provider:'claude',model:'default'}},{available:true,windows},start).resetAt,windows[2].resetAt,'Unknown model family conservatively waits for every exhausted bucket');
 for(const quota of [{available:true,stale:true,windows},{available:true,error:'failed',windows},{available:true,observedAt:new Date(start-300001).toISOString(),windows},{available:true,windows:[{...windows[0],resetSource:'expected-monthly'}]},{available:true,windows:[{...windows[0],resetAt:null}]},{available:true,windows:[{...windows[0],resetAt:new Date(start-1).toISOString()}]}])assert.equal(allowanceReset(run,quota,start),null);
 for(const code of ['usageLimitExceeded','rateLimitExceeded','usage_limit_reached'])assert.ok(allowanceFailure({code}));assert.ok(allowanceFailure({message:'Claude rate_limit'}));assert.equal(allowanceFailure({message:'A tool mentioned quota planning'}),false);
});
test('no reset is guessed; fresh exhausted, missing or unavailable quota cannot dispatch a turn',async t=>{
 const f=fixture(t);f.quota({available:true,windows:[{id:'five_hour',remainingPercent:0,resetAt:null}]});await assert.rejects(f.command({action:'allowance-arm'}),/unavailable/);assert.equal(f.run.allowanceContinuation.pending,undefined);
 f.quota({available:true,windows:[{id:'five_hour',remainingPercent:0,resetAt:new Date(start+60000).toISOString()}]});await f.command({action:'allowance-arm'});f.advance(65000);
 for(const quota of [{available:false},{available:true,windows:[]},{available:true,windows:[{id:'five_hour',remainingPercent:null}]},{available:true,windows:[{id:'five_hour',remainingPercent:0,resetAt:new Date(start+180000).toISOString()}]}]){f.quota(quota);f.run.allowanceContinuation.pending.nextAttemptAt=f.engine.now();await f.engine.allowance.tick();assert.equal(f.run.status,'failed');}
 assert.equal(f.run.allowanceContinuation.pending.nextAttemptAt,new Date(start+185000).toISOString());
});
test('manual input, cancellation, permissions, archive and update boundaries prevent automatic delivery',async t=>{
 for(const change of [async f=>f.command({action:'allowance-cancel'}),async f=>f.command({action:'allowance-auto',enabled:false}),async f=>{f.engine.event(f.run,'user','Manual input');},async f=>{f.run.chatPermissionRevision='changed';},async f=>{f.run.archivedAt=f.engine.now();},async f=>{f.engine.updateBarrier=true;}]){
  const f=fixture(t);await f.command({action:'allowance-arm'});await change(f);f.advance(65000);f.quota({available:true,windows:[{id:'five_hour',remainingPercent:100}]});await f.engine.allowance.tick();assert.equal(f.run.status,'failed');assert.equal(f.run.events.filter(e=>e.data?.delivery?.id?.startsWith('allowance_')).length,0);
 }
});
test('cancelling while fresh quota is in flight cannot deliver or re-arm a wait',async t=>{
 const f=fixture(t);await f.command({action:'allowance-arm'});f.advance(65000);let release;f.engine.allowance.readQuota=()=>new Promise(resolve=>{release=resolve;});const checking=f.engine.allowance.tick();await Promise.resolve();await f.command({action:'allowance-cancel'});release({available:true,windows:[{id:'five_hour',remainingPercent:100}]});await checking;assert.equal(f.run.status,'failed');assert.equal(f.run.allowanceContinuation.pending.state,'cancelled');
});
test('automatic preference persists independently of one-shot intent and retries no model calls without authoritative quota',async t=>{
 const f=fixture(t);await f.command({action:'allowance-auto',enabled:true});assert.equal(f.run.allowanceContinuation.enabled,true);await f.restart();assert.equal(f.run.allowanceContinuation.enabled,true);assert.equal(f.run.allowanceContinuation.pending.state,'waiting');await f.command({action:'allowance-auto',enabled:false});await f.restart();assert.equal(f.run.allowanceContinuation.enabled,false);assert.equal(f.run.allowanceContinuation.pending.state,'cancelled');
});
test('automatic continuation keeps failed-turn model options while retaining a queued follow-up model',async t=>{
 const f=fixture(t),current=structuredClone(f.run.schedule);f.run.nextModelOptions={model:'queued-model',reasoningEffort:'high',contextTier:'default',serviceTier:''};f.run.queuedMessages[0].modelOptions=structuredClone(f.run.nextModelOptions);await f.command({action:'allowance-arm'});f.advance(65000);f.quota({available:true,windows:[{id:'five_hour',remainingPercent:100}]});await f.engine.allowance.tick();assert.equal(f.run.status,'queued');assert.equal(f.run.schedule.model,current.model);assert.equal(f.run.schedule.reasoningEffort,current.reasoningEffort);assert.equal(f.run.queuedMessages[0].modelOptions.model,'queued-model');
});
test('uncertain durable dispatch becomes attention and cannot drain or automatically retry',async t=>{
 const f=fixture(t);await f.command({action:'allowance-arm'});f.advance(65000);f.quota({available:true,windows:[{id:'five_hour',remainingPercent:100}]});let calls=0;f.engine.send=async()=>{calls++;f.run.status='queued';throw Error('Synthetic journal failure');};await f.engine.allowance.tick();assert.equal(f.run.allowanceContinuation.pending.state,'attention');assert.equal(f.run.deferredStart,true);await f.engine.allowance.tick();assert.equal(calls,1);
});
test('legacy remote scheduled Continue reconciles before sending; uncertain transport never falls back',async()=>{
 const run={id:'synthetic-run',trigger:'scheduled',status:'failed',failureEventAt:'2026-10-25T06:00:00Z',providerSessionId:'owner-session',schedule:{provider:'copilot'},events:[]},calls=[];
 const params={run,action:'continue',expectedFailureEventAt:run.failureEventAt,request:async()=>structuredClone(run),mutate:async(method,args)=>{calls.push({method,args});if(method==='chat.recover')throw Error('Open an ordinary chat before continuing.');return {runId:run.id};}};
 await recoverRemoteChat(params);assert.equal(calls[1].method,'chat.send');assert.equal(calls[1].args.id,run.id);assert.equal(calls[1].args.mode,'queue');const delivery=calls[1].args.messageId;calls.length=0;await recoverRemoteChat(params);assert.equal(calls[1].args.messageId,delivery);
 calls.length=0;await assert.rejects(recoverRemoteChat({...params,mutate:async method=>{calls.push(method);throw Error('Timed out; outcome unknown');}}),/unknown/);assert.deepEqual(calls,['chat.recover']);
 await assert.rejects(recoverRemoteChat({...params,request:async()=>({...run,status:'running'})}),/changed/);
});
test('combined resources attribute private process usage once, retain unloaded tabs, and independently filter states and names',()=>{
 const rows=resourceRows({tabs:[{id:'a',title:'Alpha',loaded:true,pid:2},{id:'b',title:'Beta',loaded:true,pid:3,sharedProcess:true},{id:'c',title:'Gamma',loaded:true,pid:3},{id:'d',title:'Delta',loaded:false}],processes:[{pid:1,name:'App',cpuPercent:3,memoryBytes:10},{pid:2,name:'Renderer',cpuPercent:5,memoryBytes:20},{pid:3,name:'Shared renderer',cpuPercent:7,memoryBytes:30}]});
 assert.deepEqual(rows.map(r=>r.kind),['system','system','loaded','loaded','loaded','unloaded']);assert.equal(rows.filter(r=>r.cpuPercent===5).length,1);assert.equal(rows.filter(r=>r.cpuPercent===7).length,1);assert.equal(rows.find(r=>r.id==='b').sharedMetric,true);assert.equal(filterResourceRows(rows,{system:false,loaded:false,query:'delt'}).length,1);
});
