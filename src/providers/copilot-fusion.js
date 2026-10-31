// Copilot Fusion (provider-routed multi-model execution).
//
// Selection comes only from the runtime's advertised Auto routing descriptors
// (`ModelList.auto.tiers` with a Fusion execution type/tier). Proteus never
// hard-codes tier identifiers, model rosters or plan entitlement. Attribution is
// recorded per Fusion turn from the provider's own events: planned models,
// every executed phase, per-request usage and the model that supplied the final
// answer. Draft/critic content is never stored; only metadata is kept.

export const FUSION_MODEL_ID = 'copilot-fusion';
const OPTION_ID = /^[a-zA-Z0-9_.-]{1,80}$/; // Must satisfy validateModelOptionShape.
const MAX_TURNS = 200, MAX_PHASES = 64, MAX_MODELS = 32, MAX_EVENT_IDS = 1024;
const text = (value, length = 300) => typeof value === 'string' && value.trim() ? value.slice(0, length) : undefined;
const count = value => Number.isFinite(value) && value >= 0 ? value : undefined;
const pick = (value, keys, length) => Object.fromEntries(keys.flatMap(key => text(value?.[key], length) !== undefined ? [[key, text(value[key], length)]] : []));
const numbers = (value, keys) => Object.fromEntries(keys.flatMap(key => count(value?.[key]) !== undefined ? [[key, value[key]]] : []));
const USAGE_KEYS = ['inputTokens', 'outputTokens', 'cachedTokens', 'cacheWriteTokens', 'requestCount', 'totalNanoAiu'];

function promotion(value) {
  if (!value || typeof value !== 'object') return null;
  const result = { ...pick(value, ['id', 'message', 'startsAt', 'endsAt']), ...numbers(value, ['discountPercent']) };
  return Object.keys(result).length ? result : null;
}

/** Fusion routing preferences advertised for this account, in server order. */
export function fusionTiers(auto) {
  const tiers = Array.isArray(auto?.tiers) ? auto.tiers : [];
  return tiers.filter(tier => tier && OPTION_ID.test(tier.id || '') && (tier.type === 'fusion' || !!text(tier.fusionTier))).map(tier => ({
    id: tier.id, label: text(tier.displayName, 80) || tier.id, description: text(tier.description) || '',
    fusionTier: text(tier.fusionTier, 40) || null, enabled: tier.status?.enabled !== false, visible: tier.status?.pickerVisible !== false,
    reason: text(tier.status?.reason, 80) || null, message: text(tier.status?.message) || null, promotion: promotion(tier.billing?.promo)
  }));
}

/** A selectable catalog entry, or null when no Fusion tier is currently selectable. */
export function fusionModel(auto) {
  const tiers = fusionTiers(auto).filter(tier => tier.visible), selectable = tiers.filter(tier => tier.enabled);
  if (!selectable.length) return null;
  const preferred = selectable.find(tier => tier.id === auto?.defaultTier) || null;
  return {
    id: FUSION_MODEL_ID, name: 'Copilot Fusion', fusion: true, providerModel: 'auto',
    description: 'GitHub routes each prompt across models (Single, Cascade or Critique). Billed per model used.',
    fusionTiers: tiers,
    controls: {
      reasoningEfforts: selectable.map(tier => tier.id), reasoningSupported: true,
      defaultReasoningEffort: preferred?.id || null, reasoningEffortTitle: 'Fusion effort',
      reasoningEffortLabels: Object.fromEntries(tiers.map(tier => [tier.id, tier.label])),
      unavailableReasoningEfforts: tiers.filter(tier => !tier.enabled).map(tier => ({ id: tier.id, label: tier.label, message: tier.message || tier.reason || 'Unavailable for this account.' })),
      contextTiers: [{ id: 'default', promptTokens: null, totalTokens: null }], maxOutputTokens: null
    }
  };
}

