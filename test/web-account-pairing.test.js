import test from 'node:test';
import assert from 'node:assert/strict';
import {AccountPairingStore, AccountSessionError, BrowserDestinationStore} from '../web/resources/js/remote-client.js';
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

test('browser destination adapter merges authorized stores without migrating or falling back from account failures',async()=>{
 const localId='44444444-4444-4444-8444-444444444444',f=fixture();
 const key=await crypto.subtle.importKey('raw',new Uint8Array(32),{name:'AES-GCM'},false,['encrypt','decrypt']);
 const local={...credential,hostId:localId,label:'Field laptop',key};let saves=0;
 const legacyStore={list:async()=>[{...local,hostId},local],save:async()=>{saves++;},close(){}};
 const store=new BrowserDestinationStore(account,{accountStore:f.store,legacyStore});
 const list=await store.list();assert.deepEqual(list.map(h=>[h.hostId,h.source]),[[hostId,'account'],[localId,'legacy']]);assert.ok(list.every(h=>!('key'in h)));
 assert.equal((await store.credential(localId)).key,key);assert.equal((await store.credential(hostId)).source,'account');assert.equal(saves,0);
 await assert.rejects(store.credential('55555555-5555-4555-8555-555555555555'),error=>error.status===404);
 f.switchAccount();await assert.rejects(store.credential(localId),AccountSessionError);assert.equal(saves,0);
 const broken=new BrowserDestinationStore(account,{accountStore:{list:async()=>[{...credential,source:'account'}],credential:async()=>{throw new Error('encrypted account record unavailable');}},legacyStore});
 await assert.rejects(broken.credential(hostId),/encrypted account/);
});
