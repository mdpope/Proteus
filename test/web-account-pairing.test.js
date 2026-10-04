import test from 'node:test';
import assert from 'node:assert/strict';
import {AccountPairingStore, AccountSessionError} from '../web/resources/js/remote-client.js';
const account='a'.repeat(64), other='b'.repeat(64), hostId='11111111-1111-4111-8111-111111111111', deviceId='22222222-2222-4222-8222-222222222222';
const credential={hostId,deviceId,relay:'wss://relay.example.test',label:'Synthetic Mac',pairedAt:'2026-10-04T12:00:00Z',key:'1'.repeat(64)};
function fixture(){let active=account, stored={...credential};const calls=[];const store=new AccountPairingStore(account,{csrf:()=> 'synthetic-csrf',fetcher:async(url,options)=>{
 calls.push({url,options});if(url==='/remote/session')return Response.json({account:active});if(options.headers['X-Proteus-Account']!==active)return Response.json({}, {status:409});
 if(url.endsWith('/credential'))return Response.json(stored);if(options.method==='POST'){stored=JSON.parse(options.body);const{key,...metadata}=stored;return Response.json(metadata);}
 if(options.method==='DELETE'){if(JSON.parse(options.body).deviceId!==stored.deviceId)return Response.json({}, {status:409});stored=null;return Response.json({removed:true});}
 const{key,...metadata}=stored;return Response.json({destinations:[metadata]});
 }});return{store,calls,switchAccount:()=>{active=other;},replace:()=>{stored={...stored,deviceId:'33333333-3333-4333-8333-333333333333'};}};}
test('account destinations list metadata, import only selected key and bind every request',async()=>{
 const f=fixture(),list=await f.store.list();assert.equal(list[0].key,undefined);const selected=await f.store.credential(hostId);assert.equal(selected.key.extractable,false);assert.equal(selected.key.algorithm.name,'AES-GCM');assert.equal(selected.source,'account');
 for(const{options}of f.calls){assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'manual');assert.equal(options.cache,'no-store');assert.equal(options.headers['X-Proteus-Account'],account);}
 const saved=await f.store.saveCredential(credential);assert.equal(saved.key,undefined);assert.equal(f.calls.at(-1).options.headers['X-CSRF-TOKEN'],'synthetic-csrf');
});
test('changed accounts fail before credential retrieval and mutation',async()=>{
 const f=fixture();f.switchAccount();for(const run of [()=>f.store.list(),()=>f.store.credential(hostId),()=>f.store.saveCredential(credential),()=>f.store.remove(credential)])await assert.rejects(run,AccountSessionError);
 assert.ok(f.calls.every(c=>c.url==='/remote/session'));
});
test('stale removal cannot delete newer device; endpoint redirects and failures do not return credentials',async()=>{
 const f=fixture();f.replace();await assert.rejects(f.store.remove(credential),error=>error.status===409);
 for(const status of [401,403,419]){const s=new AccountPairingStore(account,{fetcher:async()=>Response.json({}, {status})});await assert.rejects(s.list(),AccountSessionError);}
 assert.throws(()=>new AccountPairingStore(account,{base:'https://other.example.test/keys'}),/website/);
});
