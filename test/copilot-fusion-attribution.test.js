import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { CopilotProvider } from '../src/providers/copilot.js';
import { fusionTiers, fusionModel, fusionAvailability, fusionSessionOptions, FUSION_MODEL_ID } from '../src/providers/copilot-fusion.js';
import { fusionTurnsFor } from '../src/services/remote/remote.js';
import { mergeChatHistory } from '../public/features/chats/chat-history.js';
import { fusionUsedModels, fusionPlannedOnly, fusionAttributionText, fusionAttributionHTML, fusionModelTotals, renderCopilotFusion } from '../public/features/chats/copilot-fusion.js';
import { validateModelOptions } from '../src/models/model-catalog.js';

// Shapes follow @github/copilot-sdk 1.0.28 AutoTierMetadata and Fusion session events.
const auto = { defaultTier: 'fusion-standard', tiers: [
  { id: 'balance', displayName: 'Auto Balance', description: 'Ordinary Auto', type: 'auto', status: { enabled: true } },
  { id: 'fusion-standard', displayName: 'Standard', description: 'Everyday', type: 'fusion', fusionTier: 'standard', status: { enabled: true }, billing: { promo: { discountPercent: 30, endsAt: '2026-11-30T23:59:59Z', message: 'Fusion discount' } } },
  { id: 'fusion-high', displayName: 'High', description: 'Harder tasks', type: 'fusion', fusionTier: 'high', status: { enabled: true } },
  { id: 'fusion-max', displayName: 'Max', description: 'Deepest', type: 'fusion', fusionTier: 'max', status: { enabled: false, reason: 'plan', message: 'Requires Copilot Pro+' } },
  { id: 'fusion-hidden', displayName: 'Hidden', description: '', type: 'fusion', status: { enabled: true, pickerVisible: false } },
  { id: 'bad id!', displayName: 'Invalid', description: '', type: 'fusion', status: { enabled: true } }
] };
const ordinary = { id: 'gpt-fixture', name: 'Fixture', supportedReasoningEfforts: ['low', 'high'], capabilities: { supports: { reasoningEffort: true }, limits: { max_prompt_tokens: 1000, max_output_tokens: 100 } } };

test('Fusion choices come only from advertised Fusion routing tiers, with labels and unavailability reasons', () => {
  const tiers = fusionTiers(auto);
  assert.deepEqual(tiers.map(tier => tier.id), ['fusion-standard', 'fusion-high', 'fusion-max', 'fusion-hidden'], 'ordinary Auto and invalid IDs are excluded');
  const model = fusionModel(auto);
  assert.equal(model.id, FUSION_MODEL_ID); assert.equal(model.providerModel, 'auto');
  assert.deepEqual(model.controls.reasoningEfforts, ['fusion-standard', 'fusion-high'], 'disabled and hidden tiers are not selectable');
  assert.equal(model.controls.defaultReasoningEffort, 'fusion-standard');
  assert.equal(model.controls.reasoningEffortLabels['fusion-high'], 'High');
  assert.deepEqual(model.controls.unavailableReasoningEfforts, [{ id: 'fusion-max', label: 'Max', message: 'Requires Copilot Pro+' }]);
  assert.equal(fusionModel({ tiers: [auto.tiers[0]] }), null, 'no Fusion tier means no catalog entry');
  assert.equal(fusionModel({ tiers: [auto.tiers[3]] }), null, 'only disabled tiers means no selectable entry');
  assert.match(fusionAvailability([], { tiers: [auto.tiers[3]] }).note, /Requires Copilot Pro\+/);
  assert.match(fusionAvailability([], undefined).note, /has not advertised Copilot Fusion routing/);
  const autoOnly=fusionAvailability([{id:'auto',name:'Auto'}]);
  assert.equal(autoOnly.available,false);assert.equal(autoOnly.autoAvailable,true);
  assert.match(autoOnly.note,/Auto is a separate choice/);
  // Effort IDs pass the shared option validator; unknown tiers are rejected like any effort.
  validateModelOptions({ reasoningEffort: 'fusion-high' }, model);
  assert.throws(() => validateModelOptions({ reasoningEffort: 'fusion-max' }, model), /unavailable/);
  assert.deepEqual(fusionSessionOptions({ reasoningEffort: 'fusion-high' }, model), { model: 'auto', autoTier: 'fusion-high' });
  assert.deepEqual(fusionSessionOptions({ reasoningEffort: '' }, model), { model: 'auto', autoTier: 'fusion-standard' });
  assert.equal(fusionSessionOptions({ reasoningEffort: 'high' }, { id: 'gpt-fixture', controls: {} }), null);
});

