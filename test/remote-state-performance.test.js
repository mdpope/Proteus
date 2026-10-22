import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ContextStore } from '../src/context.js';
import { SettingsStore } from '../src/settings.js';
import { ScheduleStore } from '../src/schedules.js';
import { IntegrationHealth } from '../src/integrations.js';
import { CopilotProvider } from '../src/copilot.js';
import { ClaudeProvider } from '../src/claude.js';
import { SessionProvider } from '../src/session-provider.js';
import { remoteState, RemoteHost } from '../src/remote.js';

function fixture(t) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-state-rehearsal-')));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const workspace = path.join(home, 'workspace'); fs.mkdirSync(workspace);
  const settings = new SettingsStore(home, workspace), context = new ContextStore(home, settings);
  return { home, workspace, settings, context };
}
function sameMetadataWrite(file, contents) {
  const before = fs.statSync(file); fs.writeFileSync(file, contents); fs.utimesSync(file, before.atime, before.mtime);
}
const legacyId = (run, server, config) => createHash('sha256').update(JSON.stringify([run.id, run.providerSessionId || '', run.schedule.provider, server, config, run.schedule.context || null])).digest('hex');

test('health selection batches preserve provider MCP selection and read fresh settings/sources each time', t => {
  const f = fixture(t), file = path.join(f.workspace, '.mcp.json');
  const definition = JSON.stringify({ mcpServers: { selected: { command: 'node', args: ['first.js'] }, ignored: { command: 'node' } } });
  fs.writeFileSync(file, definition); fs.writeFileSync(path.join(f.workspace, 'AGENTS.md'), '# Rehearsal instructions');
  fs.mkdirSync(path.join(f.workspace, 'agents')); fs.writeFileSync(path.join(f.workspace, 'agents/reviewer.md'), '---\nname: Reviewer\ntools: [read_file]\n---\nRehearsal agent.');
  f.context.refresh();
  const selected = f.context.get().entries.find(e => e.kind === 'mcp' && e.name === 'selected');
  const ignored = f.context.get().entries.find(e => e.kind === 'mcp' && e.name === 'ignored');
  f.context.mutate(c => { c.modes[selected.id] = 'available'; c.modes[ignored.id] = 'disabled'; }, f.context.config().revision);
  const snapshot = f.context.capture({ selectedIds: [selected.id] });
  const adapters = { copilot: new SessionProvider(() => new CopilotProvider({}, { context: f.context })), claude: new ClaudeProvider({}, { context: f.context }) };
  const runs = Array.from({ length: 20 }, (_, i) => ({ id: 'run-' + i, title: 'Rehearsal', schedule: { provider: i % 2 ? 'claude' : 'copilot', context: snapshot, mcpServers: { ignored: { command: 'false' }, legacy: { command: 'node' } } } }));
  for (const run of runs) {
    const expected = f.context.providerContext(snapshot);
    assert.deepEqual(adapters[run.schedule.provider].selectedMcp(run), { legacy: { command: 'node' }, ...expected.mcpServers });
  }
  let reads = 0; const get = f.context.get.bind(f.context); f.context.get = (...args) => { reads++; return get(...args); };
  const engine = { providers: adapters, listRuns: () => runs, getRun: id => runs.find(r => r.id === id) };
  const health = new IntegrationHealth(f.home, { engine });
  assert.equal(health.consumers().length, 40); assert.equal(reads, 1); assert.equal(f.context.mcpSelectionBatch, null);
  health.consumers(); assert.equal(reads, 2);
  // Current disk settings remain authoritative even when an editor preserves mtime.
  const settingsBytes = fs.readFileSync(f.context.file, 'utf8');
  sameMetadataWrite(f.context.file, settingsBytes.replace('"available"', '"disabled"'));
  assert.deepEqual(health.consumers(), []); assert.equal(f.context.mcpSelectionBatch, null);
  sameMetadataWrite(f.context.file, settingsBytes);
  assert.equal(health.consumers().length, 40);
  // Matching file metadata must not conceal a changed selected definition.
  sameMetadataWrite(file, definition.replace('first.js', 'other.js'));
  assert.deepEqual(health.consumers(), []);
  sameMetadataWrite(file, definition);
  assert.equal(health.consumers().length, 40);
  // Sharing one ContextStore across adapters must never share scoped modes
  // between different workspaces during the same enumeration.
  const multi = JSON.parse(settingsBytes), other = structuredClone(multi.workspaces[0]);
  other.id = 'other'; other.name = 'Other synthetic workspace'; other.modes[selected.id] = 'disabled'; multi.workspaces.push(other);
  sameMetadataWrite(f.context.file, JSON.stringify(multi));
  runs.push({ id: 'other', title: 'Other synthetic', schedule: { provider: 'copilot', context: { ...snapshot, workspaceId: 'other' }, mcpServers: {} } });
  reads = 0; assert.equal(health.consumers().length, 40); assert.equal(reads, 2);
  runs.pop(); sameMetadataWrite(f.context.file, settingsBytes);
  const selectedOnly = structuredClone(runs[0]); selectedOnly.schedule.context.includeDefaults = false;
  assert.deepEqual(adapters.copilot.selectedMcp(selectedOnly), f.context.providerContext(selectedOnly.schedule.context).mcpServers);
  const moved = path.join(f.workspace, 'moved.json'); fs.renameSync(file, moved); fs.symlinkSync(moved, file);
  assert.deepEqual(health.consumers(), []);
});

