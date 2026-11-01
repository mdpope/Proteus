import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';

const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/i.test(value);
const terminal=new Set(['completed','failed','cancelled','interrupted']);
const receipt=job=>Object.fromEntries(['id','deviceId','providerId','modelId','digest','status','createdAt','finishedAt','error'].filter(k=>job[k]!==undefined).map(k=>[k,job[k]]));
// Only receipt metadata survives restart. Prompts, results and tool schemas stay
// in bounded memory; this host never executes the consumer's advertised tools.
export class InferenceJobs {
 constructor({file,authorize,adapter,now=Date.now,idleMs=45000}){
  Object.assign(this,{file,authorize,adapter,now,idleMs});this.jobs=new Map();this.active=new Map();this.workers=new Set();this.closed=false;
  this.saved=readJSON(file,{schemaVersion:1,jobs:[]});
  if(this.saved.schemaVersion!==1||!Array.isArray(this.saved.jobs)||this.saved.jobs.length>128)throw Error('Inspect the shared inference receipt store.');
  for(const old of this.saved.jobs){if(!uuid(old.id)||!uuid(old.deviceId)||!['llama-cpp','mtplx'].includes(old.providerId)||typeof old.modelId!=='string')throw Error('Invalid shared inference receipt.');this.jobs.set(old.deviceId+':'+old.id,{...old,status:terminal.has(old.status)?old.status:'interrupted',error:terminal.has(old.status)?old.error:'The serving computer restarted. The request was not replayed.',chunks:[],base:0,next:0,lastPoll:now()});}
  if(this.jobs.size)this.save();
  this.timer=setInterval(()=>this.expire(),5000);this.timer.unref?.();
 }
 save(){atomicJSON(this.file,{...this.saved,jobs:[...this.jobs.values()].map(receipt)});fs.chmodSync(this.file,0o600);}
 check(job){if(this.closed)throw Error('Shared inference is closing.');this.authorize(job.deviceId,job.providerId);}
 start(deviceId,peerId,{id,providerId,modelId,body}){
  const job={id,deviceId,peerId,providerId,modelId};this.check(job);
  if(!uuid(id)||typeof modelId!=='string'||!modelId||modelId.length>200||!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid inference request.');
  if(Buffer.byteLength(JSON.stringify(body))>850000||!Array.isArray(body.messages)||!body.messages.length||body.messages.length>2048||!Number.isSafeInteger(body.max_tokens)||body.max_tokens<1||body.max_tokens>16384||body.tools&&(!Array.isArray(body.tools)||body.tools.length>128))throw Error('Shared inference request exceeds its text/tool budget.');
  const allowed=new Set(['model','messages','tools','stream','stream_options','max_tokens','enable_thinking','reasoning_effort','tool_choice','parallel_tool_calls']);
  if(Object.keys(body).some(key=>!allowed.has(key)))throw Error('Unsupported shared inference option.');
  const key=deviceId+':'+id,digest=createHash('sha256').update(JSON.stringify([providerId,modelId,body])).digest('hex'),prior=this.jobs.get(key);
  if(prior){if(prior.status==='cancelled'&&!prior.digest)return {id,status:prior.status};if(prior.digest!==digest)throw Error('Inference ID was used for different input.');return {id,status:prior.status};}
  if([...this.jobs.values()].filter(j=>!terminal.has(j.status)).length>=16)throw Error('The shared model queue is full.');
  while(this.jobs.size>=128){const entry=[...this.jobs.entries()].find(([,j])=>terminal.has(j.status));if(!entry)throw Error('The shared model receipt budget is full.');this.jobs.delete(entry[0]);}
  Object.assign(job,{digest,body:structuredClone(body),status:'queued',createdAt:new Date(this.now()).toISOString(),lastPoll:this.now(),chunks:[],bytes:0,base:0,next:0,controller:new AbortController()});
  this.jobs.set(key,job);try{this.save();}catch(error){this.jobs.delete(key);throw error;}
  queueMicrotask(()=>this.pump(providerId));return {id,status:'queued'};
 }
 pump(providerId){
  if(this.closed||this.active.has(providerId))return;
  const job=[...this.jobs.values()].find(j=>j.providerId===providerId&&j.status==='queued');if(!job)return;
  this.active.set(providerId,job);job.status='running';
  const task=this.execute(job).finally(()=>{this.active.delete(providerId);this.workers.delete(task);this.pump(providerId);});this.workers.add(task);
 }
 async execute(job){
  try{
   this.check(job);const adapter=this.adapter(job.providerId),models=await adapter.models(job.controller.signal);this.check(job);
   const model=models.find(m=>m.id===job.modelId);if(!model)throw Error('The selected model is no longer loaded on the serving computer.');
   if(model.controls?.maxOutputTokens&&job.body.max_tokens>model.controls.maxOutputTokens)throw Error('Requested output exceeds the serving model limit.');
   if(job.body.reasoning_effort&&!model.controls?.reasoningEfforts?.includes(job.body.reasoning_effort))throw Error('The serving model does not advertise that reasoning effort.');
   if(job.body.enable_thinking!==undefined&&(!model.controls?.reasoningModes?.length||typeof job.body.enable_thinking!=='boolean'))throw Error('The serving model does not advertise thinking controls.');
   job.controller.signal.throwIfAborted();
   const response=await adapter.request(adapter.endpoint+'/chat/completions',{method:'POST',redirect:'error',signal:job.controller.signal,headers:{'Content-Type':'application/json',...adapter.requestHeaders()},body:JSON.stringify({...job.body,model:job.modelId,stream:true,stream_options:{include_usage:true},parallel_tool_calls:false})});
   if(!response.ok)throw Error('The serving model returned HTTP '+response.status+'. Check its context and settings.');
   if(!response.body||!response.headers.get('content-type')?.includes('text/event-stream'))throw Error('The serving model did not return a chat stream.');
   for await(const chunk of response.body){
    this.check(job);job.controller.signal.throwIfAborted();const bytes=Buffer.from(chunk);
    for(let offset=0;offset<bytes.length;offset+=16384){const part=bytes.subarray(offset,offset+16384);job.bytes+=part.length;if(job.bytes>2000000)throw Error('Shared inference stopped because the receiving computer is not draining output.');job.chunks.push({seq:job.next++,data:part.toString('base64')});}
   }
   job.controller.signal.throwIfAborted();this.check(job);job.status='completed';
  }catch(error){if(!terminal.has(job.status)){job.status=job.controller.signal.aborted?'cancelled':'failed';job.error=error.message;}}
  finally{job.finishedAt=new Date(this.now()).toISOString();delete job.body;try{this.save();}catch{job.status='failed';job.error='The serving computer could not save the inference outcome. No retry was performed.';}}
 }
 find(deviceId,{id,providerId}){const job=this.jobs.get(deviceId+':'+id);if(!job||job.providerId!==providerId)throw Error('Inference outcome is unavailable. Do not resend the request automatically.');this.check(job);return job;}
 poll(deviceId,args){
  const job=this.find(deviceId,args),cursor=args.cursor??0;if(!Number.isSafeInteger(cursor)||cursor<job.base||cursor>job.next)throw Error('Inference stream cursor is unavailable; no request was replayed.');
  job.lastPoll=this.now();while(job.chunks.length&&job.chunks[0].seq<cursor){const part=job.chunks.shift();job.bytes-=Buffer.byteLength(part.data,'base64');}job.base=cursor;
  const available=terminal.has(job.status)?job.chunks:job.chunks.slice(0,-1),chunks=available.slice(0,12),next=chunks.length?chunks.at(-1).seq+1:cursor;return {id:job.id,status:job.status,cursor:next,finished:terminal.has(job.status)&&next===job.next,chunks:chunks.map(p=>p.data),...(job.error?{error:job.error}:{})};
 }
 stop(job,reason='Cancelled by the receiving computer.'){
  if(terminal.has(job.status))return;
  job.status='cancelled';job.error=reason;job.finishedAt=new Date(this.now()).toISOString();job.controller?.abort();delete job.body;this.save();
 }
 cancel(deviceId,args){
  let job=this.jobs.get(deviceId+':'+args.id);
  if(!job){
   if(!uuid(args.id))throw Error('Invalid inference cancellation.');this.authorize(deviceId,args.providerId);
   while(this.jobs.size>=128){const old=[...this.jobs.entries()].find(([,j])=>terminal.has(j.status));if(!old)throw Error('The inference receipt budget is full.');this.jobs.delete(old[0]);}
   // Cancellation may arrive before an acknowledged start. Keep a tombstone so
   // late delivery cannot start a generation after the user has pressed Stop.
   job={id:args.id,deviceId,providerId:args.providerId,modelId:'',status:'cancelled',createdAt:new Date(this.now()).toISOString(),finishedAt:new Date(this.now()).toISOString(),error:'Cancelled before generation started.',chunks:[],base:0,next:0,bytes:0};this.jobs.set(deviceId+':'+args.id,job);this.save();
  }else{if(job.providerId!==args.providerId)throw Error('Inference cancellation provider changed.');this.check(job);this.stop(job);}
  return {id:job.id,status:job.status};
 }

 revoke(deviceId,providerId){for(const job of this.jobs.values())if(job.deviceId===deviceId&&(!providerId||job.providerId===providerId))this.stop(job,'Model sharing access was revoked.');}
 disconnect(peerId){for(const job of this.jobs.values())if(job.peerId===peerId)this.stop(job,'The paired connection closed. The request was not replayed.');}
 expire(){for(const job of this.jobs.values())if(!terminal.has(job.status)&&(this.now()-job.lastPoll>this.idleMs||this.now()-Date.parse(job.createdAt)>1800000))this.stop(job,'Shared inference expired without an active receiving computer.');}
 async close(){this.closed=true;clearInterval(this.timer);for(const job of this.jobs.values())this.stop(job,'The serving computer is shutting down.');await Promise.allSettled([...this.workers]);}
}
