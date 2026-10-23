import {assertPrivate} from './helpers/permissions.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { RemoteCommandStore } from '../src/services/remote/remote-command-store.js';
import { RemoteCommandJournal } from '../src/services/remote/remote-command-journal.js';
import { RemoteHost } from '../src/services/remote/remote.js';

const now = () => new Date().toISOString();
const homeCleanups = new Map();
function home(t) {
  const dir = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-journal-')), closers = [];
  homeCleanups.set(dir, closers);
  t.after(async () => { for (const close of closers) await close(); fs.rmSync(dir, { recursive: true, force: true }); homeCleanups.delete(dir); });
  return dir;
}
function closeBeforeRemove(dir, close) { homeCleanups.get(dir).push(close); }
function trackedJournal(dir) {
  const journal = new RemoteCommandJournal(dir); closeBeforeRemove(dir, () => journal.close()); return journal;
}
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function host(t, dir) {
  const engine = new EventEmitter(); const remote = new RemoteHost({ home: dir, engine, attachments: { base: dir } });
  const device = { id: 'synthetic-device', resourceAccess: true, documentAccess: true }; remote.config.devices.push(device);
  const peer = { device }; closeBeforeRemove(dir, () => remote.close());
  return { remote, peer, message: { id: randomUUID(), method: 'context.mode', args: { mode: 'manual' }, issuedAt: now() } };
}

test('legacy migration is atomic, preserves bytes/unknown fields and never reimports stale JSON', async t => {
  const dir = home(t), file = path.join(dir, 'remote-commands.json'), at = Date.now();
  const legacy = { old: { digest: 'd', result: { text: 'synthetic' }, at, extension: { version: 2 } }, uncertain: { digest: 'u', pending: true, at: at - 48 * 3600_000 } };
  const bytes = JSON.stringify(legacy, null, 2); fs.writeFileSync(file, bytes);
  let journal = trackedJournal(dir); await journal.ready;
  assert.deepEqual((await journal.claim('old', 'd', 'expired')).previous, legacy.old);
  await journal.claim('new', 'n', now()); await journal.complete('new', 'n', { result: { ok: true } }); await journal.close();
  assert.equal(fs.readFileSync(file, 'utf8'), bytes);
  journal = trackedJournal(dir); await journal.ready;
  assert.deepEqual((await journal.claim('new', 'n', 'expired')).previous.result, { ok: true });
  assert.equal((await journal.claim('uncertain', 'u', 'expired')).previous.pending, true);
  assert.equal((await journal.diagnostics()).records, 3);
  for (const suffix of ['', '-wal', '-shm']) assertPrivate(path.join(dir, 'remote-commands.sqlite' + suffix),0o600);
  await journal.close();
});

test('invalid migration rolls back all entries and can retry safely after legacy repair', t => {
  const dir = home(t), file = path.join(dir, 'remote-commands.json');
  fs.writeFileSync(file, JSON.stringify({ valid: { digest: 'd', at: Date.now(), result: 1 }, invalid: { result: 2 } }));
  assert.throws(() => new RemoteCommandStore(dir), /Invalid legacy/);
  fs.writeFileSync(file, JSON.stringify({ valid: { digest: 'd', at: Date.now(), result: 1 } }));
  const store = new RemoteCommandStore(dir); assert.equal(store.diagnostics().records, 1); store.close();
});

test('byte and count admission preserve full 24h retry results and indefinitely uncertain claims', t => {
  const dir = home(t), store = new RemoteCommandStore(dir, { maxRecords: 3, maxBytes: 1024 }); closeBeforeRemove(dir, () => store.close());
  const at = Date.now(); store.claim('pending', 'p', new Date(at).toISOString(), at);
  store.claim('large', 'l', new Date(at).toISOString(), at); store.complete('large', 'l', { result: 'x'.repeat(2048) }, at);
  assert.ok(store.diagnostics().bytes > 1024);
  assert.throws(() => store.claim('blocked', 'b', new Date(at).toISOString(), at), /history is busy/);
  assert.equal(store.claim('large', 'l', 'expired', at + 23 * 3600_000).previous.result.length, 2048);
  const later = at + 25 * 3600_000;
  store.claim('after-expiry', 'a', new Date(later).toISOString(), later);
  assert.equal(store.diagnostics().records, 2);
  assert.equal(store.claim('pending', 'p', 'expired', later).previous.pending, true);
  assert.throws(() => store.claim('pending', 'changed', 'expired', later), /already used/);
  assert.throws(() => store.claim('stale', 's', new Date(later - 300001).toISOString(), later), /expired/);
  assert.throws(() => store.claim('future', 'f', new Date(later + 300001).toISOString(), later), /expired/);
});

