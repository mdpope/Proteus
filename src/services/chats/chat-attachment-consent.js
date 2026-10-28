import {atomicRename} from '../../shared/atomic-rename.cjs';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chatAttachmentLimits } from './chat-attachments.js';

const TTL_MS=5*60_000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const metadata=item=>Object.fromEntries(['attachmentId','name','mediaType','size','sha256'].map(key=>[key,item[key]]));

/** One explicit sender action authorizes these exact staged bytes for one provider/chat/message. */
export class ChatAttachmentConsents {
  constructor(store,{clock=()=>Date.now()}={}){this.store=store;this.clock=clock;this.grants=new Map();this.proofFile=path.join(store.base,'send-proofs.json');this.prepared=new Map();if(fs.existsSync(this.proofFile)){try{const saved=JSON.parse(fs.readFileSync(this.proofFile,'utf8'));if(saved.schemaVersion!==1||!Array.isArray(saved.items))throw new Error('invalid schema');for(const item of saved.items){if(typeof item?.proofId!=='string'||typeof item.chatId!=='string'||typeof item.providerId!=='string'||!Array.isArray(item.attachments)||item.used===true)continue;this.prepared.set(item.proofId,item);}}catch{throw new Error('Accepted attachment send proofs could not be read. The original record was preserved.');}}}
  persistProofs(){const body=JSON.stringify({schemaVersion:1,items:[...this.prepared.entries()].map(([proofId,value])=>({proofId,...value}))});const tmp=this.proofFile+'.tmp';fs.writeFileSync(tmp,body,{mode:0o600});fs.chmodSync(tmp,0o600);atomicRename(tmp,this.proofFile);}
  prune(){const now=this.clock();for(const [id,grant]of this.grants)if(grant.expiresAt<=now)this.grants.delete(id);}
  revokeDevice(deviceId){for(const [id,grant]of this.grants)if(grant.deviceId===deviceId)this.grants.delete(id);for(const [id,grant]of this.prepared)if(grant.deviceId===deviceId)this.prepared.delete(id);this.persistProofs();}
  revokeChat(chatId){for(const [id,grant]of this.grants)if(grant.chatId===chatId)this.grants.delete(id);for(const [id,proof]of this.prepared)if(proof.chatId===chatId)this.prepared.delete(id);this.persistProofs();}
  async authorize({chatId,draftId,messageId,providerId,deviceId,attachments,acceptedMediaTypes}={}){
    this.prune();
    if(draftId!==undefined){if(!UUID.test(draftId)||chatId!==undefined)throw new Error('Choose one chat or draft destination.');chatId='draft:'+draftId;}
    if(typeof chatId!=='string'||!chatId||typeof messageId!=='string'||!messageId||typeof providerId!=='string'||!providerId||typeof deviceId!=='string'||!deviceId)throw new Error('Attachment destination is incomplete.');
    if(!Array.isArray(attachments)||!attachments.length||attachments.length>chatAttachmentLimits.maxBatchFiles||new Set(attachments.map(item=>item?.attachmentId)).size!==attachments.length)throw new Error('Choose a valid batch of distinct attachments.');
    const exact=[];
    for(const declared of attachments){
      const item=await this.store.resolve({attachmentId:declared.attachmentId,chatId,deviceId,messageId,providerId});
      if(this.store.records.get(declared.attachmentId)?.accepted)throw new Error('This attachment was already sent. Select it again for a new message.');

      const bound=metadata({attachmentId:declared.attachmentId,...item});
      if(JSON.stringify(metadata(declared))!==JSON.stringify(bound))throw new Error('Attachment details changed. Review the files and destination again.');
      exact.push(bound);
    }
    if(exact.reduce((total,item)=>total+item.size,0)>chatAttachmentLimits.maxBatchBytes)throw new Error('This message exceeds the attachment batch limit.');
    const consentId=randomUUID(),expiresAt=this.clock()+TTL_MS;
    this.grants.set(consentId,{consentId,chatId,messageId,providerId,deviceId,attachments:exact,expiresAt});
    return {consentId,expiresAt:new Date(expiresAt).toISOString(),providerId,attachments:exact};
  }
  async verify({consentId,chatId,draftId,messageId,providerId,deviceId,attachmentIds}={}){
    this.prune();if(draftId!==undefined)chatId='draft:'+draftId;
    const grant=this.grants.get(consentId);
    if(!grant||grant.chatId!==chatId||grant.messageId!==messageId||grant.providerId!==providerId||grant.deviceId!==deviceId||!Array.isArray(attachmentIds)||JSON.stringify(grant.attachments.map(item=>item.attachmentId))!==JSON.stringify(attachmentIds))throw new Error('Attachment consent expired or does not match this chat, message, provider and files. Review them before sending.');
    for(const item of grant.attachments){const current=await this.store.resolve({attachmentId:item.attachmentId,chatId,deviceId,messageId,providerId});if(JSON.stringify(metadata({attachmentId:item.attachmentId,...current}))!==JSON.stringify(item))throw new Error('Attachment bytes changed. Review the files and destination again.');}
    return grant.attachments;
  }
  async prepareSend({consentId,chatId,draftId,messageId,providerId,deviceId,attachmentIds}={}){
    const exact=await this.verify({consentId,chatId,draftId,messageId,providerId,deviceId,attachmentIds});
    if(draftId!==undefined&&(!chatId||typeof chatId!=='string'))throw new Error('A created chat is required for draft attachments.');
    const bound=exact.map(item=>({attachmentId:item.attachmentId,chatId,deviceId,messageId,providerId,name:item.name,mediaType:item.mediaType,size:item.size,sha256:item.sha256}));
    let proofId;
    try{
      if(draftId!==undefined)for(const item of exact)await this.store.claimDraft({attachmentId:item.attachmentId,draftId,chatId,deviceId,messageId,providerId});
      for(const item of bound)await this.store.accept(item);
      this.consume(consentId);
      proofId=randomUUID();this.prepared.set(proofId,{chatId,deviceId,messageId,providerId,attachments:bound});this.persistProofs();
      return {proofId,attachments:bound};
    }catch(error){
      this.consume(consentId);
      if(proofId)this.prepared.delete(proofId);
      for(const item of bound){
        try{await this.store.release(item);}catch{if(draftId!==undefined)try{await this.store.release({...item,chatId:'draft:'+draftId});}catch{/* A failed file is already unavailable. */}}
      }
      if(proofId)try{this.persistProofs();}catch{/* Preserve the original failure. */}
      throw error;
    }
  }
  async readForProvider({proofId,chatId,providerId,attachmentIds}={}){
    const proof=this.prepared.get(proofId);
    if(!proof||proof.used||proof.chatId!==chatId||proof.providerId!==providerId||!Array.isArray(attachmentIds)||JSON.stringify(proof.attachments.map(item=>item.attachmentId))!==JSON.stringify(attachmentIds))throw new Error('Attachment provider consent is missing or changed. No file was forwarded.');
    const files=[];
    if(proof.attachments.length>chatAttachmentLimits.maxBatchFiles||proof.attachments.reduce((total,item)=>total+item.size,0)>chatAttachmentLimits.maxBatchBytes)throw new Error('Attachment batch exceeds the approved delivery limit.');
    for(const item of proof.attachments){const current=await this.store.read(item);if(JSON.stringify(metadata({attachmentId:item.attachmentId,...current}))!==JSON.stringify(metadata(item)))throw new Error('Attachment bytes changed. No file was forwarded.');files.push(current);}
    proof.used=true;this.persistProofs();
    return files;
  }
  assertPrepared({proofId,chatId,providerId,attachmentIds}={}){
    const proof=this.prepared.get(proofId);
    if(!proof||proof.used||proof.chatId!==chatId||proof.providerId!==providerId||!Array.isArray(attachmentIds)||JSON.stringify(proof.attachments.map(item=>item.attachmentId))!==JSON.stringify(attachmentIds))throw new Error('Attachment send consent is missing or changed. Review the exact files and provider again.');
    return proof.attachments.map(item=>({name:item.name,mediaType:item.mediaType,size:item.size,...(/^[a-f0-9]{64}$/.test(item.sha256||'')?{sha256:item.sha256}:{})}));
  }
  async releaseProof(proofId){const proof=this.prepared.get(proofId);this.prepared.delete(proofId);this.persistProofs();if(!proof)return;for(const item of proof.attachments){if(proof.used)try{await this.store.preserve?.(item,proof.chatId);}catch{/* Viewing is optional; delivery already happened. */}await this.store.release(item);}}
  consume(consentId){this.grants.delete(consentId);}
}
