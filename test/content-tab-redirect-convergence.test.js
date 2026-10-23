import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import {BrowserHistoryStore} from '../src/browser-history-store.js';
import {ContentTabs} from '../src/content-tabs.js';
import {createTabSynchronizer,rebaseTabChanges} from '../public/content-tab-sync.js';

const clone=value=>structuredClone(value);
const scope={scope:'project',id:'redirect-convergence'};
const entry=(id,title=id)=>({id,url:'https://example.test/'+id,title});
const selected=entry('b','After');
const descriptor={id:'browser',type:'browser',url:selected.url,title:selected.title,history:{entries:[entry('a'),selected,entry('c')],index:1,currentEntryId:'b',revision:3}};
const redirect={action:'browser-redirect',tabId:'browser',entryId:'b',url:selected.url,title:selected.title,operationId:'local-title-operation',baseRevision:2};
const storageFor=values=>({getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)});
const storageKeys={pending:'proteus.navigation.pending:'+JSON.stringify(['',scope.scope,scope.id]),request:'proteus.navigation.request:'+JSON.stringify(['',scope.scope,scope.id])};

function pendingState(operation,revision){
 const operations=Array.isArray(operation)?clone(operation):[clone(operation)];
 const args={historyLimit:200,expectedRevision:revision,operations};
 const envelope={id:'original-request-identity',issuedAt:'2026-10-22T12:00:00Z',signature:JSON.stringify(args)};
 return {args,envelope,values:new Map([[storageKeys.pending,JSON.stringify(operations)],[storageKeys.request,JSON.stringify(envelope)]])};
}

test('already-satisfied selected-entry redirect is metadata convergence without rewriting its operation',()=>{
 const current=[clone(descriptor)],operation=clone(redirect),before=JSON.stringify({current,operation});
 assert.deepEqual(rebaseTabChanges([operation],current),[]);
 assert.equal(JSON.stringify({current,operation}),before);
});

const retainedCases=[
 ['different URL',op=>{op.url='https://example.test/different';}],
 ['different title',op=>{op.title='Different title';}],
 ['different entry',op=>{op.entryId='another-entry';}],
 ['missing tab',(_op,tabs)=>{tabs.length=0;}],
 ['wrong selected index',(_op,tabs)=>{tabs[0].history.index=0;}],
 ['matching nonselected entry',(_op,tabs)=>{tabs[0].history.index=0;tabs[0].history.currentEntryId='a';}],
 ['missing history',(_op,tabs)=>{delete tabs[0].history;}],
 ['traversal',op=>{op.action='browser-traverse';}]
];
for(const [name,change]of retainedCases)test('redirect convergence retains the original operation for '+name,()=>{
 const operation=clone(redirect),current=[clone(descriptor)];change(operation,current);const before=JSON.stringify({operation,current});
 assert.deepEqual(rebaseTabChanges([operation],current),[operation]);
 assert.equal(JSON.stringify({operation,current}),before,'retained payload, IDs and base revision remain exact');
});

async function fixture(t){
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-redirect-convergence-'));let history=new BrowserHistoryStore(home),notifications=0;
 t.after(()=>{history?.close();fs.rmSync(home,{recursive:true,force:true});});
 const tabs=new ContentTabs(home,{history,onChange:()=>notifications++});
 tabs.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:{id:'browser',type:'browser',url:'',title:'New tab'}}]});
 for(const [index,id]of ['a','b','c'].entries())await tabs.mutateAsync({...scope,operations:[{action:'browser-navigate',tabId:'browser',entryId:id,operationId:'visit-'+id,baseRevision:index,url:'https://example.test/'+id,title:'Before '+id,visitedAt:'2026-10-22T12:00:00Z'}]});
 await tabs.mutateAsync({...scope,operations:[{action:'browser-traverse',tabId:'browser',entryId:'b',operationId:'back-to-b',baseRevision:3,visitedAt:'2026-10-22T12:01:00Z'}]});
 const operation={...redirect,baseRevision:4};
 const snapshot=()=>({navigation:history.navigationGet({tabId:tabs.navigationKey(scope.scope,scope.id,'browser'),limit:10000}),events:history.query({limit:200}),receipts:history.db.prepare('SELECT * FROM nav_receipts ORDER BY operation_id').all(),changes:history.db.prepare('SELECT * FROM nav_changes ORDER BY tab_id,revision').all(),descriptor:fs.readFileSync(tabs.file,'utf8'),notifications});
 return {home,tabs,operation,snapshot,get history(){return history;},reopen(){history.close();history=new BrowserHistoryStore(home);tabs.historyStore=history;}};
}

