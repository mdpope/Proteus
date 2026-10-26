import {bindRuntimeTimer,toolDuration,formatDuration} from './runtime.js';
const names={mtplx:'MTPLX',codex:'Codex',claude:'Claude',copilot:'Copilot'};
const fields={inputTokens:'Input tokens',uncachedInputTokens:'Uncached input tokens',outputTokens:'Output tokens',cachedInputTokens:'Cached input tokens',cacheWriteInputTokens:'Cache-write input tokens',reasoningTokens:'Reasoning tokens',totalTokens:'Total tokens'};
export function providerActivityState(activity,run,verified=true){
 const live=activity.status==='running'&&['running','awaiting_input'].includes(run.status)&&verified;
 return {live,status:activity.status==='running'&&!live?'End not recorded':activity.status==='running'?'In progress':activity.status==='completed'?'Completed':'Interrupted',duration:activity.status==='running'&&!live?null:toolDuration(activity,Date.now(),verified)};
}
/** Activity is trusted adapter metadata, not assistant markup or a new message.
 * Missing historic telemetry stays unknown; running rows need live owner proof. */
export function mountProviderActivity(row,item,run,{time,verified,now,disclosures,resize,renderMarkdown,...options}){
 const a=item.data.activity,state=providerActivityState(a,run,verified);row.classList.add('provider-activity',a.status||'completed');row.dataset.providerActivity=a.kind;row.dataset.providerActivityId=a.id;
 const text=(tag,value,cls)=>{const node=document.createElement(tag);node.textContent=value;if(cls)node.className=cls;return node;};
 row.append(text('strong',(names[a.provider]||a.provider)+' · '+a.label));
 const stamp=a.finishedAt||a.observedAt||a.startedAt||item.at,note=text('div',state.status+(stamp?' · '+time(stamp):'')+(a.scope?' · '+({'model-request':'Model request',turn:'Turn aggregate',session:'Session aggregate'}[a.scope]||a.scope):''),'note');row.append(note);
 if(a.kind!=='usage'){const timer=document.createElement('span');note.append(timer);bindRuntimeTimer(timer,()=>formatDuration(a.status==='running'&&!state.live?null:toolDuration(a,now(),verified))+(verified?'':' · offline, unverified'),state.live);}
 if(a.summary){row.append(text('p','Provider summary: '+a.summary.slice(0,140)+(a.summary.length>140?'…':''),'provider-summary-preview'));}
 const details=document.createElement('details');details.dataset.disclosureKey=item.key+':provider-activity';details.open=disclosures.has(details.dataset.disclosureKey);details.append(text('summary',a.kind==='usage'?'Usage details':'Activity details'));
 const body=document.createElement('div');details.append(body);row.append(details);
 const populate=()=>{
  if(body.childElementCount)return;
  if(a.summary){body.append(text('p','Provider-supplied summary','note'));const summary=document.createElement('div');body.append(summary);(renderMarkdown||globalThis.ProteusMarkdown.mount)(summary,a.summary,{...options,resize});if(a.summaryTruncated)body.append(text('p','Summary display was shortened to the recorded limit.','note'));}
  const facts=document.createElement('dl');facts.className='detail-facts';const fact=(key,value)=>{facts.append(text('dt',key),text('dd',value));};
  fact('Source',a.source||'Not recorded');if(a.agentId)fact('Agent',a.agentId);
  if(a.kind==='usage'){
   for(const [key,label]of Object.entries(fields))fact(label,Number.isSafeInteger(a.values?.[key])?a.values[key].toLocaleString():'Not reported');
  }else{fact('First observed',a.startedAt?time(a.startedAt):'Start not recorded');fact('Last observed',a.finishedAt?time(a.finishedAt):'End not recorded');}
  body.append(facts);
  body.append(text('p',a.kind==='usage'?'Values belong to the scope shown above. Cache and reasoning counts can be subsets of input/output; do not add them to totals. Missing values are not zero.':'This is the observed streaming interval, which may include transport or waiting. It is not exact inference time. '+(a.summary?'':'No concise provider summary was supplied. Raw internal reasoning is not stored here.'),'note'));
 };
 details.ontoggle=()=>{if(details.open){disclosures.add(details.dataset.disclosureKey);populate();}else disclosures.delete(details.dataset.disclosureKey);};if(details.open)populate();
}
