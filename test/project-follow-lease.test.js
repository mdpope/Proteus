import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectFollower,acceptsProjectPresentation} from '../public/features/workspaces/project-follow.js';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const until=async condition=>{for(let i=0;i<200;i++){if(condition())return;await pause(5);}throw Error('Follow lease checkpoint timed out');};

for(const kind of ['ignored-local','empty-remote'])test(kind+' lease renewal cannot hydrate descriptors or delay scrolling',async t=>{
 t.mock.timers.enable({apis:['setInterval']});
 const scope={scope:'project',id:'synthetic-lease',...(kind==='empty-remote'?{hostId:'synthetic-owner'}:{})};
 const state={tabId:'browser',browser:{url:'https://fixture.invalid/page',entryId:'entry'},positions:[{path:'root',top:100,left:0,x:0,y:.1}]};
 let joins=0,syncs=0,reads=0,updates=0;
 const follower=createProjectFollower({clientId:'lease-fixture',current:()=>scope,acceptPresentation:acceptsProjectPresentation,read:async()=>{reads++;return state;},sync:async()=>{syncs++;},apply:async()=>{},request:async(_scope,value)=>{
  if(value.action==='leave')return {ok:true};
  if(value.action==='join'){joins++;return {epoch:'lease',revision:1,actor:kind==='ignored-local'?'local:lease-fixture':'remote:owner',state:kind==='ignored-local'?state:null};}
  updates++;return {epoch:'lease',revision:2,state:value.state};
 }});
 t.after(()=>follower.dispose());
 follower.changed(true);await until(()=>reads>0);await pause(20);syncs=0;
 const initialUpdates=updates;
 assert.equal(initialUpdates,kind==='empty-remote'?1:0,'Only an initially empty remote scope is seeded.');
 t.mock.timers.tick(15000);await until(()=>joins===2);await pause(350);
 assert.equal(syncs,0,'A renewal with no applicable presentation cannot start descriptor I/O.');
 assert.equal(updates,initialUpdates,'Lease renewal does not create human presentation authority.');
 follower.human();state.positions[0].top=200;state.positions[0].y=.2;follower.changed(true);
 await until(()=>updates===initialUpdates+1);assert.equal(syncs,0,'Same-entry scrolling retains its hydrated identity.');
});

test('an applicable remote lease presentation still hydrates changed navigation before applying',async t=>{
 t.mock.timers.enable({apis:['setInterval']});
 const scope={scope:'project',id:'synthetic-remote-lease',hostId:'owner'};
 const original={tabId:'browser',browser:{url:'https://fixture.invalid/one',entryId:'one'}};
 const next={tabId:'browser',browser:{url:'https://fixture.invalid/two',entryId:'two'}};
 let joins=0,syncs=0,state=original;const order=[];
 const follower=createProjectFollower({current:()=>scope,acceptPresentation:acceptsProjectPresentation,read:async()=>state,sync:async()=>{syncs++;order.push('sync');},apply:async(_scope,value,{current})=>{if(current()){state=value;order.push('apply');}},request:async(_scope,value)=>value.action==='leave'?{ok:true}:{epoch:'remote-lease',revision:++joins,actor:'owner',state:joins===1?original:next}});
 t.after(()=>follower.dispose());follower.changed(true);await until(()=>state===original&&order.includes('apply'));await pause(20);syncs=0;order.length=0;
 t.mock.timers.tick(15000);await until(()=>state===next);
 assert.equal(syncs,1);assert.deepEqual(order,['sync','apply']);
});
