import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Engine} from '../src/engine.js';
import {ChatRecovery} from '../src/services/chats/chat-recovery.js';
import {chatRecoveryState,capacityFailure} from '../public/features/chats/chat-recovery-state.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
test('Copilot active-time continuation is opt-in, bounded, claimed once and keeps the same session and queue',async t=>{
 const f=fixture(t);f.run.schedule.provider='copilot';f.run.events.at(-1).data.failure.kind='active-time-limit';f.run.activeTimeContinuation={enabled:true,attempts:0};
 f.engine.recovery.settled(f.run);f.engine.recovery.settled(f.run);await Promise.resolve();assert.equal(f.calls.length,1);assert.equal(f.run.providerSessionId,'same-session');assert.equal(f.run.queuedMessages[0].id,'retained-message');assert.equal(f.run.activeTimeContinuation.attempts,1);
 const g=fixture(t);g.run.schedule.provider='copilot';g.run.events.at(-1).data.failure.kind='active-time-limit';g.run.activeTimeContinuation={enabled:true,attempts:3};g.engine.recovery.settled(g.run);await Promise.resolve();assert.equal(g.calls.length,0);assert.match(g.run.activeTimeContinuation.attention,/three/);
});
test('active-time preference revisions and disabling before the queued continuation take precedence',async t=>{
 const f=fixture(t);f.run.schedule.provider='copilot';f.run.events.at(-1).data.failure.kind='active-time-limit';
 assert.throws(()=>f.engine.recovery.command(f.run.id,{action:'active-time-auto',enabled:true,expectedPreferenceVersion:1}),/changed/);
 f.engine.recovery.command(f.run.id,{action:'active-time-auto',enabled:true,expectedPreferenceVersion:0});f.engine.recovery.settled(f.run);
 f.engine.recovery.command(f.run.id,{action:'active-time-auto',enabled:false,expectedPreferenceVersion:1});await Promise.resolve();assert.equal(f.calls.length,0);
 f.engine.recovery.command(f.run.id,{action:'active-time-continue-enable',expectedFailureEventAt:f.run.failureEventAt});assert.equal(f.calls.length,1);assert.equal(f.run.activeTimeContinuation.enabled,true);
});
function fixture(t){
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-recovery-test-'));let now=Date.parse('2026-10-22T12:00:00Z');const timers=new Map(),calls=[];
 const engine=new Engine(home,{},()=>new Date(now));engine.drain=async()=>{};engine.recovery=new ChatRecovery(engine,{setTimer:(fn,delay)=>{const timer={fn,delay};timers.set(timer,timer);return timer;},clearTimer:timer=>timers.delete(timer)});
 t.after(async()=>{await engine.close();fs.rmSync(home,{recursive:true,force:true});});
 const run=engine.createRun({schemaVersion:1,id:'synthetic',name:'Recovery fixture',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic only'},'chat',null,{deferStart:true});
 run.status='failed';delete run.deferredStart;delete run.nextPrompt;run.providerSessionId='same-session';run.failureEventAt=engine.now();run.events.push({role:'system',text:'Selected model is at capacity. Please try a different model.',at:engine.now(),data:{failure:{kind:'capacity'}}});run.queuedMessages=[{id:'retained-message',prompt:'Retain this follow-up',at:engine.now()}];engine.persist(run);
 const resume=engine.resume.bind(engine);engine.resume=(...args)=>{calls.push(args);return resume(...args);};
 return {engine,run,timers,calls,home,tick:()=>{now+=60000;const timer=[...timers.values()][0];timers.delete(timer);timer.fn();}};
}
test('Continue is revision checked, preserves session and queue, and never approves pending input',t=>{
 const f=fixture(t),token=f.run.failureEventAt;
 assert.throws(()=>f.engine.recovery.command(f.run.id,{action:'continue',expectedFailureEventAt:'stale'}),/changed/);
 f.engine.recovery.command(f.run.id,{action:'continue',expectedFailureEventAt:token});
 assert.equal(f.run.status,'queued');assert.equal(f.run.providerSessionId,'same-session');assert.equal(f.run.queuedMessages[0].id,'retained-message');assert.match(f.run.nextPrompt,/do not repeat completed external actions/);
 assert.throws(()=>f.engine.recovery.command(f.run.id,{action:'continue',expectedFailureEventAt:token}),/changed/);assert.equal(f.calls.length,1);
});
test('capacity retry requires explicit opt-in, waits 60 seconds and re-arms only after capacity failure',t=>{
 const f=fixture(t);assert.equal(f.timers.size,0);
 f.engine.recovery.command(f.run.id,{action:'retry',expectedFailureEventAt:f.run.failureEventAt});assert.equal(f.calls.length,0);assert.equal([...f.timers.values()][0].delay,60000);
 const first=f.run.capacityRetry.nextAttemptAt;f.tick();assert.equal(f.calls.length,1);assert.equal(f.run.capacityRetry.nextAttemptAt,null);assert.equal(f.run.capacityRetry.attempts,1);
 f.run.status='failed';f.run.failureEventAt=f.engine.now();f.run.events.push({role:'system',at:f.engine.now(),text:'Selected model is at capacity.',data:{failure:{kind:'capacity'}}});f.engine.recovery.settled(f.run);assert.equal(f.timers.size,1);assert.ok(f.run.capacityRetry.nextAttemptAt>first);
 f.run.status='completed';f.engine.recovery.settled(f.run);assert.equal(f.timers.size,0);assert.equal(f.run.capacityRetry,undefined);assert.equal(f.run.queuedMessages.length,1);
});
test('stop, changed settings, pending approvals and update barriers cannot start a timer turn',t=>{
 for(const change of [f=>f.engine.recovery.command(f.run.id,{action:'stop-retry'}),f=>{f.run.schedule.prompt='changed';},f=>{f.run.status='awaiting_input';f.run.pending={type:'permission'};},f=>{f.engine.updateBarrier=true;}]){
  const f=fixture(t);f.engine.recovery.command(f.run.id,{action:'retry',expectedFailureEventAt:f.run.failureEventAt});change(f);if(f.timers.size)f.tick();assert.equal(f.calls.length,0);assert.equal(f.run.capacityRetry,undefined);
 }
});
test('retry does not broaden to generic errors, revive archived chats, or survive restart',async t=>{
 const f=fixture(t);assert.equal(capacityFailure('A tool reports capacity'),false);f.run.events.at(-1).data.failure.kind='error';f.run.events.at(-1).text='Connection failed';assert.equal(chatRecoveryState(f.run).capacity,false);assert.throws(()=>f.engine.recovery.command(f.run.id,{action:'retry',expectedFailureEventAt:f.run.failureEventAt}),/capacity failure/);
 f.run.events.at(-1).data.failure.kind='capacity';f.engine.recovery.command(f.run.id,{action:'retry',expectedFailureEventAt:f.run.failureEventAt});assert.throws(()=>f.engine.lifecycle(f.run.id,'archive'),/active or queued/);
 // Reconstruct persisted state in an isolated second Engine only after closing its owner.
 await f.engine.close();f.run.capacityRetry={nextAttemptAt:'2026-10-22T12:01:00Z',attempts:2};f.engine.persist(f.run);
 const restarted=new Engine(f.home);t.after(()=>restarted.close());assert.equal(restarted.getRun(f.run.id).capacityRetry,undefined);assert.equal(restarted.recovery.policies.size,0);assert.match(restarted.getRun(f.run.id).events.at(-1).text,/retry stopped/);
});
