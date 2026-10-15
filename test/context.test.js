import { fakeSession } from './fake-copilot.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ContextStore, parseJSONC } from '../src/context.js';
import { SettingsStore } from '../src/settings.js';
import { Engine } from '../src/engine.js';
import { StandupStore } from '../src/standup.js';
import { CredentialBroker, BitwardenCLI } from '../src/credentials.js';
import { exportTranscript } from '../src/transcripts.js';

function fixture(t, beforeRemove) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-context-test-')));
  t.after(async () => { await beforeRemove?.(); fs.rmSync(home, { recursive: true, force: true }); });
  const repo = path.join(home, 'project'); const library = path.join(home, 'library');
  fs.mkdirSync(repo); fs.mkdirSync(library);
  const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
  const settings = new SettingsStore(path.join(home, 'app'), repo);
  const context = new ContextStore(path.join(home, 'app'), settings);
  const mode = (entry, value) => context.mutate(config => { config.modes[entry.id] = value; }, context.config().revision);
  return { home, repo, library, write, context, settings, mode };
}
test('JSONC retains URL strings and quoted punctuation while accepting comments', () => {
  assert.deepEqual(parseJSONC('{/*x*/"url":"https://example.test/a,}","list":[1,],//x\n}'), { url: 'https://example.test/a,}', list: [1] });
});
test('missing supplemental folders skip stale sources, preserve configuration and report chat warnings', async t => {
  const f = fixture(t);
  f.write(path.join(f.repo, 'AGENTS.md'), '# Available instructions');
  f.write(path.join(f.library, 'AGENTS.md'), '# Unavailable instructions');
  f.write(path.join(f.library, '.mcp.json'), '{"mcpServers":{"missing":{"command":"node"}}}');
  f.context.mutate(c => { c.workspaces[0].additionalDirectories = [f.library]; c.workspaces[0].universalFolders = [f.library]; }, f.context.config().revision);
  const missing = f.context.get().entries.filter(e => e.roots.includes(f.library));
  for (const entry of missing) f.mode(entry, 'universal');
  const before = fs.readFileSync(f.context.file, 'utf8');
  fs.rmSync(f.library, { recursive: true });
  for (const refresh of [false, true]) {
    if (refresh) f.context.refresh();
    const snapshot = f.context.capture({ selectedIds: missing.map(e => e.id) });
    assert.deepEqual(snapshot.workspace, { cwd: f.repo, additionalDirectories: [] });
    assert.equal(snapshot.followsWorkspace, true);
    assert.deepEqual(snapshot.baseWorkspace.additionalDirectories, [f.library]);
    assert.equal(snapshot.entries.length, 1);
    assert.match(snapshot.entries[0].content, /Available instructions/);
    assert.ok(snapshot.warnings.some(w => w.path === f.library));
    assert.deepEqual(f.context.providerContext(snapshot).mcpServers, {});
    const engine = new Engine(path.join(f.home, 'engine-' + refresh));
    const run = engine.createRun({ schemaVersion: 1, id: 'missing-folder', name: 'Rehearsal', enabled: false, cron: '0 9 * * 1-5', timezone: 'UTC', provider: 'rehearsal', model: '', workspace: snapshot.workspace, context: snapshot, misfire: 'skip', prompt: 'Rehearsal only' }, 'chat', null, { deferStart: true });
    assert.ok(run.events.some(e => e.role === 'system' && e.text.includes(f.library)));
    await engine.close();
  }
  assert.equal(fs.readFileSync(f.context.file, 'utf8'), before);
  f.write(path.join(f.library, 'AGENTS.md'), '# Restored instructions');
  f.write(path.join(f.library, '.mcp.json'), '{"mcpServers":{"missing":{"command":"node"}}}');
  f.context.refresh();
  assert.ok(f.context.capture().workspace.additionalDirectories.includes(f.library));
});
test('refresh discovers new files and changed hashes, preserves selections and records missing universal sources across restart', t => {
  const f = fixture(t); const file = path.join(f.repo, 'AGENTS.md'); f.write(file, '# Workspace\nOriginal rules.');
  let entry = f.context.refresh().entries.find(e => e.path === file); f.mode(entry, 'universal');
  const original = f.context.capture(); assert.match(original.entries[0].content, /Original/);
  f.write(file, '# Workspace\nUpdated rules.');
  assert.throws(() => f.context.capture(), /Refresh context/);
  const refreshed = f.context.refresh(); assert.equal(refreshed.entries[0].mode, 'universal');
  assert.match(f.context.capture().entries[0].content, /Updated/);
  f.write(path.join(f.repo, '.github/agents/reviewer.agent.md'), '---\nname: Reviewer\n---\nReview code.');
  assert.ok(f.context.refresh().entries.some(e => e.kind === 'agent'));
  fs.unlinkSync(file); f.context.refresh();
  const restarted = new ContextStore(path.join(f.home, 'app'), f.settings);
  assert.ok(restarted.get().entries.find(e => e.id === entry.id).missing);
  assert.throws(() => restarted.capture(), /Selected source is missing/);
});
test('universal context crosses workspace folders; optional skills/agents are selectable and disabled content is never assembled', t => {
  const f = fixture(t); f.write(path.join(f.repo, 'AGENTS.md'), '# Project\nProject rules.');
  f.write(path.join(f.library, 'identity.md'), '# Identity\nShared persona.');
  f.write(path.join(f.library, 'skills/inspect/SKILL.md'), '---\nname: Inspect\n---\nInspect selected evidence.');
  f.write(path.join(f.library, '.github/agents/reviewer.agent.md'), '# Reviewer\nReview selected work.');
  f.context.mutate(config => { config.libraryFolders.push(f.library); config.documents.push({ path: path.join(f.library, 'identity.md'), kind: 'instruction' }); }, f.context.config().revision);
  const find = kind => f.context.get().entries.find(e => e.kind === kind && e.path.startsWith(f.library));
  const identity = find('instruction'); const skill = find('skill'); const agent = find('agent');
  f.mode(identity, 'universal');
  assert.ok(f.context.capture().entries.some(e => e.id === identity.id));
  assert.ok(!f.context.capture().entries.some(e => e.id === skill.id));
  let capture = f.context.capture({ selectedIds: [skill.id, agent.id], agentId: agent.id });
  let supplied = f.context.providerContext(capture);
  assert.match(supplied.instructionText, /Shared persona/); assert.match(supplied.instructionText, /Inspect selected evidence/);
  assert.equal(supplied.customAgents.length, 1); assert.ok(supplied.agent);
  assert.ok(capture.workspace.additionalDirectories.includes(f.library));
  f.mode(skill, 'disabled');
  assert.throws(() => f.context.providerContext(capture), /source was disabled/);
  capture = f.context.capture({ selectedIds: [skill.id] });
  assert.ok(!capture.entries.some(e => e.id === skill.id));
});
test('MCPs stay disabled, resolve source-relative launch directories, and keep secrets out of snapshots', t => {
  const f = fixture(t);
  f.write(path.join(f.repo, '.vscode/mcp.json'), JSON.stringify({ servers: {
    remote: { type: 'http', url: 'https://mcp.example.test', headers: { Authorization: 'Bearer SYNTHETIC_SECRET' } },
    local: { command: 'node', args: ['server.mjs'], env: { ROOT: '${workspaceFolder}' } }
  } }));
  const entries = f.context.refresh().entries.filter(e => e.kind === 'mcp'); assert.ok(entries.every(e => e.mode === 'disabled'));
  assert.equal(f.context.capture().entries.length, 0);
  for (const entry of entries) f.mode(entry, 'available');
  const snapshot = f.context.capture({ selectedIds: entries.map(e => e.id) });
  assert.ok(!JSON.stringify(snapshot).includes('SYNTHETIC_SECRET'));
  const supplied = f.context.providerContext(snapshot);
  assert.equal(supplied.mcpServers.local.workingDirectory, f.repo);
  assert.equal(supplied.mcpServers.local.env.ROOT, f.repo);
  assert.equal(supplied.mcpServers.remote.headers.Authorization, 'Bearer SYNTHETIC_SECRET');
  f.write(path.join(f.repo, '.vscode/mcp.json'), '{"servers":{}}');
  assert.throws(() => f.context.providerContext(snapshot), /MCP definition changed/);
});
test('captured MCP source cannot silently retarget a symlink with matching bytes',t=>{
  const f=fixture(t),one=path.join(f.repo,'first-mcp.json'),two=path.join(f.repo,'second-mcp.json'),link=path.join(f.repo,'.vscode','mcp.json');
  const definition=JSON.stringify({servers:{selected:{command:'node',args:['server.mjs']}}});f.write(one,definition);f.write(two,definition);fs.mkdirSync(path.dirname(link));fs.symlinkSync(one,link);
  const entry=f.context.refresh().entries.find(item=>item.kind==='mcp');f.mode(entry,'available');const captured=f.context.capture({selectedIds:[entry.id]});
  assert.equal(f.context.providerContext(captured).mcpServers.selected.command,'node');
  fs.unlinkSync(link);fs.symlinkSync(two,link);
  assert.throws(()=>f.context.providerContext(captured),/source or folder changed/);
});
test('MCP aliases deduplicate exact configurations while conflicting names fail before provider use', t => {
  const f = fixture(t); f.write(path.join(f.repo, '.mcp.json'), JSON.stringify({ mcpServers: { same: { type: 'http', url: 'https://one.example.test' } } }));
  f.write(path.join(f.repo, '.vscode/mcp.json'), JSON.stringify({ servers: { alias: { type: 'http', url: 'https://one.example.test' } } }));
  let entries = f.context.refresh().entries; for (const entry of entries) f.mode(entry, 'universal');
  assert.equal(Object.keys(f.context.providerContext(f.context.capture()).mcpServers).length, 1);
  f.write(path.join(f.repo, '.vscode/mcp.json'), JSON.stringify({ servers: { same: { type: 'http', url: 'https://two.example.test' } } }));
  entries = f.context.refresh().entries.filter(e => !e.missing); for (const entry of entries) f.mode(entry, 'universal');
  // Remove the deliberately missing old alias selection before checking the conflict.
  f.context.mutate(config => { for (const entry of f.context.get().entries.filter(e => e.missing)) config.modes[entry.id] = 'disabled'; }, f.context.config().revision);
  assert.throws(() => f.context.providerContext(f.context.capture()), /same name/);
});
test('workspace import resolves relative folders without executing workspace tasks or enabling MCPs', t => {
  const f = fixture(t); const file = path.join(f.home, 'example.code-workspace');
  f.write(file, JSON.stringify({ folders: [{ path: './project' }, { path: './library' }], tasks: { command: 'must-not-run' }, mcp: { servers: { sample: { command: 'must-not-run' } } } }));
  f.context.importWorkspace(file, f.context.config().revision);
  const profile = f.context.get().workspaces.find(w => w.name === 'example');
  assert.equal(profile.cwd, f.repo); assert.deepEqual(profile.additionalDirectories, [f.library]);
  assert.equal(f.context.get().entries.find(e => e.kind === 'mcp').mode, 'disabled');
  assert.equal(f.context.capture({ workspace: { cwd: f.library, additionalDirectories: [] } }).workspaceId, null);
});
test('standup keeps fixed members last and preserves current output through settings edits and restart', t => {
  const f = fixture(t); const store = new StandupStore(path.join(f.home, 'app'), 'America/Denver');
  let current = store.save({ random: ['Avery', 'Jordan'], fixed: ['Taylor', 'Riley'], instructions: 'Blockers first', timezone: 'America/Denver' }, store.get().revision);
  const generated = store.generate(current.revision, new Date('2026-10-02T01:00:00Z'), () => 0).current;
  assert.equal(generated.date, '2026-10-01'); assert.deepEqual(generated.order, ['Jordan', 'Avery', 'Taylor', 'Riley']);
  store.save({ ...store.get(), instructions: 'Changed agenda' }, store.get().revision);
  assert.deepEqual(new StandupStore(path.join(f.home, 'app'), 'UTC').get().current, generated);
  assert.throws(() => store.save({ ...store.get(), random: ['Avery', 'Avery'] }, store.get().revision), /only once/);
});
test('credential broker restricts exact origin, item, organization, collection and delivers only to its consumer', async t => {
  const f = fixture(t); let calls = 0;
  const adapter = new BitwardenCLI(async (_command, args) => { calls++; assert.deepEqual(args, ['get', 'item', 'item-1']); return { stdout: JSON.stringify({ id: 'item-1', organizationId: 'org-1', collectionIds: ['collection-1'], login: { username: 'synthetic-user', password: 'SYNTHETIC_PASSWORD', uris: [{ uri: 'https://login.example.test' }] } }) }; });
  const broker = new CredentialBroker(path.join(f.home, 'app'), { 'bitwarden-cli': adapter });
  const config = { schemaVersion: 1, providers: [{ id: 'vault', type: 'bitwarden-cli', command: 'bw' }], bindings: [{ id: 'login', name: 'Example login', providerId: 'vault', itemId: 'item-1', scope: 'organization', organizationId: 'org-1', collectionId: 'collection-1', origins: ['https://login.example.test'] }] };
  broker.save(config, broker.get().revision);
  await assert.rejects(broker.fill('login', 'https://login.example.test.evil.test', () => {}), /exact site/); assert.equal(calls, 0);
  let received;
  const result = await broker.fill('login', 'https://login.example.test', async value => { received = value; });
  assert.equal(received.password, 'SYNTHETIC_PASSWORD'); assert.ok(!JSON.stringify(result).includes('SYNTHETIC_PASSWORD'));
  assert.ok(!fs.readFileSync(broker.file, 'utf8').includes('SYNTHETIC_PASSWORD'));
  config.bindings[0].collectionId = 'wrong'; broker.save(config, broker.get().revision);
  await assert.rejects(broker.fill('login', 'https://login.example.test', () => {}), /outside/);
});
test('Bitwarden unlock secrets use child environment only and malformed responses never leak', async () => {
  const calls = []; const adapter = new BitwardenCLI(async (command, args, options) => { calls.push({ command, args, env: options.env }); return { stdout: args[0] === 'unlock' ? 'SYNTHETIC_SESSION' : 'SYNTHETIC_BAD_SECRET' }; });
  const provider = { id: 'vault', command: 'bw' };
  await adapter.unlock(provider, 'SYNTHETIC_MASTER');
  assert.ok(!JSON.stringify(calls[0].args).includes('SYNTHETIC_MASTER')); assert.equal(calls[0].env.PROTEUS_BW_UNLOCK, 'SYNTHETIC_MASTER');
  await assert.rejects(adapter.getLogin(provider, { itemId: 'x' }, 'https://example.test'), error => !error.message.includes('SYNTHETIC_BAD_SECRET'));
  assert.equal(calls[1].env.BW_SESSION, 'SYNTHETIC_SESSION'); assert.equal(calls[1].env.PROTEUS_BW_UNLOCK, undefined);
});
test('transcript exports omit raw provider config, tool payloads, and permission details', t => {
  const f = fixture(t); const run = { id: 'synthetic-run', title: 'Sample', schedule: { provider: 'rehearsal', model: '', mcpServers: { secret: 'SYNTHETIC_SECRET' } }, events: [{ role: 'user', text: 'Hello' }, { role: 'tool', text: 'SYNTHETIC_SECRET' }, { role: 'assistant', text: 'Done' }] };
  const exported = exportTranscript(f.home, run, 'json'); const text = fs.readFileSync(exported.file, 'utf8');
  assert.ok(!text.includes('SYNTHETIC_SECRET')); assert.match(text, /Hello/);
});

