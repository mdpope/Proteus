// Shared presentation data for desktop and encrypted mobile clients. Raw details stay available.
const secret = /password|passwd|secret|token|api[_-]?key|authorization|cookie|credential/i;
const safe = (v, key = '') => secret.test(key) ? '[redacted]' : Array.isArray(v) ? v.map(x => safe(x)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k,x]) => [k,safe(x,k)])) : v;
const clip = (v, n = 1200) => String(v ?? '').slice(0,n);
const parse = v => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return v; } };
const label = s => s.replace(/[_-]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,x=>x.toUpperCase());
const scalar = x => x === null || ['string','number','boolean'].includes(typeof x);
export function structuredOutput(input) {
 let value = safe(parse(input));
 if (value?.content && Array.isArray(value.content)) value = value.content.filter(x=>x.type==='text').map(x=>x.text).join('\n');
 value = safe(parse(value));
 if (typeof value?.snapshot === 'string') return {kind:'text',text:clip([value.title,value.url,value.snapshot].filter(Boolean).join('\n'),8000)};
 const list = Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value).find(x=>Array.isArray(x)&&x.length&&x.every(y=>y&&typeof y==='object'&&!Array.isArray(y))) : null;
 if (list?.length && list.every(x=>x&&typeof x==='object'&&!Array.isArray(x))) {
   const columns = [...new Set(list.slice(0,20).flatMap(x=>Object.keys(x).filter(k=>scalar(x[k]))))].slice(0,6);
   if(columns.length) return {kind:'table',columns:columns.map(label),rows:list.slice(0,20).map(x=>columns.map(k=>clip(x[k],500))),summary:`${list.length} items${list.length>20?' · showing first 20':''}`};
 }
 if(value&&typeof value==='object'&&!Array.isArray(value)) {
   const facts=Object.entries(value).filter(([,v])=>scalar(v)).slice(0,14).map(([k,v])=>({label:label(k),value:clip(v)}));
   if(facts.length)return {kind:'facts',facts};
 }
 return {kind:'text',text:clip(typeof value==='string'?value:Array.isArray(value)&&value.every(scalar)?value.join('\n'):JSON.stringify(value,null,2),8000)};
}
export function safeToolError(value) {
 const candidate=parse(value);
 if(Array.isArray(candidate))return safeToolError(candidate.filter(item=>item?.type==='text').map(item=>item.text).join('\n'));
 if(candidate&&typeof candidate==='object')return safeToolError(candidate.error??candidate.message??candidate.failureReason??candidate.structuredContent?.error??candidate.content??candidate.contents?.filter(x=>x.type==='text').map(x=>x.text).join('\n'));
 if(typeof candidate!=='string'||!candidate.trim())return null;
 return clip(candidate.replace(/\b(Bearer\s+)[\w.+/=-]+/gi,'$1[redacted]').replace(/((?:password|passwd|secret|token|access[_ -]?token|refresh[_ -]?token|api[_ -]?key|authorization|cookie|credential)"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,}]+)/gi,'$1[redacted]').replace(/(https?:\/\/)[^/@\s]+:[^/@\s]+@/gi,'$1[redacted]@').replace(/([?&](?:token|key|secret|code|password|access_token|refresh_token|api_key)=)[^&#\s]+/gi,'$1[redacted]'),4000);
}
export function normalizedTool(tool) {
 const exitCode=['bash','shell','powershell'].includes(tool.name)&&typeof tool.output==='string'&&tool.output.match(/<shellId: [^<>\r\n]+ completed with exit code ([1-9]\d*)>\s*$/)?.[1];
 const output=tool.presentation&&Object.hasOwn(tool.presentation,'error')?null:parse(tool.output),error=safeToolError(tool.error)||safeToolError(tool.presentation?.error)||safeToolError(output?.error)||(exitCode?`Command exited with code ${exitCode}.`:null);
 return {...tool,...(error?{error,status:'failed'}:{})};
}
export function isActivityEvent(event) {
 if(event?.data?.question||event?.data?.agentFeedback)return false;
 const role=event?.role||event?.type;
 return Boolean(event?.data?.tool||event?.data?.permission||role==='tool'||role==='system');
}
export function groupActivity(entries) {
 const result=[];let batch=[];
 const flush=()=>{if(batch.length){result.push({key:'activity-'+batch[0].key,role:'activity',items:batch,at:batch.at(-1).at});batch=[];}};
 for(const entry of entries){if(isActivityEvent(entry)){batch.push(entry);continue;}flush();result.push(entry);}flush();return result;
}
export function permissionToolCallId(permission) {
 const request=parse(permission?.request);
 return permission?.toolCallId||request?.toolCallId||null;
}
export function toolEventTime(tool,event) {
 // Event timestamps identify the start of a mutable tool row, never its completion.
 return tool.finishedAt||((tool.status==='running'||tool.status==='output')?(tool.startedAt||event.at||event.timestamp||event.createdAt):null);
}
export function activitySummary(tools,approvals=0,decisions=0,systems=0) {
 const failed=tools.filter(tool=>['failed','error'].includes(normalizedTool(tool).status)).length,running=tools.filter(tool=>normalizedTool(tool).status==='running').length;
 return `Activity${tools.length?' · '+tools.length+' '+(tools.length===1?'tool':'tools'):''}${approvals?' · '+approvals+' automatic '+(approvals===1?'approval':'approvals'):''}${decisions?' · '+decisions+' permission '+(decisions===1?'decision':'decisions'):''}${systems?' · '+systems+' system '+(systems===1?'message':'messages'):''}${failed?' · '+failed+' failed':''}${running?' · '+running+' running':''}`;
}
export function toolPresentation(tool) {
 tool=normalizedTool(tool);
 const args=safe(parse(tool.arguments)||{}), facts=[];
 const targets=[args.path,args.file_path,args.filePath,args.fileName,args.url,args.cwd].filter(x=>typeof x==='string'&&x);
 const command=args.command||args.cmd||args.fullCommandText;
 for(const key of ['action','pattern','query','description','serverName','toolName'])if(args[key]!=null&&scalar(args[key]))facts.push({label:label(key),value:clip(args[key])});
 if(typeof tool.arguments==='string')for(const match of tool.arguments.matchAll(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/gm))targets.push(match[1]);
 return {targets:[...new Set(targets)].slice(0,20),facts,command:typeof command==='string'?clip(command,6000):null,output:structuredOutput(tool.output),progress:tool.progress||null,approval:tool.approval||null,error:tool.error||null};
}
export function requestPresentation(request) {
 const d=safe(request||{});return {kind:'facts',facts:[['Action',d.intention||d.kind],['Tool',d.toolName],['Server',d.serverName],['Path',d.path||d.fileName||d.resolvedPath],['Command',d.fullCommandText],['Website',d.url],['Reason',d.reason]].filter(([,v])=>v).map(([label,value])=>({label,value:clip(value,6000)}))};
}
export function mountStructured(target, value) {
 target.replaceChildren();if(!value)return;
 const text=(tag,s)=>{const el=document.createElement(tag);el.textContent=s;return el;};
 if(value.kind==='table'){
   const wrap=document.createElement('div');wrap.className='tool-table';const table=document.createElement('table'),head=document.createElement('tr');
   for(const col of value.columns)head.append(text('th',col));const thead=document.createElement('thead');thead.append(head);table.append(thead);
   const body=document.createElement('tbody');for(const row of value.rows){const tr=document.createElement('tr');for(const cell of row)tr.append(text('td',cell));body.append(tr);}table.append(body);wrap.append(table);target.append(text('p',value.summary||''),wrap);
 }else if(value.kind==='facts'){
   const dl=document.createElement('dl');dl.className='detail-facts';for(const fact of value.facts){dl.append(text('dt',fact.label),text('dd',fact.value));}target.append(dl);
 }else if(value.text)target.append(text('pre',value.text));
}
