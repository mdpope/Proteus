// Life Ask admission (docs/life-ask.md, contract v1). One owner-side admission point shared by
// the relay fast path (scoped `mnemosyne.ask` devices) and the Mnemosyne iCloud slow path.
// The request UUID is the identity. Each request directory keeps a compact permanent tombstone
// (`receipt.json`) beyond audio retention, so replayed iCloud history can never recreate a chat.
// Only requests bound to this owner's Life account and host are admitted; unbound/legacy
// requests always remain with Mnemosyne's native executor.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { atomicJSON, readJSON } from '../../shared/files.js';

export const LIFE_ASK_VERSION = 1;
export const LIFE_ASK_SCOPE = 'mnemosyne.ask';
export const LIFE_ASK_OWNER = 'proteus-life';
export const LIFE_ASK_LIMITS = Object.freeze({ maxAudioBytes: 2_100_000, sampleRates: [8000, 16000], maxSeconds: 60 });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const STATES = new Set(['received', 'transcribing', 'running', 'answered', 'needs-attention', 'rejected']);
// A capture window is at most 60 s; allow one second of frame/receipt slack.
const MAX_DURATION_MS = (LIFE_ASK_LIMITS.maxSeconds + 1) * 1000;
const QUIET_PEAK = 64;

class Rejection extends Error { constructor(reason, message) { super(message || reason); this.reason = reason; } }

/** Parses a PCM WAV and returns its format, or throws a Rejection. */
export function inspectWav(bytes) {
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Rejection('unsupported-format', 'Audio must be a WAV file.');
  let offset = 12, format = null, data = null;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4), body = offset + 8;
    if (body + size > bytes.length) throw new Rejection('malformed', 'The WAV file is truncated.');
    if (id === 'fmt ' && size >= 16) format = { audioFormat: bytes.readUInt16LE(body), channels: bytes.readUInt16LE(body + 2), sampleRate: bytes.readUInt32LE(body + 4), bitsPerSample: bytes.readUInt16LE(body + 14) };
    if (id === 'data') { data = { offset: body, size }; break; }
    offset = body + size + (size % 2);
  }
  if (!format || !data) throw new Rejection('malformed', 'The WAV file has no format or audio data.');
  if (format.audioFormat !== 1 || format.channels !== 1 || format.bitsPerSample !== 16 || !LIFE_ASK_LIMITS.sampleRates.includes(format.sampleRate)) throw new Rejection('unsupported-format', 'Audio must be mono 16-bit PCM at 8 or 16 kHz.');
  const durationMs = Math.round(data.size / (format.sampleRate * 2) * 1000);
  if (durationMs > MAX_DURATION_MS) throw new Rejection('too-large', 'Audio exceeds the 60-second request window.');
  let peak = 0;
  for (let i = data.offset; i + 1 < data.offset + data.size; i += 2) { const v = Math.abs(bytes.readInt16LE(i)); if (v > peak) { peak = v; if (peak >= QUIET_PEAK) break; } }
  if (peak < QUIET_PEAK) throw new Rejection('quiet', 'The request contains no audible speech.');
  return { ...format, durationMs };
}

const ms = value => Number.isSafeInteger(value) && value > 0 ? value : null;
const validTimes = value => Object.fromEntries(Object.entries(value || {}).filter(([, time]) => ms(time) !== null));