test('restart drops only an already-satisfied persisted redirect, without mutation, visit or fabricated receipt',async t=>{
 const f=await fixture(t);await f.tabs.mutateAsync({...scope,operations:[{...f.operation,operationId:'other-client-title'}]});
 f.reopen();const remote=await f.tabs.getAsync(scope.scope,scope.id),saved=pendingState(f.operation,remote.revision),before=f.snapshot(),errors=[];let local=clone(remote.tabs),mutations=0;
 local[0].history.revision=4;
 const sync=createTabSynchronizer({navigation:true,pendingStorage:storageFor(saved.values),scopes:()=>[scope],readLocal:async()=>clone(local),apply:async(_scope,tabs)=>{local=clone(tabs);},onError:error=>errors.push(error),request:async(_scope,action)=>{if(action==='get')return f.tabs.getAsync(scope.scope,scope.id);mutations++;throw Error('An already-satisfied operation must not dispatch');}});
 await sync.all();
 assert.deepEqual(errors,[]);assert.equal(mutations,0);assert.equal(saved.values.has(storageKeys.pending),false);assert.equal(saved.values.has(storageKeys.request),false);
 assert.deepEqual(f.snapshot(),before,'complete stack, Forward entries, visits, deltas and original durable receipts remain unchanged');
 assert.equal(f.history.db.prepare('SELECT operation_id FROM nav_receipts WHERE operation_id=?').get(f.operation.operationId),undefined,'no server receipt is fabricated for a skipped operation');
 assert.deepEqual(local,[{...remote.tabs[0],history:{entries:remote.tabs[0].history.entries,index:remote.tabs[0].history.index,currentEntryId:remote.tabs[0].history.currentEntryId,revision:remote.tabs[0].history.revision}}],'applied full logical history differs only by transport paging metadata');
});

test('unsatisfied lost-ack retry after reopen preserves the original envelope, digest and operation identity',async t=>{
 const f=await fixture(t),remote=await f.tabs.getAsync(scope.scope,scope.id),saved=pendingState(f.operation,remote.revision),calls=[],errors=[];let local=clone(remote.tabs),loseAck=true;
 local[0].history.entries[1].title=f.operation.title;local[0].title=f.operation.title;
 const options={navigation:true,pendingStorage:storageFor(saved.values),scopes:()=>[scope],readLocal:async()=>clone(local),apply:async(_scope,tabs)=>{local=clone(tabs);},onError:error=>errors.push(error),request:async(_scope,action,args,envelope)=>{
  if(action==='get')return f.tabs.getAsync(scope.scope,scope.id);
  calls.push({args:clone(args),envelope:clone(envelope)});const result=await f.tabs.mutateAsync({...scope,...args});
  if(loseAck){loseAck=false;await f.tabs.mutateAsync({...scope,operations:[{...f.operation,title:'Later owner title',operationId:'later-owner-title',baseRevision:5}]});throw Error('Synthetic lost acknowledgement after committed title');}
  return result;
 }};
 await createTabSynchronizer(options).all();assert.equal(saved.values.has(storageKeys.pending),true);assert.deepEqual(JSON.parse(saved.values.get(storageKeys.request)),saved.envelope);
 f.reopen();const committed=f.snapshot();await createTabSynchronizer(options).all();
 assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);assert.deepEqual(calls[0].args,saved.args);assert.deepEqual(calls[0].envelope,{id:saved.envelope.id,issuedAt:saved.envelope.issuedAt});
 assert.equal(saved.values.has(storageKeys.pending),false);assert.equal(saved.values.has(storageKeys.request),false);assert.deepEqual(f.snapshot(),committed,'receipt replay cannot overwrite the later title or duplicate effects');
 assert.equal(local[0].history.entries[1].title,'Later owner title');assert.equal(errors.length,1);assert.match(errors[0].message,/Synthetic lost acknowledgement/);
 const tabId=f.tabs.navigationKey(scope.scope,scope.id,'browser'),stored={...f.operation,action:'redirect',tabId,visitTabId:'browser',profileId:'default'};
 assert.throws(()=>f.history.navigation({...stored,title:'Reused ID with different payload'}),error=>error.code==='NAVIGATION_OPERATION_CONFLICT');
});

