// Opt-in REAL Codex acceptance against an exact, retained, isolated preview package.
// PROTEUS_PREVIEW_LIVE=1 PROTEUS_PREVIEW_LIVE_HOME=/private/preview \
// PROTEUS_PREVIEW_LIVE_EXECUTABLE='/.../Proteus Design Preview.app/Contents/MacOS/Proteus Design Preview' \
// node test/preview-permission-live.mjs
// No automatic retries: an absent native file approval is a failed observation.
// All lab chats, fixture files and private receipts remain available for inspection.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';

if (process.env.PROTEUS_PREVIEW_LIVE !== '1') throw new Error('Real provider use requires PROTEUS_PREVIEW_LIVE=1.');
const previewRoot = process.env.PROTEUS_PREVIEW_LIVE_HOME;
const executablePath = process.env.PROTEUS_PREVIEW_LIVE_EXECUTABLE;
for (const [name, value] of Object.entries({PROTEUS_PREVIEW_LIVE_HOME:previewRoot, PROTEUS_PREVIEW_LIVE_EXECUTABLE:executablePath})) {
  if (!value || !path.isAbsolute(value)) throw new Error(name + ' must identify the exact existing absolute path.');
}
assert.equal(fs.realpathSync(previewRoot), previewRoot, 'Use the canonical retained preview path.');
const marker = JSON.parse(fs.readFileSync(path.join(previewRoot, '.proteus-design-preview.json'), 'utf8'));
assert.equal(marker.purpose, 'proteus-isolated-desktop-design-preview');
const connection = path.join(previewRoot, 'app-data', 'connection.json');
if (fs.existsSync(connection)) {
  const {pid} = JSON.parse(fs.readFileSync(connection, 'utf8'));
  assert.ok(Number.isInteger(pid) && pid > 0, 'Cannot establish preview process ownership.');
  let running = false;
  try { process.kill(pid, 0); running = true; } catch (error) { if (error.code === 'EPERM') running = true; else if (error.code !== 'ESRCH') throw error; }
  assert.equal(running, false, 'The retained preview is running. Close it normally before acceptance; this test never takes it over.');
}
const nonce = randomUUID(), label = 'Permission lab ' + nonce.slice(0, 8);
const evidence = path.join(previewRoot, 'live-verification');
const labFolder = path.join(previewRoot, 'workspaces', 'permission-lab-' + nonce);
let app, page, workspaceId, projectId, model, effort;
const receipt = {schemaVersion:1, purpose:'real-codex-permission-acceptance', synthetic:true, passed:false, nonce, startedAt:new Date().toISOString(), stages:[], chats:[], approvals:[], sandboxes:[]};
const fixtures = new Map();
const pause = () => new Promise(resolve => setTimeout(resolve, 300));
const step = stage => { receipt.stage = stage; console.log('[permission live] ' + stage); };
const api = (route, payload) => page.evaluate(async ({route, payload}) => {
  const response = await fetch(route, payload === undefined ? {} : {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
  if (!response.ok) throw new Error('Owner API ' + route.split('?')[0] + ' returned HTTP ' + response.status);
  return response.json();
}, {route, payload});
const runState = async id => { const run = (await api('/api/state')).runs.find(item => item.id === id); assert.ok(run, 'Lab run missing.'); return run; };
async function until(check, label, timeout = 240000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const result = await check(); if (result) return result; await pause(); }
  throw new Error('Timed out waiting for ' + label);
}
const completed = run => { assert.equal(run.status, 'completed', 'Lab turn did not complete: ' + run.status); return run; };
const permissionEvents = run => run.events.flatMap(event => event.data?.permission ? [event.data.permission] : []);
const grantSnapshot = run => ({chat:run.chatPermission || null, folders:run.permissionContext.workspaceFolders, rules:run.permissionContext.workspaceRules, mode:run.permissionContext.workspaceMode});
async function revealWorkspace() {
  if (await page.locator('body').evaluate(node => node.classList.contains('sidebar-minimized'))) await page.locator('#sidebar').hover();
  await page.locator('[data-preview-workspace="' + workspaceId + '"]').click();
  await page.locator('[data-preview-open-project="' + projectId + '"]').click();
}
function assertLabRun(run) {
  assert.equal(run.schedule.provider, 'codex'); assert.equal(run.schedule.model, model.id);
  assert.equal(run.workspaceId, workspaceId); assert.equal(run.projectId, projectId);
  assert.equal(fs.realpathSync(run.schedule.workspace.cwd), labFolder);
  assert.deepEqual(run.schedule.workspace.additionalDirectories, []);
  assert.deepEqual(Object.keys(run.schedule.mcpServers || {}), []);
  assert.deepEqual(run.schedule.context?.selectedIds || [], []);
  assert.equal(fs.realpathSync(run.providerHome), fs.realpathSync(path.join(previewRoot, 'codex')));
}
async function startChat(suffix) {
  step('Start ' + suffix + ' through the chat UI');
  await revealWorkspace(); await page.locator('[data-preview-new-chat]').click();
  await page.locator('#chat-prompt').waitFor();
  assert.equal(await page.locator('#chat-workspace').inputValue(), workspaceId);
  assert.equal(await page.locator('#chat-project').inputValue(), projectId);
  await until(async () => (await page.locator('#chat-model option').count()) > 1, 'advertised model picker');
  await page.locator('#chat-model').selectOption(model.id);
  if (await page.locator('#chat-model-effort').isEnabled()) await page.locator('#chat-model-effort').selectOption(effort, {force:true});
  else assert.equal(effort, '', 'Advertised default effort needs an enabled control.');
  const title = label + ' · ' + suffix, greeting = 'PERMISSION_LAB_READY_' + nonce;
  await page.locator('#chat-title').fill(title);
  await page.locator('#chat-prompt').fill('Authorized synthetic permission acceptance. Do not use tools, read files, or access network. Reply exactly: ' + greeting);
  await page.locator('#dialog-submit').click();
  const created = await until(async () => (await api('/api/state')).runs.find(run => run.title === title), 'lab chat creation');
  receipt.chats.push({id:created.id, title});
  const run = completed(await until(async () => {
    const current = await runState(created.id);
    assert.ok(current.pending == null, 'No-tools greeting unexpectedly requested approval.');
    assert.equal(current.events.some(event => event.data?.tool), false, 'No-tools greeting used a tool.');
    return !['queued','running'].includes(current.status) && current;
  }, 'no-tools greeting'));
  assertLabRun(run); assert.ok(run.providerSessionId);
  assert.ok(run.events.some(event => event.role === 'assistant' && event.text.includes(greeting)));
  receipt.chats.at(-1).providerSessionId = run.providerSessionId;
  await page.locator('#followup').waitFor();
  return run;
}
function verifyNativeSandbox(run, expected) {
  assert.ok(run.nativeSessionPath, 'Native session evidence missing.');
  const file = fs.realpathSync(run.nativeSessionPath), home = fs.realpathSync(path.join(previewRoot, 'codex'));
  assert.ok(file.startsWith(home + path.sep), 'Only the new isolated lab session may be inspected.');
  const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const context = rows.findLast(row => row.type === 'turn_context')?.payload;
  assert.ok(context?.sandbox_policy, 'Native turn_context sandbox evidence unavailable; cannot claim verification.');
  assert.equal(context.sandbox_policy.type, expected);
  assert.equal(context.cwd, labFolder);
  if (expected === 'workspace-write') {
    assert.equal(context.sandbox_policy.network_access, false);
    for (const root of context.sandbox_policy.writable_roots || []) assert.equal(fs.realpathSync(root), labFolder, 'Unexpected native writable root.');
  }
  receipt.sandboxes.push({runId:run.id, type:context.sandbox_policy.type, cwdVerified:true, nativeSessionEvidence:true});
}
async function edit(run, name, answer, expectedSandbox) {
  step(name);
  const target = path.join(labFolder, name + '.txt'), contents = 'PERMISSION_LAB_' + nonce + '_' + name + '\n';
  assert.equal(fs.existsSync(target), false);
  const before = await runState(run.id), eventsBefore = before.events.length, permissionsBefore = permissionEvents(before).length;
  const draft = 'Unsent permission lab draft ' + name + ' ' + nonce;
  await page.locator('#followup').fill(`Authorized disposable permission test. Use only your native apply_patch file tool to create exactly ${JSON.stringify(target)} containing exactly ${JSON.stringify(contents)}. Do not use shell commands, other tools, read other files, or access network. If apply_patch is unavailable, stop and say so. Let the real approval UI ask when required. Do not simulate approval. After success reply exactly LAB_EDIT_DONE_${name}.`);
  await page.locator('#continue').click();
  await until(async () => (await runState(run.id)).events.slice(eventsBefore).some(event => event.role === 'user' && event.text.includes(target)), 'accepted edit message');
  await page.locator('#followup').fill(draft);
  let observed = 0, pendingId;
  const result = completed(await until(async () => {
    const current = await runState(run.id); assert.equal(current.providerSessionId, run.providerSessionId);
    for (const event of current.events.slice(eventsBefore)) if (event.data?.tool) {
      assert.equal(event.data.tool.name, 'apply_patch', 'Refusing unexpected native tool; no shell fallback is accepted.');
      const paths = [...String(event.data.tool.arguments).matchAll(/^\*\*\* Update File: (.+)$/gm)].map(match => path.resolve(labFolder, match[1]));
      assert.ok(paths.length && paths.every(file => file === target), 'Native patch contains an unexpected file.');
    }
    if (current.pending) {
      assert.ok(answer, 'Remembered grant still prompted on a later turn.');
      assert.equal(observed, 0, 'More than one native approval request appeared; do not retry automatically.');
      const pending = current.pending, details = pending.details || {};
      assert.equal(pending.type, 'permission'); assert.equal(details.kind, 'write', 'A real native file approval is required.');
      assert.equal(path.resolve(labFolder, details.resolvedPath || details.fileName || ''), target);
      assert.ok(!details.requestSandboxBypass && !details.managedApprovalRequired, 'Protected requests are never accepted by this test.');
      pendingId = pending.id; assert.ok(pendingId); observed++;
      await page.locator('.pending .preview-approval-request').waitFor();
      assert.equal((await runState(run.id)).pending?.id, pendingId, 'Pending request changed before the UI action.');
      if (answer === 'approve') await page.locator('#approve').click();
      else {
        assert.ok(pending.permissionChoices.some(choice => choice.value === answer), 'Host did not offer requested remember scope.');
        await page.locator('[data-preview-remember]').click();
        await page.locator('[data-preview-remember-choice="' + answer + '"]').click();
        assert.equal((await runState(run.id)).pending?.id, pendingId);
        await page.locator('#dialog-submit').click();
      }
      await until(async () => (await runState(run.id)).pending?.id !== pendingId, 'approval acknowledgement', 30000);
      assert.equal(await page.locator('#followup').inputValue(), draft, 'Approval discarded the unsent draft.');
      receipt.approvals.push({runId:run.id, requestId:pendingId, decision:answer, target:path.basename(target), draftPreserved:true});
    }
    return !current.pending && !['queued','running'].includes(current.status) && current;
  }, name));
  assert.equal(observed, answer ? 1 : 0, 'Expected real approval was not observed.');
  assert.equal(fs.readFileSync(target, 'utf8'), contents, 'Actual file bytes differ.'); fixtures.set(target, contents);
  for (const [file, bytes] of fixtures) assert.equal(fs.readFileSync(file, 'utf8'), bytes, 'Earlier fixture changed.');
  const decisions = permissionEvents(result).slice(permissionsBefore).filter(item => item.automatic === false);
  assert.deepEqual(decisions.map(item => item.decision), answer ? [answer] : [], 'Unexpected approval receipt.');
  assert.equal(await page.locator('#followup').inputValue(), draft, 'Completed turn discarded the draft.');
  assert.ok(result.events.slice(eventsBefore).some(event => event.data?.tool?.name === 'apply_patch'), 'No native patch tool was observed.');
  assert.ok(!result.events.slice(eventsBefore).some(event => /turn was stopped|permissions changed during/i.test(event.text)), 'Permission change interrupted the turn.');
  verifyNativeSandbox(result, expectedSandbox);
  receipt.stages.push({name, runId:run.id, exactBytes:true, approvals:observed, sessionPreserved:true, draftPreserved:true});
  receipt.chats.find(chat => chat.id === run.id).expectedDraft = draft;
  const screenshot = path.join(evidence, nonce + '-' + name + '.png');
  await page.locator('#main').screenshot({path:screenshot}); fs.chmodSync(screenshot, 0o600);
  return result;
}
try {
  fs.mkdirSync(evidence, {recursive:true, mode:0o700});
  step('Launch the exact retained preview package');
  app = await electron.launch({executablePath, args:[], env:{...process.env, PROTEUS_DESKTOP_PREVIEW:'1', PROTEUS_PREVIEW_HOME:previewRoot, PORT:'0'}, timeout:120000});
  const identity = await app.evaluate(({app}) => ({name:app.getName(), packaged:app.isPackaged, appPath:app.getAppPath(), userData:app.getPath('userData')}));
  assert.equal(identity.name, 'Proteus Design Preview'); assert.equal(identity.packaged, true);
  assert.equal(identity.userData, path.join(previewRoot, 'electron'));
  const metadata = JSON.parse(fs.readFileSync(path.join(identity.appPath, 'package.json'), 'utf8'));
  assert.equal(metadata.desktopPreview, true);
  receipt.executableSHA256 = createHash('sha256').update(fs.readFileSync(executablePath)).digest('hex');
  page = await app.firstWindow(); page.setDefaultTimeout(30000);
  await page.locator('[data-preview-workspace]').first().waitFor({timeout:120000});
  const initial = await api('/api/state'); assert.equal(initial.desktopPreview?.enabled, true);
  assert.equal(initial.schedules.length, 0, 'Operational schedules are not allowed in the test preview.');
  assert.ok(!initial.runs.some(run => ['queued','running','awaiting_input'].includes(run.status)), 'Retained preview contains unfinished work.');
  const oldApprovals = new Map();
  for (const workspace of initial.context.workspaces) {
    const context = await api('/api/context?workspaceId=' + encodeURIComponent(workspace.id));
    oldApprovals.set(workspace.id, JSON.stringify({approvals:workspace.approvals, profiles:context.approvalProfiles || []}));
  }
  step('Create a new isolated Permission lab workspace using the owner API');
  fs.mkdirSync(labFolder, {recursive:true, mode:0o700}); assert.equal(fs.realpathSync(labFolder), labFolder);
  let context = await api('/api/context');
  context = await api('/api/context', {action:'workspace', create:true, name:label, cwd:labFolder, expectedRevision:context.revision});
  workspaceId = context.workspaces.find(workspace => workspace.name === label)?.id; assert.ok(workspaceId);
  context = await api('/api/context', {action:'save-workspace', workspaceId, expectedRevision:context.revision, configuration:{approvals:{mode:'ask', readOnlyTools:false, folders:[], rules:[]}, defaults:{includeDefaults:false, selectedIds:[], agentId:null}}});
  const projects = await api('/api/desktop-preview'); projectId = projects.defaultProjectIds[workspaceId];
  assert.ok(projects.projects.some(project => project.id === projectId && project.workspaceId === workspaceId));
  receipt.workspaceId = workspaceId; receipt.projectId = projectId;
  await api('/api/provider', {provider:'codex', force:true});
  const catalog = (await api('/api/state')).providerStatuses?.codex;
  assert.equal(catalog?.available, true); assert.equal(catalog.stale, false); assert.ok(!catalog.error && catalog.checkedAt);
  const models = catalog.models.filter(item => item.policy?.state !== 'disabled');
  model = models.find(item => item.id === catalog.defaultModel || item.isDefault) || models[0]; assert.ok(model);
  effort = model.controls?.defaultReasoningEffort || '';
  if (effort) assert.ok(model.controls.reasoningEfforts.includes(effort));
  receipt.model = model.id; receipt.effort = effort || 'provider default'; receipt.catalogCheckedAt = catalog.checkedAt;
  await page.reload(); await page.locator('[data-preview-workspace="' + workspaceId + '"]').waitFor();
  let first = await startChat('Once then remember chat'); const originalGrants = grantSnapshot(first);
  first = await edit(first, 'allow-once', 'approve', 'read-only');
  assert.deepEqual(grantSnapshot(first), originalGrants, 'Allow once persisted access.');
  first = await edit(first, 'remember-chat', 'trust-folder-chat', 'read-only');
  assert.deepEqual(first.permissionContext.chatFolders, [{path:labFolder, access:'read-write'}]);
  assert.deepEqual(first.permissionContext.workspaceFolders, []); assert.equal(first.permissionContext.workspaceMode, 'ask');
  first = await edit(first, 'chat-reuse', null, 'workspace-write');
  let sibling = await startChat('Sibling remembers workspace');
  assert.deepEqual(sibling.permissionContext.folders, [], 'Sibling inherited another chat’s private grant.');
  sibling = await edit(sibling, 'remember-workspace', 'trust-folder', 'read-only');
  assert.deepEqual(sibling.permissionContext.chatFolders, []);
  assert.deepEqual(sibling.permissionContext.workspaceFolders, [{path:labFolder, access:'read-write'}]);
  let third = await startChat('Use workspace');
  assert.equal(third.permissionContext.id, sibling.permissionContext.id, 'Workspace remember requires matching resource context.');
  // Exercise the actual Use workspace toggle after an explicit chat-only Ask override.
  await page.locator('[data-preview-chat-mode="ask"]').click();
  await until(async () => (await runState(third.id)).permissionContext.chatMode === 'ask', 'chat Ask override');
  await page.locator('[data-preview-chat-mode="inherit"]').click();
  third = await until(async () => { const run = await runState(third.id); return run.permissionContext.chatMode === 'inherit' && run; }, 'Use workspace');
  assert.deepEqual(third.permissionContext.chatFolders, []);
  assert.deepEqual(third.permissionContext.folders, [{path:labFolder, access:'read-write'}]);
  third = await edit(third, 'workspace-reuse', null, 'workspace-write');
  for (const [id, before] of oldApprovals) {
    const now = await api('/api/context?workspaceId=' + encodeURIComponent(id));
    // Compare without including unrelated private configuration in failure receipts.
    assert.ok(JSON.stringify({approvals:now.workspaces.find(workspace => workspace.id === id).approvals, profiles:now.approvalProfiles || []}) === before, 'Another workspace’s permissions changed.');
  }
  for (const chat of receipt.chats) {
    await page.locator('[data-chat-subtab][title="' + chat.title + '"]').click();
    await page.locator('#followup').waitFor();
    assert.equal(await page.locator('#followup').inputValue(), chat.expectedDraft, 'Switching chats lost its unsent lab draft.');
    delete chat.expectedDraft;
  }
  assert.deepEqual(fs.readdirSync(labFolder).sort(), [...fixtures.keys()].map(file => path.basename(file)).sort(), 'Unexpected lab files were created.');
  receipt.passed = true; receipt.otherWorkspacePermissionsPreserved = true;
  step('PASS: once, chat remember, workspace remember and native sandbox verified');
} catch (error) {
  receipt.error = error.message;
  process.exitCode = 1;
} finally {
  // Closing only the owned preview stops any failed lab turn. Never auto-approve,
  // retry, delete chats, remove retained data, or restart an existing user process.
  await app?.close().catch(error => { receipt.closeError = error.message; receipt.passed = false; process.exitCode = 1; });
  receipt.finishedAt = new Date().toISOString();
  if (fs.existsSync(evidence)) fs.writeFileSync(path.join(evidence, nonce + '-permissions.json'), JSON.stringify(receipt, null, 2) + '\n', {mode:0o600});
  console.log(JSON.stringify(receipt));
}
