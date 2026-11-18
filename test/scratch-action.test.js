import test from 'node:test';
import assert from 'node:assert/strict';
import {ScratchAction} from '../public/models/scratch-action.js';

test('structural action survives reload and lost acknowledgement without another operation',async()=>{
 let disk=null,fail=true;const calls=[],receipts=new Map();
 const options={load:()=>disk,save:value=>{disk=structuredClone(value);},request:async command=>{
  calls.push(structuredClone(command));if(!receipts.has(command.operationId))receipts.set(command.operationId,{id:'one',revision:'saved'});
  if(fail)throw Error('Connection dropped after commit');return receipts.get(command.operationId);
 }};
 await assert.rejects(new ScratchAction(options).perform({action:'create',title:'Note'}),/dropped/);
 const restored=new ScratchAction(options);
 await assert.rejects(restored.perform({action:'create',title:'Other'}),/Retry the unconfirmed/);
 fail=false;assert.deepEqual(await restored.retry(),{id:'one',revision:'saved'});
 assert.deepEqual(calls[0],calls[1]);assert.equal(receipts.size,1);assert.equal(disk,null);
});
test('local storage failure prevents dispatch and final acknowledgement failure keeps the retry',async()=>{
 let fail=true,calls=0,failClear=false;
 const action=new ScratchAction({save:value=>{if(fail||failClear&&!value)throw Error('Storage unavailable');},request:async()=>{calls++;return {deleted:true};}});
 await assert.rejects(action.perform({action:'delete',id:'one',expectedRevision:'r1'}),/Storage/);assert.equal(calls,0);
 const original=action.pending.operationId;fail=false;failClear=true;
 await assert.rejects(action.retry(),/Storage/);assert.equal(action.pending.operationId,original);
 failClear=false;await action.retry();assert.equal(action.pending,null);assert.equal(calls,2);
});
test('owner rejection before any file intent releases the action without losing its error',async()=>{
 let saved=null;
 const action=new ScratchAction({save:value=>saved=value,request:async()=>{throw Object.assign(Error('Scratch revision changed'),{code:'SCRATCH_REJECTED'});}});
 await assert.rejects(action.perform({action:'delete',id:'one',expectedRevision:'old'}),/revision changed/);
 assert.equal(saved,null);assert.equal(action.pending,null);
});
