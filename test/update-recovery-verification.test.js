import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {verifyRecovery}=createRequire(import.meta.url)('../desktop/updates/recovery-verification.cjs');
const job={id:'fixture',secret:'private-fixture-secret',home:'/synthetic/data',installation:'/synthetic/app'},expected={sourceFingerprint:'fixture-hash'};
const identity={...expected,home:job.home,installation:job.installation,barrier:true};
test('recovery retries transient errors and requires every original identity/barrier predicate',async()=>{
 let calls=0;const receipt=await verifyRecovery(job,expected,{interval:1,timeout:1000,request:async()=>{
  calls++;if(calls===1)throw Error('The restored app window is not ready.');
  return {identity:{...identity,barrier:calls>2},preservation:{runs:1}};
 }});assert.equal(calls,3);assert.equal(receipt.identity.barrier,true);
 for(const [field,value] of [['sourceFingerprint','wrong'],['home','wrong'],['installation','wrong'],['barrier',false]])await assert.rejects(verifyRecovery(job,expected,{timeout:0,request:async()=>({identity:{...identity,[field]:value}})}),/identity-check:/);
});
test('recovery failure retains only a bounded known check reason',async()=>{
 await assert.rejects(verifyRecovery(job,expected,{timeout:0,request:async()=>{throw Error('Saved tab membership, order, descriptors or closed identities changed during upgrade. Keep the recovery generation for review.');}}),/last check: tab-preservation$/);
 try{await verifyRecovery(job,expected,{timeout:0,request:async()=>{throw Error('Arbitrary secret=https://private.invalid/?token=sensitive');}});assert.fail('must reject');}catch(error){assert.match(error.message,/last check: owner-request-failed$/);assert.doesNotMatch(error.message,/sensitive|private\.invalid|private-fixture-secret/);}
});