test('count budget refuses protected receipts instead of compacting them after ten minutes', t => {
  const dir = home(t), store = new RemoteCommandStore(dir, { maxRecords: 1 }); closeBeforeRemove(dir, () => store.close());
  const at = Date.now(); store.claim('k', 'd', new Date(at).toISOString(), at); store.complete('k', 'd', { result: 1 }, at);
  const later = at + 660000;
  assert.throws(() => store.claim('n', 'd', new Date(later).toISOString(), later), /history is busy/);
  assert.equal(store.claim('k', 'd', 'expired', later).previous.result, 1);
});

test('transaction write failure retains the durable claim and rolls back counters', t => {
  const dir = home(t), store = new RemoteCommandStore(dir); store.claim('k', 'd', now());
  store.db.exec("CREATE TRIGGER synthetic_failure BEFORE UPDATE ON receipts BEGIN SELECT RAISE(ABORT,'synthetic disk failure'); END;");
  assert.throws(() => store.complete('k', 'd', { result: 2 }), /synthetic disk/);
  assert.equal(store.diagnostics().pending, 1); store.close();
  const restarted = new RemoteCommandStore(dir); closeBeforeRemove(dir, () => restarted.close());
  assert.equal(restarted.claim('k', 'd', 'expired').previous.pending, true);
});

test('concurrent duplicates share one durable claim/effect, mismatches reject, and errors replay', async t => {
  const dir = home(t), { remote, peer, message } = host(t, dir), gate = deferred(), entered = deferred(); let effects = 0;
  remote.execute = async () => { effects++; entered.resolve(); await gate.promise; return { ok: true }; };
  const first = remote.command(peer, message), duplicate = remote.command(peer, message); await entered.promise;
  await assert.rejects(remote.command(peer, { ...message, args: { mode: 'other' } }), /already used/);
  gate.resolve(); assert.deepEqual(await first, await duplicate); assert.equal(effects, 1);
  assert.deepEqual(await remote.command(peer, { ...message, issuedAt: 'expired' }), { ok: true });
  remote.execute = async () => { effects++; throw new Error('synthetic execution failure'); };
  const failed = { ...message, id: randomUUID() };
  await assert.rejects(remote.command(peer, failed), /synthetic execution/);
  await assert.rejects(remote.command(peer, failed), /synthetic execution/); assert.equal(effects, 2);
  const diagnostics = await remote.commandDiagnostics(); assert.equal(diagnostics.records, 2); assert.equal(diagnostics.methods['context.mode'], 6);
  assert.equal(Object.hasOwn(remote, 'ledger'), false);
});

test('worker crash after an effect leaves uncertain receipt on restart and never reexecutes', async t => {
  const dir = home(t), { remote, peer, message } = host(t, dir), entered = deferred(), gate = deferred(); let effects = 0;
  remote.execute = async () => { effects++; entered.resolve(); await gate.promise; return { done: true }; };
  const task = remote.command(peer, message); await entered.promise; await remote.commandJournal.worker.terminate(); gate.resolve();
  await assert.rejects(task, /outcome is uncertain/); await remote.close();
  const next = host(t, dir); next.remote.execute = async () => { effects++; };
  await assert.rejects(next.remote.command(next.peer, message), /previous command outcome is uncertain/); assert.equal(effects, 1);
});