test('universal folders follow every workspace and explicit document roles override discovery', t => {
  const f = fixture(t);
  const file = path.join(f.library, 'agent/identity.md');
  f.write(file, '---\nname: Identity\ntools: []\n---\nFollow domain routing.');
  f.context.mutate(config => {
    config.libraryFolders.push(f.library); config.universalFolders.push(f.library);
    config.documents.push({ path: file, kind: 'instruction' });
  }, f.context.config().revision);
  const entry = f.context.get().entries.find(e => e.path === file);
  assert.equal(entry.kind, 'instruction'); assert.deepEqual(entry.unsupportedAgentFields, []);
  f.mode(entry, 'universal');
  const snapshot = f.context.capture({ workspace: { cwd: f.repo, additionalDirectories: [] } });
  assert.ok(snapshot.workspace.additionalDirectories.includes(f.library));
  assert.match(f.context.providerContext(snapshot).instructionText, /Follow domain routing/);
});
test('agent tool controls cannot be silently discarded by the host adapter', t => {
  const f = fixture(t); f.write(path.join(f.repo, '.github/agents/review.agent.md'), '---\nname: Review\ntools: [read]\nhooks: {}\n---\nReview only.');
  const entry = f.context.refresh().entries.find(e => e.kind === 'agent');
  assert.deepEqual(entry.unsupportedAgentFields, ['Adapter required for hooks']);
  assert.throws(() => f.context.capture({ selectedIds: [entry.id] }), /Agent is unavailable/);
});

