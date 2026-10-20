import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {trackedChildren,trackedPids,resourceTotals}=require('../desktop/resource-metrics.cjs');

test('whole-app resource totals include descendants once without duplicating Electron PIDs',()=>{
  const sample='100 1 1024 1.0 /Applications/Proteus\n101 100 2048 2.0 Electron Helper\n102 100 4096 3.0 codex\n103 102 8192 4.0 shell\n104 999 65536 99.0 other';
  const children=trackedChildren(100,new Set([100,101]),sample);
  assert.deepEqual(children.map(item=>item.pid),[102,103]);
  assert.deepEqual(resourceTotals([{pid:100,memoryBytes:1024,cpuPercent:1},{pid:101,memoryBytes:2048,cpuPercent:2},...children]),{memoryBytes:1024+2048+4096*1024+8192*1024,cpuPercent:10,processCount:4});
});
test('tagged persistent tmux PIDs are measured without counting unrelated sessions twice',()=>{
  const sample='200 1 1024 1.0 tmux\n201 200 2048 2.0 zsh\n202 200 4096 3.0 unrelated';
  const persistent=trackedPids([{pid:200,role:'tmux server'},{pid:201,role:'tmux pane',sessionId:'managed'}],new Set([200]),sample);
  assert.deepEqual(persistent.map(item=>item.pid),[201]);
  assert.equal(persistent[0].sessionId,'managed');
  assert.deepEqual(resourceTotals(persistent),{memoryBytes:2048*1024,cpuPercent:2,processCount:1});
});

test('process sampling is asynchronous, coalesces overlap and retries after failure',async()=>{
  const {createProcessSampler}=require('../desktop/resource-metrics.cjs');
  const calls=[];
  const sample=createProcessSampler({platform:'darwin',run:(file,args,options,callback)=>calls.push({file,args,options,callback})});
  const first=sample(),second=sample();assert.equal(first,second);assert.equal(calls.length,1);
  let settled=false;first.then(()=>{settled=true;});await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
  assert.equal(calls[0].options.timeout,2000);assert.equal(calls[0].options.maxBuffer,2_000_000);
  calls[0].callback(null,'100 1 1024 1.0 Proteus');assert.equal(await first,'100 1 1024 1.0 Proteus');
  const third=sample();assert.equal(calls.length,2);calls[1].callback(new Error('timed out'),'partial');assert.equal(await third,'');
  const fourth=sample();calls[2].callback(null,'fresh');assert.equal(await fourth,'fresh');
});

test('process parsing never launches a subprocess when no sample is available',()=>{
  assert.deepEqual(trackedChildren(1),[]);assert.deepEqual(trackedPids([{pid:2}]),[]);
});
