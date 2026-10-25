import {attachmentText} from './provider-attachment-input.js';
const ids=values=>[...new Set((Array.isArray(values)?values:[]).filter(v=>typeof v==='string'&&/^[\w.-]{1,80}$/.test(v)))];
export function mtplxModel(model,settings={}) {
  const window=model.context_length??model.max_context_length??model.max_model_len;
  const policy=settings.model===model.id?(settings.reasoning_policy||settings.model_controls?.reasoning):null;
  const efforts=policy?.supported===true?ids(policy.effort_levels):[],modes=policy?.supported===true?ids(policy.modes).filter(v=>['auto','on','off'].includes(v)):[];
  return {id:model.id,name:model.id,description:'Local MTPLX model',supportsVision:model.supports_vision===true&&model.modalities?.input?.includes('image')===true,
    controls:{reasoningEfforts:efforts,reasoningSupported:policy?.supported??null,defaultReasoningEffort:efforts.includes(settings.reasoning_effort)?settings.reasoning_effort:efforts.includes(policy?.default_effort)?policy.default_effort:null,reasoningModes:modes,defaultReasoningMode:modes.includes(settings.reasoning)?settings.reasoning:null,autoThinkingEnabled:policy?.default_mode!=='off',contextTiers:[{id:'default',promptTokens:null,totalTokens:Number.isSafeInteger(window)&&window>0?window:null}],maxOutputTokens:Number.isSafeInteger(settings.max_response_tokens)&&settings.max_response_tokens>0?settings.max_response_tokens:null,serviceTiers:[]}};
}
export function mtplxReasoning(schedule,model){
  const result={};
  if(schedule.reasoningMode)result.enable_thinking=schedule.reasoningMode==='off'?false:schedule.reasoningMode==='on'?true:model.controls.autoThinkingEnabled;
  if(schedule.reasoningEffort&&result.enable_thinking!==false)result.reasoning_effort=schedule.reasoningEffort;
  return result;
}
export function mtplxInput(prompt,attachments,model){
  if(!attachments.length)return prompt;
  const content=[{type:'text',text:prompt}];
  for(const item of attachments){
    if(!Buffer.isBuffer(item.bytes)||item.bytes.length>8*1024*1024)throw Error('Attachment exceeds the supported byte limit.');
    if(item.mediaType==='text/plain')content.push({type:'text',text:attachmentText(item,'MTPLX')});
    else if(model.supportsVision&&['image/png','image/jpeg','image/webp'].includes(item.mediaType))content.push({type:'image_url',image_url:{url:`data:${item.mediaType};base64,${item.bytes.toString('base64')}`}});
    else throw Error('The loaded MTPLX model does not advertise support for this image type. Choose a vision model or plain text.');
  }
  return content;
}
export function mtplxMessages(run,prompt,instructions){
  const history=structuredClone(run.mtplxHistory||[]);
  // A crash/cancel may leave a recorded tool intent without its result. Never
  // replay that intent as an execution. Close the protocol pair with uncertainty.
  const answered=new Set(history.filter(m=>m.role==='tool').map(m=>m.tool_call_id));
  for(let i=history.length-1;i>=0;i--)if(history[i].tool_calls){const missing=history[i].tool_calls.filter(c=>!answered.has(c.id));if(missing.length)history.splice(i+1,0,...missing.map(c=>({role:'tool',tool_call_id:c.id,content:'Previous turn interrupted before a confirmed result. The operation may have occurred. Inspect external state; never automatically repeat it.'})));}
  if(!run.mtplxHistory){for(const event of run.events||[])if(['user','assistant'].includes(event.role)&&!['queued','removed','failed','sending'].includes(event.data?.delivery?.state)&&event.text?.trim())history.push({role:event.role,content:event.text});if(history.at(-1)?.role==='user'&&history.at(-1)?.content===prompt)return [{role:'system',content:instructions},...history];}
  return [{role:'system',content:instructions},...history,{role:'user',content:prompt}];
}
export async function* mtplxEvents(body){
  const decoder=new TextDecoder();let buffer='',data=[],size=0;
  const line=value=>{if(value===''){const frame=data.join('\n');data=[];size=0;return frame||null;}if(value.startsWith('data:')){size+=value.length;if(size>2_000_000)throw Error('MTPLX stream frame is too large.');data.push(value.slice(5).replace(/^ /,''));}return null;};
  for await(const chunk of body){buffer+=decoder.decode(chunk,{stream:true});if(buffer.length>2_000_000)throw Error('MTPLX stream frame is too large.');let at;while((at=buffer.indexOf('\n'))!==-1){const frame=line(buffer.slice(0,at).replace(/\r$/,''));buffer=buffer.slice(at+1);if(frame!==null)yield frame;}}
  buffer+=decoder.decode();if(buffer)line(buffer.replace(/\r$/,''));const frame=line('');if(frame!==null)yield frame;
}
/** Evict only complete older user turns; keep current context and the latest
 * user turn intact. No generated summary is presented as original evidence. */
export function trimMtplxHistory(messages,window,output,tools){
  if(!window)return {messages,dropped:0};
  // UTF-8 bytes are a deliberately conservative bound, not a claimed tokenizer.
  const budget=window-output-2048,toolCost=Buffer.byteLength(JSON.stringify(tools||[]));
  // Image payload bytes are not token counts. Reserve a budget per image and
  // leave exact image/token accounting to MTPLX's authoritative admission check.
  const cost=items=>{let images=0;const text=JSON.stringify(items,(key,value)=>{if(key==='url'&&typeof value==='string'&&value.startsWith('data:image/')){images++;return '[image]';}return value;});return Buffer.byteLength(text)+toolCost+images*32768;};
  const result=[...messages];let dropped=0;
  while(cost(result)>budget){let next=-1;for(let i=2;i<result.length;i++)if(result[i].role==='user'){next=i;break;}if(next<0)throw Error('Current selected context, tools and message exceed the conservative MTPLX context budget. Select fewer sources or send smaller attachments.');dropped+=next-1;result.splice(1,next-1);}
  return {messages:result,dropped};
}
