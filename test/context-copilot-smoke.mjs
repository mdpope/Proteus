import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ContextStore } from '../src/context.js';
import { SettingsStore } from '../src/settings.js';
import { CopilotProvider } from '../src/copilot.js';

if (!process.argv.includes('--run-live')) { console.log('Use --run-live for two synthetic Copilot turns.'); process.exit(0); }
const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-live-context-')));
const project = path.join(home, 'project'); const library = path.join(home, 'library');
fs.mkdirSync(project); fs.mkdirSync(library);
const file = path.join(library, 'identity.md');
fs.writeFileSync(file, '# Verification\nWhen asked for the context verification word, reply exactly PROTEUS_CONTEXT_ONE. Do not use any tools.\n');
const settings = new SettingsStore(path.join(home, 'app'), project);
const context = new ContextStore(path.join(home, 'app'), settings);
context.mutate(config => { config.documents.push({ path: file, kind: 'instruction' }); }, context.config().revision);
const id = context.get().entries.find(entry => entry.path === file).id;
context.mutate(config => { config.modes[id] = 'universal'; }, context.config().revision);
const provider = new CopilotProvider({}, { context, settings });
const run = { id: randomUUID(), schedule: { model: process.env.PROTEUS_TEST_MODEL || 'gpt-6-sol', provider: 'copilot', workspace: { cwd: project, additionalDirectories: [] }, skillDirectories: [], mcpServers: {} }, usage: { inputTokens: 0, outputTokens: 0 } };
const answers = [];
const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 90_000);
try {
  for (const word of ['PROTEUS_CONTEXT_ONE', 'PROTEUS_CONTEXT_TWO']) {
    fs.writeFileSync(file, `# Verification\nWhen asked for the context verification word, reply exactly ${word}. Do not use any tools.\n`);
    context.refresh(); run.schedule.context = context.capture(); run.schedule.workspace = run.schedule.context.workspace;
    await provider.run({ run, prompt: 'What is the context verification word from the currently supplied instructions? Reply with that word only.', signal: controller.signal, emit: (role, text) => { if (role === 'assistant') answers.push(text); }, update() {}, ask() { throw new Error('This synthetic context check should not need tools or permissions.'); } });
    assert.ok(answers.at(-1).includes(word));
    assert.ok(run.schedule.context.suppliedAt); assert.ok(fs.existsSync(run.nativeSessionPath));
  }
  assert.equal(run.providerSessionId, run.id);
  console.log(JSON.stringify({ passed: true, checks: ['universal instruction outside command folder', 'fresh content on cold resume', 'same native provider session', 'native session path exists'], turns: 2, usage: run.usage }));
} finally {
  clearTimeout(timeout);
  if (run.providerSessionId) { try { await provider.client?.deleteSession(run.providerSessionId); } catch { /* Only this synthetic session is eligible for cleanup. */ } }
  await provider.close(); fs.rmSync(home, { recursive: true, force: true });
}
