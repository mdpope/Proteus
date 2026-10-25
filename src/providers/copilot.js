import {questionAttachmentTools} from '../services/chats/question-attachments.js';
import {providerActivity} from '../shared/provider-activity.js';
import {copilotMessageAttachments} from './provider-attachment-input.js';
import {chatControlTools} from '../services/chats/chat-control-tools.js';
import { uniqueModels } from '../../public/features/chats/model-choices.js';
import {integrationTools} from '../services/integrations/integration-tools.js';
import { safeToolError } from '../../public/features/chats/tool-presentation.js';
import { CopilotClient } from '@github/copilot-sdk';
import {appInstructions} from '../services/chats/document-tools.js';
import {captureAppCapabilities} from '../services/chats/app-capabilities.js';
import { browserTools } from '../services/browser/browser-tools.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { revision } from '../services/scheduling/schedules.js';
import { selectedAgentToolScope } from '../services/chats/agent-tools.js';
import { toolActivity, displayText } from '../shared/tool-activity.js';
import { copilotModel, validateModelOptions } from '../models/model-catalog.js';
import { TurnWaiter } from './turn-waiter.js';

export class CopilotProvider {
  constructor(options = {}, { browser, context, settings, clientFactory = value => new CopilotClient(value), quotaClientFactory, quotaTimeoutMs = 8000, quotaStopTimeoutMs = 1500 } = {}) { this.browser = browser; this.context = context; this.settings = settings; this.options = options;this.clientFactory=clientFactory;
    // SDK empty mode disables Keychain and can silently select a different gh
    // account. A fresh quota process must retain the conversation's auth options.
    this.quotaClientFactory=quotaClientFactory || (baseDirectory => this.clientFactory({...this.options,baseDirectory,logLevel:'none'}));
    this.quotaTimeoutMs=quotaTimeoutMs;this.quotaStopTimeoutMs=quotaStopTimeoutMs;this.quotaPending=null;this.quotaProbe=null; this.client = null; this.starting = null; this.sessions = new Map(); this.authSessions = new Map(); this.acceptedMediaTypes=Object.freeze(['image/png','image/jpeg','image/gif','image/webp','application/pdf','text/plain']);this.acceptedSteeringMediaTypes=this.acceptedMediaTypes; }
  dataDirectory() { return this.settings?.get().copilotDataDirectory || this.options.baseDirectory || process.env.COPILOT_HOME || path.join(os.homedir(), '.copilot'); }
  async connect(baseDirectory = this.dataDirectory()) {
    if (this.client && this.baseDirectory !== baseDirectory) await this.close();
    this.baseDirectory = baseDirectory;
    if (!this.starting) {
      this.client = this.clientFactory({ ...this.options, baseDirectory });
      this.starting = this.client.start().catch(error => { this.starting = null; this.client = null; throw error; });
    }
    await this.starting; return this.client;
  }
  async quota() {
    // The CLI can retain account.getQuota for the entire process lifetime. Probe
    // from a new quota-only process so Refresh means a fresh provider query,
    // while a running chat keeps its own SDK client and sessions untouched.
    if(this.quotaPending)return this.quotaPending;
    const bounded=(work,ms)=>{
      let timer;
      return Promise.race([Promise.resolve().then(work),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Timed out')),ms);})]).finally(()=>clearTimeout(timer));
    };
    const client=this.quotaClientFactory(this.dataDirectory());
    let cancel;
    const cancelled=new Promise((_,reject)=>{cancel=()=>reject(new Error('Cancelled'));});
    const probe={client,cancel};this.quotaProbe=probe;
    const cleanup=async()=>{
      // stop() may wait for a hung start/RPC. The SDK documents forceStop() for
      // this case; neither cleanup path may hold shutdown or the next Refresh.
      try{
        const errors=await bounded(()=>client.stop(),this.quotaStopTimeoutMs);
        if(Array.isArray(errors)&&errors.length)throw new Error('Cleanup failed');
      }catch{
        await bounded(()=>client.forceStop(),this.quotaStopTimeoutMs);
      }
    };
    const pending=(async()=>{
      try{
        const result=await bounded(()=>Promise.race([(async()=>{await client.start();if(client.getAuthStatus){const auth=await client.getAuthStatus();if(auth?.isAuthenticated===false)throw new Error('Copilot is signed out. Sign in with Copilot CLI on this computer, then refresh.');}return client.rpc.account.getQuota({});})(),cancelled]),this.quotaTimeoutMs);
        return result;
      }catch(error){const reason=error.message==='Timed out'?'Provider quota request timed out. Retry when Copilot is available.':error.message==='Cancelled'?'Allowance check was interrupted. Refresh again.':/signed out/.test(error.message)?error.message:(safeToolError(error.message)||'Provider did not return account allowance.')+' Check Copilot sign-in and retry.';throw new Error('Fresh Copilot allowance unavailable. '+reason);}
      finally{
        try{await cleanup();}
        catch{throw new Error('Copilot allowance probe could not close cleanly.');}
        finally{if(this.quotaProbe===probe)this.quotaProbe=null;}
      }
    })();
    this.quotaPending=pending.finally(()=>{if(this.quotaPending===wrapped)this.quotaPending=null;});
    const wrapped=this.quotaPending;
    return this.quotaPending;
  }
  async models(client) {
    // listModels() retains its first result until disconnect. Use the public RPC
    // to refresh without tearing down a client that owns an active conversation.
    const result = client.rpc?.models?.list ? (await client.rpc.models.list({})).models : await client.listModels();
    return uniqueModels(result.map(copilotModel));
  }
  async status() {
    try {
      let client = this.starting ? (await this.starting, this.client) : await this.connect(); let auth = await client.getAuthStatus();
      // The SDK client can retain a signed-out snapshot after an external CLI
      // sign-in. Recreate only an idle client; never interrupt an active turn.
      if (!auth.isAuthenticated && this.sessions.size===0) {
        await this.close();client=await this.connect();auth=await client.getAuthStatus();
      }
      if (!auth.isAuthenticated) return { available: false, error: 'Sign in with Copilot CLI, then refresh.', auth };
      const models = await this.models(client);
      return {
        available: true, auth,
        models,
        checkedAt: new Date().toISOString()
      };
    } catch (error) { return { available: false, error: error.message }; }
  }
  selectedMcp(run) {
    const snapshot = run.schedule.context;
    const managed = snapshot && this.context ? (this.context.providerMcpContext?.(snapshot) || this.context.providerContext(snapshot)) : null;
    return managed ? { ...Object.fromEntries(Object.entries(snapshot.includeDefaults !== false ? run.schedule.mcpServers || {} : {}).filter(([name]) => !managed.disabledLegacyMcp.includes(name))), ...managed.mcpServers } : run.schedule.mcpServers || {};
  }
  withMcpSelectionBatch(callback) { return this.context?.withMcpSelectionBatch ? this.context.withMcpSelectionBatch(callback) : callback(); }
  async mcpSession(run) {
    const active = this.sessions.get(run.id) || this.authSessions.get(run.id);
    if (active) return active;
    if (!run.providerSessionId || ['queued','running','awaiting_input'].includes(run.status)) throw new Error('Wait for this chat’s provider session to finish starting, then refresh connections.');
    const fingerprint = revision({context:run.schedule.context || null,mcp:run.schedule.mcpServers || {}});
    if (this.configurationFingerprint && this.configurationFingerprint !== fingerprint) await this.close();
    this.configurationFingerprint = fingerprint;
    const client = await this.connect(run.providerHome || this.dataDirectory());
    const session = await client.resumeSession(run.providerSessionId, {
      model: run.schedule.model, workingDirectory: run.schedule.workspace.cwd,
      additionalDirectories: run.schedule.workspace.additionalDirectories,
      mcpServers: this.selectedMcp(run), skipCustomInstructions: true, enableConfigDiscovery: false,
      enableOnDemandInstructionDiscovery: false, enableSkills: false, enableFileHooks: false,
      onPermissionRequest: async () => ({kind:'reject',feedback:'Authentication-only session.'})
    });
    this.authSessions.set(run.id, session); return session;
  }
  async mcpStatus(run) {
    const configured = this.selectedMcp(run); const session = await this.mcpSession(run);
    const value = await session.rpc.mcp.list();
    return { servers: Object.entries(configured).map(([name, config]) => {
      const item = value.servers.find(server => server.name === name);
      const error = item?.error || value.host?.failedServers?.[name]?.message;
      return {name, status: value.host?.needsAuthServers?.[name] ? 'needs-auth' : item?.status || 'not-connected', scope: this.sessions.has(run.id)?'active-chat':'resumed-chat', observedAt:new Date().toISOString(), remote: ['http','sse'].includes(config.type), ...(error ? {error:displayText(error,1000)} : {})}; }) };
  }
  hasMcpSession(run) { return this.sessions.has(run.id)||this.authSessions.has(run.id); }
  async mcpHealth(run,name) {
    const result=await this.mcpStatus(run),row=result.servers.find(s=>s.name===name);
    if(!row)throw new Error('Choose a selected MCP server.');
    const session=this.sessions.get(run.id)||this.authSessions.get(run.id);
    if(row.remote&&typeof session?.rpc.mcp.oauth?.probe==='function') {
      const entry=(await session.rpc.mcp.list()).servers.find(s=>s.name===name);
      try {
        const probe=await session.rpc.mcp.oauth.probe({serverName:name,...(entry?.owned?.installationId?{expectedInstallationId:entry.owned.installationId}:{})});
        row.authentication=probe.status==='authenticated'?'token-accepted':probe.status==='needs-auth'?'needs-auth':probe.status==='no-auth-required'?'not-required':'unverified';
        if(probe.status==='needs-auth')row.status='needs-auth';
      } catch { row.authentication='unverified'; }
    }
    return {servers:[row]};
  }
  async mcpRecover(run,name) {
    if(this.sessions.size)throw new Error('Wait for active tools to finish before reconnecting.');
    const before=await this.mcpHealth(run,name),row=before.servers[0];
    const session=this.authSessions.get(run.id);
    // Never start interactive OAuth or clear shared tokens here. Runtime restart uses its
    // own credential cache/refresh behavior; it does not establish downstream access.
    if(row.authentication==='needs-auth')return before;
    if(!['connected','failed','not-connected'].includes(row.status))return before;
    if(typeof session?.rpc.mcp.restartServer!=='function')throw new Error('This runtime does not support individual connection recovery.');
    await session.rpc.mcp.restartServer({serverName:name});
    return this.mcpHealth(run,name);
  }
  async mcpLogin(run, name) {
    const config = this.selectedMcp(run)[name];
    if (!config || !['http','sse'].includes(config.type)) throw new Error('Choose a selected remote MCP server.');
    const session = await this.mcpSession(run);
    const item = (await session.rpc.mcp.list()).servers.find(server => server.name === name);
    let params = {serverName:name,clientName:'Proteus',callbackSuccessMessage:'Connected. Return to Proteus and refresh connections.'};
    if (item?.owned?.installationId) {
      const expectedInstallationId = item.owned.installationId;
      const prepared = await session.rpc.mcp.oauth.prepareLogin({...params,expectedInstallationId});
      params = {serverName:name,expectedInstallationId,loginId:prepared.loginId};
    }
    const result = await session.rpc.mcp.oauth.login(params);
    if (result.authorizationUrl && !/^https:\/\//i.test(result.authorizationUrl)) throw new Error('Provider returned an unsafe sign-in URL.');
    const latest=result.authorizationUrl?null:(await session.rpc.mcp.list());
    const status=latest?.host?.needsAuthServers?.[name]?'needs-auth':latest?.servers?.find(server=>server.name===name)?.status||'not-connected';
    return {server:name,status:result.authorizationUrl ? 'sign-in-required' : status,authorizationUrl:result.authorizationUrl || null,observedAt:new Date().toISOString(),scope:this.sessions.has(run.id)?'active-chat':'resumed-chat'};
  }
  async steer(run, prompt, attachments=[]) {
    const session = this.sessions.get(run.id);
    if (!session) throw new Error('Copilot is still starting. Queue this message or try steering again.');
    await session.send({ prompt, mode: 'immediate',attachments:copilotMessageAttachments(attachments,this.acceptedMediaTypes) });
  }
  async run({ run, prompt, attachments=[], emit, ask, update, signal, stream, permissionProfile }) {
    const nativeAttachments=copilotMessageAttachments(attachments,this.acceptedMediaTypes);
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
    const folders=permissionProfile?.();
    const additionalDirectories=[...new Set([...run.schedule.workspace.additionalDirectories,...(folders?.chatFolders||[]).map(folder=>folder.path),...(folders?.automaticFolders||[]).map(folder=>folder.path)])];
    const fingerprint = revision({ context: snapshot || null, mcp: run.schedule.mcpServers || {}, additionalDirectories });
    // Cold resume is required for removed MCP servers and changed context to take effect.
    if (this.configurationFingerprint && this.configurationFingerprint !== fingerprint) await this.close();
    this.configurationFingerprint = fingerprint;
    run.providerHome ??= this.dataDirectory();
    const client = await this.connect(run.providerHome);
    const models = await this.models(client);
    if (!models.some(model => model.id === run.schedule.model)) throw new Error(`Model ${run.schedule.model} is unavailable for this Copilot account. Choose a model from the provider panel.`);
    const model = models.find(model => model.id === run.schedule.model);
    validateModelOptions(run.schedule, model);
    run.modelCapabilities = { capturedAt: new Date().toISOString(), id: model.id, controls: model.controls };
    const includeLegacy = snapshot?.includeDefaults !== false;
    const appTools=[...questionAttachmentTools(this,run.id),...browserTools(this.browser,run.id),...integrationTools(this.integrations,run.id),...chatControlTools(this.chatControl,run.id)];captureAppCapabilities(run,appTools,update,managed?selectedAgentToolScope(managed):null);
    const config = {
      model: run.schedule.model, streaming: true,
      ...((run.schedule.reasoningEffort || model.controls.defaultReasoningEffort) ? { reasoningEffort: run.schedule.reasoningEffort || model.controls.defaultReasoningEffort } : {}),
      ...(run.schedule.contextTier ? { contextTier: run.schedule.contextTier } : {}),
      workingDirectory: run.schedule.workspace.cwd,
      additionalDirectories,
      skillDirectories: includeLegacy ? run.schedule.skillDirectories || [] : [],
      mcpServers: managed ? { ...Object.fromEntries(Object.entries(includeLegacy ? run.schedule.mcpServers || {} : {}).filter(([name]) => !managed.disabledLegacyMcp.includes(name))), ...managed.mcpServers } : run.schedule.mcpServers || {},
      ...(managed ? { skipCustomInstructions: true, enableConfigDiscovery: false, enableOnDemandInstructionDiscovery: false, enableSkills: includeLegacy && !!run.schedule.skillDirectories?.length, disabledSkills: managed.disabledSkills, enableFileHooks: false, customAgents: managed.customAgents, agent: managed.agent, availableTools: selectedAgentToolScope(managed) } : {}),
      tools: appTools,
      systemMessage: { mode: 'append', content: `${appInstructions}\nProteus workspace roots (${managed ? 'use the explicitly selected context below; do not automatically load other instruction/skill/agent files' : 'read relevant AGENTS.md and .github/copilot-instructions.md before work'}):\n${[run.schedule.workspace.cwd, ...additionalDirectories].join('\n')}\n${this.browser ? 'Embedded browser access is available through proteus_browser. Use it for visible authenticated website reads. The user can interact with those same tabs; ask for sign-in if needed.' : 'Embedded browser access is unavailable in this server-only session.'}\nEditor context supplied by the user: ${JSON.stringify(run.schedule.editorContext || null)}\n${managed?.instructionText || ''}` },
      onPermissionRequest: permission,
      onUserInputRequest: async request => ({ answer: await askUser({ type: 'question', question: request.question, choices: request.choices }), wasFreeform: true })
    };
    const authSession = this.authSessions.get(run.id);
    if (authSession) { await authSession.disconnect(); this.authSessions.delete(run.id); }
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
    let providerError,activitySucceeded=false;
    const capture=providerActivity({provider:'copilot',emit,update});
    const activity = toolActivity({ run, emit, update });
    const unsubscribe = session.on(event => {
      capture.receive(event);
      if (event.type === 'assistant.message_delta') stream?.(event.data.messageId, event.data.deltaContent || '');
      if (event.type === 'assistant.message') {
        const content = event.data.content || run.liveMessages?.[event.data.messageId] || '';
        if (run.liveMessages) delete run.liveMessages[event.data.messageId];
        if (content.trim()) emit('assistant', content);
        else update();
      }
      activity(event);
      if (event.type === 'tool.execution_complete') for (const [key, value] of decisions) if (value.toolCallId === event.data.toolCallId) decisions.delete(key);
      if (event.type === 'session.mcp_server_status_changed') {
        const d = event.data; run.mcpConnections ??= {}; run.mcpConnections[d.serverName || d.name] = {status:d.status,observedAt:new Date().toISOString(),error:displayText(d.error || '',1000)};
        if (d.status === 'needs-auth' || d.status === 'failed') emit('system', `MCP ${d.serverName || d.name}: ${d.status}. Open MCP connections in chat details to sign in or inspect the error.`); else update();
      }
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
      await turn.run(prompt,nativeAttachments);
      if (providerError) throw new Error(providerError);
      try { run.metrics = await session.rpc.usage.getMetrics({}); update(); } catch { /* Optional runtime capability. */ }
      activitySucceeded=true;
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
      capture.finish(activitySucceeded?'completed':'interrupted');
      signal.removeEventListener('abort', abort); unsubscribe(); this.sessions.delete(run.id); await session.disconnect();
    }
  }
  async close() { this.quotaProbe?.cancel();await this.quotaPending?.catch(()=>{});if (this.client) await this.client.stop(); this.client = null; this.starting = null; this.sessions.clear(); this.authSessions.clear(); }
}
