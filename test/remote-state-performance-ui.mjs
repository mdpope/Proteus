// Synthetic acceptance only. This exercises the real desktop service without
// opening provider sessions, changing operational schedules or using live data.
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-state-ui-')));
fs.writeFileSync(path.join(home, 'settings.json'), JSON.stringify({ schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC', workspace: { cwd: home, additionalDirectories: [] }, skillDirectories: [], mcpServers: {} }));
const bundle = process.argv[2] && path.resolve(process.argv[2]); let app;
try {
  app = await electron.launch({ ...(bundle ? { executablePath: path.join(bundle, 'Contents/MacOS/Proteus') } : {}), args: [...(bundle ? [] : ['.']), '--use-mock-keychain', '--user-data-dir=' + path.join(home, 'electron')], env: { ...process.env, PROTEUS_HOME: home, PORT: '0' }, timeout: 60000 });
  const page = await app.firstWindow(); await page.locator('#topbar-home').waitFor();
  const result = await app.evaluate(async ({ app }) => {
    const service = process.mainModule.require(app.getAppPath() + '/desktop/main.cjs').getService();
    const folder = service.home, createdAt = '2026-01-01T00:00:00.000Z';
    const originalCatalog = service.context.catalog, originalEnabled = service.remote.config.enabled;
    const catalog = { entries: Array.from({ length: 3000 }, (_, i) => ({ id: 'synthetic-source-' + i, name: 'Rehearsal source', path: folder + '/source-' + i + '.md', roots: [folder], kind: 'instruction', defaultMode: 'available' })) };
    const snapshot = { workspaceId: 'default', workspace: { cwd: folder, additionalDirectories: [] }, entries: [{ id: 'captured-rehearsal', name: 'Rehearsal', kind: 'instruction', path: folder + '/AGENTS.md', scope: folder, content: 'Synthetic instructions. '.repeat(2500) }], includeDefaults: true, selectedIds: [] };
    const mcpServers = Object.fromEntries(Array.from({ length: 4 }, (_, i) => ['rehearsal-' + i, { type: 'http', url: 'https://example.invalid/' + i }]));
    const ids = [], durations = []; let pulses = 0, unchangedPublications = 0;
    const timer = setInterval(() => pulses++, 5);
    try {
      service.context.catalog = catalog; service.remote.config.enabled = true;
      for (let i = 0; i < 100; i++) {
        const id = 'synthetic-state-' + i; ids.push(id);
        service.engine.runs.set(id, { id, title: 'Synthetic state rehearsal', trigger: 'chat', status: 'completed', createdAt, updatedAt: createdAt, events: [], schedule: { id, name: 'Synthetic', provider: 'copilot', context: structuredClone(snapshot), mcpServers, workspace: { cwd: folder, additionalDirectories: [] } } });
      }
      for (let i = 0; i < 8; i++) {
        const start = performance.now(); service.remote.publish(); durations.push(performance.now() - start);
        const sequence = service.remote.sequence; service.remote.publish();
        if (service.remote.sequence === sequence) unchangedPublications++;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      const consumers = service.integrations.consumers();
      const state = service.remote.journal.filter(e => e.event === 'state').at(-1)?.data;
      return { synthetic: true, pulses, durationsMs: durations, consumers: consumers.length, states: service.remote.journal.filter(e => e.event === 'state').length, unchangedPublications, runCount: state?.runCount, cacheEntries: service.integrations.identities.size, diagnostics: service.performanceDiagnostics.snapshot() };
    } finally {
      clearInterval(timer); ids.forEach(id => service.engine.runs.delete(id)); service.context.catalog = originalCatalog; service.remote.config.enabled = originalEnabled;
    }
  });
  assert.equal(result.consumers, 400); assert.equal(result.runCount, 100); assert.equal(result.unchangedPublications, 8); assert.equal(result.cacheEntries, 400); assert.ok(result.pulses > 0);
  // A generous bound catches reintroduced multi-second synchronous assembly;
  // this is synthetic acceptance, not a physical HC scrolling benchmark.
  assert.ok(Math.max(...result.durationsMs) < 750, JSON.stringify(result.durationsMs));
  assert.ok(result.diagnostics.phases.some(phase => phase.name === 'integrations.selected'));
  await page.locator('[data-page="runs"]').click(); await page.locator('#topbar-home').waitFor();
  console.log(JSON.stringify({ passed: true, ...result, uiResponsiveAfterAssembly: true }));
} finally { await app?.close(); fs.rmSync(home, { recursive: true, force: true }); }
