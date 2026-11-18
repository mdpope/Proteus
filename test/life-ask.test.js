// Life Ask contract v1 (docs/life-ask.md): admission validation, exactly-once identity,
// permanent tombstones and the host-enforced `mnemosyne.ask` relay scope. Synthetic audio only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { LifeAskStore, inspectWav, legacyEnvelope, validateAdmission, admissionFromLegacy } from '../src/services/life/life-ask.js';
import { startServer } from '../src/server.js';
import { startRelay } from '../relay/server.js';
import { secret } from '../src/services/remote/remote-crypto.js';
import { RemoteClient, until } from './remote-client.mjs';
import { privateTemporaryDirectory } from '../src/shared/private-paths.cjs';
import { cleanupStack } from './helpers/cleanup.js';

const ACCOUNT = 'a'.repeat(64);
function wav({ seconds = 2, rate = 16000, amplitude = 4000 } = {}) {
  const samples = Math.round(seconds * rate), data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) data.writeInt16LE(Math.round(amplitude * Math.sin(i / 8)), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8); header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
function request(hostID, overrides = {}, audio = wav()) {
  const now = Date.now();
  return { version: 1, requestId: randomUUID(), executionOwner: 'proteus-life', accountID: ACCOUNT, hostID, device: { id: 'pendant-1', name: 'Omi' }, audio: { format: 'wav', sampleRate: 16000, channels: 1, bitsPerSample: 16, bytes: audio.length, sha256: createHash('sha256').update(audio).digest('hex'), data: audio.toString('base64') }, times: { captureStartedAt: now - 4000, captureEndedAt: now - 2000, finalizedAt: now - 1900, sentAt: now - 1800 }, endReason: 'double-tap', appVersion: '0.6.0(31)', ...overrides };
}
function store(t, options = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-life-ask-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hostId = randomUUID(), admitted = [];
  const value = new LifeAskStore(home, { identity: () => ({ accountId: ACCOUNT }), hostId: () => hostId, enabled: () => true, onAdmitted: receipt => admitted.push(receipt), ...options });
  return { home, hostId, store: value, admitted };
}

test('WAV inspection accepts mono 16-bit 8/16 kHz and rejects quiet, long and unsupported audio', () => {
  assert.equal(inspectWav(wav()).sampleRate, 16000);
  assert.equal(inspectWav(wav({ rate: 8000 })).durationMs, 2000);
  assert.throws(() => inspectWav(wav({ amplitude: 10 })), error => error.reason === 'quiet');
  assert.throws(() => inspectWav(wav({ seconds: 62, rate: 8000 })), error => error.reason === 'too-large');
  const stereo = wav(); stereo.writeUInt16LE(2, 22);
  assert.throws(() => inspectWav(stereo), error => error.reason === 'unsupported-format');
  assert.throws(() => inspectWav(Buffer.from('not audio at all, definitely not RIFF data here....')), error => error.reason === 'unsupported-format');
});

test('thirty-day compaction keeps replay identity, pending effects and human chat files',async t=>{
  let now=Date.now();const f=store(t,{now:()=>now}),completed=request(f.hostId),pending=request(f.hostId),recent=request(f.hostId);
  const original=await f.store.admit(completed);await f.store.admit(pending);await f.store.admit(recent);
  f.store.update(completed.requestId,{state:'answered',effectsComplete:true,chatId:randomUUID(),times:{answeredAt:now}});
  f.store.update(pending.requestId,{state:'answered',effectsComplete:false,times:{answeredAt:now}});
  const directory=f.store.directory(completed.requestId);fs.mkdirSync(path.join(directory,'workspace'));fs.writeFileSync(path.join(directory,'workspace','human-note.md'),'Preserve this');fs.writeFileSync(path.join(directory,'unknown.json'),'Preserve this too');
  now+=31*24*60*60*1000;f.store.update(recent.requestId,{state:'answered',effectsComplete:true,times:{answeredAt:now}});
  assert.equal(f.store.compact().requests,1);assert.equal(fs.existsSync(path.join(directory,'audio.wav')),false);assert.equal(fs.existsSync(path.join(directory,'request.json')),false);
  assert.equal(fs.readFileSync(path.join(directory,'workspace','human-note.md'),'utf8'),'Preserve this');assert.equal(fs.readFileSync(path.join(directory,'unknown.json'),'utf8'),'Preserve this too');
  for(const item of [pending,recent])assert.equal(fs.existsSync(path.join(f.store.directory(item.requestId),'audio.wav')),true);
  const replay=await f.store.admit(completed);assert.equal(replay.state,'duplicate');assert.equal(replay.receiptId,original.receiptId);assert.equal(f.admitted.length,3);assert.equal(f.store.compact().requests,0);
});

