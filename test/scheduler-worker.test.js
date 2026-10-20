import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { Engine } from '../src/engine.js';
import { SchedulerWorker } from '../src/scheduler-client.js';
import { atomicJSON, readJSON } from '../src/files.js';

const schedule = cwd => ({ schemaVersion: 1, id: 'sample', name: 'Sample', enabled: true, cron: '* * * * *', timezone: 'UTC', provider: 'rehearsal', model: '', workspace: { cwd, additionalDirectories: [] }, misfire: 'coalesce', prompt: 'Synthetic test.' });
const before = '2026-09-30T14:59:59.000Z', due = '2026-09-30T15:00:00.000Z';
const fixture = new URL('./fixtures/scheduler-writer.js', import.meta.url);
const waitUntil = async predicate => {
  for (let i = 0; i < 200; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  throw new Error('Condition timed out.');
};
function setup({ writer, initialJournal } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-scheduler-'));
  if (initialJournal) atomicJSON(path.join(home, 'scheduler.json'), initialJournal);
  let now = new Date(before), effects = 0;
  const provider = { async run() { effects++; } };
  const engine = new Engine(home, { rehearsal: provider }, () => now);
  if (writer) engine.schedulerWorker = new SchedulerWorker(home, { workerURL: fixture, workerData: writer });
  return { home, engine, provider, time: value => { now = new Date(value); }, effects: () => effects, async cleanup() { await engine.close(); fs.rmSync(home, { recursive: true, force: true }); } };
}

test('overlapping ticks serialize claims and retain only the newest waiting poll', async () => {
  const state = setup({ writer: { delayMs: 80 } });
  const { engine, home } = state;
  try {
    engine.schedules.save(schedule(home)); state.time('2026-09-30T15:00:01Z');
    const first = engine.tick();
    state.time('2026-09-30T15:01:01Z'); const second = engine.tick();
    state.time('2026-09-30T15:02:01Z'); const third = engine.tick();
    state.time('2026-09-30T15:03:01Z'); const fourth = engine.tick();
    assert.equal(second, first); assert.equal(third, first); assert.equal(fourth, first);
    await Promise.all([first, second, third, fourth]);
    assert.deepEqual(engine.listRuns().map(run => run.slot).sort(), [due, '2026-09-30T15:03:00.000Z']);
    assert.equal(state.effects(), 2);
    assert.equal(readJSON(path.join(home, 'scheduler.json')).lastPoll, '2026-09-30T15:03:01.000Z');
    assert.equal(engine.schedulerWorker.diagnostics().activeRequests, 0);
  } finally { await state.cleanup(); }
});

test('failed checkpoint retries the old poll without replaying a completed durable claim', async () => {
  const state = setup({ writer: { failFirstWrite: true } }), { engine, home } = state;
  try {
    engine.schedules.save(schedule(home)); state.time('2026-09-30T15:00:01Z');
    await assert.rejects(engine.tick(), /checkpoint write failure/);
    assert.equal(engine.journal.lastPoll, before);
    await waitUntil(() => engine.listRuns()[0].status === 'completed');
    await engine.tick();
    assert.equal(engine.listRuns().length, 1); assert.equal(state.effects(), 1);
    assert.equal(engine.journal.slots.sample, due);
    assert.equal(engine.schedulerWorker.diagnostics().failures, 1);
  } finally { await state.cleanup(); }
});

test('a failed initial run claim cannot execute through another drain and remains retryable', async () => {
  const state = setup(), { engine, home } = state;
  const originalPersist = engine.persist;
  try {
    engine.schedules.save(schedule(home)); state.time('2026-09-30T15:00:01Z');
    engine.persist = () => { throw new Error('Injected claim write failure'); };
    await assert.rejects(engine.tick(), /claim write failure/);
    await engine.drain();
    assert.equal(engine.listRuns().length, 0); assert.equal(state.effects(), 0);
    assert.equal(engine.journal.lastPoll, before);
    engine.persist = originalPersist;
    await engine.tick(); await waitUntil(() => state.effects() === 1);
    assert.equal(engine.listRuns().length, 1);
  } finally { engine.persist = originalPersist; await state.cleanup(); }
});

test('shutdown waits for an accepted checkpoint and terminates its worker', async () => {
  const state = setup(), { engine, home } = state;
  const startedFile = path.join(home, 'write-started');
  engine.schedulerWorker = new SchedulerWorker(home, { workerURL: fixture, workerData: { startedFile, delayMs: 200 } });
  try {
    state.time('2026-09-30T15:00:01Z'); const ticking = engine.tick();
    await waitUntil(() => fs.existsSync(startedFile));
    let closed = false; const closing = engine.close().then(() => { closed = true; });
    await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(closed, false);
    await Promise.all([ticking, closing]);
    assert.equal(readJSON(path.join(home, 'scheduler.json')).lastPoll, '2026-09-30T15:00:01.000Z');
    assert.equal(engine.schedulerWorker.worker.threadId, -1);
    await engine.tick(); assert.equal(engine.schedulerWorker.diagnostics().activeRequests, 0);
  } finally { await state.cleanup(); }
});

test('shutdown during a scan leaves the old poll and never starts a new run', async () => {
  const state = setup(), { engine, home } = state;
  try {
    engine.schedules.save(schedule(home)); state.time('2026-09-30T15:00:01Z');
    const ticking = engine.tick(); await engine.close(); await ticking;
    assert.equal(engine.journal.lastPoll, before);
    assert.equal(engine.listRuns().length, 0); assert.equal(state.effects(), 0);
    assert.equal(engine.schedulerWorker.worker.threadId, -1);
  } finally { await state.cleanup(); }
});

test('worker failure rejects polling and is visible without advancing the journal', async () => {
  const state = setup(), { engine, home } = state;
  try {
    engine.schedules.save(schedule(home)); state.time('2026-09-30T15:00:01Z');
    engine.schedulerWorker = new SchedulerWorker(home);
    const exited = once(engine.schedulerWorker.worker, 'exit');
    await engine.schedulerWorker.worker.terminate(); await exited;
    await assert.rejects(engine.tick(), /Scheduler worker stopped/);
    assert.equal(engine.journal.lastPoll, before); assert.equal(state.effects(), 0);
    assert.equal(engine.schedulerWorker.diagnostics().worker, 'failed');
    await assert.rejects(engine.tick(), /Scheduler worker stopped/);
  } finally { await state.cleanup(); }
});

test('restart honors completed persisted runs when the checkpoint is stale', async () => {
  const state = setup(), { engine, home } = state;
  let restored;
  try {
    engine.schedules.save(schedule(home)); state.time('2026-09-30T15:00:01Z');
    await engine.tick(); await waitUntil(() => engine.listRuns()[0].status === 'completed');
    await engine.close(); atomicJSON(path.join(home, 'scheduler.json'), { lastPoll: before, slots: {} });
    restored = new Engine(home, { rehearsal: state.provider }, () => new Date('2026-09-30T15:00:01Z'));
    await restored.tick();
    assert.equal(restored.listRuns().length, 1); assert.equal(state.effects(), 1);
    assert.equal(restored.journal.slots.sample, due);
  } finally { await restored?.close(); await state.cleanup(); }
});

test('polling reads equal-size equal-timestamp external changes and preserves extension fields', async () => {
  const state = setup({ initialJournal: { lastPoll: before, slots: {}, extension: { version: 7 } } }), { engine, home } = state;
  try {
    const file = path.join(home, 'schedules', 'sample.json');
    const original = { ...schedule(home), enabled: false, extension: { owner: 'synthetic' } };
    engine.schedules.save(original); state.time('2026-09-30T15:00:01Z'); await engine.tick();
    const stat = fs.statSync(file), source = fs.readFileSync(file, 'utf8');
    // Same-size content and restored mtime must still invalidate validation.
    fs.writeFileSync(file, source.replace('false', 'true ')); fs.utimesSync(file, stat.atime, stat.mtime);
    state.time('2026-09-30T15:01:01Z'); await engine.tick();
    assert.equal(engine.listRuns().length, 1);
    assert.deepEqual(engine.listRuns()[0].schedule.extension, original.extension);
    assert.deepEqual(readJSON(path.join(home, 'scheduler.json')).extension, { version: 7 });
  } finally { await state.cleanup(); }
});

test('a revision change before claim defers the poll and retries the current schedule', async () => {
  const state = setup(), { engine, home } = state;
  try {
    engine.schedules.save(schedule(home)); state.time('2026-09-30T15:00:01Z');
    engine.schedulerWorker = new SchedulerWorker(home);
    const verify = engine.schedulerWorker.verify.bind(engine.schedulerWorker);
    engine.schedulerWorker.verify = async due => {
      atomicJSON(path.join(home, 'schedules', 'sample.json'), { ...schedule(home), prompt: 'External edit.' });
      engine.schedulerWorker.verify = verify; return verify(due);
    };
    await assert.rejects(engine.tick(), /schedule changed/);
    assert.equal(engine.listRuns().length, 0); assert.equal(engine.journal.lastPoll, before);
    await engine.tick(); assert.equal(engine.listRuns()[0].schedule.prompt, 'External edit.');
  } finally { await state.cleanup(); }
});

test('unchanged invalid schedules emit one error until recovery or another edit', async () => {
  const state = setup(), { engine, home } = state;
  try {
    const file = path.join(home, 'schedules', 'sample.json'), errors = [];
    engine.on('scheduler-error', error => errors.push(error));
    atomicJSON(file, { ...schedule(home), schemaVersion: 2 });
    state.time('2026-09-30T15:00:01Z'); await engine.tick();
    state.time('2026-09-30T15:00:02Z'); await engine.tick();
    assert.equal(errors.length, 1);
    atomicJSON(file, { ...schedule(home), id: '../unsafe' });
    state.time('2026-09-30T15:00:03Z'); await engine.tick(); assert.equal(errors.length, 2);
    atomicJSON(file, schedule(home));
    state.time('2026-09-30T15:00:04Z'); await engine.tick();
    atomicJSON(file, { ...schedule(home), schemaVersion: 2 });
    state.time('2026-09-30T15:00:05Z'); await engine.tick(); assert.equal(errors.length, 3);
  } finally { await state.cleanup(); }
});

test('a delayed worker fsync leaves the main loop responsive and does not use host scheduler disk reads', async () => {
  const state = setup({ writer: { delayMs: 180 } }), { engine, home } = state;
  const read = fs.readFileSync;
  let hostReads = 0, pulses = 0;
  try {
    engine.schedules.save({ ...schedule(home), enabled: false });
    fs.readFileSync = function(file, ...args) {
      if (typeof file === 'string' && file.startsWith(path.join(home, 'schedules'))) hostReads++;
      return read.call(this, file, ...args);
    };
    const interval = setInterval(() => pulses++, 10);
    state.time('2026-09-30T15:00:01Z');
    try { await engine.tick(); } finally { clearInterval(interval); }
    assert.equal(hostReads, 0); assert.ok(pulses >= 8, `Main loop ran ${pulses} pulses during delayed worker fsync`);
    assert.ok(engine.schedulerWorker.diagnostics().checkpointDurationMs >= 150);
  } finally { fs.readFileSync = read; await state.cleanup(); }
});
