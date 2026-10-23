import test from 'node:test';
import assert from 'node:assert/strict';
import {installPageFind} from '../public/shared/ui/page-find.js';

const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

function fixture(t,{query='needle',native=true,find}={}) {
  const saved=new Map(['document','CSS','Highlight','NodeFilter','MutationObserver','getComputedStyle','setTimeout','clearTimeout'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const input={value:query,focus(){},select(){}},count={textContent:''},buttons=new Map(['[data-prev]','[data-next]','[data-find-close]'].map(key=>[key,{}]));
  const panel={dataset:{},hidden:true,querySelector:key=>key==='input'?input:key==='span'?count:buttons.get(key)};
  const calls=[],stops=[],observers=[],timers=new Map(),highlights=new Map();let timerId=0,target=native?{id:'a',revision:1}:null,scroll=0,reveals=0,text='needle then needle';
  const element={checkVisibility:()=>true,closest:selector=>selector.startsWith('p,li')?element:null,scrollIntoView:()=>{reveals++;},parentElement:null};
  const node={parentElement:element,get textContent(){return text;}};
  const root={querySelector:()=>null};
  globalThis.document={createElement:()=>panel,body:{append(){}},addEventListener(){},querySelector:()=>root,createTreeWalker:()=>{let done=false;return {nextNode:()=>done?null:(done=true,node)};},createRange:()=>({setStart(node,offset){this.startContainer=node;this.startOffset=offset;},setEnd(){}})};
  globalThis.CSS={highlights};globalThis.Highlight=class extends Array{};globalThis.NodeFilter={SHOW_TEXT:4};globalThis.getComputedStyle=()=>({overflowY:'visible'});
  globalThis.MutationObserver=class {constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){}};
  globalThis.setTimeout=(callback,ms)=>{assert.equal(ms,120);const id=++timerId;timers.set(id,callback);return id;};globalThis.clearTimeout=id=>timers.delete(id);
  const api=installPageFind({scope:()=>root,native:()=>{
    if(!target)return null;const captured={...target};
    return {...captured,find:(query,direction)=>{calls.push({...captured,query,direction});scroll=direction?scroll+10:0;return find?find(calls.at(-1)):{activeMatchOrdinal:direction===1?2:1,matches:8};},stop:()=>{stops.push(captured.id);}};
  }});
  t.after(()=>{for(const [key,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  return {...api,input,count,panel,calls,stops,next:()=>buttons.get('[data-next]').onclick(),prev:()=>buttons.get('[data-prev]').onclick(),type:value=>{input.value=value;input.oninput();const queued=[...timers.values()];timers.clear();for(const callback of queued)callback();},setTarget:value=>{target=value;},setText:value=>{text=value;},manualScroll:value=>{scroll=value;},get scroll(){return scroll;},get reveals(){return reveals;},mutate:()=>{observers.at(-1).callback();const queued=[...timers.values()];timers.clear();for(const callback of queued)callback();}};
}

test('unrelated native mutations preserve manual scroll and a later match without more find/stop calls',async t=>{
  const f=fixture(t);f.open();await settle();f.next();await settle();assert.equal(f.count.textContent,'2 of 8');
  f.manualScroll(9000);for(let i=0;i<4;i++){f.mutate();f.refresh();await settle();}
  assert.equal(f.calls.length,2);assert.deepEqual(f.stops,[]);assert.equal(f.scroll,9000);assert.equal(f.count.textContent,'2 of 8');
});
test('passive updates during a native request do not invalidate its eventual count',async t=>{
  const pending=deferred(),f=fixture(t,{find:()=>pending.promise});f.open();f.mutate();f.refresh();
  pending.resolve({activeMatchOrdinal:3,matches:12});await settle();assert.equal(f.calls.length,1);assert.equal(f.count.textContent,'3 of 12');
});
test('explicit input and Next/Previous remain searches; clearing runs stop once per explicit action',async t=>{
  const f=fixture(t);f.open();await settle();f.next();f.prev();f.type('different');await settle();
  assert.deepEqual(f.calls.map(call=>[call.query,call.direction]),[['needle',0],['needle',1],['needle',-1],['different',0]]);
  f.type('');await settle();assert.deepEqual(f.stops,['a']);for(let i=0;i<3;i++){f.mutate();await settle();}assert.deepEqual(f.stops,['a']);assert.equal(f.count.textContent,'0 of 0');
});
test('new native documents and deliberate document refresh search once, while fresh wrappers do not',async t=>{
  const f=fixture(t);f.open();await settle();f.refresh();await settle();assert.equal(f.calls.length,1);
  f.setTarget({id:'a',revision:2});f.refresh();await settle();assert.equal(f.calls.length,2);
  f.refresh({documentChanged:true});await settle();assert.equal(f.calls.length,3);f.mutate();await settle();assert.equal(f.calls.length,3);
});
test('switching targets and closing stop only the captured target; stale tab replies never paint',async t=>{
  const a=deferred(),b=deferred(),f=fixture(t,{find:call=>call.id==='a'?a.promise:b.promise});f.open();
  f.setTarget({id:'b',revision:1});f.refresh();b.resolve({activeMatchOrdinal:2,matches:5});await settle();a.resolve({activeMatchOrdinal:8,matches:99});await settle();
  assert.equal(f.count.textContent,'2 of 5');assert.deepEqual(f.stops,['a']);
  f.setTarget({id:'c',revision:1});f.close();await settle();assert.deepEqual(f.stops,['a','b']);assert.equal(f.count.textContent,'0 of 0');
});
test('query, document and close changes reject stale native success/error replies, including before passive refresh',async t=>{
  const requests=[],f=fixture(t,{find:()=>{const next=deferred();requests.push(next);return next.promise;}});
  f.open();f.type('new query');requests[1].resolve({activeMatchOrdinal:2,matches:7});await settle();requests[0].reject(Error('stale query'));await settle();assert.equal(f.count.textContent,'2 of 7');
  f.next();f.setTarget({id:'a',revision:2});requests[2].resolve({activeMatchOrdinal:6,matches:70});await settle();assert.equal(f.count.textContent,'0 of 0');
  f.refresh();f.close();requests[3].resolve({activeMatchOrdinal:9,matches:90});await settle();assert.equal(f.count.textContent,'0 of 0');
  f.open();requests[4].resolve({activeMatchOrdinal:1,matches:4});await settle();assert.equal(f.count.textContent,'1 of 4');
});
test('renderer-text mutations refresh counts and retain the selected range without scrolling',async t=>{
  const f=fixture(t,{native:false});f.open();f.next();assert.equal(f.count.textContent,'2 of 2');const before=f.reveals;
  f.setText('needle then needle and needle');f.mutate();await settle();assert.equal(f.count.textContent,'2 of 3');assert.equal(f.reveals,before);
});
