import test from 'node:test';import assert from 'node:assert/strict';
import {startProgress,providerProgress,checkProgress} from '../src/services/chats/run-progress.js';
import {workingMessage} from '../public/features/chats/chat-working.js';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Engine} from '../src/engine.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
const at=minutes=>new Date(minutes*60_000).toISOString();
test('observed activity heartbeats clear stalls while unchanged elapsed-time repaint does not',()=>{
 const activity={id:'phase',kind:'thinking',status:'running',lastObservedAt:at(0)},run={status:'running',events:[{role:'system',data:{activity}}]};startProgress(run,at(0));providerProgress(run,at(0));providerProgress(run,at(4));assert.equal(run.progress.lastProgressAt,at(0));assert.equal(checkProgress(run,at(5)).changed,true);activity.lastObservedAt=at(6);providerProgress(run,at(6));assert.equal(run.progress.lastProgressAt,at(6));assert.equal(run.progress.stalled,false);
});
test('queued user messages and unchanged provider updates cannot conceal a stalled tool',()=>{
 const tool={callId:'call',name:'synthetic_write',status:'running',startedAt:at(0)},run={status:'running',events:[{role:'tool',data:{tool}}]};
 startProgress(run,at(0));providerProgress(run,at(0));
 run.events.push({role:'user',text:'Any progress?',at:at(4)});run.updatedAt=at(4);providerProgress(run,at(4));
 assert.equal(run.progress.lastProgressAt,at(0));assert.equal(checkProgress(run,at(5)).changed,true);assert.equal(run.progress.waitingTools[0].name,'synthetic_write');assert.match(workingMessage(run),/No observable progress/);
 assert.equal(checkProgress(run,at(30)).timedOut,false);assert.equal(checkProgress(run,at(119)).timedOut,false);assert.equal(checkProgress(run,at(120)).timedOut,true);
 tool.status='completed';tool.finishedAt=at(121);providerProgress(run,at(121));assert.equal(run.progress.stalled,false);assert.equal(run.progress.stage,'provider');
});
test('human waiting is excluded, and fresh provider output clears the warning',()=>{
 const run={status:'awaiting_input',pending:{id:'q'},events:[]};startProgress(run,at(0));assert.equal(checkProgress(run,at(100)),null);
 run.status='running';run.pending=null;providerProgress(run,at(100),{observable:true});assert.equal(checkProgress(run,at(101)),null);
});

for(const provider of ['copilot','codex','claude'])test(provider+' stalled-turn watchdog interrupts once, preserves the queue and waits for actual settlement',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-stall-'));let minute=0,finish,aborts=0,started=0;
 const engine=new Engine(home,{[provider]:{run:({signal})=>{started++;return new Promise(resolve=>{finish=resolve;signal.addEventListener('abort',()=>aborts++,{once:true});});}}},()=>new Date(minute*60000));
 t.after(async()=>{finish?.();await engine.close();fs.rmSync(home,{recursive:true,force:true});});
 const run=engine.createRun({schemaVersion:1,id:'stalled',name:'Synthetic stall',enabled:false,provider,model:'fixture',workspace:{cwd:home,additionalDirectories:[]},cron:'0 9 * * 1-5',timezone:'UTC',misfire:'skip',prompt:'Synthetic test'},'chat');
 const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(resolve=>setTimeout(resolve,5));}throw Error('Watchdog fixture did not settle.');};
 await until(()=>finish);minute=4;await engine.send(run.id,'Keep this queued');const queued=structuredClone(run.queuedMessages);
 minute=5;await engine.tick();assert.equal(run.progress.stalled,true);assert.equal(aborts,0);
 minute=30;await engine.tick();assert.equal(aborts,0);minute=119;await engine.tick();assert.equal(aborts,0);
 minute=120;await engine.tick();assert.equal(aborts,1);assert.equal(engine.running.has(run.id),true);await engine.tick();assert.equal(aborts,1);assert.equal(started,1);assert.deepEqual(run.queuedMessages,queued);
 finish();await until(()=>run.status==='failed'&&!engine.running.has(run.id));assert.match(run.events.at(-1).text,/No observable provider\/tool progress/);assert.deepEqual(run.queuedMessages,queued);assert.equal(started,1);
});
