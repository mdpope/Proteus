import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {ClaudeProvider,ClaudeRPC,claudeModel,stopClaudeProcess,claudeAccountAvailable} from '../src/claude.js';
import {normalizeProviderUsage,ProviderUsageCache} from '../src/usage.js';
import {providerUsageSummary} from '../public/usage.js';
const model={value:'test',displayName:'Synthetic',supportedEffortLevels:['low','high'],supportsFastMode:true};
class Fake extends EventEmitter {
  constructor(action){super();this.action=action;this.responses=[];}
  async initialize(hooks){this.hooks=hooks;return {hooks_applied:true,models:[model],account:{tokenSource:'oauth'},fast_mode_disabled_reason:'sdk_opt_in_required'};}
  write(message){if(message.type==='user')queueMicrotask(()=>this.action?.(this));}
  respond(id,response){this.responses.push({id,response});this.emit('response');}
  async close(){this.closed=true;}
}
const schedule={model:'test',workspace:{cwd:'/tmp',additionalDirectories:[]},reasoningEffort:'high'};
const runArgs=()=>({run:{id:'test',schedule:structuredClone(schedule)},prompt:'synthetic',emit:()=>{},update:()=>{},stream:()=>{},ask:async()=> 'approve',signal:new AbortController().signal});
const result=c=>c.emit('message',{type:'result',subtype:'success',usage:{input_tokens:10,output_tokens:2},session_id:'native-test'});
test('Claude capabilities originate in runtime metadata; disabled fast mode is not offered',()=>{
  assert.deepEqual(claudeModel(model).controls.reasoningEfforts,['low','high']);assert.equal(claudeModel(model).controls.contextTiers[0].totalTokens,null);
  assert.equal(claudeModel(model,{fast_mode_disabled_reason:'sdk_opt_in_required'}).controls.serviceTiers.length,0);
});
test('Claude uses native session continuation, accumulates tokens, streams no thinking',async()=>{
  const created=[];const provider=new ClaudeProvider({clientFactory:opts=>{const c=new Fake(client=>{client.emit('message',{type:'stream_event',event:{type:'content_block_delta',delta:{type:'thinking_delta',thinking:'private'}}});result(client);});created.push({opts,c});return c;}});
  const a=runArgs();let streamed=false;a.stream=()=>{streamed=true;};await provider.run(a);await provider.run(a);
  assert.equal(a.run.providerSessionId,'native-test');assert.equal(a.run.usage.inputTokens,20);assert.ok(created[1].opts.args.includes('--resume'));assert.equal(streamed,false);assert.ok(created.every(x=>x.c.closed));
  assert.equal(created[0].c.hooks.PreToolUse[0].hookCallbackIds[0],'proteus_permission');
});
test('Claude missing approval IDs cannot reuse a grant and user-question answers survive duplicate callback',async()=>{
  let client;const provider=new ClaudeProvider({clientFactory:()=>client=new Fake()});const a=runArgs();let asks=0;a.ask=async()=>{asks++;return 'approve';};const pending=provider.run(a);
  await new Promise(r=>setImmediate(r));
  const response=()=>new Promise(r=>client.once('response',r));
  let wait=response();client.emit('request',{request_id:'a',request:{subtype:'hook_callback',input:{tool_name:'Read',tool_input:{file_path:'/tmp/a'}}}});await wait;
  wait=response();client.emit('request',{request_id:'b',request:{subtype:'can_use_tool',tool_name:'Read',input:{file_path:'/tmp/a'}}});await wait;assert.equal(asks,2);
  const input={questions:[{question:'Which?',options:[{label:'A'}]}]};a.ask=async()=> 'A';
  wait=response();client.emit('request',{request_id:'c',request:{subtype:'hook_callback',input:{tool_name:'AskUserQuestion',tool_use_id:'q',tool_input:input}}});await wait;
  wait=response();client.emit('request',{request_id:'d',request:{subtype:'can_use_tool',tool_name:'AskUserQuestion',tool_use_id:'q',input}});await wait;
  assert.ok(client.responses.at(-1).response.updatedInput.answers['Which?']);result(client);await pending;
});
test('Claude active execution times out, stops child, and handles abort',async()=>{
  let client;const provider=new ClaudeProvider({timeoutMs:10,clientFactory:()=>client=new Fake()});await assert.rejects(provider.run(runArgs()),/time limit/);assert.equal(client.closed,true);
  const aborter=new AbortController(),a=runArgs();a.signal=aborter.signal;const pending=provider.run(a);await new Promise(r=>setImmediate(r));aborter.abort();await assert.rejects(pending,/Cancelled/);assert.equal(client.closed,true);
});
test('Claude quota is unknown before authoritative events and preserves reset metadata afterward',async()=>{
  const provider=new ClaudeProvider({clientFactory:()=>new Fake(c=>{c.emit('message',{type:'rate_limit_event',rate_limit_info:{rateLimitType:'five_hour',utilization:.25,resetsAt:1900000000,status:'allowed'}});result(c);})});
  assert.equal((await provider.quota()).available,false);await provider.run(runArgs());const q=await provider.quota();assert.equal(q.windows[0].remainingPercent,75);assert.equal(q.windows[0].resetAt,new Date(1900000000000).toISOString());
});
test('provider quotas normalize windows without estimating missing allowance and cache failures independently',async()=>{
  const raw={rateLimitsByLimitId:{codex:{limitName:'Codex',primary:{usedPercent:30,resetsAt:1900000000,windowDurationMins:300},secondary:{usedPercent:50}}}};
  const q=normalizeProviderUsage('codex',raw);assert.equal(providerUsageSummary(q).remaining,50);assert.equal(q.windows[0].remainingPercent,70);
  assert.equal(providerUsageSummary(normalizeProviderUsage('codex',{})).remaining,null);
  let reads=0;const cache=new ProviderUsageCache({codex:async()=>{reads++;return raw;},claude:async()=>{throw new Error('Unavailable');}});
  const [a,b]=await Promise.all([cache.get(),cache.get()]);assert.equal(reads,1);assert.equal(a.providers.codex.available,true);assert.equal(b.providers.claude.available,false);
});
test('provider quota timeout leaves healthy rows available and ignores late data',async()=>{
  let resolve;const cache=new ProviderUsageCache({claude:()=>new Promise(r=>{resolve=r;}),copilot:async()=>({quotaSnapshots:{premium_interactions:{remainingPercentage:80}}})},()=>1,5);
  const result=await cache.get();assert.equal(result.providers.copilot.windows[0].remainingPercent,80);assert.match(result.providers.claude.error,/timed out/);
  resolve({windows:[{id:'late',remainingPercent:99}]});await new Promise(r=>setImmediate(r));assert.equal(result.providers.claude.available,false);
});
test('Claude errors fail a turn even if followed by a success result',async()=>{
  const provider=new ClaudeProvider({clientFactory:()=>new Fake(c=>{c.emit('message',{type:'assistant',error:'authentication_failed'});result(c);})});await assert.rejects(provider.run(runArgs()),/authentication_failed/);
});
test('Claude quota stays unknown when an event gives status but no utilization',async()=>{
  const provider=new ClaudeProvider({clientFactory:()=>new Fake(c=>{c.emit('message',{type:'rate_limit_event',rate_limit_info:{rateLimitType:'seven_day',status:'allowed'}});result(c);})});await provider.run(runArgs());assert.equal((await provider.quota()).windows[0].remainingPercent,null);
});
test('observed Claude usage ages independently from polling and expired windows lose their current percentage',async()=>{
  let now=Date.parse('2026-10-03T00:00:00Z');const observedAt=new Date(now).toISOString();const cache=new ProviderUsageCache({claude:async()=>({windows:[{id:'five_hour',remainingPercent:75,resetAt:new Date(now-1).toISOString()}],observedAt,available:true})},()=>now);
  const result=await cache.get();assert.equal(result.providers.claude.stale,true);assert.equal(result.providers.claude.windows[0].remainingPercent,null);assert.equal(result.providers.claude.windows[0].reportedRemainingPercent,75);assert.equal(result.providers.claude.observedAt,observedAt);
});
test('Claude refuses a runtime that does not confirm permission hooks',async()=>{
  const c=new Fake();c.initialize=async()=>({models:[model]});const p=new ClaudeProvider({clientFactory:()=>c});await assert.rejects(p.run(runArgs()),/permission hooks/);assert.equal(c.closed,true);
});
test('Claude cancellation escalates against tool descendants after direct CLI exits', {skip:process.platform==='win32'}, async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-claude-kill-'));let client,pid;
  const alive=id=>{try{process.kill(id,0);return true;}catch{return false;}};
  try{
    const fixture=path.join(root,'fixture');fs.writeFileSync(fixture,`#!${process.execPath}\nconst {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'],{stdio:['ignore','ignore','ignore']});setTimeout(()=>console.log(JSON.stringify({type:'fixture_ready',pid:c.pid})),150);setInterval(()=>{},1000);\n`,{mode:0o700});
    client=new ClaudeRPC({command:fixture});const [ready]=await once(client,'message');pid=ready.pid;assert.equal(alive(pid),true);await client.close();
    for(let n=0;n<30&&alive(pid);n++)await new Promise(r=>setTimeout(r,20));assert.equal(alive(pid),false);
  }finally{await client?.close();if(pid&&alive(pid))process.kill(pid,'SIGKILL');fs.rmSync(root,{recursive:true,force:true});}
});
test('fresh account API percentages remain authoritative when reset timestamps are already past',async()=>{
  const now=Date.parse('2026-10-03T18:00:00Z');const cache=new ProviderUsageCache({copilot:async()=>({quotaSnapshots:{premium_interactions:{remainingPercentage:87,resetDate:'2026-10-03T17:59:59Z'}}})},()=>now);
  const result=await cache.get();assert.equal(result.providers.copilot.windows[0].remainingPercent,87);assert.equal(result.providers.copilot.stale,false);assert.equal(result.providers.copilot.windows[0].resetAt,null);assert.equal(result.providers.copilot.windows[0].reportedResetAt,'2026-10-03T17:59:59.000Z');
});
const signalError=code=>Object.assign(new Error(code),{code});
test('Claude TERM permission denial falls back only to the owned child and confirms exit',async()=>{
  const sent=[];let gone=false;const child={pid:43210,exitCode:null,signalCode:null,kill(signal){sent.push(signal);gone=true;this.signalCode=signal;return true;}};
  await stopClaudeProcess(child,{graceMs:5,pollMs:1,platform:'darwin',signalGroup(pid,signal){assert.equal(pid,-child.pid);if(gone)throw signalError('ESRCH');throw signalError('EPERM');}});
  assert.deepEqual(sent,['SIGTERM']);
});
test('Claude delayed KILL denial rejects safely after bounded direct-child fallback',async()=>{
  const signals=[],direct=[];const child={pid:43211,exitCode:null,signalCode:null,kill(signal){direct.push(signal);throw signalError('EPERM');}};
  await assert.rejects(stopClaudeProcess(child,{graceMs:5,pollMs:1,platform:'darwin',signalGroup(pid,signal){signals.push(signal);if(signal==='SIGKILL')throw signalError('EPERM');}}),/could not confirm termination.*EPERM/);
  assert.ok(signals.includes('SIGTERM'));assert.ok(signals.includes('SIGKILL'));assert.deepEqual(direct,['SIGKILL']);
});
test('Claude group probe permission denial is not mistaken for an exited process',async()=>{
  const child={pid:43212,exitCode:0,signalCode:null,kill(){assert.fail('Already exited child must not be signalled');}};
  await assert.rejects(stopClaudeProcess(child,{graceMs:2,pollMs:1,platform:'darwin',signalGroup(){throw signalError('EPERM');}}),/could not confirm termination.*EPERM/);
});
test('Claude concurrent close is idempotent',async()=>{
  const client=Object.create(ClaudeRPC.prototype);client.child={pid:undefined};const a=client.close(),b=client.close();assert.equal(a,b);await Promise.all([a,b]);
});
test('Claude failed capability cleanup reports an error and blocks fresh process until cleanup recovers',async()=>{
  let creates=0,denied=true;const c=new Fake();c.close=async()=>{if(denied)throw new Error('cleanup EPERM');};const provider=new ClaudeProvider({clientFactory:()=>{creates++;return c;}});
  assert.match((await provider.status()).error,/cleanup EPERM/);assert.equal((await provider.status()).available,false);assert.equal(creates,1);
  denied=false;assert.equal((await provider.status()).available,true);assert.equal(creates,2);
});
test('Claude abort catches failed cleanup, removes listeners and blocks another turn',async()=>{
  const c=new Fake();c.close=async()=>{throw new Error('cleanup EPERM');};const provider=new ClaudeProvider({clientFactory:()=>c});const a=runArgs(),controller=new AbortController();a.signal=controller.signal;
  const pending=provider.run(a);await new Promise(r=>setImmediate(r));controller.abort();await assert.rejects(pending,/cleanup EPERM/);
  assert.equal(c.listenerCount('message'),0);await assert.rejects(provider.run(runArgs()),/cleanup EPERM/);
});
test('Claude recognizes authenticated profile-only initialization without exposing account identity',async()=>{
  assert.equal(claudeAccountAvailable({subscriptionType:'Claude Pro',apiProvider:'firstParty'}),true);
  assert.equal(claudeAccountAvailable({tokenSource:'none',apiProvider:'firstParty'}),false);
  const c=new Fake();c.initialize=async()=>({models:[model],account:{email:'synthetic@example.invalid',organization:'synthetic',subscriptionType:'Claude Pro',apiProvider:'firstParty'}});
  const p=new ClaudeProvider({clientFactory:()=>c});const s=await p.status();assert.equal(s.available,true);assert.equal(s.models.length,1);assert.equal(JSON.stringify(s).includes('synthetic@example.invalid'),false);
});