test('result serialization failure leaves uncertain claim instead of storing a false execution error', async t => {
  const dir = home(t), { remote, peer, message } = host(t, dir); let effects = 0;
  remote.execute = async () => { effects++; return { unsupported: () => true }; };
  await assert.rejects(remote.command(peer, message), /outcome is uncertain/);
  await assert.rejects(remote.command(peer, message), /previous command outcome is uncertain/); assert.equal(effects, 1);
  assert.equal((await remote.commandJournal.diagnostics()).pending, 1);
});

test('journal initialization failure prevents effects and read-only commands continue', async t => {
  const dir = home(t); fs.writeFileSync(path.join(dir, 'remote-commands.json'), '{broken');
  const { remote, peer, message } = host(t, dir); let effects = 0; remote.execute = async () => { effects++; return {}; };
  await assert.rejects(remote.command(peer, message)); assert.equal(effects, 0);
  assert.deepEqual(await remote.command(peer, { method: 'sync', args: {} }), {}); assert.equal(effects, 1);
});

test('permission revocation while claim or replay is pending blocks effect/result', async t => {
  const dir = home(t), { remote, peer, message } = host(t, dir); message.method = 'tabs.mutate'; message.args = { operations: [{ type: 'open', tab: { type: 'document', id: 'document:synthetic' } }] };
  const original = remote.commandJournal.claim.bind(remote.commandJournal), entered = deferred(), gate = deferred(); let effects = 0;
  remote.commandJournal.claim = async (...args) => { const result = await original(...args); entered.resolve(); await gate.promise; return result; };
  remote.execute = async () => { effects++; return { tabs: [] }; };
  const task = remote.command(peer, message); await entered.promise; peer.device.documentAccess = false; gate.resolve();
  await assert.rejects(task, /not enabled/); assert.equal(effects, 0);
  peer.device.documentAccess = true; remote.commandJournal.claim = original;
  await assert.rejects(remote.command(peer, message), /uncertain/);
});

test('revocation during an executing resource command blocks both concurrent replies and later replay', async t => {
  const dir = home(t), { remote, peer, message } = host(t, dir); message.method = 'resources.action';
  const entered = deferred(), gate = deferred(); remote.execute = async () => { entered.resolve(); await gate.promise; return { private: 'synthetic' }; };
  const first = remote.command(peer, message), second = remote.command(peer, message); await entered.promise;
  peer.device.resourceAccess = false; gate.resolve();
  await assert.rejects(first, /not enabled/); await assert.rejects(second, /not enabled/);
  await assert.rejects(remote.command(peer, message), /not enabled/);
  assert.equal((await remote.commandJournal.diagnostics()).pending, 0);
});

test('graceful close drains an active completion before closing worker and rejects fresh mutations', async t => {
  const dir = home(t), { remote, peer, message } = host(t, dir), entered = deferred(), gate = deferred();
  remote.execute = async () => { entered.resolve(); await gate.promise; return { ok: true }; };
  const task = remote.command(peer, message); await entered.promise; const closing = remote.close();
  await assert.rejects(remote.command(peer, { ...message, id: randomUUID() }), /closing/);
  gate.resolve(); await task; await closing;
  const restarted = trackedJournal(dir); assert.deepEqual((await restarted.claim(`${peer.device.id}:${message.id}`, (await import('node:crypto')).createHash('sha256').update(JSON.stringify(['context.mode', { mode: 'manual' }])).digest('hex'), 'expired')).previous.result, { ok: true }); await restarted.close();
});

test('committed write counters distinguish incremental updates from migration/replay and failed writes', t => {
  const dir = home(t); fs.writeFileSync(path.join(dir, 'remote-commands.json'), JSON.stringify({ migrated: { digest: 'm', result: 'x'.repeat(1024 * 1024), at: Date.now() } }));
  const store = new RemoteCommandStore(dir); closeBeforeRemove(dir, () => store.close());
  store.claim('migrated', 'm', 'expired'); store.claim('new', 'n', now()); store.complete('new', 'n', { result: { ok: true } });
  store.claim('new', 'n', 'expired');
  const metrics = store.diagnostics(); assert.equal(metrics.migrationRecords, 1); assert.ok(metrics.migrationBytes > 1024 * 1024);
  assert.equal(metrics.claimWrites, 1); assert.equal(metrics.resultWrites, 1); assert.ok(metrics.payloadBytesWritten < 1024);
});