function critiqueSession(turnNumber) {
  const listeners = new Set(); let sequence = 0;
  const id = `turn${turnNumber}`;
  const emit = (type, data) => { const event = { id: `${id}-${++sequence}`, type, timestamp: `2026-10-31T00:00:0${sequence % 10}Z`, data }; for (const handler of listeners) handler(event); return event; };
  const usage = (model, phaseId, role, inputTokens, outputTokens) => emit('assistant.usage', { model, inputTokens, outputTokens, cost: 1, fusion: { fusionId: id, pattern: 'critique', policy: 'fusion-high', syntheticModel: 'fusion', phaseId, role, sourceModel: model, conversationScope: role === 'critic' ? 'review' : 'root' } });
  return { sessionId: 'fusion-session', on(handler) { listeners.add(handler); return () => listeners.delete(handler); }, async abort() {}, async disconnect() {},
    async send() {
      emit('session.fusion_route_started', { attemptId: 'attempt-' + turnNumber, policy: 'fusion-high', syntheticModel: 'fusion', turnKind: 'user' });
      emit('session.fusion_resolved', { contractVersion: 1, fusionId: id, turnId: 't' + turnNumber, pattern: 'critique', policy: 'fusion-high', syntheticModel: 'fusion', primaryModel: 'model-a', secondaryModel: 'model-b', judgeModel: 'model-j', fallbackModel: 'model-f', followUpModel: 'model-a', hint: 'Draft, two critiques, revision', critics: [{ model: 'model-b', phaseId: 'c1', reasoningEffort: 'high' }, { model: 'model-c', phaseId: 'c2' }], phasePlan: [{ kind: 'draft', role: 'drafter', scope: 'root', conditional: false }] });
      emit('assistant.fusion_phase_started', { fusionId: id, phaseId: 'd1', phaseKind: 'draft', role: 'drafter', model: 'model-a', pattern: 'critique', conversationScope: 'root', reasoningEffort: 'medium' });
      emit('assistant.message', { messageId: 'draft', content: 'SECRET DRAFT TEXT', fusion: { fusionId: id, pattern: 'critique', policy: 'fusion-high', syntheticModel: 'fusion', conversationScope: 'review', sourceModel: 'model-a' } });
      usage('model-a', 'd1', 'drafter', 100, 40);
      emit('assistant.fusion_phase_completed', { fusionId: id, phaseId: 'd1', phaseKind: 'draft', role: 'drafter', model: 'model-a', conversationScope: 'root', status: 'succeeded', durationMs: 1200, verdict: null, content: 'SECRET DRAFT TEXT', usage: { inputTokens: 100, outputTokens: 40, cachedTokens: 10, requestCount: 1, totalNanoAiu: 2000000 } });
      for (const [phaseId, model] of [['c1', 'model-b'], ['c2', 'model-c']]) {
        emit('assistant.fusion_phase_started', { fusionId: id, phaseId, phaseKind: 'critic', role: 'critic', model, pattern: 'critique', conversationScope: 'review' });
        usage(model, phaseId, 'critic', 50, 20);
        emit('assistant.fusion_phase_completed', { fusionId: id, phaseId, phaseKind: 'critic', role: 'critic', model, conversationScope: 'review', status: 'succeeded', durationMs: 800, verdict: 'revise', content: 'SECRET CRITIQUE', usage: { inputTokens: 50, outputTokens: 20, cachedTokens: 0, requestCount: 1, totalNanoAiu: 1000000 } });
      }
      emit('assistant.fusion_phase_started', { fusionId: id, phaseId: 'r1', phaseKind: 'revision', role: 'reviser', model: 'model-a', pattern: 'critique', conversationScope: 'root' });
      usage('model-a', 'r1', 'reviser', 120, 60);
      emit('assistant.message', { messageId: 'final', content: 'Final answer ' + turnNumber, fusion: { fusionId: id, pattern: 'critique', policy: 'fusion-high', syntheticModel: 'fusion', conversationScope: 'root', sourceModel: 'model-a', sourcePhaseId: 'r1', commitId: 'commit-' + turnNumber } });
      emit('assistant.fusion_phase_completed', { fusionId: id, phaseId: 'r1', phaseKind: 'revision', role: 'reviser', model: 'model-a', conversationScope: 'root', status: 'succeeded', durationMs: 900, verdict: null, content: 'Final answer', usage: { inputTokens: 120, outputTokens: 60, cachedTokens: 30, requestCount: 1, totalNanoAiu: 3000000 } });
      emit('session.fusion_completed', { fusionId: id, turnId: 't' + turnNumber, pattern: 'critique', syntheticModel: 'fusion', outcome: 'succeeded', degradedReason: null, finalSourceModel: 'model-a', finalSourcePhaseId: 'r1', followUpModel: 'model-a', phaseCount: 4, requestCount: 4, inputTokens: 320, outputTokens: 140, cachedTokens: 40, totalNanoAiu: 7000000, durationMs: 3100, commitId: 'commit-' + turnNumber });
      emit('session.idle', {});
    } };
}

