// One request at a time. Every external effect has a durable, immutable identity.
// Chat adapter must claim the supplied chatId and inspect it after uncertain delivery;
// it must never replace an interrupted/deleted chat with a fresh model execution.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';
import {ReminderConfirmationPending,ReminderClarification} from './life-reminder-intent.js';

export function lifeAnswerEventId(requestId){
  const bytes=createHash('sha1').update(Buffer.from(requestId.replaceAll('-',''),'hex')).update('life.answer').digest().subarray(0,16);
  bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
  const hex=bytes.toString('hex');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export class LifeAskExecutor {
  constructor({store,native,chat,mirror,notify,reminders=null,documents=null,actions=null,home=null,now=Date.now}){Object.assign(this,{store,native,chat,mirror,notify,reminders,documents,actions,home,now});this.pending=null;this.closed=false;}
  bound(receipt){const binding=this.store.binding();if(!binding.accountID||receipt.accountID!==binding.accountID||receipt.hostID!==binding.hostID)throw Error('Life Ask account binding changed.');}
  update(receipt,changes){this.bound(receipt);return this.store.update(receipt.requestId,changes);}
  file(receipt,name){return path.join(this.store.directory(receipt.requestId),name+'.json');}
  read(receipt,name){return readJSON(this.file(receipt,name),null);}
  save(receipt,name,value){this.bound(receipt);atomicJSON(this.file(receipt,name),value);return value;}
  tick(){
    if(this.closed)return Promise.resolve();
    if(this.pending)return this.pending;
    this.pending=this.step().finally(()=>{this.pending=null;});return this.pending;
  }
  async step(){
    const unfinished=this.store.unfinished().filter(row=>!row.executionNextAttemptAt||row.executionNextAttemptAt<=this.now());
    const rows=(unfinished.length?unfinished:this.store.pendingEffects().filter(row=>!row.deliveryNextAttemptAt||row.deliveryNextAttemptAt<=this.now())).sort((a,b)=>a.times.admittedAt-b.times.admittedAt||a.requestId.localeCompare(b.requestId));
    if(!rows.length)return;
    let receipt=rows[0];
    try {
      this.bound(receipt);
      if(!receipt.chatId)receipt=this.update(receipt,{chatId:randomUUID(),notificationEventId:lifeAnswerEventId(receipt.requestId)});
      let transcript=this.read(receipt,'transcript');
      if(!transcript){
        receipt=this.update(receipt,{state:'transcribing',times:{asrStartedAt:this.now()}});
        transcript=await this.native.transcribe(receipt);
        this.save(receipt,'transcript',transcript);
        receipt=this.update(receipt,{times:{...transcript.times,asrEndedAt:transcript.times?.asrEndedAt||this.now()}});
      }
      if(this.closed)return;
      if(!receipt.chatId)receipt=this.update(receipt,{chatId:randomUUID(),notificationEventId:lifeAnswerEventId(receipt.requestId)});
      let result=this.read(receipt,'result');
      if(!result){
        this.bound(receipt);
        if(this.home&&!this.read(receipt,'home-context'))this.save(receipt,'home-context',await this.home.context());
        if(this.reminders&&/\b(remind|reminder|task|to.do|add|put)\b/i.test(transcript.transcript)&&!this.read(receipt,'reminder-context'))this.save(receipt,'reminder-context',await this.reminders.context(receipt));
        // ensure is idempotent for this exact claim, including crash-before-receipt.
        const claimed=await this.chat.ensure(receipt,transcript);
        this.bound(receipt);
        if(claimed.id!==receipt.chatId)throw Error('Life Ask chat identity changed.');
        receipt=this.update(receipt,{state:'running',times:{...(claimed.startedAt?{modelStartedAt:claimed.startedAt}:{})}});
        const observed=await this.chat.inspect(receipt);
        this.bound(receipt);
        if(observed.modelStartedAt&&!receipt.times.modelStartedAt)receipt=this.update(receipt,{times:{modelStartedAt:observed.modelStartedAt}});
        if(observed.firstOutputAt&&!receipt.times.firstOutputAt)receipt=this.update(receipt,{times:{firstOutputAt:observed.firstOutputAt}});
        if(['queued','running','awaiting_input'].includes(observed.state))return;
        if(observed.state!=='completed')throw Error('The original Life Ask chat needs attention; no new model execution was started.');
        result=observed.result;
        if(!['search','task','reminder','memory','clarification','action','home'].includes(result?.kind)||typeof result.answer!=='string'||!result.answer.trim()||typeof result.item!=='string'||(['task','memory'].includes(result.kind)&&!result.item.trim()))throw Error('Life Ask returned an invalid structured result. Review the original chat.');
        if(result.professional!==false&&['task','memory'].includes(result.kind))throw Error('Only an explicitly personal result can be filed to the personal inbox.');
        result=this.save(receipt,'result',{...result,answeredAt:observed.answeredAt||this.now()});
      }
      if(this.closed)return;
      if(result.kind==='home'){
        if(!this.home)throw Error('Home Assistant is unavailable.');
        let committed=this.read(receipt,'home-commit');
        if(!committed){committed=await this.home.voice(receipt,result,this.read(receipt,'home-context'));this.save(receipt,'home-commit',committed);}
        result=committed;await this.chat.confirm?.(receipt,result);
      }
      if(result.kind==='action'){
        if(!this.actions)throw Error('Tool-assisted Life Ask is unavailable.');
        const observed=await this.actions.step(receipt,result);this.bound(receipt);
        if(observed.state!=='completed')return this.update(receipt,{state:'running',summary:observed.state==='awaiting_input'?'Review this action in its Proteus chat.':'Tool-assisted request in progress.'});
        result=observed.result;
      }
      let filing=this.read(receipt,'filing');
      if(result.kind==='reminder'){
        let committed=this.read(receipt,'reminder-commit');
        if(!committed){
          if(!this.reminders)throw Error('Life reminders are unavailable.');
          try{committed=await this.reminders.commit(receipt,result,this.read(receipt,'reminder-context'));}
          catch(error){
            if(!(error instanceof ReminderClarification))throw error;
            committed={...result,kind:'clarification',reminder:null,answer:error.message,savedPath:null,destination:{kind:'chat',accountId:receipt.accountID,hostId:receipt.hostID,chatId:receipt.chatId}};
          }
          this.save(receipt,'reminder-commit',committed);
        }
        result=committed;
        await this.chat.confirm?.(receipt,result);
      }
      if(['task','memory'].includes(result.kind)&&!filing){filing=await this.native.file(receipt,result);this.save(receipt,'filing',filing);}
      if(result.kind==='memory'&&filing){
        let destination={kind:'chat',accountId:receipt.accountID,hostId:receipt.hostID,chatId:receipt.chatId};
        if(this.documents){try{destination=await this.documents(receipt,filing);}catch{destination={kind:'document',accountId:receipt.accountID,hostId:receipt.hostID,documentId:receipt.requestId};}}
        result={...result,answer:'Saved memory: '+path.basename(filing.savedPath)+'. '+result.answer,destination};
      }
      receipt=this.update(receipt,{state:'answered',summary:result.answer.slice(0,480),executionNextAttemptAt:null,times:{answeredAt:result.answeredAt}});
      if(!receipt.notificationComplete){
        this.bound(receipt);const posted=await this.notify(receipt,result);
        if(!posted?.queued)receipt=this.update(receipt,{notificationComplete:true,times:{notificationPostedAt:posted?.at||this.now(),...(posted?.pushAcceptedAt?{pushAcceptedAt:posted.pushAcceptedAt}:{})}});
      }
      if(!receipt.mirrorComplete){
        this.bound(receipt);const mirrored=await this.mirror(receipt,{...result,transcript:transcript.transcript,savedPath:filing?.savedPath||null});
        receipt=this.update(receipt,{mirrorComplete:true,times:{icloudAnswerWrittenAt:mirrored.at||this.now()}});
      }
      return this.update(receipt,{effectsComplete:receipt.notificationComplete===true&&receipt.mirrorComplete===true,deliveryNeedsAttention:false,...(!receipt.notificationComplete?{deliveryNextAttemptAt:this.now()+30_000}:{})});
    }catch(error){
      // Account changes cannot update or publish another account's receipt. Keep the
      // unfinished identity for that account's return instead of retargeting it.
      try{this.bound(receipt);}catch{return;}
      if(error instanceof ReminderConfirmationPending)return this.update(receipt,{state:'running',executionNextAttemptAt:this.now()+30_000,summary:error.message});
      if(receipt.state==='answered')return this.update(receipt,{deliveryNextAttemptAt:this.now()+30_000,deliveryNeedsAttention:true});
      const failed=this.update(receipt,{state:'needs-attention',failure:'Life Ask execution needs attention. The original request and chat are retained.',failureStage:receipt.state});
      if(receipt.chatId){try{const answer='Life Ask needs attention at the '+receipt.state+' stage. No successful save is confirmed. Open the original request to review it before retrying.';await this.chat.failure?.(receipt,answer);await this.notify(receipt,{answer,destination:{kind:'chat',accountId:receipt.accountID,hostId:receipt.hostID,chatId:receipt.chatId}});}catch{}}
      return failed;
    }
  }
  async close(){this.closed=true;await this.pending;}
}