test('MCP-only projection retains disabled-source and invalid-agent rejection without creating instruction prompts', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.workspace, 'AGENTS.md'), '# Rehearsal instructions');
  fs.mkdirSync(path.join(f.workspace, 'agents')); fs.writeFileSync(path.join(f.workspace, 'agents/reviewer.md'), '# Rehearsal agent');
  f.context.refresh(); const agent = f.context.get().entries.find(e => e.kind === 'agent');
  const snapshot = f.context.capture({ selectedIds: [agent.id], agentId: agent.id });
  const full = f.context.providerContext(snapshot), mcp = f.context.providerMcpContext(snapshot);
  assert.deepEqual(mcp, { mcpServers: full.mcpServers, disabledLegacyMcp: full.disabledLegacyMcp });
  assert.equal(full.customAgents.length, 1); assert.ok(full.instructionText);
  const broken = structuredClone(snapshot); broken.entries.find(e => e.kind === 'agent').content = '---\nhooks: []\n---\nRehearsal';
  assert.throws(() => f.context.providerContext(broken), /Agent is unavailable/);
  assert.throws(() => f.context.providerMcpContext(broken), /Agent is unavailable/);
  f.context.mutate(c => { c.modes[agent.id] = 'disabled'; }, f.context.config().revision);
  assert.throws(() => f.context.providerMcpContext(snapshot), /source was disabled/);
  assert.throws(() => f.context.withMcpSelectionBatch(() => { throw new Error('rehearsal error'); }), /rehearsal error/);
  assert.equal(f.context.mcpSelectionBatch, null);
});

