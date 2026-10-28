import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { TextDecoder } from 'node:util';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const CHUNK_BYTES = 256 * 1024;
const TTL_MS = 15 * 60 * 1000;
const MAX_BATCH_FILES = 256;
const MAX_BATCH_BYTES = 32 * 1024 * 1024;
const MAX_PENDING = 1024;
const MAX_PER_DEVICE = 512;
const MAX_PENDING_BYTES = 128 * 1024 * 1024;
const MAX_PER_DEVICE_BYTES = 64 * 1024 * 1024;
const MAX_INCOMPLETE = 16;
const MAX_INCOMPLETE_PER_DEVICE = 4;
const validMediaType=value=>typeof value==='string'&&value.length<=127&&/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(value);
const PROVIDERS = new Set(['copilot', 'codex', 'claude', 'mtplx']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function identity(value, label) {
  if (typeof value !== 'string' || !value || value.length > 128 || /[\x00-\x1f\x7f]/.test(value)) throw new Error(`Invalid ${label}.`);
  return value;
}
function filename(value) {
  if (typeof value !== 'string' || value !== value.trim() || !value || value.length > 180 || /[\\/\x00-\x1f\x7f]/.test(value) || ['.', '..'].includes(value)) throw new Error('Choose a file with a valid filename.');
  return value.normalize('NFC');
}
function fileType(bytes, mediaType) {
  const starts = signature => bytes.subarray(0, signature.length).equals(Buffer.from(signature));
  if (mediaType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (mediaType === 'image/jpeg') return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  if (mediaType === 'image/gif') return starts('GIF87a') || starts('GIF89a');
  if (mediaType === 'image/webp') return bytes.length >= 12 && starts('RIFF') && bytes.subarray(8, 12).equals(Buffer.from('WEBP'));
  if (mediaType === 'application/pdf') return starts('%PDF-');
  if (mediaType === 'text/plain') {
    if (bytes.includes(0)) return false;
    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return true; } catch { return false; }
  }
  return true;
}
function decodedChunk(value) {
  if (typeof value !== 'string' || value.length > Math.ceil(CHUNK_BYTES / 3) * 4 + 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('Invalid attachment chunk.');
  const bytes = Buffer.from(value, 'base64');
  if (!bytes.length || bytes.length > CHUNK_BYTES || bytes.toString('base64') !== value) throw new Error('Invalid attachment chunk.');
  return bytes;
}
function readStaged(record) {
  const fd = fs.openSync(record.path, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.ino !== record.inode || stat.size !== record.size) throw new Error('Staged attachment changed.');
    return fs.readFileSync(fd);
  } finally { fs.closeSync(fd); }
}

/** Ephemeral, host-private byte staging. A caller must authenticate the peer before using this store. */
export class ChatAttachmentStore {
  constructor(home, { clock = () => Date.now() } = {}) {
    if (typeof home !== 'string' || !path.isAbsolute(home)) throw new Error('An absolute application-data home is required.');
    this.clock = clock;
    this.base = path.join(home, 'chat-attachments');
    fs.mkdirSync(this.base, { recursive: true, mode: 0o700 }); fs.chmodSync(this.base, 0o700);
    this.removeStaleSessions();
    this.acceptedRoot = path.join(this.base, 'accepted'); fs.mkdirSync(this.acceptedRoot, { recursive: true, mode: 0o700 }); fs.chmodSync(this.acceptedRoot, 0o700);
    this.root = path.join(this.base, randomUUID()); fs.mkdirSync(this.root, { mode: 0o700 });
    this.records = new Map(); this.closed = false;
    this.loadAccepted();
    this.timer = setInterval(() => this.cleanup(), 60_000); this.timer.unref?.();
  }
  ensureOpen() { if (this.closed) throw new Error('Attachment staging is closed.'); this.cleanup(); }
  loadAccepted() {
    for (const name of fs.readdirSync(this.acceptedRoot)) {
      if (!name.endsWith('.json') || !UUID.test(name.slice(0, -5))) continue;
      const id = name.slice(0, -5), metadata = path.join(this.acceptedRoot, name), file = path.join(this.acceptedRoot, id);
      try {
        const saved = JSON.parse(fs.readFileSync(metadata, 'utf8'));
        if (saved.id !== id || !PROVIDERS.has(saved.providerId) || !validMediaType(saved.mediaType) || !Number.isSafeInteger(saved.size) || saved.size < 1 || saved.size > MAX_FILE_BYTES || !/^[0-9a-f]{64}$/.test(saved.sha256)) throw new Error('Invalid accepted attachment record.');
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== saved.size) throw new Error('Accepted attachment changed.');
        const record = { ...saved, path: file, fd: null, inode: stat.ino, finished: true, accepted: true, expiresAt: Infinity };
        this.verify(record); this.records.set(id, record);
      } catch { fs.rmSync(metadata, { force: true }); fs.rmSync(file, { force: true }); }
    }
  }
  removeStaleSessions() {
    for (const name of fs.readdirSync(this.base)) {
      if (!UUID.test(name)) continue;
      const target = path.join(this.base, name);
      try { const stat = fs.lstatSync(target); if (stat.isDirectory() && !stat.isSymbolicLink() && this.clock() - stat.mtimeMs >= TTL_MS) fs.rmSync(target, { recursive: true, force: true }); } catch { /* A concurrent cleanup is harmless. */ }
    }
  }
  cleanup() {
    return this.performanceDiagnostics?this.performanceDiagnostics.measureSync('attachments.cleanup',()=>this.cleanupExpired()):this.cleanupExpired();
  }
  cleanupExpired() {
    if (this.closed) return;
    for (const record of this.records.values()) if (!record.accepted && this.clock() >= record.expiresAt) this.remove(record);
  }
  touchBatch(record) {
    const expiresAt = this.clock() + TTL_MS;
    for (const item of this.records.values()) {
      if (!item.accepted && item.deviceId === record.deviceId && item.messageId === record.messageId) item.expiresAt = expiresAt;
    }
    // The restart sweeper uses this session directory timestamp.
    try { fs.utimesSync(this.root, new Date(this.clock()), new Date(this.clock())); } catch { /* In-memory expiry still applies. */ }
  }
  remove(record) {
    if (record.fd !== null) { try { fs.closeSync(record.fd); } catch { /* Closed already. */ }; record.fd = null; }
    try { fs.rmSync(record.path, { force: true }); } catch { /* Missing staged bytes. */ }
    if (record.accepted) { try { fs.rmSync(path.join(this.acceptedRoot, record.id + '.json'), { force: true }); } catch { /* Missing manifest. */ } }
    this.records.delete(record.id);
  }
  bound(record, { chatId, deviceId, messageId, providerId }) {
    if (record.chatId !== identity(chatId, 'chat') || record.deviceId !== identity(deviceId, 'device') || record.messageId !== identity(messageId, 'message') || record.providerId !== identity(providerId, 'provider')) throw new Error('This attachment belongs to another chat, device, message or provider.');
  }
  async begin({ chatId, deviceId, messageId, providerId, name, mediaType, size, sha256 } = {}) {
    this.ensureOpen();
    chatId = identity(chatId, 'chat'); deviceId = identity(deviceId, 'device'); messageId = identity(messageId, 'message'); name = filename(name);
    if (!PROVIDERS.has(providerId)) throw new Error('Unsupported attachment provider.');
    if (!validMediaType(mediaType)) throw new Error('This file type is not supported for chat attachments.');
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_FILE_BYTES) throw new Error('Attachments must be between 1 byte and 8 MB.');
    if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) throw new Error('Invalid attachment digest.');
    const staged = [...this.records.values()].filter(item => !item.accepted);
    const incomplete = staged.filter(item => item.fd !== null);
    const deviceStage = staged.filter(item => item.deviceId === deviceId);
    const batch = [...this.records.values()].filter(item => item.deviceId === deviceId && item.messageId === messageId);
    if (batch.length >= MAX_BATCH_FILES || batch.reduce((total, item) => total + item.size, 0) + size > MAX_BATCH_BYTES) throw new Error('This message exceeds the attachment batch limit.');
    if (incomplete.length >= MAX_INCOMPLETE || incomplete.filter(item => item.deviceId === deviceId).length >= MAX_INCOMPLETE_PER_DEVICE ||
        staged.length >= MAX_PENDING || deviceStage.length >= MAX_PER_DEVICE ||
        staged.reduce((total, item) => total + item.size, 0) + size > MAX_PENDING_BYTES ||
        deviceStage.reduce((total, item) => total + item.size, 0) + size > MAX_PER_DEVICE_BYTES) throw new Error('Too many attachments are being prepared. Finish or remove one first.');
    const id = randomUUID(), file = path.join(this.root, id);
    const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0), 0o600);
    const record = { id, path: file, fd, inode: fs.fstatSync(fd).ino, chatId, deviceId, messageId, providerId, name, mediaType, size, sha256, received: 0, nextIndex: 0, finished: false, expiresAt: this.clock() + TTL_MS };
    this.records.set(id, record); this.touchBatch(record);
    return { uploadId: id, chunkSize: CHUNK_BYTES, expiresAt: new Date(record.expiresAt).toISOString() };
  }
  async chunk({ uploadId, deviceId, index, dataBase64 } = {}) {
    this.ensureOpen();
    const record = this.records.get(uploadId); if (!record || record.deviceId !== identity(deviceId, 'device') || record.finished) throw new Error('Attachment upload is unavailable.');
    if (!Number.isSafeInteger(index) || index !== record.nextIndex) throw new Error('Attachment chunks must arrive in order.');
    const bytes = decodedChunk(dataBase64);
    if (record.received + bytes.length > record.size) throw new Error('Attachment exceeds its declared size.');
    let written = 0;
    while (written < bytes.length) { const count = fs.writeSync(record.fd, bytes, written, bytes.length - written, null); if (count <= 0) throw new Error('Attachment write failed.'); written += count; }
    record.received += bytes.length; record.nextIndex += 1; this.touchBatch(record);
    return { uploadId, received: record.received, nextIndex: record.nextIndex };
  }
  async finish({ uploadId, deviceId } = {}) {
    this.ensureOpen();
    const record = this.records.get(uploadId); if (!record || record.deviceId !== identity(deviceId, 'device') || record.finished) throw new Error('Attachment upload is unavailable.');
    if (record.received !== record.size) throw new Error('Attachment upload is incomplete.');
    fs.fsyncSync(record.fd); fs.closeSync(record.fd); record.fd = null;
    const bytes = readStaged(record);
    if (bytes.length !== record.size || createHash('sha256').update(bytes).digest('hex') !== record.sha256 || !fileType(bytes, record.mediaType)) { this.remove(record); throw new Error('Attachment bytes did not match the declared file, type or digest.'); }
    record.finished = true; this.touchBatch(record);
    return { attachmentId: record.id, name: record.name, mediaType: record.mediaType, size: record.size, sha256: record.sha256 };
  }
  /** Rebind a finished, still-staged first-message file after the host creates its chat. */
  async claimDraft({ attachmentId, draftId, chatId, deviceId, messageId, providerId } = {}) {
    this.ensureOpen();
    const record = this.records.get(attachmentId);
    if (!record || !record.finished || record.accepted) throw new Error('Draft attachment is unavailable or already accepted.');
    if (record.chatId !== `draft:${identity(draftId, 'draft')}` || record.deviceId !== identity(deviceId, 'device') || record.messageId !== identity(messageId, 'message') || record.providerId !== identity(providerId, 'provider')) throw new Error('This attachment belongs to another draft, device, message or provider.');
    chatId = identity(chatId, 'chat');
    if (chatId.startsWith('draft:')) throw new Error('A created chat is required to claim an attachment.');
    this.verify(record);
    record.chatId = chatId;
    return { attachmentId: record.id, name: record.name, mediaType: record.mediaType, size: record.size, sha256: record.sha256 };
  }
  async resolve({ attachmentId, chatId, deviceId, messageId, providerId } = {}) {
    this.ensureOpen();
    const record = this.records.get(attachmentId); if (!record || !record.finished) throw new Error('Attachment is unavailable or expired.');
    this.bound(record, { chatId, deviceId, messageId, providerId });
    this.verify(record);
    return { path: record.path, name: record.name, mediaType: record.mediaType, size: record.size, sha256: record.sha256 };
  }
  verify(record) {
    const bytes = readStaged(record);
    if (createHash('sha256').update(bytes).digest('hex') !== record.sha256 || !fileType(bytes, record.mediaType)) throw new Error('Staged attachment changed.');
    return bytes;
  }
  async read({ attachmentId, chatId, deviceId, messageId, providerId } = {}) {
    this.ensureOpen();
    const record = this.records.get(attachmentId); if (!record || !record.finished) throw new Error('Attachment is unavailable or expired.');
    this.bound(record, { chatId, deviceId, messageId, providerId });
    return { bytes: this.verify(record), name: record.name, mediaType: record.mediaType, size: record.size, sha256: record.sha256 };
  }
  async accept({ attachmentId, chatId, deviceId, messageId, providerId } = {}) {
    this.ensureOpen();
    const record = this.records.get(attachmentId); if (!record || !record.finished) throw new Error('Attachment is unavailable or expired.');
    this.bound(record, { chatId, deviceId, messageId, providerId }); this.verify(record);
    if (record.accepted) return { attachmentId: record.id, name: record.name, mediaType: record.mediaType, size: record.size, sha256: record.sha256 };
    const target = path.join(this.acceptedRoot, record.id), metadata = target + '.json';
    const manifest = { id: record.id, chatId: record.chatId, deviceId: record.deviceId, messageId: record.messageId, providerId: record.providerId, name: record.name, mediaType: record.mediaType, size: record.size, sha256: record.sha256 };
    fs.writeFileSync(metadata, JSON.stringify(manifest), { flag: 'wx', mode: 0o600 });
    try { fs.renameSync(record.path, target); fs.chmodSync(target, 0o400); }
    catch (error) { fs.rmSync(metadata, { force: true }); throw error; }
    record.path = target; record.accepted = true; record.expiresAt = Infinity;
    return { attachmentId: record.id, name: record.name, mediaType: record.mediaType, size: record.size, sha256: record.sha256 };
  }
  async release({ attachmentId, chatId, deviceId, messageId, providerId } = {}) {
    this.ensureOpen();
    const record = this.records.get(attachmentId); if (!record) return false;
    this.bound(record, { chatId, deviceId, messageId, providerId }); this.remove(record); return true;
  }
  async revokeDevice(deviceId) {
    this.ensureOpen(); deviceId = identity(deviceId, 'device');
    for (const record of [...this.records.values()]) if (record.deviceId === deviceId) this.remove(record);
  }
  /** Delivered message files are kept with their chat (content-addressed, read-only)
   * so every client that can read the chat can view them. Deleted with the chat. */
  historyDirectory(chatId) { return path.join(this.base, 'history', identity(chatId, 'chat')); }
  async preserve({ attachmentId } = {}, chatId) {
    const record = this.records.get(attachmentId); if (!record?.finished || !/^[a-f0-9]{64}$/.test(record.sha256)) return false;
    const directory = this.historyDirectory(chatId), target = path.join(directory, record.sha256);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (fs.existsSync(target)) return true;
    const bytes = this.verify(record), temporary = target + '.' + randomUUID() + '.tmp';
    try { fs.writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o400 }); fs.renameSync(temporary, target); } finally { fs.rmSync(temporary, { force: true }); }
    return true;
  }
  /** Bytes of a preserved message file; callers verify the chat references it. */
  history(chatId, sha256) {
    if (!/^[a-f0-9]{64}$/.test(String(sha256))) throw new Error('Choose an attachment from this chat.');
    const file = path.join(this.historyDirectory(chatId), sha256);
    let bytes; try { bytes = fs.readFileSync(file); } catch { throw new Error('This attachment was not kept with the chat.'); }
    if (createHash('sha256').update(bytes).digest('hex') !== sha256) throw new Error('The saved attachment changed and was not opened.');
    return bytes;
  }
  async revokeChat(chatId) {
    this.ensureOpen(); chatId = identity(chatId, 'chat');
    fs.rmSync(this.historyDirectory(chatId), { recursive: true, force: true });
    for (const record of [...this.records.values()]) if (record.chatId === chatId) this.remove(record);
  }
  async close() {
    if (this.closed) return;
    clearInterval(this.timer);
    for (const record of [...this.records.values()]) if (!record.finished) this.remove(record);
    this.records.clear(); this.closed = true;
    try { if (fs.readdirSync(this.root).length === 0) fs.rmdirSync(this.root); } catch { /* Finished uploads age out on next startup. */ }
  }
}

export const chatAttachmentLimits = Object.freeze({ maxFileBytes: MAX_FILE_BYTES, maxBatchFiles: MAX_BATCH_FILES, maxBatchBytes: MAX_BATCH_BYTES, chunkBytes: CHUNK_BYTES, ttlMs: TTL_MS, maxPending: MAX_PENDING, maxPerDevice: MAX_PER_DEVICE, maxPendingBytes: MAX_PENDING_BYTES, maxPerDeviceBytes: MAX_PER_DEVICE_BYTES, maxIncomplete: MAX_INCOMPLETE, maxIncompletePerDevice: MAX_INCOMPLETE_PER_DEVICE });
