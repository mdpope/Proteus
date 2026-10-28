import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { ChatAttachmentStore } from '../src/services/chats/chat-attachments.js';
import { ChatAttachmentConsents } from '../src/services/chats/chat-attachment-consent.js';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLytQAAAABJRU5ErkJggg==','base64');
const sha256=createHash('sha256').update(png).digest('hex');
test('MTPLX image consent preserves exact provider binding through accepted storage and restart',async t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-mtplx-consent-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const store=new ChatAttachmentStore(home);t.after(()=>store.close());const grants=new ChatAttachmentConsents(store);
  const owner={chatId:'mtplx-chat',deviceId:'local-desktop',messageId:'image-message',providerId:'mtplx'};
  const begun=await store.begin({...owner,name:'synthetic.png',mediaType:'image/png',size:png.length,sha256});await store.chunk({uploadId:begun.uploadId,deviceId:owner.deviceId,index:0,dataBase64:png.toString('base64')});const file=await store.finish({uploadId:begun.uploadId,deviceId:owner.deviceId});
  const consent=await grants.authorize({...owner,attachments:[file],acceptedMediaTypes:['image/png']});const claim={...owner,consentId:consent.consentId,attachmentIds:[file.attachmentId]};await assert.rejects(grants.verify({...claim,providerId:'codex'}),/does not match/);
  const proof=await grants.prepareSend(claim);await store.close();const restored=new ChatAttachmentStore(home);t.after(()=>restored.close());const resumed=new ChatAttachmentConsents(restored);
  await assert.rejects(resumed.readForProvider({proofId:proof.proofId,chatId:owner.chatId,providerId:'copilot',attachmentIds:claim.attachmentIds}),/consent is missing or changed/);
  assert.deepEqual((await resumed.readForProvider({proofId:proof.proofId,chatId:owner.chatId,providerId:'mtplx',attachmentIds:claim.attachmentIds}))[0].bytes,png);
});
test('explicit consent binds exact payload, peer, chat, message and provider until one send',async t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-consent-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const store=new ChatAttachmentStore(home);t.after(()=>store.close());let now=Date.now();const grants=new ChatAttachmentConsents(store,{clock:()=>now});
  const owner={chatId:'chat-1',deviceId:'device-a',messageId:'message-1',providerId:'copilot'};
  const begun=await store.begin({...owner,name:'picture.png',mediaType:'image/png',size:png.length,sha256});
  await store.chunk({uploadId:begun.uploadId,deviceId:owner.deviceId,index:0,dataBase64:png.toString('base64')});
  const file=await store.finish({uploadId:begun.uploadId,deviceId:owner.deviceId});
  await assert.rejects(grants.authorize({...owner,attachments:[{...file,name:'other.png'}],acceptedMediaTypes:['image/png']}),/details changed/);
  const consent=await grants.authorize({...owner,attachments:[file],acceptedMediaTypes:['image/png']});
  const claim={...owner,consentId:consent.consentId,attachmentIds:[file.attachmentId]};
  assert.deepEqual((await grants.verify(claim))[0],file);
  for(const change of [{deviceId:'device-b'},{chatId:'chat-2'},{messageId:'message-2'},{providerId:'codex'},{attachmentIds:[]}])await assert.rejects(grants.verify({...claim,...change}),/does not match/);
  grants.consume(consent.consentId);await assert.rejects(grants.verify(claim),/expired/);
  const second=await grants.authorize({...owner,attachments:[file],acceptedMediaTypes:['image/png']});now+=5*60_000+1;await assert.rejects(grants.verify({...claim,consentId:second.consentId}),/expired/);
});

