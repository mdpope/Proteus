import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

// Synthetic rehearsal: a supplemental folder disappears after discovery but before chat creation.
const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-missing-folder-ui-')));
const appHome = path.join(home, 'app'), cwd = path.join(home, 'Available'), extra = path.join(home, 'Supplemental');
const screenshot = process.env.PROTEUS_SCREENSHOT || path.join(os.tmpdir(), 'proteus-missing-folder-ui.png');
for (const folder of [appHome, cwd, extra]) fs.mkdirSync(folder);
const retainedText = '# Synthetic available instructions\nKeep this valid instruction in the captured chat context.';
fs.writeFileSync(path.join(cwd, 'AGENTS.md'), retainedText);
fs.writeFileSync(path.join(extra, 'AGENTS.md'), '# Synthetic supplemental instructions\nThis source must be skipped after its folder disappears.');
fs.writeFileSync(path.join(appHome, 'settings.json'), JSON.stringify({ schemaVersion: 1, workspace: { cwd, additionalDirectories: [extra] }, provider: 'rehearsal', model: '', timezone: 'UTC', skillDirectories: [], mcpServers: {} }));
fs.writeFileSync(path.join(appHome, 'context.json'), JSON.stringify({ schemaVersion: 1, defaultWorkspaceId: 'default', workspaces: [{ id: 'default', name: 'Missing folder rehearsal', cwd, additionalDirectories: [extra] }], libraryFolders: [], documents: [], modes: {}, workspaceFiles: [] }));
let app, page;
const errors = [];
try {
  app = await electron.launch({ args: ['.', '--use-mock-keychain', '--user-data-dir=' + path.join(home, 'electron')], env: { ...process.env, PROTEUS_HOME: appHome, PORT: '0' } });
  page = await app.firstWindow();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('[data-page=context]').click();
  await page.locator('[data-workspace-configure]').first().click();
  await page.locator('[data-starting-folder]').waitFor();
  assert.deepEqual(await page.locator('[data-source-folder] summary .filepath').allTextContents(), [cwd, extra]);
  assert.equal(await page.locator('[data-source-folder] .context-table tbody tr').count(), 2, 'Both instruction sources were discovered before removal');

  fs.rmSync(extra, { recursive: true });
  await page.locator('[data-new-workspace-chat]').click();
  assert.equal(await page.locator('#chat-workspace').isDisabled(), true);
  await page.locator('#chat-provider').selectOption('rehearsal');
  await page.locator('#chat-prompt').fill('Synthetic missing supplemental folder regression.');
  await page.locator('#dialog-submit').click();
  await page.locator('#answer').waitFor();
  const warning = `Folder unavailable; skipped its sources for this chat: ${extra}`;
  await page.getByText(warning, { exact: true }).waitFor();
  await page.getByText('Local rehearsal — no AI provider was called.', { exact: false }).waitFor();
  await page.locator('#answer').fill('Complete the synthetic checkpoint.');
  await page.locator('#reply').click();
  await page.getByText('Turn complete', { exact: true }).waitFor();

  const files = fs.readdirSync(path.join(appHome, 'runs')).filter(name => name.endsWith('.json'));
  assert.equal(files.length, 1);
  const run = JSON.parse(fs.readFileSync(path.join(appHome, 'runs', files[0]), 'utf8'));
  assert.equal(run.status, 'completed');
  assert.equal(run.schedule.provider, 'rehearsal');
  assert.equal(run.schedule.workspace.cwd, cwd);
  assert.deepEqual(run.schedule.workspace.additionalDirectories, []);
  assert.deepEqual(run.schedule.context.entries.map(entry => entry.content), [retainedText]);
  assert.ok(run.events.some(event => event.role === 'system' && event.text === warning && event.data?.contextWarning?.path === extra));
  const config = JSON.parse(fs.readFileSync(path.join(appHome, 'context.json'), 'utf8'));
  assert.deepEqual(config.workspaces.find(workspace => workspace.id === 'default').additionalDirectories, [extra], 'Configured folder remains available for later recovery');
  assert.deepEqual(errors, []);
  await page.getByText(warning, { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: screenshot });
  console.log(JSON.stringify({ passed: true, rehearsal: true, checks: ['both sources discovered before removal', 'chat opens through workspace UI with missing supplemental folder', 'system warning visible', 'valid instruction retained and missing source omitted', 'execution excludes missing root while configuration retains it', 'rehearsal completes without a provider call'], screenshot }));
} catch (error) {
  if (page) await page.screenshot({ path: screenshot.replace(/\.png$/, '-failure.png') }).catch(() => {});
  throw error;
} finally {
  if (app) await app.close();
  fs.rmSync(home, { recursive: true, force: true });
}
