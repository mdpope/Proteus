import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {assertPrivate} from './helpers/permissions.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import { PerformanceDiagnostics, performancePhaseNames } from '../src/services/telemetry/performance-diagnostics.js';
import { DesktopPeers } from '../src/services/remote/desktop-peers.js';

function fixture(options = {}) {
  let mono = 0, wall = 1_000_000, next = 0;
  const scheduled = new Map();
  const diagnostics = new PerformanceDiagnostics({
    clock: { monotonic: () => mono, wall: () => wall },
    timers: { setTimeout: fn => { const id = ++next; scheduled.set(id, fn); return id; }, clearTimeout: id => scheduled.delete(id) },
    ...options,
  });
  return { diagnostics, scheduled, advance: (ms, wallMs = ms) => { mono += ms; wall += wallMs; },
    sample: () => { const [id, fn] = scheduled.entries().next().value; scheduled.delete(id); fn(); } };
}

test('completed slow sync phases correlate with lag; async waits remain explicitly separate', async () => {
  const f = fixture(); f.diagnostics.start();
  let finish; const pending = f.diagnostics.measure('peer.heartbeat', () => new Promise(resolve => { finish = resolve; }));
  f.advance(100);
  const value = f.diagnostics.measureSync('remote.state', () => { f.advance(400); return 'original'; });
  assert.equal(value, 'original'); f.sample();
  const snapshot = f.diagnostics.snapshot(), lag = snapshot.eventLoop[0];
  assert.equal(lag.kind, 'lag'); assert.equal(lag.lagMs, 250);
  assert.deepEqual(lag.synchronousPhases, [{ name: 'remote.state', at: 1_000_500, durationMs: 400 }]);
  assert.deepEqual(lag.activeAsyncPhases, [{ name: 'peer.heartbeat', count: 1, elapsedMs: 500 }]);
  finish('original-async'); assert.equal(await pending, 'original-async');
  assert.equal(f.diagnostics.snapshot().phases.find(p => p.name === 'peer.heartbeat').kind, 'async');
  await f.diagnostics.close(); assert.equal(f.scheduled.size, 0);
});

test('a long async wait alone does not generate blocking attribution; discontinuities do not implicate phases', async () => {
  const f = fixture(); f.diagnostics.start();
  let finish; const pending = f.diagnostics.measure('scheduler.tick', () => new Promise(resolve => { finish = resolve; }));
  for (let i = 0; i < 20; i++) { f.advance(250); f.sample(); }
  assert.equal(f.diagnostics.snapshot().eventLoop.length, 0);
  f.diagnostics.measureSync('remote.state', () => f.advance(400));
  f.advance(40_000); f.sample();
  const event = f.diagnostics.snapshot().eventLoop[0]; assert.equal(event.kind, 'discontinuity'); assert.deepEqual(event.synchronousPhases, []);
  f.advance(500, -1000); f.sample(); assert.equal(f.diagnostics.snapshot().eventLoop[1].kind, 'discontinuity');
  finish(); await pending; await f.diagnostics.close();
});

test('privacy labels, rolling samples, rings and error propagation are bounded', async () => {
  const f = fixture(); f.diagnostics.start(); const secret = 'PRIVATE_PATH_OR_PROMPT';
  assert.equal(f.diagnostics.measureSync(secret, () => secret), secret);
  assert.equal(await f.diagnostics.measure(secret, async () => secret), secret);
  const error = new Error(secret);
  assert.throws(() => f.diagnostics.measureSync('run.persist', () => { throw error; }), value => value === error);
  await assert.rejects(f.diagnostics.measure('scheduler.tick', async () => { throw error; }), value => value === error);
  for (let i = 0; i < 200; i++) {
    for (const name of performancePhaseNames) f.diagnostics.measureSync(name, () => f.advance(60));
    f.sample();
  }
  const snapshot = f.diagnostics.snapshot();
  assert.equal(snapshot.phases.filter(p => p.kind === 'sync').length, performancePhaseNames.length);
  assert.ok(snapshot.phases.every(p => p.samples <= 128)); assert.equal(snapshot.slowPhases.length, 64); assert.equal(snapshot.eventLoop.length, 32);
  const encoded = JSON.stringify(snapshot); assert.ok(Buffer.byteLength(encoded) < snapshot.limits.fileBytes); assert.equal(encoded.includes(secret), false);
  snapshot.slowPhases[0].name = secret; assert.equal(JSON.stringify(f.diagnostics.snapshot()).includes(secret), false);
  await f.diagnostics.close(); assert.equal(f.scheduled.size, 0);
  assert.equal(f.diagnostics.measureSync('run.persist', () => 42), 42);
});

