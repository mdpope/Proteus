import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import { fakeSession } from './fake-copilot.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { agentMetadata, selectedAgentToolScope } from '../src/services/chats/agent-tools.js';
import { ContextStore } from '../src/services/workspaces/context.js';
import { SettingsStore } from '../src/services/settings/settings.js';
import { CopilotProvider } from '../src/providers/copilot.js';

const profile = frontmatter => `---\nname: Synthetic agent\n${frontmatter}\n---\nUse only the selected workspace.`;
test('portable tool groups parse as YAML flow lists, block lists and comma strings', () => {
  const expected = agentMetadata(profile('tools: [read, search, edit, execute]'));
  assert.deepEqual(expected.issues, []);
  for (const declaration of ['tools:\n  - read\n  - search\n  - edit\n  - execute', 'tools: "read, search, edit, execute"', "tools: ['read', 'search', 'edit', 'execute'] # compatible"]) assert.deepEqual(agentMetadata(profile(declaration)), expected);
  assert.ok(expected.tools.includes('view')); assert.ok(expected.tools.includes('grep')); assert.ok(expected.tools.includes('create')); assert.ok(expected.tools.includes(process.platform === 'win32' ? 'powershell' : 'bash'));
  assert.ok(!expected.tools.includes('proteus_browser')); assert.ok(!expected.tools.includes('task'));
});
test('read-only, empty, omitted and wildcard tool declarations retain distinct scopes', () => {
  assert.deepEqual(agentMetadata(profile('tools: [read, search]')).tools, ['view', 'grep', 'glob']);
  assert.deepEqual(agentMetadata(profile('tools: []')).tools, []);
  assert.equal(agentMetadata(profile('')).tools, null);
  assert.equal(agentMetadata(profile('tools: ["*"]')).tools, null);
  assert.deepEqual(agentMetadata(profile('tools: [view, team/read_item, team/*]')).tools, ['view', 'team/read_item', 'team/*']);
  assert.deepEqual(agentMetadata(profile('tools: [Read, MultiEdit, shell]')).issues, []);
});
test('invalid declarations and unsupported controls remain visibly unavailable', () => {
  for (const declaration of ['tools: null', 'tools: [42]', 'tools: {read: true}', 'tools: [read', 'tools: []\ntools: [execute]', 'tools: [unknownTool]', 'tools: [constructor]', 'tools: [__proto__]', 'hooks: {}', 'mcp-servers: {}']) assert.ok(agentMetadata(profile(declaration)).issues.length, declaration);
  assert.ok(agentMetadata(profile('tools: ["*", unknownTool]')).issues.length);
  assert.equal(agentMetadata(profile('disable-model-invocation: true')).infer, false);
  assert.equal(agentMetadata(profile('infer: false\ndisable-model-invocation: false')).infer, true);
  assert.equal(agentMetadata(profile('user-invocable: false')).userInvocable, false);
});
test('selected agent restrictions reach Copilot on create and resume and survive captured source versions', async t => {
  const root = fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-agent-tools-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, '.github/agents/example.agent.md'); fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, profile('tools: [read, search]'));
  const settings = new SettingsStore(path.join(root, 'app'), root); const context = new ContextStore(path.join(root, 'app'), settings);
  const entry = context.get().entries.find(e => e.kind === 'agent');
  assert.deepEqual(entry.unsupportedAgentFields, []);
  const snapshot = context.capture({ selectedIds: [entry.id], agentId: entry.id });
  const run = { id: 'synthetic-agent', schedule: { provider: 'copilot', model: 'fixture', workspace: snapshot.workspace, context: snapshot }, usage: { inputTokens: 0, outputTokens: 0 } };
  const configs = [];
  const session = fakeSession({ sessionId: run.id });
  const provider = new CopilotProvider({}, { context });
  provider.connect = async () => ({ listModels: async () => [{ id: 'fixture' }], createSession: async config => { configs.push(config); return session; }, resumeSession: async (_id, config) => { configs.push(config); return session; } });
  for (let i = 0; i < 2; i++) {
    await provider.run({ run, prompt: 'Synthetic read', signal: new AbortController().signal, emit() {}, update() {}, ask() { throw new Error('No tools in stub'); } });
    fs.writeFileSync(file, profile('tools: [execute]')); context.refresh();
  }
  assert.equal(configs.length, 2);
  for (const config of configs) { assert.deepEqual(config.customAgents[0].tools, ['view', 'grep', 'glob']); assert.equal(config.agent, config.customAgents[0].name); assert.deepEqual(config.availableTools, ['view', 'grep', 'glob']); }
  const current = context.capture({ selectedIds: [entry.id], agentId: entry.id });
  assert.ok(context.providerContext(current).customAgents[0].tools.includes(process.platform === 'win32' ? 'powershell' : 'bash'));
  fs.writeFileSync(file, profile('tools: []')); context.refresh();
  assert.deepEqual(context.providerContext(context.capture({ selectedIds: [entry.id], agentId: entry.id })).customAgents[0].tools, []);
});

test('selected main agents cap session tools without enabling unconfigured MCP servers', () => {
  for (const tools of [[], ['view'], null]) {
    assert.deepEqual(selectedAgentToolScope({ agent: 'sample', customAgents: [{ name: 'sample', tools }] }), tools ?? ['builtin:*', 'mcp:*', 'custom:*']);
  }
  assert.deepEqual(selectedAgentToolScope({ customAgents: [{ name: 'helper', tools: ['view'] }] }), ['builtin:*', 'mcp:*', 'custom:*']);
  assert.deepEqual(selectedAgentToolScope({ agent: 'sample', customAgents: [{ name: 'sample', tools: ['view', 'team/read_item', 'team/*'] }] }), ['view', 'mcp:*']);
});
