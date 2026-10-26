import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createWindowsPty} from '../src/services/tools/windows-terminal/proxy.js';

function fixture(t, kill = function () { this.emit('close'); return true; }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-guardian-protocol-'));
  const asset = path.join(dir, 'guardian.exe');
  fs.writeFileSync(asset, 'test-only-placeholder');
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const child = new EventEmitter();
  Object.assign(child, {
    pid: 42,
    stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(),
    kills: 0,
    kill() { this.kills++; return kill.call(this); }
  });
  const input = [];
  child.stdin.on('data', bytes => input.push(...bytes.toString().trim().split('\n').map(line => JSON.parse(line))));
  return {
    child, input,
    send: value => child.stdout.write(JSON.stringify(value) + '\n'),
    spawn: createWindowsPty({guardianPath: asset, spawnGuardian: () => child})
  };
}

async function start(f) {
  const pending = f.spawn('synthetic-shell', [], {cwd: os.tmpdir(), env: {}, cols: 80, rows: 24});
  f.send({t: 'job-ready', nonInheritable: true, killOnClose: true});
  f.send({t: 'ready'});
  return pending;
}

async function assertStillPending(promise) {
  let completed = false;
  void promise.then(() => { completed = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false);
}

function assertUnconfirmed(error) {
  assert.equal(error.code, 'PROTEUS_TERMINAL_CLEANUP_UNCONFIRMED');
  assert.equal(error.cleanupUnconfirmed, true);
  assert.equal(typeof error.cleanupCompleted?.then, 'function');
  return true;
}

test('guardian handshake blocks commands; split UTF-8 and output tail precede once-only actual close', async t => {
  const f = fixture(t);
  const pending = f.spawn('synthetic-shell', [], {cwd: os.tmpdir(), env: {}, cols: 80, rows: 24});
  assert.deepEqual(f.input, []);
  f.send({t: 'job-ready', nonInheritable: true, killOnClose: true});
  assert.equal(f.input[0].t, 'start');
  f.send({t: 'ready'});
  const bytes = Buffer.from('\u5c3e\u{1f642}');
  f.send({t: 'data', b: bytes.subarray(0, 4).toString('base64')});
  f.send({t: 'data', b: bytes.subarray(4).toString('base64')});
  const p = await pending;
  let data = '', exits = 0;
  p.onData(text => { data += text; });
  p.onExit(value => { exits++; assert.equal(value.exitCode, 7); });
  p.write('input\u{1f642}');
  p.resize(120, 40);
  assert.equal(data, '\u5c3e\u{1f642}');
  assert.equal(Buffer.from(f.input[1].b, 'base64').toString(), 'input\u{1f642}');
  assert.equal(f.input[2].t, 'resize');
  f.send({t: 'data', b: Buffer.from('OUTPUT_TAIL').toString('base64')});
  f.send({t: 'exit', exitCode: 7});
  assert.equal(exits, 0);
  await assertStillPending(p.cleanupCompleted);
  f.child.emit('close');
  await p.closed;
  await p.cleanupCompleted;
  assert.equal(data, '\u5c3e\u{1f642}OUTPUT_TAIL');
  assert.equal(exits, 1);
  f.child.emit('close');
  await p.close();
  assert.equal(exits, 1);
});

test('guardian stop uses only its ChildProcess handle despite a changed reported PID', async t => {
  const f = fixture(t), p = await start(f);
  f.child.pid = 999999;
  const first = p.close(), repeated = p.close();
  assert.equal(first, repeated);
  await first;
  assert.equal(f.child.kills, 1);
  assert.equal(f.input.filter(value => value.t === 'close').length, 1);
});

for (const [name, kill] of [
  ['throws', () => { throw Error('Synthetic native handle error'); }],
  ['returns false', () => false],
  ['returns true without close', () => true]
]) {
  test('unavailable guardian termination ' + name + ' rejects without inventing lifecycle completion', async t => {
    const f = fixture(t, kill), p = await start(f);
    let exits = 0;
    p.onExit(() => { exits++; });
    const keepAlive = setInterval(() => {}, 100);
    t.after(() => clearInterval(keepAlive));
    let rejection;
    await assert.rejects(p.close(), error => { rejection = error; return assertUnconfirmed(error); });
    assert.equal(f.child.kills, 1);
    assert.equal(exits, 0);
    assert.equal(p.cleanupUnconfirmed, true);
    assert.equal(rejection.cleanupCompleted, p.cleanupCompleted);
    await assertStillPending(p.cleanupCompleted);
    await assert.rejects(p.close(), error => error === rejection);
    f.child.emit('close');
    await rejection.cleanupCompleted;
    assert.equal(exits, 1);
    assert.equal(p.cleanupUnconfirmed, false);
    await assert.rejects(p.closed, error => error === rejection);
  });
}

test('startup rejection exposes unconfirmed cleanup until a real guardian close', async t => {
  const f = fixture(t, () => false);
  const pending = f.spawn('must-not-start', [], {});
  const keepAlive = setInterval(() => {}, 100);
  t.after(() => clearInterval(keepAlive));
  f.send({t: 'error', code: 'synthetic-startup-failure'});
  let rejection;
  await assert.rejects(pending, error => { rejection = error; return assertUnconfirmed(error); });
  assert.match(rejection.startupError.message, /synthetic-startup-failure/);
  assert.equal(f.input.some(value => value.t === 'start'), false);
  await assertStillPending(rejection.cleanupCompleted);
  f.child.emit('close');
  await rejection.cleanupCompleted;
});

test('an inheritable ownership handshake cannot launch any command', async t => {
  const f = fixture(t), pending = f.spawn('must-not-start', [], {});
  f.send({t: 'job-ready', nonInheritable: false, killOnClose: true});
  setImmediate(() => f.child.emit('close'));
  await assert.rejects(pending, /handshake/);
  assert.equal(f.input.some(value => value.t === 'start'), false);
});

test('disposal waits for pending owned startup and closes its tree before returning', async t => {
  const {TerminalStore} = await import('../src/services/tools/terminals.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-pending-owned-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  let supply, finishClose, spawnEntered;
  const entered = new Promise(resolve => { spawnEntered = resolve; });
  const starting = new Promise(resolve => { supply = resolve; });
  const closing = new Promise(resolve => { finishClose = resolve; });
  const workspaceFiles = {
    roots: () => ({roots: [{id: 'fixture', path: dir, available: true}]}),
    resolve: () => ({root: {id: 'fixture'}, relative: '', resolved: dir})
  };
  const store = new TerminalStore(dir, {workspaceFiles, spawnPty: () => { spawnEntered(); return starting; }});
  const rejected = assert.rejects(store.create({rootId: 'fixture'}), /shutting down/);
  await entered;
  let done = false;
  const disposal = store.dispose().then(() => { done = true; });
  supply({ownsProcessTree: true, close: () => closing});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(done, false);
  finishClose();
  await disposal;
  await rejected;
  assert.deepEqual(store.list(), []);
  await assert.rejects(store.create({rootId: 'fixture'}), /shutting down/);
});

test('unconfirmed close leaves the real TerminalStore session running until actual lifecycle confirmation', async t => {
  const {TerminalStore} = await import('../src/services/tools/terminals.js');
  const f = fixture(t, () => false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-unconfirmed-session-'));
  const workspaceFiles = {
    roots: () => ({roots: [{id: 'fixture', path: dir, available: true}]}),
    resolve: () => ({root: {id: 'fixture'}, relative: '', resolved: dir})
  };
  const store = new TerminalStore(dir, {workspaceFiles, spawnPty: f.spawn});
  t.after(async () => {
    await store.dispose().catch(() => {});
    store.saveHistory();
    fs.rmSync(dir, {recursive: true, force: true});
  });
  const pending = store.create({rootId: 'fixture'});
  await new Promise(resolve => setImmediate(resolve));
  f.send({t: 'job-ready', nonInheritable: true, killOnClose: true});
  f.send({t: 'ready'});
  const session = await pending;
  let exits = 0;
  store.on('event', event => { if (event.type === 'exit') exits++; });
  let closeError;
  await assert.rejects(store.close(session.id), error => { closeError = error; return assertUnconfirmed(error); });
  assert.equal(store.list().some(value => value.id === session.id), true);
  assert.equal(store.snapshot(session.id).session.status, 'running');
  assert.equal(store.snapshot(session.id).live, true);
  assert.equal(exits, 0);
  f.child.emit('close');
  await closeError.cleanupCompleted;
  assert.equal(store.snapshot(session.id).session.status, 'exited');
  assert.equal(exits, 1);
});
