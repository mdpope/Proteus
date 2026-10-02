import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { copilotModel, validateModelOptions, ModelCatalog } from '../src/model-catalog.js';
import { CopilotProvider } from '../src/copilot.js';
import { startServer } from '../src/server.js';
import { remoteState, remoteRun } from '../src/remote.js';
import { fakeSession } from './fake-copilot.js';
const raw = { id: 'fixture', supportedReasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh', 'max'], capabilities: { supports: { reasoningEffort: true }, limits: { max_prompt_tokens: 872000, max_context_window_tokens: 1000000, max_output_tokens: 128000 } }, billing: { tokenPrices: { maxPromptTokens: 272000, longContext: { maxPromptTokens: 872000 } } } };
test('Copilot maps provider prompt budgets separately from total windows, with no invented defaults', () => {
  const m = copilotModel(raw);
  assert.deepEqual(m.controls.reasoningEfforts, raw.supportedReasoningEfforts);
  assert.equal(m.controls.defaultReasoningEffort, null);
  assert.deepEqual(m.controls.contextTiers, [{id:'default',promptTokens:272000,totalTokens:400000},{id:'long_context',promptTokens:872000,totalTokens:1000000}]);
  assert.equal(copilotModel({...raw, defaultReasoningEffort:'medium'}).controls.defaultReasoningEffort,'medium');
  assert.deepEqual(copilotModel({id:'other',supportedReasoningEfforts:['future'],supportedContextTiers:['default','huge']}).controls.contextTiers,[{id:'default',promptTokens:null,totalTokens:null},{id:'huge',promptTokens:null,totalTokens:null}]);
  assert.equal(copilotModel({id:'unknown'}).controls.reasoningSupported,null);
  assert.equal(copilotModel({id:'unknown-default',supportedContextTiers:['default','long_context'],capabilities:{limits:{max_prompt_tokens:872000,max_context_window_tokens:1000000}}}).controls.contextTiers[0].promptTokens,null);
  assert.deepEqual(copilotModel({id:'fixed',capabilities:{supports:{reasoningEffort:false}}}).controls.reasoningEfforts,[]);
});
test('provider choices accept none and future IDs but never silently substitute unsupported options', () => {
  const m=copilotModel(raw);
  validateModelOptions({reasoningEffort:'none',contextTier:'long_context'},m);
  validateModelOptions({reasoningEffort:'',contextTier:'default'},copilotModel({id:'unknown'}));
  validateModelOptions({reasoningEffort:'future',contextTier:'huge'},copilotModel({id:'other',supportedReasoningEfforts:['future'],supportedContextTiers:['huge']}));
  assert.throws(()=>validateModelOptions({reasoningEffort:'ultra'},m),/unavailable/);
  assert.throws(()=>validateModelOptions({contextTier:'huge'},m),/unavailable/);
  assert.throws(()=>validateModelOptions({contextTier:{}},m),/option ID/);
  assert.throws(()=>validateModelOptions({}, {...m,policy:{state:'disabled'}}),/disabled/);
});
test('catalog coalesces startup reads, expires in five minutes, and retains last good metadata after failures', async () => {
  let now=0,calls=0,fail=false;
  const cache=new ModelCatalog(async()=>{calls++;if(fail)throw Error('offline');return {available:true,models:[copilotModel(raw)]};},{now:()=>now});
  const [a,b]=await Promise.all([cache.get(),cache.get()]);assert.equal(calls,1);assert.equal(a,b);
  now=299999;await cache.get();assert.equal(calls,1);
  now=300000;const fresh=await cache.get();assert.equal(calls,2);
  fail=true;now++;const stale=await cache.get(true);assert.equal(stale.stale,true);assert.equal(stale.checkedAt,fresh.checkedAt);assert.deepEqual(stale.models,fresh.models);
  fail=false;now++;assert.equal((await cache.get(true)).stale,false);assert.equal(cache.value.attemptedAt,null);
});
test('catalog refresh bypasses SDK listModels cache without reconnecting an active session', async () => {
  let calls=0;
  const provider=new CopilotProvider();
  provider.starting=Promise.resolve();provider.connect=()=>{throw Error('must not reconnect');};
  provider.client={getAuthStatus:async()=>({isAuthenticated:true}),listModels:()=>{throw Error('cached API called');},rpc:{models:{list:async()=>({models:[{...raw,id:'fresh-'+(++calls)}]})},account:{getQuota:async()=>({})}}};
  assert.equal((await provider.status()).models[0].id,'fresh-1');assert.equal((await provider.status()).models[0].id,'fresh-2');
});
test('create and resume pass effort and context tier to Copilot and revalidate against current capabilities', async () => {
  const configs=[];let current=raw;
  const provider=new CopilotProvider();
  provider.connect=async()=>({rpc:{models:{list:async()=>({models:[current]})}},createSession:async config=>{configs.push(config);return fakeSession();},resumeSession:async(id,config)=>{configs.push(config);return fakeSession();}});
  const run={id:'fixture',schedule:{provider:'copilot',model:'fixture',reasoningEffort:'none',contextTier:'long_context',workspace:{cwd:os.tmpdir(),additionalDirectories:[]}}};
  const args={run,prompt:'fixture',emit:()=>{},update:()=>{},ask:async()=>{throw Error('unexpected tool');},signal:new AbortController().signal};
  await provider.run(args);await provider.run(args);
  assert.equal(configs.length,2);for(const c of configs){assert.equal(c.reasoningEffort,'none');assert.equal(c.contextTier,'long_context');}
  assert.equal(run.modelCapabilities.controls.contextTiers[1].promptTokens,872000);
  current={...raw,supportedReasoningEfforts:['low']};await assert.rejects(provider.run(args),/none is unavailable/);assert.equal(configs.length,2);
});
test('API and encrypted remote projections retain model options, defaults and external schedule edits', async () => {
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-options-test-'));
  let calls=0;
  const app=await startServer({home,port:0,timers:false,withSeed:false,providers:{copilot:{status:async()=>{calls++;return{available:true,models:[copilotModel(raw)]};},run:async()=>{}}}});
  const headers={Authorization:`Bearer ${app.token}`,'Content-Type':'application/json'};
  const request=async(url,body)=>{const response=await fetch(app.origin+url,{headers,...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));return value;};
  try {
    await request('/api/provider',{force:false});await request('/api/provider',{force:false});assert.equal(calls,1);await request('/api/provider',{force:true});assert.equal(calls,2);
    const old=app.settings.get();app.settings.save({...old,provider:'copilot',model:'fixture',reasoningEffort:'none',contextTier:'long_context'},old.revision);
    const run=await request('/api/chat',{prompt:'Model fixture',includeDefaults:false,selectedIds:[]});
    assert.equal(run.schedule.reasoningEffort,'none');assert.equal(run.schedule.contextTier,'long_context');
    assert.equal(remoteRun(run).schedule.contextTier,'long_context');
    assert.equal(remoteState(app).defaults.reasoningEffort,'none');assert.equal(remoteState(app).providerStatus.models[0].controls.contextTiers.length,2);
    const schedule={schemaVersion:1,id:'external',name:'Before',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'copilot',model:'fixture',reasoningEffort:'none',contextTier:'long_context',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt:'Fixture'};
    await request('/api/schedules',{schedule});const first=(await request('/api/state')).schedules[0];
    fs.writeFileSync(path.join(home,'schedules/external.json'),JSON.stringify({...schedule,name:'After AI edit',reasoningEffort:'high'}));
    const latest=(await request('/api/state')).schedules[0];assert.equal(latest.name,'After AI edit');assert.equal(latest.reasoningEffort,'high');assert.notEqual(latest.revision,first.revision);
    assert.equal((await fetch(app.origin+'/api/schedules',{method:'POST',headers,body:JSON.stringify({schedule,expectedRevision:first.revision})})).status,400);
  } finally { await app.close();fs.rmSync(home,{recursive:true,force:true}); }
});

test('host startup refreshes capabilities without a client opening the provider panel', async () => {
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-catalog-start-'));let calls=0;
  const app=await startServer({home,port:0,withSeed:false,providers:{copilot:{status:async()=>{calls++;return {available:true,models:[copilotModel(raw)]};}}}});
  try { await app.catalog.pending;assert.equal(calls,1);assert.equal(app.catalog.value.models[0].controls.reasoningEfforts[0],'none'); }
  finally {await app.close();fs.rmSync(home,{recursive:true,force:true});}
});
