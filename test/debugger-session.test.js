import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
const {acquireDebugger}=createRequire(import.meta.url)('../desktop/debugger-session.cjs');
function fixture(){const debugger_=new EventEmitter();let attached=false,attaches=0,detaches=0;debugger_.isAttached=()=>attached;debugger_.attach=()=>{if(attached)throw new Error('Debugger is already attached');attached=true;attaches++;};debugger_.detach=()=>{attached=false;detaches++;debugger_.emit('detach',{},'test');};return {debugger:debugger_,isDestroyed:()=>false,counts:()=>({attaches,detaches})};}
test('certificate and browser bridge share only the owned debugger and release idempotently',()=>{const wc=fixture(),certificate=acquireDebugger(wc),bridge=acquireDebugger(wc);assert.deepEqual(wc.counts(),{attaches:1,detaches:0});bridge.release();bridge.release();assert.equal(certificate.active,true);assert.equal(wc.debugger.isAttached(),true);certificate.release();assert.deepEqual(wc.counts(),{attaches:1,detaches:1});});
test('foreign attachment remains attached and receives a recoverable error',()=>{const wc=fixture();wc.debugger.attach();assert.throws(()=>acquireDebugger(wc),/another debugger.*retry/);assert.deepEqual(wc.counts(),{attaches:1,detaches:0});});
test('interrupted owned attachment cannot release a newer owner',()=>{const wc=fixture(),old=acquireDebugger(wc);wc.debugger.detach();assert.equal(old.active,false);const replacement=acquireDebugger(wc);old.release();assert.equal(replacement.active,true);replacement.release();assert.deepEqual(wc.counts(),{attaches:2,detaches:2});});