test('a Copilot Fusion chat uses Auto with the selected tier and records exactly which models ran', async () => {
  const configs = [], emitted = []; let turn = 0;
  const provider = new CopilotProvider();
  provider.connect = async () => ({ rpc: { models: { list: async () => ({ models: [ordinary], auto }) } },
    createSession: async config => { configs.push(config); return critiqueSession(++turn); },
    resumeSession: async (id, config) => { configs.push(config); return critiqueSession(++turn); } });
  const run = { id: 'fusion-chat', usage: { inputTokens: 0, outputTokens: 0 }, schedule: { provider: 'copilot', model: FUSION_MODEL_ID, reasoningEffort: 'fusion-high', contextTier: 'default', workspace: { cwd: os.tmpdir(), additionalDirectories: [] } } };
  const args = { run, prompt: 'Refactor', emit: (role, text, data) => emitted.push({ role, text, data }), update: () => {}, ask: async () => { throw Error('unexpected question'); }, signal: new AbortController().signal };
  await provider.run(args);
  assert.equal(configs[0].model, 'auto'); assert.equal(configs[0].autoTier, 'fusion-high');
  assert.equal(configs[0].reasoningEffort, undefined); assert.equal(configs[0].contextTier, undefined);
  assert.deepEqual(run.fusionSelection && { tier: run.fusionSelection.tier, label: run.fusionSelection.label }, { tier: 'fusion-high', label: 'High' });
  assert.deepEqual(emitted.filter(item => item.role === 'assistant').map(item => item.text), ['Final answer 1'], 'review drafts never become answers');
  assert.deepEqual(emitted.find(item => item.role === 'assistant').data, { fusion: { fusionId: 'turn1', sourceModel: 'model-a', sourcePhaseId: 'r1' } });
  assert.equal(run.usage.inputTokens, 320, 'ordinary per-request accounting still observes every concrete request');
  const record = run.fusionTurns[0];
  assert.equal(record.fusionId, 'turn1'); assert.equal(record.attemptId, 'attempt-1'); assert.equal(record.status, 'succeeded');
  assert.deepEqual(record.plan.critics.map(critic => critic.model), ['model-b', 'model-c']);
  assert.deepEqual(record.phases.map(phase => [phase.phaseId, phase.model, phase.status]), [['d1', 'model-a', 'succeeded'], ['c1', 'model-b', 'succeeded'], ['c2', 'model-c', 'succeeded'], ['r1', 'model-a', 'succeeded']]);
  assert.deepEqual(record.phases[0].usage, { inputTokens: 100, outputTokens: 40, cachedTokens: 10, requestCount: 1, totalNanoAiu: 2000000 });
  assert.equal(record.final.sourceModel, 'model-a'); assert.equal(record.final.commitId, 'commit-1');
  assert.equal(record.completion.totalNanoAiu, 7000000); assert.equal(record.completion.finalSourceModel, 'model-a');
  assert.deepEqual(Object.fromEntries(Object.entries(record.models).map(([model, value]) => [model, value.requests])), { 'model-a': 2, 'model-b': 1, 'model-c': 1 });
  assert.equal(JSON.stringify(run).includes('SECRET'), false, 'draft and critique content is never stored');
  assert.deepEqual(fusionUsedModels(record).map(entry => entry.model).sort(), ['model-a', 'model-b', 'model-c']);
  assert.deepEqual(fusionPlannedOnly(record), [{ role: 'judge', model: 'model-j' }], 'planned but unexecuted models are not reported as used');
  const line = fusionAttributionText(run, record);
  assert.match(line, /^Fusion High · Critique · answer by model-a · also used model-b \(critic\), model-c \(critic\)/);
  // A second turn keeps the first turn's attribution intact.
  await provider.run(args);
  assert.equal(run.fusionTurns.length, 2); assert.equal(run.fusionTurns[0].fusionId, 'turn1'); assert.equal(run.fusion.fusionId, 'turn2');
  const totals = fusionModelTotals(run);
  assert.deepEqual(totals.find(row => row.model === 'model-a'), { model: 'model-a', turns: 2, requests: 4, inputTokens: 440, outputTokens: 200, nanoAiu: 10000000, finals: 2 });
  // Remote projections carry turns referenced by the visible window plus the latest turn.
  run.fusionTurns.unshift({ fusionId: 'old', phases: [], models: {} });
  assert.deepEqual(fusionTurnsFor(run, [{ data: { fusion: { fusionId: 'turn1' } } }]).map(item => item.fusionId), ['turn1', 'turn2']);
  // Unavailable Fusion fails clearly without starting a session.
  provider.connect = async () => ({ rpc: { models: { list: async () => ({ models: [ordinary] }) } } });
  await assert.rejects(provider.run(args), /Copilot Fusion is not currently available for this Copilot account/);
});

