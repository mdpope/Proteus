import {assertPrivate} from './helpers/permissions.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ProteusTmux } from '../src/services/tools/terminal-tmux.js';

test('tmux helper uses only its protected Proteus socket and exact managed session targets', () => {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-tmux-test-'));
  const calls = []; const sessions = new Map();
  const run = (binary, args, options) => {
    calls.push({ binary, args, options });
    if (args[0] === '-V') return { status: 0, stdout: 'tmux 3.6a\n' };
    const command = args[4];
    if (command === 'list-sessions') return sessions.size ? { status: 0, stdout: [...sessions].map(([id,tag]) => `${id}\t0\t1730000000\t${tag}\t$1`).join('\n') + '\n' } : { status: 1, stderr: 'no server' };
    if (command === 'new-session') { sessions.set(args[args.indexOf('-s') + 1], ''); return { status: 0, stdout: '' }; }
    if (command === 'set-option') { sessions.set(args[args.indexOf('-t') + 1], args.at(-1)); return { status: 0, stdout: '' }; }
    if (command === 'display-message') return { status: 0, stdout: '23001\n' };
    if (command === 'list-panes') return { status: 0, stdout: 'work\t23002\nother\t23003\n' };
    if (command === 'capture-pane') return { status: 0, stdout: 'detached output\n' };
    if (command === 'kill-session') { sessions.delete('work'); return { status: 0, stdout: '' }; }
    return { status: 1, stderr: 'unexpected' };
  };
  try {
    const tmux = new ProteusTmux(home, { binary: '/synthetic/tmux', run });
    assertPrivate(tmux.root,0o700);
    assert.deepEqual(tmux.sessions().managedSessions, []);
    const created = tmux.create({ id: 'work', cwd: home, shell: '/bin/zsh' });
    assert.deepEqual(tmux.sessions().managedSessions.map(item => item.id), ['work']);
    assert.deepEqual(tmux.status().managedPids, [{ pid: 23001, sessionId: null, role: 'tmux server' }, { pid: 23002, sessionId: 'work', role: 'tmux pane' }]);
    assert.deepEqual(tmux.attachArgs('work',created.tag).slice(-2), ['-t', '$1']);
    assert.equal(tmux.capture('work',created.tag).data, 'detached output\n');
    sessions.set('work','00000000-0000-4000-8000-000000000002');
    assert.throws(() => tmux.attachArgs('work',created.tag), /identity changed/);
    assert.throws(() => tmux.end('work',created.tag), /identity changed/);
    sessions.set('work',created.tag);
    assert.throws(() => tmux.create({ id: '../default', cwd: home, shell: '/bin/zsh' }), /Invalid/);
    tmux.end('work',created.tag); assert.deepEqual(tmux.sessions().managedSessions, []);
    for (const item of calls.filter(item => item.args[0] !== '-V')) {
      assert.deepEqual(item.args.slice(0, 4), ['-S', tmux.socket, '-f', '/dev/null']);
      assert.equal(item.options.env.TMUX, undefined);
    }
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('async tmux inspection shares pending requests and measures only tagged session PIDs',async t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-tmux-async-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const calls=[];let release;
  const tmux=new ProteusTmux(home,{binary:'/synthetic/tmux',run:()=>{throw new Error('synchronous inspection must not run');},runAsync:async(binary,args,options)=>{
    calls.push({binary,args,options});
    if(args[0]==='-V'){await new Promise(resolve=>{release=resolve;});return {status:0};}
    if(args[4]==='list-sessions')return {status:0,stdout:'work\t0\t1730000000\t00000000-0000-4000-8000-000000000001\t$1\nunmanaged\t0\t1730000000\t\t$2\n'};
    if(args[4]==='display-message')return {status:0,stdout:'23001\n'};
    if(args[4]==='list-panes')return {status:0,stdout:'work\t23002\nwork\t23002\nunmanaged\t23003\n'};
    throw new Error('unexpected command');
  }});
  const first=tmux.statusAsync(),second=tmux.statusAsync();assert.equal(first,second);await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,1);release();
  const result=await first;assert.deepEqual(result.managedSessions.map(item=>item.id),['work']);assert.deepEqual(result.managedPids,[{pid:23001,sessionId:null,role:'tmux server'},{pid:23002,sessionId:'work',role:'tmux pane'}]);assert.equal(calls.length,4);
  for(const call of calls.slice(1)){assert.deepEqual(call.args.slice(0,4),['-S',tmux.socket,'-f','/dev/null']);assert.equal(call.options.env.TMUX,undefined);assert.equal(call.options.env.TMUX_PANE,undefined);}
  const fresh=tmux.statusAsync();assert.notEqual(fresh,first);release();await fresh;
});

test('async tmux inspection reports unavailable or an empty dedicated server without PID probes',async t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-tmux-empty-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));let installed=false,calls=0;
  const tmux=new ProteusTmux(home,{runAsync:async(binary,args)=>{calls++;return args[0]==='-V'?{status:installed?0:1,error:installed?undefined:new Error('missing')}:{status:1,stderr:'no server'};}});
  assert.deepEqual(await tmux.statusAsync(),{available:false,managedSessions:[],managedPids:[]});assert.equal(calls,1);
  installed=true;assert.deepEqual(await tmux.statusAsync(),{available:true,managedSessions:[],managedPids:[]});assert.equal(calls,3);
});
