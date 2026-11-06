import test from 'node:test';
import assert from 'node:assert/strict';
import {ManagedTokenCoordinator} from '../src/services/integrations/managed-token-coordinator.js';
const binding=()=>({ownerId:'owner',credentialOwnerId:'owner',credentialRef:'opaque',issuer:'https://issuer.test',clientId:'client',adapter:'synthetic',expected:{principal:'person',tenant:'tenant',audience:'https://resource.test',scopes:['read']}});
const result=()=>({accessToken:'synthetic-access-secret',expiresAt:200000,credential:{refreshToken:'rotated-secret'},verified:binding().expected});
function setup(refresh=async()=>result()){
 const rows=new Map(),writes=[];
 const vault={read:async k=>structuredClone(rows.get(k)),write:async(k,v)=>{writes.push(structuredClone(v));rows.set(k,structuredClone(v));}};
 const manager=new ManagedTokenCoordinator({ownerId:'owner',vault,adapters:{synthetic:{refresh}},now:()=>0});
 return {manager,rows,writes,vault};
}
test('concurrent consumers share one rotation and receive tokens only after durable save',async()=>{
 let rotations=0;const {manager,writes}=setup(async()=>{rotations++;await new Promise(r=>setTimeout(r,10));return result();});
 await manager.adopt(binding(),{refreshToken:'original-secret'});
 const outputs=await Promise.all(Array.from({length:20},()=>manager.use(binding(),token=>{assert.equal(writes.at(-1).phase,'ready');assert.equal(writes.at(-1).credential.refreshToken,'rotated-secret');return token.length;})));
 assert.equal(rotations,1);assert.equal(outputs.length,20);assert.deepEqual(writes.map(v=>v.phase),['ready','refreshing','ready']);
 await manager.use(binding(),()=>{});assert.equal(rotations,1);
});
test('failed rotated credential persistence never releases token and restart refuses stale refresh',async()=>{
 const {manager,vault,rows}=setup();await manager.adopt(binding(),{refreshToken:'original-secret'});
 const write=vault.write;vault.write=async(k,v)=>{if(v.credential.refreshToken==='rotated-secret')throw Error('disk full');return write(k,v);};
 let invoked=false;await assert.rejects(manager.use(binding(),()=>{invoked=true;}));assert.equal(invoked,false);
 assert.equal(rows.get('opaque').phase,'refreshing');
 const restarted=new ManagedTokenCoordinator({ownerId:'owner',vault,adapters:{synthetic:{refresh:()=>assert.fail('stale token must not be reused')}},now:()=>0});
 await assert.rejects(restarted.use(binding(),()=>{}),{code:'ROTATION_UNCERTAIN'});
});
test('wrong identity and foreign owner fail without exposing adapter error or publishing credentials',async()=>{
 const {manager,writes}=setup(async()=>({...result(),verified:{...binding().expected,principal:'other'}}));
 await manager.adopt(binding(),{refreshToken:'original-secret'});
 await assert.rejects(manager.use(binding(),()=>assert.fail()),{code:'IDENTITY_MISMATCH'});
 assert.equal(writes.at(-1).phase,'refreshing');
 await assert.rejects(manager.use({...binding(),ownerId:'foreign',credentialOwnerId:'foreign'},()=>{}),{code:'OWNER_MISMATCH'});
});
test('refresh failures retain uncertainty and suppress raw secret-bearing provider errors',async()=>{
 let count=0;const {manager}=setup(async()=>{count++;throw Error('refreshToken=secret');});
 await manager.adopt(binding(),{refreshToken:'original-secret'});
 await assert.rejects(manager.use(binding(),()=>{}),e=>e.code==='RENEWAL_FAILED'&&!e.message.includes('secret'));
 await assert.rejects(manager.use(binding(),()=>{}),{code:'ROTATION_UNCERTAIN'});assert.equal(count,1);
});
test('changed audience cannot reuse token and closed service cannot release one',async()=>{
 const {manager}=setup();await manager.adopt(binding(),{refreshToken:'original-secret'});await manager.use(binding(),()=>{});
 await assert.rejects(manager.use({...binding(),expected:{...binding().expected,audience:'https://other.test'}},()=>{}),{code:'SIGN_IN_REQUIRED'});
 await assert.rejects(manager.use({...binding(),adapter:'different-adapter'},()=>{}),{code:'SIGN_IN_REQUIRED'});
 manager.close();await assert.rejects(manager.use(binding(),()=>{}),{code:'CLOSED'});
});
