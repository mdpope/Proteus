import test from 'node:test';import assert from 'node:assert/strict';
import {createProjectFollower} from '../public/project-follow.js';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const until=async fn=>{for(let i=0;i<200;i++){if(fn())return;await pause(5);}throw Error('Synthetic controller checkpoint timed out');};
async function scenario(t,phase,human='none'){
 const scope={scope:'project',id:'synthetic-project'},original={tabId:'browser',browser:{url:'https://fixture.invalid/old',entryId:'old'}},passive={tabId:'browser',browser:{url:'https://fixture.invalid/new',entryId:'new'}},remote={...passive,positions:[{path:'root',top:825,left:0,x:0,y:.11358942585708386}]},localHuman={tabId:'human-choice',browser:{url:'https://fixture.invalid/human',entryId:'human'}};
 const entered=deferred(),release=deferred(),updates=[],applied=[],errors=[];let state=structuredClone(original),revision=1,armed=false,held=false;
 async function checkpoint(where){if(armed&&!held&&phase===where){held=true;entered.resolve();await release.promise;}}
 const follower=createProjectFollower({clientId:'synthetic-client',current:()=>scope,read:async()=>{const snapshot=structuredClone(state);await checkpoint('read');return snapshot;},sync:async()=>checkpoint('sync'),apply:async(_scope,value,{current})=>{if(current()){state=structuredClone(value);applied.push(structuredClone(value));}},request:async(_scope,value)=>{if(value.action==='leave')return {ok:true};if(value.action==='join')return {epoch:'synthetic-epoch',revision,state:original};assert.equal(value.action,'update');updates.push(structuredClone(value.state));return {epoch:'synthetic-epoch',revision:++revision,state:value.state};},onError:error=>errors.push(error.message)});
 t.after(()=>{release.resolve();follower.dispose();});follower.changed(true);await until(()=>applied.length===1);await pause(5);assert.equal(updates.length,0);
 if(human==='noop'){follower.human();follower.changed(true);await pause(100);}
 state=structuredClone(human==='before'?localHuman:passive);if(human==='before')follower.human();armed=true;follower.changed(true);await entered.promise;
 revision=2;await follower.receive(scope,{epoch:'synthetic-epoch',revision:2,state:remote});
 if(human==='after'){state=structuredClone(localHuman);follower.human();follower.changed(true);}
 release.resolve();await until(()=>updates.length>0||applied.some(value=>value.positions));await pause(20);
 console.log(JSON.stringify({syntheticOnly:true,phase,human,updates,applied,state,revision,errors}));assert.deepEqual(errors,[]);
 if(human==='none'||human==='noop'){assert.deepEqual(state,remote,'pending owner scroll must win over passive client URL/entry reconciliation');assert.equal(updates.length,0,'passive positionless client state must not supersede pending owner presentation');}
 else{assert.deepEqual(state,localHuman,'genuine unpublished human intent must retain precedence');assert.deepEqual(updates.at(-1),localHuman);}
}
for(const phase of ['read','sync'])test('pending owner positions survive passive client '+phase,t=>scenario(t,phase));
for(const phase of ['read','sync'])for(const human of ['before','after'])test('human intent '+human+' pending owner during '+phase,t=>scenario(t,phase,human));
test('continuous human scroll publishes through a400ms navigation barrier without descriptor churn',async t=>{
 const scope={scope:'project',id:'synthetic-delayed'},initial={tabId:'browser',browser:{url:'https://fixture.invalid/old',entryId:'old'}},next={tabId:'browser',browser:{url:'https://fixture.invalid/new',entryId:'new'}},sent=[],errors=[];let state=structuredClone(initial),syncs=0,revision=1,timer,sequence=0;
 const follower=createProjectFollower({current:()=>scope,read:async()=>structuredClone(state),apply:async(_scope,value,{current})=>{if(current())state=structuredClone(value);},sync:async()=>{syncs++;await pause(400);},request:async(_scope,value)=>{if(value.action==='leave')return {ok:true};if(value.action==='join')return {epoch:'synthetic-delay',revision,state:initial};sent.push({at:Date.now(),state:structuredClone(value.state)});return {epoch:'synthetic-delay',revision:++revision,state:value.state};},onError:error=>errors.push(error.message)});
 t.after(()=>{clearInterval(timer);follower.dispose();});follower.changed(true);await pause(480);syncs=0;state=structuredClone(next);follower.human();follower.changed(true);
 timer=setInterval(()=>{state={...next,positions:[{path:'root',top:++sequence,left:0,x:0,y:sequence/1000}]};follower.human();follower.changed();},40);
 await pause(2400);const during={updates:sent.length,syncs,last:sent.at(-1)?.state};clearInterval(timer);await pause(350);
 console.log(JSON.stringify({syntheticOnly:true,continuous400ms:during,finalUpdates:sent.length,errors}));assert.deepEqual(errors,[]);assert.ok(during.updates>=3,'continuous scrolling must publish while input is still arriving');assert.ok(during.syncs<=2,'same-identity scrolls must not repeatedly hydrate descriptors');assert.ok(during.last?.positions?.[0]?.top>0,'published state contains a fresh scroll');assert.ok(sent.slice(1).every((row,index)=>row.at-sent[index].at>=240),'coalesced sends preserve the presentation rate budget');
});
test('a changed browser entry during delayed hydration requires another barrier before publication',async t=>{
 const scope={scope:'project',id:'synthetic-identity'},one={tabId:'browser',childTabId:'child',page:'chats',browser:{url:'https://fixture.invalid/page',entryId:'one'}},two={...one,browser:{...one.browser,entryId:'two'}},three={...one,browser:{...one.browser,entryId:'three'}},first=deferred(),releaseFirst=deferred(),second=deferred(),releaseSecond=deferred(),updates=[];let state=one,armed=false,syncs=0,revision=1;
 const follower=createProjectFollower({current:()=>scope,read:async()=>structuredClone(state),apply:async(_scope,value,{current})=>{if(current())state=value;},sync:async()=>{if(!armed)return;if(++syncs===1){first.resolve();await releaseFirst.promise;}else if(syncs===2){second.resolve();await releaseSecond.promise;}},request:async(_scope,value)=>{if(value.action==='leave')return {ok:true};if(value.action==='join')return {epoch:'identity',revision,state:one};updates.push(value.state);return {epoch:'identity',revision:++revision,state:value.state};}});
 t.after(()=>{releaseFirst.resolve();releaseSecond.resolve();follower.dispose();});follower.changed(true);await pause(100);armed=true;state=two;follower.human();follower.changed(true);await first.promise;state=three;follower.human();follower.changed(true);releaseFirst.resolve();await second.promise;assert.equal(updates.length,0,'new entry cannot use the old entry hydration barrier');releaseSecond.resolve();await until(()=>updates.length>0);assert.deepEqual(updates.at(-1),three);assert.equal(syncs,2);
});

