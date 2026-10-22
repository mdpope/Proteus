import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const {ArtifactScroll,positions}=createRequire(import.meta.url)('../desktop/artifact-scroll.cjs');
const position={path:'root',top:200,left:0,x:0,y:.5};

test('artifact positions accept only bounded numeric paths and geometry',()=>{
 assert.deepEqual(positions([{...position,text:'private',html:'<div>secret</div>'}]),[position]);
 for(const row of [{...position,path:'body script'},{...position,path:'0.'.repeat(31)+'1'},{...position,y:2},{...position,top:Infinity},{...position,left:1e12}])assert.throws(()=>positions([row]),/Invalid document scroll/);
 assert.throws(()=>positions(Array(25).fill(position)),/Invalid document scroll/);
});
test('artifact bridge accepts only its isolated context, coalesces geometry, and disposes its own lease',async()=>{
 const contents=new EventEmitter(),debug=new EventEmitter(),calls=[],seen=[];let attached=false,current=true;
 contents.debugger=debug;contents.isDestroyed=()=>false;debug.isAttached=()=>attached;debug.attach=()=>{attached=true;};debug.detach=()=>{attached=false;debug.emit('detach');};
 debug.sendCommand=async(method,args={},session)=>{calls.push({method,args,session});if(method==='Page.getFrameTree')return {frameTree:{childFrames:[{frame:{id:'approved-frame',url:'about:srcdoc'}}]}};if(method==='Page.createIsolatedWorld')return {executionContextId:7};return {result:{value:true}};};
 const observer=new ArtifactScroll(contents,{current:()=>current,onScroll:value=>seen.push(value)});await observer.start();
 const event={name:observer.binding,executionContextId:7,payload:JSON.stringify([position])},emit=(value=event,session)=>debug.emit('message',{},'Runtime.bindingCalled',value,session);
 emit({...event,name:'foreignBinding'});emit({...event,executionContextId:8});emit(event,'foreign-session');await new Promise(resolve=>setTimeout(resolve,120));assert.equal(seen.length,0,'another execution world or frame cannot forge reports');emit();emit({...event,payload:JSON.stringify([{...position,top:300}])});await new Promise(resolve=>setTimeout(resolve,120));assert.deepEqual(seen,[[{...position,top:300}]],'latest geometry is coalesced without transferring content');
 emit();await observer.apply([position]);await new Promise(resolve=>setTimeout(resolve,120));assert.equal(seen.length,1,'applying a follow position cancels queued human capture');current=false;emit();await new Promise(resolve=>setTimeout(resolve,120));assert.equal(seen.length,1,'a stale approved view cannot publish');
 const isolated=calls.find(call=>call.method==='Page.createIsolatedWorld');assert.equal(isolated.args.frameId,'approved-frame');assert.equal(isolated.args.grantUniveralAccess,false);
 await observer.dispose();assert.equal(contents.listenerCount('input-event'),0);assert.equal(debug.listenerCount('message'),0);assert.equal(attached,false);
});
test('an existing foreign debugger remains attached and the artifact viewer can disable only follow support',async()=>{
 const contents=new EventEmitter(),debug=new EventEmitter();contents.debugger=debug;contents.isDestroyed=()=>false;debug.isAttached=()=>true;let changed=false;debug.attach=debug.detach=()=>{changed=true;};
 const observer=new ArtifactScroll(contents);await assert.rejects(observer.start(),/another debugger/);await observer.dispose();assert.equal(changed,false);assert.equal(contents.listenerCount('input-event'),0);
});
test('closing during isolated observer setup does not install a late binding or reacquire a debugger',async()=>{
 const contents=new EventEmitter(),debug=new EventEmitter(),calls=[];let attached=false,finishEnable;
 contents.debugger=debug;contents.isDestroyed=()=>false;debug.isAttached=()=>attached;debug.attach=()=>{attached=true;};debug.detach=()=>{attached=false;debug.emit('detach');};
 debug.sendCommand=async(method)=>{calls.push(method);if(method==='Page.getFrameTree')return {frameTree:{childFrames:[{frame:{id:'approved-frame',url:'about:srcdoc'}}]}};if(method==='Page.createIsolatedWorld')return {executionContextId:7};if(method==='Runtime.enable')await new Promise(resolve=>finishEnable=resolve);return {result:{value:true}};};
 const observer=new ArtifactScroll(contents),starting=observer.start();await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof finishEnable,'function');await observer.dispose();finishEnable();await assert.rejects(starting,/not ready/);assert.equal(calls.includes('Runtime.addBinding'),false);assert.equal(attached,false);assert.equal(debug.listenerCount('message'),0);assert.equal(await observer.start(),false);
});