test('failed navigation batch leaves committed history and operation receipts untouched',async t=>{
 const f=await fixture(t),before=f.snapshot(),tabId=f.tabs.navigationKey(scope.scope,scope.id,'browser');
 assert.throws(()=>f.history.batchNavigation({operations:[{...f.operation,action:'redirect',tabId,profileId:'default',operationId:'rolled-back-title'},{action:'traverse',tabId,entryId:'a',operationId:'stale-traverse',baseRevision:0,profileId:'default'}]}),error=>error.code==='NAVIGATION_CONFLICT');
 assert.deepEqual(f.snapshot(),before);assert.equal(f.history.db.prepare('SELECT operation_id FROM nav_receipts WHERE operation_id=?').get('rolled-back-title'),undefined);
});


test('an unsent open cannot supply canonical history proof for skipping its following redirect',()=>{
 const current=clone(descriptor);current.history.entries[1].title='Before';current.title='Before';
 const operations=[{action:'open',tab:clone(descriptor)},clone(redirect)],before=JSON.stringify({operations,current});
 assert.deepEqual(rebaseTabChanges(operations,[current]).find(op=>op.action==='browser-redirect'),redirect);
 assert.equal(JSON.stringify({operations,current}),before);
});

test('peer title committed after GET is consumed after one fresh read without retrying a navigation write',async t=>{
 const f=await fixture(t),remote=await f.tabs.getAsync(scope.scope,scope.id),saved=pendingState(f.operation,remote.revision),errors=[];let local=clone(remote.tabs),gets=0,mutations=0,peerState;
 const sync=createTabSynchronizer({navigation:true,pendingStorage:storageFor(saved.values),scopes:()=>[scope],readLocal:async()=>clone(local),apply:async(_scope,tabs)=>{local=clone(tabs);},onError:error=>errors.push(error),request:async(_scope,action,args)=>{
  if(action==='get'){gets++;return f.tabs.getAsync(scope.scope,scope.id);}
  mutations++;await f.tabs.mutateAsync({...scope,operations:[{...f.operation,operationId:'peer-wins-get-write-window'}]});peerState=f.snapshot();return f.tabs.mutateAsync({...scope,...args});
 }});
 await sync.all();assert.deepEqual(errors,[]);assert.equal(gets,2,'one original and one bounded fresh read');assert.equal(mutations,1,'the rejected stale operation is never resent');assert.equal(sync.hasConflict(scope),false);
 assert.equal(saved.values.has(storageKeys.pending),false);assert.equal(saved.values.has(storageKeys.request),false);assert.deepEqual(f.snapshot(),peerState,'consuming satisfied intent cannot alter history or fabricate a navigation receipt');
 assert.equal(f.history.db.prepare('SELECT operation_id FROM nav_receipts WHERE operation_id=?').get(f.operation.operationId),undefined);assert.equal(local[0].history.entries[1].title,f.operation.title);
});