for(const phase of ['read','sync'])test('no-op human input settles before later passive '+phase,t=>scenario(t,phase,'noop'));

for(const phase of ['read','sync'])for(const changed of ['url','entry','tab','child','page'])test('explicit '+changed+' input survives pending remote '+phase,async t=>{
 const scope={scope:'project',id:'native-navigation'},original={tabId:'browser',childTabId:'first-child',page:'chats',browser:{url:'https://fixture.invalid/one',entryId:'one'}},next=structuredClone(original),remote={...original,positions:[{path:'root',top:825,left:0,x:0,y:.1}]};
 if(changed==='url')next.browser={url:'https://fixture.invalid/two',entryId:'two'};if(changed==='entry')next.browser.entryId='two';if(changed==='tab')next.tabId='second-tab';if(changed==='child')next.childTabId='second-child';if(changed==='page')next.page='tabs';
 const entered=deferred(),release=deferred(),updates=[];let state=original,armed=false,held=false,revision=1;
 const checkpoint=async where=>{if(armed&&!held&&where===phase){held=true;entered.resolve();await release.promise;}};
 const follower=createProjectFollower({current:()=>scope,read:async()=>{const snapshot=structuredClone(state);await checkpoint('read');return snapshot;},sync:async()=>checkpoint('sync'),apply:async(_scope,value,{current})=>{if(current())state=structuredClone(value);},request:async(_scope,value)=>{if(value.action==='leave')return {ok:true};if(value.action==='join')return {epoch:'native-navigation',revision,state:original};updates.push(value.state);return {epoch:'native-navigation',revision:++revision,state:value.state};}});
 t.after(()=>{release.resolve();follower.dispose();});follower.changed(true);await pause(100);state=next;follower.human();armed=true;follower.changed(true);await entered.promise;revision=2;await follower.receive(scope,{epoch:'native-navigation',revision:2,state:remote});release.resolve();await until(()=>updates.length>0);assert.deepEqual(state,next,'an explicit native or shell input retains navigation authority');assert.deepEqual(updates.at(-1),next);
});
