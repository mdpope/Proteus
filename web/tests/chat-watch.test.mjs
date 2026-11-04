import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisibleChatWatch} from '../resources/js/chat-watch.js';
const session=(modern=true)=>({client:{status:'online'},state:{capabilities:modern?['chat.watch.v1']:[]}});
const drain=()=>new Promise(resolve=>setImmediate(resolve));
test('visible reads retain a delta token, background reads do not subscribe, and leaving releases the exact lease',async()=>{
 const calls=[],current=session(),watch=createVisibleChatWatch({request:async(_current,method,args)=>{calls.push({method,args});return {id:args.id};},updated:()=>{},failed:assert.fail});
 await watch.read(current,'first');const token=calls[0].args.watchToken;
 assert.match(token,/^[a-f0-9-]{36}$/);assert.equal(calls[0].args.watch,'delta');assert.equal(calls[0].args.fieldDelta,'v1');
 watch.ensure(current,'first');await drain();assert.equal(calls.length,1);
 await watch.read(current,'first');assert.equal(calls[1].args.watchToken,token);
 await watch.read(current,'second');assert.deepEqual(calls[2],{method:'chat.watch',args:{id:'first',watch:'none',watchToken:token}});
 const second=calls[3].args.watchToken;assert.notEqual(second,token);
 watch.clear();await drain();assert.deepEqual(calls[4].args,{id:'second',watch:'none',watchToken:second});
 await watch.read(current,'hidden',{visible:false});assert.deepEqual(calls[5].args,{id:'hidden',watch:'none'});
});
test('leaving while the first read waits releases after subscription and never paints a stale result',async()=>{
 const calls=[],current=session();let finish,paints=0;
 const watch=createVisibleChatWatch({request:async(_current,method,args)=>{calls.push({method,args});if(method==='chat.get')return new Promise(resolve=>finish=resolve);},updated:()=>paints++,failed:assert.fail});
 watch.ensure(current,'slow');await drain();watch.clear();finish({id:'slow'});await drain();await drain();
 assert.equal(paints,0);assert.equal(calls[1].method,'chat.watch');assert.equal(calls[1].args.watchToken,calls[0].args.watchToken);
});
test('old owners get no token or unsupported unwatch; reconnect reacquires on the replacement transport',async()=>{
 const calls=[],current=session(false),watch=createVisibleChatWatch({request:async(_current,method,args)=>{calls.push({method,args});return {id:args.id};},updated:()=>{},failed:assert.fail});
 await watch.read(current,'chat');assert.equal(calls[0].args.watchToken,undefined);watch.clear();await drain();assert.equal(calls.length,1);
 current.state.capabilities=['chat.watch.v1'];await watch.read(current,'chat');const token=calls[1].args.watchToken;
 current.client={status:'online'};watch.ensure(current,'chat');await drain();assert.equal(calls.length,3);assert.notEqual(calls[2].args.watchToken,token);
 watch.clear();await drain();
});
test('an explicit open cancelled during its read cannot continue navigation after leaving',async()=>{
 const current=session();let finish;const calls=[];
 const watch=createVisibleChatWatch({request:async(_current,method,args)=>{calls.push({method,args});if(method==='chat.get')return new Promise(resolve=>finish=resolve);},updated:assert.fail,failed:assert.fail});
 const read=watch.read(current,'chat');await drain();watch.clear();finish({id:'chat'});
 await assert.rejects(read,{cancelled:true});await drain();assert.equal(calls[1].method,'chat.watch');
});
