import fs from 'node:fs';
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

const pick = (value, keys) => Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]));
const scheduleKeys = ['id', 'name', 'enabled', 'cron', 'timezone', 'provider', 'model', 'reasoningEffort', 'contextTier', 'workspace', 'misfire', 'prompt', 'revision', 'nextRuns', 'error', 'source', 'contextSelection'];
const entryKeys = ['id', 'name', 'description', 'kind', 'path', 'sources', 'roots', 'mode', 'scope', 'warnings', 'unsupportedAgentFields', 'error', 'missing', 'characters'];
const remoteEntry = entry => ({ ...pick(entry, entryKeys), ...(entry.agent ? { userInvocable: entry.agent.userInvocable } : {}) });
const mutationMethods = new Set(['chat.start', 'chat.reply', 'chat.resume', 'chat.cancel', 'schedule.run', 'schedule.save', 'context.mode', 'context.favorite', 'context.addFolders', 'chat.context', 'chat.permissions']);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export function remoteRun(run, offset = 0, permissions) {
  const end = Math.max(0, run.events.length - offset); const start = Math.max(0, end - 100);
  return { ...(permissions ? { permissionContext: permissions.describe(run.schedule), permissionRevision: permissions.get().revision } : {}), agentName: agentName(run), ...pick(run, ['id', 'title', 'trigger', 'status', 'createdAt', 'updatedAt', 'pending', 'usage', 'contextUsage', 'providerSessionId', 'nativeSessionPath', 'automaticApprovals', 'modelCapabilities']),
    events: run.events.slice(start, end), eventStart: start, eventCount: run.events.length, earlier: start, schedule: pick(run.schedule, scheduleKeys),
    context: { ...pick(run.schedule.context, ['workspaceId', 'selectedIds', 'agentId', 'includeDefaults', 'baseWorkspace', 'capturedAt']), entries: (run.schedule.context?.entries || []).map(remoteEntry) }, liveMessages: structuredClone(run.liveMessages || {}) };
}
export function remoteState(service) {
  const context = service.context.get(); const defaults = service.settings.get();
  return { hostName: os.hostname(), schedules: service.engine.schedules.list().map(s => pick(s, scheduleKeys)),
    runs: service.engine.listRuns().slice(0, 100).map(r => pick(r, ['id', 'title', 'status', 'createdAt', 'updatedAt'])), runCount: service.engine.listRuns().length,
    context: { ...pick(context, ['revision', 'refreshedAt', 'defaultWorkspaceId', 'workspaces', 'universalFolders', 'libraryFolders', 'favorites', 'errors']), entries: context.entries.map(remoteEntry) },
    defaults: pick(defaults, ['provider', 'model', 'reasoningEffort', 'contextTier', 'timezone']), providerStatus: service.catalog?.value || null, protocol: 1 };
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
    this.peers = new Map(); this.journal = []; this.epoch = randomUUID(); this.sequence = 0; this.closed = false; this.status = 'disabled'; this.inflight = new Map();
    this.ledgerFile = path.join(service.home, 'remote-commands.json'); this.ledger = readJSON(this.ledgerFile, {});
    this.changed = () => { if (!this.changeTimer) this.changeTimer = setTimeout(() => { this.changeTimer = null; this.publish(); }, 150); };
    service.engine.on('change', this.changed);
    // Also detect editor/AI changes to plain files; no filesystem secrets leave the projection.
    this.scan = setInterval(() => { if (this.config.enabled && [...this.peers.values()].some(p => p.device)) this.publish(); }, 2000);
  }
  save() { atomicJSON(this.file, this.config); }
  addresses() {
    return Object.values(os.networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.address)).map(i => `ws://${i.address}:${this.config.port}`);
  }
  info() { return { enabled: this.config.enabled, mode: this.config.mode, status: this.status, error: this.error || null, hostId: this.config.hostId,
    relayURL: this.config.relayURL || '', publicURL: this.config.publicURL || '', addresses: this.addresses(), port: this.config.port,
    devices: this.config.devices.map(d => ({ id: d.id, name: d.name, pairedAt: d.pairedAt, online: [...this.peers.values()].some(p => p.device?.id === d.id) })) }; }
  async configure(value) {
    if (typeof value.enabled !== 'boolean') throw new Error('Choose whether remote access is enabled.');
    if (!['local', 'external'].includes(value.mode || this.config.mode)) throw new Error('Choose local or external relay.');
    const next = { ...this.config, enabled: value.enabled, mode: value.mode || this.config.mode };
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
    ws.on('open', () => { if (this.socket === ws) this.status = 'online'; });
    ws.on('error', error => { if (this.socket === ws) this.error = error.message; });
    ws.on('close', () => {
      if (this.socket !== ws) return;
      this.peers.clear(); this.status = 'offline';
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
    const capsule = { version: 1, relay, hostId: this.config.hostId, key: this.invite.key, expiresAt };
    const code = `proteus://pair?data=${Buffer.from(JSON.stringify(capsule)).toString('base64url')}`;
    return { code, expiresAt, qr: await QRCode.toDataURL(code, { margin: 2, width: 360, errorCorrectionLevel: 'M' }) };
  }
  revoke(id) {
    this.config.devices = this.config.devices.filter(d => d.id !== id); this.save();
    for (const peer of this.peers.values()) if (peer.device?.id === id) { this.raw(peer, { type: 'revoked' }); this.peers.delete(peer.id); }
    return this.info();
  }
  async receive(peer, packet) {
    if (!peer.device) {
      if (Date.now() - peer.joined > 60_000) throw new Error('Authentication expired.');
      if (packet.type === 'pair') {
        if (!this.invite || Date.parse(this.invite.expiresAt) < Date.now()) throw new Error('Pairing expired.');
        const invite = this.invite; const request = unseal(invite.key, packet.box, `${peer.challenge}:pair`);
        if (typeof request.name !== 'string' || !request.name.trim() || request.name.length > 80 || this.config.devices.length >= 20) throw new Error('Invalid device.');
        const device = { id: randomUUID(), key: secret(), name: request.name.trim(), pairedAt: new Date().toISOString() };
        this.invite = null; this.config.devices.push(device); this.save();
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
    if (!mutationMethods.has(method)) return this.execute(peer, method, args);
    const key = `${peer.device.id}:${message.id}`; const digest = createHash('sha256').update(JSON.stringify(canonical([method, args]))).digest('hex');
    const previous = this.ledger[key];
    if (previous) {
      if (previous.digest !== digest) throw new Error('Request ID was already used for another command.');
      if (this.inflight.has(key)) return this.inflight.get(key);
      if (previous.error) throw new Error(previous.error);
      if (previous.pending) throw new Error('The previous command outcome is uncertain. Refresh before trying a new action.');
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
    if (method === 'runs.list') { const offset = Math.max(0, Math.floor(Number(args.offset) || 0)); return engine.listRuns().slice(offset, offset + 100).map(r => pick(r, ['id', 'title', 'status', 'createdAt', 'updatedAt'])); }
    if (method === 'chat.get') { const run = engine.getRun(args.id); peer.runId = run.id; return remoteRun(run, Math.max(0, Math.floor(Number(args.offset) || 0)), engine.permissions); }
    if (method === 'chat.image') return this.api('/api/chat-image', pick(args, ['id', 'source']));
    if (method === 'provider.status') return this.api('/api/provider', pick(args, ['force']));
    if (method === 'context.refresh') { this.service.context.refresh(); this.changed(); return remoteState(this.service).context; }
    if (method === 'schedule.preview') return this.api('/api/preview', pick(args, ['cron', 'timezone']));
    if (method === 'chat.start') {
      const run = await this.api('/api/chat', pick(args, ['name', 'prompt', 'provider', 'model', 'reasoningEffort', 'contextTier', 'workspaceId', 'selectedIds', 'agentId', 'includeDefaults']));
      peer.runId = run.id; return { runId: run.id };
    }
    if (method === 'schedule.run') { const run = await this.api('/api/run', { id: args.id }); peer.runId = run.id; return { runId: run.id }; }
    if (['chat.reply', 'chat.resume', 'chat.cancel'].includes(method)) {
      engine.getRun(args.id); const action = method.split('.')[1];
      await this.api(`/api/runs/${args.id}/${action}`, pick(args, ['answer', 'requestId', 'prompt'])); return { runId: args.id };
    }
    if (method === 'chat.permissions') {
      await this.api('/api/permissions', { action: 'set-mode', runId: args.id, ...pick(args, ['mode', 'expectedContextId', 'expectedRevision']) });
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
      await this.api('/api/schedules', { schedule: { ...original, ...pick(args.changes, ['name', 'enabled', 'cron', 'timezone', 'provider', 'model', 'reasoningEffort', 'contextTier', 'prompt', 'misfire', 'contextSelection']) }, expectedRevision: args.expectedRevision }); return { ok: true };
    }
    throw new Error('Unsupported remote command.');
  }
  publish() {
    if (!this.config.enabled) return;
    const state = remoteState(this.service); const signature = JSON.stringify(state);
    if (signature !== this.signature) { this.signature = signature; this.broadcast('state', state); }
    const watched = new Set([...this.peers.values()].filter(p => p.device).map(p => p.runId).filter(Boolean));
    for (const id of watched) {
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
    clearTimeout(this.reconnect); this.invite = null;
    const socket = this.socket; this.socket = null; socket?.terminate(); this.peers.clear();
    if (this.relay) { await this.relay.close(); this.relay = null; }
    this.status = 'disabled';
  }
  async close() { this.closed = true; clearInterval(this.scan); clearTimeout(this.changeTimer); this.service.engine.off('change', this.changed); await this.stop(); }
}
