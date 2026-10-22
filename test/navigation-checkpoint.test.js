import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {ContentTabs} from '../src/content-tabs.js';
import {BrowserHistory} from '../src/browser-history.js';
import {createTabSynchronizer} from '../public/content-tab-sync.js';
const {acknowledgesNavigation}=createRequire(import.meta.url)('../desktop/browser-navigation.cjs');

const scope={scope:'chat',id:'checkpoint'};
const entry=id=>({id,url:'https://example.test/'+id,title:id});
const browser={id:'browser',type:'browser',title:'a',url:entry('a').url,history:{entries:[entry('a')],index:0,currentEntryId:'a',revision:1}};
const navigated={...browser,title:'b',url:entry('b').url,navigationPending:true,history:{entries:[entry('a'),entry('b')],index:1,currentEntryId:'b',revision:1}};
function storage(){const values=new Map();return {values,getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}

test('departing navigation is checkpointed without network and restored with its original operation identity',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-navigation-checkpoint-')),history=new BrowserHistory(home,{hostId:'owner'});await history.ready;t.after(async()=>{await history.close();fs.rmSync(home,{recursive:true,force:true});});
  const host=new ContentTabs(home,{history}),pendingStorage=storage(),submitted=[];let local=[structuredClone(browser)],requests=0,applies=0;
  host.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:browser}]});
  const options={navigation:true,pendingStorage,scopes:()=>[scope],readLocal:async()=>local,apply:async(_scope,tabs)=>{applies++;local=tabs;},request:async(_scope,action,args)=>{requests++;if(action==='get')return host.getAsync(scope.scope,scope.id,args);submitted.push(...args.operations);return host.mutateAsync({...scope,...args});},onError:error=>{throw error;}};
  const sync=createTabSynchronizer(options);await sync.all();local=[{...structuredClone(navigated),history:{...structuredClone(navigated.history),revision:local[0].history.revision}}];const before={requests,applies};
  assert.equal(await sync.checkpoint(scope),true);assert.deepEqual({requests,applies},before);
  const operations=JSON.parse([...pendingStorage.values].find(([key])=>key.startsWith('proteus.navigation.pending:'))[1]);
  assert.equal(operations[0].action,'browser-navigate');assert.equal(operations[0].entryId,'b');
  // The outbox is sufficient even if an older workspace reader omitted the flag.
  delete local[0].navigationPending;await createTabSynchronizer(options).all();
  assert.equal(local[0].url,entry('b').url);assert.deepEqual(local[0].history.entries.map(value=>value.id),['a','b']);
  assert.equal(submitted[0].operationId,operations[0].operationId);
  assert.equal([...pendingStorage.values.keys()].some(key=>key.startsWith('proteus.navigation.pending:')),false);
});

test('scope checkpoint preserves uncertain request bytes and leaves newer native navigation for later reconciliation',async()=>{
  const pendingStorage=storage();let local=[structuredClone(browser)],fail=false,requests=0;
  const sync=createTabSynchronizer({navigation:true,pendingStorage,scopes:()=>[scope],readLocal:async()=>local,apply:async()=>{},request:async(_scope,action)=>{requests++;if(action==='get')return {revision:1,tabs:[browser]};if(fail)throw Error('offline');},onError:()=>{}});
  await sync.all();local=[structuredClone(navigated)];fail=true;await sync.all();const saved=[...pendingStorage.values],before=requests;
  local[0].history.entries.push(entry('c'));local[0].history.index=2;local[0].history.currentEntryId='c';local[0].url=entry('c').url;
  assert.equal(await sync.checkpoint(scope),false);assert.equal(requests,before);assert.deepEqual([...pendingStorage.values],saved);assert.equal(local[0].navigationPending,true);
});

test('checkpoint cannot resurrect a forgotten scope while reading its local snapshot',async()=>{
  const pendingStorage=storage();let delayed=false,release;
  const sync=createTabSynchronizer({navigation:true,pendingStorage,scopes:()=>[scope],readLocal:async()=>{if(delayed)await new Promise(resolve=>release=resolve);return delayed?[navigated]:[browser];},apply:async()=>{},request:async()=>({revision:1,tabs:[browser]})});
  await sync.all();delayed=true;const pending=sync.checkpoint(scope);sync.forget(scope);release();assert.equal(await pending,false);assert.equal(pendingStorage.values.size,0);
});

