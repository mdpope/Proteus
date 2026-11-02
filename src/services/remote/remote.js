import {validateAgentSendModelOptions} from '../chats/send-model-options.js';
import {clearQuestionFromQueue} from '../chats/user-questions.js';
import {inputOrigin} from '../chats/input-origin.js';
import {attachmentDates} from '../chats/attachment-dates.js';
import {portableWebsiteNotification} from '../telemetry/website-notification.js';
import {activeTimeProviders} from '../../../public/features/chats/chat-recovery-state.js';
import {subagentSummaries,subagentPage} from '../chats/subagents.js';
import {replyWithAttachments,answerQuestionWithAttachments,questionAttachmentMediaTypes} from '../chats/question-attachments.js';
import {countRunningChats} from '../../../public/services/remote/computer-identity.js';
import {chatPage} from '../chats/chat-control.js';
import { chatDelta } from '../chats/chat-deltas.js';
import fs from 'node:fs';
import {needsAttention} from '../../../public/features/chats/attention-state.js';
import {updateObservation} from '../updates/update-observation.js';
import {startUpdateSession} from '../updates/update-session.js';
import { toolPresentation } from '../../../public/features/chats/tool-presentation.js';
import { agentName } from '../../../public/features/chats/agent-name.js';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { WebSocket } from 'ws';
import { remoteTransportLimits } from './remote-transport.js';
import QRCode from 'qrcode';
import { atomicJSON, readJSON } from '../../shared/files.js';
import { revision } from '../scheduling/schedules.js';
import { seal, unseal, secret } from './remote-crypto.js';
import { startRelay } from '../../../relay/server.js';
import { ChatDocumentApprovals } from '../chats/chat-documents.js';
import { ChatAttachmentConsents } from '../chats/chat-attachment-consent.js';
import { chatAttachmentLimits } from '../chats/chat-attachments.js';
import { RemoteCommandJournal } from './remote-command-journal.js';
import { browserHistorySettings,historyWithSavedIcons } from '../browser/browser-history.js';
import { hostPlatformMetadata } from '../../shared/host-platform.js';