test('compaction is account-bound and resumes partial unlinks without following symbolic links',async t=>{
  let now=Date.now(),account=ACCOUNT;const f=store(t,{now:()=>now,identity:()=>({accountId:account})}),value=request(f.hostId);await f.store.admit(value);
  f.store.update(value.requestId,{state:'answered',effectsComplete:true,times:{answeredAt:now}});now+=31*24*60*60*1000;
  account='other';assert.equal(f.store.compact().requests,0);account=ACCOUNT;
  const directory=f.store.directory(value.requestId),outside=path.join(f.home,'retained.json');fs.writeFileSync(outside,'retained');fs.symlinkSync(outside,path.join(directory,'transcript.json'));
  assert.throws(()=>f.store.compact(),/unexpected file/);assert.equal(fs.readFileSync(outside,'utf8'),'retained');assert.ok(f.store.read(value.requestId));
  fs.unlinkSync(path.join(directory,'transcript.json'));assert.equal(f.store.compact().requests,1);assert.equal((await f.store.admit(value)).state,'duplicate');
});

test('admission validates binding, size and hash, and never accepts unbound or interrupted requests', () => {
  const hostID = randomUUID();
  assert.equal(validateAdmission(request(hostID)).hostID, hostID);
  assert.throws(() => validateAdmission(request(hostID, { executionOwner: undefined })), error => error.reason === 'account-mismatch');
  assert.throws(() => validateAdmission(request(hostID, { endReason: 'interrupted' })), error => error.reason === 'interrupted');
  const tampered = request(hostID); tampered.audio.sha256 = 'f'.repeat(64);
  assert.throws(() => validateAdmission(tampered), error => error.reason === 'malformed');
  const legacy = legacyEnvelope(validateAdmission(request(hostID)), 'AAAA');
  assert.deepEqual(Object.keys(legacy).sort(), ['accountID', 'audio', 'audioDigest', 'device', 'endedAt', 'executionOwner', 'hostID', 'id', 'sampleRate', 'startedAt', 'status', 'version'].sort());
  assert.equal(legacy.executionOwner, 'proteus-life');
  assert.equal(legacy.audioDigest.bytes,wav().length);
});

test('one request is admitted exactly once; retries are duplicates and hash changes are conflicts', async t => {
  const { store: asks, hostId, admitted } = store(t), value = request(hostId);
  const [first, concurrent] = await Promise.all([asks.admit(value), asks.admit(structuredClone(value))]);
  assert.deepEqual([first.state, concurrent.state].sort(), ['accepted', 'duplicate']);
  assert.equal(admitted.length, 1, 'concurrent retries start one execution');
  assert.equal(admitted[0].audioBytes,value.audio.bytes);
  const retry = await asks.admit({ ...value, attempt: { n: 2, at: Date.now() } });
  assert.equal(retry.state, 'duplicate'); assert.equal(retry.receiptId, first.receiptId);
  for (const key of ['requestId', 'audioSha256', 'accountID', 'hostID']) assert.equal(retry[key], first[key] ?? concurrent[key]);
  const other = request(hostId, { requestId: value.requestId }, wav({ seconds: 3 }));
  const conflict = await asks.admit(other);
  assert.equal(conflict.state, 'conflict'); assert.equal(conflict.reason, 'conflict'); assert.equal(admitted.length, 1);
  assert.equal(asks.status([value.requestId]).items[0].state, 'received');
  assert.equal(asks.status([randomUUID()]).items[0].state, 'unknown');
});

test('account, host and enablement mismatches reject without storing anything', async t => {
  const { store: asks, hostId, home } = store(t);
  assert.equal((await asks.admit(request(hostId, { accountID: 'b'.repeat(64) }))).reason, 'account-mismatch');
  assert.equal((await asks.admit(request(randomUUID()))).reason, 'account-mismatch');
  asks.enabled = () => false;
  assert.equal((await asks.admit(request(hostId))).reason, 'disabled');
  assert.equal(fs.existsSync(path.join(home, 'life-ask')) ? fs.readdirSync(path.join(home, 'life-ask')).length : 0, 0);
});