test('Fusion attribution renders escaped, labels unreported values and survives history paging', () => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const turn = { fusionId: 'x', status: 'fallback', policy: 'fusion-max', pattern: 'single', fallback: { fallbackModel: '<b>model</b>', reason: 'router_timeout' }, phases: [{ phaseId: 'p', role: 'primary', model: '<b>model</b>', status: 'succeeded' }], models: {} };
  const html = fusionAttributionHTML({}, turn, escape);
  assert.equal(html.includes('<b>model</b>'), false); assert.match(html, /&lt;b&gt;model&lt;\/b&gt;/);
  assert.match(html, /Turn totals not reported yet/); assert.match(fusionAttributionText({}, turn), /Fusion Fusion max · Single · answering model not reported .*fallback: Router timeout/);
  const routing = { fusionId: 'y', status: 'routing', phases: [], models: {} };
  assert.match(fusionAttributionText({ fusionSelection: { tier: 'fusion-high', label: 'High' } }, routing), /^Fusion High · choosing models…$/);
  assert.match(renderCopilotFusion({ schedule: { provider: 'copilot', model: 'gpt-fixture' }, fusionAvailability: { available: false, note: 'Not offered yet.' } }, escape), /Not offered yet\./);
  const merged = mergeChatHistory({ id: 'c', eventStart: 100, events: [{}], eventCount: 101, fusionTurns: [{ fusionId: 'older' }, { fusionId: 'shared', status: 'running' }] }, { id: 'c', eventStart: 101, events: [{}], eventCount: 102, fusionTurns: [{ fusionId: 'shared', status: 'succeeded' }] });
  assert.deepEqual(merged.fusionTurns.map(item => [item.fusionId, item.status]), [['older', undefined], ['shared', 'succeeded']]);
});
