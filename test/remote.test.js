import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { startServer } from '../src/server.js';
import { startRelay } from '../relay/server.js';
import { atomicJSON } from '../src/files.js';
import { seal, unseal, secret } from '../src/remote-crypto.js';
import { RemoteClient, until } from './remote-client.mjs';

async function fixture(t, providers) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-remote-')); const workspace = path.join(home, 'workspace'); fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), '# Synthetic instructions\nCheck evidence.');
  fs.mkdirSync(path.join(workspace, '.vscode')); atomicJSON(path.join(workspace, '.vscode', 'mcp.json'), { servers: { synthetic: { command: 'false', env: { TOKEN: 'SECRET_MUST_STAY_ON_MAC' } } } });
  atomicJSON(path.join(home, 'settings.json'), { schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC', workspace: { cwd: workspace, additionalDirectories: [] }, skillDirectories: [], mcpServers: {} });
  const token = secret(); const relay = await startRelay({ port: 0, token });
  const app = await startServer({ home, port: 0, timers: false, providers });
  const url = `ws://127.0.0.1:${relay.port}`;
  await app.remote.configure({ enabled: true, mode: 'external', relayURL: url, publicURL: url, relayToken: token });
  await until(() => app.remote.status === 'online');
  const clients = [];
  t.after(async () => { clients.forEach(c => c.close()); await app.close(); await relay.close(); fs.rmSync(home, { recursive: true, force: true }); });
  const connect = async (capsule, device) => { const c = new RemoteClient(capsule || RemoteClient.capsule((await app.remote.pairing()).code), device); clients.push(c); return c.connect(); };
  return { app, home, relay, connect, workspace };
}
test('AES-GCM authenticates the payload and routing context', () => {
  const key = secret(); const payload = { prompt: 'Synthetic private message' }; const box = seal(key, payload, 'connection:client:1');
  assert.deepEqual(unseal(key, box, 'connection:client:1'), payload);
  assert.throws(() => unseal(key, box, 'connection:host:1'));
  assert.throws(() => unseal(secret(), box, 'connection:client:1'));
  const corrupt = Buffer.from(box, 'base64'); corrupt[14] ^= 1; assert.throws(() => unseal(key, corrupt.toString('base64'), 'connection:client:1'));
});
test('pair, start, stream feedback, resume from second device, and reject duplicate commands', async t => {
  const { app, connect } = await fixture(t); const a = await connect(); const b = await connect();
  const sync = await a.request('sync'); assert.equal(sync.state.context.entries.find(e => e.kind === 'mcp').mode, 'disabled');
  assert.ok(!JSON.stringify(sync).includes('SECRET_MUST_STAY_ON_MAC'));
  const args = { prompt: 'Synthetic remote rehearsal', provider: 'rehearsal', workspaceId: sync.state.context.defaultWorkspaceId };
  const requestId = randomUUID(); const { runId } = await a.request('chat.start', args, requestId);
  assert.equal((await a.request('chat.start', args, requestId)).runId, runId); assert.equal(app.engine.listRuns().length, 1);
  assert.equal((await a.request('chat.start', Object.fromEntries(Object.entries(args).reverse()), requestId)).runId, runId);
  await assert.rejects(a.request('chat.start', { ...args, prompt: 'Changed request' }, requestId), /already used/);
  await until(() => app.engine.getRun(runId).status === 'awaiting_input');
  const run = await b.request('chat.get', { id: runId });
  await assert.rejects(b.request('chat.reply', { id: runId, answer: 'wrong', requestId: 'stale' }), /no longer/);
  await b.request('chat.reply', { id: runId, answer: 'From another device', requestId: run.pending.id });
  await until(() => app.engine.getRun(runId).status === 'completed');
  await until(() => a.events.some(e => e.event === 'run' && e.data.status === 'completed'));
  assert.ok((await a.request('chat.get', { id: runId })).events.some(e => e.text.includes('From another device')));
  a.close(); const restored = await connect(a.capsule, a.device);
  assert.equal((await restored.request('chat.start', args, requestId)).runId, runId);
  await restored.request('chat.resume', { id: runId, prompt: 'Continue the same history' });
  await until(() => app.engine.getRun(runId).status === 'awaiting_input');
  assert.equal(app.engine.listRuns().length, 1);
});
test('single-use invitations, revoked devices, and replayed encrypted frames are rejected', async t => {
  const { app, connect } = await fixture(t); const invite = RemoteClient.capsule((await app.remote.pairing()).code);
  const client = await connect(invite); await assert.rejects(connect(invite), /rejected/);
  await client.request('sync'); client.raw(client.lastPacket); await until(() => client.failure === 'rejected');
  const restored = await connect(invite, client.device); app.remote.revoke(client.device.id);
  await until(() => restored.failure === 'revoked'); await assert.rejects(connect(invite, client.device), /rejected/);
});
test('schedule conflicts preserve unknown fields and repository ownership; stale and arbitrary commands cannot execute', async t => {
  const { app, connect } = await fixture(t); const client = await connect();
  let state = (await client.request('sync')).state; const schedule = state.schedules[0];
  const value = app.engine.schedules.get(schedule.id); value.extension = { preserved: true }; app.engine.schedules.save(value, schedule.revision);
  await assert.rejects(client.request('schedule.save', { id: schedule.id, expectedRevision: schedule.revision, changes: { cron: '0 10 * * *' } }), /changed/);
  state = (await client.request('sync')).state;
  await client.request('schedule.save', { id: schedule.id, expectedRevision: state.schedules[0].revision, changes: { cron: '0 10 * * *' } });
  assert.deepEqual(app.engine.schedules.get(schedule.id).extension, { preserved: true });
  const current = app.engine.schedules.list()[0]; app.engine.schedules.save({ ...app.engine.schedules.get(schedule.id), source: { manifest: '/synthetic/repo/automation.json' } }, current.revision);
  await assert.rejects(client.request('schedule.save', { id: schedule.id, changes: { enabled: true } }), /repository-owned/);
  await assert.rejects(client.request('credentials.get'), /Unsupported/);
  await assert.rejects(client.request('chat.start', { prompt: 'expired' }, randomUUID(), '2000-01-01T00:00:00Z'), /expired/);
  const instruction = state.context.entries.find(e => e.kind === 'instruction');
  await client.request('context.mode', { id: instruction.id, mode: 'universal', expectedRevision: state.context.revision });
  assert.equal((await client.request('sync')).state.context.entries.find(e => e.id === instruction.id).mode, 'universal');
});
test('live provider text reaches both local and remote state before the final message', async t => {
  let finish;
  const provider = { async run({ stream, run, emit }) { stream('message-1', 'Partial response'); await new Promise(resolve => { finish = resolve; }); delete run.liveMessages['message-1']; emit('assistant', 'Partial response completed'); } };
  const { app, connect } = await fixture(t, { copilot: provider }); const client = await connect();
  const { runId } = await client.request('chat.start', { prompt: 'Stream synthetic tokens', provider: 'copilot', model: 'synthetic' });
  await until(() => !!finish); assert.equal((await client.request('chat.get', { id: runId })).liveMessages['message-1'], 'Partial response');
  finish(); await until(() => app.engine.getRun(runId).status === 'completed');
  assert.deepEqual((await client.request('chat.get', { id: runId })).liveMessages, {});
});
test('relay rejects browser origins and incorrect host credentials', async t => {
  const relay = await startRelay({ port: 0, token: secret() }); t.after(() => relay.close());
  for (const headers of [{ Authorization: 'Bearer wrong' }, { Origin: 'https://untrusted.example' }]) {
    const ws = new WebSocket(`ws://127.0.0.1:${relay.port}/socket?role=host&host=${randomUUID()}`, { headers });
    await new Promise(resolve => { ws.on('error', error => { assert.match(error.message, /403/); resolve(); }); });
  }
});