test('a permanent tombstone keeps deduplicating after the audio is retired', async t => {
  const { store: asks, hostId, home } = store(t), value = request(hostId), first = await asks.admit(value);
  fs.rmSync(path.join(home, 'life-ask', value.requestId, 'audio.wav'));
  fs.rmSync(path.join(home, 'life-ask', value.requestId, 'request.json'));
  const replay = await asks.admit(value);
  assert.equal(replay.state, 'duplicate'); assert.equal(replay.receiptId, first.receiptId);
});

test('terminal receipts echo submitted binding, have IDs, and never expose another account receipt', async t => {
  let account=ACCOUNT;
  const {store:asks,hostId}=store(t,{identity:()=>({accountId:account})});
  const original=request(hostId),accepted=await asks.admit(original);
  const conflicting=request(hostId,{requestId:original.requestId},wav({seconds:3}));
  const conflict=await asks.admit(conflicting);
  assert.equal(conflict.state,'conflict');assert.ok(conflict.receiptId);
  assert.equal(conflict.audioSha256,conflicting.audio.sha256);
  assert.equal(conflict.existingAudioSha256,original.audio.sha256);
  for(const key of ['requestId','accountID','hostID'])assert.equal(conflict[key],conflicting[key]);
  const malformed=structuredClone(original);malformed.audio.data='invalid';
  const rejected=await asks.admit(malformed);assert.equal(rejected.state,'rejected');assert.ok(rejected.receiptId);
  account='b'.repeat(64);
  const read=asks.read.bind(asks);let lookups=0;asks.read=id=>{lookups++;return read(id);};
  for(const source of ['relay','icloud']){const stale=await asks.admit(original,{source});assert.equal(stale.reason,'account-mismatch');assert.ok(stale.receiptId);assert.notEqual(stale.receiptId,accepted.receiptId);}
  assert.equal(lookups,0,'old binding is rejected before a receipt lookup');
  assert.deepEqual(asks.status([original.requestId]),{items:[{requestId:original.requestId,state:'unknown'}]});
  assert.deepEqual(asks.unfinished(),[]);
  const reused=await asks.admit({...original,accountID:account});assert.equal(reused.reason,'account-mismatch');assert.equal(reused.accountID,account);assert.equal(reused.chatId,null);
  account=ACCOUNT;assert.equal((await asks.admit(original)).receiptId,accepted.receiptId);
  asks.hostId=()=>randomUUID();assert.equal((await asks.admit(original)).reason,'account-mismatch');assert.equal(asks.status([original.requestId]).items[0].state,'unknown');
});

test('optional latency times are omitted rather than null and invalid supplied wire times reject', async t=>{
  const {store:asks,hostId}=store(t),value=request(hostId);
  delete value.times.finalizedAt;delete value.times.sentAt;
  assert.deepEqual(validateAdmission(value).times,value.times);
  const accepted=await asks.admit(value);assert.ok(accepted.receiptId);
  asks.update(value.requestId,{times:{firstOutputAt:null,answeredAt:1.25}});
  const status=asks.status([value.requestId]).items[0];assert.equal(status.receiptId,accepted.receiptId);
  assert.ok(Object.values(status.times).every(time=>Number.isSafeInteger(time)&&time>0));
  for(const bad of [null,0,1.25,Infinity,'123']){const next=request(hostId);next.times.sentAt=bad;assert.equal((await asks.admit(next)).reason,'malformed');}
});

test('legacy iCloud conversion rounds fractional milliseconds without rebinding old requests',async t=>{
  const {store:asks,hostId}=store(t),wire=request(hostId),legacy=legacyEnvelope(validateAdmission(wire),wire.audio.data);
  legacy.startedAt+=0.25;legacy.endedAt+=0.75;
  const converted=admissionFromLegacy(legacy);
  assert.equal(converted.times.captureStartedAt,Math.round(legacy.startedAt));
  assert.equal(converted.times.captureEndedAt,Math.round(legacy.endedAt));
  assert.equal(converted.times.finalizedAt,converted.times.captureEndedAt);
  assert.equal(converted.times.sentAt,converted.times.finalizedAt);
  assert.equal((await asks.admit(converted,{source:'icloud'})).state,'accepted');
  assert.equal((await asks.admit(wire)).state,'duplicate');
  const unbound=admissionFromLegacy({...legacy,accountID:undefined,hostID:undefined});
  assert.equal((await asks.admit(unbound,{source:'icloud'})).reason,'account-mismatch');
});

