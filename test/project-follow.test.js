import test from 'node:test';
import assert from 'node:assert/strict';
import {ProjectFollow,normalizeFollowState} from '../src/project-follow.js';
import {createProjectFollower} from '../public/project-follow.js';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const deferred=()=>{let complete;const gate={done:false,promise:new Promise(resolve=>{complete=resolve;})};gate.resolve=value=>{gate.done=true;complete(value);};return gate;};
const waitFor=async condition=>{for(let index=0;index<200;index++){if(condition())return;await pause(10);}throw Error('Timed out waiting for controller checkpoint.');};
test('presentation state is scoped, leased, ordered and excludes page secrets',()=>{
 let now=1;const events=[];const follow=new ProjectFollow({now:()=>now,validate:value=>{if(value.id!=='a'&&value.id!=='b')throw Error('Unknown project');},tabs:()=>[{id:'browser',type:'browser'},{id:'chat:c',type:'chat',chatId:'c'}],changed:value=>events.push(value)});
 const a={scope:'project',id:'a',clientId:'one'},b={...a,id:'b',clientId:'two'};
 follow.handle({...a,action:'join'},'host-one');follow.handle({...b,action:'join'},'host-two');
 const value=follow.handle({...a,action:'update',sequence:1,state:{tabId:'browser',cookies:'secret',text:'private',positions:[{path:'root',top:200,left:0,x:0,y:.5}]}},'host-one');
 assert.equal(value.revision,1);assert.equal(value.state.cookies,undefined);assert.equal(value.state.text,undefined);assert.equal(follow.subscribed('host-two',a),false);
 assert.equal(follow.handle({...a,action:'update',sequence:1,state:{tabId:null}},'host-one').state.tabId,'browser');
 assert.throws(()=>follow.handle({...a,action:'update',sequence:2,state:{tabId:'absent'}},'host-one'),/belongs/);
 assert.throws(()=>follow.handle({...a,action:'update',sequence:2,state:{tabId:null}},'different-actor'),/Join/);
 now+=46000;assert.equal(follow.subscribed('host-one',a),false);assert.throws(()=>follow.handle({...a,action:'update',sequence:2,state:{tabId:null}},'host-one'),/Join/);
 assert.equal(events.length,1);
 follow.handle({...a,action:'join'},'host-one');follow.handle({...a,id:'b',action:'join'},'host-one');follow.handle({...a,action:'leave'},'host-one');assert.equal(follow.subscribed('host-one',{...a,id:'b'}),true,'late leave cannot erase a newer scope lease');
 assert.throws(()=>normalizeFollowState({tabId:null,positions:[{path:'body script',top:0,left:0,x:0,y:0}]}),/target/);
 assert.throws(()=>normalizeFollowState({tabId:null,terminal:{line:-1,follow:true}}),/terminal/);
});
test('clients follow the selected scope, catch up on entry and keep inactive clients idle',async t=>{
 const clients=[];const store=new ProjectFollow({validate:()=>{},tabs:()=>[{id:'one',type:'browser'},{id:'two',type:'browser'}],changed:value=>{for(const client of clients)void client.follower.receive(value,value);}});
 function make(id){const client={scope:{scope:'project',id:'project'},state:{tabId:'one'},calls:0,applies:0};client.follower=createProjectFollower({clientId:id,current:()=>client.scope,read:async()=>client.state,apply:async(_scope,state)=>{client.state=structuredClone(state);client.applies++;},request:async(_scope,value)=>{client.calls++;return store.handle(value,id);},sync:async()=>{}});clients.push(client);t.after(()=>client.follower.dispose());return client;}
 const a=make('a'),b=make('b');a.follower.changed();await pause(150);b.follower.changed();await pause(150);
 a.state={tabId:'two',positions:[{path:'root',top:400,left:0,x:0,y:.7}]};a.follower.human();a.follower.changed();await pause(250);assert.deepEqual(b.state,a.state);
 b.scope={scope:'project',id:'other'};b.state={tabId:'one'};b.follower.changed();await pause(150);const calls=b.calls;
 a.state={tabId:'one'};a.follower.human();a.follower.changed();await pause(200);assert.equal(b.calls,calls);
 b.scope={scope:'project',id:'project'};b.follower.changed();await pause(200);assert.deepEqual(b.state,a.state);
 b.state={tabId:'two'};b.follower.human();b.follower.changed();await pause(200);assert.deepEqual(a.state,b.state);
});
test('a newer follow event arriving during asynchronous application is not lost',async t=>{
 let state={tabId:'one'},release,applied=0;
 const scope={scope:'project',id:'p'};
 const follower=createProjectFollower({clientId:'race',current:()=>scope,read:async()=>state,sync:async()=>{},request:async(_scope,value)=>({epoch:'epoch',revision:value.action==='join'?1:0,state:{tabId:'one'}}),apply:async(_scope,value)=>{if(value.tabId==='two')await new Promise(resolve=>release=resolve);state=value;applied++;}});
 t.after(()=>follower.dispose());follower.changed();await pause(120);
 await follower.receive(scope,{epoch:'epoch',revision:2,state:{tabId:'two'}});await pause(100);
 assert.equal(typeof release,'function');await follower.receive(scope,{epoch:'epoch',revision:3,state:{tabId:'three'}});release();await waitFor(()=>state.tabId==='three');
 assert.equal(state.tabId,'three');assert.equal(applied,3);
});
test('disposal during initial descriptor hydration cannot recreate a lease or apply a snapshot',async t=>{
 const scope={scope:'project',id:'a'},entered=deferred(),finish=deferred(),applied=[],calls=[];let leaseCount=0;
 const originalInterval=globalThis.setInterval;
 t.mock.method(globalThis,'setInterval',(...args)=>{leaseCount++;return originalInterval(...args);});
 const follower=createProjectFollower({current:()=>scope,read:async()=>({tabId:'local'}),apply:async(_scope,value)=>applied.push(value),request:async(_scope,value)=>{calls.push(value.action);return {epoch:'epoch',revision:1,state:{tabId:'remote'}};},sync:async()=>{entered.resolve();await finish.promise;}});
 t.after(()=>follower.dispose());follower.changed();await waitFor(()=>entered.done);follower.dispose();finish.resolve();await pause(30);
 assert.deepEqual(applied,[]);assert.deepEqual(calls,['join','leave']);assert.equal(leaseCount,0,'a disposed controller must not install a late lease timer');
});
test('switching projects during descriptor hydration rejects the earlier scope snapshot',async t=>{
 const a={scope:'project',id:'a'},b={scope:'project',id:'b'},entered=deferred(),finish=deferred(),applied=[];let current=a,held=false;
 const follower=createProjectFollower({current:()=>current,read:async scope=>({tabId:'local-'+scope.id}),apply:async(scope,value)=>applied.push({scope:scope.id,tab:value.tabId}),request:async(scope,value)=>({epoch:'epoch',revision:value.action==='join'?1:2,state:{tabId:'remote-'+scope.id}}),sync:async scope=>{if(scope.id==='a'&&!held){held=true;entered.resolve();await finish.promise;}}});
 t.after(()=>follower.dispose());follower.changed();await waitFor(()=>entered.done);current=b;follower.changed();finish.resolve();await waitFor(()=>applied.some(row=>row.scope==='b'));
 assert.deepEqual(applied,[{scope:'b',tab:'remote-b'}],'late join responses cannot apply to an inactive project');
});
test('disposal while reading an update cannot issue a new request or null-scope synchronization',async t=>{
 const scope={scope:'project',id:'a'},entered=deferred(),finish=deferred(),calls=[],syncScopes=[],errors=[];let block=false,state={tabId:'one'};
 const follower=createProjectFollower({current:()=>scope,read:async()=>{if(block){entered.resolve();await finish.promise;}return state;},apply:async(_scope,value)=>{state=value;},request:async(_scope,value)=>{calls.push(value.action);return {epoch:'epoch',revision:1,state:{tabId:'one'}};},sync:async value=>syncScopes.push(value?.id||null),onError:error=>errors.push(error.message)});
 t.after(()=>follower.dispose());follower.changed();await waitFor(()=>calls.includes('join'));await pause(30);block=true;state={tabId:'two'};follower.changed();await waitFor(()=>entered.done);follower.dispose();const count=calls.length;finish.resolve();await pause(30);
 assert.equal(calls.length,count,'dispose prevents another update request after the awaited read');assert.ok(!syncScopes.includes(null));assert.deepEqual(errors,[]);
});
test('a late failed request from a disconnected session cannot erase a reconnect request',async t=>{
 const scope={hostId:'peer',scope:'project',id:'a'},entered=deferred(),finish=deferred(),errors=[];let joins=0,applied=0;
 const follower=createProjectFollower({current:()=>scope,read:async()=>({tabId:'one'}),apply:async()=>{applied++;},sync:async()=>{},request:async(_scope,value)=>{if(value.action==='join'&&++joins===1){entered.resolve();await finish.promise;throw Error('Synthetic old-session disconnect');}return {epoch:'new-session',revision:1,state:{tabId:'one'}};},onError:error=>errors.push(error.message)});
 t.after(()=>follower.dispose());follower.changed();await waitFor(()=>entered.done);follower.reconnect('peer');finish.resolve();await waitFor(()=>joins>=2);
 assert.equal(applied,1);assert.deepEqual(errors,[],'obsolete session errors are suppressed after reconnect');
});
test('a reconnect during navigation synchronization rejoins before sending presentation updates',async t=>{
 const scope={hostId:'peer',scope:'project',id:'a'},entered=deferred(),finish=deferred(),calls=[];let state={tabId:'one'},hold=false,joins=0;
 const follower=createProjectFollower({current:()=>scope,read:async()=>state,apply:async(_scope,value)=>{state=value;},request:async(_scope,value)=>{calls.push(value.action);if(value.action==='join')joins++;return {epoch:'session-'+joins,revision:1,state};},sync:async()=>{if(hold){hold=false;entered.resolve();await finish.promise;}}});
 t.after(()=>follower.dispose());follower.changed();await waitFor(()=>joins===1);await pause(30);
 hold=true;state={tabId:'two'};follower.human();follower.changed(true);await waitFor(()=>entered.done);
 const checkpoint=calls.length;follower.reconnect('peer');finish.resolve();await waitFor(()=>joins===2);
 assert.equal(calls[checkpoint],'join','a navigation read from the old session cannot publish before its replacement lease joins');
});
test('a human tab selection during asynchronous remote application keeps the newer local selection',async t=>{
 const scope={scope:'project',id:'a'},entered=deferred(),finish=deferred(),updates=[];let state={tabId:'one'},joined=false;
 const follower=createProjectFollower({current:()=>scope,read:async()=>state,sync:async()=>{},request:async(_scope,value)=>{if(value.action==='join')joined=true;if(value.action==='update')updates.push(value.state);return {epoch:'epoch',revision:value.action==='join'?1:3,state:{tabId:'one'}};},apply:async(_scope,value,{current})=>{if(value.tabId==='two'){entered.resolve();await finish.promise;}if(current())state=value;}});
 t.after(()=>follower.dispose());follower.changed();await waitFor(()=>joined);await pause(30);
 void follower.receive(scope,{epoch:'epoch',revision:2,state:{tabId:'two'}});await waitFor(()=>entered.done);
 state={tabId:'three'};follower.human();follower.changed(true);finish.resolve();await waitFor(()=>updates.length>0);
 assert.equal(state.tabId,'three');assert.equal(updates.at(-1).tabId,'three','the human selection is published after the obsolete application finishes');
});
test('a human tab selection during remote descriptor synchronization supersedes the pending snapshot',async t=>{
 const scope={scope:'project',id:'a'},entered=deferred(),finish=deferred(),updates=[];let state={tabId:'one'},joined=false,hold=false;
 const follower=createProjectFollower({current:()=>scope,read:async()=>state,sync:async()=>{if(hold){hold=false;entered.resolve();await finish.promise;}},request:async(_scope,value)=>{if(value.action==='join')joined=true;if(value.action==='update')updates.push(value.state);return {epoch:'epoch',revision:value.action==='join'?1:3,state:{tabId:'one'}};},apply:async(_scope,value)=>{state=value;}});
 t.after(()=>follower.dispose());follower.changed();await waitFor(()=>joined);await pause(30);
 hold=true;void follower.receive(scope,{epoch:'epoch',revision:2,state:{tabId:'two'}});await waitFor(()=>entered.done);
 state={tabId:'three'};follower.human();follower.changed(true);finish.resolve();await waitFor(()=>updates.length>0);
 assert.equal(state.tabId,'three');assert.equal(updates.at(-1).tabId,'three','a descriptor response cannot replace a newer local tab choice');
});
test('scroll changes arriving during delayed requests retain the presentation rate budget',async t=>{
 const scope={hostId:'peer',scope:'project',id:'a'},sent=[];let state={tabId:'one'},joined=false,sequence=0,timer;
 const follower=createProjectFollower({current:()=>scope,read:async()=>state,apply:async(_scope,value)=>{state=value;},sync:async()=>{},request:async(_scope,value)=>{if(value.action==='join'){joined=true;return {epoch:'epoch',revision:0,state};}if(value.action==='update'){sent.push(Date.now());await pause(90);}return {epoch:'epoch',revision:sent.length,state};}});
 t.after(()=>{clearInterval(timer);follower.dispose();});follower.changed();await waitFor(()=>joined);await pause(30);
 timer=setInterval(()=>{state={tabId:'one',positions:[{path:'root',top:++sequence,left:0,x:0,y:sequence/1000}]};follower.human();follower.changed();},40);
 await pause(1800);clearInterval(timer);await pause(400);
 assert.ok(sent.length>=3&&sent.length<=7,'continuous scrolling stays coalesced despite request latency: '+sent.length);
 const gaps=sent.slice(1).map((time,index)=>time-sent[index]);assert.ok(gaps.every(gap=>gap>=240),'dirty follow-up requests must honor the250ms budget: '+JSON.stringify(gaps));
});