test('private files rotate once and close flushes the final snapshot without leaking payloads', async () => {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-performance-'));
  try {
    const directory = path.join(home, 'diagnostics'); await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, 'performance.json'), JSON.stringify({ version: 1, previous: true }));
    const f = fixture({ home }); f.diagnostics.start();
    f.diagnostics.measureSync('context.get', () => f.advance(100));
    await f.diagnostics.close(); await f.diagnostics.close();
    const report = JSON.parse(await fs.readFile(path.join(directory, 'performance.json'), 'utf8'));
    assert.equal(report.closed, true); assert.equal(report.phases[0].name, 'context.get');
    assert.equal(JSON.parse(await fs.readFile(path.join(directory, 'performance.previous.json'), 'utf8')).previous, true);
    assertPrivate(path.join(directory, 'performance.json'));
    assert.deepEqual((await fs.readdir(directory)).sort(), ['performance.json', 'performance.previous.json']);
  } finally { await fs.rm(home, { recursive: true, force: true }); }
});

test('persistence failures are nonfatal, writes coalesce and lifecycle has one watchdog', async () => {
  let release, active = 0, maximum = 0, writes = 0;
  const io = {
    mkdir: async () => {}, stat: async () => { throw new Error('private missing path'); },
    writeFile: async () => { active++; maximum = Math.max(maximum, active); writes++; if (writes === 1) await new Promise(resolve => { release = resolve; }); active--; throw new Error('PRIVATE_IO_FAILURE'); },
    unlink: async () => {},
  };
  const f = fixture({ home: '/synthetic/private/path', io }); f.diagnostics.start(); f.diagnostics.start();
  assert.equal(f.scheduled.size, 1);
  await delay(0);
  for (let i = 0; i < 10; i++) { f.advance(5000); f.sample(); }
  const closing = f.diagnostics.close(); assert.equal(f.scheduled.size, 0); release(); await closing;
  assert.equal(maximum, 1); assert.equal(writes, 2); assert.equal(f.diagnostics.snapshot().persistence.failures, 2);
  assert.equal(JSON.stringify(f.diagnostics.snapshot()).includes('PRIVATE'), false);
});

test('a real blocked main loop records its completed sync fixture', async () => {
  const diagnostics = new PerformanceDiagnostics({ watchdogIntervalMs: 20, lagThresholdMs: 10, slowThresholdMs: 10 });
  diagnostics.start();
  try {
    diagnostics.measureSync('remote.state', () => { const until = performance.now() + 100; while (performance.now() < until) { /* deliberate synthetic blocking */ } });
    await delay(35);
    assert.ok(diagnostics.snapshot().eventLoop.some(event => event.kind === 'lag' && event.synchronousPhases.some(phase => phase.name === 'remote.state')));
  } finally { await diagnostics.close(); }
});

test('desktop peer cache separates serialization, encryption and synchronous disk work', async () => {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-peer-timings-'));
  const f = fixture();
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: value => { f.advance(75); return Buffer.from(value); } };
  const peers = new DesktopPeers(home, { safeStorage, diagnostics: f.diagnostics });
  try {
    peers.cache.set('synthetic-host', { items: [{ title: 'PRIVATE_SYNTHETIC_TITLE' }] }); peers.saveCache();
    const phases = f.diagnostics.snapshot().phases;
    assert.deepEqual(phases.map(p => p.name), ['peer.cache.serialize', 'peer.cache.encrypt', 'peer.cache.disk']);
    assert.equal(phases[1].maxMs, 75); assert.equal(JSON.stringify(f.diagnostics.snapshot()).includes('PRIVATE_SYNTHETIC_TITLE'), false);
  } finally { peers.close(); await f.diagnostics.close(); await fs.rm(home, { recursive: true, force: true }); }
});


test('long stalls retain exact timestamps and phase correlation after short-stall ring turns over', async()=>{
 const f=fixture();f.diagnostics.start();
 f.diagnostics.measureSync('activity.persist',()=>f.advance(11250));f.sample();
 const original=f.diagnostics.snapshot().eventLoop[0];
 for(let i=0;i<40;i++){f.advance(500);f.sample();}
 const snapshot=f.diagnostics.snapshot();assert.equal(snapshot.eventLoop.length,32);
 assert.deepEqual(snapshot.longEventLoop,[original]);assert.equal(original.lagMs,11000);
 assert.equal(original.synchronousPhases[0].name,'activity.persist');
 for(let i=0;i<20;i++){f.advance(1250);f.sample();}
 assert.equal(f.diagnostics.snapshot().longEventLoop.length,16);await f.diagnostics.close();
});
