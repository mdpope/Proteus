import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveBrowser} from '../src/live-browser.js';

function fixture() {
  let now=100000,revision=1,available=true,captures=0,release;
  const live=new LiveBrowser({list:id=>available&&id==='chat-a'?[{id:'tab'}]:[],current:(_id,value)=>available&&value===revision,capture:async()=>{captures++;if(release)await new Promise(resolve=>{release.resolve=resolve;});return {revision,image:'data:image/jpeg;base64,synthetic',width:800,height:600};}},{now:()=>now});
  return {live,advance:ms=>now+=ms,navigate:()=>revision++,remove:()=>available=false,captures:()=>captures,hold:()=>release={},release:()=>release.resolve()};
}
test('live frames are bounded, coalesced, chat scoped, and expire after navigation or time',async()=>{
 const f=fixture(),a=await f.live.frame('chat-a','tab');
 assert.equal((await f.live.frame('chat-a','tab')).id,a.id);assert.equal(f.captures(),1);
 assert.match(f.live.reference('chat-a',a.id,{x:.5,y:.25}),/400,150/);
 assert.throws(()=>f.live.reference('chat-b',a.id),/stale/);
 assert.throws(()=>f.live.reference('chat-a',a.id,{x:2,y:0}),/inside/);
 await assert.rejects(f.live.frame('chat-b','tab'),/not available/);
 f.navigate();assert.throws(()=>f.live.reference('chat-a',a.id),/stale/);
 const b=await f.live.frame('chat-a','tab');assert.notEqual(a.id,b.id);
 f.advance(30001);assert.throws(()=>f.live.reference('chat-a',b.id),/stale/);
 for(let i=0;i<45;i++){f.advance(751);await f.live.frame('chat-a','tab');}
 assert.ok(f.live.frames.size<=40);
 f.remove();await assert.rejects(f.live.frame('chat-a','tab'),/not available/);
});
test('revocation invalidates an in-flight capture instead of repopulating the frame cache',async()=>{
 const f=fixture();f.hold();const a=f.live.frame('chat-a','tab'),b=f.live.frame('chat-a','tab');assert.equal(f.captures(),1);
 f.live.clear();f.release();await assert.rejects(a,/permission changed/);await assert.rejects(b,/permission changed/);assert.equal(f.live.frames.size,0);assert.equal(f.live.pending.size,0);
});