export function fusionAvailability(models, auto) {
  const tiers = fusionTiers(auto), model = models.find(item => item.id === FUSION_MODEL_ID);
  // Legacy runtimes advertised Fusion-capable ordinary model entries instead.
  const legacy = models.filter(item => item.id !== FUSION_MODEL_ID && (item.capabilities?.supports?.fusion === true || /fusion/i.test(item.name || '') || /fusion/i.test(item.id || '')));
  const unavailable = tiers.filter(tier => tier.visible && !tier.enabled);
  const note = model ? 'Choose Copilot Fusion in the model picker, then a Fusion effort.'
    : legacy.length ? 'Select an advertised Fusion model.'
    : unavailable.length ? 'Copilot Fusion is advertised but unavailable: ' + unavailable.map(tier => `${tier.label} — ${tier.message || tier.reason || 'unavailable'}`).join('; ')
    : 'Copilot has not offered Copilot Fusion to this account/runtime. Refresh models to check again.';
  return { available: !!model || legacy.length > 0, modelIds: model ? [FUSION_MODEL_ID] : legacy.map(item => item.id), tiers, note };
}

/** Session configuration for the selected catalog entry. */
export function fusionSessionOptions(schedule, model) {
  if (model?.fusion !== true) return null;
  const tier = schedule.reasoningEffort || model.controls.defaultReasoningEffort;
  return { model: model.providerModel || 'auto', ...(tier ? { autoTier: tier } : {}) };
}

function newTurn(at) { return { status: 'routing', startedAt: at, phases: [], models: {} }; }
function addModel(turn, model, role) {
  const id = text(model, 200); if (!id) return null;
  if (!turn.models[id] && Object.keys(turn.models).length >= MAX_MODELS) return null;
  const entry = turn.models[id] ||= { roles: [], requests: 0 };
  if (role && !entry.roles.includes(role)) entry.roles = [...entry.roles, text(role, 80)].slice(-12);
  return entry;
}

/**
 * Consume native routing/phase/attribution events. Returns true when the event
 * was fully handled (or is review content that must never become an answer);
 * false keeps the adapter's ordinary message/usage path.
 */