/** Validates a wire `life.ask.admit` payload. Returns the normalized request or throws a Rejection. */
export function validateAdmission(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args) || args.version !== LIFE_ASK_VERSION) throw new Rejection('malformed', 'Unsupported Life Ask request version.');
  const requestId = String(args.requestId || '').toLowerCase();
  if (!UUID.test(requestId)) throw new Rejection('malformed', 'Request ID must be a UUID.');
  if (args.executionOwner !== LIFE_ASK_OWNER) throw new Rejection('account-mismatch', 'This request is not bound to Proteus Life.');
  if (typeof args.accountID !== 'string' || !args.accountID || typeof args.hostID !== 'string' || !UUID.test(args.hostID.toLowerCase())) throw new Rejection('malformed', 'Request binding is incomplete.');
  const audio = args.audio || {};
  if (audio.format !== 'wav' || typeof audio.data !== 'string' || !SHA256.test(String(audio.sha256 || '').toLowerCase()) || !Number.isSafeInteger(audio.bytes)) throw new Rejection('malformed', 'Audio description is incomplete.');
  if (audio.bytes > LIFE_ASK_LIMITS.maxAudioBytes || audio.data.length > Math.ceil(LIFE_ASK_LIMITS.maxAudioBytes / 3) * 4 + 4) throw new Rejection('too-large', 'Audio exceeds the Life Ask limit.');
  const bytes = Buffer.from(audio.data, 'base64');
  const sha256 = audio.sha256.toLowerCase();
  if (bytes.length !== audio.bytes || createHash('sha256').update(bytes).digest('hex') !== sha256) throw new Rejection('malformed', 'Audio does not match its size and SHA-256.');
  const wav = inspectWav(bytes);
  if (audio.sampleRate !== undefined && audio.sampleRate !== wav.sampleRate) throw new Rejection('malformed', 'Audio sample rate does not match the WAV header.');
  const times = args.times || {};
  for (const key of ['captureStartedAt', 'captureEndedAt', 'finalizedAt', 'sentAt']) if (times[key] !== undefined && ms(times[key]) === null) throw new Rejection('malformed', 'Times must be positive integer epoch milliseconds.');
  const captured = validTimes(Object.fromEntries(['captureStartedAt', 'captureEndedAt', 'finalizedAt', 'sentAt'].map(key => [key, times[key]])));
  if (!captured.captureStartedAt || !captured.captureEndedAt || captured.captureEndedAt < captured.captureStartedAt) throw new Rejection('malformed', 'Capture times are missing or invalid.');
  if (!['timeout', 'double-tap'].includes(args.endReason)) throw new Rejection(args.endReason === 'interrupted' ? 'interrupted' : 'malformed', 'Only completed requests can be admitted.');
  const device = { id: String(args.device?.id || '').slice(0, 128), name: String(args.device?.name || '').replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 80) };
  if (!device.id) throw new Rejection('malformed', 'Device identity is missing.');
  return { requestId, accountID: args.accountID, hostID: args.hostID.toLowerCase(), sha256, bytes, wav, times: captured, device, endReason: args.endReason, appVersion: String(args.appVersion || '').slice(0, 40) };
}

/** The legacy Omi v1 envelope (AgentRequest.swift) used by Omi's transcribe/file verbs. */
export function legacyEnvelope(request, audioBase64) {
  return { version: 1, id: request.requestId, device: request.device.name || request.device.id, startedAt: request.times.captureStartedAt, endedAt: request.times.captureEndedAt, status: 'queued', audio: audioBase64, audioDigest: { name: request.requestId + '.wav', bytes: request.bytes.length, sha256: request.sha256 }, sampleRate: request.wav.sampleRate, executionOwner: LIFE_ASK_OWNER, accountID: request.accountID, hostID: request.hostID };
}

/** Converts a bound iCloud envelope to wire input; admission still verifies binding/audio.
 * Legacy Swift dates can contain fractional milliseconds. Only this compatibility boundary
 * rounds them; relay input remains strict. Missing optional dates use frozen capture dates.
 */
export function admissionFromLegacy(value) {
  const rounded = time => typeof time === 'number' && Number.isFinite(time) ? ms(Math.round(time)) : null;
  const finalized = value?.finalizedAt ?? value?.endedAt;
  return {version:1,requestId:value?.id,executionOwner:value?.executionOwner,accountID:value?.accountID,hostID:value?.hostID,
    device:{id:value?.device,name:value?.device},audio:{format:'wav',sampleRate:value?.sampleRate,channels:1,bitsPerSample:16,bytes:value?.audioDigest?.bytes,sha256:value?.audioDigest?.sha256,data:value?.audio},
    times:{captureStartedAt:rounded(value?.startedAt),captureEndedAt:rounded(value?.endedAt),finalizedAt:rounded(finalized),sentAt:rounded(value?.sentAt ?? finalized)},
    endReason:value?.endReason ?? 'timeout',appVersion:value?.appVersion ?? ''};
}

