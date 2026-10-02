import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { CopilotClient } from '@github/copilot-sdk';
import { ContextStore } from '../src/context.js';
import { SettingsStore } from '../src/settings.js';
import { selectedAgentToolScope } from '../src/agent-tools.js';

if (!process.argv.includes('--run-live')) { console.log('Use --run-live for an isolated Copilot agent compatibility check.'); process.exit(0); }
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-agent-live-')));
const agentFile = path.join(root, '.github/agents/synthetic.agent.md'); fs.mkdirSync(path.dirname(agentFile), { recursive: true });
const marker = randomUUID(); const file = path.join(root, 'evidence.txt'); fs.writeFileSync(file, marker);
const settings = new SettingsStore(path.join(root, 'app'), root);
const client = new CopilotClient(); const sessions = []; const results = [];
try {
  await client.start();
  for (const [label, declaration] of [['portable', '[read, search, edit, execute]'], ['read-only', '[read, search]'], ['no-tools', '[]']]) {
    fs.writeFileSync(agentFile, `---\nname: Synthetic agent\ntools: ${declaration}\n---\nUse only the synthetic evidence file requested. Never edit or execute commands.\n`);
    const context = new ContextStore(path.join(root, 'app'), settings);
    const entry = context.get().entries.find(e => e.kind === 'agent');
    const snapshot = context.capture({ selectedIds: [entry.id], agentId: entry.id });
    const managed = context.providerContext(snapshot);
    const id = randomUUID();
    const config = { sessionId: id, model: process.env.PROTEUS_TEST_MODEL || 'gpt-6-sol', workingDirectory: root, skipCustomInstructions: true, enableConfigDiscovery: false, enableOnDemandInstructionDiscovery: false, enableSkills: false, enableFileHooks: false, customAgents: managed.customAgents, agent: managed.agent, availableTools: selectedAgentToolScope(managed), onPermissionRequest: async request => {
      if (request.kind === 'read' && path.resolve(root, request.path || request.resolvedPath || '') === file) return { kind: 'approve-once' };
      return { kind: 'reject' };
    } };
    let session = await client.createSession(config); sessions.push(id);
    await session.rpc.tools.initializeAndValidate();
    const available = (await session.rpc.tools.getCurrentMetadata()).tools.map(t => t.name);
    if (label === 'read-only') { assert.ok(available.includes('view')); assert.ok(!available.includes('bash')); assert.ok(!available.includes('edit')); assert.ok(!available.includes('create')); assert.ok(!available.includes('sql')); }
    if (label === 'no-tools') {
      assert.equal(available.length, 0);
      const answer = await session.sendAndWait({ prompt: 'Reply exactly PROTEUS_NO_TOOLS.' }, 90000);
      assert.ok(answer.data.content.includes('PROTEUS_NO_TOOLS'));
      await session.disconnect();
      session = await client.resumeSession(id, { ...config, agent: undefined, customAgents: [], availableTools: selectedAgentToolScope({ customAgents: [] }) });
      await session.rpc.agent.deselect(); await session.rpc.tools.initializeAndValidate();
      const restored = (await session.rpc.tools.getCurrentMetadata()).tools.map(t => t.name);
      assert.ok(restored.includes('view')); assert.ok(restored.includes('bash') || restored.includes('powershell'));
    }
    if (label === 'portable') {
      const answer = await session.sendAndWait({ prompt: `Read ${file} using the file-reading tool and return its exact contents. Do not run a command.` }, 90000);
      assert.ok(answer.data.content.includes(marker));
      await session.disconnect();
      session = await client.resumeSession(id, config);
      await session.rpc.tools.initializeAndValidate();
      const resumed = (await session.rpc.tools.getCurrentMetadata()).tools.map(t => t.name);
      assert.ok(resumed.includes('view'));
    }
    results.push({ label, tools: available });
    await session.disconnect();
  }
  console.log(JSON.stringify({ passed: true, results, checks: ['portable agent reads synthetic evidence', 'same native session resumes', 'read-only tools exclude editing and shell', 'empty list exposes no tools', 'deselecting restores default assistant tools'] }));
} finally {
  for (const id of sessions) { try { await client.deleteSession(id); } catch { /* Only these synthetic sessions are eligible. */ } }
  await client.stop(); fs.rmSync(root, { recursive: true, force: true });
}
