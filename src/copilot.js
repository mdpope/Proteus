import { CopilotClient } from '@github/copilot-sdk';
import { browserTools } from './browser-tools.js';

export class CopilotProvider {
  constructor(options = {}, { browser } = {}) { this.browser = browser; this.options = options; this.client = null; this.starting = null; this.sessions = new Map(); }
  async connect() {
    if (!this.starting) {
      this.client = new CopilotClient({ ...this.options });
      this.starting = this.client.start().catch(error => { this.starting = null; this.client = null; throw error; });
    }
    await this.starting; return this.client;
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
  async run({ run, prompt, emit, ask, update, signal }) {
    const client = await this.connect();
    const models = await client.listModels();
    if (!models.some(model => model.id === run.schedule.model)) throw new Error(`Model ${run.schedule.model} is unavailable for this Copilot account. Choose a model from the provider panel.`);
    const config = {
      model: run.schedule.model, streaming: true,
      ...(run.schedule.reasoningEffort ? { reasoningEffort: run.schedule.reasoningEffort } : {}),
      workingDirectory: run.schedule.workspace.cwd,
      additionalDirectories: run.schedule.workspace.additionalDirectories,
      skillDirectories: run.schedule.skillDirectories || [],
      mcpServers: run.schedule.mcpServers || {},
      tools: browserTools(this.browser, run.id),
      systemMessage: { mode: 'append', content: `Proteus workspace roots (read the relevant AGENTS.md and .github/copilot-instructions.md in each before work):\n${[run.schedule.workspace.cwd, ...run.schedule.workspace.additionalDirectories].join('\n')}\n${this.browser ? 'Embedded browser access is available through proteus_browser. Use it for visible authenticated website reads. The user can interact with those same tabs; ask for sign-in if needed.' : 'Embedded browser access is unavailable in this server-only session.'}\nEditor context supplied by the user: ${JSON.stringify(run.schedule.editorContext || null)}` },
      onPermissionRequest: async request => {
        const answer = await ask({ type: 'permission', question: 'Copilot needs permission for a tool operation.', details: request });
        return answer === 'approve' ? { kind: 'approve-once' } : { kind: 'reject', feedback: 'The user declined this operation in Proteus.' };
      },
      onUserInputRequest: async request => ({ answer: await ask({ type: 'question', question: request.question, choices: request.choices }), wasFreeform: true })
    };
    const session = run.providerSessionId
      ? await client.resumeSession(run.providerSessionId, config)
      : await client.createSession({ ...config, sessionId: run.id });
    run.providerSessionId = session.sessionId; update(); this.sessions.set(run.id, session);
    let providerError;
    const unsubscribe = session.on(event => {
      if (event.type === 'assistant.message') emit('assistant', event.data.content || '');
      if (event.type === 'tool.execution_start') emit('tool', event.data.toolName || 'Tool started');
      if (event.type === 'tool.execution_complete') emit('tool', event.data.success === false ? `Tool failed: ${event.data.error?.message || JSON.stringify(event.data.error || 'Provider returned no error details.')}` : 'Tool finished');
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
      await session.sendAndWait({ prompt }, 30 * 60 * 1000);
      if (providerError) throw new Error(providerError);
      try { run.metrics = await session.rpc.usage.getMetrics({}); update(); } catch { /* Optional runtime capability. */ }
    } catch (error) {
      // Disconnect alone does not stop a timed-out provider turn.
      await session.abort().catch(() => {});
      throw error;
    } finally {
      signal.removeEventListener('abort', abort); unsubscribe(); this.sessions.delete(run.id); await session.disconnect();
    }
  }
  async close() { if (this.client) await this.client.stop(); this.client = null; this.starting = null; }
}
