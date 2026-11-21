import {MtplxProvider} from './mtplx.js';
import {ManagedCredentialVault} from '../services/integrations/managed-credential-vault.js';

const endpoint = 'https://openrouter.ai/api/v1';
const keyReference = 'provider.openrouter.v1';
const count = value => Number.isSafeInteger(value) && value > 0 ? value : null;
const price = value => (typeof value === 'number' || typeof value === 'string' && value.trim()) && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const idPattern = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/i;

export function openRouterModels(rows) {
  return (Array.isArray(rows) ? rows : []).filter(row =>
    typeof row?.id === 'string' && row.id.length <= 200 && idPattern.test(row.id) &&
    Array.isArray(row.architecture?.input_modalities) && row.architecture.input_modalities.includes('text') &&
    Array.isArray(row.architecture.output_modalities) && row.architecture.output_modalities.includes('text')
  ).map(row => {
    const input = price(row.pricing?.prompt), output = price(row.pricing?.completion);
    const totalTokens = count(row.context_length), maxOutputTokens = count(row.top_provider?.max_completion_tokens);
    return {
      id: row.id, name: typeof row.name === 'string' ? row.name.slice(0, 160) : row.id,
      supportsVision: row.architecture.input_modalities.includes('image'),
      supportsTools: Array.isArray(row.supported_parameters) && row.supported_parameters.includes('tools'),
      pricing: {currency: 'USD', input, output},
      controls: {contextTiers: [{id: 'default', totalTokens, promptTokens: null}], maxOutputTokens},
    };
  });
}

export class OpenRouterCredentials {
  constructor(home, storage, request = globalThis.fetch) {
    this.vault = new ManagedCredentialVault(home, storage);
    this.request = request;
  }
  key() { return this.vault.read(keyReference)?.key || ''; }
  async configure({action, key}) {
    if (this.configuring) throw Error('OpenRouter connection setup is already in progress.');
    this.vault.requireAvailable();
    this.configuring = true;
    try {
      if (action === 'disconnect') return this.vault.write(keyReference, {key: null});
      if (action !== 'connect' || typeof key !== 'string' || !/^sk-or-[A-Za-z0-9_-]{16,240}$/.test(key)) {
        throw Error('Enter an OpenRouter API key.');
      }
      await this.verify(key);
      this.vault.write(keyReference, {key});
    } finally { this.configuring = false; }
  }
  async verify(key) {
    const response = await this.request(endpoint+'/key', {
      headers: {Authorization: 'Bearer '+key}, signal: AbortSignal.timeout(8000), redirect: 'error',
    }).catch(() => { throw Error('Could not reach OpenRouter to verify the API key.'); });
    await response.body?.cancel().catch(()=>{});
    if (!response.ok) throw Error(`OpenRouter could not verify the API key (HTTP ${response.status}).`);
  }
}

export function beginOpenRouterCharge(run, update) {
  const total = run.openRouterCost ??= {reportedRequests: 0, requests: 0};
  const turn = run.turns?.at(-1);
  const amounts = [total, ...(turn ? [turn.openRouterCost ??= {reportedRequests: 0, requests: 0}] : [])];
  for (const amount of amounts) amount.requests++;
  update({durable:true});
  let settled = false;
  return usage => {
    if (settled) return;
    settled = true;
    if (typeof usage?.cost !== 'number' || !Number.isFinite(usage.cost) || usage.cost < 0) return;
    for (const amount of amounts) {
      amount.reportedRequests++;
      amount.usd = (amount.usd ?? 0) + usage.cost;
    }
    update({durable:true});
  };
}

// Some inference endpoints accept a subset of the tool schema. The original
// schema stays with MtplxTools for validation before any tool executes.
function openRouterToolSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const {uniqueItems, ...transport} = schema;
  if (transport.properties) {
    transport.properties = Object.fromEntries(Object.entries(transport.properties)
      .map(([name, child]) => [name, openRouterToolSchema(child)]));
  }
  if (transport.items) transport.items = openRouterToolSchema(transport.items);
  return transport;
}

