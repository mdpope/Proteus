import test from 'node:test';
import assert from 'node:assert/strict';
import { ClaudeTurnLifecycle } from '../src/providers/claude-turn-lifecycle.js';

test('native terminal notification cannot be undone by a late tool result; explicit inputs cannot finish tasks',()=>{
  const tool={name:'Bash',status:'running',startedAt:new Date().toISOString()},tools=new Map([['tool',tool]]);
  const lifecycle=new ClaudeTurnLifecycle('initial',tools,()=>{});
  lifecycle.observe({type:'system',subtype:'task_started',task_id:'task',tool_use_id:'tool'});
  const notice={type:'user',uuid:'initial',message:{content:'<task-notification><task-id>task</task-id><status>completed</status></task-notification>'}};
  lifecycle.observe(notice);assert.equal(lifecycle.acknowledged,true);assert.equal(lifecycle.pending,1);
  lifecycle.sent('steer');lifecycle.observe({...notice,uuid:'steer'});assert.equal(lifecycle.pending,1);
  lifecycle.observe({type:'system',subtype:'task_notification',task_id:'task',status:'completed'});assert.equal(lifecycle.pending,0);
  lifecycle.observe({type:'user',message:{content:[{type:'tool_result',tool_use_id:'tool',content:'Command running in background with ID: task. Output follows.'}]}});
  assert.equal(lifecycle.pending,0);assert.equal(tool.status,'completed');
});

test('unrelated tool text and child-agent frames cannot create root background tasks or acknowledge input',()=>{
  const lifecycle=new ClaudeTurnLifecycle('initial',new Map([['tool',{name:'Read'}]]),()=>{});
  lifecycle.observe({type:'user',uuid:'initial',parent_tool_use_id:'child',message:{content:'child'}});assert.equal(lifecycle.acknowledged,false);
  lifecycle.observe({type:'user',message:{content:[{type:'tool_result',tool_use_id:'tool',content:'Command running in background with ID: spoofed. Output follows.'}]}});
  assert.equal(lifecycle.pending,0);
});