test('default workspace authorization uses the same shared context as a new chat', async t => {
  const f = fixture(t); const { startServer } = await import('../src/server.js');
  f.context.mutate(config => { config.universalFolders.push(f.library); }, f.context.config().revision);
  const service = await startServer({ home: path.join(f.home, 'app'), port: 0, timers: false, withSeed: false, providers: { rehearsal: { async run() {} } } });
  t.after(() => service.close());
  const request = async (route, value) => {
    const response = await fetch(service.origin + route, { headers: { authorization: 'Bearer ' + service.token, 'content-type': 'application/json' }, ...(value ? { method: 'POST', body: JSON.stringify(value) } : {}) });
    assert.equal(response.status, 200); return response.json();
  };
  const defaults = service.settings.get();
  service.settings.save({ ...defaults, provider: 'rehearsal', model: '' }, defaults.revision);
  let state = await request('/api/state');
  const authorization = state.permissionWorkspaces.find(w => w.ref.defaults);
  assert.ok(authorization.roots.includes(f.library));
  await request('/api/permissions', { action: 'set-mode', defaults: true, mode: 'autopilot', expectedRevision: state.permissions.revision, expectedContextId: authorization.id });
  const run = await request('/api/chat', { prompt: 'Synthetic task', provider: 'rehearsal' });
  assert.equal(service.engine.permissions.describe(run.schedule).id, authorization.id);
  assert.equal(service.engine.permissions.describe(run.schedule).mode, 'autopilot');
});

