import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-claude-recovery-ui-')));
const inherited = ['PATH','HOME','USER','LOGNAME','SHELL','LANG','LC_ALL','TMPDIR'];
const env = Object.fromEntries(inherited.filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
Object.assign(env, { PROTEUS_HOME: home, PORT: '0', COPILOT_HOME: path.join(home, 'copilot'), COPILOT_CLI_PATH: path.join(home, 'no-copilot'), PROTEUS_CODEX_PATH: path.join(home, 'no-codex'), PROTEUS_CLAUDE_PATH: path.join(home, 'no-claude'), CLAUDE_CONFIG_DIR: path.join(home, 'claude') });
let app;
try {
  app = await electron.launch({ args: ['.', '--use-mock-keychain', '--user-data-dir=' + path.join(home, 'browser')], env, timeout: 60000 });
  const page = await app.firstWindow(); await page.locator('#topbar-home').waitFor();
  const id = await app.evaluate(({ app }, home) => {
    const service = process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService(), engine = service.engine;
    service.syntheticClaudeRecovery = [];
    engine.providers.claude = { run: async ({ run, prompt, emit }) => {
      service.syntheticClaudeRecovery.push({ session: run.providerSessionId, prompt });
      emit('assistant', prompt === 'Synthetic queued follow-up' ? 'Synthetic follow-up completed' : 'Synthetic same-session continuation completed');
    } };
    const run = engine.createRun({ schemaVersion: 1, id: 'synthetic-claude-recovery', name: 'Synthetic Claude recovery', chatTitleManual: true, enabled: false, cron: '0 9 * * *', timezone: 'UTC', provider: 'claude', model: 'synthetic', workspace: { cwd: home, additionalDirectories: [] }, misfire: 'skip', prompt: 'Synthetic work' }, 'chat', null, { deferStart: true });
    delete run.deferredStart; delete run.nextPrompt;
    run.status = 'failed'; run.providerSessionId = 'synthetic-existing-session'; run.failureEventAt = engine.now();
    run.queuedMessages = [{ id: 'synthetic-follow-up', prompt: 'Synthetic queued follow-up', at: engine.now() }];
    engine.event(run, 'system', 'Claude exceeded the active execution time limit. Waiting for input was excluded. Continue this chat to resume the same session.', { failure: { kind: 'active-time-limit' } });
    return run.id;
  }, home);
  await page.locator('[data-page=runs]').first().click();
  await page.locator('.chat-index-row').filter({ hasText: 'Synthetic Claude recovery' }).click();
  const preference = page.getByLabel('Continue automatically after the two-hour execution safeguard');
  await preference.waitFor(); assert.equal(await preference.isChecked(), false);
  await page.locator('#followup').fill('Keep this unsent draft');
  await preference.check();
  await page.waitForFunction(() => !document.querySelector('[data-active-time-auto]').disabled);
  await preference.uncheck();
  await page.waitForFunction(() => !document.querySelector('[data-active-time-auto]').disabled);
  const failure = page.locator('.message.system').filter({ hasText: 'Claude exceeded the active execution time limit.' });
  await failure.getByRole('button', { name: 'Continue and enable automatic continuation' }).click();
  await page.getByText('Synthetic follow-up completed', { exact: true }).waitFor();
  const facts = await app.evaluate(({ app }, id) => {
    const service = process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService(), run = service.engine.getRun(id);
    return { calls: service.syntheticClaudeRecovery, session: run.providerSessionId, queue: run.queuedMessages, enabled: run.activeTimeContinuation.enabled };
  }, id);
  assert.equal(facts.calls.length, 2); assert.ok(facts.calls.every(call => call.session === 'synthetic-existing-session'));
  assert.match(facts.calls[0].prompt, /do not repeat completed external actions/); assert.equal(facts.calls[1].prompt, 'Synthetic queued follow-up');
  assert.equal(facts.enabled, true); assert.equal(facts.queue.length, 0); assert.equal(await page.locator('#followup').inputValue(), 'Keep this unsent draft');
  console.log(JSON.stringify({ passed: true, synthetic: true, checks: ['Claude two-hour preference', 'preference enable and revoke', 'Continue and enable', 'same session before queued input', 'unsent draft preserved'] }));
} finally { await app?.close(); fs.rmSync(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