test('draft consent cannot authorize a different first chat provider or device',async t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-consent-draft-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const store=new ChatAttachmentStore(home);t.after(()=>store.close());const grants=new ChatAttachmentConsents(store),draftId=randomUUID();
  const owner={chatId:'draft:'+draftId,deviceId:'device-a',messageId:'message-1',providerId:'codex'};
  const begun=await store.begin({...owner,name:'picture.png',mediaType:'image/png',size:png.length,sha256});await store.chunk({uploadId:begun.uploadId,deviceId:owner.deviceId,index:0,dataBase64:png.toString('base64')});const file=await store.finish({uploadId:begun.uploadId,deviceId:owner.deviceId});
  const consent=await grants.authorize({draftId,deviceId:owner.deviceId,messageId:owner.messageId,providerId:owner.providerId,attachments:[file],acceptedMediaTypes:['image/png']});
  assert.equal((await grants.verify({draftId,deviceId:owner.deviceId,messageId:owner.messageId,providerId:owner.providerId,consentId:consent.consentId,attachmentIds:[file.attachmentId]})).length,1);
  await assert.rejects(grants.verify({draftId,deviceId:owner.deviceId,messageId:owner.messageId,providerId:'copilot',consentId:consent.consentId,attachmentIds:[file.attachmentId]}),/does not match/);
});
test('provider byte boundary requires exact one-use prepared proof and rechecks digest',async t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-consent-dispatch-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const store=new ChatAttachmentStore(home);t.after(()=>store.close());const grants=new ChatAttachmentConsents(store);
  const owner={chatId:'chat-1',deviceId:'device-a',messageId:'message-1',providerId:'copilot'};
  const begun=await store.begin({...owner,name:'picture.png',mediaType:'image/png',size:png.length,sha256});await store.chunk({uploadId:begun.uploadId,deviceId:owner.deviceId,index:0,dataBase64:png.toString('base64')});const file=await store.finish({uploadId:begun.uploadId,deviceId:owner.deviceId});
  const consent=await grants.authorize({...owner,attachments:[file],acceptedMediaTypes:['image/png']});
  const prepared=await grants.prepareSend({...owner,consentId:consent.consentId,attachmentIds:[file.attachmentId]});
  assert.equal(prepared.attachments[0].sha256,sha256);
  for(const change of [{chatId:'chat-2'},{providerId:'codex'},{attachmentIds:[]}])await assert.rejects(grants.readForProvider({proofId:prepared.proofId,chatId:owner.chatId,providerId:owner.providerId,attachmentIds:[file.attachmentId],...change}),/consent is missing or changed/);
  const bytes=await grants.readForProvider({proofId:prepared.proofId,chatId:owner.chatId,providerId:owner.providerId,attachmentIds:[file.attachmentId]});assert.deepEqual(bytes[0].bytes,png);
  await assert.rejects(grants.readForProvider({proofId:prepared.proofId,chatId:owner.chatId,providerId:owner.providerId,attachmentIds:[file.attachmentId]}),/consent is missing or changed/);
  await grants.releaseProof(prepared.proofId);
  await assert.rejects(store.read({...owner,attachmentId:file.attachmentId}),/unavailable/);
  // A delivered file stays viewable with its chat, read-only and verified, until the chat is deleted.
  assert.deepEqual(store.history(owner.chatId,sha256),png);
  assert.throws(()=>store.history('chat-2',sha256),/not kept/);assert.throws(()=>store.history(owner.chatId,'../x'),/Choose an attachment/);
  await store.revokeChat(owner.chatId);assert.throws(()=>store.history(owner.chatId,sha256),/not kept/);
});
test('an undelivered send never keeps a viewable copy',async t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-consent-undelivered-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const store=new ChatAttachmentStore(home);t.after(()=>store.close());const grants=new ChatAttachmentConsents(store);
  const owner={chatId:'chat-1',deviceId:'device-a',messageId:'message-2',providerId:'copilot'};
  const begun=await store.begin({...owner,name:'picture.png',mediaType:'image/png',size:png.length,sha256});await store.chunk({uploadId:begun.uploadId,deviceId:owner.deviceId,index:0,dataBase64:png.toString('base64')});const file=await store.finish({uploadId:begun.uploadId,deviceId:owner.deviceId});
  const consent=await grants.authorize({...owner,attachments:[file],acceptedMediaTypes:['image/png']});
  const prepared=await grants.prepareSend({...owner,consentId:consent.consentId,attachmentIds:[file.attachmentId]});
  await grants.releaseProof(prepared.proofId);
  assert.throws(()=>store.history(owner.chatId,sha256),/not kept/);
});
test('first-message prepared proof binds claimed chat and provider before any byte read',async t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-consent-first-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const store=new ChatAttachmentStore(home);t.after(()=>store.close());const grants=new ChatAttachmentConsents(store),draftId=randomUUID();
  const owner={chatId:'draft:'+draftId,deviceId:'device-a',messageId:'message-1',providerId:'codex'};
  const begun=await store.begin({...owner,name:'picture.png',mediaType:'image/png',size:png.length,sha256});await store.chunk({uploadId:begun.uploadId,deviceId:owner.deviceId,index:0,dataBase64:png.toString('base64')});const file=await store.finish({uploadId:begun.uploadId,deviceId:owner.deviceId});
  const consent=await grants.authorize({draftId,deviceId:owner.deviceId,messageId:owner.messageId,providerId:owner.providerId,attachments:[file],acceptedMediaTypes:['image/png']});
  const prepared=await grants.prepareSend({draftId,chatId:'chat-first',deviceId:owner.deviceId,messageId:owner.messageId,providerId:owner.providerId,consentId:consent.consentId,attachmentIds:[file.attachmentId]});
  await assert.rejects(grants.readForProvider({proofId:prepared.proofId,chatId:'chat-other',providerId:'codex',attachmentIds:[file.attachmentId]}),/consent is missing or changed/);
  assert.deepEqual((await grants.readForProvider({proofId:prepared.proofId,chatId:'chat-first',providerId:'codex',attachmentIds:[file.attachmentId]}))[0].bytes,png);
  await grants.releaseProof(prepared.proofId);
});
test('accepted queued proof survives host restart but cannot replay after provider read',async t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-consent-restart-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const store=new ChatAttachmentStore(home);t.after(()=>store.close());const first=new ChatAttachmentConsents(store);
  const owner={chatId:'chat-1',deviceId:'device-a',messageId:'message-1',providerId:'copilot'};
  const begun=await store.begin({...owner,name:'picture.png',mediaType:'image/png',size:png.length,sha256});await store.chunk({uploadId:begun.uploadId,deviceId:owner.deviceId,index:0,dataBase64:png.toString('base64')});const file=await store.finish({uploadId:begun.uploadId,deviceId:owner.deviceId});
  const consent=await first.authorize({...owner,attachments:[file],acceptedMediaTypes:['image/png']});const prepared=await first.prepareSend({...owner,consentId:consent.consentId,attachmentIds:[file.attachmentId]});
  const restored=new ChatAttachmentConsents(store);const exact={proofId:prepared.proofId,chatId:owner.chatId,providerId:owner.providerId,attachmentIds:[file.attachmentId]};
  assert.equal(restored.assertPrepared(exact)[0].name,'picture.png');
  assert.deepEqual((await restored.readForProvider(exact))[0].bytes,png);
  const replayed=new ChatAttachmentConsents(store);await assert.rejects(replayed.readForProvider(exact),/consent is missing or changed/);
  await replayed.releaseProof(prepared.proofId);
});

