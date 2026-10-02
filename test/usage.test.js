import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UsageCache } from '../src/usage.js';
import { usageSummary } from '../public/usage.js';
import { agentName } from '../public/agent-name.js';
import { CopilotProvider } from '../src/copilot.js';
import { Engine } from '../src/engine.js';
import { remoteRun } from '../src/remote.js';
const quota = remainingPercentage => ({ quotaSnapshots: { premium_interactions: { remainingPercentage, isUnlimitedEntitlement: false }, chat: { isUnlimitedEntitlement: true } } });
test('sidebar uses premium allowance and distinguishes unknown, exhausted, and unlimited', () => {
  assert.equal(usageSummary({ quota: quota(62.5) }).label, '62.5% remaining');
  assert.match(usageSummary({ quota: quota(62.5) }).detail, /37.5% used/);
  assert.equal(usageSummary({ quota: quota(0) }).remaining, 0);
  assert.equal(usageSummary({ quota: quota(null) }).remaining, null);
  assert.equal(usageSummary({ quota: { quotaSnapshots: { chat: { remainingPercentage: 100 } } } }).label, 'Usage unavailable');
  assert.equal(usageSummary({ quota: quota(200) }).remaining, 100);
  const unlimited = quota(0); unlimited.quotaSnapshots.premium_interactions.isUnlimitedEntitlement = true;
  assert.equal(usageSummary({ quota: unlimited }).label, 'Unlimited');
});
test('usage cache coalesces reads, refreshes after five minutes and labels failed refreshes stale', async () => {
  let calls = 0, now = 1, fail = false;
  const cache = new UsageCache(async () => { calls++; await Promise.resolve(); if (fail) throw new Error('Offline'); return quota(75); }, () => now);
  await Promise.all([cache.get(), cache.get()]); assert.equal(calls, 1);
  now += 299999; await cache.get(); assert.equal(calls, 1);
  now++; await cache.get(); assert.equal(calls, 2);
  fail = true; const stale = await cache.get(true); assert.equal(calls, 3); assert.equal(stale.quota.quotaSnapshots.premium_interactions.remainingPercentage, 75);
  assert.equal(usageSummary(stale).stale, true);
  now += 59000; await cache.get(); assert.equal(calls, 3);
  now += 1000; fail = false; assert.equal((await cache.get()).error, null);
});
test('usage polling reuses an active Copilot client without changing its profile or sessions', async () => {
  const provider = new CopilotProvider(); provider.starting = Promise.resolve(); provider.baseDirectory = '/existing-profile';
  provider.client = { rpc: { account: { getQuota: async () => quota(80) } } };
  provider.connect = async () => { throw new Error('Must not reconnect'); };
  assert.deepEqual(await provider.quota(), quota(80)); assert.equal(provider.baseDirectory, '/existing-profile');
});
test('agent identity uses captured main agent and survives later context changes and remote projection', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-identity-')); const engine = new Engine(home); engine.drain = async () => {};
  try {
    const schedule = { schemaVersion: 1, id: 'identity', name: 'Identity', enabled: false, cron: '0 9 * * 1-5', timezone: 'UTC', provider: 'rehearsal', model: '', workspace: { cwd: home, additionalDirectories: [] }, misfire: 'skip', prompt: 'Hello', context: { agentId: 'a', entries: [{ id: 'a', kind: 'agent', name: 'Milo' }, { id: 'b', kind: 'agent', name: 'Atlas' }] } };
    const run = engine.createRun(schedule); engine.event(run, 'assistant', 'First response');
    run.schedule.context.agentId = 'b'; engine.event(run, 'assistant', 'Second response');
    const remote = remoteRun(run); assert.equal(remote.agentName, 'Atlas');
    assert.deepEqual(remote.events.filter(e => e.role === 'assistant').map(e => e.agentName), ['Milo', 'Atlas']);
    assert.equal(agentName({ schedule: { provider: 'copilot' } }), 'Copilot');
  } finally { await engine.close(); fs.rmSync(home, { recursive: true, force: true }); }
});
