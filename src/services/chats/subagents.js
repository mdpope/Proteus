import {createHash} from 'node:crypto';
const terminal=new Set(['completed','failed','interrupted','closed','unavailable']);
const status=value=>({pendingInit:'starting',errored:'failed',shutdown:'closed',notFound:'unavailable'}[value]||(['starting','running',...terminal].includes(value)?value:'unknown'));
const clean=value=>String(value||'').slice(0,16000);
const key=(provider,id)=>createHash('sha256').update(JSON.stringify([provider,id])).digest('hex');
// Only adapters call this journal from provider-owned lifecycle events. Model
// tool arguments cannot register a relationship or acquire another chat's scope.
export function subagentJournal(run,provider,update=()=>{}){
 run.subagents??=[];const turns=new Map(),registered=new Set();
 const find=id=>run.subagents.find(row=>row.provider===provider&&row.nativeId===id&&row.sessionId===run.providerSessionId);
 const root=id=>id===run.providerSessionId;
 const known=id=>root(id)||registered.has(id);
 const register=(id,{parentId=run.providerSessionId,name,task,source}={})=>{
  if(typeof id!=='string'||!id||id.length>256||root(id)||!known(parentId))return null;
  let row=find(id);if(row&&row.parentNativeId!==parentId)return null;
  if(!row){if(run.subagents.length>=128)return null;row={id:key(provider,id),nativeId:id,parentNativeId:parentId,sessionId:run.providerSessionId,provider,name:clean(name)||'Agent',task:clean(task),source,status:'starting',startedAt:new Date().toISOString(),events:[],eventStart:0,eventCount:0};run.subagents.push(row);}
  registered.add(id);update();return row;
 };
 const append=(id,role,text,eventId)=>{const row=find(id);if(!row||!registered.has(id)||!text)return false;const value=clean(text);if(eventId&&row.events.some(e=>e.providerEventId===eventId))return true;if(value.length<String(text).length)row.detailTruncated=true;row.events.push({role,text:value,at:new Date().toISOString(),...(eventId?{providerEventId:eventId}:{})});row.eventCount++;while(row.events.length>200||row.events.reduce((n,e)=>n+e.text.length,0)>256*1024){row.events.shift();row.eventStart++;}row.transcriptAvailable=true;update();return true;};
 const livePaint=new Map();
 const stream=(id,messageId,text)=>{
  const row=find(id);if(!row||!registered.has(id)||typeof text!=='string')return;
  row.liveMessages??={};const full=(row.liveMessages[messageId]||'')+text;if(full.length>16000)row.detailTruncated=true;row.liveMessages[messageId]=full.slice(-16000);
  row.eventRevision=(row.eventRevision||0)+1;
  if(Date.now()-(livePaint.get(id)||0)>=250){livePaint.set(id,Date.now());update();}
 };
 const complete=(id,messageId)=>{const row=find(id);if(row?.liveMessages)delete row.liveMessages[messageId];};
 const setStatus=(id,value)=>{const row=find(id);if(!row)return;row.status=status(value);row.observedAt=new Date().toISOString();if(terminal.has(row.status)){row.finishedAt=row.observedAt;delete row.liveMessages;}update();};
 const codex=({method,params:p={}})=>{
  if(method==='thread/started'&&p.thread){
   const thread=p.thread,sourceParent=thread.source?.subAgent?.thread_spawn?.parent_thread_id,parentId=thread.parentThreadId||sourceParent;
   if(parentId&&(!sourceParent||!thread.parentThreadId||sourceParent===thread.parentThreadId))return !!register(thread.id,{parentId,name:thread.agentNickname||thread.agentRole,source:'Codex thread/started lineage'});
  }
  if(!known(p.threadId))return false;
  const item=p.item;
  if(['item/started','item/completed'].includes(method)&&item?.type==='subAgentActivity'){
   const id=item.agentThreadId;
   if(item.kind==='started'||item.kind==='interacted'&&find(id)?.parentNativeId===p.threadId)register(id,{parentId:p.threadId,name:item.agentPath,source:'Codex subAgentActivity started'});
   if(registered.has(id)&&find(id)?.parentNativeId===p.threadId)setStatus(id,item.kind==='completed'?'completed':item.kind==='interrupted'?'interrupted':'running');
  }
  if(['item/started','item/completed'].includes(method)&&item?.type==='collabAgentToolCall'&&item.senderThreadId===p.threadId){
   for(const id of item.receiverThreadIds||[]){if(item.tool==='spawnAgent'||(['resumeAgent','sendInput','followupTask'].includes(item.tool)&&find(id)?.parentNativeId===p.threadId))register(id,{parentId:p.threadId,task:item.prompt,name:'Agent',source:'Codex collabAgentToolCall'});const state=item.agentsStates?.[id];if(registered.has(id)&&state){setStatus(id,state.status);if(state.message)append(id,'assistant',state.message,item.id+':'+id+':'+state.status);}}
  }
  if(root(p.threadId))return true;
  if(method==='turn/started'&&p.turn?.id){turns.set(p.threadId,p.turn.id);setStatus(p.threadId,'running');}
  if(method==='turn/completed'){setStatus(p.threadId,p.turn?.status==='completed'?'completed':'interrupted');turns.delete(p.threadId);}
  if(method==='item/agentMessage/delta')stream(p.threadId,p.itemId,p.delta);
  if(method==='item/completed'&&item?.type==='agentMessage'){complete(p.threadId,item.id);append(p.threadId,'assistant',item.text,item.id);}
  if(method==='item/completed'&&item?.type==='commandExecution')append(p.threadId,'tool',[item.command,item.aggregatedOutput].filter(Boolean).join('\n'),item.id);
  return true;
 };
 return {register,append,setStatus,codex,known,find,
  allows(threadId,turnId){if(root(threadId))return true;const row=find(threadId);return registered.has(threadId)&&!terminal.has(row?.status)&&(!turnId||!turns.has(threadId)||turns.get(threadId)===turnId);},
  finish(){for(const id of registered){const row=find(id);if(row&&!terminal.has(row.status))setStatus(id,'interrupted');}registered.clear();turns.clear();},
  copilot(event){const d=event.data||{},id=event.agentId;if(event.type==='subagent.started'&&id)register(id,{parentId:d.parentId||run.providerSessionId,name:d.agentDisplayName||d.agentName,task:d.agentDescription,source:'Copilot subagent.started'});if(!id||!registered.has(id))return false;if(event.type==='subagent.started')setStatus(id,'running');if(event.type==='subagent.completed')setStatus(id,'completed');if(event.type==='subagent.failed')setStatus(id,'failed');if(event.type==='assistant.message_delta')stream(id,d.messageId,d.deltaContent);if(event.type==='assistant.message'){complete(id,d.messageId);append(id,'assistant',d.content,event.id);}if(event.type==='tool.execution_complete')append(id,'tool',typeof d.result?.content==='string'?d.result.content:typeof d.result==='string'?d.result:'Tool finished',event.id);return true;},
  claude(message){
   const parent=message.parent_tool_use_id;
   if(!parent&&message.type==='assistant')for(const block of message.message?.content||[])if(block.type==='tool_use'&&['Agent','Task'].includes(block.name)){register(block.id,{name:block.input?.subagent_type||'Agent',task:block.input?.description||block.input?.prompt,source:'Claude Agent tool_use'});setStatus(block.id,'running');}
   if(parent&&registered.has(parent)){if(message.type==='stream_event'&&message.event?.delta?.type==='text_delta')stream(parent,'response',message.event.delta.text);if(message.type==='assistant'){complete(parent,'response');}if(message.type==='assistant')for(const block of message.message?.content||[])if(block.type==='text')append(parent,'assistant',block.text,(message.uuid||message.message?.id)+':'+message.message.content.indexOf(block));return true;}
   if(message.type==='user')for(const block of message.message?.content||[])if(block.type==='tool_result'&&registered.has(block.tool_use_id)){const text=typeof block.content==='string'?block.content:(block.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');append(block.tool_use_id,'assistant',text,message.uuid);setStatus(block.tool_use_id,block.is_error?'failed':'completed');}
   return false;
  }
 };
}
export function subagentSummaries(run){return (run.subagents||[]).map(({events,liveMessages,...summary})=>({...summary,transcriptAvailable:!!events?.length||!!Object.keys(liveMessages||{}).length}));}
export function subagentPage(run,id,before){const row=run.subagents?.find(row=>row.id===id);if(!row)throw Error('This agent does not belong to this parent chat.');const end=Number.isSafeInteger(before)?Math.min(row.eventCount,Math.max(row.eventStart,before)):row.eventCount,start=Math.max(row.eventStart,end-50);return {id:row.id,liveMessages:{...(row.liveMessages||{})},events:row.events.slice(start-row.eventStart,end-row.eventStart),eventStart:start,eventCount:row.eventCount,earlier:start>row.eventStart?start:null,truncated:row.eventStart>0||!!row.detailTruncated};}
