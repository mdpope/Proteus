import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {startServer} from '../src/server.js';
import {atomicJSON} from '../src/shared/files.js';
import {desktopSetupStatus, startDesktopSetup} from '../src/services/remote/desktop-setup.js';

async function fixture(t, platform = 'darwin') {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-desktop-setup-'));
  const model = {id: 'synthetic', controls: {reasoningEfforts: ['high'], contextTiers: [{id: 'default'}], serviceTiers: [{id: 'priority'}]}};
  atomicJSON(path.join(home, 'settings.json'), {schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC', workspace: {cwd: home, additionalDirectories: []}, skillDirectories: [], mcpServers: {}, updateCoordinator: {provider: 'codex', model: model.id, reasoningEffort: 'high', serviceTier: 'priority'}});
  const service = await startServer({home, port: 0, timers: false, providers: {codex: {status: async () => ({available: true, models: [model]}), run: async () => { throw Error('No actual model should run in this fixture'); }}}});
  service.engine.drain = async () => {};
  t.after(async () => { await service.close(); fs.rmSync(home, {recursive: true, force: true}); });
  service.desktopControl.status = () => ({platform, primary: 'cua', backends: [{id: 'cua', installed: true}, ...(platform === 'darwin' ? [{id: 'peekaboo', installed: false}] : [])], setupSteps: [{text: 'Use the official installer.'}]});
  return service;
}

test('concurrent backend setup reuses one chat, captures owner defaults and has no update authority', async t => {
  const service = await fixture(t);
  const firstRequest = {backend: 'peekaboo', operationId: randomUUID()}, secondRequest = {...firstRequest, operationId: randomUUID()};
  const [first, second] = await Promise.all([startDesktopSetup(service, firstRequest), startDesktopSetup(service, secondRequest)]);
  assert.equal(first.id, second.id);
  assert.equal(service.engine.listRuns().length, 1);
  const run = service.engine.getRun(first.id);
  assert.equal(run.schedule.model, 'synthetic'); assert.equal(run.schedule.reasoningEffort, 'high'); assert.equal(run.schedule.serviceTier, 'priority');
  assert.equal(run.schedule.context.workspaceId, null); assert.deepEqual(run.schedule.context.entries, []);
  assert.equal(run.schedule.updateAuthorization, undefined);
  assert.doesNotMatch(run.schedule.prompt, /proteus_update|local Proteus update coordinator/);
  assert.match(run.schedule.prompt, /only the selected backend/); assert.match(run.schedule.prompt, /ask me before running any installer/);
  assert.equal(service.engine.decidePermission(run, {kind: 'custom-tool', toolName: 'proteus_update'}).allowed, false);
  run.status = 'completed'; service.engine.persist(run);
  assert.equal((await startDesktopSetup(service, secondRequest)).id, run.id, 'an uncertain reused response stays bound after completion');
  await assert.rejects(startDesktopSetup(service, {...secondRequest, backend: 'cua'}), /another backend/);
  const next = await startDesktopSetup(service, {backend: 'peekaboo', operationId: randomUUID()});
  assert.notEqual(next.id, first.id, 'a new explicit operation can repair a completed setup');
});

for (const platform of ['win32', 'linux']) test(`${platform} refuses Peekaboo and keeps an installed Cua setup review scoped`, async t => {
  const service = await fixture(t, platform);
  await assert.rejects(startDesktopSetup(service, {backend: 'peekaboo'}), /not supported/);
  assert.equal(service.engine.listRuns().length, 0);
  const guide = await startDesktopSetup(service, {backend: 'cua'});
  assert.match(guide.schedule.prompt, /inspect and repair only if needed/);
  assert.match(guide.schedule.prompt, /permission prompt/);
  assert.equal(desktopSetupStatus(service).backends.length, 1);
  assert.equal(desktopSetupStatus(service).backends[0].setupChat.id, guide.id);
  await assert.rejects(startDesktopSetup(service, {backend: 'cua', provider: 'other'}), /supported desktop backend/);
});

test('missing model and revoked authority cannot create a setup chat', async t => {
  const service = await fixture(t);
  const original = service.catalogs.codex.get;
  service.catalogs.codex.get = async () => ({models: [], stale: true});
  await assert.rejects(startDesktopSetup(service, {backend: 'cua'}), /unavailable/);
  assert.equal(service.engine.listRuns().length, 0);
  service.catalogs.codex.get = original;
  let checks = 0;
  await assert.rejects(startDesktopSetup(service, {backend: 'cua'}, {authorize: () => { if (++checks > 1) throw Error('Synthetic grant revoked'); }}), /revoked/);
  assert.equal(service.engine.listRuns().length, 0);
});
