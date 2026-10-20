import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ContentTabs} from '../src/content-tabs.js';
import {createTabSynchronizer,tabChanges,rebaseTabChanges} from '../public/content-tab-sync.js';
import {RemoteCommandStore} from '../src/remote-command-store.js';

const scope={hostId:'synthetic-owner',scope:'workspace',id:'workspace'};
const tab={id:'browser',type:'browser',title:'Synthetic page',url:'https://example.test/',openedAt:'2026-10-01T00:00:00.000Z',lastTouchedAt:'2026-10-14T12:00:00.000Z',favicon:'data:image/png;base64,YQ=='};
function home(t,beforeRemove){const p=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-sync-capacity-'));t.after(async()=>{await beforeRemove?.();fs.rmSync(p,{recursive:true,force:true});});return p;}
function storage(){const values=new Map();return {values,getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}

test('two clients with stale runtime metadata do not accumulate mutations or regress owner timestamps',async t=>{
 const store=new ContentTabs(home(t));store.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab}]});let mutations=0;
 const clients=Array.from({length:2},()=>{
  let local=[];
  return createTabSynchronizer({scopes:()=>[scope],readLocal:async()=>local,apply:async(_scope,tabs)=>{local=tabs.map(t=>{const value={...t,openedAt:'2026-10-13T00:00:00Z',lastTouchedAt:'2026-10-13T12:00:00Z'};delete value.favicon;return value;});},request:async(_scope,action,args)=>{if(action==='get')return store.get(scope.scope,scope.id);mutations++;return store.mutate({...scope,...args});}});
 });
 for(let i=0;i<250;i++)await Promise.all(clients.map(c=>c.all()));
 assert.equal(mutations,0);assert.equal(store.get(scope.scope,scope.id).revision,1);assert.deepEqual(store.get(scope.scope,scope.id).tabs,[tab]);
 const stale={...tab,lastTouchedAt:'2026-10-13T12:00:00Z'};delete stale.favicon;
 assert.deepEqual(rebaseTabChanges([{action:'open',tab:stale}],[tab]),[]);
 const actual={...tab,lastTouchedAt:'2026-10-14T13:00:00Z'};assert.equal(tabChanges([tab],[actual]).length,1);
 const response=store.mutate({...scope,expectedRevision:1,operations:[{action:'open',tab:stale}]});assert.equal(response.revision,1);
});

test('a lost acknowledgement retries the exact wire command identity across synchronizer restart',async()=>{
 const pendingStorage=storage();let local=[],remote={revision:0,tabs:[]},first=true;const identities=[];
 const options={pendingStorage,scopes:()=>[scope],readLocal:async()=>local,apply:async(_scope,tabs)=>local=tabs,request:async(_scope,action,args,identity)=>{
  if(action==='get')return structuredClone(remote);
  identities.push(identity);
  if(first){first=false;throw Error('transport interrupted; outcome unknown');}
  remote={revision:1,tabs:[tab]};return structuredClone(remote);
 }};
 const firstSync=createTabSynchronizer(options);await firstSync.all();local=[tab];await firstSync.all();assert.equal(identities.length,1);
 const secondSync=createTabSynchronizer(options);await secondSync.all();assert.equal(identities.length,2);assert.deepEqual(identities[0],identities[1]);assert.equal(pendingStorage.values.size,0);
});

test('capacity failures back off per owner and deduplicate warnings across scopes without blocking other owners',async()=>{
 let clock=1000,failures=0,notices=0,otherReads=0;
 const scopes=[scope,{...scope,id:'other-workspace'},{...scope,hostId:'healthy-owner'}];
 const sync=createTabSynchronizer({now:()=>clock,scopes:()=>scopes,readLocal:async()=>[tab],apply:async()=>{},onError:()=>notices++,request:async(owner,action)=>{
  if(action==='get'){if(owner.hostId==='healthy-owner')otherReads++;return {revision:0,tabs:[]};}
  if(owner.hostId==='healthy-owner')return {revision:1,tabs:[tab]};
  failures++;throw Object.assign(Error('Remote command history is busy on Synthetic Mac'),{code:'JOURNAL_BUSY',details:{retryAfterMs:60_000}});
 }});
 for(let i=0;i<50;i++)await sync.all();assert.equal(failures,1);assert.equal(notices,1);assert.ok(otherReads>=50);
 clock+=59_999;await sync.all();assert.equal(failures,1);
 clock++;await sync.all();assert.equal(failures,2);assert.equal(notices,2);
});

test('capacity diagnostics identify record and byte limits and do not evict protected or uncertain receipts',t=>{
 let store,bytes;store=new RemoteCommandStore(home(t,()=>store?.close()),{maxRecords:2,maxBytes:100000});const at=new Date().toISOString();
 store.claim('first','a',at);store.complete('first','a',{result:{ok:true}});store.claim('uncertain','b',at);
 assert.throws(()=>store.claim('third','c',at),error=>error.code==='JOURNAL_BUSY'&&error.details.limitingCounter==='records'&&error.details.records===2&&error.details.pending===1);
 assert.deepEqual(store.claim('first','a','expired').previous.result,{ok:true});assert.equal(store.claim('uncertain','b','expired').previous.pending,true);
 bytes=new RemoteCommandStore(home(t,()=>bytes?.close()),{maxRecords:10,maxBytes:1});assert.throws(()=>bytes.claim('x','y',at),error=>error.code==='JOURNAL_BUSY'&&error.details.limitingCounter==='bytes');
});