export function fusionJournal(run, update, { now = () => new Date().toISOString() } = {}) {
  return event => {
    const type = event.type || '', data = event.data || {};
    const attribution = data.fusion && typeof data.fusion === 'object' ? data.fusion : null;
    const lifecycle = /^(session\.fusion_|assistant\.fusion_phase_)/.test(type);
    if (!lifecycle && !attribution) return false;
    run.fusionEventIds ||= [];
    if (event.id) {
      if (run.fusionEventIds.includes(event.id)) return true; // Replayed receipt, never another answer.
      run.fusionEventIds.push(event.id); if (run.fusionEventIds.length > MAX_EVENT_IDS) run.fusionEventIds = run.fusionEventIds.slice(-MAX_EVENT_IDS);
    }
    const at = text(event.timestamp, 40) || now();
    const turns = run.fusionTurns ||= [];
    const fusionId = text(data.fusionId || attribution?.fusionId, 200), attemptId = text(data.attemptId, 200);
    let turn = (fusionId && turns.find(item => item.fusionId === fusionId)) || (attemptId && turns.find(item => item.attemptId === attemptId));
    // Older/partial events can omit identities: route resolution binds the pending
    // attempt; other ID-less events belong to the latest unfinished turn.
    if (!turn && type === 'session.fusion_resolved') turn = turns.findLast(item => !item.fusionId && item.status === 'routing');
    else if (!turn && !fusionId && type !== 'session.fusion_route_started') turn = turns.findLast(item => !item.completion);
    if (!turn) { turn = newTurn(at); turns.push(turn); if (turns.length > MAX_TURNS) turns.splice(0, turns.length - MAX_TURNS); }
    if (fusionId) turn.fusionId = fusionId;
    if (attemptId) turn.attemptId = attemptId;
    turn.updatedAt = at;
    Object.assign(turn, pick(data, ['policy', 'syntheticModel', 'pattern', 'turnId', 'turnKind'], 200));
    if (attribution) Object.assign(turn, pick(attribution, ['policy', 'syntheticModel', 'pattern'], 200));
    let handled = true;
    if (type === 'session.fusion_route_started') turn.status = 'routing';
    else if (type === 'session.fusion_resolved') {
      turn.status = 'running';
      turn.plan = {
        ...pick(data, ['primaryModel', 'secondaryModel', 'judgeModel', 'repairModel', 'fallbackModel', 'followUpModel', 'hint', 'routeSource', 'ruleName', 'modelUniverseVersion'], 300),
        ...numbers(data, ['routingLatencyMs']),
        critics: (Array.isArray(data.critics) ? data.critics : []).slice(0, 16).map(critic => pick(critic, ['model', 'phaseId', 'reasoningEffort'], 200)).filter(critic => critic.model),
        steps: (Array.isArray(data.phasePlan) ? data.phasePlan : []).slice(0, 32).map(step => ({ ...pick(step, ['kind', 'role', 'scope'], 80), conditional: step?.conditional === true }))
      };
    } else if (type === 'session.fusion_route_failed') {
      turn.status = 'fallback';
      turn.fallback = { ...pick(data, ['fallbackModel', 'reason', 'errorMessage'], 300), ...numbers(data, ['routingLatencyMs']) };
      addModel(turn, data.fallbackModel, 'fallback');
    } else if (type === 'session.fusion_completed') {
      turn.completion = { ...pick(data, ['outcome', 'degradedReason', 'finalSourceModel', 'finalSourcePhaseId', 'followUpModel'], 300), ...numbers(data, ['phaseCount', 'requestCount', 'inputTokens', 'outputTokens', 'cachedTokens', 'cacheWriteTokens', 'totalNanoAiu', 'durationMs']), ...(data.awaitingBackgroundWork === true ? { awaitingBackgroundWork: true } : {}) };
      turn.status = turn.completion.outcome || 'completed'; turn.completedAt = at;
      if (turn.completion.finalSourceModel) { turn.final ||= {}; turn.final.sourceModel ||= turn.completion.finalSourceModel; turn.final.sourcePhaseId ||= turn.completion.finalSourcePhaseId; }
    } else if (type.startsWith('assistant.fusion_phase_') && text(data.phaseId, 200)) {
      let phase = turn.phases.find(item => item.phaseId === data.phaseId);
      if (!phase) { phase = { phaseId: text(data.phaseId, 200) }; turn.phases.push(phase); if (turn.phases.length > MAX_PHASES) turn.phases.splice(0, turn.phases.length - MAX_PHASES); }
      // Content, review text and tool payloads are deliberately not copied.
      Object.assign(phase, pick(data, ['phaseKind', 'role', 'model', 'reasoningEffort', 'conversationScope'], 200));
      if (type.endsWith('_started')) { phase.status = 'running'; phase.startedAt ||= at; }
      if (type.endsWith('_activity')) phase.activity = text(data.activity, 40);
      if (type.endsWith('_completed') || type.endsWith('_failed')) {
        phase.status = text(data.status, 40) || (type.endsWith('_failed') ? 'failed' : 'succeeded'); phase.endedAt = at;
        Object.assign(phase, numbers(data, ['durationMs']), pick(data, ['verdict', 'reason', 'errorMessage', 'degradedToPhaseId'], 300));
        if (data.usage) phase.usage = numbers(data.usage, USAGE_KEYS);
      }
      addModel(turn, phase.model, phase.role || phase.phaseKind);
    } else if (attribution) {
      handled = false;
      if (type === 'assistant.usage') {
        // Concrete per-request accounting stays on the ordinary usage path too.
        const entry = addModel(turn, data.model || attribution.sourceModel, attribution.role || attribution.phaseKind);
        if (entry) {
          entry.requests += 1;
          for (const [key, source] of [['inputTokens', 'inputTokens'], ['outputTokens', 'outputTokens'], ['cacheReadTokens', 'cacheReadTokens'], ['cacheWriteTokens', 'cacheWriteTokens'], ['cost', 'cost']]) if (count(data[source]) !== undefined) entry[key] = (entry[key] || 0) + data[source];
        }
      } else if (['assistant.message', 'assistant.message_delta'].includes(type)) {
        if (attribution.conversationScope === 'review') handled = true; // Internal draft/critique text is never an answer.
        else if (type === 'assistant.message') {
          turn.final = { ...turn.final, ...pick(attribution, ['sourceModel', 'sourcePhaseId', 'commitId'], 200), ...(attribution.hasUserSteering === true ? { hasUserSteering: true } : {}) };
          addModel(turn, attribution.sourceModel, 'final answer');
        }
      }
    }
    run.fusion = turn; update();
    return handled;
  };
}

/** Message metadata linking an authoritative answer to its Fusion turn. */
export function fusionMessageData(event) {
  const value = event?.data?.fusion;
  if (!value || typeof value !== 'object' || value.conversationScope === 'review' || !text(value.fusionId, 200)) return null;
  return { fusion: { fusionId: text(value.fusionId, 200), ...pick(value, ['sourceModel', 'sourcePhaseId'], 200) } };
}
