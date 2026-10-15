// Live, opt-in Linux acceptance test. Uses existing Codex sign-in and disposable data.
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { RemoteClient } from './remote-client.mjs';

if (process.platform !== 'linux') throw new Error('Run this acceptance test on Linux.');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-linux-desktop-'));
const workspace = path.join(home, 'workspace'); fs.mkdirSync(workspace);
const screenshot = process.env.PROTEUS_SCREENSHOT || path.join(os.tmpdir(), 'proteus-linux-desktop.png');
fs.writeFileSync(path.join(home, 'settings.json'), JSON.stringify({ schemaVersion: 1, provider: 'codex', model: '', timezone: 'UTC', workspace: { cwd: workspace, additionalDirectories: [] }, skillDirectories: [], mcpServers: {} }));
const executablePath = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
const until = async (fn, label) => {
  const end = Date.now() + 120_000;
  while (!await fn()) { if (Date.now() > end) throw new Error('Timed out: ' + label); await new Promise(r => setTimeout(r, 200)); }
};
let app, client;
const checks = [];
const launch = () => electron.launch({ ...(executablePath ? { executablePath } : {}), args: [...(executablePath ? [] : ['.']), '--user-data-dir=' + path.join(home, 'browser')], env: { ...process.env, PROTEUS_HOME: home, PORT: '0' }, timeout: 60_000 });
const state = () => app.evaluate(({ app }) => {
  const service = process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService();
  return service.engine.listRuns().map(r => ({ id: r.id, status: r.status, pending: r.pending, session: r.providerSessionId, usage: r.usage, events: r.events }));
});
try {
  app = await launch(); let page = await app.firstWindow();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.locator('#topbar-home').waitFor();
  const status = await app.evaluate(async ({ app }) => process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService().catalogs.codex.get());
  assert.ok(status.available, status.error);
  assert.equal(await app.evaluate(({ app }) => app.getVersion()), JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')).version);
  const model = status.models.find(m => m.controls.reasoningEfforts.includes('low')) || status.models.find(m => m.isDefault) || status.models[0];
  assert.ok(model); checks.push('desktop startup and live Codex model catalog');
  if (executablePath) {
    const resources = path.join(path.dirname(executablePath), 'resources', 'app');
    for (const excluded of ['.git', '.aws', '.codex', '.agents', '.runtime', '.env', 'ios', 'test', 'web']) assert.equal(fs.existsSync(path.join(resources, excluded)), false, 'Package excludes ' + excluded);
    assert.ok(fs.existsSync(path.join(path.dirname(executablePath), 'proteus.desktop')));
    checks.push('Linux package excludes development state and includes desktop entry');
  }
  await page.locator('#tab-add-menu summary').click();
  await page.locator('#new-chat').click();
  await page.locator('#chat-provider').selectOption('codex');
  await page.waitForFunction(id => [...document.querySelector('#chat-model').options].some(o => o.value === id), model.id);
  await page.locator('#chat-model').selectOption(model.id);
  if (model.controls.reasoningEfforts.includes('low')) await page.locator('#chat-model-effort').selectOption('low');
  await page.locator('#chat-prompt').fill('Synthetic Linux acceptance test in this disposable workspace. Use a shell command to write exactly LINUX_TOOL_OK to linux-tool.txt, read it back, then reply LINUX_FILE_OK. Do not use network access or inspect files outside this workspace.');
  await page.locator('#dialog-submit').click();
  let approvals = 0;
  await until(async () => {
    const [run] = await state(); if (!run) return false;
    if (run.status === 'awaiting_input') { assert.equal(run.pending.type, 'permission'); await page.locator('#approve').click(); approvals++; }
    if (run.status === 'failed') throw new Error('Codex turn failed: ' + JSON.stringify(run.events.filter(e => e.role === 'system')));
    return run.status === 'completed';
  }, 'Codex file tool and approval UI');
  assert.equal(fs.readFileSync(path.join(workspace, 'linux-tool.txt'), 'utf8').trim(), 'LINUX_TOOL_OK');
  const [first] = await state(); assert.ok(first.session); assert.ok(first.usage.observed);
  assert.ok(first.events.some(e => e.role === 'assistant' && e.text.includes('LINUX_FILE_OK')));
  checks.push('real Codex shell/file execution, streamed result and observed usage');
  if (approvals) checks.push('native approval accepted through desktop UI');
  const terminal = await page.evaluate(async () => {
    const state = await window.desktop.terminal({ action: 'state' });
    const profiles = state.profiles.profiles;
    profiles[0] = { ...profiles[0], shell: '/bin/sh', command: 'printf LINUX_PTY_OK; read answer; printf LINUX_PTY_INPUT:%s "$answer"; read finish' };
    await window.desktop.terminal({ action: 'save-profiles', profiles, expectedRevision: state.profiles.revision });
    return window.desktop.terminal({ action: 'create' });
  });
  await until(async () => (await page.evaluate(id => window.desktop.terminal({ action: 'snapshot', id }), terminal.id)).data.includes('LINUX_PTY_OK'), 'packaged native PTY output');
  await page.evaluate(id => window.desktop.terminal({ action: 'write', id, data: 'SYNTHETIC_INPUT\r' }), terminal.id);
  await until(async () => (await page.evaluate(id => window.desktop.terminal({ action: 'snapshot', id }), terminal.id)).data.includes('LINUX_PTY_INPUT:SYNTHETIC_INPUT'), 'packaged native PTY input');
  await page.evaluate(id => window.desktop.terminal({ action: 'close', id }), terminal.id);
  checks.push('packaged native terminal module, shell output and input');
  await page.screenshot({ path: screenshot });
  await app.close(); app = await launch(); page = await app.firstWindow();
  await page.locator('#topbar-home').waitFor();
  page.on('pageerror', e => errors.push(e.message));
  assert.equal((await state())[0].session, first.session); checks.push('history and native session survive application restart');
  // Built-in relay stays opt-in and listens on an available port for this test only.
  const relay = await app.evaluate(async ({ app }) => {
    const service = process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService();
    const net = process.mainModule.require('node:net');
    const probe = net.createServer(); await new Promise(r => probe.listen(0, '127.0.0.1', r));
    const port = probe.address().port; await new Promise(r => probe.close(r));
    await service.remote.configure({ enabled: true, mode: 'local', port }); return { port };
  });
  await until(() => app.evaluate(({ app }) => process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService().remote.status === 'online'), 'local relay');
  const invite = await app.evaluate(({ app }, port) => process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService().remote.pairing('ws://127.0.0.1:' + port), relay.port);
  client = await new RemoteClient(RemoteClient.capsule(invite.code)).connect();
  checks.push('built-in Linux relay and encrypted synthetic mobile pairing');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await until(() => app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0]; return process.env.PROTEUS_CLOSE_TO_TRAY === '1' ? !w.isVisible() : w.isMinimized();
  }), 'close retains host');
  await client.request('chat.send', { id: first.id, prompt: 'No tools. Reply LINUX_REMOTE_CONTINUATION_OK only.', mode: 'queue' });
  await until(async () => {
    const run = (await state()).find(r => r.id === first.id);
    if (run.status === 'failed') throw new Error('Remote continuation failed');
    return run.status === 'completed' && run.events.some(e => e.role === 'assistant' && e.text.includes('LINUX_REMOTE_CONTINUATION_OK'));
  }, 'encrypted remote continuation');
  assert.equal((await state())[0].session, first.session);
  await client.request('chat.send', { id: first.id, prompt: 'Synthetic cancellation check. Run a shell command that sleeps for 30 seconds before replying LINUX_CANCEL_SENTINEL. Do not use any other tools.', mode: 'queue' });
  await until(async () => {
    const run = (await state())[0];
    return run.status === 'awaiting_input' || run.events.some(e => e.data?.tool?.status === 'running');
  }, 'cancellable native tool request');
  await client.request('chat.cancel', { id: first.id });
  await until(async () => (await state())[0].status === 'cancelled', 'native cancellation');
  await client.request('chat.send', { id: first.id, prompt: 'No tools. Reply LINUX_AFTER_CANCEL_OK only.', mode: 'queue' });
  await until(async () => {
    const run = (await state())[0];
    return run.status === 'completed' && run.events.some(e => e.role === 'assistant' && e.text.includes('LINUX_AFTER_CANCEL_OK'));
  }, 'continuation after cancellation');
  assert.equal((await state())[0].session, first.session); checks.push('native cancellation and same-session continuation');
  const device = client.device; client.close();
  client = await new RemoteClient(RemoteClient.capsule(invite.code), device).connect();
  await client.request('sync'); checks.push('remote continuation while minimized and authenticated reconnect');
  await app.evaluate(({ app }) => {
    process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getTray()?.emit('click');
  });
  await until(() => app.evaluate(({ BrowserWindow }) => !BrowserWindow.getAllWindows()[0].isMinimized()), 'tray activation restores window');
  await app.evaluate(({ app }, deviceId) => process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService().remote.revoke(deviceId), device.id);
  await until(() => client.failure === 'revoked', 'device revocation'); checks.push('Linux tray activation and device revocation');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, executable: executablePath ? 'packaged' : 'development', model: model.id, approvals, checks, screenshot }));
} finally {
  client?.close(); if (app) await app.close(); fs.rmSync(home, { recursive: true, force: true });
}
