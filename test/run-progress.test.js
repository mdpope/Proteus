import test from 'node:test';import assert from 'node:assert/strict';
import {startProgress,providerProgress,checkProgress} from '../src/run-progress.js';
import {workingMessage} from '../public/chat-working.js';
const at=minutes=>new Date(minutes*60_000).toISOString();
test('queued user messages and unchanged provider updates cannot conceal a stalled tool',()=>{
 const tool={callId:'call',name:'synthetic_write',status:'running',startedAt:at(0)},run={status:'running',events:[{role:'tool',data:{tool}}]};
 startProgress(run,at(0));providerProgress(run,at(0));
 run.events.push({role:'user',text:'Any progress?',at:at(4)});run.updatedAt=at(4);providerProgress(run,at(4));
 assert.equal(run.progress.lastProgressAt,at(0));assert.equal(checkProgress(run,at(5)).changed,true);assert.equal(run.progress.waitingTools[0].name,'synthetic_write');assert.match(workingMessage(run),/No observable progress/);
 assert.equal(checkProgress(run,at(30)).timedOut,true);
 tool.status='completed';tool.finishedAt=at(31);providerProgress(run,at(31));assert.equal(run.progress.stalled,false);assert.equal(run.progress.stage,'provider');
});
test('human waiting is excluded, and fresh provider output clears the warning',()=>{
 const run={status:'awaiting_input',pending:{id:'q'},events:[]};startProgress(run,at(0));assert.equal(checkProgress(run,at(100)),null);
 run.status='running';run.pending=null;providerProgress(run,at(100),{observable:true});assert.equal(checkProgress(run,at(101)),null);
});
