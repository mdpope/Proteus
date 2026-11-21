import fs from 'node:fs';
import path from 'node:path';
import {validateModelOptions} from '../../models/model-catalog.js';
import {readJSON} from '../../shared/files.js';
import {LIFE_ASK_LIMITS} from './life-ask.js';

// The admission claim is the chat identity, not a title or a lookup heuristic.
// A tombstoned or interrupted chat stays that way until the human reviews it.
export class LifeAskChats {
  constructor({store,engine,buildChatSchedule,catalog,attachments=null,place=null,settings=()=>({})}){Object.assign(this,{store,engine,buildChatSchedule,catalog,attachments,place,settings});}
  assertBound(receipt){const binding=this.store.binding();if(!binding.accountID||receipt.accountID!==binding.accountID||receipt.hostID!==binding.hostID)throw Error('Life Ask account binding changed.');}
  existing(receipt){
    const run=this.engine.runs.get(receipt.chatId);
    if(run){const bound=run.schedule.lifeAsk;if(bound?.requestId!==receipt.requestId||bound?.accountID!==receipt.accountID||bound?.hostID!==receipt.hostID||bound?.audioSha256!==receipt.audioSha256)throw Error('Life Ask chat claim belongs to another request.');}
    return run;
  }
  async ensure(receipt,transcription){
    this.assertBound(receipt);
    let run=this.existing(receipt);
    if(!run){
      if(this.engine.tombstones[receipt.chatId])throw Error('The Life Ask chat was deleted and will not be recreated.');
      const selected={model:'gpt-6.1-terra',reasoningEffort:'medium',...this.settings()};
      const catalog=await this.catalog.get(true),model=catalog.models?.find(item=>item.id===selected.model);
      if(catalog.stale||catalog.error||!model)throw Error('Refresh the configured Life Ask model before executing requests.');
      validateModelOptions(selected,model);this.assertBound(receipt);
      const cwd=path.join(this.store.directory(receipt.requestId),'workspace');fs.mkdirSync(cwd,{mode:0o700,recursive:true});
      const schedule=await this.buildChatSchedule({provider:'codex',model:selected.model,reasoningEffort:selected.reasoningEffort,contextTier:'default',serviceTier:'',workspace:{cwd,additionalDirectories:[]},name:transcription.transcript.replace(/\s+/g,' ').trim().slice(0,90),prompt:transcription.transcript,includeDefaults:false,selectedIds:[],agentId:null,skillDirectories:[],mcpServers:{}});
      this.assertBound(receipt);
      // Account/catalog work may yield; reconcile the durable claim again before creation.
      run=this.existing(receipt);
      if(!run){
        const context=readJSON(path.join(this.store.directory(receipt.requestId),'reminder-context.json'),null);
        Object.assign(schedule,{id:'life-ask-'+receipt.requestId,chatType:'life-ask',lifeAsk:{requestId:receipt.requestId,accountID:receipt.accountID,hostID:receipt.hostID,audioSha256:receipt.audioSha256},executionPermissions:{mode:'custom',folders:[],rules:[],readOnlyTools:false}});
        schedule.workspace={cwd,additionalDirectories:[]};
        if(context)schedule.lifeAsk.reminderContext={timeZone:context.timeZone,captureStartedAt:context.captureStartedAt,lists:context.lists.map(({id,name})=>({id,name})),workspaces:(context.scopes?.workspaces||[]).map(({name})=>({name})),projects:(context.scopes?.projects||[]).map(row=>({name:row.name,workspace:context.scopes.workspaces.find(w=>w.id===row.workspaceId)?.name}))};
        const homeContext=readJSON(path.join(this.store.directory(receipt.requestId),'home-context.json'),null);
        if(homeContext)schedule.lifeAsk.homeContext={entities:homeContext.entities,services:homeContext.services||[]};
        if(schedule.context)Object.assign(schedule.context,{workspace:schedule.workspace,baseWorkspace:schedule.workspace,workspaceId:null,workspaceName:'Life Ask',followsWorkspace:false,entries:[],selectedIds:[],agentId:null,includeDefaults:false});
        run=this.engine.createRun(schedule,'chat',null,{runId:receipt.chatId,deferStart:true,inputOrigin:{kind:'life-ask',requestId:receipt.requestId}});
      }
    }
    // Only an untouched durable draft is startable. The engine marks abandoned
    // queued/running work interrupted on restart; never restart it here.
    if(run.status==='queued'&&run.deferredStart===true){this.place?.(run,receipt);await this.attachAudio(receipt,run);this.assertBound(receipt);this.engine.startDeferredRun(run.id);}
    return {id:run.id,...(run.turns?.[0]?.startedAt?{startedAt:Date.parse(run.turns[0].startedAt)}:{})};
  }
  async attachAudio(receipt,run){
    if(!this.attachments||run.events[0]?.data?.attachments?.some(item=>item.sha256===receipt.audioSha256))return;
    const file=path.join(this.store.directory(receipt.requestId),'audio.wav'),stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==receipt.audioBytes||stat.size>LIFE_ASK_LIMITS.maxAudioBytes)throw Error('Original Life Ask audio is unavailable.');
    const binding={chatId:run.id,deviceId:'life-ask:'+receipt.requestId,messageId:receipt.requestId,providerId:run.schedule.provider};
    const staged=await this.attachments.begin({...binding,name:'Voice request.wav',mediaType:'audio/wav',size:stat.size,sha256:receipt.audioSha256});
    try{
      const bytes=fs.readFileSync(file);
      for(let offset=0,index=0;offset<bytes.length;offset+=staged.chunkSize,index++)await this.attachments.chunk({uploadId:staged.uploadId,deviceId:binding.deviceId,index,dataBase64:bytes.subarray(offset,offset+staged.chunkSize).toString('base64')});
      const item=await this.attachments.finish({uploadId:staged.uploadId,deviceId:binding.deviceId});this.assertBound(receipt);
      if(!await this.attachments.preserve(item,run.id))throw Error('Original Life Ask audio could not be saved with its chat.');
      // The transcript is the model input. Original audio is a viewable chat attachment,
      // not an unsupported audio payload silently sent to a text/image provider.
      run.events[0].data={...run.events[0].data,attachments:[{name:item.name,mediaType:item.mediaType,size:item.size,sha256:item.sha256}],lifeAskAudio:true};this.engine.persist(run);
    }finally{await this.attachments.release({attachmentId:staged.uploadId,...binding});}
  }
  async inspect(receipt){
    this.assertBound(receipt);const run=this.existing(receipt);
    if(!run)return {state:'missing'};
    const firstUserIndex=run.events.findIndex(event=>event.role==='user'),nextUserIndex=run.events.findIndex((event,index)=>index>firstUserIndex&&event.role==='user');
    const first=run.events.slice(firstUserIndex+1,nextUserIndex<0?undefined:nextUserIndex);
    const replies=first.filter(event=>event.role==='assistant'),answer=[...replies].reverse().find(event=>event.data?.phase==='final')||replies.at(-1);
    const initialTurn=run.turns?.[0];
    const state=nextUserIndex>=0?(initialTurn?.status||'completed'):run.status;
    const times={...(initialTurn?.startedAt?{modelStartedAt:Date.parse(initialTurn.startedAt)}:{}),...(run.lifeAskFirstOutputAt?{firstOutputAt:run.lifeAskFirstOutputAt}:replies[0]?.at?{firstOutputAt:Date.parse(replies[0].at)}:{}),...(answer?.at?{answeredAt:Date.parse(answer.at)}:{})};
    if(state!=='completed')return {state,...times};
    let result;try{result=answer?.data?.lifeAskResult||JSON.parse(answer?.text);}catch{throw Error('The Life Ask chat did not return its structured result.');}
    return {state,...times,result:{...result,model:run.initialSchedule?.model||run.schedule.model,reasoningEffort:run.initialSchedule?.reasoningEffort||run.schedule.reasoningEffort}};
  }
  async confirm(receipt,result){
    this.assertBound(receipt);const run=this.existing(receipt);if(!run)throw Error('The reminder provenance chat is unavailable.');
    const confirmation=result.reminder?.id||'clarification';
    if(run.lifeReminderConfirmed===confirmation)return;
    const event=run.events.findLast(event=>event.role==='assistant'&&event.data?.lifeAskResult);
    if(event){event.text=result.answer;event.data={...event.data,lifeAskResult:result};}
    run.lifeReminderConfirmed=confirmation;this.engine.persist(run);
  }
  async failure(receipt,message){
    this.assertBound(receipt);let run=this.existing(receipt);
    if(!run){
      if(this.engine.tombstones[receipt.chatId])return;
      const cwd=path.join(this.store.directory(receipt.requestId),'workspace');fs.mkdirSync(cwd,{recursive:true,mode:0o700});
      const transcript=readJSON(path.join(this.store.directory(receipt.requestId),'transcript.json'),null);
      const schedule=await this.buildChatSchedule({provider:'codex',...this.settings(),workspace:{cwd,additionalDirectories:[]},name:'Life Ask needs attention',prompt:transcript?.transcript||'Voice request could not be transcribed.',includeDefaults:false,selectedIds:[],agentId:null,skillDirectories:[],mcpServers:{}});
      this.assertBound(receipt);
      Object.assign(schedule,{id:'life-ask-'+receipt.requestId,chatType:'life-ask',lifeAsk:{requestId:receipt.requestId,accountID:receipt.accountID,hostID:receipt.hostID,audioSha256:receipt.audioSha256},executionPermissions:{mode:'custom',folders:[],rules:[],readOnlyTools:false}});
      run=this.engine.createRun(schedule,'chat',null,{runId:receipt.chatId,deferStart:true,inputOrigin:{kind:'life-ask',requestId:receipt.requestId}});
      run.status='failed';run.failureEventAt=new Date().toISOString();delete run.nextPrompt;delete run.deferredStart;
      this.engine.persist(run);this.place?.(run,receipt);
    }
    if(!run.events.some(event=>event.data?.lifeAskFailure===receipt.requestId))this.engine.event(run,'system',message,{lifeAskFailure:receipt.requestId});
  }
}