test('same-goal redirect recovery rebases same-browser metadata and preserves a concurrent addition in reorder',async t=>{
 const f=await fixture(t),existing={id:'existing-browser',type:'browser',url:'',title:'Existing tab'};await f.tabs.mutateAsync({...scope,expectedRevision:1,operations:[{action:'open',tab:existing}]});
 const remote=await f.tabs.getAsync(scope.scope,scope.id),added={id:'peer-added-browser',type:'browser',url:'',title:'Concurrent peer tab'},metadata={action:'open',tab:{...clone(remote.tabs[0]),title:'Custom label',customTitle:'Custom label'}},operations=[f.operation,metadata,{action:'reorder',ids:[existing.id,'browser']}],saved=pendingState(operations,remote.revision),calls=[],errors=[];let local=clone(remote.tabs),gets=0;
 saved.envelope.signature=JSON.stringify({...saved.args,operations:[f.operation]});saved.values.set(storageKeys.request,JSON.stringify(saved.envelope));
 const sync=createTabSynchronizer({navigation:true,pendingStorage:storageFor(saved.values),scopes:()=>[scope],readLocal:async()=>clone(local),apply:async(_scope,tabs)=>{local=clone(tabs);},onError:error=>errors.push(error),request:async(_scope,action,args,envelope)=>{
  if(action==='get'){gets++;return f.tabs.getAsync(scope.scope,scope.id);}
  calls.push({args:clone(args),envelope:clone(envelope)});
  if(calls.length===1){await f.tabs.mutateAsync({...scope,operations:[{...f.operation,operationId:'peer-before-metadata'}]});await f.tabs.mutateAsync({...scope,expectedRevision:remote.revision,operations:[{action:'open',tab:added}]});await f.tabs.mutateAsync({...scope,expectedRevision:remote.revision+1,operations:[{action:'reorder',ids:[added.id,'browser',existing.id]}]});}
  return f.tabs.mutateAsync({...scope,...args});
 }});
 await sync.all();assert.deepEqual(errors,[]);assert.equal(gets,2);assert.equal(calls.length,2);assert.deepEqual(calls[0].args.operations,[f.operation]);assert.equal(calls[1].args.operations[0].action,'open');assert.equal(calls[1].args.operations[0].tab.id,'browser');assert.deepEqual(calls[1].args.operations[1],{action:'reorder',ids:[existing.id,'browser',added.id]});assert.equal(calls[0].envelope.id,saved.envelope.id);assert.notEqual(calls[1].envelope.id,calls[0].envelope.id,'metadata never reuses the failed navigation envelope for different bytes');
 assert.deepEqual(local.map(tab=>tab.id),[existing.id,'browser',added.id]);assert.equal(local[1].customTitle,'Custom label');assert.equal(local[1].history.entries[1].title,f.operation.title);assert.deepEqual(local[1].history.entries.map(entry=>entry.id),['a','b','c']);assert.equal(f.history.query().total,4);assert.equal(f.history.db.prepare('SELECT operation_id FROM nav_receipts WHERE operation_id=?').get(f.operation.operationId),undefined);assert.equal(saved.values.has(storageKeys.pending),false);
});

for(const changed of ['URL','title','entry','selection'])test('fresh redirect proof preserves strict conflict for changed '+changed,async t=>{
 const f=await fixture(t),remote=await f.tabs.getAsync(scope.scope,scope.id),saved=pendingState(f.operation,remote.revision),errors=[];let gets=0,mutations=0;
 const sync=createTabSynchronizer({navigation:true,pendingStorage:storageFor(saved.values),scopes:()=>[scope],readLocal:async()=>clone(remote.tabs),apply:async()=>assert.fail('a conflicting fresh state must not replace local pending state'),onError:error=>errors.push(error),request:async(_scope,action,args)=>{
  if(action==='get'){gets++;return f.tabs.getAsync(scope.scope,scope.id);}
  mutations++;
  if(changed==='URL')await f.tabs.mutateAsync({...scope,operations:[{...f.operation,url:'https://example.test/other-url',operationId:'peer-url'}]});
  if(changed==='title')await f.tabs.mutateAsync({...scope,operations:[{...f.operation,title:'Other title',operationId:'peer-title'}]});
  if(changed==='entry')await f.tabs.mutateAsync({...scope,operations:[{...f.operation,action:'browser-navigate',entryId:'new-entry',operationId:'peer-new-entry',visitedAt:'2026-10-22T12:02:00Z'}]});
  if(changed==='selection'){await f.tabs.mutateAsync({...scope,operations:[{...f.operation,operationId:'peer-title-before-selection'}]});await f.tabs.mutateAsync({...scope,operations:[{action:'browser-traverse',tabId:'browser',entryId:'a',operationId:'peer-different-selection',baseRevision:5,visitedAt:'2026-10-22T12:02:00Z'}]});}
  return f.tabs.mutateAsync({...scope,...args});
 }});
 await sync.all();assert.equal(gets,2);assert.equal(mutations,1);assert.equal(errors.length,1);assert.equal(errors[0].code,'NAVIGATION_CONFLICT');assert.equal(sync.hasConflict(scope),true);assert.deepEqual(JSON.parse(saved.values.get(storageKeys.pending)),[f.operation]);assert.deepEqual(JSON.parse(saved.values.get(storageKeys.request)),saved.envelope);assert.equal(f.history.db.prepare('SELECT operation_id FROM nav_receipts WHERE operation_id=?').get(f.operation.operationId),undefined);
});

