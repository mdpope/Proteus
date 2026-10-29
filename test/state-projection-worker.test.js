import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { privateTemporaryDirectory } from '../src/shared/private-paths.cjs';
import { PermissionStore, PermissionProjection } from '../src/services/settings/permissions.js';
import { automaticProviderFolders } from '../src/services/settings/provider-folders.js';
import { StateProjectionClient } from '../src/services/state/state-projection-client.js';
import { permissionDisplaySchedule } from '../src/services/state/state-projection.js';

const empty = () => ({ state: { runs: [], permissions: { workspaces: [] } }, runs: [], schedules: [], defaults: [], preserveInheritedDefaults: true });
const workerURL = new URL('./helpers/state-projection-worker.js', import.meta.url);
async function entered(gate) {
  for (let i = 0; i < 500 && Atomics.load(gate, 0) !== 1; i++) await delay(10);
  assert.equal(Atomics.load(gate, 0), 1, 'worker entered the blocked operation');
}

test('500 permission displays match owner semantics without owner filesystem resolutions or state mutations', async () => {
  const home = fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-state-worker-')));
  const client = new StateProjectionClient();
  try {
    const roots = Array.from({ length: 12 }, (_, i) => path.join(home, 'root-' + i));
    roots.forEach(root => fs.mkdirSync(root));
    const defaults = { mode: 'custom', workingRoots: roots, folders: [{ path: roots[2], access: 'read' }], rules: [], readOnlyTools: true };
    const store = new PermissionStore(home, { preserveInheritedDefaults: true });
    store.workspaceDefaults = () => defaults;
    store.automaticProviderFolders = (run, resolve) => automaticProviderFolders(run, run.providerHome, resolve);
    const runs = Array.from({ length: 500 }, (_, i) => ({ id: 'synthetic-' + i, providerHome: home, schedule: {
      name: 'Synthetic ' + i, provider: i % 2 ? 'claude' : 'rehearsal', workspace: { cwd: home, additionalDirectories: roots },
      context: { workspaceId: 'synthetic', baseWorkspace: { cwd: home, additionalDirectories: roots }, entries: [{ id: 'skill', kind: 'skill', hash: 'hash', content: 'must not enter permission input' }] },
      skillDirectories: roots, mcpServers: {}, ref: { runId: 'synthetic-' + i }, prompt: 'private source text',
      ...(i % 3 ? {} : { permissionScope: { kind: 'schedule', id: 'schedule' }, executionPermissions: { mode: 'custom', folders: [{ path: roots[3], access: 'read' }], rules: [] } })
    } }));
    const snapshot = store.snapshot(), expected = runs.map(run => store.describeRun(run, snapshot)), expectedWorkspaces = store.describeMany(runs.map(run => run.schedule), snapshot);
    const input = { ...empty(), state: { permissions: snapshot.value, runs: runs.map(run => ({ id: run.id })) },
      runs: runs.map(run => ({ ...run, schedule: permissionDisplaySchedule(run.schedule) })), schedules: runs.map(run => permissionDisplaySchedule(run.schedule)), defaults: [['synthetic', defaults]] };
    assert.ok(!JSON.stringify(input).includes('must not enter')); assert.ok(!JSON.stringify(input).includes('private source text'));
    const before = JSON.stringify(input), original = fs.realpathSync;
    let ownerResolutions = 0;
    fs.realpathSync = function (...args) { if (String(args[0]).startsWith(home)) ownerResolutions++; return original.apply(this, args); };
    let result;
    try { result = JSON.parse(await client.serialize(input)); } finally { fs.realpathSync = original; }
    assert.equal(ownerResolutions, 0);
    assert.deepEqual(result.runs.map(run => run.permissionContext), JSON.parse(JSON.stringify(expected)));
    assert.deepEqual(result.permissionWorkspaces, JSON.parse(JSON.stringify(expectedWorkspaces)));
    assert.equal(JSON.stringify(input), before);
    const projection = new PermissionProjection();
    assert.equal(projection.decide, undefined); assert.equal(projection.mutate, undefined); assert.equal(projection.get, undefined);
  } finally { await client.close(); fs.rmSync(home, { recursive: true, force: true }); }
  assert.equal(client.diagnostics().failures, 0, 'normal shutdown is not a worker failure');
});

test('blocked worker leaves owner responsive, bounds queued snapshots, and clones before yielding', async () => {
  const client = new StateProjectionClient({ workerURL, maxPending: 1 });
  const gate = new Int32Array(new SharedArrayBuffer(4)), input = empty(); input.state.gate = gate.buffer; input.state.version = 'captured';
  try {
    const result = client.serialize(input); input.state.version = 'changed';
    await entered(gate);
    await assert.rejects(client.serialize(empty()), /busy/);
    let pulses = 0; const timer = setInterval(() => pulses++, 5);
    await delay(50); clearInterval(timer);
    assert.ok(pulses >= 3, 'owner event loop keeps running while worker is blocked');
    assert.equal(Atomics.load(gate, 0), 1);
    Atomics.store(gate, 0, 2); Atomics.notify(gate, 0);
    assert.equal(JSON.parse(await result).version, 'captured');
  } finally { await client.close(); }
});

test('timeout and worker crash reject pending work, terminate, and permit a clean later worker', async () => {
  const client = new StateProjectionClient({ workerURL, timeoutMs: 500 });
  try {
    const input = empty(); input.state.gate = new SharedArrayBuffer(4);
    await assert.rejects(client.serialize(input), /timed out/);
    await client.termination;
    assert.equal(client.diagnostics().activeRequests, 0);
    assert.equal(JSON.parse(await client.serialize(empty())).runs.length, 0);
    const crash = empty(); crash.state.crash = true;
    await assert.rejects(client.serialize(crash), /stopped/);
    await client.termination;
    assert.equal(JSON.parse(await client.serialize(empty())).runs.length, 0);
  } finally { await client.close(); }
});

test('malformed input fails without synchronous fallback; closing rejects active work and further calls', async () => {
  const client = new StateProjectionClient({ workerURL });
  await assert.rejects(client.serialize({}), /./);
  await client.termination;
  const input = empty(), gate = new Int32Array(new SharedArrayBuffer(4)); input.state.gate = gate.buffer;
  const result = client.serialize(input), rejected = assert.rejects(result, /closed/);
  await entered(gate); await client.close(); await rejected;
  await assert.rejects(client.serialize(empty()), /unavailable/);
});
