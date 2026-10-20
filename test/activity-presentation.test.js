import test from 'node:test';
import assert from 'node:assert/strict';
import {groupActivity,isActivityEvent,activitySummary,permissionToolCallId,toolEventTime} from '../public/tool-presentation.js';
import {toolDuration,groupDuration} from '../public/runtime.js';
import {remoteRun,ownerChatControls} from '../src/remote.js';
import {workingMessage} from '../public/chat-working.js';

test('activity groups retain chronology and system/decision rows until user or model communication',()=>{
 const events=[{role:'user'},{role:'tool',data:{tool:{callId:'a'}}},{role:'system',text:'A warning'}, {role:'system',data:{permission:{automatic:false,decision:'deny'}}},{role:'assistant',text:'Response'},{role:'system',text:'Another warning'},{role:'user',text:'Continue'}].map((event,index)=>({...event,key:'event-'+index}));
 const groups=groupActivity(events);
 assert.deepEqual(groups.map(event=>event.role),['user','activity','assistant','activity','user']);
 assert.deepEqual(groups[1].items,events.slice(1,4));assert.equal(groups[1].key,'activity-event-1');
 assert.equal(isActivityEvent({role:'system'}),true);assert.equal(isActivityEvent({role:'assistant'}),false);
 assert.equal(activitySummary([{status:'completed'}],1,1,1),'Activity · 1 tool · 1 automatic approval · 1 permission decision · 1 system message');
});
test('approval references use recorded IDs or older original requests, never a guessed adjacent tool',()=>{
 assert.equal(permissionToolCallId({toolCallId:'recorded',request:'{"toolCallId":"old"}'}),'recorded');
 assert.equal(permissionToolCallId({request:'{"toolCallId":"old"}'}),'old');
 assert.equal(permissionToolCallId({request:'not json'}),null);
});
test('answered questions remain first-class chronological history beside their answer',()=>{
 const question={key:'question',role:'system',text:'**Question**\n\nExplain before proceeding?\n\n• Continue\n• Stop',data:{question:{id:'q1',status:'answered',answer:'Continue'}}};
 const answer={key:'answer',role:'user',text:'Continue',data:{questionReply:{requestId:'q1'}}};
 const groups=groupActivity([{key:'tool',role:'tool'},question,answer,{key:'tail',role:'system'}]);
 assert.deepEqual(groups.map(entry=>entry.key),['activity-tool','question','answer','activity-tail']);
 assert.equal(groups[1],question);assert.equal(groups[2],answer);
 for(const status of ['pending','cancelled','interrupted'])assert.equal(isActivityEvent({...question,data:{question:{id:'q1',status}}}),false);
});
test('individual tools show recorded elapsed and completion, independently of model active runtime',()=>{
 const tool={startedAt:1000,finishedAt:9000,status:'completed',durationMs:8000},turns=[{intervals:[[1000,3000],[8000,10000]]}];
 assert.equal(toolDuration(tool,12000,true,turns),8000);assert.equal(groupDuration([tool],12000,true,turns),3000);
 assert.equal(toolDuration({...tool,durationMs:undefined}),8000);
 assert.equal(toolDuration({startedAt:1000,status:'running'},4000,true),3000);
 assert.equal(toolDuration({startedAt:1000,status:'running'},4000,false),null);
 assert.equal(toolDuration({status:'completed'}),null);assert.equal(toolDuration({startedAt:5000,finishedAt:1000}),null);
 assert.equal(toolEventTime({status:'completed',finishedAt:'2026-10-12T12:01:13Z'},{at:'2026-10-12T12:00:00Z'}),'2026-10-12T12:01:13Z');
 assert.equal(toolEventTime({status:'completed'},{at:'2026-10-12T12:00:00Z'}),null);
});
test('remote Working guidance requires verified owner work and describes only available actions',()=>{
 const run={status:'running',chatControls:{steering:true}};
 assert.equal(workingMessage(run),'Working… you can queue a message or steer this turn.');
 assert.equal(workingMessage({status:'running'}),'Working… you can queue a message.');
 assert.equal(workingMessage(run,{steer:false}),'Working… you can queue a message.');
 for(const status of ['completed','failed','cancelled','interrupted','queued','awaiting_input'])assert.equal(workingMessage({status}),null);
 assert.equal(workingMessage({...run,pending:{type:'permission'}}),null);
 assert.equal(workingMessage({...run,runtimeVerified:false}),null);assert.equal(workingMessage(run,{verified:false}),null);
});

test('remote work guidance carries the owner adapter steering boundary without provider-name inference',()=>{
 const run={id:'fixture',status:'running',events:[],schedule:{provider:'new-provider'}};
 const controls=ownerChatControls(run,{providers:{'new-provider':{steer:async()=>{}}}});assert.equal(controls.steering,true);
 assert.deepEqual(remoteRun(run,0,undefined,undefined,controls).chatControls,{steering:true});
 assert.equal(ownerChatControls(run,{providers:{'new-provider':{}}}).steering,false);
 assert.equal(workingMessage({...run,chatControls:{steering:false}}),'Working… you can queue a message.');
 assert.equal(Object.hasOwn(remoteRun(run),'chatControls'),false);
});
