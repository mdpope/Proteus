import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyStatePatch,diffState} from '../src/services/remote/state-patch.js';
import {RemoteStateStream} from '../src/services/remote/state-stream.js';

const vectors=JSON.parse(fs.readFileSync(new URL('./fixtures/state-patch-vectors.json',import.meta.url),'utf8')).vectors;
for(const {name,before,after,patch}of vectors)test('state patch vector: '+name,()=>{
 assert.deepEqual(diffState(before,after)??null,patch);
 if(patch)assert.deepEqual(applyStatePatch(before,patch),after);
});
test('applying a patch neither mutates its input nor copies unchanged subtrees',()=>{
 const before={context:{large:true},runs:[{id:'a',status:'running',detail:{x:1}},{id:'b',status:'done',detail:{y:2}}]},frozen=structuredClone(before);
 const after=applyStatePatch(before,diffState(before,{...before,runs:[{...before.runs[0],status:'done'},before.runs[1]]}));
 assert.deepEqual(before,frozen);assert.equal(after.context,before.context);assert.equal(after.runs[1],before.runs[1]);assert.equal(after.runs[0].detail,before.runs[0].detail);
});
test('a patch that does not fit its baseline throws so the client resynchronizes',()=>{
 assert.throws(()=>applyStatePatch({runs:[{id:'a'}]},{o:{runs:{a:{ids:['missing']}}}}),/baseline/);
 assert.throws(()=>applyStatePatch({runs:'text'},{o:{runs:{a:{ids:[]}}}}),/baseline/);
 assert.throws(()=>applyStatePatch({a:1},{o:{a:{o:{b:{v:1}}}}}),/baseline/);
 assert.throws(()=>applyStatePatch({},JSON.parse('{"o":{"__proto__":{"v":1}}}')),/Invalid/);
 assert.equal(({}).polluted,undefined);
});
test('randomized states converge through a chain of patches',()=>{
 let seed=20261103;const random=limit=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed%limit;};
 const value=depth=>{switch(random(depth>2?4:7)){case 0:return random(5);case 1:return 'text'+random(5);case 2:return null;case 3:return random(2)===0;case 4:return Array.from({length:random(4)},()=>value(depth+1));case 5:return Array.from({length:random(4)},(_,i)=>({id:'i'+i*(1+random(3)),value:value(depth+1)}));default:return Object.fromEntries(Array.from({length:random(4)},()=>['k'+random(5),value(depth+1)]));}};
 const state=()=>Object.fromEntries(Array.from({length:1+random(5)},()=>['s'+random(6),value(0)]));
 let current=state();
 for(let round=0;round<2000;round++){const next=state(),patch=diffState(current,next);assert.deepEqual(patch?applyStatePatch(current,patch):current,next,'round '+round);current=next;}
});

// Same section sizes as the live owner sample: about 1.4 MB, 100 run summaries.
function largeState(){
 const fill=bytes=>'x'.repeat(bytes);
 return {context:{revision:1,blob:fill(560_000)},workspaceProjects:{blob:fill(230_000)},schedules:[{id:'s',blob:fill(36_000)}],attention:[],providerStatus:{blob:fill(25_000)},
  runs:Array.from({length:100},(_,i)=>({id:'run-'+i,title:'Chat '+i,status:i===0?'running':'completed',updatedAt:'2026-11-03T00:00:00.000Z',lastActivityAt:'2026-11-03T00:00:00.000Z',progress:{lastProgressAt:'2026-11-03T00:00:00.000Z',stalled:false},blob:fill(4400)}))};
}
function hostFixture(options={}){
 const clock={at:1_000_000},host={epoch:'epoch',sequence:7,peers:new Map(),sent:[],send(peer,value){const bytes=Buffer.byteLength(JSON.stringify(value));host.sent.push({peer:peer.id,event:value.event,bytes,value});peer.received?.(value);}};
 const add=(id,fields={})=>{const peer={id,device:{id},...fields};host.peers.set(id,peer);return peer;};
 host.stream=new RemoteStateStream(host,{now:()=>clock.at,...options});
 return {host,clock,add,stream:host.stream};
}
const tick=(state,at)=>{const next=structuredClone(state);next.runs[0].progress.lastProgressAt=new Date(Date.UTC(2026,10,3)+at).toISOString();next.runs[0].updatedAt=next.runs[0].progress.lastProgressAt;return next;};

