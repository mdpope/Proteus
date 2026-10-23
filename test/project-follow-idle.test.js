import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectFollower} from '../public/project-follow.js';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const until=async condition=>{for(let i=0;i<200;i++){if(condition())return;await pause(5);}throw Error('Follow checkpoint timed out');};

test('passive renderer refresh cannot publish a stale browser selection over a human chat choice',async t=>{
 const scope={scope:'project',id:'synthetic-idle'},browser={tabId:'browser'},chat={tabId:'chat'},updates=[];
 let state=browser,joined=false;
 const follower=createProjectFollower({current:()=>scope,read:async()=>structuredClone(state),sync:async()=>{},apply:async(_scope,value,{current})=>{if(current())state=structuredClone(value);},request:async(_scope,value)=>{if(value.action==='leave')return {ok:true};if(value.action==='join'){joined=true;return {epoch:'idle',revision:1,state:browser};}updates.push(value.state);return {epoch:'idle',revision:3,state:value.state};}});
 t.after(()=>follower.dispose());follower.changed(true);await until(()=>joined);await pause(100);
 await follower.receive(scope,{epoch:'idle',revision:2,state:chat});await until(()=>state.tabId==='chat');await pause(40);
 // A stale remembered child / background refresh is not a new interaction.
 state=browser;follower.changed(true);await pause(200);
 assert.equal(updates.length,0,'idle reconciliation must never take presentation authority');
 state=chat;follower.human();follower.changed(true);await until(()=>updates.length===1);
 assert.deepEqual(updates,[chat]);
});

test('renewing a lease or receiving duplicate snapshots cannot override a local human selection',async t=>{
 const scope={scope:'workspace',id:'synthetic-workspace'},browser={tabId:'browser'},chat={tabId:'chat'},updates=[];
 let state=browser,revision=1,joined=false;
 const follower=createProjectFollower({clientId:'synthetic-local',current:()=>scope,read:async()=>structuredClone(state),sync:async()=>{},apply:async(_scope,value,{current})=>{if(current())state=structuredClone(value);},request:async(_scope,value)=>{if(value.action==='leave')return {ok:true};if(value.action==='join'){joined=true;return {epoch:'lease',revision,state:browser};}updates.push(value.state);return {epoch:'lease',revision:++revision,state:value.state};}});
 t.after(()=>follower.dispose());follower.changed(true);await until(()=>joined);await pause(100);
 state=chat;follower.human();follower.changed(true);await until(()=>updates.length===1);
 for(let i=0;i<4;i++){await follower.receive(scope,{epoch:'lease',revision:1,state:browser});follower.changed(true);await pause(80);}
 assert.deepEqual(state,chat);assert.equal(updates.length,1);
 await follower.receive(scope,{epoch:'lease',revision:revision+1,state:browser});await until(()=>state.tabId==='browser');
});

test('unchanged owner presentations renew leases without new revisions or broadcasts',async()=>{
 const {ProjectFollow}=await import('../src/project-follow.js');let now=1;const events=[];
 const store=new ProjectFollow({validate:()=>{},tabs:()=>[{id:'browser'}],now:()=>now,changed:value=>events.push(value)});
 const scope={scope:'project',id:'synthetic',clientId:'client'};store.handle({...scope,action:'join'},'actor');
 const first=store.handle({...scope,action:'update',sequence:1,state:{tabId:'browser'}},'actor');
 now+=20000;const duplicate=store.handle({...scope,action:'update',sequence:2,state:{tabId:'browser',ignored:'value'}},'actor');
 assert.equal(duplicate.revision,first.revision);assert.equal(events.length,1);
 now+=30000;assert.equal(store.subscribed('actor',scope),true,'an unchanged update still renews its lease');
});

test('an asynchronous human navigation cannot be consumed as no-op input before its native result',async t=>{
 const scope={scope:'project',id:'synthetic-async'},initial={tabId:'browser',browser:{url:'https://fixture.invalid/one',entryId:'one'}},next={tabId:'browser',browser:{url:'https://fixture.invalid/two',entryId:'two'}},updates=[];
 let state=initial,joined=false;
 const follower=createProjectFollower({current:()=>scope,read:async()=>state,sync:async()=>{},apply:async(_scope,value,{current})=>{if(current())state=value;},request:async(_scope,value)=>{if(value.action==='leave')return {ok:true};if(value.action==='join'){joined=true;return {epoch:'async',revision:1,state:initial};}updates.push(value.state);return {epoch:'async',revision:3,state:value.state};}});
 t.after(()=>follower.dispose());follower.changed(true);await until(()=>joined);await pause(100);
 const finish=follower.beginHuman();follower.changed(true);await pause(100);
 await follower.receive(scope,{epoch:'async',revision:2,state:initial});await pause(100);assert.equal(updates.length,0);
 state=next;finish();finish();await until(()=>updates.length===1);
 assert.deepEqual(state,next);assert.deepEqual(updates,[next],'the completed human navigation supersedes a queued older snapshot');
});
