import test from 'node:test';
import assert from 'node:assert/strict';
import {createWindowRestore,RestoreStepError,step,withDeadline,failedChildInfo,mergeOpenedTabs} from '../public/features/workspaces/window-restore.js';

const immediate=()=>Promise.resolve();
const fail=stage=>{throw new RestoreStepError(stage,new Error('injected'));};
test('an attempt that succeeds stops without reporting a failure',async()=>{
 const reports=[];let calls=0;const restore=createWindowRestore({attempt:async()=>{calls++;},report:row=>reports.push(row),wait:immediate});
 await restore.start();assert.equal(calls,1);assert.equal(restore.ready(),true);assert.deepEqual(reports,[]);
});
test('a failed startup step retries, and reports fixed stages only, until it recovers',async()=>{
 const reports=[],changes=[];let calls=0;
 const restore=createWindowRestore({attempt:async()=>{if(++calls<3)fail('state');},report:row=>reports.push(row),onChange:row=>changes.push(row.status),wait:immediate});
 await restore.start();
 assert.equal(calls,3);assert.equal(restore.ready(),true);assert.deepEqual(changes,['retrying','retrying','restored']);
 assert.deepEqual(reports,[{outcome:'failed',stage:'state',attempts:1},{outcome:'failed',stage:'state',attempts:2},{outcome:'recovered',attempts:3}]);
});
test('after the bounded delays the window stays explicitly failed until the human retries',async()=>{
 let broken=true,calls=0;const delays=[];
 const restore=createWindowRestore({delays:[1,2],attempt:async()=>{calls++;if(broken)fail('session');},wait:ms=>{delays.push(ms);return Promise.resolve();}});
 await restore.start();
 assert.equal(calls,3);assert.deepEqual(delays,[1,2]);assert.deepEqual(restore.status(),{status:'failed',stage:'session',attempts:3});assert.equal(restore.ready(),false);
 broken=false;await restore.retry();assert.equal(restore.ready(),true);assert.equal(calls,4);
 await restore.retry();assert.equal(calls,4,'a restored window never restores twice');
});
test('concurrent starts share one attempt',async()=>{
 let calls=0,release;const gate=new Promise(resolve=>{release=resolve;});
 const restore=createWindowRestore({attempt:async()=>{calls++;await gate;},wait:immediate});
 const first=restore.start(),second=restore.start();release();await Promise.all([first,second]);assert.equal(calls,1);
});
test('a human retry supersedes a pending backoff; the old loop cannot run another attempt',async()=>{
 let calls=0,resume;const restore=createWindowRestore({delays:[1],attempt:async()=>{calls++;if(calls===1)fail('state');},wait:()=>new Promise(resolve=>{resume=resolve;})});
 const original=restore.start();await new Promise(resolve=>setImmediate(resolve));assert.equal(restore.status().status,'retrying');
 await restore.retry();assert.equal(calls,2);assert.equal(restore.ready(),true);resume();await original;assert.equal(calls,2);
});
test('a hanging step ends at its deadline with its stage, and a real result still wins',async()=>{
 await assert.rejects(step('inventory',()=>new Promise(()=>{}),5),error=>error instanceof RestoreStepError&&error.stage==='inventory');
 assert.equal(await withDeadline(Promise.resolve('value'),1000,'state'),'value');
 await assert.rejects(step('child',()=>{throw new Error('create failed');}),error=>error.stage==='child'&&error.message==='create failed');
});
test('a retained child keeps every saved field needed to persist it unchanged',()=>{
 const info=failedChildInfo({id:'saved-id',url:'https://example.test/a',label:'Title',history:{entries:[{id:'e',url:'https://example.test/a',title:'Title'}],index:0,currentEntryId:'e',revision:4},profileId:'profile',parentId:'project:p',hidden:true,persist:true,associationChatId:'chat',openedAt:'2026-11-03T00:00:00.000Z'});
 assert.equal(info.id,'saved-id');assert.equal(info.url,'https://example.test/a');assert.equal(info.history.revision,4);assert.equal(info.profileId,'profile');assert.equal(info.hidden,true);assert.equal(info.persist,true);assert.equal(info.loaded,false);assert.equal(info.associationChatId,'chat');
});
test('tabs opened while a window was not ready merge without duplicating saved identities',()=>{
 const saved=[{id:'overview',type:'overview'},{id:'workspace:general',type:'workspace'},{id:'workspace:general:chat:1',type:'run',parentId:'workspace:general'}];
 const current=[{id:'overview',type:'overview'},{id:'workspace:general',type:'workspace',interim:true},{id:'other',type:'run'}];
 assert.deepEqual(mergeOpenedTabs(saved,current).map(tab=>tab.id),['overview','workspace:general','workspace:general:chat:1','other']);
 assert.equal(mergeOpenedTabs(saved,current)[1].interim,undefined,'the saved view is authoritative for a shared identity');
});
