import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SettingsStore } from '../src/settings.js';
import { startServer } from '../src/server.js';

test('state polling preserves captured scheduled-run permissions without recapturing a large history', async () => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-state-captures-')));
  const home = path.join(base, 'app'), root = path.join(base, 'work'), added = path.join(base, 'future');
  fs.mkdirSync(root); fs.mkdirSync(added);
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Original captured guidance');
  new SettingsStore(home, root);
  const app = await startServer({ home, port: 0, timers: false, withSeed: false, providers: { rehearsal: { async run() {} } } });
  try {
    const workspaceId = app.context.config().defaultWorkspaceId;
    const captured = app.context.capture({ workspaceId });
    const selection = { includeDefaults: true, selectedIds: [] };
    const schedule = { schemaVersion: 1, id: 'synthetic-schedule', name: 'Synthetic scheduled history', enabled: false,
      cron: '0 9 * * 1-5', timezone: 'UTC', provider: 'rehearsal', model: '', workspace: captured.workspace,
      context: captured, contextSelection: selection, misfire: 'skip', prompt: 'Synthetic fixture only' };
    const capturedID = app.engine.permissions.describe(schedule).id;
    // More than the old preview-cache capacity, with distinct retained schedule metadata.
    for (let index = 0; index < 140; index++) {
      const id = 'synthetic-captured-' + index;
      app.engine.runs.set(id, { id, title: id, trigger: index % 2 ? 'scheduled' : 'manual', status: 'completed',
        createdAt: '2026-10-18T12:00:00.000Z', updatedAt: '2026-10-18T12:00:00.000Z', events: [],
        schedule: { ...structuredClone(schedule), name: 'Synthetic schedule ' + index } });
    }
    const originalRuns = JSON.stringify([...app.engine.runs.values()]);
    app.context.mutate(config => {
      config.workspaces.find(workspace => workspace.id === workspaceId).additionalDirectories.push(added);
    }, app.context.config().revision);
    fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Changed future guidance');
    await app.context.refreshAsync();
    const settings = app.settings.get();
    app.settings.save({ ...settings, provider: 'rehearsal', workspace: { cwd: root, additionalDirectories: [added] } }, settings.revision);
    let captures = 0;
    const capture = app.context.capture.bind(app.context);
    app.context.capture = (...args) => { captures++; return capture(...args); };
    const headers = { authorization: 'Bearer ' + app.token };
    for (let index = 0; index < 2; index++) {
      const response = await fetch(app.origin + '/api/state?summaries=1', { headers });
      assert.equal(response.status, 200);
      const state = await response.json();
      assert.equal(state.runs.length, 140);
      assert.ok(state.runs.every(run => run.permissionContext.id === capturedID));
      const retained = state.permissionWorkspaces.find(workspace => workspace.ref.runId);
      assert.equal(retained.id, capturedID);
      assert.ok(!retained.roots.includes(added));
      assert.ok(state.permissionWorkspaces.find(workspace => workspace.ref.defaults).roots.includes(added));
    }
    assert.ok(captures <= 2, 'polling must not recapture any saved run');
    assert.equal(JSON.stringify([...app.engine.runs.values()]), originalRuns);
    // Future executions still capture current sources through the ordinary preparation path.
    const next = app.engine.prepareSchedule({ ...schedule, workspace: { cwd: root, additionalDirectories: [added] } });
    assert.match(next.context.entries.find(entry => entry.kind === 'instruction').content, /Changed future/);
    assert.ok(next.workspace.additionalDirectories.includes(added));
    assert.notEqual(app.engine.permissions.describe(next).id, capturedID);
  } finally { await app.close(); fs.rmSync(base, { recursive: true, force: true }); }
});