test('favorites persist across refresh/restart without changing source modes or loading', t => {
  const f = fixture(t); f.write(path.join(f.repo, 'skills/check/SKILL.md'), '# Favorite skill\nOnly for selected work.');
  const skill = f.context.refresh().entries.find(e => e.kind === 'skill'); const before = f.context.get();
  const saved = f.context.favorite(skill.id, true, before.revision);
  assert.deepEqual(saved.favorites, [skill.id]); assert.equal(saved.refreshedAt, before.refreshedAt);
  assert.equal(saved.entries.find(e => e.id === skill.id).mode, 'available'); assert.equal(f.context.capture().entries.length, 0);
  assert.throws(() => f.context.favorite(skill.id, false, before.revision), /changed/);
  const restarted = new ContextStore(path.join(f.home, 'app'), f.settings); assert.deepEqual(restarted.get().favorites, [skill.id]);
  assert.deepEqual(restarted.favorite(skill.id, false, restarted.get().revision).favorites, []);
});
test('only selected sources skips workspace/universal documents while preserving folder access and selected main agent', t => {
  const f = fixture(t); f.write(path.join(f.repo, 'AGENTS.md'), '# Workspace default');
  f.write(path.join(f.library, 'identity.md'), '# Universal identity');
  f.write(path.join(f.library, 'skills/check/SKILL.md'), '# Check\nSpecific skill.');
  f.write(path.join(f.library, 'agents/review.agent.md'), '---\nname: Review\ntools: [read]\n---\nSpecific review.');
  f.context.mutate(c => { c.libraryFolders.push(f.library); c.universalFolders.push(f.library); c.documents.push({ path: path.join(f.library, 'identity.md'), kind: 'instruction' }); }, f.context.config().revision);
  const entries = f.context.get().entries; const identity = entries.find(e => e.name === 'Universal identity'); f.mode(identity, 'universal');
  const skill = entries.find(e => e.kind === 'skill'); const agent = entries.find(e => e.kind === 'agent');
  const snapshot = f.context.capture({ includeDefaults: false, selectedIds: [skill.id], agentId: agent.id });
  assert.deepEqual(new Set(snapshot.entries.map(e => e.id)), new Set([skill.id, agent.id]));
  assert.ok(snapshot.workspace.additionalDirectories.includes(f.library));
  assert.equal(snapshot.includeDefaults, false); assert.equal(f.context.capture({ includeDefaults: false }).entries.length, 0);
  const supplied = f.context.providerContext(snapshot); assert.match(supplied.instructionText, /Specific skill/); assert.doesNotMatch(supplied.instructionText, /Workspace default|Universal identity/);
  f.mode(skill, 'disabled'); assert.throws(() => f.context.capture({ includeDefaults: false, selectedIds: [skill.id] }), /disabled/);
});
test('schedule selections are validated, persist in plain JSON and capture only selected sources on each run', async t => {
  let app;
  const f = fixture(t, () => app?.close()); f.write(path.join(f.repo, 'AGENTS.md'), '# Automatic source'); f.write(path.join(f.repo, 'skills/check/SKILL.md'), '# Schedule skill\nVersion one.');
  const { startServer } = await import('../src/server.js'); const { revision } = await import('../src/schedules.js');
  app = await startServer({ home: path.join(f.home, 'app'), port: 0, timers: false }); app.engine.drain = async () => {};
  const skill = app.context.get().entries.find(e => e.kind === 'skill');
  const schedule = app.engine.schedules.get('workspace-pulse'); schedule.workspace = { cwd: f.repo, additionalDirectories: [] };
  const selection = { includeDefaults: false, selectedIds: [skill.id], agentId: null, extension: 'retained' };
  const post = async (schedule, expectedRevision) => fetch(app.origin + '/api/schedules', { method: 'POST', headers: { authorization: 'Bearer ' + app.token, 'content-type': 'application/json' }, body: JSON.stringify({ schedule, expectedRevision }) });
  const originalRevision = revision(app.engine.schedules.get(schedule.id));
  assert.equal((await post({ ...schedule, contextSelection: { includeDefaults: 'no', selectedIds: [] } }, originalRevision)).status, 400);
  assert.equal((await post({ ...schedule, contextSelection: { ...selection, selectedIds: ['missing'] } }, originalRevision)).status, 400);
  assert.equal((await post({ ...schedule, contextSelection: selection }, originalRevision)).status, 200);
  const saved = app.engine.schedules.get(schedule.id); assert.deepEqual(saved.contextSelection, selection); assert.equal(saved.enabled, false);
  const first = app.engine.createRun(saved); assert.deepEqual(first.schedule.context.entries.map(e => e.id), [skill.id]); first.status = 'completed';
  f.write(skill.path, '# Schedule skill\nVersion two.'); app.context.refresh();
  const second = app.engine.createRun(saved); assert.match(second.schedule.context.entries[0].content, /Version two/); assert.match(first.schedule.context.entries[0].content, /Version one/);
});
test('only-selected Copilot configuration removes legacy MCP/skill discovery and supplies selected tools', async () => {
  const { CopilotProvider } = await import('../src/copilot.js');
  let config;
  const provider = new CopilotProvider({}, { context: { providerContext: () => ({ disabledLegacyMcp: [], disabledSkills: [], customAgents: [], mcpServers: { selected: { command: 'false', tools: ['read'] } }, mcpMappings: {}, instructionText: 'Selected instructions' }) } });
  const session = fakeSession({ sessionId: 'synthetic', rpc: { agent: { deselect: async () => {} }, usage: { getMetrics: async () => ({}) } } });
  provider.connect = async () => ({ listModels: async () => [{ id: 'synthetic' }], createSession: async value => { config = value; return session; } });
  const run = { id: 'synthetic', schedule: { model: 'synthetic', workspace: { cwd: '/tmp', additionalDirectories: [] }, context: { includeDefaults: false, entries: [] }, skillDirectories: ['/legacy/skills'], mcpServers: { unwanted: { command: 'false' } } }, usage: { inputTokens: 0, outputTokens: 0 } };
  await provider.run({ run, prompt: 'Synthetic task', signal: new AbortController().signal, emit() {}, update() {}, ask() {} });
  assert.deepEqual(config.skillDirectories, []); assert.equal(config.enableSkills, false); assert.deepEqual(Object.keys(config.mcpServers), ['selected']);
  assert.equal(config.skipCustomInstructions, true); assert.equal(config.enableConfigDiscovery, false); assert.equal(config.enableOnDemandInstructionDiscovery, false);
  assert.match(config.systemMessage.content, /Selected instructions/);
});