test('progress churn costs a subscribing client kilobytes instead of snapshots, without a mismatch',()=>{
 const {host,clock,add,stream}=hostFixture();let state=largeState();
 const peer=add('patch');const reply=stream.sync(peer,{statePatch:'v1'},state);
 assert.equal(reply.state,state);assert.equal(reply.stateVersion,'epoch:1');
 let client={value:reply.state,version:reply.stateVersion},events=0;
 peer.received=value=>{assert.equal(value.event,'state.patch');assert.equal(value.data.base,client.version);client={value:applyStatePatch(client.value,value.data.patch),version:value.data.version};events++;};
 for(let second=1;second<=113;second++){clock.at+=1000;state=tick(state,second*1000);stream.observe(state);}
 const bytes=host.sent.reduce((sum,row)=>sum+row.bytes,0);
 assert.ok(events>=50&&events<=57,'one patch per two seconds, got '+events);
 assert.ok(bytes<100_000,'113 s of progress churn stays small, got '+bytes);
 // The final trailing progress may still be batched. A forced commit converges exactly.
 const conditional=stream.sync(peer,{statePatch:'v1',ifStateVersion:client.version},state);
 assert.deepEqual(client.value,state);assert.equal(conditional.unchanged,true);assert.equal(conditional.stateVersion,client.version);assert.equal(conditional.state,undefined);
});
test('a material change reaches a subscribing client immediately, inside the batch window',()=>{
 const {host,clock,add,stream}=hostFixture();let state=largeState();
 const peer=add('patch');stream.sync(peer,{statePatch:'v1'},state);
 clock.at+=100;state=tick(state,1);stream.observe(state);assert.equal(host.sent.length,0,'volatile-only change waits');
 clock.at+=100;state=structuredClone(state);state.runs[1].status='failed';stream.observe(state);
 assert.equal(host.sent.length,1);assert.equal(host.sent[0].event,'state.patch');assert.ok(host.sent[0].bytes<2000);
});
test('a client that has not opted in keeps whole snapshots, at a batched cadence',()=>{
 const {host,clock,add,stream}=hostFixture();let state=largeState();add('legacy');
 stream.observe(state);assert.deepEqual(host.sent.map(row=>row.event),['state']);assert.equal(host.sent[0].value.data,state);
 for(let second=1;second<=9;second++){clock.at+=1000;state=tick(state,second*1000);stream.observe(state);}
 assert.equal(host.sent.length,1,'volatile changes wait ten seconds');
 clock.at+=1000;state=tick(state,10_000);stream.observe(state);assert.equal(host.sent.length,2);
 clock.at+=1000;state=structuredClone(state);state.runs[1].status='failed';stream.observe(state);
 assert.equal(host.sent.length,3,'a material change is not held for the volatile window');
 clock.at+=200;state=structuredClone(state);state.runs[2].status='failed';stream.observe(state);assert.equal(host.sent.length,3,'bursts coalesce');
 clock.at+=900;stream.observe(state);assert.equal(host.sent.length,4,'the coalesced change still arrives');
 assert.ok(host.sent.every(row=>row.value.stateVersion===undefined),'an old client never sees version fields it would not understand');
 assert.equal(stream.sync(add('legacy-2'),{},state).state,state);
});
test('state never enters the replay journal, so it cannot evict lifecycle events',()=>{
 const {host,clock,add,stream}=hostFixture();host.journal=[];let state=largeState();add('legacy');const patch=add('patch');stream.sync(patch,{statePatch:'v1'},state);
 for(let second=1;second<=40;second++){clock.at+=1000;state=tick(state,second*1000);stream.observe(state);}
 assert.equal(host.journal.length,0);assert.equal(host.sequence,7,'state consumes no durable cursor');
 assert.ok(host.sent.every(row=>row.value.cursor==='epoch:7'));
});
test('conditional sync: a changed version gets the snapshot, an owner restart cannot match',()=>{
 const {add,stream,host,clock}=hostFixture();let state=largeState();
 const first=add('a');const version=stream.sync(first,{statePatch:'v1'},state).stateVersion;
 const reconnected=add('b');assert.equal(stream.sync(reconnected,{statePatch:'v1',ifStateVersion:version},state).unchanged,true,'a new transport can skip an unchanged snapshot');
 clock.at+=5000;state=tick(state,5000);const moved=add('c');const reply=stream.sync(moved,{statePatch:'v1',ifStateVersion:version},state);
 assert.equal(reply.state,state);assert.notEqual(reply.stateVersion,version);
 host.epoch='new-epoch';assert.equal(stream.sync(add('d'),{statePatch:'v1',ifStateVersion:version},state).state,state);
});
test('a sync that commits new state delivers its patch first, then reports the client current',()=>{
 const {host,clock,add,stream}=hostFixture();let state=largeState();
 const peer=add('patch');const version=stream.sync(peer,{statePatch:'v1'},state).stateVersion;
 clock.at+=10;state=tick(state,10);const reply=stream.sync(peer,{statePatch:'v1',ifStateVersion:version},state);
 assert.deepEqual(host.sent.map(row=>row.event),['state.patch']);assert.equal(host.sent[0].value.data.base,version);
 assert.equal(reply.unchanged,true);assert.equal(reply.stateVersion,host.sent[0].value.data.version);
});
test('a patch larger than most of the state falls back to a versioned snapshot',()=>{
 const {host,clock,add,stream}=hostFixture();const state={blob:'a'.repeat(50_000)};
 const peer=add('patch');const version=stream.sync(peer,{statePatch:'v1'},state).stateVersion;
 clock.at+=5000;const next={blob:'b'.repeat(50_000)};stream.observe(next);
 assert.equal(host.sent[0].event,'state');assert.notEqual(host.sent[0].value.stateVersion,version);assert.equal(host.sent[0].value.data,next);
});
test('a subscriber left behind a version receives the whole state rather than silence',()=>{
 const {host,clock,add,stream}=hostFixture();const state=largeState();
 const peer=add('patch');stream.sync(peer,{statePatch:'v1'},state);peer.stateVersion='epoch:999';
 clock.at+=5000;stream.observe(tick(state,5000));
 assert.equal(host.sent[0].event,'state');assert.equal(peer.stateVersion,host.sent[0].value.stateVersion);
});
