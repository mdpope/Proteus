// Credential-free package acceptance. Rehearsal output is synthetic; no model is called.
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { hostPlatformMetadata } from '../src/shared/host-platform.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2] || process.argv.slice(3).some(value => value !== '--structure-only')) throw new Error('Usage: node test/desktop-package-ui.mjs /absolute/path/to/packaged/executable [--structure-only]');
const executablePath = fs.realpathSync(path.resolve(process.argv[2]));
const packagedRoot = process.platform === 'darwin' ? path.resolve(path.dirname(executablePath), '../Resources/app') : path.join(path.dirname(executablePath), 'resources/app');
const metadata = JSON.parse(fs.readFileSync(path.join(packagedRoot, 'package.json'), 'utf8'));
const provenance = JSON.parse(fs.readFileSync(path.join(packagedRoot, 'build-source.json'), 'utf8'));
const digest = value => createHash('sha256').update(value).digest('hex');
const runtimeRoots = ['desktop', 'public', 'src', 'schemas', 'templates', 'relay'];
const collect = relative => fs.readdirSync(path.join(packagedRoot, relative), { withFileTypes: true }).flatMap(entry => {
  const name = path.posix.join(relative, entry.name);
  if (entry.isDirectory()) return collect(name);
  assert.ok(entry.isFile(), 'Runtime entries must be ordinary files: ' + name);
  return [name];
});
assert.equal(metadata.version, JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version, 'Package version matches this checkout');
assert.equal(metadata.buildRevision, provenance.buildRevision);
assert.match(provenance.sourceFingerprint, /^[a-f0-9]{64}$/);
const identity = Object.hasOwn(provenance, 'gitHead') ? { gitHead: provenance.gitHead, dirty: provenance.dirty } : {};
assert.equal(digest(JSON.stringify({ runtimeFiles: provenance.runtimeFiles, buildInputs: provenance.buildInputs, ...identity })), provenance.sourceFingerprint, 'Embedded runtime fingerprint is self-consistent');
assert.ok(metadata.buildRevision.includes(provenance.sourceFingerprint.slice(0, 12)));
assert.deepEqual(fs.readdirSync(packagedRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort(), [...runtimeRoots, 'node_modules'].sort(), 'No app data, private configuration or development directories ship');
const runtimeFiles = [...runtimeRoots.flatMap(collect), ...fs.readdirSync(packagedRoot, { withFileTypes: true }).filter(entry => entry.isFile() && !['package.json', 'build-source.json'].includes(entry.name)).map(entry => entry.name)].sort();
assert.deepEqual(runtimeFiles, Object.keys(provenance.runtimeFiles).sort(), 'Runtime file set matches manifest');
for (const [relative, hash] of Object.entries(provenance.runtimeFiles)) {
  assert.ok(!path.posix.isAbsolute(relative) && !relative.split('/').includes('..'), 'Manifest paths stay inside the package');
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(digest(fs.readFileSync(path.join(packagedRoot, relative))), hash, 'Packaged runtime hash: ' + relative);
}
for (const excluded of ['.git', '.github', '.aws', '.codex', '.agents', '.runtime', '.env', '.env.local', 'connection.json', 'remote.json', 'desktop-peers.enc', 'runs', 'browser', 'ios', 'test', 'web']) assert.equal(fs.existsSync(path.join(packagedRoot, excluded)), false, 'Package excludes ' + excluded);
const checks = ['package version and build identity', 'self-consistent source fingerprint and every runtime hash', 'private configuration and app data excluded'];
if (process.argv.includes('--structure-only')) {
  console.log(JSON.stringify({ passed: true, mode: 'structure-only; UI and current source acceptance not verified', version: metadata.version, sourceFingerprint: provenance.sourceFingerprint, checks }));
} else {
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-package-ui-')));
  const workspace = path.join(temporary, 'workspace');
  fs.mkdirSync(workspace); fs.mkdirSync(path.join(temporary, 'schedules'));
  fs.writeFileSync(path.join(temporary, 'settings.json'), JSON.stringify({ schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC', workspace: { cwd: workspace, additionalDirectories: [] }, copilotDataDirectory: path.join(temporary, 'copilot'), skillDirectories: [], mcpServers: {} }));
  fs.writeFileSync(path.join(temporary, 'schedules/workspace-pulse.json'), JSON.stringify({ schemaVersion: 1, id: 'workspace-pulse', name: 'Synthetic package rehearsal', enabled: false, cron: '0 9 * * 1-5', timezone: 'UTC', provider: 'rehearsal', model: '', workspace: { cwd: workspace, additionalDirectories: [] }, misfire: 'skip', prompt: 'Synthetic package feedback rehearsal. No model calls.' }));
  // Preserve only OS launch/display settings. Provider paths deliberately fail
  // before any CLI can inspect existing credentials, even on a signed-in machine.
  const inherited = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'DISPLAY', 'WAYLAND_DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS', 'TMPDIR', 'TMP', 'TEMP'];
  const env = Object.fromEntries(inherited.filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
  Object.assign(env, { PROTEUS_HOME: temporary, PORT: '0', COPILOT_HOME: path.join(temporary, 'copilot'), COPILOT_CLI_PATH: path.join(temporary, 'unavailable-copilot'), PROTEUS_CODEX_PATH: path.join(temporary, 'unavailable-codex'), PROTEUS_CLAUDE_PATH: path.join(temporary, 'unavailable-claude'), CLAUDE_CONFIG_DIR: path.join(temporary, 'claude') });
  let application;
  const errors = [];
  const closeApplication = async () => {
    if (!application) return;
    const current = application, child = current.process(); application = null;
    let timer;
    const closed = await Promise.race([current.close().then(() => true, () => false), new Promise(resolve => { timer = setTimeout(() => resolve(false), 10_000); })]);
    clearTimeout(timer);
    if (!closed && !child.killed) child.kill('SIGKILL');
  };
  const until = async (callback, label) => {
    const end = Date.now() + 30_000;
    while (!await callback()) { if (Date.now() >= end) throw new Error('Timed out: ' + label); await new Promise(resolve => setTimeout(resolve, 100)); }
  };
  const launch = async () => {
    application = await electron.launch({ executablePath, args: [...(process.platform === 'darwin' ? ['--use-mock-keychain'] : ['--password-store=basic']), '--user-data-dir=' + path.join(temporary, 'browser')], env, timeout: 60_000 });
    const page = await application.firstWindow(); page.setDefaultTimeout(20_000); page.on('pageerror', error => errors.push(error.message));
    await page.locator('#topbar-home').waitFor();
    const isolation = await application.evaluate(({ app }) => ({ home: process.env.PROTEUS_HOME, browser: app.getPath('userData'), version: app.getVersion(), mock: app.commandLine.hasSwitch('use-mock-keychain') }));
    assert.equal(isolation.home, temporary); assert.equal(isolation.browser, path.join(temporary, 'browser')); assert.equal(isolation.version, metadata.version);
    if (process.platform === 'darwin') assert.equal(isolation.mock, true, 'Disposable Mac tests must use mock Keychain');
    return page;
  };
  const runs = () => application.evaluate(({ app }) => process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService().engine.listRuns().map(run => ({ id: run.id, status: run.status, provider: run.schedule.provider, events: run.events, usage: run.usage })));
  try {
    let page = await launch();
    const state = await page.evaluate(async () => (await fetch('/api/state')).json());
    const homeInfo = await page.evaluate(async () => (await fetch('/api/home')).json());
    assert.equal(homeInfo.version, metadata.version); assert.equal(homeInfo.buildRevision, metadata.buildRevision);
    for (const [key, value] of Object.entries(hostPlatformMetadata())) assert.equal(state[key], value, 'Authenticated local platform metadata: ' + key);
    await until(() => application.evaluate(({ app }) => {
      const catalogs = process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService().catalogs;
      return ['copilot', 'codex', 'claude'].every(id => catalogs[id].value?.available === false);
    }), 'unavailable credential-free provider catalogs');
    checks.push('isolated UI startup, shared platform metadata and unavailable provider catalogs');
    await page.locator('[data-page="schedules"]').click();
    await page.getByRole('row').filter({ hasText: 'Synthetic package rehearsal' }).click();
    await page.locator('#run-now').click();
    // A pending question is answered in its inline card; the legacy #answer field stays hidden.
    const question = page.locator('.user-question-card').first(); await question.locator('textarea').waitFor();
    await question.locator('textarea').fill('SYNTHETIC_PACKAGE_CHECKPOINT'); await question.getByRole('button', { name: 'Send answer', exact: true }).click();
    await until(async () => (await runs())[0]?.status === 'completed', 'synthetic rehearsal completes');
    const [run] = await runs(); assert.equal(run.provider, 'rehearsal'); assert.equal(run.usage.observed, false);
    assert.ok(run.events.some(event => event.role === 'assistant' && event.text.includes('no AI provider was called')));
    assert.ok(run.events.some(event => event.role === 'assistant' && event.text.includes('SYNTHETIC_PACKAGE_CHECKPOINT')));
    checks.push('explicit synthetic rehearsal and feedback; no provider usage invented');
    await page.evaluate(async () => {
      const state = await window.desktop.terminal({ action: 'state' }), profiles = state.profiles.profiles;
      profiles[0] = { ...profiles[0], name: 'Synthetic native PTY', shell: '/bin/sh', command: 'printf "PACKAGE_PTY_READY\\n"; read answer; printf "PACKAGE_PTY_INPUT:%s\\n" "$answer"; read finish' };
      await window.desktop.terminal({ action: 'save-profiles', profiles, expectedRevision: state.profiles.revision });
    });
    await page.locator('#tab-add-menu summary').click();
    await page.locator('#browser-area .new-tab-actions').getByRole('button', { name: 'Terminal', exact: true }).click();
    await page.locator('#terminal-session').selectOption('process'); await page.getByRole('button', { name: 'Open terminal', exact: true }).last().click();
    await page.locator('.terminal-canvas canvas').waitFor();
    const terminal = (await page.evaluate(() => window.desktop.terminal({ action: 'state' }))).sessions[0]; assert.ok(terminal?.id);
    const snapshot = () => page.evaluate(id => window.desktop.terminal({ action: 'snapshot', id }), terminal.id);
    await until(async () => (await snapshot()).data.includes('PACKAGE_PTY_READY'), 'native PTY output');
    await page.locator('.terminal-canvas').click(); await page.keyboard.type('SYNTHETIC_INPUT'); await page.keyboard.press('Enter');
    await until(async () => (await snapshot()).data.includes('PACKAGE_PTY_INPUT:SYNTHETIC_INPUT'), 'keyboard reaches packaged native PTY');
    await page.locator('[data-close="terminal:' + terminal.id + '"]').click();
    checks.push('packaged native terminal module and keyboard input through canvas');
    await closeApplication(); page = await launch();
    const restored = await runs(); assert.equal(restored.length, 1); assert.equal(restored[0].id, run.id); assert.equal(restored[0].status, 'completed');
    assert.equal(restored[0].usage.observed, false); assert.ok(restored[0].events.some(event => event.text?.includes('SYNTHETIC_PACKAGE_CHECKPOINT')));
    checks.push('same rehearsal history survives packaged app restart'); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, version: metadata.version, buildRevision: metadata.buildRevision, sourceFingerprint: provenance.sourceFingerprint, platform: process.platform, credentials: process.platform === 'darwin' ? 'disposable mock Keychain; real store unverified' : 'disposable basic cookie store; real keyring unverified', checks }));
  } finally {
    await closeApplication();
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