for(const action of ['browser-navigate','browser-traverse','rename'])test('mixed '+action+' outbox cannot use metadata-only redirect recovery',async t=>{
 const f=await fixture(t),remote=await f.tabs.getAsync(scope.scope,scope.id),extra=action==='rename'?{action,id:'browser',title:'Explicit user label'}:{...f.operation,action,entryId:'a',operationId:'queued-other-navigation',baseRevision:5},operations=[f.operation,extra],saved=pendingState(operations,remote.revision),errors=[];let gets=0,mutations=0;
 saved.envelope.signature=JSON.stringify({...saved.args,operations:[f.operation]});saved.values.set(storageKeys.request,JSON.stringify(saved.envelope));
 const sync=createTabSynchronizer({navigation:true,pendingStorage:storageFor(saved.values),scopes:()=>[scope],readLocal:async()=>clone(remote.tabs),apply:async()=>assert.fail('mixed navigation cannot be silently resolved'),onError:error=>errors.push(error),request:async(_scope,method,args)=>{
  if(method==='get'){gets++;return f.tabs.getAsync(scope.scope,scope.id);}
  mutations++;await f.tabs.mutateAsync({...scope,operations:[{...f.operation,operationId:'peer-mixed-conflict'}]});return f.tabs.mutateAsync({...scope,...args});
 }});
 await sync.all();assert.equal(gets,1,'mixed intent must not attempt the metadata-only extra read');assert.equal(mutations,1);assert.equal(errors.length,1);assert.equal(errors[0].code,'NAVIGATION_CONFLICT');assert.deepEqual(JSON.parse(saved.values.get(storageKeys.pending)),operations);assert.deepEqual(JSON.parse(saved.values.get(storageKeys.request)),saved.envelope);
});

for(const code of ['NAVIGATION_OPERATION_CONFLICT','TRANSPORT_CLOSED'])test(code+' never triggers fresh-read redirect recovery',async t=>{
 const f=await fixture(t),remote=await f.tabs.getAsync(scope.scope,scope.id),saved=pendingState(f.operation,remote.revision),errors=[];let gets=0,mutations=0;
 const original=Object.assign(Error('Synthetic '+code),{code});
 const sync=createTabSynchronizer({navigation:true,pendingStorage:storageFor(saved.values),scopes:()=>[scope],readLocal:async()=>clone(remote.tabs),apply:async()=>assert.fail('uncertain/colliding request is not confirmed convergence'),onError:error=>errors.push(error),request:async(_scope,method)=>{
  if(method==='get'){gets++;return f.tabs.getAsync(scope.scope,scope.id);}
  mutations++;await f.tabs.mutateAsync({...scope,operations:[{...f.operation,operationId:'peer-matches-but-request-unresolved'}]});throw original;
 }});
 await sync.all();assert.equal(gets,1);assert.equal(mutations,1);assert.equal(errors[0],original);assert.deepEqual(JSON.parse(saved.values.get(storageKeys.pending)),[f.operation]);assert.deepEqual(JSON.parse(saved.values.get(storageKeys.request)),saved.envelope);
});

test('failed fresh proof read rethrows the original navigation conflict with exact pending request intact',async t=>{
 const f=await fixture(t),remote=await f.tabs.getAsync(scope.scope,scope.id),saved=pendingState(f.operation,remote.revision),errors=[];let gets=0,mutations=0,original;
 const sync=createTabSynchronizer({navigation:true,pendingStorage:storageFor(saved.values),scopes:()=>[scope],readLocal:async()=>clone(remote.tabs),apply:async()=>assert.fail('no successful fresh proof exists'),onError:error=>errors.push(error),request:async(_scope,method,args)=>{
  if(method==='get'){if(++gets===2)throw Error('Synthetic fresh read failed');return f.tabs.getAsync(scope.scope,scope.id);}
  mutations++;await f.tabs.mutateAsync({...scope,operations:[{...f.operation,operationId:'peer-before-failed-proof'}]});try{return await f.tabs.mutateAsync({...scope,...args});}catch(error){original=error;throw error;}
 }});
 await sync.all();assert.equal(gets,2);assert.equal(mutations,1);assert.equal(errors[0],original);assert.equal(errors[0].code,'NAVIGATION_CONFLICT');assert.deepEqual(JSON.parse(saved.values.get(storageKeys.pending)),[f.operation]);assert.deepEqual(JSON.parse(saved.values.get(storageKeys.request)),saved.envelope);
});


