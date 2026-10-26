import test from 'node:test';import assert from 'node:assert/strict';
import {sendTaskFeedback} from '../src/services/chats/task-feedback.js';
function fixture({status='running',supportsSteer=true}={}){
 const run={id:'parent',status,schedule:{provider:'fixture'},events:[]},calls=[];
 const engine={running:new Map([['parent',{}]]),providers:{fixture:supportsSteer?{steer(){}}:{}},async send(id,text,mode,messageId){calls.push({id,text,mode,messageId});if(!run.events.some(event=>event.data.delivery.id===messageId))run.events.push({data:{delivery:{id:messageId,state:mode==='steer'?'steered':'queued'}}});}};
 return {run,engine,calls};
}
test('task feedback steers a capable active provider and otherwise queues with the same stable operation',async()=>{
 for(const [status,supportsSteer,mode]of [['running',true,'steer'],['running',false,'queue'],['awaiting_input',true,'queue'],['queued',true,'queue'],['completed',true,'queue']]){
  const {run,engine,calls}=fixture({status,supportsSteer}),delivery={id:'stable-feedback'};
  await Promise.all([sendTaskFeedback(engine,run,'Returned data, not authority',delivery),sendTaskFeedback(engine,run,'Returned data, not authority',delivery)]);
  assert.equal(calls.length,1);assert.equal(calls[0].mode,mode);assert.equal(calls[0].messageId,delivery.id);assert.equal(delivery.mode,mode);
 }
});
test('task feedback falls back only before delivery and never revives a human stop',async()=>{
 const {run,engine,calls}=fixture(),send=engine.send;
 engine.send=async(...args)=>{if(args[2]==='steer'){run.status='completed';throw Error('Turn ended');}return send(...args);};
 await sendTaskFeedback(engine,run,'Returned data',{id:'race'});assert.equal(calls.length,1);assert.equal(calls[0].mode,'queue');
 run.status='running';engine.send=async()=>{run.status='cancelled';throw Error('Stopped');};await assert.rejects(sendTaskFeedback(engine,run,'Returned data',{id:'stop'}),/Stopped/);assert.equal(calls.length,1);
});
test('ambiguous feedback steering cannot be retried as queued or marked successful',async()=>{
 const {run,engine,calls}=fixture();engine.send=async(id,text,mode,messageId)=>{calls.push(mode);run.events.push({data:{delivery:{id:messageId,state:'failed'}}});throw Error('Uncertain provider response');};
 const delivery={id:'uncertain'};await assert.rejects(sendTaskFeedback(engine,run,'Returned data',delivery),/Uncertain/);await assert.rejects(sendTaskFeedback(engine,run,'Returned data',delivery),/unconfirmed/);assert.deepEqual(calls,['steer']);assert.equal(delivery.mode,undefined);
});