async function navigationFixture(t,initial){
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-forward-checkpoint-')),history=new BrowserHistory(home,{hostId:'owner'});await history.ready;t.after(async()=>{await history.close();fs.rmSync(home,{recursive:true,force:true});});
  const host=new ContentTabs(home,{history}),fixture={local:[],offline:false,errors:[]},pendingStorage=storage();
  if(initial)host.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:initial}]});
  fixture.options={navigation:true,pendingStorage,scopes:()=>[scope],readLocal:async()=>fixture.local,
    apply:async(_scope,tabs)=>{fixture.local=tabs.map(tab=>{const current=fixture.local.find(value=>value.id===tab.id);return current?.navigationPending&&!acknowledgesNavigation(current.history,tab.history)?current:tab;});},
    request:async(_scope,action,args)=>{if(action==='get')return host.getAsync(scope.scope,scope.id,args);if(action==='history')return host.history({...scope,...args});if(fixture.offline)throw Error('offline');return host.mutateAsync({...scope,...args});},onError:error=>fixture.errors.push(error)};
  fixture.sync=createTabSynchronizer(fixture.options);fixture.saved=()=>host.getAsync(scope.scope,scope.id);return fixture;
}
const stack=(ids,index,revision)=>({entries:ids.map(entry),index,currentEntryId:ids[index],...(revision===undefined?{}:{revision})});

test('first publication of a pending browser retains Forward history after Back',async t=>{
  const f=await navigationFixture(t);f.local=[{...navigated,history:stack(['a','b','c'],1)}];await f.sync.all();
  const saved=(await f.saved()).tabs[0];assert.deepEqual(saved.history.entries.map(row=>row.id),['a','b','c']);assert.equal(saved.history.currentEntryId,'b');assert.deepEqual(f.errors,[]);
});

test('offline Back and new branch reconcile from the branch point and retain later forward visits',async t=>{
  const f=await navigationFixture(t,{...browser,url:entry('y').url,history:stack(['a','x','y'],2)});await f.sync.all();
  f.local=[{...f.local[0],url:entry('a').url,navigationPending:true,history:stack(['a','b','c'],0,f.local[0].history.revision)}];await f.sync.all();
  const saved=(await f.saved()).tabs[0];assert.deepEqual(saved.history.entries.map(row=>row.id),['a','b','c']);assert.equal(saved.history.currentEntryId,'a');assert.deepEqual(f.errors,[]);
});

test('restarted uncertain B request preserves newer Forward C and publishes it before clearing native pending state',async t=>{
  const f=await navigationFixture(t,browser);await f.sync.all();const revision=f.local[0].history.revision;
  f.local=[{...navigated,history:stack(['a','b'],1,revision)}];f.offline=true;await f.sync.all();assert.equal(f.errors.length,1);
  f.local=[{...navigated,history:stack(['a','b','c'],1,revision)}];f.offline=false;f.sync=createTabSynchronizer(f.options);await f.sync.all();
  assert.deepEqual(f.local[0].history.entries.map(row=>row.id),['a','b','c']);assert.equal(f.local[0].navigationPending,true,'partial same-entry acknowledgement must keep C');
  await f.sync.all();const saved=(await f.saved()).tabs[0];assert.deepEqual(saved.history.entries.map(row=>row.id),['a','b','c']);assert.equal(saved.history.currentEntryId,'b');assert.notEqual(f.local[0].navigationPending,true);assert.equal(f.errors.length,1);
});

test('metadata changed during a remote read cannot turn a stale native view into an owner navigation',async()=>{
  let local=[{...structuredClone(browser),navigationPending:false}],remote={revision:1,tabs:[structuredClone(browser)]},touch=false;const mutations=[];
  const sync=createTabSynchronizer({navigation:true,scopes:()=>[scope],readLocal:async()=>local,
    apply:async(_scope,tabs,captured)=>{if(JSON.stringify(local)!==JSON.stringify(captured))return;local=tabs.map(tab=>({...tab,navigationPending:false}));},
    request:async(_scope,action,args)=>{if(action==='get'){if(touch){local[0].lastTouchedAt='2026-10-22T12:00:00Z';touch=false;}return structuredClone(remote);}mutations.push(...args.operations);return structuredClone(remote);}});
  await sync.all();remote={revision:2,tabs:[{...navigated,navigationPending:undefined,history:stack(['a','b'],1,2)}]};touch=true;
  await sync.all();assert.equal(local[0].history.currentEntryId,'a','a changed captured snapshot is preserved until the next read');
  await sync.all();assert.equal(mutations.some(op=>op.action.startsWith('browser-')),false,'a stale nonpending mirror must not send navigation back to the owner');assert.equal(local[0].history.currentEntryId,'b');
});