test('precompiled discovery rules preserve nested globs, literal punctuation, inclusions and explicit selections', t => {
  const f = fixture(t);
  const paths = ['visible/AGENTS.md', 'node_modules/package/AGENTS.md', 'cache.a/AGENTS.md', 'cacheXa/AGENTS.md', 'generated/deep/AGENTS.md', 'generated/AGENTS.md', 'hidden/item/AGENTS.md', 'hidden/retained/AGENTS.md', 'scratch-one/AGENTS.md', 'scratch-two/AGENTS.md'];
  const write = relative => { const file = path.join(f.workspace,relative); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file, '# Synthetic instructions'); };
  paths.forEach(write);
  f.context.mutate(c => { const profile = c.workspaces[0]; profile.discovery.exclusions = ['node_modules', 'cache.a', 'generated/**', 'hidden', 'scratch-*']; profile.discovery.inclusions = ['hidden/retained']; }, f.context.config().revision);
  const discovered = f.context.get().entries.map(e => path.relative(f.workspace,e.path)).sort();
  assert.deepEqual(discovered, ['cacheXa/AGENTS.md','hidden/retained/AGENTS.md','visible/AGENTS.md']);
  // A restored catalogue can include excluded historical selections. The
  // explicit modes/favorites/defaults rules retain them exactly as before.
  const entries = paths.map((relative,i) => ({ id: 'synthetic-'+i, kind: 'instruction', name: relative, path: path.join(f.workspace,relative), roots: [f.workspace], defaultMode: 'available' }));
  f.context.catalog.entries = entries;
  let config = JSON.parse(fs.readFileSync(f.context.file,'utf8'));
  config.workspaces[0].modes[entries[1].id] = 'disabled'; config.favorites = [entries[2].id]; config.workspaces[0].defaults.selectedIds = [entries[4].id];
  sameMetadataWrite(f.context.file, JSON.stringify(config));
  assert.deepEqual(f.context.get().entries.map(e => e.id), [0,1,2,3,4,7].map(i => entries[i].id));
  config.workspaces[0].discovery.inclusions = ['hidden/item']; sameMetadataWrite(f.context.file, JSON.stringify(config));
  assert.deepEqual(f.context.get().entries.map(e => e.id), [0,1,2,3,4,6].map(i => entries[i].id));
});

test('bounded digest-only consumer identity cache preserves registry bindings and detects in-place changes', async t => {
  const f = fixture(t); let now = 1_000_000, listings = 0;
  const run = { id: 'rehearsal', title: 'Synthetic', providerSessionId: 'session', schedule: { provider: 'fake', context: { entries: [{ content: 'Rehearsal captured instructions' }] }, mcpServers: { first: { type: 'http', url: 'https://example.invalid', headers: { Authorization: 'SYNTHETIC_SECRET' } }, second: { command: 'node' } } } };
  const originalSchedule = structuredClone(run.schedule);
  const engine = { providers: { fake: { selectedMcp: r => r.schedule.mcpServers } }, listRuns: () => { listings++; return [run]; }, getRun: id => id === run.id ? run : undefined };
  const health = new IntegrationHealth(f.home, { engine, now: () => now });
  const rows = health.consumers();
  for (const row of rows) assert.equal(row.id, legacyId(run, row.server, run.schedule.mcpServers[row.server]));
  health.data.profiles[rows[0].id] = { label: 'Original registry binding', contexts: [] };
  health.observe(run, [{ name: 'first', status: 'failed', observedAt: new Date(now).toISOString() }]);
  health.data.observations[rows[0].id].recoveryAttempts = 3;
  const current = health.consumers(run.id); assert.equal(listings, 1);
  assert.equal(current[0].profile.label, 'Original registry binding'); assert.equal(current[0].recoveryAttempts, 3);
  assert.equal(current[0].stale, false); now += 600001; assert.equal(health.consumers(run.id)[0].stale, true);
  run.schedule.context.entries[0].content += ' edited';
  const edited = health.consumers(run.id)[0]; assert.notEqual(edited.id, rows[0].id); assert.equal(edited.id, legacyId(run, 'first', run.schedule.mcpServers.first)); assert.equal(edited.profile.label, undefined);
  run.schedule.mcpServers.first.url += '/changed'; assert.notEqual(health.consumers(run.id)[0].id, edited.id);
  const previous = health.consumers(run.id)[0].id; run.providerSessionId = 'new-session'; assert.notEqual(health.consumers(run.id)[0].id, previous);
  assert.deepEqual(health.consumers('missing'), []);
  run.schedule.mcpServers = Object.fromEntries(Array.from({ length: 1300 }, (_, i) => ['rehearsal-' + i, { command: 'node' }]));
  assert.equal(health.consumers(run.id).length, 1300); assert.equal(health.identities.size, 1024);
  assert.ok(!JSON.stringify([...health.identities]).includes('SYNTHETIC_SECRET'));
  assert.ok(!JSON.stringify(rows).includes('SYNTHETIC_SECRET'));
  run.schedule = originalSchedule; run.providerSessionId = 'session';
  const restored = health.consumers(run.id)[0]; assert.equal(restored.id, rows[0].id); assert.equal(restored.recoveryAttempts, 3); assert.equal(restored.profile.label, 'Original registry binding');
  await health.close(); assert.equal(health.identities.size, 0);
});

