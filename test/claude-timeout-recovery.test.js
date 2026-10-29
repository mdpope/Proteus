import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Engine } from '../src/engine.js';
import { ClaudeProvider } from '../src/providers/claude.js';
import { privateTemporaryDirectory } from '../src/shared/private-paths.cjs';

test('Claude timeout settles its old process before automatic same-session recovery and then drains queued input', async t => {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-claude-timeout-'));
  const clients = [], inputs = []; let cleanupStarted = false, releaseCleanup;
  const cleanup = new Promise(resolve => releaseCleanup = resolve);
  class Client extends EventEmitter {
    constructor(options) { super(); this.options = options; this.index = clients.length; }
    async initialize() { return { hooks_applied: true, models: [{ value: 'synthetic', displayName: 'Synthetic' }] }; }
    write(message) {
      if (message.type !== 'user') return;
      inputs.push(message.message.content);
      queueMicrotask(() => {
        this.emit('message', { ...message });
        this.emit('message', { type: 'system', subtype: 'init', session_id: 'same-native-session' });
        if (this.index) this.emit('message', { type: 'result', subtype: 'success', session_id: 'same-native-session' });
      });
    }
    async close() { if (!this.index) { cleanupStarted = true; await cleanup; } this.closed = true; }
  }
  const provider = new ClaudeProvider({ timeoutMs: 50, clientFactory: options => {
    if (clients.length) assert.equal(clients.at(-1).closed, true, 'no replacement before process cleanup');
    const client = new Client(options); clients.push(client); return client;
  } });
  provider.dataDirectory = () => home;
  const engine = new Engine(home, { claude: provider });
  t.after(async () => { releaseCleanup(); await engine.close(); await provider.close(); fs.rmSync(home, { recursive: true, force: true }); });
  const run = engine.createRun({ schemaVersion: 1, id: 'synthetic', name: 'Timeout fixture', enabled: false, cron: '0 9 * * *', timezone: 'UTC', provider: 'claude', model: 'synthetic', workspace: { cwd: home, additionalDirectories: [] }, misfire: 'skip', prompt: 'Original work' }, 'chat');
  run.activeTimeContinuation = { enabled: true, attempts: 0 };
  const until = async fn => { for (let i = 0; i < 1000; i++) { if (fn()) return; await new Promise(resolve => setTimeout(resolve, 5)); } throw Error('Synthetic continuation did not settle.'); };
  await until(() => inputs.length === 1);
  await engine.send(run.id, 'Queued follow-up', 'queue', 'synthetic-followup');
  await until(() => cleanupStarted);
  assert.equal(engine.running.has(run.id), true); assert.equal(clients.length, 1); assert.equal(run.queuedMessages.length, 1);
  releaseCleanup();
  await until(() => run.status === 'completed' && !engine.running.has(run.id));
  assert.equal(clients.length, 3);
  assert.equal(clients[0].options.args.includes('--resume'), false);
  for (const client of clients.slice(1)) assert.equal(client.options.args[client.options.args.indexOf('--resume') + 1], 'same-native-session');
  assert.equal(inputs[0], 'Original work'); assert.match(inputs[1], /do not repeat completed external actions/); assert.equal(inputs[2], 'Queued follow-up');
  assert.equal(run.providerSessionId, 'same-native-session'); assert.equal(run.queuedMessages.length, 0); assert.equal(run.activeTimeContinuation.attempts, 0);
  assert.equal(run.events.filter(event => event.data?.failure?.kind === 'active-time-limit').length, 1);
});
