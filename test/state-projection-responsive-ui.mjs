// Isolated desktop acceptance: real chat composer/scroll view under concurrent
// state refreshes. No provider turn or operational application data is used.
import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-state-responsive-'));
let app;
try {
  app = await electron.launch({ args: ['test/account-queue-ui-host.cjs', '--use-mock-keychain', '--user-data-dir=' + path.join(home, 'electron')], env: { ...process.env, PROTEUS_HOME: home, PROTEUS_TEST_LONG_HISTORY: '1' } });
  const page = await app.firstWindow();
  await page.locator('[data-page=runs]').first().click();
  await page.locator('.chat-index-row').filter({ hasText: 'Long mixed history fixture' }).click();
  await page.getByText('History marker 2506', { exact: false }).waitFor();
  await app.evaluate(() => {
    const require = process.mainModule.require.bind(process.mainModule);
    const service = require(process.cwd() + '/test/account-queue-ui-host.cjs').service();
    const fs = require('node:fs'), path = require('node:path');
    const roots = Array.from({ length: 12 }, (_, i) => path.join(service.home, 'root-' + i)); roots.forEach(root => fs.mkdirSync(root));
    const source = service.engine.getRun('long-history-fixture');
    for (let i = 0; i < 500; i++) {
      const id = 'synthetic-worker-' + i, workspace = { cwd: service.home, additionalDirectories: roots };
      service.engine.runs.set(id, { ...source, id, title: id, events: [], schedule: { ...source.schedule, workspace, context: { workspaceId: service.context.config().defaultWorkspaceId, baseWorkspace: workspace, entries: [] } } });
    }
  });
  const input = page.locator('#followup'), scroll = page.locator('.conversation');
  await input.fill('');
  await scroll.evaluate(node => { node.scrollTop = Math.max(100, node.scrollHeight - node.clientHeight - 170); node.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(100);
  const before = await scroll.evaluate(node => node.scrollTop), composer = await input.elementHandle();
  const workload = app.evaluate(async () => {
    const service = process.mainModule.require(process.cwd() + '/test/account-queue-ui-host.cjs').service();
    for (let i = 0; i < 15; i++) {
      service.notify();
      const response = await fetch(service.origin + '/api/state?summaries=1&synthetic=' + i, { headers: { authorization: 'Bearer ' + service.token } });
      if (!response.ok) throw Error('Concurrent state refresh failed: ' + response.status);
      await response.arrayBuffer();
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    return (await (await fetch(service.origin + '/api/performance/diagnostics', { headers: { authorization: 'Bearer ' + service.token } })).json()).stateProjection;
  });
  // Both promises are observed immediately, including failures during input.
  const [, diagnostics] = await Promise.all([
    input.pressSequentially('Draft retained while state refreshes', { delay: 20 }), workload
  ]);
  assert.equal(await input.inputValue(), 'Draft retained while state refreshes');
  assert.ok(await composer.evaluate(node => node.isConnected && document.activeElement === node));
  const after = await scroll.evaluate(node => node.scrollTop);
  assert.ok(Math.abs(before - after) < 2, JSON.stringify({ before, after }));
  assert.ok(diagnostics.operations >= 15); assert.equal(diagnostics.failures, 0);
  console.log(JSON.stringify({ passed: true, synthetic: true, savedChats: 500, historyEvents: 2507, typedDraftPreserved: true, composerFocusPreserved: true, readingPosition: { before, after }, worker: diagnostics }));
} finally { await app?.close(); fs.rmSync(home, { recursive: true, force: true }); }
