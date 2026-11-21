import test from 'node:test';
import assert from 'node:assert/strict';
import {createTabSynchronizer} from '../public/models/content-tab-sync.js';
const scope={scope:'project',id:'synthetic-project'};
const tab=id=>({id:'browser:'+id,type:'browser',title:id,url:'https://example.test/'+id,history:{entries:[{id:'entry-'+id,url:'https://example.test/'+id,title:id}],index:0,currentEntryId:'entry-'+id,revision:1,total:1}});

test('navigation review does not freeze owner tab closure or later membership and order',async()=>{
 let local=[tab('one')],remote={revision:1,tabs:structuredClone(local)},mutations=0;const errors=[];
 const sync=createTabSynchronizer({scopes:()=>[scope],readLocal:async()=>structuredClone(local),apply:async(_scope,tabs)=>{local=structuredClone(tabs);},onError:error=>errors.push(error),request:async(_scope,action)=>{
  if(action==='get')return structuredClone(remote);mutations++;throw Object.assign(Error('Synthetic conflicting navigation'),{code:'NAVIGATION_CONFLICT'});
 }});
 await sync.sync(scope);local[0].title='Pending change';await sync.sync(scope);assert.equal(sync.hasConflict(scope),true);assert.equal(errors.length,1);
 remote={revision:2,tabs:[]};await sync.sync(scope);assert.equal(local.length,0,'owner Close still removes the shared tab during navigation review');
 remote={revision:3,tabs:[tab('new-second'),tab('new-first')]};await sync.sync(scope);assert.deepEqual(local.map(value=>value.title),['new-second','new-first']);
 assert.equal(mutations,1,'the quarantined navigation is not replayed');assert.equal(sync.hasConflict(scope),true,'review intent remains explicit');
});

test('owner membership removals apply before an unrelated history hydration failure',async()=>{
 let local=[tab('closed'),tab('long-history')],remote={revision:1,tabs:structuredClone(local)};const errors=[];
 const sync=createTabSynchronizer({navigation:true,scopes:()=>[scope],readLocal:async()=>structuredClone(local),apply:async(_scope,tabs,_captured,options={})=>{
  if(options.membershipOnly)local=local.filter(value=>!options.removedIds.includes(value.id));else local=structuredClone(tabs);
 },onError:error=>errors.push(error),request:async(_scope,action)=>{if(action==='get')return structuredClone(remote);throw Error('Synthetic history changed during hydration');}});
 await sync.sync(scope);
 const long=tab('long-history');long.history={...long.history,revision:2,total:2,hasMore:true};remote={revision:2,tabs:[long]};
 await sync.sync(scope);assert.deepEqual(local.map(value=>value.id),['browser:long-history']);assert.equal(local[0].history.revision,1,'existing full history stays intact');assert.match(errors[0].message,/history changed/);
});

test('a quarantined browser action does not discard or hide a new unrelated local tab',async()=>{
 let local=[tab('one')],remote={revision:1,tabs:structuredClone(local)},conflict=false;
 const store=new Map(),storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
 const sync=createTabSynchronizer({pendingStorage:storage,scopes:()=>[scope],readLocal:async()=>structuredClone(local),apply:async(_scope,tabs,_captured,options={})=>{local=options.membershipOnly?local.filter(tab=>!options.removedIds.includes(tab.id)):structuredClone(tabs);},request:async(_scope,action,args)=>{
  if(action==='get')return structuredClone(remote);
  if(!conflict){conflict=true;throw Object.assign(Error('Synthetic conflict'),{code:'NAVIGATION_CONFLICT'});}
  for(const op of args.operations)if(op.action==='open'){const at=remote.tabs.findIndex(tab=>tab.id===op.tab.id);if(at<0)remote.tabs.push(op.tab);else remote.tabs[at]=op.tab;}
  remote.revision++;return structuredClone(remote);
 }});
 await sync.sync(scope);local[0].title='Changed';await sync.sync(scope);assert.equal(sync.hasConflict(scope),true);
 local.push({...tab('new'),navigationPending:true});await sync.sync(scope);
 assert.ok(remote.tabs.some(tab=>tab.id==='browser:new'),'unrelated membership reaches the owner even when its prior revision has not changed');
 assert.ok(local.some(tab=>tab.id==='browser:new'),'new local intent is not removed by conflict hydration');
});

test('a browser conflict leaves new chat setup descriptors in the same batch eligible to synchronize',async()=>{
 const original=tab('one'),draft={id:'setup',type:'browser',title:'New chat',url:'',setup:{kind:'chat'},navigationPending:true};
 const next={id:'entry-next',url:'https://example.test/next',title:'Next'};
 let local=[original],remote={revision:1,tabs:[original]},navigationAttempts=0;
 const store=new Map(),storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
 const sync=createTabSynchronizer({navigation:true,explicitCloseOnly:true,pendingStorage:storage,scopes:()=>[scope],scopeLabel:()=> 'the Social project',
  readLocal:async()=>structuredClone(local),apply:async(_scope,tabs)=>{local=structuredClone(tabs);},request:async(_scope,action,args)=>{
   if(action==='get')return structuredClone(remote);
   if(args.operations.some(op=>op.action.startsWith('browser-'))){navigationAttempts++;throw Object.assign(Error('Owner history changed'),{code:'NAVIGATION_CONFLICT'});}
   const added=args.operations.filter(op=>op.action==='open').map(op=>op.tab);
   assert.deepEqual(added.map(tab=>tab.id),[draft.id]);
   remote={revision:2,tabs:[original,...added]};return structuredClone(remote);
  }});
 await sync.sync(scope);
 local=[{...original,url:next.url,navigationPending:true,history:{...original.history,entries:[...original.history.entries,next],index:1,currentEntryId:next.id,total:2}},draft];
 await sync.sync(scope);
 const requestKey=[...store.keys()].find(key=>key.startsWith('proteus.navigation.request:'));
 const retainedRequest=store.get(requestKey);
 assert.ok(retainedRequest);
 await assert.rejects(sync.settle(),/the Social project.*browser-history notification/);
 assert.equal(navigationAttempts,1);
 assert.equal(store.get(requestKey),retainedRequest);
 assert.equal(remote.tabs[1].setup.kind,'chat');
 assert.equal(local[0].history.currentEntryId,next.id);
 let openCopy;
 const waiting=new Promise(resolve=>{openCopy=resolve;});
 let copies=0;
 const first=sync.resolve(scope,{preserve:async tabs=>{
  copies++;assert.equal(tabs[0].history.currentEntryId,next.id);await waiting;
 }});
 const second=sync.resolve(scope,{preserve:async()=>{assert.fail('An in-progress copy must be reused');}});
 await sync.sync(scope);
 openCopy();await Promise.all([first,second]);
 assert.equal(copies,1);
 assert.equal(sync.hasConflict(scope),false);
 assert.equal(local[1].setup.kind,'chat');
});