for(const companion of ['unrelated open','multiple redirects','different profile'])test(companion+' cannot join same-goal recovery',async t=>{
 const f=await fixture(t),remote=await f.tabs.getAsync(scope.scope,scope.id),extra=companion==='multiple redirects'?{...f.operation,operationId:'second-pending-redirect'}:{action:'open',tab:companion==='unrelated open'?{id:'unrelated-browser',type:'browser',url:'',title:'Unrelated'}:{...clone(remote.tabs[0]),profileId:'11111111-1111-4111-8111-111111111111'}},operations=[f.operation,extra],saved=pendingState(operations,remote.revision),errors=[];let gets=0,mutations=0;
 saved.envelope.signature=JSON.stringify({...saved.args,operations:[f.operation]});saved.values.set(storageKeys.request,JSON.stringify(saved.envelope));
 const sync=createTabSynchronizer({navigation:true,pendingStorage:storageFor(saved.values),scopes:()=>[scope],readLocal:async()=>clone(remote.tabs),apply:async()=>assert.fail('unrelated companion intent cannot be silently consumed'),onError:error=>errors.push(error),request:async(_scope,method,args)=>{
  if(method==='get'){gets++;return f.tabs.getAsync(scope.scope,scope.id);}
  mutations++;await f.tabs.mutateAsync({...scope,operations:[{...f.operation,operationId:'peer-before-ineligible-companion'}]});return f.tabs.mutateAsync({...scope,...args});
 }});
 await sync.all();assert.equal(gets,companion==='different profile'?2:1,'profile proof uses the fresh canonical profile; unrelated intent is rejected before the extra read');assert.equal(mutations,1);assert.equal(errors[0].code,'NAVIGATION_CONFLICT');assert.deepEqual(JSON.parse(saved.values.get(storageKeys.pending)),operations);assert.deepEqual(JSON.parse(saved.values.get(storageKeys.request)),saved.envelope);
});

test('redirect recovery never replays an already acknowledged metadata prefix',async t=>{
 const f=await fixture(t),remote=await f.tabs.getAsync(scope.scope,scope.id),metadata={action:'open',tab:{...clone(remote.tabs[0]),title:'Committed prefix',customTitle:'Committed prefix'}},operations=[metadata,f.operation,{action:'reorder',ids:['browser']}],saved=pendingState(operations,remote.revision),calls=[],errors=[];let gets=0,local=clone(remote.tabs);
 saved.envelope.signature=JSON.stringify({...saved.args,operations:[metadata]});saved.values.set(storageKeys.request,JSON.stringify(saved.envelope));
 const sync=createTabSynchronizer({navigation:true,pendingStorage:storageFor(saved.values),scopes:()=>[scope],readLocal:async()=>clone(local),apply:async(_scope,tabs)=>{local=clone(tabs);},onError:error=>errors.push(error),request:async(_scope,method,args,envelope)=>{
  if(method==='get'){gets++;return f.tabs.getAsync(scope.scope,scope.id);}
  calls.push({args:clone(args),envelope:clone(envelope)});
  if(calls.length===2)await f.tabs.mutateAsync({...scope,operations:[{...f.operation,operationId:'peer-after-prefix'}]});
  return f.tabs.mutateAsync({...scope,...args});
 }});
 await sync.all();assert.deepEqual(errors,[]);assert.equal(gets,2);assert.deepEqual(calls.map(call=>call.args.operations.map(op=>op.action)),[['open'],['browser-redirect']],'already-satisfied trailing reorder needs no mutation and acknowledged open is never replayed');assert.equal(local[0].customTitle,'Committed prefix');assert.equal(local[0].history.entries[1].title,f.operation.title);assert.equal(saved.values.has(storageKeys.pending),false);
});
