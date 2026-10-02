// Provider adapters publish this common capability shape; clients never invent model limits.
const positive = value => Number.isFinite(value) && value > 0 ? value : null;
const identifiers = values => [...new Set((Array.isArray(values) ? values : []).filter(v => typeof v === 'string' && /^[a-zA-Z0-9_.-]{1,80}$/.test(v)))];
export function copilotModel(model) {
  const limits = model.capabilities?.limits || {}; const prices = model.billing?.tokenPrices || {};
  const output = positive(limits.max_output_tokens);
  const supported = model.capabilities?.supports?.reasoningEffort;
  const efforts = supported === false ? [] : identifiers(model.supportedReasoningEfforts || model.capabilities?.supports?.reasoning_effort);
  const tier = (id, budget) => ({ id, promptTokens: positive(budget), totalTokens: positive(budget) && output ? budget + output : id === 'default' && !prices.longContext && !model.supportedContextTiers?.some(id => id !== 'default') ? positive(limits.max_context_window_tokens) : null });
  const multipleTiers = !!prices.longContext || model.supportedContextTiers?.some(id => id !== 'default');
  const contextTiers = [tier('default', prices.maxPromptTokens ?? prices.contextMax ?? (multipleTiers ? null : limits.max_prompt_tokens))];
  if (prices.longContext) contextTiers.push(tier('long_context', prices.longContext.maxPromptTokens ?? prices.longContext.contextMax));
  for (const id of identifiers(model.supportedContextTiers)) if (!contextTiers.some(t => t.id === id)) contextTiers.push(tier(id));
  return { ...model, controls: { reasoningEfforts: efforts, reasoningSupported: supported ?? (efforts.length ? true : null), defaultReasoningEffort: efforts.includes(model.defaultReasoningEffort) ? model.defaultReasoningEffort : null, contextTiers, maxOutputTokens: output } };
}
export function validateModelOptionShape(value) {
  for (const key of ['reasoningEffort', 'contextTier']) if (value[key] != null && (typeof value[key] !== 'string' || (value[key] !== '' && !/^[a-zA-Z0-9_.-]{1,80}$/.test(value[key])))) throw new Error(`${key} must be a provider-advertised option ID.`);
}
export function validateModelOptions(schedule, model) {
  validateModelOptionShape(schedule);
  if (model.policy?.state === 'disabled') throw new Error(`Model ${model.id} is disabled for this account.`);
  if (schedule.reasoningEffort && !model.controls?.reasoningEfforts?.includes(schedule.reasoningEffort)) throw new Error(`Reasoning effort ${schedule.reasoningEffort} is unavailable for ${model.id}. Refresh models and choose a supported effort or Provider default.`);
  if (schedule.contextTier && schedule.contextTier !== 'default' && !model.controls?.contextTiers?.some(t => t.id === schedule.contextTier)) throw new Error(`Context tier ${schedule.contextTier} is unavailable for ${model.id}. Refresh models and choose a supported context size.`);
}
export class ModelCatalog {
  constructor(load, { ttl = 5 * 60_000, now = () => Date.now() } = {}) { this.load = load; this.ttl = ttl; this.now = now; this.value = null; this.lastAttempt = null; this.pending = null; }
  async get(force = false) {
    if (this.pending) return this.pending;
    if (!force && this.lastAttempt !== null && this.now() - this.lastAttempt < this.ttl) return this.value;
    this.lastAttempt = this.now();
    this.pending = (async () => {
      try {
        const result = await this.load();
        if (result.error || result.available === false) throw new Error(result.error || 'Provider unavailable.');
        this.value = { ...result, stale: false, attemptedAt: null, checkedAt: new Date(this.now()).toISOString(), refreshIntervalMs: this.ttl, error: null };
      } catch (error) {
        this.value = { ...(this.value || { available: false, models: [], checkedAt: null }), stale: true, error: error.message, attemptedAt: new Date(this.now()).toISOString(), refreshIntervalMs: this.ttl };
      }
      return this.value;
    })().finally(() => { this.pending = null; });
    return this.pending;
  }
}
