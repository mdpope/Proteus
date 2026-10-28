import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RunWriter } from '../src/services/chats/run-writer.js';

const home = () => fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-run-writer-'));
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const settle = ms => new Promise(resolve => setTimeout(resolve, ms));

test('deferred saves coalesce bursts and an immediate save always wins', async () => {
  const dir = home();
  try {
    const file = id => path.join(dir, id + '.json'), writer = new RunWriter({ fileFor: file, delayMs: 20 });
    const run = { id: 'chat', events: [] };
    for (let index = 0; index < 50; index++) { run.events.push(index); writer.defer(run); }
    assert.equal(writer.pending('chat'), true);
    assert.equal(fs.existsSync(file('chat')), false, 'A burst does not write synchronously');
    await settle(60); await writer.drain(() => run);
    assert.equal(read(file('chat')).events.length, 50);
    // A deferred snapshot started before an immediate save must not replace it.
    run.events.push('deferred'); writer.defer(run); await settle(25);
    const immediate = { ...run, events: [...run.events, 'immediate'] };
    writer.writeNow(immediate);
    await writer.drain(() => run);
    assert.equal(read(file('chat')).events.at(-1), 'immediate');
    assert.deepEqual(fs.readdirSync(dir).filter(name => name.endsWith('.tmp')), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('deleted chats are never resurrected and shutdown drains queued saves', async () => {
  const dir = home();
  try {
    let deleted = false;
    const file = id => path.join(dir, id + '.json'), writer = new RunWriter({ fileFor: file, delayMs: 1000, canWrite: run => !(deleted && run.id === 'gone') });
    const gone = { id: 'gone', events: [1] }, kept = { id: 'kept', events: [2] };
    writer.defer(gone); writer.defer(kept); deleted = true; writer.cancel('gone');
    await writer.close(id => (id === 'kept' ? kept : gone));
    assert.equal(fs.existsSync(file('gone')), false);
    assert.deepEqual(read(file('kept')).events, [2]);
    writer.defer(kept); assert.equal(writer.pending('kept'), false, 'After close every save is immediate');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