const timedSync = (diagnostics, name, fn) => diagnostics ? diagnostics.measureSync(name, fn) : fn();
import {chatMembership} from '../../../public/features/chats/chat-membership.js';
const timed = (diagnostics, name, fn) => diagnostics ? diagnostics.measure(name, fn) : fn();
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]));
const scheduleKeys = ['id', 'name', 'enabled', 'cron', 'timezone', 'provider', 'model', 'reasoningMode', 'reasoningEffort', 'contextTier', 'serviceTier', 'workspace', 'misfire', 'prompt', 'revision', 'nextRuns', 'error', 'source', 'contextSelection', 'integration', 'notifications'];
const runContext = run => ({...run.context,...run.schedule?.context});
const runWorkspace = run => chatMembership(run);
import {chatActivityAt} from '../chats/run-activity.js';
export {chatActivityAt} from '../chats/run-activity.js';
export const runSummary = r => ({lastActivityAt:chatActivityAt(r),...pick(r,['id','title','titleKind','titleRevision','trigger','chatType','status','queueReason','createdAt','updatedAt','failureReviewedAt','progress']),archivedAt:r.archivedAt||null,archived:!!r.archivedAt,failureEventAt:['failed','interrupted'].includes(r.status)?r.failureEventAt||r.updatedAt:null,unansweredQuestionCount:(r.userQuestions||[]).filter(q=>q.status==='pending').length,attentionRequired:needsAttention(r),provider:r.schedule.provider,...runWorkspace(r),scheduleName:r.trigger==='chat'?'':r.schedule.name});
const entryKeys = ['id', 'name', 'description', 'kind', 'path', 'sources', 'roots', 'mode', 'scope', 'warnings', 'unsupportedAgentFields', 'error', 'missing', 'characters', 'transport', 'integrationStatus'];
const remoteEntry = entry => ({ ...pick(entry, entryKeys), ...(entry.agent ? { userInvocable: entry.agent.userInvocable } : {}) });
const remoteProjects = service => { const value=service.workspaceProjects.get(service.engine);return {...value,sourceEntries:value.sourceEntries.map(remoteEntry)}; };
const mutationMethods = new Set(["draft.text.save",'inference.start','inference.cancel','computer.access.update','chat.retry-without-agents','projects.update','sources.update','browser.live.instruct','browser.history.record','browser.history.delete','browser.history.settings','tabs.mutate','tabs.manage','workspace.delete','chat.start', 'chat.clear-question', 'chat.answer-question', 'chat.reply', 'chat.resume', 'chat.recover', 'chat.cancel', 'chat.send', 'chat.steer-queued','chat.edit-queued','chat.remove-queued', 'chat.review', 'chat.archive', 'chat.move', 'chat.delete', 'chat.rename', 'chat.promote', 'chat.documents.request', 'chat.attachments.begin', 'chat.attachments.chunk', 'chat.attachments.finish', 'chat.attachments.authorize', 'schedule.run', 'schedule.save', 'context.update', 'context.refresh', 'context.mode', 'context.favorite', 'context.addFolders', 'chat.context', 'chat.permissions', 'mcp.login','integrations.check','integrations.recover', 'notifications.read','notifications.open', 'attention.clear', 'resources.action', 'connection.revoke']);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const ownerChatControls = (run,engine) => ({steering:typeof engine.providers[run.schedule.provider]?.steer==='function',recovery:!!engine.recovery,...(engine.recovery?{scheduledRecovery:true,activeTimeContinuationProviders:activeTimeProviders}:{}),...(engine.allowance?{allowanceContinuation:true}:{}),steeringMediaTypes:engine.providers[run.schedule.provider]?.acceptedSteeringMediaTypes||[]});
// Fusion attribution for the visible history window plus the latest turn. Each
// turn is bounded metadata (no draft/critic content); older pages bring their own.
export function fusionTurnsFor(run,events){
  const turns=Array.isArray(run.fusionTurns)?run.fusionTurns:[],ids=new Set(events.map(event=>event.data?.fusion?.fusionId).filter(Boolean));
  return turns.filter((turn,index)=>ids.has(turn.fusionId)||index===turns.length-1);
}
export function remoteRun(run, offset = 0, permissions, beforeEvent, chatControls) {
  const events=run.events;
  const end = Number.isSafeInteger(beforeEvent) && beforeEvent >= 0 ? Math.min(events.length, beforeEvent) : Math.max(0, events.length - offset); const start = Math.max(0, end - 100);
  const capturedContext=runContext(run), permissionSnapshot=permissions?.snapshot?.();
  return { fusion:run.fusion,fusionTurns:fusionTurnsFor(run,events.slice(start,end)),fusionSelection:run.fusionSelection,fusionAvailability:run.fusionAvailability,attentionRequired:needsAttention(run),subagents:[...subagentSummaries(run),...(permissions?.delegationSummaries?.(run.id)||[])],...runWorkspace(run),lastActivityAt:chatActivityAt(run),observedAt:new Date().toISOString(), ...(chatControls?{chatControls}:{}), ...(permissions ? { permissionContext: permissions.describeRun?.(run,permissionSnapshot) || permissions.describe(run.schedule,permissionSnapshot), permissionRevision: (permissionSnapshot?.value || permissions.get()).revision } : {}), agentName: agentName(run), ...pick(run, ['questionQueueCleared','userQuestions','progress','appCapabilities','turns','timingPartial','id', 'title', 'titleKind', 'titleRevision', 'trigger', 'chatType', 'status', 'queueReason', 'createdAt', 'updatedAt', 'failureReviewedAt', 'pending', 'usage', 'contextUsage', 'providerSessionId', 'nativeSessionPath', 'automaticApprovals', 'modelCapabilities', 'nextModelOptions', 'modelHistory','capacityRetry','allowanceContinuation','allowanceStatus','activeTimeContinuation']),archivedAt:run.archivedAt||null,archived:!!run.archivedAt,queuedMessages:(run.queuedMessages||[]).map(message=>({...pick(message,['id','prompt','at','modelOptions','editedAt']),hasAttachments:!!message.attachmentDispatch,canSteer:!!chatControls?.steering&&(!message.attachmentDispatch||!!events.find(e=>e.data?.delivery?.id===message.id)?.data?.attachments?.length&&events.find(e=>e.data?.delivery?.id===message.id).data.attachments.every(file=>chatControls.steeringMediaTypes?.includes(file.mediaType)))})),failureEventAt:['failed','interrupted'].includes(run.status)?run.failureEventAt||run.updatedAt:null,unansweredQuestionCount:(run.userQuestions||[]).filter(q=>q.status==='pending').length,attentionRequired:(run.userQuestions||[]).some(q=>q.status==='pending')||run.status==='awaiting_input'||(!run.archivedAt&&['failed','interrupted'].includes(run.status)&&!run.failureReviewedAt),
    events: events.slice(start, end).map(e=>e.data?.tool ? {...e,data:{...e.data,tool:{...e.data.tool,presentation:toolPresentation(e.data.tool)}}}:e), eventStart: start, eventCount: events.length, earlier: start, schedule: pick(run.schedule, scheduleKeys),
    context: { ...pick(capturedContext, ['workspaceId', 'workspaceName', 'selectedIds', 'agentId', 'includeDefaults', 'baseWorkspace', 'sourceWorkspaces', 'capturedAt']), entries: (capturedContext.entries || []).map(remoteEntry) }, liveMessages: structuredClone(run.liveMessages || {}) };
}
// Explicit projection: native clients receive allowance metadata, never adapter internals.
export function remoteUsage(value) {
  const providers = {};
  for (const id of ['copilot', 'codex', 'claude']) {
    const entry = value?.providers?.[id]; if (!entry) continue;
    providers[id] = { ...pick(entry, ['provider', 'available', 'checkedAt', 'observedAt', 'stale']),
      source: {copilot:'GitHub Copilot account allowance',codex:'Codex account allowance',claude:'Claude account allowance'}[id],
      error: entry.error ? 'Account usage could not be refreshed on this computer. Check its provider connection.' : null,
      windows: (entry.windows || []).slice(0, 20).map(window => pick(window, ['id', 'label', 'remainingPercent', 'unlimited', 'resetAt', 'reportedResetAt', 'resetSource', 'windowDurationMins', 'resetNote', 'billingNote', 'expired'])) };
  }
  return {providers};
}
export function remoteState(service) {
  return timedSync(service.performanceDiagnostics, 'remote.state', () => {
  const context = timedSync(service.performanceDiagnostics,'remote.state.context',()=>service.integrations?service.integrations.decorateCatalog(service.context.get()):service.context.get()); const defaults = service.settings.get();
  const runs = timedSync(service.performanceDiagnostics,'remote.state.runs',()=>service.engine.listRuns());
  const visibleRuns = runs.filter(run=>!run.archivedAt);
  const workspaceProjects=service.workspaceProjects?remoteProjects(service):null;
  const schedules = timedSync(service.performanceDiagnostics,'remote.state.schedules',()=>service.engine.schedules.list().map(s => pick(s, scheduleKeys)));
  return { attention:timedSync(service.performanceDiagnostics,'remote.state.attention',()=>service.attention?.()||[]),hostName: service.remote?.config.label || os.hostname(), ...hostPlatformMetadata(),
    appearance: {showProviderUsage:defaults.appearance?.showProviderUsage!==false,providerUsageCollapsed:defaults.appearance?.providerUsageCollapsed===true},
    ...(defaults.appearance?.showProviderUsage!==false?{providerUsage:remoteUsage({providers:service.usage?.providers})}:{}), schedules,
    ...(workspaceProjects?{workspaceProjects}:{}),
    runs: visibleRuns.slice(0, 100).map(run=>({...runSummary(run),...workspaceProjects?.memberships[run.id]})), runCount: visibleRuns.length, runCountIncludingArchived: runs.length,
    runningChatCount: countRunningChats(visibleRuns),
    attentionCount: visibleRuns.filter(needsAttention).length,
    context: { ...pick(context, ['revision', 'refreshedAt', 'rootStatus', 'defaultWorkspaceId', 'workspaces', 'universalFolders', 'libraryFolders', 'documents','modes','favorites', 'errors']), entries: context.entries.map(remoteEntry) },
    defaults: pick(defaults, ['provider', 'model', 'reasoningMode', 'reasoningEffort', 'contextTier', 'serviceTier', 'timezone', 'internetSearches']), providerStatus: service.catalog?.value || null, providerStatuses: Object.fromEntries(Object.entries(service.catalogs || {}).map(([id, catalog]) => [id, catalog.value])),questionAttachmentMediaTypes:Object.fromEntries(Object.keys(service.engine.providers).map(id=>[id,questionAttachmentMediaTypes.filter(type=>service.engine.providers[id]?.acceptedMediaTypes?.includes(type))])),attachmentMediaTypes:Object.fromEntries(Object.keys(service.engine.providers).map(id=>[id,service.engine.providers[id]?.acceptedMediaTypes||[]])),mcpStatusProviders:Object.keys(service.engine.providers).filter(id=>typeof service.engine.providers[id]?.mcpStatus==='function'),mcpLoginProviders:Object.keys(service.engine.providers).filter(id=>typeof service.engine.providers[id]?.mcpLogin==='function'),capabilities:[...(service.sharedInference?['inference.shared.v1']:[]),...(service.computerAccess?['computer.access.v1']:[]),...(service.projectFollow?['tabs.follow.v1']:[]),'chat.subagents.v1','chat.agent-control.v1','chat.send-model-options.v1','chat.build-coordinator.v1','chat.update-coordinator.v1','chat.update-release.v1','attention.ack.v1','chat.pages.v1','draft.text.v1','host.platform.v1',...(service.workspaceProjects?['projects.v1','projects.move.v1','source-library.v1']:[]),'chat.paths.v1','chat.export.v1','chat.previews.v1','content-tabs.v1','chat.index.v1','chat.queue-edit.v1','integrations.health.v1','chat.review.v1','chat.lifecycle.v1','chat.rename.v1','chat.retry-without-agents.v1','chat.attachments.view.v1','chat.internet.v1','workspaces.v1',...(service.engine.permissions?.preserveInheritedDefaults?['chat.permissions.shared.v1']:[]),'chat.permissions.folders.v1','chat.permissions.chat.v1','chat.permissions.pending.v1','chat.documents.v1','chat.attachments.v1','chat.question-attachments.v1','chat.questions.clear.v1','notifications.v1',...(service.openWebsiteNotification?['website.notifications.v1']:[]),'authenticated-revocation.v1','connection-self-revoke.v1',...(service.browserHistory?['browser.history.v1','browser.navigation.v1']:[]),...(service.liveBrowser?['browser.live.v1']:[]),...(service.resources?['resources.v1']:[])],protocol: 1 };
  });
}
function validateRelayURL(value) {
  const url = new URL(value);
  const local = /^(localhost|127\.0\.0\.1|\[::1\]|10\.[\d.]+|192\.168\.[\d.]+|172\.(1[6-9]|2\d|3[01])\.[\d.]+)$/.test(url.hostname) || url.hostname.endsWith('.local');
  if (!['ws:', 'wss:'].includes(url.protocol) || (url.protocol === 'ws:' && !local) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Use wss:// for an external relay, or ws:// with a local network address.');
  return url.origin;
}
export class RemoteHost {
  constructor(service) {
    this.service = service; this.file = path.join(service.home, 'remote.json');
    this.config = readJSON(this.file, { version: 1, enabled: false, mode: 'local', port: 4318, hostId: randomUUID(), relayToken: secret(), devices: [] });
    // History operation receipts use this owner even while remote access is off.
    // Persist first-run identity without enabling a listener or pairing a device.
    if(!fs.existsSync(this.file))this.save();
    this.peers = new Map(); this.journal = []; this.epoch = randomUUID(); this.sequence = 0; this.closed = false; this.status = 'disabled'; this.inflight = new Map();this.documents=new ChatDocumentApprovals({documentSource:(chatId,documentId)=>service.contentTabs.documentSource(chatId,documentId),currentRoots:run=>{const catalog=service.context.get(),id=run.schedule?.context?.workspaceId;const workspace=id?catalog.workspaces.find(item=>item.id===id):null;return workspace?[workspace.cwd,...(workspace.additionalDirectories||[]),...(workspace.universalFolders||[])]:[];}});this.attachmentConsents=new ChatAttachmentConsents(service.attachments);service.engine.attachmentConsents=this.attachmentConsents;
    this.commandJournal = new RemoteCommandJournal(service.home);
    this.runVersions=new Map();
    // Streaming text matters only to devices watching that chat, and then at a
    // readable cadence rather than per token. Other changes publish after 150 ms.
    this.changed = (run,change) => {
      const watched=run?.id&&[...this.peers.values()].some(peer=>peer.runId===run.id);
      if(watched)this.runVersions.set(run.id,(this.runVersions.get(run.id)||0)+1);
      if(change?.stream&&!watched)return;
      if (!this.changeTimer) this.changeTimer = setTimeout(() => { this.changeTimer = null; this.lastPublishAt=Date.now(); this.publish(); }, change?.stream?Math.max(150,400-(Date.now()-(this.lastPublishAt||0))):150);
    };
    service.engine.on('change', this.changed);
    this.historyChanged=()=>this.broadcast('browser.history.changed',{});service.browserHistory?.on('changed',this.historyChanged);
    this.lifecycleChanged = result => { if (result.deleted) { for (const peer of this.peers.values()) if (peer.runId === result.id) peer.runId = null; this.documents.revokeChat?.(result.id); service.contentTabs?.removeChat(result.id); this.attachmentConsents.revokeChat(result.id); void service.attachments?.revokeChat?.(result.id); } this.broadcast('chat.lifecycle', result); this.changed(); };
    service.engine.on('lifecycle', this.lifecycleChanged);
    // Also detect editor/AI changes to plain files; no filesystem secrets leave the projection.
    this.scan = setInterval(() => { if (this.config.enabled && [...this.peers.values()].some(p => p.device)) this.publish(); }, 2000);
  }
  save() { atomicJSON(this.file, this.config); fs.chmodSync(this.file, 0o600); }
  addresses() {
    return Object.values(os.networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.address)).map(i => `ws://${i.address}:${this.config.port}`);
  }
  info() { return { enabled: this.config.enabled, mode: this.config.mode, status: this.status, error: this.error || null, hostId: this.config.hostId, label: this.config.label || os.hostname(), ...hostPlatformMetadata(),...(this.service.computerAccess?{computerAccess:this.service.computerAccess.get()}:{}),
    relayURL: this.config.relayURL || '', publicURL: this.config.publicURL || '', addresses: this.addresses(), port: this.config.port,
    devices: this.config.devices.map(d => ({ id: d.id, name: d.name, pairedAt: d.pairedAt, resourceAccess: d.resourceAccess === true, documentAccess:d.documentAccess===true,browserAccess:d.browserAccess===true, online: [...this.peers.values()].some(p => p.device?.id === d.id) })),documentRequests:this.documents.list() }; }
  deviceStatus(id){const checkedAt=new Date().toISOString(),device=this.info().devices.find(device=>device.id===id);if(!device)throw new Error('Unknown paired device.');return {device:{...device,checkedAt},checkedAt};}
  async configure(value) {
    if (typeof value.enabled !== 'boolean') throw new Error('Choose whether remote access is enabled.');
    if (!['local', 'external'].includes(value.mode || this.config.mode)) throw new Error('Choose local or external relay.');
    const next = { ...this.config, enabled: value.enabled, mode: value.mode || this.config.mode };
    if (value.label !== undefined) { if (typeof value.label !== 'string' || !value.label.trim() || value.label.trim().length > 80 || /[\x00-\x1f]/.test(value.label)) throw new Error('Enter a computer name between 1 and 80 characters.'); next.label = value.label.trim(); }
    if (value.port !== undefined) { if (!Number.isInteger(value.port) || value.port < 1024 || value.port > 65535) throw new Error('Choose a port between 1024 and 65535.'); next.port = value.port; }
    if (next.mode === 'external') {
      next.relayURL = validateRelayURL(value.relayURL || next.relayURL);
      next.publicURL = validateRelayURL(value.publicURL || next.publicURL || next.relayURL);
      if (value.relayToken) { if (!/^[a-f0-9]{64}$/.test(value.relayToken)) throw new Error('Relay token must be 64 hex characters.'); next.relayToken = value.relayToken; }
    }
    await this.stop(); this.config = next; this.error = null; this.save(); if (next.enabled) await this.start(); return this.info();
  }
  async start() {
    if (!this.config.enabled || this.closed) return;
    try {
      if (this.config.mode === 'local') this.relay = await startRelay({ port: this.config.port, bind: '0.0.0.0', token: this.config.relayToken });
      this.connect();
    } catch (error) { this.status = 'error'; this.error = error.message; }
  }
  connect() {
    if (!this.config.enabled || this.closed) return;
    this.status = 'connecting';
    const base = this.config.mode === 'local' ? `ws://127.0.0.1:${this.config.port}` : this.config.relayURL;
    const ws = this.socket = new WebSocket(`${base}/socket?role=host&host=${this.config.hostId}`, { headers: { Authorization: `Bearer ${this.config.relayToken}` }, maxPayload: 8_000_000, handshakeTimeout: 8000 });
    ws.on('open', () => { if (this.socket !== ws) return;this.status='online';this.error=null;clearTimeout(this.stableConnectionTimer);this.stableConnectionTimer=setTimeout(()=>{this.reconnectAttempt=0;},30000);this.stableConnectionTimer.unref?.();const since=this.config.offlineSince;if(since){const elapsed=Math.max(0,Math.floor((Date.now()-Date.parse(since))/1000));this.service.activity?.add('device.reconnected',{hostId:this.config.hostId,offlineSeconds:elapsed});delete this.config.offlineSince;this.save();}this.service.activity?.log('info','transport.online','Connected to the relay.',{hostId:this.config.hostId}); });
    ws.on('error', error => { if (this.socket === ws) this.error = /Unexpected server response: (401|403)\b/.test(error.message) ? 'The relay rejected this computer’s registration. Check its relay registration token or whether this computer is already connected elsewhere. To connect to another computer, use that computer’s pairing code; incoming access here is not required.' : error.message; });
    ws.on('close', () => {
      if (this.socket !== ws) return;
      for(const id of this.peers.keys()){this.service.projectFollow?.removeActor(id);this.service.sharedInference?.jobs.disconnect(id);}this.peers.clear(); this.status = 'offline';this.config.offlineSince ||= new Date().toISOString();this.save();this.service.activity?.log('warning','transport.offline','Connection to the relay was interrupted.',{hostId:this.config.hostId});
      clearTimeout(this.stableConnectionTimer);
      if (!this.closed && this.config.enabled) {const delay=Math.min(30000,1000*2**Math.min(this.reconnectAttempt||0,5))*(.75+Math.random()*.5);this.reconnectAttempt=(this.reconnectAttempt||0)+1;this.reconnect = setTimeout(() => this.connect(), delay);}
    });
    ws.on('message', bytes => {
      try {
        const message = JSON.parse(bytes);
        if (message.type === 'connect') {
          const peer = { id: message.clientId, challenge: secret(), incoming: 0, outgoing: 0, joined: Date.now() };
          this.peers.set(peer.id, peer); this.raw(peer, { type: 'challenge', challenge: peer.challenge });
        } else if (message.type === 'disconnect') {this.service.projectFollow?.removeActor(message.clientId);this.service.sharedInference?.jobs.disconnect(message.clientId);this.peers.delete(message.clientId);}
        else { const peer = this.peers.get(message.clientId); if (peer) void this.receive(peer, message.packet).catch(() => { this.service.projectFollow?.removeActor(peer.id);this.peers.delete(peer.id); this.raw(peer, { type: 'rejected' }); }); }
      } catch { /* Reject malformed routing frames without taking the host down. */ }
    });
  }
  raw(peer, packet) {
    if(this.socket?.readyState!==WebSocket.OPEN)return;
    const payload=JSON.stringify({clientId:peer.id,packet}),bytes=Buffer.byteLength(payload);
    if(bytes>remoteTransportLimits.packetBytes||this.socket.bufferedAmount+bytes>remoteTransportLimits.bufferedBytes){this.socket.close(1013,'Transport is busy; reconnect and refresh.');return;}
    this.socket.send(payload);
  }
  send(peer, value) { const seq=++peer.outgoing,box=timedSync(this.service.performanceDiagnostics,'remote.send.encrypt',()=>seal(peer.device.key,value,`${peer.prefix}:host:${seq}`));return timedSync(this.service.performanceDiagnostics,'remote.send.transport',()=>this.raw(peer,{type:'data',seq,box})); }
  async pairing(publicURL,{management=false}={}) {
    if (this.status !== 'online') throw new Error('Enable remote access and wait for the relay to connect.');
    const relay = validateRelayURL(publicURL || (this.config.mode === 'external' ? this.config.publicURL : this.addresses()[0] || `ws://127.0.0.1:${this.config.port}`));
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    this.invite = { key: secret(), expiresAt,resourceAccess:management===true };
    const capsule = { version: 1, relay, label: this.config.label || os.hostname(), hostId: this.config.hostId, key: this.invite.key, expiresAt };
    const code = `proteus://pair?data=${Buffer.from(JSON.stringify(capsule)).toString('base64url')}`;
    return { code, browserURL: `https://proteus.example/remote#pair=${Buffer.from(JSON.stringify(capsule)).toString('base64url')}`, expiresAt, qr: await QRCode.toDataURL(code, { margin: 2, width: 360, errorCorrectionLevel: 'M' }) };
  }
  revoke(id) {
    this.service.sharedInference?.jobs.revoke(id);
    this.documents.revokeDevice(id);
    this.attachmentConsents.revokeDevice(id);
    void this.service.attachments.revokeDevice(id);
    this.config.devices = this.config.devices.filter(d => d.id !== id); this.save();
    for (const peer of this.peers.values()) if (peer.device?.id === id) { this.send(peer,{type:'revoked',deviceId:id});this.raw(peer, { type: 'revoked' }); this.service.projectFollow?.removeActor(peer.id);this.peers.delete(peer.id); }
    return this.info();
  }
  setResourceAccess(id, enabled) {
    if (typeof enabled !== 'boolean') throw new Error('Choose whether resource access is enabled.');
    if (!this.config.devices.some(device => device.id === id)) throw new Error('Paired device not found.');
    const previous = this.config.devices;
    this.config.devices = previous.map(device => device.id === id ? { ...device, resourceAccess: enabled } : device);
    try { this.save(); } catch (error) { this.config.devices = previous; throw error; }
    return this.info();
  }
  setBrowserAccess(id, enabled) {
    if(typeof enabled!=='boolean'||!this.config.devices.some(device=>device.id===id))throw new Error('Choose a paired device and browser viewing permission.');
    const previous=this.config.devices;this.config.devices=previous.map(device=>device.id===id?{...device,browserAccess:enabled}:device);
    try{this.save();}catch(error){this.config.devices=previous;throw error;}
    if(!enabled)this.service.liveBrowser?.clear();
    return this.info();
  }
  requireBrowserAccess(peer) {
    if(this.config.devices.find(device=>device.id===peer.device?.id)?.browserAccess!==true)throw new Error('Enable View live chat browsers for this device in Connections on the computer.');
    if(!this.service.liveBrowser)throw new Error('This host does not support live browser viewing.');
  }
  setDocumentAccess(id,enabled){
    if(typeof enabled!=='boolean')throw new Error('Choose whether document viewing is enabled.');
    if(!this.config.devices.some(device=>device.id===id))throw new Error('Paired device not found.');
    const previous=this.config.devices;this.config.devices=previous.map(device=>device.id===id?{...device,documentAccess:enabled}:device);
    try{this.save();}catch(error){this.config.devices=previous;throw error;}
    if(!enabled)this.documents.revokeDevice(id);
    return this.info();
  }
  requireDocumentAccess(peer){const device=this.config.devices.find(device=>device.id===peer.device?.id);if(device?.documentAccess!==true)throw new Error('View chat documents is not enabled for this device on the computer.');}
  reviewDocument(requestId,approved){return this.documents.review(requestId,approved,this.service.engine);}
  requireResourceAccess(peer) {
    // A connected peer may hold an older device object after a local permission change.
    const device = this.config.devices.find(device => device.id === peer.device?.id);
    if (device?.resourceAccess !== true) throw new Error('Resource access is not enabled for this device. Enable it on the host in Engine Room → Connections.');
  }
  async receive(peer, packet) {
    if (!peer.device) {
      if (Date.now() - peer.joined > 60_000) throw new Error('Authentication expired.');
      if (packet.type === 'pair') {
        if (!this.invite || Date.parse(this.invite.expiresAt) < Date.now()) throw new Error('Pairing expired.');
        const invite = this.invite; const request = unseal(invite.key, packet.box, `${peer.challenge}:pair`);
        if (typeof request.name !== 'string' || !request.name.trim() || request.name.length > 80 || this.config.devices.length >= 20) throw new Error('Invalid device.');
        const device = { id: randomUUID(), key: secret(), name: request.name.trim(), pairedAt: new Date().toISOString(), resourceAccess: invite.resourceAccess===true,documentAccess:false };
        this.invite = null; this.config.devices.push(device); this.save();this.service.activity?.add('device.added',{hostId:this.config.hostId,deviceId:device.id});
        this.raw(peer, { type: 'paired', box: seal(invite.key, device, `${peer.challenge}:paired`) }); return;
      }
      if (packet.type !== 'auth') throw new Error('Pair or authenticate first.');
      const device = this.config.devices.find(d => d.id === packet.deviceId); if (!device) throw new Error('Unknown device.');
      const value = unseal(device.key, packet.box, `${peer.challenge}:auth`);
      if (!/^[a-f0-9]{64}$/.test(value.nonce || '')) throw new Error('Invalid nonce.');
      peer.device = device; peer.prefix = `${peer.challenge}:${value.nonce}`;
      this.raw(peer, { type: 'ready', box: seal(device.key, { protocol: 1 }, `${peer.prefix}:ready`) }); return;
    }
    if (!this.config.devices.some(d => d.id === peer.device.id) || packet.type !== 'data' || packet.seq !== peer.incoming + 1) throw new Error('Invalid sequence.');
    const message = unseal(peer.device.key, packet.box, `${peer.prefix}:client:${packet.seq}`); peer.incoming = packet.seq;
    if (typeof message.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(message.id)) throw new Error('Invalid request ID.');
    try { const result = await this.command(peer, message); if (this.peers.get(peer.id) === peer) this.send(peer, { type: 'result', id: message.id, result }); }
    catch (error) { if (this.peers.get(peer.id) === peer) this.send(peer, { type: 'result', id: message.id, error: error.message, ...(error.code === 'JOURNAL_BUSY' ? {code:error.code,details:error.details} : {}) }); }
  }
  requireCommandGrants(peer, method, args) {
    if (!this.config.devices.some(device => device.id === peer.device?.id)) throw new Error('Unknown paired device.');
    if(method.startsWith('inference.')&&method!=='inference.catalog'){if(!this.service.sharedInference)throw Error('Shared inference is unavailable.');this.service.sharedInference.authorize(peer.device.id,args.providerId);}
    if (method === 'resources.list' || method === 'resources.action') this.requireResourceAccess(peer);
    if(method==='computer.access.update')this.requireResourceAccess(peer);
    if (method.startsWith('browser.live.')) this.requireBrowserAccess(peer);
    if (method === 'tabs.mutate' && (args.operations || []).some(op => op.tab?.type === 'document' || String(op.id || '').startsWith('document:') || Array.isArray(op.ids) && op.ids.some(id => String(id).startsWith('document:')))) this.requireDocumentAccess(peer);
  }
  async commandDiagnostics() { return { ...await this.commandJournal.diagnostics(), activeCommands: this.inflight.size, methods: { ...this.commandCounts } }; }
  async command(peer, message) {
    const { method, args = {} } = message;
    this.requireCommandGrants(peer, method, args);
    if(method==='inference.start'&&message.id!==args.id)throw Error('Inference start identity must match its durable command identity.');
    if (!mutationMethods.has(method)) return this.execute(peer, method, args);
    if (this.closed) throw new Error('Remote host is closing.');
    this.commandCounts ??= {}; this.commandCounts[method] = (this.commandCounts[method] || 0) + 1;
    const finish = result => {
      if (method !== 'connection.revoke') this.requireCommandGrants(peer, method, args);
      if (method === 'tabs.mutate') return { ...result, tabs: (result?.tabs || []).filter(tab => tab.type !== 'document' || this.config.devices.find(device => device.id === peer.device.id)?.documentAccess === true) };
      return result;
    };
    const key = `${peer.device.id}:${message.id}`; const digest = createHash('sha256').update(JSON.stringify(canonical([method, args]))).digest('hex');
    const active = this.inflight.get(key);
    if (active) {
      if (active.digest !== digest) throw new Error('Request ID was already used for another command.');
      return finish(await active.task);
    }
    if (this.inflight.size >= 32) throw new Error('Remote commands are busy. Retry shortly.');
    // Install the task before asynchronous lookup/claim so concurrent retries coalesce.
    const task = Promise.resolve().then(async () => {
      let claimed;
      try { claimed = await this.commandJournal.claim(key, digest, message.issuedAt); }
      catch(error) {
        if(error.code==='JOURNAL_BUSY'){
          const d=error.details||{},name=this.config.label||os.hostname();
          error.details={...d,hostId:this.config.hostId,hostName:name};
          error.message=`Remote command history is busy on ${name}: ${d.limitingCounter==='bytes'?`${d.bytes} / ${d.maxBytes} bytes`:`${d.records} / ${d.maxRecords} receipts`}; ${d.pending} unresolved. Background tab sync will retry with backoff. Recent and uncertain actions remain protected.`;
        }
        throw error;
      }
      const {previous}=claimed;
      this.requireCommandGrants(peer, method, args);
      if (previous) {
        if (previous.error) throw new Error(previous.error);
        if (previous.pending) throw new Error('The previous command outcome is uncertain. Refresh before trying a new action.');
        if (method === 'tabs.mutate') return { ...previous.result, tabs: (previous.result?.tabs || []).filter(tab => tab.type !== 'document' || this.config.devices.find(device => device.id === peer.device.id)?.documentAccess === true) };
        return previous.result;
      }
      if (this.closed) throw new Error('Remote host is closing; the command outcome is uncertain. Refresh before trying a new action.');
      let result, executionError, executionFailed = false;
      try { result = await this.execute(peer, method, args); } catch (error) { executionError = error; executionFailed = true; }
      try {
        await this.commandJournal.complete(key, digest, executionFailed ? { error: executionError?.message || String(executionError) } : { result });
      } catch (error) {
        this.service.activity?.log('error', 'remote.command-journal', 'A remote command receipt could not be saved. Its outcome is uncertain.');
        throw new Error('The command outcome is uncertain because its receipt could not be saved. Refresh before trying a new action.', { cause: error });
      }
      if (executionFailed) throw executionError;
      return result;
    }).finally(() => { this.inflight.delete(key); this.changed(); });
    this.inflight.set(key, { digest, task }); return finish(await task);
  }

  async api(route, value) {
    const response = await fetch(this.service.origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.service.token}` }, body: JSON.stringify(value), signal: AbortSignal.timeout(60_000) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Host request failed.'); return data;
  }
  async execute(peer, method, args) {
    if(!args.agentControl&&['chat.start','chat.send','chat.reply','chat.answer-question','chat.resume'].includes(method))args={...args,inputOrigin:inputOrigin(args.inputOrigin,{hostId:this.config.hostId,deviceId:peer.device.id,client:args.inputOrigin?.client==='mobile'?'mobile':args.inputOrigin?.client==='website'?'website':'remote-desktop'})};
    if(method.startsWith('inference.')){if(!this.service.sharedInference)throw Error('Shared inference is unavailable.');return this.service.sharedInference.handle(peer,method,args);}
    const engine = this.service.engine;
    if(method==='computer.access.get')return this.service.computerAccess.get();
    if(method==='computer.access.update'){this.requireResourceAccess(peer);return this.service.computerAccess.set(args);}
    if(method.startsWith('browser.history.')){
      const history=this.service.browserHistory;if(!history)throw new Error('Browser history is unavailable on this computer.');
      const action=method.slice('browser.history.'.length);
      if(action==='suggest')return historyWithSavedIcons(this.service,await history.suggest(args),args);
      if(action==='query')return historyWithSavedIcons(this.service,await history.query(args),args);
      if(action==='record')return history.record(args);
      if(action==='delete')return history.delete(args);
      if(action==='status')return history.status();
      if(action==='sync')return history.sync(args);
      if(action==='settings'){
        return browserHistorySettings(this.service,args);
      }
      throw new Error('Unsupported history command.');
    }
    if(method.startsWith('browser.live.')){
      this.requireBrowserAccess(peer);engine.getRun(args.id);
      const live=this.service.liveBrowser;
      if(method==='browser.live.list')return {tabs:live.list(args.id)};
      if(method==='browser.live.frame'){const frame=await live.frame(args.id,args.tabId);this.requireBrowserAccess(peer);peer.liveFrames??=new Set();peer.liveFrames.add(frame.id);while(peer.liveFrames.size>40)peer.liveFrames.delete(peer.liveFrames.values().next().value);const {key,at,...result}=frame;return result;}
      if(method==='browser.live.instruct'){
        if(!peer.liveFrames?.has(args.frameId))throw new Error('View this browser frame before referring to it.');
        if(typeof args.text!=='string'||!args.text.trim()||args.text.length>100000)throw new Error('Enter an instruction.');
        const prompt=args.text+live.reference(args.id,args.frameId,args.point);this.requireBrowserAccess(peer);
        if(args.mode==='answer'){const run=engine.getRun(args.id);if(run.pending?.type!=='question')throw new Error('There is no pending question to answer.');await this.api(`/api/runs/${args.id}/reply`,{requestId:args.requestId,answer:prompt});}
        else {if(!['queue','steer'].includes(args.mode))throw new Error('Choose Queue, Steer or Answer.');await this.api(`/api/runs/${args.id}/send`,{prompt,mode:args.mode,messageId:args.messageId});}
        return {runId:args.id};
      }
      throw new Error('Unsupported live browser command.');
    }

    if (method === 'sync') {
      return timed(this.service.performanceDiagnostics, 'remote.sync', () => {
      const index = this.journal.findIndex(event => event.cursor === args.cursor);
      if (index >= 0) for (const event of this.journal.slice(index + 1)) if (!event.runId || event.runId === peer.runId) this.send(peer, event);
      return { state: remoteState(this.service), cursor: `${this.epoch}:${this.sequence}` };
      });
    }
    if (method === 'runs.page') return chatPage(this.service,args);
    if (method === 'runs.list') { const offset = Math.max(0, Math.floor(Number(args.offset) || 0)),projectCatalog=this.service.workspaceProjects?.read(); return engine.visibleRuns(args.includeArchived===true).slice(offset, offset + 100).map(run=>({...runSummary(run),...this.service.workspaceProjects?.membership(run,projectCatalog)})); }
    if(method==='connection.revoke'){if(args.deviceId&&args.deviceId!==peer.device.id)throw new Error('Only this connection can be revoked here.');this.revoke(peer.device.id);return {ok:true};}
    if(method==='attention.snapshot')return this.service.attentionStore.snapshot();
    if(method==='attention.clear')return this.service.attentionStore.clearLocal(args.snapshot);
    if(method==='notifications.list'){const result=this.service.activity?.notifications()||{items:[],preferences:{}};return {...result,items:result.items.filter(item=>item.type!=='website.notification'||result.preferences.forwardWebsiteNotifications===true).map(item=>item.type==='website.notification'?portableWebsiteNotification(item):item)};}
    if(method==='notifications.open'){if(!this.service.openWebsiteNotification)throw Error('Website notification activation is unavailable on this host.');return this.service.openWebsiteNotification(args.id);}
    if(method==='notifications.read'){const result=this.service.activity.read(args.id);this.service.notify();this.changed();return result;}
    if(method==='logs.list')return this.service.activity?.logs(args)||{items:[]};
    if(method==='logs.get')return this.service.activity.logDetail(args.id);
    if (method === 'resources.list' || method === 'resources.action') {
      this.requireResourceAccess(peer);
      if (method === 'resources.action' && !this.service.resources) throw new Error('Resource controls are unavailable.');
      const result = this.service.resources ? await (method === 'resources.list' ? this.service.resources.list() : this.service.resources.action(args)) : {supported:false,processes:[],tabs:[],observedAt:new Date().toISOString()};
      this.requireResourceAccess(peer);
      return result;
    }
    if(method==='workspace.delete'){this.requireResourceAccess(peer);return this.service.tabManagement.handle({action:'delete-workspace',...args});}
    if(method==='tabs.list'||method==='tabs.manage'){if(method==='tabs.manage')this.requireResourceAccess(peer);const result=await this.service.tabManagement.handle(method==='tabs.list'?{...args,action:'list'}:args);return result;}
    if(method==='tabs.follow'){
      if((args.state?.tabId?.startsWith('document:')||args.state?.childTabId?.startsWith('document:')))this.requireDocumentAccess(peer);
      const result=this.service.projectFollow.handle(args,peer.id);
      if((result.state?.tabId?.startsWith('document:')||result.state?.childTabId?.startsWith('document:'))&&!this.config.devices.find(device=>device.id===peer.device.id)?.documentAccess)return {...result,state:null};
      return result;
    }
    if(method==='tabs.get'||method==='tabs.mutate'||method==='tabs.history'){
      if(args.scope==='project'){const snapshot=this.service.workspaceProjects.snapshot();this.service.workspaceProjects.projectFor({projectId:args.id},snapshot);for(const op of args.operations||[])if(op.action==='open'&&op.tab?.type==='chat'&&this.service.workspaceProjects.membership(engine.getRun(op.tab.chatId),snapshot.catalog).projectId!==args.id)throw new Error('This chat belongs to another project.');}
      if(args.scope==='chat')engine.getRun(args.id);
      if(args.scope==='workspace'){this.service.context.scope(args.id);for(const op of args.operations||[])if(op.action==='open'&&op.tab?.type==='chat'&&chatMembership(engine.getRun(op.tab.chatId)).workspaceId!==args.id)throw new Error('This chat belongs to another workspace.');}
      if(method==='tabs.history')return this.service.contentTabs.history(args);
      const canDocuments=this.config.devices.find(device=>device.id===peer.device.id)?.documentAccess===true;
      let result;
      if(method==='tabs.mutate'){
        let value=args;
        // A browser-only client reorders its visible subset while hidden document slots stay local to the host.
        if(!canDocuments&&Array.isArray(args.operations)){
          let projected=this.service.contentTabs.get(args.scope,args.id).tabs;
          const operations=args.operations.map(operation=>{
            if(operation.action==='open'){const existing=projected.findIndex(tab=>tab.id===operation.tab?.id);if(existing<0)projected.push(operation.tab);else projected[existing]=operation.tab;}
            else if(operation.action==='close')projected=projected.filter(tab=>tab.id!==operation.id);
            else if(operation.action==='reorder'){
              const visible=projected.filter(tab=>tab.type!=='document');
              if(!Array.isArray(operation.ids)||new Set(operation.ids).size!==visible.length||operation.ids.length!==visible.length||operation.ids.some(id=>!visible.some(tab=>tab.id===id)))throw new Error('Reorder must contain each visible browser tab exactly once.');
              const ordered=operation.ids.map(id=>visible.find(tab=>tab.id===id));let index=0;projected=projected.map(tab=>tab.type!=='document'?ordered[index++]:tab);
              return {...operation,ids:projected.map(tab=>tab.id)};
            }
            return operation;
          });value={...args,operations};
        }
        if((value.operations||[]).some(op=>op.action==='close'&&this.service.contentTabs.get(value.scope,value.id).tabs.some(tab=>tab.id===op.id&&tab.type==='terminal')))this.requireResourceAccess(peer);
        result=await this.service.mutateContentTabs(value);
      }else result=await this.service.contentTabs.getAsync(args.scope,args.id,{historyLimit:args.historyLimit});
      return {...result,tabs:result.tabs.filter(tab=>tab.type!=='document'||canDocuments)};
    }
    if (method === 'chat.get') { const run = engine.getRun(args.id); if(args.agentId)return run.subagents?.some(row=>row.id===args.agentId)?subagentPage(run,args.agentId,args.beforeEvent):engine.delegation.page(run.id,args.agentId,args.beforeEvent); if(args.watch!=='none'){peer.runId = run.id;peer.summaryOnly=args.watch==='summary';} const view={...remoteRun(run, Math.max(0, Math.floor(Number(args.offset) || 0)), engine.permissions, args.beforeEvent,ownerChatControls(run,engine)),...this.service.workspaceProjects?.membership(run),...(run.schedule.purpose==='update'?{update:updateObservation(this.service,run)}:{})};return args.historyCursor?chatDelta(run,view,args.historyCursor):{...view,...(!args.offset&&args.beforeEvent===undefined?chatDelta(run,view):{})}; }
    if(method==='chat.previews.list'||method==='chat.previews.read'){
      this.requireDocumentAccess(peer);const run=engine.getRun(args.id);
      const result=await(method.endsWith('.list')?this.service.previews.list(run):this.service.previews.read(run,args.documentId));
      this.requireDocumentAccess(peer);return result;
    }
    if(method==='chat.paths'){const run=engine.getRun(args.id);return (await import('../tools/transcripts.js')).storagePaths(this.service.home,run);}
    if(method==='chat.export'){
      const run=engine.getRun(args.id),format=args.format;if(!['markdown','json'].includes(format))throw Error('Choose Markdown or JSON.');
      const {exportTranscript}=await import('../tools/transcripts.js'),{file}=exportTranscript(this.service.home,run,format);
      if(fs.statSync(file).size>4*1024*1024)throw Error('Export exceeds 4 MiB.');
      return {name:run.id+(format==='json'?'.json':'.md'),content:fs.readFileSync(file,'utf8'),mediaType:format==='json'?'application/json':'text/markdown'};
    }
    if (method === 'chat.promote') return engine.promoteChat(args.id,args.expectedUpdatedAt);
    if (method === 'chat.rename') return this.api('/api/chat-title', pick(args, ['id', 'title', 'expectedTitleRevision']));
    if (method === 'chat.move') { const result=await this.api('/api/chat-workspace',pick(args,['id','workspaceId','projectId','expectedUpdatedAt','expectedRevision']));return result?.memberships&&Array.isArray(result.projects)?remoteProjects(this.service):result; }
    if (method === 'chat.review') return engine.reviewFailure(args.id,args.expectedFailureEventAt);
    if (method === 'chat.archive') {if(typeof args.archived!=='boolean')throw new Error('Choose Archive or Unarchive.');return engine.lifecycle(args.id,args.archived?'archive':'unarchive',pick(args,['expectedUpdatedAt','expectedArchivedAt']));}
    if (method === 'chat.delete') return engine.lifecycle(args.id,'delete',pick(args,['expectedUpdatedAt','expectedArchivedAt']));
    if (method === 'chat.documents.request') {const device=this.config.devices.find(item=>item.id===peer.device.id);if(!device)throw new Error('Device is no longer paired.');const result=this.documents.request(engine.getRun(args.id),device,args.source,args.documentId,args.fromRequestId,args.relativePath,{direct:device.documentAccess===true});if(result.status==='pending'){this.service.activity?.add('review.required',{chatId:args.id});this.service.notify?.();}return result;}
    if (method === 'chat.documents.status') {return this.documents.status(args.requestId,peer.device.id);}
    if (method === 'chat.documents.read') {return this.documents.read(args.requestId,peer.device.id,engine);}
    if (method === 'chat.documents.asset') {return this.documents.asset(args.requestId,args.assetId,peer.device.id,engine);}
    if (method === 'chat.attachments.begin') {
      const run=args.id?engine.getRun(args.id):null,providerId=run?.schedule.provider||args.providerId,accepted=engine.providers[providerId]?.acceptedMediaTypes||[];
      if(!engine.providers[providerId]?.acceptedMediaTypes)throw new Error(`${providerId} cannot receive ${args.mediaType} attachments. Choose a supported file type or provider.`);
      if(args.providerId!==undefined&&args.providerId!==providerId)throw new Error('The chat provider changed. Choose the attachment again.');
      if(!run&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(args.draftId||''))throw new Error('Choose a chat or a valid first-message draft.');
      return this.service.attachments.begin({chatId:run?.id||'draft:'+args.draftId,deviceId:peer.device.id,messageId:args.messageId,providerId,name:args.name,mediaType:args.mediaType,size:args.size,sha256:args.sha256,...attachmentDates(args)});
    }
    if (method === 'chat.attachments.chunk') return this.service.attachments.chunk({uploadId:args.uploadId,deviceId:peer.device.id,index:args.index,dataBase64:args.dataBase64});
    if (method === 'chat.attachments.finish') return this.service.attachments.finish({uploadId:args.uploadId,deviceId:peer.device.id});
    if (method === 'chat.attachments.authorize') {
      const run=args.id?engine.getRun(args.id):null,providerId=run?.schedule.provider||args.providerId;
      if(run&&args.providerId!==providerId)throw new Error('The chat provider changed. Review the files and destination again.');
      return this.attachmentConsents.authorize({...(run?{chatId:run.id}:{draftId:args.draftId}),deviceId:peer.device.id,messageId:args.messageId,providerId,attachments:args.attachments,acceptedMediaTypes:engine.providers[providerId]?.acceptedMediaTypes||[]});
    }
    if (method === 'chat.image') return this.api('/api/chat-image', pick(args, ['id', 'source']));
    if(method==='integrations.list')return this.service.integrations.snapshot();
    if(method==='integrations.check'||method==='integrations.recover')return this.service.integrations.check(args.id,{recover:method==='integrations.recover'});
    if (method === 'mcp.status' || method === 'mcp.login') return this.api('/api/mcp', {runId:args.id,action:method === 'mcp.login' ? 'login' : 'status',server:args.server,openOnMac:method === 'mcp.login'});
    if (method === 'provider.usage') {
      if (this.service.settings.get().appearance?.showProviderUsage === false) return {enabled:false,providers:{}};
      const value = await this.service.usage.get(args.force === true);
      if (this.service.settings.get().appearance?.showProviderUsage === false) return {enabled:false,providers:{}};
      this.changed(); return {enabled:true,...remoteUsage(value)};
    }
    if (method === 'provider.status') return this.api('/api/provider', pick(args, ['force', 'provider']));
    if (method === 'projects.get'||method === 'sources.get') return remoteProjects(this.service);
    if (method === 'projects.update'||method === 'sources.update') { await this.api('/api/workspace-projects/'+(method==='projects.update'?'projects':'sources'),args);this.changed();return remoteProjects(this.service); }
    if (method === 'context.get') {const catalog=this.service.context.get(args.workspaceId);return this.service.integrations?.decorateCatalog(catalog)||catalog;}
    if (method === 'context.update') { const result = await this.api('/api/context', args); this.changed(); return result; }
    if (method === 'context.refresh') { const result = await this.service.context.refreshAsync({workspaceId:args.workspaceId,root:args.root}); this.changed(); return result; }
    if (method === 'schedule.preview') return this.api('/api/preview', pick(args, ['cron', 'timezone']));
    if(method==='updates.releases'){
      if(!this.service.updates)throw Error('Updates are unavailable on this computer.');
      const identity=this.service.updates.identity();return {identity:pick(identity,['platform','arch','packaged','buildRevision']),...await this.service.updates.releases(args.channel||'stable')};
    }
    if (method === 'chat.start') {
      if(args.updateRelease!==undefined){
        if(args.purpose!=='update'||args.projectId||args.workspaceId||args.commandFolder||args.attachments?.length)throw Error('A pinned update requires an unassigned coordinator without attachments.');
        const selection=args.updateRelease;
        if(!selection||typeof selection!=='object'||Array.isArray(selection)||Object.keys(selection).some(key=>!['releaseId','manifestDigest','channel'].includes(key))||typeof selection.releaseId!=='string'||!selection.releaseId||!/^[a-f0-9]{64}$/.test(selection.manifestDigest||'')||selection.channel!==undefined&&!['stable','preview'].includes(selection.channel))throw Error('Choose an exact published release and manifest digest.');
        const run=await startUpdateSession(this.service,{...selection,operationId:args.operationId,instructions:args.prompt});peer.runId=run.id;return {runId:run.id};
      }
      const startArgs=pick(args,['purpose','chatType','name','prompt','inputOrigin','provider','model','reasoningEffort','contextTier','serviceTier','workspaceId','projectId','selectedIds','agentId','includeDefaults','setupId','setupScope','setupScopeId']);
      const project=startArgs.purpose==='update'?null:this.service.workspaceProjects?.projectFor(startArgs);if(project&&(args.projectId||args.workspaceId))startArgs.workspaceId=project.workspaceId;
      if(args.commandFolder){
        const catalog=this.service.context.get(),profile=catalog.workspaces.find(w=>w.id===(startArgs.workspaceId||catalog.defaultWorkspaceId));
        if(!profile)throw new Error('Choose a configured workspace.');
        const cwd=fs.realpathSync(args.commandFolder);
        if(!fs.statSync(cwd).isDirectory())throw new Error('Choose an existing starting folder on this computer.');
        // Only the selected folder must resolve here. Preserve unavailable siblings so
        // context capture can explain their omission without changing saved configuration.
        const roots=[profile.cwd,...profile.additionalDirectories].map(root=>{let canonical=null;try{canonical=fs.realpathSync(root);}catch{}return {root,canonical};});
        if(!roots.some(root=>root.canonical===cwd))throw new Error('Choose a configured starting folder on this computer.');
        startArgs.workspace={cwd,additionalDirectories:roots.filter(root=>root.canonical!==cwd).map(root=>root.root)};
      }
      const files=Array.isArray(args.attachments)?args.attachments:[];
      if(!files.length){const run=await this.api('/api/chat',startArgs);peer.runId=run.id;return {runId:run.id};}
      const started = await this.service.startSharedSetup(startArgs, async () => {
      if(!args.consentId||!args.draftId||!args.messageId||files.length>chatAttachmentLimits.maxBatchFiles||args.providerId!==args.provider)throw new Error('Review the exact first-message files and named provider before sending.');
      const schedule=await this.service.buildChatSchedule(startArgs,{attachmentOnly:files.length>0});
      await this.attachmentConsents.verify({consentId:args.consentId,draftId:args.draftId,messageId:args.messageId,providerId:schedule.provider,deviceId:peer.device.id,attachmentIds:files});
      const run=engine.createRun(schedule,'chat',null,{deferStart:true,attachmentOnly:!schedule.prompt.trim(),inputOrigin:args.inputOrigin,setupId:args.setupId});if(project)this.service.workspaceProjects.associate(run,project,engine);let prepared;
      try{prepared=await this.attachmentConsents.prepareSend({consentId:args.consentId,draftId:args.draftId,chatId:run.id,messageId:args.messageId,providerId:schedule.provider,deviceId:peer.device.id,attachmentIds:files});engine.startDeferredRun(run.id,{proofId:prepared.proofId,attachmentIds:files,messageId:args.messageId});return run;}
      catch(error){if(prepared)await this.attachmentConsents.releaseProof(prepared.proofId).catch(()=>{});engine.discardDeferredRun(run.id);throw error;}
      });peer.runId=started.id;return {runId:started.id};
    }
    if (method === 'schedule.run') { const run = await this.api('/api/run', { id: args.id }); peer.runId = run.id; return { runId: run.id }; }
    if (method==='chat.send'&&Array.isArray(args.attachments)&&args.attachments.length){
      const run=engine.getRun(args.id),files=args.attachments;
      if(args.messageId&&run.events.some(event=>event.data?.delivery?.id===args.messageId))return {runId:run.id};
      if(files.length>chatAttachmentLimits.maxBatchFiles||args.providerId!==run.schedule.provider||!args.consentId||!args.messageId)throw new Error('Review the exact files and named provider before sending.');
      const prepared=await this.attachmentConsents.prepareSend({consentId:args.consentId,chatId:run.id,messageId:args.messageId,providerId:run.schedule.provider,deviceId:peer.device.id,attachmentIds:files});
      try{await engine.send(run.id,args.prompt,args.mode||'queue',args.messageId,args.modelOptions,{proofId:prepared.proofId,attachmentIds:files},undefined,args.inputOrigin);await this.service.sharedDrafts.clearSent({kind:'reply',id:run.id},args.prompt).catch(()=>{});peer.runId=run.id;return {runId:run.id};}
      catch(error){await this.attachmentConsents.releaseProof(prepared.proofId).catch(()=>{});throw error;}
    }
    if(['draft.text.get','draft.text.save'].includes(method)){if(args.agentControl)throw Error('Draft text belongs to the human composer.');return method==='draft.text.save'?this.service.sharedDrafts.save(args):this.service.sharedDrafts.get(args);}
    if(method==='chat.clear-question'){if(args.agentControl)throw Error('Question queue review requires the human chat interface.');clearQuestionFromQueue(engine,args.id,args.questionId);return {runId:args.id};}
    if(method==='chat.answer-question'){if(args.agentControl)throw Error('Interactive question answers require the human chat interface.');await answerQuestionWithAttachments(engine,args.id,args,peer.device.id);return {runId:args.id};}
    if(method==='chat.reply'&&args.attachments?.length){if(args.agentControl)throw Error('Agent replies cannot supply user attachments.');return replyWithAttachments(engine,args.id,args,peer.device.id);}
    if (['chat.reply', 'chat.resume', 'chat.recover', 'chat.cancel', 'chat.send', 'chat.steer-queued','chat.edit-queued','chat.remove-queued'].includes(method)) {
      if(args.agentControl){const captured=engine.getRun(args.id),provider=captured.schedule.provider;
        const checkProject=()=>{const projectId=this.service.workspaceProjects?.membership(captured)?.projectId||null;if(Object.hasOwn(args,'expectedProjectId')&&args.expectedProjectId!==projectId)throw new Error('Destination project changed. Refresh the task scope.');};
        checkProject();
        const modelOptions=method==='chat.send'?await validateAgentSendModelOptions(this.service,captured,args):undefined;
        if(engine.getRun(args.id)!==captured||captured.schedule.provider!==provider)throw Error('The captured run changed during model preflight. Refresh before sending.');
        checkProject();const run=captured;
        if(method==='chat.reply'&&(run.pending?.type!=='question'||run.pending.id!==args.requestId))throw new Error('Agent replies can answer only the current ordinary question.');
        // Call the synchronous owner boundary directly so placement cannot change between validation and effect.
        if(method==='chat.reply')engine.reply(args.id,args.answer,args.requestId);
        else if(method==='chat.cancel')engine.cancel(args.id);
        else if(method==='chat.send')await engine.send(args.id,args.prompt,args.mode,args.messageId,modelOptions);
        else throw new Error('Unsupported agent mutation.');
        return {runId:args.id};
      }
      engine.getRun(args.id); const action = method.split('.')[1];
      await this.api(`/api/runs/${args.id}/${action}`, pick(args, ['answer', 'requestId', 'prompt', 'mode', 'messageId', 'modelOptions', 'expectedPrompt','action','enabled','expectedPreferenceVersion','expectedUpdatedAt','expectedFailureEventAt','inputOrigin'])); return { runId: args.id };
    }
    if (method === 'chat.permissions') {
      await this.api('/api/permissions', { action: ['grant-chat-folder','revoke-chat-folder','revoke-chat-rule','set-chat-read-only'].includes(args.action) ? args.action : args.scope === 'chat' ? 'set-chat-mode' : 'set-mode', runId: args.id, ...pick(args, ['mode','folder','access','ruleId','enabled', 'expectedContextId', 'expectedRevision', 'expectedChatRevision', 'expectedRequestId']) });
      this.changed(); return remoteRun(engine.getRun(args.id), 0, engine.permissions,undefined,ownerChatControls(engine.getRun(args.id),engine));
    }
    // Read-only, bounded chunks of a file a message in this chat references.
    if (method === 'chat.attachments.get') {
      const file = this.service.readChatAttachment(args.id, args.sha256), offset = Math.max(0, Math.min(file.bytes.length, Number.isSafeInteger(args.offset) ? args.offset : 0)), end = Math.min(file.bytes.length, offset + 384 * 1024);
      return { name: file.name, mediaType: file.mediaType, size: file.bytes.length, ...attachmentDates(file), offset, dataBase64: file.bytes.subarray(offset, end).toString('base64'), done: end >= file.bytes.length };
    }
    if (method === 'chat.retry-without-agents') { await this.api('/api/chat-recovery/without-agents', { runId: args.id, expectedFailureEventAt: args.expectedFailureEventAt }); return { runId: args.id }; }
    if (method === 'chat.context') { await this.api('/api/run-context', { runId: args.id, ...pick(args, ['selectedIds', 'agentId', 'includeDefaults']) }); return { runId: args.id }; }
    if (method === 'context.preview') return this.api('/api/context/preview', pick(args, ['workspace', 'workspaceId', 'selectedIds', 'agentId', 'includeDefaults']));
    if (method === 'context.favorite') { await this.api('/api/context', { action: 'favorite', ...pick(args, ['id', 'enabled', 'workspaceId','expectedRevision']) }); return { ok: true }; }
    if (method === 'context.mode') { await this.api('/api/context', { action: 'mode', ...pick(args, ['id', 'mode', 'workspaceId','expectedRevision']) }); return { ok: true }; }
    if (method === 'context.addFolders') { await this.api('/api/context', { action: 'add-folders', ...pick(args, ['workspaceId', 'folders', 'expectedRevision']) }); return { ok: true }; }
    if (method === 'schedule.save') {
      const original = engine.schedules.get(args.id);
      if (original.source?.manifest) throw new Error('This schedule is repository-owned. Update its source manifest and reconcile it on the owning computer.');
      if (revision(original) !== args.expectedRevision) throw new Error('Schedule changed. Refresh before saving.');
      await this.api('/api/schedules', { schedule: { ...original, ...pick(args.changes, ['name', 'enabled', 'cron', 'timezone', 'provider', 'model', 'reasoningMode', 'reasoningEffort', 'contextTier', 'serviceTier', 'prompt', 'misfire', 'contextSelection', 'notifications']) }, expectedRevision: args.expectedRevision }); return { ok: true };
    }
    throw new Error('Unsupported remote command.');
  }
  publish() {
    if (!this.config.enabled) return;
    return timedSync(this.service.performanceDiagnostics, 'remote.publish', () => {
    const state = remoteState(this.service); const signature = timedSync(this.service.performanceDiagnostics, 'remote.publish.serialize', () => JSON.stringify(state));
    if (signature !== this.signature) { this.signature = signature; this.broadcast('state', state); }
    const watched = new Set([...this.peers.values()].filter(p => p.device).map(p => p.runId).filter(Boolean));
    for(const id of this.runSignatures?.keys()||[])if(!watched.has(id)){this.runSignatures.delete(id);this.runVersions?.delete(id);}
    for (const id of watched) {
      if (!this.service.engine.runs.has(id)) continue;
      const summaryOnly=[...this.peers.values()].filter(peer=>peer.device&&peer.runId===id).every(peer=>peer.summaryOnly);
      if(summaryOnly){const source=this.service.engine.getRun(id),summary={...runSummary(source),version:this.runVersions?.get(id)||0},hash=JSON.stringify(summary);if(this.runSignatures?.get(id)===hash)continue;this.runSignatures??=new Map();this.runSignatures.set(id,hash);this.broadcast('run.changed',summary,id);continue;}
      const run = timedSync(this.service.performanceDiagnostics, 'remote.run.assemble', () => ({...remoteRun(this.service.engine.getRun(id), 0, this.service.engine.permissions,undefined,ownerChatControls(this.service.engine.getRun(id),this.service.engine)),...this.service.workspaceProjects?.membership(this.service.engine.getRun(id))})); const hash = timedSync(this.service.performanceDiagnostics, 'remote.run.serialize', () => createHash('sha256').update(JSON.stringify({...run,observedAt:undefined})).digest('hex'));
      if (this.runSignatures?.get(id) === hash) continue;
      this.runSignatures ??= new Map(); this.runSignatures.set(id, hash);this.broadcast('run',run,id);
    }
    });
  }
  broadcastFollow(data) {
    // Presentation events are replaceable, scoped, and excluded from durable replay.
    for(const peer of this.peers.values())if(peer.device&&this.service.projectFollow.subscribed(peer.id,data)){
      if((data.state?.tabId?.startsWith('document:')||data.state?.childTabId?.startsWith('document:'))&&!this.config.devices.find(device=>device.id===peer.device.id)?.documentAccess)continue;
      this.send(peer,{type:'event',event:'project-follow',data});
    }
  }
  broadcast(event, data, runId) {
    const value = { type: 'event', event, data, ...(runId ? { runId } : {}), cursor: `${this.epoch}:${++this.sequence}` };
    const bytes=Buffer.byteLength(JSON.stringify(value));this.journalBytes=(this.journalBytes||0)+bytes;
    this.journal.push(value);(this.journalSizes??=[]).push(bytes);
    while(this.journal.length>100||this.journalBytes>8_000_000){this.journal.shift();this.journalBytes-=this.journalSizes.shift();}
    for (const peer of this.peers.values()) if (peer.device && (!runId || peer.runId === runId)) this.send(peer, value);
  }
  async stop() {
    clearTimeout(this.reconnect);clearTimeout(this.stableConnectionTimer); this.invite = null;this.documents.clear();
    const socket = this.socket; this.socket = null; socket?.terminate(); for(const id of this.peers.keys()){this.service.projectFollow?.removeActor(id);this.service.sharedInference?.jobs.disconnect(id);}this.peers.clear();
    if (this.relay) { await this.relay.close(); this.relay = null; }
    this.status = 'disabled';
  }
  async close() { this.closed = true; clearInterval(this.scan); clearTimeout(this.changeTimer); this.service.engine.off('change', this.changed); this.service.engine.off('lifecycle',this.lifecycleChanged); this.service.browserHistory?.off('changed',this.historyChanged); await this.stop(); await Promise.allSettled([...this.inflight.values()].map(entry => entry.task)); clearTimeout(this.changeTimer); await this.commandJournal.close(); }
}