test('streamed legacy import handles chunk-boundary unicode, escaped delimiters, nesting and trailing corruption', t => {
  const dir = home(t), file = path.join(dir, 'remote-commands.json');
  const record = { digest: 'd', at: Date.now(), result: { nested: [{ value: '\\"{},[]🙂é'.repeat(12000) }], optional: null } };
  fs.writeFileSync(file, JSON.stringify({ 'escaped:"🙂': record }));
  let store = new RemoteCommandStore(dir); assert.deepEqual(store.claim('escaped:"🙂', 'd', 'expired').previous, record); store.close();
  const invalidDir = home(t); fs.writeFileSync(path.join(invalidDir, 'remote-commands.json'), JSON.stringify({ k: record }) + ' broken');
  assert.throws(() => new RemoteCommandStore(invalidDir), /trailing data/);
  fs.writeFileSync(path.join(invalidDir, 'remote-commands.json'), '{}'); store = new RemoteCommandStore(invalidDir); assert.equal(store.diagnostics().records, 0); store.close();
});

test('corrupt SQLite fails closed despite valid legacy backup', async t => {
  const dir = home(t); fs.writeFileSync(path.join(dir, 'remote-commands.sqlite'), 'synthetic corrupt database');
  fs.writeFileSync(path.join(dir, 'remote-commands.json'), '{}'); const { remote, peer, message } = host(t, dir); let effects = 0;
  remote.execute = async () => { effects++; }; await assert.rejects(remote.command(peer, message)); assert.equal(effects, 0);
});

test('failed claim write prevents external effects', async t => {
  const dir = home(t), { remote, peer, message } = host(t, dir); let effects = 0;
  remote.commandJournal.claim = async () => { throw new Error('synthetic write failure'); };
  remote.execute = async () => { effects++; }; await assert.rejects(remote.command(peer, message), /write failure/); assert.equal(effects, 0);
});

test('interrupted streaming migration rolls back and reimports every receipt exactly once', async t => {
  const dir = home(t), count = 2500, payload = 'synthetic'.repeat(512), at = Date.now();
  fs.writeFileSync(path.join(dir, 'remote-commands.json'), JSON.stringify(Object.fromEntries(Array.from({ length: count }, (_, i) => ['legacy:' + i, { digest: 'd', at, result: payload }]))));
  const first = trackedJournal(dir); let finished = false; first.ready.then(() => { finished = true; }, () => {});
  const wal = path.join(dir, 'remote-commands.sqlite-wal'), deadline = Date.now() + 10000;
  let spilled = false;
  while (Date.now() < deadline && !finished) {
    try { if (fs.statSync(wal).size > 4 * 1024 * 1024) { spilled = true; break; } } catch { /* Worker is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  assert.equal(spilled, true, 'migration must spill an uncommitted transaction before interruption');
  await first.worker.terminate(); await assert.rejects(first.ready); await first.close();
  const restarted = trackedJournal(dir); await restarted.ready;
  assert.equal((await restarted.diagnostics()).records, count);
  assert.equal((await restarted.claim('legacy:' + (count - 1), 'd', 'expired')).previous.result, payload);
  await restarted.close();
});

test('revocation during asynchronous replay prevents a protected saved result', async t => {
  const dir = home(t), { remote, peer, message } = host(t, dir); message.method = 'resources.action';
  remote.execute = async () => ({ private: 'synthetic' }); await remote.command(peer, message);
  const original = remote.commandJournal.claim.bind(remote.commandJournal), entered = deferred(), gate = deferred();
  remote.commandJournal.claim = async (...args) => { const result = await original(...args); entered.resolve(); await gate.promise; return result; };
  const replay = remote.command(peer, message); await entered.promise; peer.device.resourceAccess = false; gate.resolve();
  await assert.rejects(replay, /not enabled/);
});
