import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { StateResponseCache } from '../src/services/state/state-response-cache.js';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('windows share one projection; owner changes prevent caching the captured display', async () => {
  let revision = 1, calls = 0, now = 0;
  const cache = new StateResponseCache({ stamp: () => revision, clock: () => now });
  const gate = deferred();
  const produce = () => { calls++; return calls === 1 ? gate.promise : Promise.resolve('new'); };
  const first = cache.get('summaries', produce), second = cache.get('summaries', produce);
  assert.equal(calls, 1);
  revision++; gate.resolve('stale');
  assert.deepEqual(await Promise.all([first, second]), ['stale', 'stale']); assert.equal(calls, 1);
  assert.equal(cache.cache.size, 0);
  assert.equal(await cache.get('summaries', produce), 'new'); assert.equal(calls, 2);
  revision++; await cache.get('summaries', produce); assert.equal(calls, 3);
  now = 301; await cache.get('summaries', produce); assert.equal(calls, 4);
});

test('continuous chat changes still return coherent snapshots, and a failed worker does not poison newer requests', async () => {
  let revision = 1, calls = 0;
  const cache = new StateResponseCache({ stamp: () => revision, maxPending: 1 });
  const produce = async () => { calls++; const captured=revision; revision++; return captured; };
  assert.equal(await cache.get('moving', produce), 1);
  assert.equal(await cache.get('moving', produce), 2);
  assert.equal(calls, 2); assert.equal(cache.cache.size, 0);
  const gate = deferred(), first = cache.get('one', () => gate.promise);
  revision++;
  const newer=cache.get('one', async () => 'new');
  await assert.rejects(cache.get('two', async () => 'new'), /busy/);
  const rejected = assert.rejects(first, /worker failure/); gate.reject(Error('worker failure')); await rejected;
  assert.equal(await newer, 'new');
  assert.equal(cache.active.size, 0); assert.equal(cache.pending.size, 0);
  assert.equal(await cache.get('one', async () => 'recovered'), 'new');
  cache.clear(); assert.equal(cache.cache.size, 0);
});

test('different generations of the same view coalesce before a fresh snapshot',async()=>{
 let revision=1,calls=0;const cache=new StateResponseCache({stamp:()=>revision,maxPending:1});const gate=deferred();
 const produce=()=>{calls++;return calls===1?gate.promise:Promise.resolve('current');};
 const first=cache.get('view',produce);revision++;
 const followers=Array.from({length:20},()=>cache.get('view',produce));assert.equal(calls,1);
 gate.resolve('obsolete');assert.equal(await first,'obsolete');
 assert.deepEqual(await Promise.all(followers),Array(20).fill('current'));assert.equal(calls,2);
});

// N11-23: draft saves, follow positions and other state-neutral POSTs must not make a state
// projection fail; a real mutation still advances the generation.
test('state-neutral POSTs do not invalidate the owner state projection', async t => {
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const { startServer } = await import('../src/server.js');
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-state-neutral-'));
  const app = await startServer({ home, port: 0, timers: false, withSeed: false });
  t.after(async () => { await app.close(); fs.rmSync(home, { recursive: true, force: true }); });
  const auth = { authorization: 'Bearer ' + app.token };
  const call = (route, body) => fetch(app.origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(body) });
  const first = await fetch(app.origin + '/api/state?summaries=1', { headers: auth });
  assert.equal(first.status, 200);
  let failures = 0;
  const hammer = (async () => { for (let i = 0; i < 40; i++) await call('/api/preview', { cron: '0 9 * * *', timezone: 'UTC' }); })();
  for (let i = 0; i < 10; i++) { const response = await fetch(app.origin + '/api/state?summaries=1&n=' + i, { headers: auth }); if (response.status !== 200) failures++; }
  await hammer;
  assert.equal(failures, 0);
});
