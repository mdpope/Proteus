import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {TerminalStore} from '../src/services/tools/terminals.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(t,spawnPty){
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-terminal-startup-'));
  const workspaceFiles={roots:()=>({roots:[{id:'synthetic',path:home,available:true}]}),resolve:()=>({root:{id:'synthetic'},relative:'',resolved:home})};
  const store=new TerminalStore(home,{workspaceFiles,spawnPty,killGroup:()=>{}});
  t.after(async()=>{await store.dispose();fs.rmSync(home,{recursive:true,force:true});});
  return store;
}
function owned(){
  let exit;
  return {ownsProcessTree:true,pid:42,onData:()=>({dispose(){}}),onExit(fn){exit=fn;return {dispose(){}};},close:async()=>exit({exitCode:null,signal:'terminated'})};
}

test('pending terminal starts reserve capacity and block updates until creation and cleanup finish',async t=>{
  const resolve=[],store=fixture(t,()=>new Promise(done=>resolve.push(done)));
  const pending=Array.from({length:12},()=>store.create());
  assert.match(store.updateBlockers().join(' '),/still opening/);
  await assert.rejects(store.create(),/Close an active terminal/);
  for(const supply of resolve)supply(owned());
  const sessions=await Promise.all(pending);
  assert.equal(store.pendingCreates.size,0);
  assert.equal(store.updateBlockers().length,12,'running children remain blockers');
  await Promise.all(sessions.map(session=>store.close(session.id)));
  assert.deepEqual(store.updateBlockers(),[]);
});

test('failed startup retains an update/disposal blocker until actual process exit is confirmed',async t=>{
  let confirm;
  const error=Object.assign(Error('Synthetic startup termination failed'),{cleanupUnconfirmed:true,cleanupCompleted:new Promise(resolve=>{confirm=resolve;})});
  const store=fixture(t,()=>Promise.reject(error));
  await assert.rejects(store.create(),/termination failed/);
  assert.match(store.updateBlockers().join(' '),/cleanup is not confirmed/);
  await assert.rejects(store.dispose(),/cleanup is not confirmed/);
  confirm();await tick();
  assert.deepEqual(store.updateBlockers(),[]);
  await store.dispose();
});

test('unconfirmed close keeps a running session and cannot resend termination; actual exit permits metadata cleanup',async t=>{
  const child=owned();let exited,calls=0;
  child.onExit=fn=>{exited=fn;return {dispose(){}};};
  child.close=async()=>{calls++;throw Error('Synthetic unconfirmed close');};
  const store=fixture(t,()=>child),session=await store.create();
  await assert.rejects(store.close(session.id),/unconfirmed/);
  await assert.rejects(store.close(session.id),/unconfirmed/);
  assert.equal(calls,1);assert.equal(store.snapshot(session.id).session.status,'running');
  assert.match(store.updateBlockers().join(' '),/still attached/);
  exited({exitCode:null,signal:'guardian-ended'});
  await store.close(session.id);
  assert.equal(calls,1);assert.deepEqual(store.updateBlockers(),[]);
});
