import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { startServer } from '../src/server.js';

async function fixture(t) {
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-integrations-api-'));
  const native=path.join(root,'native'),automations=path.join(root,'automations');fs.mkdirSync(native);fs.mkdirSync(automations);fs.mkdirSync(path.join(native,'logs'));
  fs.writeFileSync(path.join(native,'config.json'),JSON.stringify({state_dir:native}));fs.writeFileSync(path.join(native,'omi_worker.py'),'# Synthetic fixture only; never execute');
  const executions=[];
  const fake={status:async()=>({available:true,models:[]}),run:async options=>executions.push(options),close:async()=>{}};
  const app=await startServer({home:path.join(root,'app'),port:0,timers:false,withSeed:false,providers:{copilot:fake,codex:fake}});
  t.after(async()=>{await app.close();fs.rmSync(root,{recursive:true,force:true});});
  app.omi.launchdProbe=async()=>({state:'unloaded'});app.omi.execute=async()=>{executions.push('native');};
  const request=async(url,data,authenticated=true)=>{const response=await fetch(app.origin+url,{method:data===undefined?'GET':'POST',headers:{...(authenticated?{Authorization:`Bearer ${app.token}`} : {}),...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});return {code:response.status,value:await response.json()};};
  const initial=await request('/api/omi');
  const settings={...initial.value.settings,pipelineRoot:native,pythonPath:process.execPath,workerPath:path.join(native,'omi_worker.py'),configPath:path.join(native,'config.json'),automationRoot:automations};
  const saved=await request('/api/omi/settings',{settings,expectedRevision:initial.value.settings.revision});assert.equal(saved.code,200);
  return {root,native,app,request,executions,settings:saved.value};
}
async function settle(app,id) { for(let i=0;i<80;i++){const run=app.engine.getRun(id);if(!['queued','running'].includes(run.status))return run;await new Promise(resolve=>setTimeout(resolve,5));}throw new Error('Synthetic run did not finish.'); }

test('Omi API is authenticated, read-only on refresh and preparation stays disabled',async t=>{
  const f=await fixture(t);const before=fs.readdirSync(f.native);
  const unauthorized=await f.request('/api/omi',undefined,false);assert.equal(unauthorized.code,401);
  const state=await f.request('/api/omi');assert.equal(state.code,200);assert.equal(state.value.status.enabled,false);assert.equal(state.value.status.runtimeAvailable,true);
  const stale=await f.request('/api/omi/prepare',{expectedRevision:'stale'});assert.equal(stale.code,400);
  const prepared=await f.request('/api/omi/prepare',{expectedRevision:f.settings.revision});assert.equal(prepared.code,200);assert.equal(prepared.value.schedules.length,3);assert.ok(prepared.value.schedules.every(s=>!s.enabled));
  assert.deepEqual(fs.readdirSync(f.native),before);assert.equal(f.executions.length,0);
  const generic=await f.request('/api/run',{id:'omi-audio-worker'});assert.equal(generic.code,400);assert.match(generic.value.error,/disabled/);assert.equal(f.executions.length,0);
});
test('generic resume of stale Omi native and Codex runs fails closed at execution',async t=>{
  const f=await fixture(t);const prepared=await f.request('/api/omi/prepare',{expectedRevision:f.settings.revision});
  for(const provider of ['local-process','codex']){
    const schedule={...prepared.value.schedules[0],id:provider==='codex'?'omi-transcript-intake':'omi-audio-worker',provider,model:provider==='codex'?'synthetic-model':'',integration:{type:'omi',job:provider==='codex'?'intake':'audio'}};
    const id=randomUUID(),now=new Date().toISOString();const run={id,schedule,title:'Synthetic stale run',status:'completed',createdAt:now,updatedAt:now,events:[],usage:{inputTokens:0,outputTokens:0,observed:false},pending:null};f.app.engine.runs.set(id,run);f.app.engine.persist(run);
    const response=await f.request(`/api/runs/${id}/resume`,{prompt:'Synthetic retry'});
    if(response.code===400)assert.match(response.value.error,/disabled/);else{assert.equal(response.code,200);const finished=await settle(f.app,id);assert.equal(finished.status,'failed');assert.ok(finished.events.some(event=>event.text?.includes('disabled')));}
  }
  assert.equal(f.executions.length,0);
});
test('Omi API validates paths, revisions and metadata-only logs',async t=>{
  const f=await fixture(t);const secret='SYNTHETIC-PRIVATE-TRANSCRIPT';
  fs.writeFileSync(path.join(f.native,'logs/launchd.out.log'),JSON.stringify({free_bytes:42,transcript:secret,token:secret})+'\n'+secret+'\n');
  const sample=await f.request('/api/omi/logs?job=audio&stream=out&limit=999999');assert.equal(sample.code,200);assert.equal(sample.value.records[0].free_bytes,42);assert.equal(sample.value.withheld,1);assert.ok(!JSON.stringify(sample.value).includes(secret));assert.equal(sample.value.localPath,fs.realpathSync(path.join(f.native,'logs/launchd.out.log')));
  const traversal=await f.request('/api/omi/logs?job=../../config&stream=out');assert.equal(traversal.code,400);
  const stream=await f.request('/api/omi/logs?job=audio&stream=../../config');assert.equal(stream.code,400);
  const malformed=await f.request('/api/omi/settings',{settings:{...f.settings,workerPath:'relative/script.py'},expectedRevision:f.settings.revision});assert.equal(malformed.code,400);
  const stale=await f.request('/api/omi/settings',{settings:f.settings,expectedRevision:'stale'});assert.equal(stale.code,400);
  const enable=await f.request('/api/omi/settings',{settings:{...f.settings,enabled:true,takeoverConfirmed:false},expectedRevision:f.settings.revision});assert.equal(enable.code,400);assert.equal(f.executions.length,0);
});
test('Life runtime is optional API-only and retires database administration routes',async t=>{
 const f=await fixture(t);const life=(await f.request('/api/state')).value.life;
 assert.equal(life.configured,false);assert.equal(life.enabled,false);assert.equal(life.connection.mode,'website-api');
 assert.equal((await f.request('/api/life/data',{section:'nutrition'},false)).code,401);
 assert.equal((await f.request('/api/life/data',{section:'nutrition'})).code,400);
 for(const route of ['setup-plan','setup-apply','backup-verify'])assert.equal((await f.request('/api/life/'+route,{})).code,410);
 const enabled=await f.request('/api/life',{settings:{schemaVersion:3,enabled:true},expectedRevision:life.revision});assert.equal(enabled.code,200);
 const unavailable=await f.request('/api/life/data',{section:'nutrition'});assert.equal(unavailable.code,400);
 assert.ok(!JSON.stringify(enabled.value).includes('profileFile'));assert.equal(f.executions.length,0);
});
