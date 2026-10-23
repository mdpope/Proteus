import test from 'node:test';
import assert from 'node:assert/strict';
import {terminalOutputBatch} from '../public/features/tools/terminal-output.js';
import {bindRuntimeTimer,disposeRuntimeTimers} from '../public/features/chats/runtime.js';
import {firstAssistantKeys} from '../public/features/chats/chat-history.js';

test('terminal output batches hidden writes, flushes on reveal and retains every byte in order',()=>{
 const callbacks=new Map(),written=[],delays=[];let visible=false,next=0;
 const output=terminalOutputBatch({write:data=>written.push(data),visible:()=>visible,maxBytes:12,delay:(fn,ms)=>{const id=++next;callbacks.set(id,fn);delays.push(ms);return id;},cancel:id=>callbacks.delete(id)});
 output.push('one');output.push('two');assert.equal(callbacks.size,1);assert.deepEqual(delays,[250]);assert.deepEqual(written,[]);
 visible=true;output.flush();assert.deepEqual(written,['onetwo']);assert.equal(callbacks.size,0);
 output.push('three');output.push('four');assert.deepEqual(delays,[250,16]);output.push('five');assert.deepEqual(written,['onetwo','threefourfive']);assert.equal(callbacks.size,0);
 output.push('six');callbacks.values().next().value();assert.deepEqual(written,['onetwo','threefourfive','six']);
 output.push('discarded on view disposal');output.push('pending');output.dispose();assert.equal(callbacks.size,0);output.push('late callback');assert.equal(written.at(-1),'discarded on view disposal');
});

test('completed runtime values create no scheduler and active timers release on completion/disconnection',()=>{
 const originalSet=globalThis.setInterval,originalClear=globalThis.clearInterval;let callback=null,starts=0,stops=0,reads=0;
 globalThis.setInterval=fn=>{callback=fn;starts++;return starts;};globalThis.clearInterval=()=>{callback=null;stops++;};
 const node={isConnected:true,textContent:'',classList:{add(){}},setAttribute(){}},root={querySelectorAll:()=>[node]};
 try{
  bindRuntimeTimer(node,()=>String(++reads),false);assert.equal(starts,0);assert.equal(reads,1);
  let running=true;bindRuntimeTimer(node,()=>String(++reads),()=>running);assert.equal(starts,1);callback();assert.equal(node.textContent,'3');
  running=false;callback();assert.equal(node.textContent,'4');assert.equal(stops,1);
  bindRuntimeTimer(node,()=>String(++reads),true);node.isConnected=false;callback();assert.equal(stops,2);assert.equal(reads,5);
 }finally{disposeRuntimeTimers(root);globalThis.setInterval=originalSet;globalThis.clearInterval=originalClear;}
});

test('assistant timing is indexed once per visible turn and avoids duplicate streaming timers',()=>{
 const event=(key,turn,streaming=false)=>({key,role:'assistant',data:{turnId:turn},streaming});
 const entries=[event('a','one'),event('b','one'),event('c','two'),event('stream','two',true),event('fresh','three',true)];
 assert.deepEqual([...firstAssistantKeys(entries,entries.filter(item=>!item.streaming))],['a','c','fresh']);
 assert.deepEqual([...firstAssistantKeys([event('stream','one',true)],[event('offscreen','one')])],[]);
});