test('remote state snapshots collect runs once, preserve full counts and keep external schedule edits fresh', t => {
  const f = fixture(t), schedules = new ScheduleStore(path.join(f.home, 'schedules'));
  const schedule = { schemaVersion: 1, id: 'rehearsal', name: 'Original', enabled: false, cron: '0 9 * * 1-5', timezone: 'UTC', provider: 'rehearsal', model: '', workspace: { cwd: f.workspace, additionalDirectories: [] }, misfire: 'skip', prompt: 'Synthetic only', privateExtension: 'SYNTHETIC_SECRET' };
  schedules.save(schedule);
  const runs = Array.from({ length: 102 }, (_, i) => ({ id: 'run-' + i, title: 'Synthetic', trigger: 'chat', status: i === 100 ? 'running' : i === 101 ? 'failed' : 'completed', archivedAt: i === 101 ? '2026-01-01T00:00:00Z' : null, events: [], schedule }));
  let listings = 0; const service = { ...f, engine: { providers: {}, schedules, listRuns: () => { listings++; return runs; } }, attention: () => [] };
  const original = remoteState(service); assert.equal(listings, 1); assert.equal(original.runCount, 101); assert.equal(original.runCountIncludingArchived, 102); assert.equal(original.runningChatCount, 1); assert.equal(original.runs.length, 100); assert.equal(original.attentionCount, 0);
  assert.ok(!JSON.stringify(original).includes('SYNTHETIC_SECRET'));
  const file = path.join(schedules.dir, 'rehearsal.json'); sameMetadataWrite(file, fs.readFileSync(file, 'utf8').replace('Original', 'Modified'));
  const changed = remoteState(service); assert.equal(listings, 2); assert.equal(changed.schedules[0].name, 'Modified'); assert.notEqual(changed.schedules[0].revision, original.schedules[0].revision);
  assert.throws(() => schedules.save({ ...schedule, name: 'Stale write' }, original.schedules[0].revision), /changed/);
  assert.equal(schedules.get(schedule.id).privateExtension, 'SYNTHETIC_SECRET');
});

test('remote publication remains ordered and suppresses only unchanged state/run projections', t => {
  const f = fixture(t), run = { id: 'rehearsal', title: 'Synthetic', trigger: 'chat', status: 'running', events: [], schedule: { provider: 'fake', name: 'Rehearsal' } };
  let permissionRevision = 'one';
  const service = { ...f, attention: () => [], engine: { providers: {}, schedules: { list: () => [] }, listRuns: () => [run], runs: new Map([[run.id, run]]), getRun: () => run, permissions: { describeRun: () => ({ mode: 'ask' }), get: () => ({ revision: permissionRevision }) } } };
  const host = { service, config: { enabled: true }, peers: new Map([['peer', { device: { id: 'peer' }, runId: run.id }]]), journal: [], epoch: 'rehearsal', sequence: 0, send: () => {}, broadcast: RemoteHost.prototype.broadcast };
  RemoteHost.prototype.publish.call(host);
  assert.deepEqual(host.journal.map(e => e.event), ['state', 'run']);
  RemoteHost.prototype.publish.call(host); assert.equal(host.journal.length, 2);
  run.status = 'awaiting_input'; RemoteHost.prototype.publish.call(host);
  assert.deepEqual(host.journal.slice(2).map(e => e.event), ['state', 'run']);
  permissionRevision = 'two'; RemoteHost.prototype.publish.call(host);
  assert.equal(host.journal.at(-1).event, 'run'); assert.equal(host.journal.at(-1).data.permissionRevision, 'two');
  assert.deepEqual(host.journal.map(e => e.cursor), host.journal.map((_, i) => 'rehearsal:' + (i + 1)));
  host.peers.clear(); RemoteHost.prototype.publish.call(host); assert.equal(host.runSignatures.size, 0);
});