test('a mid-batch accept failure removes earlier accepted bytes and consumes consent',async t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-consent-rollback-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const store=new ChatAttachmentStore(home);t.after(()=>store.close());const grants=new ChatAttachmentConsents(store);
  const owner={chatId:'chat-1',deviceId:'device-a',messageId:'message-1',providerId:'copilot'},files=[];
  for(let index=0;index<2;index++){const begun=await store.begin({...owner,name:`picture-${index}.png`,mediaType:'image/png',size:png.length,sha256});await store.chunk({uploadId:begun.uploadId,deviceId:owner.deviceId,index:0,dataBase64:png.toString('base64')});files.push(await store.finish({uploadId:begun.uploadId,deviceId:owner.deviceId}));}
  const consent=await grants.authorize({...owner,attachments:files,acceptedMediaTypes:['image/png']});
  const accept=store.accept.bind(store);let count=0;store.accept=async item=>{if(++count===2)throw new Error('synthetic second-file failure');return accept(item);};
  await assert.rejects(grants.prepareSend({...owner,consentId:consent.consentId,attachmentIds:files.map(file=>file.attachmentId)}),/second-file failure/);
  assert.equal(store.records.size,0);assert.equal(grants.prepared.size,0);
  await assert.rejects(grants.verify({...owner,consentId:consent.consentId,attachmentIds:files.map(file=>file.attachmentId)}),/expired/);
});

test('consent rejects a 257-file declaration before any staged-byte reads', async t => {
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-consent-large-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const store=new ChatAttachmentStore(home);t.after(()=>store.close());
  const grants=new ChatAttachmentConsents(store),owner={chatId:'chat-1',deviceId:'device-a',messageId:'message-1',providerId:'copilot'};
  const declared=Array.from({length:257},(_,index)=>({attachmentId:`synthetic-${index}`,name:`tiny-${index}.png`,mediaType:'image/png',size:1,sha256:'a'.repeat(64)}));
  await assert.rejects(grants.authorize({...owner,attachments:declared,acceptedMediaTypes:['image/png']}),/valid batch/);
});