export class OpenRouterProvider extends MtplxProvider {
  constructor({credentials, catalog, fetch: request = globalThis.fetch, ...options}, dependencies) {
    super({...options, endpoint, fetch: request, validateEndpoint: () => endpoint, providerId: 'openrouter', label: 'OpenRouter'}, dependencies);
    this.credentials = credentials;
    this.catalog = catalog;
  }
  async discover() {
    const response = await this.request(endpoint+'/models', {signal: AbortSignal.timeout(8000), redirect: 'error'});
    if (!response.ok) throw Error(`OpenRouter model discovery returned HTTP ${response.status}.`);
    const models = openRouterModels((await response.json()).data);
    if (!models.length) throw Error('OpenRouter did not advertise any chat models.');
    return models;
  }
  async models() {
    // The cache is also used by the picker. Model admission and model metadata
    // share one owner catalog across concurrent chats.
    return this.catalog ? (await this.catalog()).models : this.discover();
  }
  async status() {
    let key = '', error;
    try { key = this.credentials.key(); }
    catch { error = 'OpenRouter needs protected credential storage on this computer.'; }
    let models = [];
    if (key) {
      try { [models] = await Promise.all([this.discover(), this.credentials.verify(key)]); }
      catch { error = 'Could not refresh OpenRouter. Check the API key and the owner’s network connection.'; }
    }
    return {
      provider: this.providerId, label: this.label, available: !!key && !error, models,
      ...(error ? {connectionError: error} : {}), credentialConfigured: !!key,
      capabilities: {steering: false, tools: true, context: 'OpenRouter and the selected inference endpoint receive the model input. Charges use the owner’s OpenRouter API key.'},
    };
  }
  async run(args) {
    this.turnKey = this.credentials.key();
    if (!this.turnKey) throw Error('Connect OpenRouter in Engine Room → Providers on the executing computer.');
    // Reasoning blocks are opaque input to the next request for this model.
    // When switching models, retain the delivered transcript and tool results.
    if (args.run.openRouterReasoningModel !== args.run.schedule.model) {
      args.run.openRouterReasoningModel = args.run.schedule.model;
      for (const message of args.run.mtplxHistory || []) {
        delete message.reasoning_details;
        delete message.reasoning;
      }
    }
    try { return await super.run(args); }
    finally { this.turnKey = null; }
  }
  get executionLocation() { return 'cloud'; }
  completionOptions(_schedule, _model, definitions) {
    const tools = definitions.map(tool => ({
      ...tool, function: {...tool.function, parameters: openRouterToolSchema(tool.function.parameters)},
    }));
    const toolOptions = tools.length ? {tools, tool_choice: 'auto', provider: {require_parameters: true}} : {};
    return {stream_options:undefined, ...toolOptions};
  }
  requestHeaders() { return {Authorization: 'Bearer '+this.turnKey, 'X-OpenRouter-Title': 'Proteus'}; }
  assistantMetadata() {
    const blocks = new Map();
    let raw = '', size = 0;
    return {
      observe(delta) {
        if (typeof delta?.reasoning === 'string') raw += delta.reasoning;
        const details = Array.isArray(delta?.reasoning_details) ? delta.reasoning_details : [];
        for (const [position, block] of details.entries()) {
          if (!block || typeof block !== 'object') continue;
          const index = block.index ?? position;
          if (!Number.isSafeInteger(index) || index < 0 || index >= 1024) continue;
          const detail = blocks.get(index) || {index};
          for (const field of ['id','type','format']) if (typeof block[field] === 'string') detail[field] = block[field];
          for (const field of ['text','summary','data','signature']) {
            if (typeof block[field] !== 'string') continue;
            size += block[field].length;
            detail[field] = (detail[field] || '') + block[field];
          }
          blocks.set(index, detail);
        }
        if (size + raw.length > 1_000_000) throw Error('OpenRouter reasoning exceeded the context limit.');
      },
      value() {
        if (blocks.size) return {reasoning_details: [...blocks.values()].sort((a, b) => a.index - b.index)};
        return raw ? {reasoning: raw} : {};
      },
    };
  }
  beginRequest(run, update) { return beginOpenRouterCharge(run, update); }
  completionError(status) {
    const action = {
      401: 'Verify the owner’s API key.', 402: 'Check OpenRouter credits and the API key’s spending limit.',
      403: 'Check the model and endpoint in OpenRouter account settings.', 429: 'The model or API key is rate limited.',
    }[status] || 'Check model availability in OpenRouter.';
    return Error(`OpenRouter HTTP ${status}. ${action}`);
  }
  streamError() { return Error('OpenRouter interrupted the generation. Check OpenRouter Activity for its status.'); }
}