test('relay: a life-ask invitation creates a scoped device limited to Life Ask methods and results', async t => {
  const cleanup = cleanupStack(t), token = secret(), home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-life-ask-relay-'));
  cleanup(() => fs.rmSync(home, { recursive: true, force: true }));
  const relay = await startRelay({ port: 0, token }); cleanup(() => relay.close());
  const app = await startServer({ home, port: 0, timers: false, providers: {} }); cleanup(() => app.close());
  const clients = []; cleanup(() => { for (const client of clients) client.close(); });
  const url = 'ws://127.0.0.1:' + relay.port;
  await app.remote.configure({ enabled: true, mode: 'external', relayURL: url, publicURL: url, relayToken: token }); await until(() => app.remote.status === 'online');
  const asks = app.remote.service.lifeAsk;
  await assert.rejects(app.remote.pairing(undefined, { purpose: 'life-ask' }), /Sign in to Life/);
  let account = ACCOUNT; asks.identity = () => ({ accountId: account }); asks.enabled = () => true;
  await assert.rejects(app.remote.pairing(undefined, { purpose: 'life-ask', management: true }), /cannot manage/);
  const invite = await app.remote.pairing(undefined, { purpose: 'life-ask' }), capsule = RemoteClient.capsule(invite.code);
  assert.equal(capsule.purpose, 'life-ask');
  const mnemosyne = new RemoteClient(capsule); clients.push(mnemosyne); await mnemosyne.connect();
  assert.equal(mnemosyne.device.scope, 'mnemosyne.ask'); assert.equal(mnemosyne.device.accountID, ACCOUNT);
  const hostID = app.remote.identity().hostId; assert.equal(mnemosyne.device.hostID, hostID);
  assert.equal(app.remote.info().devices.find(row => row.id === mnemosyne.device.id).scope, 'mnemosyne.ask');
  const capabilities = await mnemosyne.request('life.ask.capabilities');
  assert.deepEqual({ scope: capabilities.scope, hostID: capabilities.hostID, accountID: capabilities.accountID, v: capabilities.capabilities }, { scope: 'mnemosyne.ask', hostID, accountID: ACCOUNT, v: ['life.ask.v1'] });
  assert.equal((await mnemosyne.request('hello')).scope, 'mnemosyne.ask');
  for (const method of ['sync', 'runs.list', 'chat.start', 'computer.access.get', 'files.list', 'remote.diagnostics']) await assert.rejects(mnemosyne.request(method, {}), /limited to Life Ask/, method);
  const value = request(hostID), receipt = await mnemosyne.request('life.ask.admit', value);
  assert.equal(receipt.state, 'accepted'); assert.equal(receipt.audioSha256, value.audio.sha256);
  assert.equal((await mnemosyne.request('life.ask.admit', value)).state, 'duplicate');
  assert.equal((await mnemosyne.request('life.ask.status', { requestIds: [value.requestId] })).items[0].state, 'received');
  // Ordinary devices cannot submit Life Ask requests, and the scoped device receives no broadcasts.
  const ordinary = new RemoteClient(RemoteClient.capsule((await app.remote.pairing()).code)); clients.push(ordinary); await ordinary.connect();
  await assert.rejects(ordinary.request('life.ask.admit', request(hostID)), /requires a Mnemosyne pairing/);
  const history=await ordinary.request('life.ask.view');assert.equal(history.accountID,ACCOUNT);assert.equal(history.hostID,hostID);
  await assert.rejects(mnemosyne.request('life.ask.view'), /limited to Life Ask/);
  app.remote.broadcast('browser.history.changed', {});
  await until(() => ordinary.events.length > 0);
  assert.equal(mnemosyne.events.length, 0, 'scoped devices receive results only');
  // A changed Life account makes the pairing stale instead of silently retargeting it.
  account = 'c'.repeat(64);
  assert.equal((await mnemosyne.request('life.ask.admit', request(hostID, { accountID: account }))).reason, 'stale-pairing');
  await assert.rejects(mnemosyne.request('life.ask.status', { requestIds: [value.requestId] }), /stale-pairing/);
  assert.deepEqual(await mnemosyne.request('life.ask.revoke-self'), { revoked: true });
  assert.equal(app.remote.info().devices.some(row => row.id === mnemosyne.device.id), false);
});
