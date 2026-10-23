import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UsageCache, ProviderUsageCache, normalizeProviderUsage } from '../src/services/telemetry/usage.js';
import { usageSummary, providerUsageSummary } from '../public/features/settings/usage.js';
import { agentName } from '../public/features/chats/agent-name.js';
import { CopilotProvider } from '../src/providers/copilot.js';
import { Engine } from '../src/engine.js';
import { remoteRun } from '../src/services/remote/remote.js';
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
test('Copilot usage gets a fresh same-profile process each time without touching an active chat', async () => {
  const homes=[],probes=[],active={stops:0,stop:async()=>{active.stops++;}};
  const provider = new CopilotProvider({}, {settings:{get:()=>({copilotDataDirectory:'/existing-profile'})},quotaClientFactory:home=>{homes.push(home);const index=probes.length,probe={started:0,stopped:0,start:async()=>{probe.started++;},stop:async()=>{probe.stopped++;},rpc:{account:{getQuota:async()=>quota(index===0?80:75)}}};probes.push(probe);return probe;}});
  provider.client=active;provider.starting=Promise.resolve();provider.baseDirectory='/existing-profile';provider.sessions.set('active-chat',{});provider.connect=async()=>{throw new Error('Must not reconnect the running chat');};
  const first=await Promise.all([provider.quota(),provider.quota()]);assert.deepEqual(first,[quota(80),quota(80)]);
  assert.deepEqual(await provider.quota(),quota(75));assert.deepEqual(homes,['/existing-profile','/existing-profile']);assert.deepEqual(probes.map(item=>[item.started,item.stopped]),[[1,1],[1,1]]);
  assert.equal(active.stops,0);assert.equal(provider.sessions.has('active-chat'),true);assert.equal(provider.baseDirectory,'/existing-profile');
});
test('default fresh quota probes preserve the connected account auth instead of disabling Keychain', async () => {
  for (const options of [{logLevel:'warning'},{gitHubToken:'synthetic-test-credential',useLoggedInUser:false,logLevel:'warning'}]) {
    const clients=[],captured=[];
    const provider=new CopilotProvider(options,{settings:{get:()=>({copilotDataDirectory:'/synthetic-profile'})},clientFactory:value=>{
      captured.push(value);
      const keychainDisabled=value.mode==='empty';
      const client={stops:0,start:async()=>{},stop:async()=>{client.stops++;},getAuthStatus:async()=>({isAuthenticated:true,login:keychainDisabled?'other-cli-account':'conversation-account'}),rpc:{account:{getQuota:async()=>keychainDisabled?{quotaSnapshots:{}}:quota(61)}}};
      clients.push(client);return client;
    }});
    const active=await provider.connect();provider.sessions.set('synthetic-active-chat',{});
    const cache=new ProviderUsageCache({copilot:provider});
    const reading=(await cache.get(true)).providers.copilot;
    assert.equal(reading.available,true);
    assert.equal(providerUsageSummary(reading).remaining,61);
    assert.deepEqual(captured[1],{...captured[0],logLevel:'none'});
    assert.notEqual(clients[0],clients[1]);
    assert.equal((await clients[1].getAuthStatus()).login,(await active.getAuthStatus()).login);
    assert.equal(active.stops,0);assert.equal(clients[1].stops,1);
    assert.equal(provider.sessions.has('synthetic-active-chat'),true);
    await provider.close();
  }
});
test('Copilot quota probes time out at start or RPC, force stop, and permit a fresh retry', async () => {
  for (const stalledAt of ['start','getQuota']) {
    const probes=[];
    const provider=new CopilotProvider({}, {quotaTimeoutMs:15,quotaStopTimeoutMs:15,quotaClientFactory:()=>{
      const index=probes.length;
      const probe={stops:0,forced:0,start:()=>index===0&&stalledAt==='start'?new Promise(()=>{}):Promise.resolve(),stop:()=>{probe.stops++;return Promise.reject(new Error('stop failed'));},forceStop:async()=>{probe.forced++;},rpc:{account:{getQuota:()=>index===0&&stalledAt==='getQuota'?new Promise(()=>{}):Promise.resolve(quota(75))}}};
      probes.push(probe);return probe;
    }});
    await assert.rejects(provider.quota(),/Fresh Copilot allowance unavailable/);
    assert.deepEqual([probes[0].stops,probes[0].forced],[1,1]);
    assert.equal(provider.quotaPending,null);
    assert.deepEqual(await provider.quota(),quota(75));
    assert.deepEqual([probes[1].stops,probes[1].forced],[1,1]);
  }
});
test('Copilot close cancels a hung quota read and bounded cleanup survives a hung stop', async () => {
  let started;
  const began=new Promise(resolve=>{started=resolve;});
  const probe={forced:0,start:async()=>{},rpc:{account:{getQuota:()=>{started();return new Promise(()=>{});}}},stop:()=>new Promise(()=>{}),forceStop:async()=>{probe.forced++;}};
  const provider=new CopilotProvider({}, {quotaTimeoutMs:1000,quotaStopTimeoutMs:15,quotaClientFactory:()=>probe});
  const pending=provider.quota();await began;
  await Promise.all([provider.close(),provider.close()]);
  await assert.rejects(pending,/Fresh Copilot allowance unavailable/);
  assert.equal(probe.forced,1);
  assert.equal(provider.quotaPending,null);
});
test('provider allowance refreshes after five active minutes or one idle hour and invalidates exact provider', async () => {
  let now=1000,copilotReads=0,codexReads=0;
  const cache=new ProviderUsageCache({copilot:async()=>{copilotReads++;return {windows:[]};},codex:async()=>{codexReads++;return {windows:[]};}},()=>now);
  await cache.get();assert.deepEqual([copilotReads,codexReads],[1,1]);
  cache.setActive(false);now+=3_599_999;await cache.get();assert.deepEqual([copilotReads,codexReads],[1,1]);
  now++;await cache.get();assert.deepEqual([copilotReads,codexReads],[2,2]);
  cache.invalidate('codex');await cache.get();assert.deepEqual([copilotReads,codexReads],[2,3]);
  cache.setActive(true);now+=299_999;await cache.get();assert.deepEqual([copilotReads,codexReads],[2,3]);
  now++;await cache.get();assert.deepEqual([copilotReads,codexReads],[3,4]);
});
test('Copilot missing or past reset is labeled as a monthly expectation without inventing refreshed allowance or billing type', () => {
  const now=Date.parse('2026-10-05T12:00:00Z');
  const value=normalizeProviderUsage('copilot',{quotaSnapshots:{premium_interactions:{remainingPercentage:34,resetDate:'2026-10-01T00:00:00Z'}}},now).windows[0];
  assert.equal(value.remainingPercent,34);assert.equal(value.resetAt,'2026-11-01T00:00:00.000Z');assert.equal(value.reportedResetAt,'2026-10-01T00:00:00.000Z');assert.equal(value.resetSource,'expected-monthly');assert.equal(value.label,'Copilot allowance');assert.match(value.billingNote,/unverified/);
  const valid=normalizeProviderUsage('copilot',{billingMode:'premium-requests',quotaSnapshots:{premium_interactions:{remainingPercentage:28,resetDate:'2026-10-30T00:00:00Z'}}},now).windows[0];
  assert.equal(valid.resetSource,'provider');assert.equal(valid.label,'Premium requests');assert.equal(valid.resetAt,'2026-10-30T00:00:00.000Z');
  const nearNow=normalizeProviderUsage('copilot',{quotaSnapshots:{premium_interactions:{remainingPercentage:28,resetDate:'2026-10-05T12:00:05Z'}}},now).windows[0];
  assert.equal(nearNow.resetSource,'expected-monthly');assert.equal(nearNow.reportedResetAt,'2026-10-05T12:00:05.000Z');
});
test('agent identity uses captured main agent and survives later context changes and remote projection', async () => {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-identity-')); const engine = new Engine(home); engine.drain = async () => {};
  try {
    const schedule = { schemaVersion: 1, id: 'identity', name: 'Identity', enabled: false, cron: '0 9 * * 1-5', timezone: 'UTC', provider: 'rehearsal', model: '', workspace: { cwd: home, additionalDirectories: [] }, misfire: 'skip', prompt: 'Hello', context: { agentId: 'a', entries: [{ id: 'a', kind: 'agent', name: 'Milo' }, { id: 'b', kind: 'agent', name: 'Atlas' }] } };
    const run = engine.createRun(schedule); engine.event(run, 'assistant', 'First response');
    run.schedule.context.agentId = 'b'; engine.event(run, 'assistant', 'Second response');
    const remote = remoteRun(run); assert.equal(remote.agentName, 'Atlas');
    assert.deepEqual(remote.events.filter(e => e.role === 'assistant').map(e => e.agentName), ['Milo', 'Atlas']);
    assert.equal(agentName({ schedule: { provider: 'copilot' } }), 'Copilot');
  } finally { await engine.close(); fs.rmSync(home, { recursive: true, force: true }); }
});
