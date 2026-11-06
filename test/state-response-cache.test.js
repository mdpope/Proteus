import test from 'node:test';
import assert from 'node:assert/strict';
import { StateResponseCache } from '../src/services/state/state-response-cache.js';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('windows share one projection; owner changes discard in-flight results and cached permission displays', async () => {
  let revision = 1, calls = 0, now = 0;
  const cache = new StateResponseCache({ stamp: () => revision, clock: () => now });
  const gate = deferred();
  const produce = () => { calls++; return calls === 1 ? gate.promise : Promise.resolve('new'); };
  const first = cache.get('summaries', produce), second = cache.get('summaries', produce);
  assert.equal(calls, 1);
  revision++; gate.resolve('stale');
  assert.deepEqual(await Promise.all([first, second]), ['new', 'new']); assert.equal(calls, 2);
  assert.equal(await cache.get('summaries', produce), 'new'); assert.equal(calls, 2);
  revision++; await cache.get('summaries', produce); assert.equal(calls, 3);
  now = 301; await cache.get('summaries', produce); assert.equal(calls, 4);
});

test('repeated mutations and overloaded refreshes terminate with bounded retry, retaining no failed result', async () => {
  let revision = 1, calls = 0;
  const cache = new StateResponseCache({ stamp: () => revision, maxPending: 1 });
  await assert.rejects(cache.get('moving', async () => { calls++; revision++; return 'obsolete'; }), /changed/);
  assert.equal(calls, 2); assert.equal(cache.cache.size, 0);
  const gate = deferred(), first = cache.get('one', () => gate.promise);
  revision++;
  const newer=cache.get('one', async () => 'new');const newerRejected=assert.rejects(newer,/worker failure/);
  await assert.rejects(cache.get('two', async () => 'new'), /busy/);
  const rejected = assert.rejects(first, /worker failure/); gate.reject(Error('worker failure')); await rejected;await newerRejected;
  assert.equal(cache.active.size, 0); assert.equal(cache.pending.size, 0);
  assert.equal(await cache.get('one', async () => 'recovered'), 'recovered');
  cache.clear(); assert.equal(cache.cache.size, 0);
});

test('different generations of the same view coalesce before a fresh snapshot',async()=>{
 let revision=1,calls=0;const cache=new StateResponseCache({stamp:()=>revision,maxPending:1});const gate=deferred();
 const produce=()=>{calls++;return calls===1?gate.promise:Promise.resolve('current');};
 const first=cache.get('view',produce);revision++;
 const followers=Array.from({length:20},()=>cache.get('view',produce));assert.equal(calls,1);
 gate.resolve('obsolete');assert.deepEqual(await Promise.all([first,...followers]),Array(21).fill('current'));assert.equal(calls,2);
});
