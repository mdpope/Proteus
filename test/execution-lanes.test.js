import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Engine } from '../src/engine.js';
const until = async check => { for (let i=0;i<100;i++) { if (check()) return; await new Promise(r=>setTimeout(r,10)); } throw new Error('Timed out'); };
const schedule = (home,id,job) => ({schemaVersion:1,id,name:id,enabled:false,cron:'* * * * *',timezone:'UTC',provider:job?'local-process':'rehearsal',model:'',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic test',...(job?{integration:{type:'omi',job}}:{})});
test('independent AI chats run together while native jobs serialize per lane',async()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-lanes-')); const started=[]; const releases=new Map();
 const provider={run:({run,signal})=>new Promise(resolve=>{started.push(run.schedule.id);releases.set(run.schedule.id,resolve);signal.addEventListener('abort',resolve,{once:true});})};
 const engine=new Engine(home,{'local-process':provider,rehearsal:provider});
 engine.executionLane=s=>s.provider==='local-process'?s.integration.job:null;
 try {
  const ai=engine.createRun(schedule(home,'ai')); const audio=engine.createRun(schedule(home,'audio','audio')); const library=engine.createRun(schedule(home,'library','library'));
  const waiting=engine.createRun(schedule(home,'second-audio','audio')); const nextAI=engine.createRun(schedule(home,'next-ai'));
  await until(()=>started.length===4); assert.deepEqual(new Set(started),new Set(['ai','audio','library','next-ai']));
  releases.get('library')(); await until(()=>library.status==='completed'); assert.equal(ai.status,'running'); assert.equal(audio.status,'running');
  releases.get('audio')(); await until(()=>started.includes('second-audio')); assert.equal(nextAI.status,'running');
  engine.cancel(waiting.id); await until(()=>waiting.status==='cancelled');
  releases.get('ai')(); await until(()=>started.includes('next-ai'));
 } finally { await engine.close(); assert.equal(engine.executions.size,0); fs.rmSync(home,{recursive:true,force:true}); }
});
test('execution guard is checked again for queued and resumed snapshots',async()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-guard-')); let calls=0,enabled=false;
 const engine=new Engine(home,{rehearsal:{run:async()=>{calls++;}}});
 engine.beforeRun=async()=>{if(!enabled)throw new Error('Integration disabled');};
 try {
  const run=engine.createRun(schedule(home,'guard')); await until(()=>run.status==='failed'); assert.equal(calls,0);
  enabled=true; engine.resume(run.id,'Retry'); await until(()=>run.status==='completed'); assert.equal(calls,1);
  enabled=false; engine.resume(run.id,'Stale snapshot'); await until(()=>run.status==='failed'); assert.equal(calls,1);
 } finally {await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});
test('provider sign-in holds only its queued provider and resumes after cleanup',async()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-auth-lane-'));const started=[];let releaseCopilot,authActive=true;
 const engine=new Engine(home,{
  codex:{run:async()=>{started.push('codex');}},
  copilot:{run:()=>new Promise(resolve=>{started.push('copilot');releaseCopilot=resolve;})}
 });
 engine.providerAuthHold=providerId=>providerId==='codex'&&authActive;
 const entry=(id,provider)=>({...schedule(home,id),provider,model:'synthetic-model'});
 try{
  const codex=engine.createRun(entry('held-codex','codex'));
  const copilot=engine.createRun(entry('free-copilot','copilot'));
  await until(()=>started.includes('copilot'));assert.equal(codex.status,'queued');assert.match(codex.queueReason,/provider sign-in/);assert.deepEqual(started,['copilot']);
  releaseCopilot();await until(()=>copilot.status==='completed');await engine.drain();
  assert.equal(codex.status,'queued');assert.match(codex.queueReason,/provider sign-in/);assert.deepEqual(started,['copilot']);
  authActive=false;await engine.drain();await until(()=>codex.status==='completed');assert.deepEqual(started,['copilot','codex']);
 }finally{await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});
