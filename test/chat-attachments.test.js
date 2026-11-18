import {assertPrivate} from './helpers/permissions.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ChatAttachmentStore, chatAttachmentLimits } from '../src/services/chats/chat-attachments.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLytQAAAABJRU5ErkJggg==', 'base64');
const digest = value => createHash('sha256').update(value).digest('hex');
const owner = { chatId: 'chat-1', deviceId: 'device-1', messageId: 'message-1', providerId: 'codex' };

async function fixture(run) {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-attachments-test-'));
  const store = new ChatAttachmentStore(home);
  try { await run(store, home); } finally { await store.close(); fs.rmSync(home, { recursive: true, force: true }); }
}

test('stages bounded bytes under private paths and binds a finished image to its message', async () => fixture(async (store, home) => {
  const begin = await store.begin({ ...owner, name: 'image.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
  assert.equal(begin.chunkSize, chatAttachmentLimits.chunkBytes);
  await store.chunk({ uploadId: begin.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.subarray(0, 32).toString('base64') });
  await store.chunk({ uploadId: begin.uploadId, deviceId: owner.deviceId, index: 1, dataBase64: png.subarray(32).toString('base64') });
  const finished = await store.finish({ uploadId: begin.uploadId, deviceId: owner.deviceId });
  assert.equal(finished.sha256, digest(png));
  await assert.rejects(store.resolve({ attachmentId: finished.attachmentId, ...owner, messageId: 'another-message' }), /another chat, device, message or provider/);
  await assert.rejects(store.resolve({ attachmentId: finished.attachmentId, ...owner, deviceId: 'another-device' }), /another chat, device, message or provider/);
  await assert.rejects(store.read({ attachmentId: finished.attachmentId, ...owner, providerId: 'claude' }), /another chat, device, message or provider/);
  const resolved = await store.resolve({ attachmentId: finished.attachmentId, ...owner });
  assert.deepEqual(fs.readFileSync(resolved.path), png);
  assert.equal(path.dirname(path.dirname(resolved.path)), path.join(home, 'chat-attachments'));
  assertPrivate(path.dirname(resolved.path),0o700);
  assertPrivate(resolved.path,0o600);
  assert.equal(await store.release({ attachmentId: finished.attachmentId, ...owner }), true);
  assert.equal(fs.existsSync(resolved.path), false);
}));

test('rejects out-of-order, invalid, beyond-disk, mismatched and disguised uploads', async () => fixture(async store => {
  await assert.rejects(store.begin({ ...owner, providerId: 'rehearsal', name: 'image.png', mediaType: 'image/png', size: png.length, sha256: digest(png) }), /provider/);
  await assert.rejects(store.begin({ ...owner, name: '../secret', mediaType: 'image/png', size: png.length, sha256: digest(png) }), /filename/);
  await assert.rejects(store.begin({ ...owner, name: 'malformed.bin', mediaType: 'not a media type', size: png.length, sha256: digest(png) }), /not supported/);
  assert.equal(chatAttachmentLimits.maxFileBytes, null, 'N11-18: no per-file size cap');
  await assert.rejects(store.begin({ ...owner, name: 'negative.png', mediaType: 'image/png', size: -1, sha256: digest(png) }), /valid size/);
  await assert.rejects(store.begin({ ...owner, name: 'beyond-disk.bin', mediaType: 'application/octet-stream', size: Number.MAX_SAFE_INTEGER, sha256: digest(png) }), /free disk space/);
  const pending = await store.begin({ ...owner, name: 'image.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
  await assert.rejects(store.chunk({ uploadId: pending.uploadId, deviceId: owner.deviceId, index: 1, dataBase64: png.toString('base64') }), /in order/);
  await assert.rejects(store.chunk({ uploadId: pending.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: Buffer.alloc(png.length + 1).toString('base64') }), /declared size/);
  await assert.rejects(store.chunk({ uploadId: pending.uploadId, deviceId: 'other', index: 0, dataBase64: png.toString('base64') }), /unavailable/);
  await store.chunk({ uploadId: pending.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.toString('base64') });
  await assert.rejects(store.chunk({ uploadId: pending.uploadId, deviceId: owner.deviceId, index: 1, dataBase64: png.toString('base64') }), /declared size/);
  await store.finish({ uploadId: pending.uploadId, deviceId: owner.deviceId });
  const fake = Buffer.from('plain text');
  const disguised = await store.begin({ ...owner, name: 'fake.png', mediaType: 'image/png', size: fake.length, sha256: digest(fake) });
  await store.chunk({ uploadId: disguised.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: fake.toString('base64') });
  await assert.rejects(store.finish({ uploadId: disguised.uploadId, deviceId: owner.deviceId }), /did not match/);
  const badHash = await store.begin({ ...owner, name: 'bad.png', mediaType: 'image/png', size: png.length, sha256: '0'.repeat(64) });
  await store.chunk({ uploadId: badHash.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.toString('base64') });
  await assert.rejects(store.finish({ uploadId: badHash.uploadId, deviceId: owner.deviceId }), /did not match/);
}));

test('expires staged bytes and revokes every attachment owned by one device', async () => {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-attachments-test-'));
  let now = Date.now(); const store = new ChatAttachmentStore(home, { clock: () => now });
  try {
    const first = await store.begin({ ...owner, name: 'one.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
    await store.chunk({ uploadId: first.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.toString('base64') });
    const finished = await store.finish({ uploadId: first.uploadId, deviceId: owner.deviceId });
    const second = await store.begin({ ...owner, deviceId: 'device-2', name: 'two.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
    await store.revokeDevice(owner.deviceId);
    await assert.rejects(store.resolve({ attachmentId: finished.attachmentId, ...owner }), /unavailable/);
    assert.equal(store.records.has(second.uploadId), true);
    now += chatAttachmentLimits.ttlMs + 1; store.cleanup();
    assert.equal(store.records.size, 0);
  } finally { await store.close(); fs.rmSync(home, { recursive: true, force: true }); }
});

test('accepted queued bytes survive staging TTL and restart until provider release', async () => {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-attachments-test-'));
  let now = Date.now(); let store = new ChatAttachmentStore(home, { clock: () => now });
  try {
    const begun = await store.begin({ ...owner, name: 'queued.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
    await store.chunk({ uploadId: begun.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.toString('base64') });
    const finished = await store.finish({ uploadId: begun.uploadId, deviceId: owner.deviceId });
    await store.accept({ attachmentId: finished.attachmentId, ...owner });
    now += chatAttachmentLimits.ttlMs + 1; store.cleanup();
    assert.deepEqual((await store.read({ attachmentId: finished.attachmentId, ...owner })).bytes, png);
    await store.close(); store = new ChatAttachmentStore(home, { clock: () => now });
    const fromRestart = await store.read({ attachmentId: finished.attachmentId, ...owner });
    assert.deepEqual(fromRestart.bytes, png);
    assert.equal(await store.release({ attachmentId: finished.attachmentId, ...owner }), true);
    await assert.rejects(store.read({ attachmentId: finished.attachmentId, ...owner }), /unavailable/);
  } finally { await store.close(); fs.rmSync(home, { recursive: true, force: true }); }
});

test('same-size tampering fails the final provider byte read and a revoked device loses accepted bytes', async () => fixture(async store => {
  const begun = await store.begin({ ...owner, name: 'image.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
  await store.chunk({ uploadId: begun.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.toString('base64') });
  const finished = await store.finish({ uploadId: begun.uploadId, deviceId: owner.deviceId });
  await store.accept({ attachmentId: finished.attachmentId, ...owner });
  const resolved = await store.resolve({ attachmentId: finished.attachmentId, ...owner });
  const changed = Buffer.from(png); changed[20] ^= 1;
  fs.chmodSync(resolved.path, 0o600); fs.writeFileSync(resolved.path, changed);
  await assert.rejects(store.read({ attachmentId: finished.attachmentId, ...owner }), /changed/);
  await assert.rejects(store.resolve({ attachmentId: finished.attachmentId, ...owner }), /changed/);
  await store.revokeDevice(owner.deviceId);
  await assert.rejects(store.read({ attachmentId: finished.attachmentId, ...owner }), /unavailable/);
}));

test('first-message attachment is claimed only by its draft owner and provider', async () => fixture(async store => {
  const draft = { ...owner, chatId: 'draft:created-chat-request' };
  const begun = await store.begin({ ...draft, name: 'first.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
  await store.chunk({ uploadId: begun.uploadId, deviceId: draft.deviceId, index: 0, dataBase64: png.toString('base64') });
  const finished = await store.finish({ uploadId: begun.uploadId, deviceId: draft.deviceId });
  const claim = { attachmentId: finished.attachmentId, draftId: 'created-chat-request', ...owner };
  await assert.rejects(store.claimDraft({ ...claim, providerId: 'claude' }), /another draft, device, message or provider/);
  await assert.rejects(store.claimDraft({ ...claim, draftId: 'other' }), /another draft, device, message or provider/);
  await store.claimDraft(claim);
  await assert.rejects(store.claimDraft(claim), /another draft, device, message or provider/);
  await store.accept({ attachmentId: finished.attachmentId, ...owner });
  assert.deepEqual((await store.read({ attachmentId: finished.attachmentId, ...owner })).bytes, png);
}));

test('deleting one chat revokes staged and accepted bytes without touching another chat', async () => fixture(async store => {
  const staged = await store.begin({ ...owner, name: 'pending.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
  const accepted = await store.begin({ ...owner, messageId: 'accepted-message', name: 'accepted.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
  await store.chunk({ uploadId: accepted.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.toString('base64') });
  const finished = await store.finish({ uploadId: accepted.uploadId, deviceId: owner.deviceId });
  await store.accept({ attachmentId: finished.attachmentId, ...owner, messageId: 'accepted-message' });
  const other = await store.begin({ ...owner, chatId: 'chat-2', name: 'other.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
  await store.revokeChat(owner.chatId);
  await assert.rejects(store.chunk({ uploadId: staged.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.toString('base64') }), /unavailable/);
  await assert.rejects(store.read({ attachmentId: finished.attachmentId, ...owner, messageId: 'accepted-message' }), /unavailable/);
  assert.equal(store.records.has(other.uploadId), true);
}));

test('one message accepts 256 tiny files, rejects a 257th and has no aggregate byte cap', async () => fixture(async store => {
  assert.equal(chatAttachmentLimits.maxBatchFiles, 256);
  assert.equal(chatAttachmentLimits.maxBatchBytes, null);
  for (let index = 0; index < chatAttachmentLimits.maxBatchFiles; index++) {
    const started = await store.begin({ ...owner, name: `tiny-${index}.png`, mediaType: 'image/png', size: png.length, sha256: digest(png) });
    await store.chunk({ uploadId: started.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.toString('base64') });
    await store.finish({ uploadId: started.uploadId, deviceId: owner.deviceId });
  }
  await assert.rejects(store.begin({ ...owner, name: 'too-many.png', mediaType: 'image/png', size: png.length, sha256: digest(png) }), /maximum number/);
  await store.revokeChat(owner.chatId);
  // Five 9 MiB files in one message exceed every former per-file and aggregate cap.
  const large = Buffer.alloc(9 * 1024 * 1024, 65), largeHash = digest(large);
  for (let index = 0; index < 5; index++) {
    const started = await store.begin({ ...owner, messageId: 'large-message', name: `large-${index}.txt`, mediaType: 'text/plain', size: large.length, sha256: largeHash });
    for (let offset = 0, chunkIndex = 0; offset < large.length; offset += chatAttachmentLimits.chunkBytes, chunkIndex++) await store.chunk({ uploadId: started.uploadId, deviceId: owner.deviceId, index: chunkIndex, dataBase64: large.subarray(offset, offset + chatAttachmentLimits.chunkBytes).toString('base64') });
    const finished = await store.finish({ uploadId: started.uploadId, deviceId: owner.deviceId });
    assert.equal(finished.size, large.length);
  }
}));


test('active sequential upload refreshes earlier files but an idle batch expires', async () => {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-attachments-sliding-'));
  let now = Date.now(); const store = new ChatAttachmentStore(home, { clock: () => now });
  try {
    const first = await store.begin({ ...owner, name: 'first.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
    await store.chunk({ uploadId: first.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.toString('base64') });
    const firstFile = await store.finish({ uploadId: first.uploadId, deviceId: owner.deviceId });
    now += chatAttachmentLimits.ttlMs - 1;
    const second = await store.begin({ ...owner, name: 'second.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
    now += chatAttachmentLimits.ttlMs - 1;
    await store.chunk({ uploadId: second.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.toString('base64') });
    await store.finish({ uploadId: second.uploadId, deviceId: owner.deviceId });
    assert.deepEqual((await store.read({ attachmentId: firstFile.attachmentId, ...owner })).bytes, png);
    now += chatAttachmentLimits.ttlMs + 1; store.cleanup();
    await assert.rejects(store.read({ attachmentId: firstFile.attachmentId, ...owner }), /unavailable/);
  } finally { await store.close(); fs.rmSync(home, { recursive: true, force: true }); }
});

test('large files are verified and delivered from disk without a byte cap', async () => fixture(async store => {
  assert.equal(chatAttachmentLimits.maxPendingBytes, undefined);
  const large = Buffer.alloc(21 * 1024 * 1024, 0x42); large.write('%PDF-1.7', 0); const largeHash = digest(large);
  const started = await store.begin({ ...owner, name: 'manual.pdf', mediaType: 'application/pdf', size: large.length, sha256: largeHash });
  for (let offset = 0, chunkIndex = 0; offset < large.length; offset += chatAttachmentLimits.chunkBytes, chunkIndex++) await store.chunk({ uploadId: started.uploadId, deviceId: owner.deviceId, index: chunkIndex, dataBase64: large.subarray(offset, offset + chatAttachmentLimits.chunkBytes).toString('base64') });
  const finished = await store.finish({ uploadId: started.uploadId, deviceId: owner.deviceId });
  const file = await store.read({ attachmentId: finished.attachmentId, ...owner });
  assert.equal(file.size, large.length);
  assert.deepEqual(file.readRange(large.length - 4, 4), large.subarray(-4), 'pages read from disk');
  const {providerAttachmentInputs} = await import('../src/services/chats/attachment-input.js');
  const [input] = providerAttachmentInputs([file], ['application/pdf', 'image/png', 'text/plain']);
  assert.equal(input.mediaType, 'text/plain', 'files above the inline budget become a paged reference');
  assert.match(input.bytes.toString(), new RegExp('size: ' + large.length + ' bytes; SHA-256: ' + largeHash));
}));



test('incomplete uploads retain the low open-file-descriptor concurrency caps', async () => fixture(async store => {
  for (let index = 0; index < chatAttachmentLimits.maxIncompletePerDevice; index++) {
    await store.begin({ ...owner, name: `open-${index}.png`, mediaType: 'image/png', size: png.length, sha256: digest(png) });
  }
  await assert.rejects(store.begin({ ...owner, name: 'fifth-open.png', mediaType: 'image/png', size: png.length, sha256: digest(png) }), /Too many attachments/);
  for (let device = 1; device < 4; device++) {
    for (let index = 0; index < chatAttachmentLimits.maxIncompletePerDevice; index++) {
      await store.begin({ ...owner, deviceId: `extra-device-${device}`, name: `open-${device}-${index}.png`, mediaType: 'image/png', size: png.length, sha256: digest(png) });
    }
  }
  assert.equal(chatAttachmentLimits.maxIncomplete, 16);
  await assert.rejects(store.begin({ ...owner, deviceId: 'device-4', name: 'seventeenth-open.png', mediaType: 'image/png', size: png.length, sha256: digest(png) }), /Too many attachments/);
}));

// N11-34: a delivered file is viewable with its chat before the turn ends, and a still-held
// accepted record serves the same chat/digest while history copying has not happened yet.
test('message files are viewable with their chat before the turn finishes', async () => fixture(async store => {
  const started = await store.begin({ ...owner, name: 'photo.png', mediaType: 'image/png', size: png.length, sha256: digest(png) });
  await store.chunk({ uploadId: started.uploadId, deviceId: owner.deviceId, index: 0, dataBase64: png.toString('base64') });
  const finished = await store.finish({ uploadId: started.uploadId, deviceId: owner.deviceId });
  await store.accept({ attachmentId: finished.attachmentId, ...owner });
  const held = store.historyFile(owner.chatId, digest(png));
  assert.deepEqual(held.readRange(0, png.length), png, 'served from the accepted record');
  assert.throws(() => store.historyFile('another-chat', digest(png)), /not kept/);
  await store.preserve({ attachmentId: finished.attachmentId }, owner.chatId);
  assert.ok(fs.existsSync(path.join(store.historyDirectory(owner.chatId), digest(png))));
}));
