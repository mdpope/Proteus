import {randomUUID} from 'node:crypto';
import {displayText} from './tool-activity.js';
const count=value=>Number.isSafeInteger(value)&&value>=0?value:undefined;
const labels={mtplx:'MTPLX','llama-cpp':'llama.cpp',codex:'Codex',copilot:'Copilot',claude:'Claude'};

/** Capture observable provider lifecycle separately from assistant prose and
 * model replay. Raw reasoning/signatures never enter this journal. Only the
 * explicit Codex summary channel is accepted as a user-facing summary. */
export function providerActivity({provider,emit,update,clock=Date.now}){
 const rows=new Map(),blocks=new Map(),summaries=new Map(),label=labels[provider]||provider;let serial=0,lastPaint=0,limited=false;
 const now=()=>new Date(clock()).toISOString();
 const paint=()=>{if(clock()-lastPaint>=250){lastPaint=clock();for(const row of rows.values())if(row.status==='running')row.lastObservedAt=now();update();}};
 const add=(key,data)=>{
  if(rows.has(key))return rows.get(key);
  if(rows.size>=500){if(!limited){limited=true;emit('system',label+' activity detail limit reached; further phase details were not recorded. Messages and tool results remain available.');}return null;}
  const row={id:randomUUID(),provider,...data};rows.set(key,row);emit('system',label+' · '+row.label,{activity:row});return row;
 };
 const start=(key,kind,source,agentId)=>add(key,{kind,label:kind==='thinking'?'Thinking':'Writing response',source,status:'running',startedAt:now(),...(agentId?{agentId:String(agentId).slice(0,160)}:{})});
 const end=(key,status='completed')=>{const row=rows.get(key);if(!row||row.status!=='running')return;row.status=status;row.finishedAt=now();row.durationMs=Math.max(0,Date.parse(row.finishedAt)-Date.parse(row.startedAt));update();};
 const boundary=(agentId)=>{for(const [key,row]of rows)if(row.status==='running'&&row.agentId===(agentId||undefined))end(key);};
 const summary=(key,values,index=0,append=false)=>{
  if(provider!=='codex')return;const row=rows.get(key);if(!row)return;
  let parts=summaries.get(key)||[];
  if(Array.isArray(values))parts=values.filter(v=>typeof v==='string').slice(0,32).map(v=>displayText(v.slice(0,12001),12001));
  else if(typeof values==='string'&&Number.isSafeInteger(index)&&index>=0&&index<32)parts[index]=displayText(((append?parts[index]||'':'')+values).slice(0,12001),12001);
  let remaining=12000;for(let i=0;i<parts.length;i++){if(!parts[i])continue;if(parts[i].length>remaining)row.summaryTruncated=true;parts[i]=parts[i].slice(0,Math.max(0,remaining));remaining-=parts[i].length+2;}
  summaries.set(key,parts);row.summary=parts.filter(Boolean).join('\n\n').slice(0,12000);paint();
 };
 const usage=(key,values,scope,source,agentId)=>{
  const numbers=Object.fromEntries(Object.entries(values).filter(([,v])=>count(v)!==undefined));if(!Object.keys(numbers).length)return;
  const row=add('usage:'+key,{kind:'usage',label:'Usage',status:'completed',source,scope,...(agentId?{agentId:String(agentId).slice(0,160)}:{}),observedAt:now()});if(!row)return;row.values=numbers;row.observedAt=now();update();
 };
 const receive=event=>{
  if(provider==='copilot'){
   const d=event.data||{},agent=event.agentId;
   const think='think:'+String(agent)+':'+d.reasoningId,text='text:'+String(agent)+':'+d.messageId;
   if(['assistant.reasoning_delta','assistant.reasoning'].includes(event.type)&&typeof d.reasoningId==='string'){
    if(event.type==='assistant.reasoning_delta'){start(think,'thinking',event.type,agent);paint();}
    else if(rows.has(think))end(think);else add(think,{kind:'thinking',label:'Thinking',source:event.type,status:'completed',observedAt:now(),...(agent?{agentId:agent}:{})});
   }
   if(event.type==='assistant.message_delta'&&d.deltaContent){if(!rows.has(text))boundary(agent);start(text,'response',event.type,agent);}
   if(event.type==='assistant.message')end(text);
   if(event.type==='tool.execution_start')boundary(agent);
   if(event.type==='assistant.usage')usage(event.id||'request:'+serial++,{inputTokens:d.inputTokens,outputTokens:d.outputTokens,cachedInputTokens:d.cacheReadTokens,cacheWriteInputTokens:d.cacheWriteTokens,reasoningTokens:d.reasoningTokens},'model-request','Copilot assistant.usage',agent);
  }else if(provider==='claude'){
   if(event.type==='stream_event'){
    const e=event.event||{},agent=event.parent_tool_use_id||undefined;
    if(e.type==='message_start')blocks.set('message:'+String(agent),e.message?.id||'claude');
    const key='block:'+String(agent)+':'+blocks.get('message:'+String(agent))+':'+e.index;
    const kind=e.content_block?.type==='thinking'||e.delta?.type==='thinking_delta'?'thinking':e.content_block?.type==='text'||e.delta?.type==='text_delta'?'response':null;
    if(kind){start(key,kind,'Claude '+(kind==='thinking'?'thinking':'text')+' block',agent);paint();}
    if(e.type==='content_block_stop')end(key);
   }
   if(event.type==='result'){
    for(const key of rows.keys())end(key,event.is_error||event.subtype!=='success'?'interrupted':'completed');
    const u=event.usage||{},parts=[u.input_tokens,u.cache_read_input_tokens,u.cache_creation_input_tokens];
    usage('result:'+serial++,{inputTokens:parts.every(v=>count(v)!==undefined)?parts.reduce((a,b)=>a+b,0):undefined,uncachedInputTokens:u.input_tokens,outputTokens:u.output_tokens,cachedInputTokens:u.cache_read_input_tokens,cacheWriteInputTokens:u.cache_creation_input_tokens},'turn','Claude result.usage');
   }
  }else if(provider==='codex'){
   const {method,params:p={}}=event,item=p.item;
   if(method==='item/started'&&item?.type==='reasoning')start(item.id,'thinking','Codex reasoning item');
   if(method==='item/reasoning/summaryTextDelta'){start(p.itemId,'thinking','Codex reasoning summary');summary(p.itemId,p.delta,p.summaryIndex,true);}
   if(method==='item/reasoning/textDelta'){if(!rows.has(p.itemId))start(p.itemId,'thinking','Codex reasoning item');paint();}
   // The raw item/reasoning/textDelta and item.content are deliberately ignored.
   if(method==='item/agentMessage/delta'&&p.delta){if(!rows.has('text:'+p.itemId))boundary();start('text:'+p.itemId,'response','Codex agentMessage stream');}
   if(method==='item/completed'&&item?.type==='reasoning'){if(!rows.has(item.id))add(item.id,{kind:'thinking',label:'Thinking',source:'Codex reasoning item',status:'completed',observedAt:now()});if(item.summary?.length)summary(item.id,item.summary);end(item.id);}
   if(method==='item/completed'&&item?.type==='agentMessage')end('text:'+item.id);
   if(method==='thread/tokenUsage/updated'){const u=p.tokenUsage?.total||{};usage('session',{inputTokens:u.inputTokens,outputTokens:u.outputTokens,cachedInputTokens:u.cachedInputTokens,reasoningTokens:u.reasoningOutputTokens,totalTokens:u.totalTokens},'session','Codex thread/tokenUsage/updated');}
  }
 };
 return {start,end,boundary,usage,receive,pulse:paint,finish(status='interrupted'){for(const key of rows.keys())end(key,status);}};
}