export class LifeAskStore {
  /**
   * @param {string} home Proteus application-data directory.
   * @param {{identity: () => ({accountId?: string}|null), hostId: () => string, enabled: () => boolean, hostName?: () => string, onAdmitted?: (receipt: object) => void, now?: () => number}} options
   */
  constructor(home, { identity, hostId, enabled, hostName = () => '', onAdmitted = () => {}, now = Date.now }) {
    this.root = path.join(home, 'life-ask');
    Object.assign(this, { identity, hostId, enabled, hostName, onAdmitted, now });
    this.pending = new Map();
  }
  binding() { return { accountID: this.identity()?.accountId || null, hostID: String(this.hostId() || '').toLowerCase() }; }
  capabilities() {
    const { accountID, hostID } = this.binding();
    return { scope: LIFE_ASK_SCOPE, capabilities: ['life.ask.v1'], version: LIFE_ASK_VERSION, hostID, hostName: this.hostName(), accountID, accountConnected: !!accountID, enabled: this.enabled() === true, ...LIFE_ASK_LIMITS };
  }
  directory(requestId) { return path.join(this.root, requestId); }
  read(requestId) { try { return readJSON(path.join(this.directory(requestId), 'receipt.json')); } catch { return null; } }
  echo(receipt, extra = {}) {
    return { state: extra.state || 'accepted', requestId: receipt.requestId, audioSha256: receipt.audioSha256, accountID: receipt.accountID, hostID: receipt.hostID, receiptId: receipt.receiptId, chatId: receipt.chatId || null, hostReceivedAt: receipt.times.hostReceivedAt, admittedAt: receipt.times.admittedAt, ...(extra.reason ? { reason: extra.reason } : {}) };
  }
  reject(args, reason, hostReceivedAt) {
    return { state: 'rejected', requestId: String(args?.requestId || '').toLowerCase() || null, audioSha256: String(args?.audio?.sha256 || '').toLowerCase() || null, accountID: args?.accountID ?? null, hostID: args?.hostID ?? null, receiptId: randomUUID(), chatId: null, hostReceivedAt, reason };
  }
  /** Admits one request exactly once. `source` is `relay` or `icloud`. Never throws for request faults. */
  async admit(args, { source = 'relay', deviceId = null } = {}) {
    const hostReceivedAt = this.now();
    const bindingMatches = () => { const {accountID,hostID}=this.binding(); return !!accountID && args?.accountID===accountID && String(args?.hostID||'').toLowerCase()===hostID; };
    // Binding precedes receipt lookup, including iCloud and retries after account switches.
    if (!bindingMatches()) return this.reject(args, 'account-mismatch', hostReceivedAt);
    let request;
    try { request = validateAdmission(args); } catch (error) { if (error instanceof Rejection) return this.reject(args, error.reason, hostReceivedAt); throw error; }
    const existing = this.read(request.requestId);
    if (existing) return this.duplicate(existing, request);
    if (this.pending.has(request.requestId)) { await this.pending.get(request.requestId).catch(() => {}); if (!bindingMatches()) return this.reject(args, 'account-mismatch', hostReceivedAt); const settled = this.read(request.requestId); if (settled) return this.duplicate(settled, request); }
    const { accountID, hostID } = this.binding();
    if (!this.enabled()) return this.reject(args, 'disabled', hostReceivedAt);
    if (!accountID || request.accountID !== accountID || request.hostID !== hostID) return this.reject(args, 'account-mismatch', hostReceivedAt);
    const task = this.create(request, args.audio.data, { source, deviceId, hostReceivedAt });
    this.pending.set(request.requestId, task);
    try { const receipt = await task; this.onAdmitted(receipt); return this.echo(receipt); }
    catch (error) { const settled = this.read(request.requestId); if (settled) return this.duplicate(settled, request); throw error; }
    finally { this.pending.delete(request.requestId); }
  }
  duplicate(existing, request) {
    if (existing.accountID !== request.accountID || existing.hostID !== request.hostID) return this.reject({...request,audio:{sha256:request.sha256}}, 'account-mismatch', this.now());
    if (existing.audioSha256 !== request.sha256) return {...this.reject({...request,audio:{sha256:request.sha256}}, 'conflict', this.now()),state:'conflict',existingAudioSha256:existing.audioSha256};
    return this.echo(existing, { state: 'duplicate' });
  }
  async create(request, audioBase64, { source, deviceId, hostReceivedAt }) {
    fs.mkdirSync(this.root, { recursive: true, mode: 0o700 });
    // Build the complete request privately, then publish it with one atomic directory rename.
    const staging = path.join(this.root, '.incoming-' + request.requestId + '-' + randomUUID());
    fs.mkdirSync(staging, { mode: 0o700 });
    try {
      const admittedAt = this.now();
      fs.writeFileSync(path.join(staging, 'audio.wav'), Buffer.from(audioBase64, 'base64'), { flag: 'wx', mode: 0o600 });
      atomicJSON(path.join(staging, 'request.json'), legacyEnvelope(request, audioBase64));
      const receipt = { schemaVersion: 1, requestId: request.requestId, receiptId: randomUUID(), audioSha256: request.sha256, audioBytes: request.bytes.length, durationMs: request.wav.durationMs, accountID: request.accountID, hostID: request.hostID, device: request.device, endReason: request.endReason, appVersion: request.appVersion, source, deviceId, state: 'received', chatId: null, summary: '', resultRevision: 0, notificationEventId: null, times: { ...request.times, hostReceivedAt, admittedAt } };
      atomicJSON(path.join(staging, 'receipt.json'), receipt);
      try { fs.renameSync(staging, this.directory(request.requestId)); }
      catch (error) { if (error.code === 'ENOTEMPTY' || error.code === 'EEXIST') { const settled = this.read(request.requestId); if (settled) return settled; } throw error; }
      return receipt;
    } finally { fs.rmSync(staging, { recursive: true, force: true }); }
  }
  /** Revision-free stage update by the owner's executor. */
  update(requestId, changes) {
    const receipt = this.read(requestId); if (!receipt) throw new Error('Unknown Life Ask request.');
    if (changes.state && !STATES.has(changes.state)) throw new Error('Invalid Life Ask state.');
    const next = { ...receipt, ...changes, times: validTimes({ ...receipt.times, ...(changes.times || {}) }), resultRevision: receipt.resultRevision + 1 };
    atomicJSON(path.join(this.directory(requestId), 'receipt.json'), next);
    return next;
  }
  status(requestIds) {
    if (!Array.isArray(requestIds) || requestIds.length > 50) throw new Error('Request up to 50 Life Ask IDs.');
    return { items: requestIds.map(value => {
      const requestId = String(value || '').toLowerCase(), receipt = UUID.test(requestId) ? this.read(requestId) : null;
      const binding=this.binding();
      if (!receipt || !binding.accountID || receipt.accountID!==binding.accountID || receipt.hostID!==binding.hostID) return { requestId, state: 'unknown' };
      return { requestId, receiptId:receipt.receiptId, audioSha256: receipt.audioSha256, accountID: receipt.accountID, hostID: receipt.hostID, state: receipt.state, chatId: receipt.chatId, summary: receipt.summary || '', resultRevision: receipt.resultRevision, times: validTimes(receipt.times) };
    }) };
  }
  /** Requests that are admitted but not finished, for resumption after an owner restart. */
  unfinished() {
    if (!fs.existsSync(this.root)) return [];
    const binding=this.binding();
    return fs.readdirSync(this.root).filter(name => UUID.test(name)).map(name => this.read(name)).filter(receipt => receipt && binding.accountID && receipt.accountID===binding.accountID && receipt.hostID===binding.hostID && ['received', 'transcribing', 'running'].includes(receipt.state));
  }
  pendingEffects() {
    if (!fs.existsSync(this.root)) return [];
    const binding=this.binding();
    return fs.readdirSync(this.root).filter(name => UUID.test(name)).map(name => this.read(name)).filter(receipt => receipt && binding.accountID && receipt.accountID===binding.accountID && receipt.hostID===binding.hostID && receipt.state==='answered' && !receipt.effectsComplete);
  }
  list(){
    if(!fs.existsSync(this.root))return [];
    return fs.readdirSync(this.root).filter(name=>UUID.test(name)).map(name=>this.read(name)).filter(Boolean);
  }
  /** Retire only redundant execution payloads, never chats, their recordings or replay identity. */
  compact(){
    const binding=this.binding(),cutoff=this.now()-30*24*60*60*1000;
    const eligible=this.list().filter(row=>binding.accountID&&row.accountID===binding.accountID&&row.hostID===binding.hostID&&row.state==='answered'&&row.effectsComplete===true&&!row.payloadCompactedAt&&Number.isSafeInteger(row.times.answeredAt)&&row.times.answeredAt<=cutoff).sort((a,b)=>a.times.answeredAt-b.times.answeredAt).slice(0,25);
    let requests=0,logicalBytesRemoved=0;
    for(const receipt of eligible){
      const directory=this.directory(receipt.requestId),stat=fs.lstatSync(directory);
      if(!stat.isDirectory()||stat.isSymbolicLink())continue;
      // Unlinks are individually resumable after a crash; the durable receipt remains
      // throughout. Unknown files and the per-chat working folder are human-owned.
      for(const name of ['audio.wav','request.json','transcript.json','result.json','filing.json','filing-intent.json']){
        const file=path.join(directory,name);let payload;
        try{payload=fs.lstatSync(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}
        if(!payload.isFile()||payload.isSymbolicLink())throw Error('Life Ask payload retention found an unexpected file.');
        fs.unlinkSync(file);logicalBytesRemoved+=payload.size;
      }
      this.update(receipt.requestId,{payloadCompactedAt:this.now()});requests++;
    }
    return {requests,logicalBytesRemoved};
  }
}
