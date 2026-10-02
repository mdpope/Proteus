import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-models-ui-'));
let app;
try {
  app = await electron.launch({ args: ['.', '--user-data-dir=' + path.join(home, 'electron')], env: { ...process.env, PROTEUS_HOME: home, PORT: '0' }, timeout: 60000 });
  const page = await app.firstWindow();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  let models = [{ id: 'synthetic-one', name: 'Synthetic One' }, { id: 'synthetic-two', name: 'Synthetic Two' }];
  await page.route('**/api/provider', route => route.fulfill({ json: { available: true, models } }));
  await page.getByRole('heading', { name: 'Work that keeps moving.' }).waitFor();
  await page.locator('[data-schedule]').first().click();
  await page.locator('#provider').selectOption('copilot');
  await page.locator('#model option[value="synthetic-two"]').waitFor({ state: 'attached' });
  await page.locator('#model').selectOption('synthetic-two');
  await page.locator('#save').click();
  await page.getByText('Schedule saved.', { exact: true }).waitFor();
  assert.equal(await page.locator('#model').inputValue(), 'synthetic-two');
  models = [{ id: 'synthetic-one', name: 'Synthetic One' }];
  await page.locator('#model-refresh').click();
  await page.locator('#model option[value="synthetic-two"]').filter({ hasText: 'unavailable' }).waitFor({ state: 'attached' });
  assert.equal(await page.locator('#model').inputValue(), 'synthetic-two', 'Refresh preserves an unavailable saved model');
  await page.locator('[data-page="settings"]').click();
  await page.locator('#settings-provider').selectOption('copilot');
  await page.locator('#settings-model-refresh').click();
  await page.locator('#settings-model option[value="synthetic-one"]').waitFor({ state: 'attached' });
  assert.equal(await page.locator('#settings-model').evaluate(e => e.tagName), 'SELECT');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks: ['catalog selection persists', 'missing saved model retained', 'settings use same catalog'] }));
} finally { if (app) await app.close(); fs.rmSync(home, { recursive: true, force: true }); }
