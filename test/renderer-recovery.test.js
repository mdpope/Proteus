import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';import {createRequire} from 'node:module';
const {RendererRecovery}=createRequire(import.meta.url)('../desktop/windows/renderer-recovery.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fixture(options={}){const window=new EventEmitter(),wc=new EventEmitter(),loads=[],fallbacks=[],logs=[];window.webContents=wc;window.isDestroyed=wc.isDestroyed=()=>false;window.loadURL=async url=>{loads.push(url);};wc.loadFile=async file=>{fallbacks.push(file);};const recovery=new RendererRecovery(window,{url:'http://127.0.0.1:4317/',delays:[1,1,1],timeout:6,stable:10000,log:entry=>logs.push(entry),...options});return {window,wc,recovery,loads,fallbacks,logs};}
test('renderer crash recovery is deferred, window-local, acknowledged by generation and never owns host execution',async t=>{
 let prepared=0;const a=fixture({prepare:()=>prepared++}),b=fixture();t.after(()=>{a.recovery.dispose();b.recovery.dispose();});
 a.wc.emit('render-process-gone',{}, {reason:'crashed',exitCode:5});assert.equal(a.loads.length,0);assert.equal(prepared,1);assert.equal(b.recovery.restoring,false);
 await wait(3);assert.deepEqual(a.loads,['http://127.0.0.1:4317/']);assert.equal(a.recovery.ready(0),false);assert.equal(a.recovery.ready(a.recovery.generation),true);await wait(12);assert.equal(a.loads.length,1);assert.deepEqual(b.loads,[]);
});
test('unacknowledged recovery is bounded with a visible fallback and explicit manual retry',async t=>{
 const exhausted=fixture({delays:[]});t.after(()=>exhausted.recovery.dispose());exhausted.wc.emit('render-process-gone',{}, {reason:'crashed'});assert.equal(exhausted.fallbacks.length,0,'Fallback navigation must also wait until after renderer teardown');await wait(3);assert.equal(exhausted.fallbacks.length,1);
 const f=fixture();t.after(()=>f.recovery.dispose());f.wc.emit('render-process-gone',{}, {reason:'oom',exitCode:9});for(let i=0;i<100&&!f.fallbacks.length;i++)await wait(5);
 assert.equal(f.loads.length,3);assert.equal(f.fallbacks.length,1);assert.match(f.fallbacks[0],/renderer-recovery.html$/);f.wc.emit('render-process-gone',{}, {reason:'crashed'});await wait(5);assert.equal(f.fallbacks.length,1);
 f.recovery.reload();await wait(3);assert.equal(f.loads.length,4);assert.equal(f.recovery.ready(f.recovery.generation),true);
});
test('overlapping failure events coalesce, stale readiness cannot cancel a newer recovery and closing cancels retries',async()=>{
 const f=fixture({delays:[15],timeout:100});f.recovery.failed('crashed');const old=f.recovery.generation;f.recovery.failed('load-failed');assert.equal(f.recovery.attempts,1);f.recovery.reload();assert.equal(f.recovery.ready(old),false);f.window.emit('closed');await wait(25);assert.equal(f.loads.length,0);
 const g=fixture({closing:()=>true});g.recovery.failed('crashed');await wait(3);assert.equal(g.loads.length,0);g.recovery.dispose();
});
test('clean exit is ignored and unresponsive reporting does not kill a shared renderer process',()=>{
 const f=fixture();try{f.wc.emit('render-process-gone',{}, {reason:'clean-exit',exitCode:0});f.wc.emit('unresponsive');assert.equal(f.loads.length,0);assert.equal(f.recovery.restoring,false);assert.equal(f.logs[0].reason,'unresponsive');}finally{f.recovery.dispose();}
});
