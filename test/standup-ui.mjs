import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-standup-ui-'));
let app;
try {
  app = await electron.launch({ args: ['.', '--user-data-dir=' + path.join(home, 'electron')], env: { ...process.env, PROTEUS_HOME: home, COPILOT_HOME: path.join(home, 'copilot'), PORT: '0' }, timeout: 60000 });
  const page = await app.firstWindow(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  let remaining = 63.5;
  await page.route('**/api/usage', route => route.fulfill({ json: { checkedAt: new Date().toISOString(), quota: { quotaSnapshots: { premium_interactions: { remainingPercentage: remaining, isUnlimitedEntitlement: false } } } } }));
  await page.locator('[data-page="standup"]').waitFor(); await page.reload(); await page.getByText('63.5% remaining', { exact: true }).waitFor();
  assert.equal(await page.locator('#copilot-usage progress').getAttribute('value'), '63.5');
  remaining = 42; await page.getByRole('button', { name: 'Refresh Copilot usage' }).click(); await page.getByText('42% remaining', { exact: true }).waitFor();
  await app.evaluate(() => {
    const service = process.mainModule.require(process.cwd() + '/desktop/main.cjs').getService();
    const current = service.standup.get(); service.standup.save({ ...current, random: [], fixed: ['Avery', 'Jordan', 'Morgan'], instructions: 'Review progress.\nCapture follow-ups.' }, current.revision);
    service.standup.generate(service.standup.get().revision);
  });
  await page.locator('[data-page="standup"]').click();
  await page.waitForFunction(() => !document.querySelector('#popout-standup').disabled);
  const popupEvent = app.waitForEvent('window'); await page.locator('#popout-standup').click(); const popup = await popupEvent;
  await popup.locator('#order li').first().waitFor();
  assert.deepEqual(await popup.locator('#order li').allTextContents(), ['Avery', 'Jordan', 'Morgan']);
  const sidebarWidth = await page.locator('#sidebar').evaluate(e => e.getBoundingClientRect().width);
  const bounds = await app.evaluate(({ BrowserWindow, screen }) => {
    const main = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().startsWith('http'));
    const floating = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('standup.html'));
    return { bounds: floating.getBounds(), area: screen.getDisplayMatching(main.getBounds()).workArea, top: floating.isAlwaysOnTop() };
  });
  assert.equal(bounds.top, true); assert.equal(bounds.bounds.x, bounds.area.x); assert.equal(bounds.bounds.y, bounds.area.y); assert.equal(bounds.bounds.height, bounds.area.height); assert.equal(bounds.bounds.width, sidebarWidth);
  await page.locator('#popout-standup').click(); assert.equal(app.windows().length, 2);
  await app.evaluate(() => {
    const store = process.mainModule.require(process.cwd() + '/desktop/main.cjs').getService().standup;
    const current = store.get(); store.save({ ...current, fixed: ['Sam', 'Riley'] }, current.revision); store.generate(store.get().revision);
  });
  await popup.getByText('Sam', { exact: true }).waitFor(); assert.deepEqual(await popup.locator('#order li').allTextContents(), ['Sam', 'Riley']);
  const closeBox = await popup.locator('#close').boundingBox(); const size = popup.viewportSize() || await popup.evaluate(() => ({ height: innerHeight })); assert.ok(size.height - closeBox.y - closeBox.height < 30);
  await page.screenshot({ path: '/private/tmp/proteus-usage-sidebar.png' }); await popup.screenshot({ path: '/private/tmp/proteus-standup-popout.png' });
  const closed = popup.waitForEvent('close'); await popup.locator('#close').click(); await closed; assert.equal(page.isClosed(), false);
  assert.deepEqual(errors, []); console.log(JSON.stringify({ passed: true, checks: ['remaining/used percentage and refresh', 'floating window matches sidebar and usable screen height', 'always on top', 'single window', 'live regenerated order', 'bottom Close preserves host'] }));
} finally { if (app) await app.close(); fs.rmSync(home, { recursive: true, force: true }); }
