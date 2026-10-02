import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-rich-ui-'));
const fixture = '# Release checkpoint\n\n**Ready** for review, with *clear formatting*.\n\n| Client | Status |\n| :--- | ---: |\n| Mac | Ready |\n| iPhone / iPad | Ready |\n\n- [x] Render tables\n- [ ] Review next step\n\n> Keep reading while the agent works.\n\n```javascript\nconst status = "ready";\nconsole.log(status);\n```\n\n![Local diagram](plot.png)\n\n[Documentation](https://example.com)\n\n<script>window.injected=true</script>';
fs.copyFileSync('ios/Proteus/Assets.xcassets/AppIcon.appiconset/AppIcon.png', path.join(home, 'plot.png'));
let app;
try {
  app = await electron.launch({ args: ['.', '--user-data-dir=' + path.join(home, 'electron')], env: { ...process.env, PROTEUS_HOME: home, PORT: '0' }, timeout: 60000 });
  const page = await app.firstWindow(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  const id = await app.evaluate(async (_, { home, fixture }) => {
    const engine = process.mainModule.require(process.cwd() + '/desktop/main.cjs').getService().engine;
    engine.drain = async () => {};
    const schedule = { ...engine.schedules.list()[0], workspace: { cwd: home, additionalDirectories: [] } };
    schedule.context = { agentId: 'main', entries: [{ id: 'main', kind: 'agent', name: 'Milo', hash: 'synthetic-fixture' }] };
    const run = engine.createRun(schedule); run.status = 'running';
    run.events = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', at: engine.now(), text: `Earlier message ${i}\n\nA paragraph to read while new output arrives.` }));
    run.events.push({ role: 'assistant', at: engine.now(), text: fixture }); engine.persist(run); return run.id;
  }, { home, fixture });
  await page.locator('[data-page="runs"]').click(); await page.locator(`[data-run="${id}"]`).click();
  assert.match(await page.locator('.message.assistant .role').last().textContent(), /Milo/);
  const scroll = page.locator('#conversation'); const bottomGap = () => scroll.evaluate(e => e.scrollHeight - e.clientHeight - e.scrollTop);
  await page.waitForFunction(() => { const e = document.querySelector('#conversation'); return e && e.scrollHeight - e.clientHeight - e.scrollTop < 3; });
  await page.locator('.md-image img').waitFor(); await page.waitForFunction(() => document.querySelector('.md-image img').naturalWidth > 0);
  assert.equal(await page.locator('.md-table tr').count(), 3); assert.equal(await page.locator('.md-task:checked').count(), 1);
  assert.equal(await page.evaluate(() => window.injected), undefined);
  await page.locator('.md-copy').click(); assert.match(await app.evaluate(({ clipboard }) => clipboard.readText()), /const status = "ready"/);
  await scroll.evaluate(e => { e.scrollTop = e.scrollHeight; e.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(100);
  const update = async value => app.evaluate((_, { id, value }) => {
    const engine = process.mainModule.require(process.cwd() + '/desktop/main.cjs').getService().engine; const run = engine.getRun(id);
    if (value.stream) engine.stream(run, 'live', value.text); else { delete run.liveMessages; engine.event(run, 'assistant', value.text); }
  }, { id, value });
  await update({ stream: true, text: '## Streaming response\n\n' + 'New output.\n\n'.repeat(20) });
  await page.getByRole('heading', { name: 'Streaming response' }).waitFor();
  await page.waitForFunction(() => { const e = document.querySelector('#conversation'); return e.scrollHeight - e.clientHeight - e.scrollTop < 3; });
  await scroll.evaluate(e => { e.scrollTop = 250; e.dispatchEvent(new Event('scroll')); });
  const saved = await scroll.evaluate(e => e.scrollTop);
  await update({ stream: true, text: 'More streamed output\n\n'.repeat(20) });
  await page.waitForFunction(() => document.querySelector('#conversation').textContent.includes('More streamed output'));
  assert.ok(Math.abs(await scroll.evaluate(e => e.scrollTop) - saved) < 3, 'Reading position survives streaming');
  await update({ text: 'Completed response\n\n' + fixture });
  await page.waitForFunction(() => document.querySelector('#conversation').textContent.includes('Completed response'));
  assert.ok(Math.abs(await scroll.evaluate(e => e.scrollTop) - saved) < 3, 'Reading position survives completed message');
  await page.locator('.jump-latest').click(); assert.ok(await bottomGap() < 3);
  await update({ text: 'Final new message' }); await page.getByText('Final new message', { exact: true }).waitFor();
  await page.waitForFunction(() => { const e = document.querySelector('#conversation'); return e.scrollHeight - e.clientHeight - e.scrollTop < 3; });
  // Return to the formatted response for visual review, without a giant image obscuring it.
  await page.locator('.md-image img').evaluateAll(images => images.forEach(image => image.style.maxHeight = '100px'));
  await page.getByRole('heading', { name: 'Release checkpoint' }).last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/private/tmp/proteus-rich-chat.png' });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks: ['tables and highlighted code', 'copy code', 'workspace inline image', 'inert HTML', 'follow streaming at bottom', 'preserve reading position through streaming and completion', 'jump to latest resumes following'] }));
} finally { if (app) await app.close(); fs.rmSync(home, { recursive: true, force: true }); }
