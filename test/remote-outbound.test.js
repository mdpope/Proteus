import test from 'node:test';
import assert from 'node:assert/strict';
import {RemoteOutbound} from '../src/services/remote/remote-outbound.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,35));
function fixture(options={}){const socket={readyState:1,bufferedAmount:0,frames:[],callbacks:[],send(value,done){this.frames.push(value);this.callbacks.push(done);}};return {socket,queue:new RemoteOutbound(socket,options)};}
test('snapshot bursts drain in order without closing the shared socket',async()=>{
 const {socket,queue}=fixture();const peer={id:'a'},snapshot='x'.repeat(4_666_851);
 try{assert.equal(queue.enqueue(peer,snapshot),true);socket.bufferedAmount=snapshot.length;assert.equal(queue.enqueue(peer,snapshot),true);socket.callbacks.shift()();assert.equal(socket.frames.length,1);socket.bufferedAmount=0;await tick();assert.equal(socket.frames.length,2);socket.callbacks.shift()();assert.equal(queue.bytes,0);assert.equal(socket.readyState,1);}finally{queue.stop();}
});
test('oversize or excess queue rejects only the affected peer and never replays packets',()=>{
 const rejected=[],{socket,queue}=fixture({reject:peer=>rejected.push(peer.id)});
 try{queue.enqueue({id:'a'},'first');queue.enqueue({id:'b'},'healthy');assert.equal(queue.enqueue({id:'a'},'x'.repeat(8_000_001)),false);assert.deepEqual(rejected,['a']);socket.callbacks.shift()();assert.equal(socket.frames[1],'healthy');socket.callbacks.shift()();assert.equal(queue.bytes,0);assert.equal(socket.readyState,1);}finally{queue.stop();}
});
test('wire pacing respects relay client limits and stop cancels queued output',async()=>{
 let now=0;const {socket,queue}=fixture({clock:()=>now});
 try{for(let i=0;i<9;i++){queue.enqueue({id:'a'},'x'.repeat(4_000_000));if(socket.callbacks.length)socket.callbacks.shift()();}
 assert.equal(socket.frames.length,8);now=10001;clearTimeout(queue.timer);queue.timer=null;queue.pump();await tick();assert.equal(socket.frames.length,9);queue.stop();socket.callbacks.shift()();assert.equal(queue.bytes,0);assert.equal(queue.timer,null);}finally{queue.stop();}
});

test('one rate-limited client does not hold up another client',()=>{
 const {socket,queue}=fixture({clock:()=>0});
 try{queue.history=[{at:0,peer:'slow',bytes:32_000_000}];queue.enqueue({id:'slow'},'later');queue.enqueue({id:'healthy'},'now');assert.deepEqual(socket.frames,['now']);socket.callbacks.shift()();assert.equal(queue.queue[0].payload,'later');}finally{queue.stop();}
});
