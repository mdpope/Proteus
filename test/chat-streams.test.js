import test from 'node:test';
import assert from 'node:assert/strict';
import {publishChatStreams,setChatWatch,clearChatWatch} from '../src/services/remote/chat-streams.js';

test('mixed subscribers keep independent delivery modes and incremental updates avoid unchanged history',()=>{
  const run={id:'synthetic',version:1,events:Array.from({length:100},(_,index)=>({text:'x'.repeat(10_000),index}))};
  const peers=['full','summary','delta'].map(mode=>{const peer={device:{},mode};setChatWatch(peer,run.id,mode);return peer;});
  const sent=[],host={peers:new Map(peers.map((peer,index)=>[index,peer])),service:{engine:{runs:new Map([[run.id,run]]),getRun:()=>run}},runVersions:new Map(),epoch:'synthetic',sequence:0,
    send:(peer,value)=>sent.push({peer,value}),broadcast(event,data,runId,accepts){for(const peer of peers)if(peer.runId===runId&&accepts(peer))this.send(peer,{event,data});}};
  const projection={summary:source=>({id:source.id,version:source.version}),page:source=>({id:source.id,events:source.events,eventStart:0,eventCount:source.events.length,version:source.version})};
  publishChatStreams(host,projection);sent.length=0;
  run.events[99]={text:'changed',index:99};run.version++;host.runVersions.set(run.id,1);
  publishChatStreams(host,projection);
  const full=sent.find(row=>row.peer.mode==='full').value,summary=sent.find(row=>row.peer.mode==='summary').value,delta=sent.find(row=>row.peer.mode==='delta').value;
  assert.equal(summary.event,'run.changed');assert.equal(summary.data.events,undefined);
  assert.equal(full.data.events.length,100);assert.equal(delta.data.events.length,0);
  assert.deepEqual(delta.data.eventPatches,[{index:99,event:run.events[99]}]);
  assert.ok(JSON.stringify(delta).length<JSON.stringify(full).length/100);
  sent.length=0;publishChatStreams(host,projection);assert.equal(sent.length,0);
  assert.equal(clearChatWatch(peers[2],'different'),false);assert.equal(peers[2].runId,run.id);
  assert.equal(clearChatWatch(peers[2],run.id),true);
  run.version++;publishChatStreams(host,projection);assert.ok(sent.every(row=>row.peer!==peers[2]));
  setChatWatch(peers[2],run.id,'delta');sent.length=0;publishChatStreams(host,projection);
  assert.equal(sent.find(row=>row.peer===peers[2]).value.data.events.length,100,'a new watch starts with a complete page');
  setChatWatch(peers[2],run.id,'delta','new-view');
  assert.equal(clearChatWatch(peers[2],run.id,'old-view'),false,'late cleanup cannot clear a new view of the same chat');
  assert.equal(clearChatWatch(peers[2],run.id,'new-view'),true);
});
