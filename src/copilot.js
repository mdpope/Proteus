import { CopilotClient } from '@github/copilot-sdk';
import { browserTools } from './browser-tools.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { revision } from './schedules.js';
import { selectedAgentToolScope } from './agent-tools.js';
import { toolActivity, displayText } from './tool-activity.js';
import { TurnWaiter } from './turn-waiter.js';

export class CopilotProvider {
  constructor(options = {}, { browser, context, settings } = {}) { this.browser = browser; this.context = context; this.settings = settings; this.options = options; this.client = null; this.starting = null; this.sessions = new Map(); }
  dataDirectory() { return this.settings?.get().copilotDataDirectory || this.options.baseDirectory || process.env.COPILOT_HOME || path.join(os.homedir(), '.copilot'); }
  async connect(baseDirectory = this.dataDirectory()) {
    if (this.client && this.baseDirectory !== baseDirectory) await this.close();
    this.baseDirectory = baseDirectory;
    if (!this.starting) {
      this.client = new CopilotClient({ ...this.options, baseDirectory });
      this.starting = this.client.start().catch(error => { this.starting = null; this.client = null; throw error; });
    }
    await this.starting; return this.client;
  }
  async quota() {
    // A usage refresh must never restart a client running a chat in another profile.
    const client = this.starting ? (await this.starting, this.client) : await this.connect();
    return await client.rpc.account.getQuota({});
  }
  async status() {
    try {
      const client = await this.connect(); const auth = await client.getAuthStatus();
      if (!auth.isAuthenticated) return { available: false, error: 'Sign in with Copilot CLI, then refresh.', auth };
      const [models, quota] = await Promise.allSettled([client.listModels(), client.rpc.account.getQuota({})]);
      return {
        available: true, auth,
        models: models.status === 'fulfilled' ? models.value : [],
        quota: quota.status === 'fulfilled' ? quota.value : null,
        quotaError: quota.status === 'rejected' ? quota.reason.message : null,
        checkedAt: new Date().toISOString()
      };
    } catch (error) { return { available: false, error: error.message, quota: null }; }
  }
  async run({ run, prompt, emit, ask, update, signal, stream }) {
    let turn;
    const askUser = async request => { turn?.pause(); try { return await ask(request); } finally { turn?.resume(); } };
    const decisions = new Map();
    const permission = request => {
      // The runtime can ask separately for path access and the read operation,
      // presenting the same request twice for one tool call. Reuse only that
      // identical in-flight decision, never a grant for another operation.
      const key = request.toolCallId && !request.managedApprovalRequired && !request.requestSandboxBypass ? revision(request) : null;
      if (key && decisions.has(key)) return decisions.get(key).answer;
      const answer = askUser({ type: 'permission', question: 'Copilot needs permission for a tool operation.', details: request }).then(answer => ['approve', 'approve-auto'].includes(answer)
        ? { kind: 'approve-once', ...(answer === 'approve' ? { approvedInteractively: true } : {}) }
        : { kind: 'reject', feedback: 'The user declined this operation in Proteus.' });
      if (key) decisions.set(key, { toolCallId: request.toolCallId, answer });
      return answer;
    };
    const snapshot = run.schedule.context;
    const managed = snapshot && this.context ? this.context.providerContext(snapshot) : null;
    const fingerprint = revision({ context: snapshot || null, mcp: run.schedule.mcpServers || {} });
    // Cold resume is required for removed MCP servers and changed context to take effect.
    if (this.configurationFingerprint && this.configurationFingerprint !== fingerprint) await this.close();
    this.configurationFingerprint = fingerprint;
    run.providerHome ??= this.dataDirectory();
    const client = await this.connect(run.providerHome);
    const models = await client.listModels();
    if (!models.some(model => model.id === run.schedule.model)) throw new Error(`Model ${run.schedule.model} is unavailable for this Copilot account. Choose a model from the provider panel.`);
    const includeLegacy = snapshot?.includeDefaults !== false;
    const config = {
      model: run.schedule.model, streaming: true,
      ...(run.schedule.reasoningEffort ? { reasoningEffort: run.schedule.reasoningEffort } : {}),
      workingDirectory: run.schedule.workspace.cwd,
      additionalDirectories: run.schedule.workspace.additionalDirectories,
      skillDirectories: includeLegacy ? run.schedule.skillDirectories || [] : [],
      mcpServers: managed ? { ...Object.fromEntries(Object.entries(includeLegacy ? run.schedule.mcpServers || {} : {}).filter(([name]) => !managed.disabledLegacyMcp.includes(name))), ...managed.mcpServers } : run.schedule.mcpServers || {},
      ...(managed ? { skipCustomInstructions: true, enableConfigDiscovery: false, enableOnDemandInstructionDiscovery: false, enableSkills: includeLegacy && !!run.schedule.skillDirectories?.length, disabledSkills: managed.disabledSkills, enableFileHooks: false, customAgents: managed.customAgents, agent: managed.agent, availableTools: selectedAgentToolScope(managed) } : {}),
      tools: browserTools(this.browser, run.id),
      systemMessage: { mode: 'append', content: `Proteus workspace roots (${managed ? 'use the explicitly selected context below; do not automatically load other instruction/skill/agent files' : 'read relevant AGENTS.md and .github/copilot-instructions.md before work'}):\n${[run.schedule.workspace.cwd, ...run.schedule.workspace.additionalDirectories].join('\n')}\n${this.browser ? 'Embedded browser access is available through proteus_browser. Use it for visible authenticated website reads. The user can interact with those same tabs; ask for sign-in if needed.' : 'Embedded browser access is unavailable in this server-only session.'}\nEditor context supplied by the user: ${JSON.stringify(run.schedule.editorContext || null)}\n${managed?.instructionText || ''}` },
      onPermissionRequest: permission,
      onUserInputRequest: async request => ({ answer: await askUser({ type: 'question', question: request.question, choices: request.choices }), wasFreeform: true })
    };
    const session = run.providerSessionId
      ? await client.resumeSession(run.providerSessionId, config)
      : await client.createSession({ ...config, sessionId: run.id });
    if (managed && !managed.agent) await session.rpc.agent.deselect();
    run.providerSessionId = session.sessionId;
    const nativePath = path.join(run.providerHome, 'session-state', session.sessionId);
    if (fs.existsSync(nativePath)) run.nativeSessionPath = nativePath;
    if (snapshot) { snapshot.suppliedAt = new Date().toISOString(); snapshot.delivery = 'Copilot session configuration accepted'; for (const entry of snapshot.entries) if (entry.kind === 'mcp') entry.runtimeName = managed.mcpMappings[entry.id]; }
    run.explicitProviderContext = { mcpNames: Object.keys(config.mcpServers), skillDirectories: config.skillDirectories, disabledSkills: config.disabledSkills || [] };
    update(); this.sessions.set(run.id, session);
    let providerError;
    const activity = toolActivity({ run, emit, update });
    const unsubscribe = session.on(event => {
      if (event.type === 'assistant.message_delta') stream?.(event.data.messageId, event.data.deltaContent || '');
      if (event.type === 'assistant.message') {
        const content = event.data.content || run.liveMessages?.[event.data.messageId] || '';
        if (run.liveMessages) delete run.liveMessages[event.data.messageId];
        if (content.trim()) emit('assistant', content);
        else update();
      }
      activity(event);
      if (event.type === 'tool.execution_complete') for (const [key, value] of decisions) if (value.toolCallId === event.data.toolCallId) decisions.delete(key);
      if (event.type === 'session.warning') emit('system', displayText(event.data.message || 'Provider warning'));
      if (event.type === 'session.compaction_start') emit('system', 'Copilot is compacting the conversation context.');
      if (event.type === 'session.compaction_complete') emit('system', 'Conversation context compacted.');
      if (event.type === 'session.task_complete' && event.data.summary?.trim() && !run.events?.some(e => e.role === 'assistant' && e.text === event.data.summary)) emit('assistant', event.data.summary);
      if (event.type === 'assistant.usage') {
        run.usage.inputTokens += event.data.inputTokens || 0; run.usage.outputTokens += event.data.outputTokens || 0;
        run.usage.observed = true; update();
      }
      if (event.type === 'session.usage_info') { run.contextUsage = event.data; update(); }
      if (event.type === 'session.error') { providerError = event.data.message || 'Provider reported an error'; emit('system', providerError); }
    });
    const abort = () => { void session.abort().catch(() => {}); };
    signal.addEventListener('abort', abort, { once: true });
    try {
      if (signal.aborted) throw new Error('Cancelled');
      turn = new TurnWaiter(session, signal);
      await turn.run(prompt);
      if (providerError) throw new Error(providerError);
      try { run.metrics = await session.rpc.usage.getMetrics({}); update(); } catch { /* Optional runtime capability. */ }
    } catch (error) {
      // Disconnect alone does not stop a timed-out provider turn.
      await session.abort().catch(() => {});
      throw error;
    } finally {
      for (const [id, text] of Object.entries(run.liveMessages || {})) {
        if (text.trim()) emit('assistant', text, { interrupted: true });
        delete run.liveMessages[id];
      }
      activity.finish();
      signal.removeEventListener('abort', abort); unsubscribe(); this.sessions.delete(run.id); await session.disconnect();
    }
  }
  async close() { if (this.client) await this.client.stop(); this.client = null; this.starting = null; }
}
