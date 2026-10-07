import fs from 'node:fs';
import { toolPresentation } from '../public/tool-presentation.js';
import { agentName } from '../public/agent-name.js';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { WebSocket } from 'ws';
import QRCode from 'qrcode';
import { atomicJSON, readJSON } from './files.js';
import { revision } from './schedules.js';
import { seal, unseal, secret } from './remote-crypto.js';
import { startRelay } from '../relay/server.js';
import { ChatDocumentApprovals } from './chat-documents.js';
import { ChatAttachmentConsents } from './chat-attachment-consent.js';
import { chatAttachmentLimits } from './chat-attachments.js';

const pick = (value, keys) => Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]));
const scheduleKeys = ['id', 'name', 'enabled', 'cron', 'timezone', 'provider', 'model', 'reasoningEffort', 'contextTier', 'serviceTier', 'workspace', 'misfire', 'prompt', 'revision', 'nextRuns', 'error', 'source', 'contextSelection', 'integration', 'notifications'];
export const runSummary = r => ({...pick(r,['id','title','titleKind','titleRevision','status','createdAt','updatedAt','failureReviewedAt']),archivedAt:r.archivedAt||null,archived:!!r.archivedAt,failureEventAt:['failed','interrupted'].includes(r.status)?r.failureEventAt||r.updatedAt:null,attentionRequired:r.status==='awaiting_input'||(!r.archivedAt&&['failed','interrupted'].includes(r.status)&&!r.failureReviewedAt),provider:r.schedule.provider,workspaceName:r.schedule.context?.workspaceId||'',scheduleName:r.trigger==='chat'?'':r.schedule.name});
const entryKeys = ['id', 'name', 'description', 'kind', 'path', 'sources', 'roots', 'mode', 'scope', 'warnings', 'unsupportedAgentFields', 'error', 'missing', 'characters'];
const remoteEntry = entry => ({ ...pick(entry, entryKeys), ...(entry.agent ? { userInvocable: entry.agent.userInvocable } : {}) });
const mutationMethods = new Set(['tabs.mutate','chat.start', 'chat.reply', 'chat.resume', 'chat.cancel', 'chat.send', 'chat.remove-queued', 'chat.review', 'chat.archive', 'chat.delete', 'chat.rename', 'chat.documents.request', 'chat.attachments.begin', 'chat.attachments.chunk', 'chat.attachments.finish', 'chat.attachments.authorize', 'schedule.run', 'schedule.save', 'context.mode', 'context.favorite', 'context.addFolders', 'chat.context', 'chat.permissions', 'mcp.login', 'notifications.read', 'resources.action', 'connection.revoke']);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export function remoteRun(run, offset = 0, permissions, beforeEvent) {
  const end = Number.isSafeInteger(beforeEvent) && beforeEvent >= 0 ? Math.min(run.events.length, beforeEvent) : Math.max(0, run.events.length - offset); const start = Math.max(0, end - 100);
  return { ...(permissions ? { permissionContext: permissions.describeRun?.(run) || permissions.describe(run.schedule), permissionRevision: permissions.get().revision } : {}), agentName: agentName(run), ...pick(run, ['id', 'title', 'titleKind', 'titleRevision', 'trigger', 'status', 'createdAt', 'updatedAt', 'failureReviewedAt', 'pending', 'usage', 'contextUsage', 'providerSessionId', 'nativeSessionPath', 'automaticApprovals', 'modelCapabilities', 'nextModelOptions', 'modelHistory']),archivedAt:run.archivedAt||null,archived:!!run.archivedAt,queuedMessages:(run.queuedMessages||[]).map(message=>pick(message,['id','prompt','at','modelOptions'])),failureEventAt:['failed','interrupted'].includes(run.status)?run.failureEventAt||run.updatedAt:null,attentionRequired:run.status==='awaiting_input'||(!run.archivedAt&&['failed','interrupted'].includes(run.status)&&!run.failureReviewedAt),
    events: run.events.slice(start, end).map(e=>e.data?.tool ? {...e,data:{...e.data,tool:{...e.data.tool,presentation:toolPresentation(e.data.tool)}}}:e), eventStart: start, eventCount: run.events.length, earlier: start, schedule: pick(run.schedule, scheduleKeys),
    context: { ...pick(run.schedule.context, ['workspaceId', 'selectedIds', 'agentId', 'includeDefaults', 'baseWorkspace', 'capturedAt']), entries: (run.schedule.context?.entries || []).map(remoteEntry) }, liveMessages: structuredClone(run.liveMessages || {}) };
}
// Explicit projection: native clients receive allowance metadata, never adapter internals.
export function remoteUsage(value) {
  const providers = {};
  for (const id of ['copilot', 'codex', 'claude']) {
    const entry = value?.providers?.[id]; if (!entry) continue;
    providers[id] = { ...pick(entry, ['provider', 'available', 'checkedAt', 'observedAt', 'stale']),
      source: {copilot:'GitHub Copilot account allowance',codex:'Codex account allowance',claude:'Claude account allowance'}[id],
      error: entry.error ? 'Account usage could not be refreshed on this Mac. Check its provider connection.' : null,
      windows: (entry.windows || []).slice(0, 20).map(window => pick(window, ['id', 'label', 'remainingPercent', 'unlimited', 'resetAt', 'reportedResetAt', 'resetSource', 'windowDurationMins', 'resetNote', 'billingNote', 'expired'])) };
  }
  return {providers};
}
export function remoteState(service) {
  const context = service.context.get(); const defaults = service.settings.get();
  return { hostName: service.remote?.config.label || os.hostname(),
    appearance: {showProviderUsage:defaults.appearance?.showProviderUsage!==false,providerUsageCollapsed:defaults.appearance?.providerUsageCollapsed===true},
    ...(defaults.appearance?.showProviderUsage!==false?{providerUsage:remoteUsage({providers:service.usage?.providers})}:{}), schedules: service.engine.schedules.list().map(s => pick(s, scheduleKeys)),
    runs: service.engine.visibleRuns().slice(0, 100).map(runSummary), runCount: service.engine.visibleRuns().length, runCountIncludingArchived: service.engine.listRuns().length,
    attentionCount: service.engine.visibleRuns().filter(run=>run.status==='awaiting_input'||(['failed','interrupted'].includes(run.status)&&!run.failureReviewedAt)).length,
    context: { ...pick(context, ['revision', 'refreshedAt', 'defaultWorkspaceId', 'workspaces', 'universalFolders', 'libraryFolders', 'favorites', 'errors']), entries: context.entries.map(remoteEntry) },
    defaults: pick(defaults, ['provider', 'model', 'reasoningEffort', 'contextTier', 'serviceTier', 'timezone']), providerStatus: service.catalog?.value || null, providerStatuses: Object.fromEntries(Object.entries(service.catalogs || {}).map(([id, catalog]) => [id, catalog.value])),attachmentMediaTypes:Object.fromEntries(['copilot','codex','claude'].map(id=>[id,service.engine.providers[id]?.acceptedMediaTypes||[]])),mcpStatusProviders:['copilot','codex','claude'].filter(id=>typeof service.engine.providers[id]?.mcpStatus==='function'),mcpLoginProviders:['copilot','codex','claude'].filter(id=>typeof service.engine.providers[id]?.mcpLogin==='function'),capabilities:['content-tabs.v1','chat.index.v1','chat.review.v1','chat.lifecycle.v1','chat.rename.v1','chat.permissions.chat.v1','chat.documents.v1','chat.attachments.v1','notifications.v1','authenticated-revocation.v1','connection-self-revoke.v1',...(service.resources?['resources.v1']:[])],protocol: 1 };
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
    this.peers = new Map(); this.journal = []; this.epoch = randomUUID(); this.sequence = 0; this.closed = false; this.status = 'disabled'; this.inflight = new Map();this.documents=new ChatDocumentApprovals({documentSource:(chatId,documentId)=>service.contentTabs.documentSource(chatId,documentId),currentRoots:run=>{const catalog=service.context.get(),id=run.schedule?.context?.workspaceId;const workspace=id?catalog.workspaces.find(item=>item.id===id):null;return workspace?[workspace.cwd,...(workspace.additionalDirectories||[]),...(catalog.universalFolders||[])]:[];}});this.attachmentConsents=new ChatAttachmentConsents(service.attachments);service.engine.attachmentConsents=this.attachmentConsents;
    this.ledgerFile = path.join(service.home, 'remote-commands.json'); this.ledger = readJSON(this.ledgerFile, {});
    this.changed = () => { if (!this.changeTimer) this.changeTimer = setTimeout(() => { this.changeTimer = null; this.publish(); }, 150); };
    service.engine.on('change', this.changed);
    this.lifecycleChanged = result => { if (result.deleted) { for (const peer of this.peers.values()) if (peer.runId === result.id) peer.runId = null; this.documents.revokeChat?.(result.id); service.contentTabs?.removeChat(result.id); this.attachmentConsents.revokeChat(result.id); void service.attachments?.revokeChat?.(result.id); } this.broadcast('chat.lifecycle', result); this.changed(); };
    service.engine.on('lifecycle', this.lifecycleChanged);
    // Also detect editor/AI changes to plain files; no filesystem secrets leave the projection.
    this.scan = setInterval(() => { if (this.config.enabled && [...this.peers.values()].some(p => p.device)) this.publish(); }, 2000);
  }
  save() { atomicJSON(this.file, this.config); fs.chmodSync(this.file, 0o600); }
  addresses() {
    return Object.values(os.networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.address)).map(i => `ws://${i.address}:${this.config.port}`);
  }
  info() { return { enabled: this.config.enabled, mode: this.config.mode, status: this.status, error: this.error || null, hostId: this.config.hostId, label: this.config.label || os.hostname(),
    relayURL: this.config.relayURL || '', publicURL: this.config.publicURL || '', addresses: this.addresses(), port: this.config.port,
    devices: this.config.devices.map(d => ({ id: d.id, name: d.name, pairedAt: d.pairedAt, resourceAccess: d.resourceAccess === true, documentAccess:d.documentAccess===true, online: [...this.peers.values()].some(p => p.device?.id === d.id) })),documentRequests:this.documents.list() }; }
  deviceStatus(id){const checkedAt=new Date().toISOString(),device=this.info().devices.find(device=>device.id===id);if(!device)throw new Error('Unknown paired device.');return {device:{...device,checkedAt},checkedAt};}
  async configure(value) {
    if (typeof value.enabled !== 'boolean') throw new Error('Choose whether remote access is enabled.');
    if (!['local', 'external'].includes(value.mode || this.config.mode)) throw new Error('Choose local or external relay.');
    const next = { ...this.config, enabled: value.enabled, mode: value.mode || this.config.mode };
    if (value.label !== undefined) { if (typeof value.label !== 'string' || !value.label.trim() || value.label.trim().length > 80 || /[\x00-\x1f]/.test(value.label)) throw new Error('Enter a Mac name between 1 and 80 characters.'); next.label = value.label.trim(); }
    if (value.port !== undefined) { if (!Number.isInteger(value.port) || value.port < 1024 || value.port > 65535) throw new Error('Choose a port between 1024 and 65535.'); next.port = value.port; }
    if (next.mode === 'external') {
      next.relayURL = validateRelayURL(value.relayURL || next.relayURL);
      next.publicURL = validateRelayURL(value.publicURL || next.publicURL || next.relayURL);
      if (value.relayToken) { if (!/^[a-f0-9]{64}$/.test(value.relayToken)) throw new Error('Relay token must be 64 hex characters.'); next.relayToken = value.relayToken; }
    }
    await this.stop(); this.config = next; this.save(); if (next.enabled) await this.start(); return this.info();
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
    this.status = 'connecting'; this.error = null;
    const base = this.config.mode === 'local' ? `ws://127.0.0.1:${this.config.port}` : this.config.relayURL;
    const ws = this.socket = new WebSocket(`${base}/socket?role=host&host=${this.config.hostId}`, { headers: { Authorization: `Bearer ${this.config.relayToken}` }, maxPayload: 8_000_000, handshakeTimeout: 8000 });
    ws.on('open', () => { if (this.socket !== ws) return;this.status='online';const since=this.config.offlineSince;if(since){const elapsed=Math.max(0,Math.floor((Date.now()-Date.parse(since))/1000));this.service.activity?.add('device.reconnected',{hostId:this.config.hostId,offlineSeconds:elapsed});delete this.config.offlineSince;this.save();}this.service.activity?.log('info','transport.online','Connected to the relay.',{hostId:this.config.hostId}); });
    ws.on('error', error => { if (this.socket === ws) this.error = error.message; });
    ws.on('close', () => {
      if (this.socket !== ws) return;
      this.peers.clear(); this.status = 'offline';this.config.offlineSince ||= new Date().toISOString();this.save();this.service.activity?.log('warning','transport.offline','Connection to the relay was interrupted.',{hostId:this.config.hostId});
      if (!this.closed && this.config.enabled) this.reconnect = setTimeout(() => this.connect(), 3000);
    });
    ws.on('message', bytes => {
      try {
        const message = JSON.parse(bytes);
        if (message.type === 'connect') {
          const peer = { id: message.clientId, challenge: secret(), incoming: 0, outgoing: 0, joined: Date.now() };
          this.peers.set(peer.id, peer); this.raw(peer, { type: 'challenge', challenge: peer.challenge });
        } else if (message.type === 'disconnect') this.peers.delete(message.clientId);
        else { const peer = this.peers.get(message.clientId); if (peer) void this.receive(peer, message.packet).catch(() => { this.peers.delete(peer.id); this.raw(peer, { type: 'rejected' }); }); }
      } catch { /* Reject malformed routing frames without taking the host down. */ }
    });
  }
  raw(peer, packet) { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ clientId: peer.id, packet })); }
  send(peer, value) { const seq = ++peer.outgoing; this.raw(peer, { type: 'data', seq, box: seal(peer.device.key, value, `${peer.prefix}:host:${seq}`) }); }
  async pairing(publicURL) {
    if (this.status !== 'online') throw new Error('Enable remote access and wait for the relay to connect.');
    const relay = validateRelayURL(publicURL || (this.config.mode === 'external' ? this.config.publicURL : this.addresses()[0] || `ws://127.0.0.1:${this.config.port}`));
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    this.invite = { key: secret(), expiresAt };
    const capsule = { version: 1, relay, label: this.config.label || os.hostname(), hostId: this.config.hostId, key: this.invite.key, expiresAt };
    const code = `proteus://pair?data=${Buffer.from(JSON.stringify(capsule)).toString('base64url')}`;
    return { code, browserURL: `https://proteus.example/remote#pair=${Buffer.from(JSON.stringify(capsule)).toString('base64url')}`, expiresAt, qr: await QRCode.toDataURL(code, { margin: 2, width: 360, errorCorrectionLevel: 'M' }) };
  }
  revoke(id) {
    this.documents.revokeDevice(id);
    this.attachmentConsents.revokeDevice(id);
    void this.service.attachments.revokeDevice(id);
    this.config.devices = this.config.devices.filter(d => d.id !== id); this.save();
    for (const peer of this.peers.values()) if (peer.device?.id === id) { this.send(peer,{type:'revoked',deviceId:id});this.raw(peer, { type: 'revoked' }); this.peers.delete(peer.id); }
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
  setDocumentAccess(id,enabled){
    if(typeof enabled!=='boolean')throw new Error('Choose whether document viewing is enabled.');
    if(!this.config.devices.some(device=>device.id===id))throw new Error('Paired device not found.');
    const previous=this.config.devices;this.config.devices=previous.map(device=>device.id===id?{...device,documentAccess:enabled}:device);
    try{this.save();}catch(error){this.config.devices=previous;throw error;}
    if(!enabled)this.documents.revokeDevice(id);
    return this.info();
  }
  requireDocumentAccess(peer){const device=this.config.devices.find(device=>device.id===peer.device?.id);if(device?.documentAccess!==true)throw new Error('View chat documents is not enabled for this device on the Mac.');}
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
        const device = { id: randomUUID(), key: secret(), name: request.name.trim(), pairedAt: new Date().toISOString(), resourceAccess: false,documentAccess:false };
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
    catch (error) { if (this.peers.get(peer.id) === peer) this.send(peer, { type: 'result', id: message.id, error: error.message }); }
  }
  async command(peer, message) {
    const { method, args = {} } = message;
    // Apply the current grant before replaying a previously successful command's snapshot.
    if (method === 'resources.list' || method === 'resources.action') this.requireResourceAccess(peer);
    if (method?.startsWith('chat.documents.')) this.requireDocumentAccess(peer);
    if(method==='tabs.mutate'&&(args.operations||[]).some(op=>op.tab?.type==='document'||String(op.id||'').startsWith('document:')||Array.isArray(op.ids)&&op.ids.some(id=>String(id).startsWith('document:'))))this.requireDocumentAccess(peer);
    if (!mutationMethods.has(method)) return this.execute(peer, method, args);
    const key = `${peer.device.id}:${message.id}`; const digest = createHash('sha256').update(JSON.stringify(canonical([method, args]))).digest('hex');
    const previous = this.ledger[key];
    if (previous) {
      if (previous.digest !== digest) throw new Error('Request ID was already used for another command.');
      if (this.inflight.has(key)) return this.inflight.get(key);
      if (previous.error) throw new Error(previous.error);
      if (previous.pending) throw new Error('The previous command outcome is uncertain. Refresh before trying a new action.');
      if(method==='tabs.mutate')return {...previous.result,tabs:(previous.result?.tabs||[]).filter(tab=>tab.type!=='document'||this.config.devices.find(device=>device.id===peer.device.id)?.documentAccess===true)};
      return previous.result;
    }
    if (!Number.isFinite(Date.parse(message.issuedAt)) || Math.abs(Date.now() - Date.parse(message.issuedAt)) > 300_000) throw new Error('Command expired. Refresh before trying again.');
    // Write the claim before any effect. An interrupted command is never silently replayed.
    this.ledger = Object.fromEntries(Object.entries(this.ledger).filter(([, record]) => Date.now() - record.at < 24 * 3600_000));
    if (Object.keys(this.ledger).length >= 10_000) throw new Error('Command limit reached. Try again tomorrow.');
    this.ledger[key] = { digest, pending: true, at: Date.now() }; atomicJSON(this.ledgerFile, this.ledger);
    const task = (async () => {
      try { const result = await this.execute(peer, method, args); this.ledger[key] = { digest, result, at: Date.now() }; atomicJSON(this.ledgerFile, this.ledger); return result; }
      catch (error) { this.ledger[key] = { digest, error: error.message, at: Date.now() }; atomicJSON(this.ledgerFile, this.ledger); throw error; }
      finally { this.inflight.delete(key); this.changed(); }
    })();
    this.inflight.set(key, task); return task;
  }
  async api(route, value) {
    const response = await fetch(this.service.origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.service.token}` }, body: JSON.stringify(value), signal: AbortSignal.timeout(60_000) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Host request failed.'); return data;
  }
  async execute(peer, method, args) {
    const engine = this.service.engine;
    if (method === 'sync') {
      const index = this.journal.findIndex(event => event.cursor === args.cursor);
      if (index >= 0) for (const event of this.journal.slice(index + 1)) if (!event.runId || event.runId === peer.runId) this.send(peer, event);
      return { state: remoteState(this.service), cursor: `${this.epoch}:${this.sequence}` };
    }
    if (method === 'runs.list') { const offset = Math.max(0, Math.floor(Number(args.offset) || 0)); return engine.visibleRuns(args.includeArchived===true).slice(offset, offset + 100).map(runSummary); }
    if(method==='connection.revoke'){if(args.deviceId&&args.deviceId!==peer.device.id)throw new Error('Only this connection can be revoked here.');this.revoke(peer.device.id);return {ok:true};}
    if(method==='notifications.list')return this.service.activity?.notifications()||{items:[],preferences:{}};
    if(method==='notifications.read')return this.service.activity.read(args.id);
    if(method==='logs.list')return this.service.activity?.logs(args.limit)||{items:[]};
    if (method === 'resources.list' || method === 'resources.action') {
      this.requireResourceAccess(peer);
      if (method === 'resources.action' && !this.service.resources) throw new Error('Resource controls are unavailable.');
      const result = this.service.resources ? await (method === 'resources.list' ? this.service.resources.list() : this.service.resources.action(args)) : {supported:false,processes:[],tabs:[],observedAt:new Date().toISOString()};
      this.requireResourceAccess(peer);
      return result;
    }
    if(method==='tabs.get'||method==='tabs.mutate'){
      if(args.scope==='chat')engine.getRun(args.id);
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
              const visible=projected.filter(tab=>tab.type==='browser');
              if(!Array.isArray(operation.ids)||new Set(operation.ids).size!==visible.length||operation.ids.length!==visible.length||operation.ids.some(id=>!visible.some(tab=>tab.id===id)))throw new Error('Reorder must contain each visible browser tab exactly once.');
              const ordered=operation.ids.map(id=>visible.find(tab=>tab.id===id));let index=0;projected=projected.map(tab=>tab.type==='browser'?ordered[index++]:tab);
              return {...operation,ids:projected.map(tab=>tab.id)};
            }
            return operation;
          });value={...args,operations};
        }
        result=this.service.contentTabs.mutate(value);
      }else result=this.service.contentTabs.get(args.scope,args.id);
      return {...result,tabs:result.tabs.filter(tab=>tab.type!=='document'||canDocuments)};
    }
    if (method === 'chat.get') { const run = engine.getRun(args.id); peer.runId = run.id; return remoteRun(run, Math.max(0, Math.floor(Number(args.offset) || 0)), engine.permissions, args.beforeEvent); }
    if (method === 'chat.rename') return this.api('/api/chat-title', pick(args, ['id', 'title', 'expectedTitleRevision']));
    if (method === 'chat.review') return engine.reviewFailure(args.id,args.expectedFailureEventAt);
    if (method === 'chat.archive') {if(typeof args.archived!=='boolean')throw new Error('Choose Archive or Unarchive.');return engine.lifecycle(args.id,args.archived?'archive':'unarchive',pick(args,['expectedUpdatedAt','expectedArchivedAt']));}
    if (method === 'chat.delete') return engine.lifecycle(args.id,'delete',pick(args,['expectedUpdatedAt','expectedArchivedAt']));
    if (method === 'chat.documents.request') {this.requireDocumentAccess(peer);const result=this.documents.request(engine.getRun(args.id),peer.device,args.source,args.documentId,args.fromRequestId,args.relativePath);this.service.activity?.add('review.required',{chatId:args.id});return result;}
    if (method === 'chat.documents.status') {this.requireDocumentAccess(peer);return this.documents.status(args.requestId,peer.device.id);}
    if (method === 'chat.documents.read') {this.requireDocumentAccess(peer);return this.documents.read(args.requestId,peer.device.id,engine);}
    if (method === 'chat.documents.asset') {this.requireDocumentAccess(peer);return this.documents.asset(args.requestId,args.assetId,peer.device.id,engine);}
    if (method === 'chat.attachments.begin') {
      const run=args.id?engine.getRun(args.id):null,providerId=run?.schedule.provider||args.providerId,accepted=engine.providers[providerId]?.acceptedMediaTypes||[];
      if(!accepted.includes(args.mediaType))throw new Error(`${providerId} cannot receive ${args.mediaType} attachments. Choose a supported file type or provider.`);
      if(args.providerId!==undefined&&args.providerId!==providerId)throw new Error('The chat provider changed. Choose the attachment again.');
      if(!run&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(args.draftId||''))throw new Error('Choose a chat or a valid first-message draft.');
      return this.service.attachments.begin({chatId:run?.id||'draft:'+args.draftId,deviceId:peer.device.id,messageId:args.messageId,providerId,name:args.name,mediaType:args.mediaType,size:args.size,sha256:args.sha256});
    }
    if (method === 'chat.attachments.chunk') return this.service.attachments.chunk({uploadId:args.uploadId,deviceId:peer.device.id,index:args.index,dataBase64:args.dataBase64});
    if (method === 'chat.attachments.finish') return this.service.attachments.finish({uploadId:args.uploadId,deviceId:peer.device.id});
    if (method === 'chat.attachments.authorize') {
      const run=args.id?engine.getRun(args.id):null,providerId=run?.schedule.provider||args.providerId;
      if(run&&args.providerId!==providerId)throw new Error('The chat provider changed. Review the files and destination again.');
      return this.attachmentConsents.authorize({...(run?{chatId:run.id}:{draftId:args.draftId}),deviceId:peer.device.id,messageId:args.messageId,providerId,attachments:args.attachments,acceptedMediaTypes:engine.providers[providerId]?.acceptedMediaTypes||[]});
    }
    if (method === 'chat.image') return this.api('/api/chat-image', pick(args, ['id', 'source']));
    if (method === 'mcp.status' || method === 'mcp.login') return this.api('/api/mcp', {runId:args.id,action:method === 'mcp.login' ? 'login' : 'status',server:args.server,openOnMac:method === 'mcp.login'});
    if (method === 'provider.usage') {
      if (this.service.settings.get().appearance?.showProviderUsage === false) return {enabled:false,providers:{}};
      const value = await this.service.usage.get(args.force === true);
      if (this.service.settings.get().appearance?.showProviderUsage === false) return {enabled:false,providers:{}};
      this.changed(); return {enabled:true,...remoteUsage(value)};
    }
    if (method === 'provider.status') return this.api('/api/provider', pick(args, ['force', 'provider']));
    if (method === 'context.refresh') { this.service.context.refresh(); this.changed(); return remoteState(this.service).context; }
    if (method === 'schedule.preview') return this.api('/api/preview', pick(args, ['cron', 'timezone']));
    if (method === 'chat.start') {
      const files=Array.isArray(args.attachments)?args.attachments:[];
      if(!files.length){const run=await this.api('/api/chat',pick(args,['name','prompt','provider','model','reasoningEffort','contextTier','serviceTier','workspaceId','selectedIds','agentId','includeDefaults']));peer.runId=run.id;return {runId:run.id};}
      if(!args.consentId||!args.draftId||!args.messageId||files.length>chatAttachmentLimits.maxBatchFiles||args.providerId!==args.provider)throw new Error('Review the exact first-message files and named provider before sending.');
      const schedule=this.service.buildChatSchedule(pick(args,['name','prompt','provider','model','reasoningEffort','contextTier','serviceTier','workspaceId','selectedIds','agentId','includeDefaults']));
      await this.attachmentConsents.verify({consentId:args.consentId,draftId:args.draftId,messageId:args.messageId,providerId:schedule.provider,deviceId:peer.device.id,attachmentIds:files});
      const run=engine.createRun(schedule,'chat',null,{deferStart:true});let prepared;
      try{prepared=await this.attachmentConsents.prepareSend({consentId:args.consentId,draftId:args.draftId,chatId:run.id,messageId:args.messageId,providerId:schedule.provider,deviceId:peer.device.id,attachmentIds:files});engine.startDeferredRun(run.id,{proofId:prepared.proofId,attachmentIds:files,messageId:args.messageId});peer.runId=run.id;return {runId:run.id};}
      catch(error){if(prepared)await this.attachmentConsents.releaseProof(prepared.proofId).catch(()=>{});engine.discardDeferredRun(run.id);throw error;}
    }
    if (method === 'schedule.run') { const run = await this.api('/api/run', { id: args.id }); peer.runId = run.id; return { runId: run.id }; }
    if (method==='chat.send'&&Array.isArray(args.attachments)&&args.attachments.length){
      const run=engine.getRun(args.id),files=args.attachments;
      if(args.mode==='steer'||files.length>chatAttachmentLimits.maxBatchFiles||args.providerId!==run.schedule.provider||!args.consentId||!args.messageId)throw new Error('Review the exact files and named provider for a queued turn.');
      const prepared=await this.attachmentConsents.prepareSend({consentId:args.consentId,chatId:run.id,messageId:args.messageId,providerId:run.schedule.provider,deviceId:peer.device.id,attachmentIds:files});
      try{await engine.send(run.id,args.prompt,'queue',args.messageId,args.modelOptions,{proofId:prepared.proofId,attachmentIds:files});peer.runId=run.id;return {runId:run.id};}
      catch(error){await this.attachmentConsents.releaseProof(prepared.proofId).catch(()=>{});throw error;}
    }
    if (['chat.reply', 'chat.resume', 'chat.cancel', 'chat.send', 'chat.remove-queued'].includes(method)) {
      engine.getRun(args.id); const action = method.split('.')[1];
      await this.api(`/api/runs/${args.id}/${action}`, pick(args, ['answer', 'requestId', 'prompt', 'mode', 'messageId', 'modelOptions'])); return { runId: args.id };
    }
    if (method === 'chat.permissions') {
      await this.api('/api/permissions', { action: args.scope === 'chat' ? 'set-chat-mode' : 'set-mode', runId: args.id, ...pick(args, ['mode', 'expectedContextId', 'expectedRevision', 'expectedChatRevision']) });
      this.changed(); return remoteRun(engine.getRun(args.id), 0, engine.permissions);
    }
    if (method === 'chat.context') { await this.api('/api/run-context', { runId: args.id, ...pick(args, ['selectedIds', 'agentId', 'includeDefaults']) }); return { runId: args.id }; }
    if (method === 'context.preview') return this.api('/api/context/preview', pick(args, ['workspace', 'workspaceId', 'selectedIds', 'agentId', 'includeDefaults']));
    if (method === 'context.favorite') { await this.api('/api/context', { action: 'favorite', ...pick(args, ['id', 'enabled', 'expectedRevision']) }); return { ok: true }; }
    if (method === 'context.mode') { await this.api('/api/context', { action: 'mode', ...pick(args, ['id', 'mode', 'expectedRevision']) }); return { ok: true }; }
    if (method === 'context.addFolders') { await this.api('/api/context', { action: 'add-folders', ...pick(args, ['workspaceId', 'folders', 'expectedRevision']) }); return { ok: true }; }
    if (method === 'schedule.save') {
      const original = engine.schedules.get(args.id);
      if (original.source?.manifest) throw new Error('This schedule is repository-owned. Update its source manifest and reconcile it on the Mac.');
      if (revision(original) !== args.expectedRevision) throw new Error('Schedule changed. Refresh before saving.');
      await this.api('/api/schedules', { schedule: { ...original, ...pick(args.changes, ['name', 'enabled', 'cron', 'timezone', 'provider', 'model', 'reasoningEffort', 'contextTier', 'serviceTier', 'prompt', 'misfire', 'contextSelection', 'notifications']) }, expectedRevision: args.expectedRevision }); return { ok: true };
    }
    throw new Error('Unsupported remote command.');
  }
  publish() {
    if (!this.config.enabled) return;
    const state = remoteState(this.service); const signature = JSON.stringify(state);
    if (signature !== this.signature) { this.signature = signature; this.broadcast('state', state); }
    const watched = new Set([...this.peers.values()].filter(p => p.device).map(p => p.runId).filter(Boolean));
    for (const id of watched) {
      if (!this.service.engine.runs.has(id)) continue;
      const run = remoteRun(this.service.engine.getRun(id), 0, this.service.engine.permissions); const hash = JSON.stringify(run);
      if (this.runSignatures?.get(id) === hash) continue;
      this.runSignatures ??= new Map(); this.runSignatures.set(id, hash); this.broadcast('run', run, id);
    }
  }
  broadcast(event, data, runId) {
    const value = { type: 'event', event, data, ...(runId ? { runId } : {}), cursor: `${this.epoch}:${++this.sequence}` };
    this.journal.push(value); if (this.journal.length > 100) this.journal.shift();
    for (const peer of this.peers.values()) if (peer.device && (!runId || peer.runId === runId)) this.send(peer, value);
  }
  async stop() {
    clearTimeout(this.reconnect); this.invite = null;this.documents.clear();
    const socket = this.socket; this.socket = null; socket?.terminate(); this.peers.clear();
    if (this.relay) { await this.relay.close(); this.relay = null; }
    this.status = 'disabled';
  }
  async close() { this.closed = true; clearInterval(this.scan); clearTimeout(this.changeTimer); this.service.engine.off('change', this.changed); this.service.engine.off('lifecycle',this.lifecycleChanged); await this.stop(); }
}
