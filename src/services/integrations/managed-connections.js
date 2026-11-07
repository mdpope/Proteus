import {randomUUID} from 'node:crypto';
import {revision} from '../scheduling/schedules.js';

const messages={
 CLI_STORAGE_UNQUALIFIED:'Azure CLI protected cache and profile isolation are unqualified on this platform; existing caches are unchanged.',
 CLI_UNAVAILABLE:'The pinned corporate Azure CLI is unavailable.',
 PAT_REQUIRED:'Enter the approved PAT in the owner connection UI.',
 PAT_EXPIRED:'Replace the expired PAT in the owner connection UI.',
 CONFIGURATION_MISMATCH:'The captured connection configuration changed.',
 CONNECTION_CLOSED:'The managed connection is closed.',
 UNAVAILABLE:'The connection is temporarily unavailable.',
 TIMEOUT:'The connection request timed out.',
 AUTH_REQUIRED:'Owner sign-in is required.',
 ACCESS_DENIED:'The expected account cannot access the required resource.',
 STORE_LOCKED:'Unlock the owner credential store.',
 RATE_LIMITED:'The service rate limit requires a cooldown.',
 CAPABILITY_MISMATCH:'The required connected tool capability is unavailable.',
 PERMISSION_DENIED:'This run has not authorized that tool operation.',
 INVALID_RESULT:'The connector returned an invalid result.'
};
const failure=(code,extra={})=>Object.assign(Error(messages[code]||messages.UNAVAILABLE),{code,...extra});
const readOnly=tool=>tool?.annotations?.readOnlyHint===true&&tool.annotations.destructiveHint!==true;
const key=binding=>binding.connectionId+':'+binding.configurationRevision;
function classified(error){
 const code=Object.hasOwn(messages,error?.code)?error.code:
 ['SIGN_IN_REQUIRED','ROTATION_UNCERTAIN','RENEWAL_FAILED','AUTH_EXPIRED'].includes(error?.code)?'AUTH_REQUIRED':
 error?.code==='CREDENTIAL_STORE_UNAVAILABLE'?'STORE_LOCKED':'UNAVAILABLE';
 return failure(code,{retryAfterMs:Number.isFinite(error?.retryAfterMs)?Math.max(0,Math.min(3600000,error.retryAfterMs)):null});
}
async function bounded(work,timeout,signal){
 const controller=new AbortController(),abort=()=>controller.abort(signal.reason||failure('CONNECTION_CLOSED'));
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 let timer,listener;
 const deadline=new Promise((_,reject)=>{
  listener=()=>reject(controller.signal.reason||failure('CONNECTION_CLOSED'));
  controller.signal.addEventListener('abort',listener,{once:true});
  timer=setTimeout(()=>controller.abort(failure('TIMEOUT')),timeout);
  if(controller.signal.aborted)listener();
 });
 try{return await Promise.race([Promise.resolve().then(()=>{if(controller.signal.aborted)throw controller.signal.reason;return work(controller.signal);}),deadline]);}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',listener);}
}
// Shared runtime owner. Adapters alone possess credential access. Consumers hold a
// run-scoped lease and every call is checked against its current authority.
export class ManagedConnections {
 constructor({registry,adapters={},now=()=>Date.now(),onChange=()=>{},notify=()=>{}}){
  this.registry=registry;this.adapters=adapters;this.now=now;this.onChange=onChange;this.notify=notify;
  this.slots=new Map();this.retired=new Set();this.observations=new Map();this.checks=new Map();this.leases=new Map();this.closed=false;
 }
 definition(binding){
  if(this.closed)throw failure('CONNECTION_CLOSED');
  try{return this.registry.resolve(binding);}catch{throw failure('CONFIGURATION_MISMATCH');}
 }
 status(binding){
  const definition=this.definition(binding),observation=this.observations.get(key(binding));
  return {connectionId:binding.connectionId,name:definition.name,configurationRevision:binding.configurationRevision,
   configured:true,ownerId:binding.ownerId,workspaceId:binding.workspaceId,
   ...(observation||{state:'unchecked',transport:'unchecked',authentication:'unverified',access:'unverified',generation:0}),
   stale:this.slots.get(key(binding))?.client?.isExpired?.()===true||!observation?.checkedAt||this.now()-Date.parse(observation.checkedAt)>definition.policy.healthIntervalMs};
 }
 observe(binding,patch){
  const identity=key(binding),prior=this.observations.get(identity)||{generation:0};
  const recovered=patch.state==='ready'&&prior.state&&prior.state!=='ready';
  const next={...prior,...patch,generation:prior.generation+(recovered?1:0)};
  this.observations.set(identity,next);this.onChange({connectionId:binding.connectionId,...next});
  return next;
 }
 failed(binding,error){
  const safe=classified(error),prior=this.observations.get(key(binding))||{},attempts=(prior.failures||0)+1;
  const cooldown=safe.retryAfterMs??Math.min(900000,1000*2**Math.min(attempts,10));
  const action=['AUTH_REQUIRED','STORE_LOCKED','ACCESS_DENIED','CLI_STORAGE_UNQUALIFIED','CLI_UNAVAILABLE','PAT_REQUIRED','PAT_EXPIRED'].includes(safe.code);
  const next=this.observe(binding,{state:safe.code.toLowerCase().replaceAll('_','-'),reason:safe.message,
   transport:'unverified',authentication:'unverified',access:'unverified',failures:attempts,
   nextRetryAt:new Date(this.now()+cooldown).toISOString(),requiredAction:action?safe.code:null});
  if(action&&prior.requiredAction!==safe.code)this.notify({connectionId:binding.connectionId,code:safe.code,reason:safe.message});
  return next;
 }
 async connection(binding,{signal,repair=false}={}){
  const definition=this.definition(binding),identity=key(binding),observation=this.observations.get(identity);
  if(!repair&&observation?.nextRetryAt&&Date.parse(observation.nextRetryAt)>this.now())throw failure('UNAVAILABLE',{retryAfterMs:Date.parse(observation.nextRetryAt)-this.now()});
  let slot=this.slots.get(identity);
  if(slot?.client?.isExpired?.()){await this.disconnect(binding);slot=null;}
  if(slot)return bounded(()=>slot.promise,definition.policy.requestTimeoutMs,signal);
  const adapter=this.adapters[definition.authentication.adapter];
  if(!adapter?.connect)throw failure('CAPABILITY_MISMATCH');
  slot={controller:new AbortController(),client:null,catalog:null,active:0,retired:false};this.slots.set(identity,slot);
  slot.promise=bounded(async abortSignal=>{
   const client=await adapter.connect(structuredClone(definition),{signal:abortSignal});
   if(abortSignal.aborted||this.closed){await client?.close?.();throw failure('CONNECTION_CLOSED');}
   slot.client=client;
   try{this.definition(binding);}catch(error){await client.close?.();throw error;}
   if(!client?.listTools||!client?.callTool||!client?.close)throw failure('CAPABILITY_MISMATCH');
   const tools=await client.listTools({signal:abortSignal});
   if(!Array.isArray(tools)||tools.length>512||Buffer.byteLength(JSON.stringify(tools))>2000000||tools.some(t=>typeof t?.name!=='string'||!t.name||!t.inputSchema)||new Set(tools.map(t=>t.name)).size!==tools.length)throw failure('CAPABILITY_MISMATCH');
   this.definition(binding);slot.catalog=new Map(tools.map(tool=>[tool.name,structuredClone(tool)]));
   const prior=this.observations.get(identity);
   this.observe(binding,{transport:'connected',state:prior?.requiredAction?prior.state:'connected',authentication:'unverified',access:'unverified',nextRetryAt:null});
   return slot;
  },definition.policy.requestTimeoutMs,slot.controller.signal).catch(async error=>{
   if(this.slots.get(identity)===slot)this.slots.delete(identity);
   slot.controller.abort();try{await slot.client?.close?.();}catch{}
   const safe=classified(error);this.failed(binding,safe);safe.observed=true;throw safe;
  });
  return bounded(()=>slot.promise,definition.policy.requestTimeoutMs,signal);
 }
 async using(slot,work){
  slot.active++;
  try{return await work();}finally{slot.active--;if(slot.retired&&slot.active===0)await this.closeSlot(slot);}
 }
 async closeSlot(slot){
  if(slot.closing)return slot.closing;
  this.retired.delete(slot);slot.controller.abort(failure('CONNECTION_CLOSED'));
  slot.closing=Promise.resolve().then(()=>slot.client?.close?.()).catch(()=>{});return slot.closing;
 }
 async disconnect(binding){
  const identity=key(binding),slot=this.slots.get(identity);if(!slot)return;
  this.slots.delete(identity);slot.retired=true;this.retired.add(slot);
  if(slot.active===0)await this.closeSlot(slot);
 }
 async ensureReady(binding,{repair=false,signal}={}){
  const definition=this.definition(binding),current=this.status(binding),identity=key(binding);
  if(!repair&&current.state==='ready'&&!current.stale)return current;
  if(this.checks.has(identity))return bounded(()=>this.checks.get(identity).promise,definition.policy.requestTimeoutMs*2,signal);
  const controller=new AbortController();
  const checking=(async()=>{
   try{
    const slot=await this.connection(binding,{repair,signal:controller.signal});
    if(!slot.client.verify)throw failure('CAPABILITY_MISMATCH');
    const evidence=await this.using(slot,()=>bounded(s=>slot.client.verify({probes:structuredClone(definition.probes),signal:s}),definition.policy.requestTimeoutMs,controller.signal));
    this.definition(binding);
    if(evidence?.principal!==definition.expected.principal||evidence?.tenant!==definition.expected.tenant||evidence?.resource!==definition.expected.resource)throw failure('ACCESS_DENIED');
    if(!Array.isArray(evidence.capabilities)||!definition.capabilities.every(c=>evidence.capabilities.includes(c)))throw failure('CAPABILITY_MISMATCH');
    const at=new Date(this.now()).toISOString();
    this.observe(binding,{state:'ready',transport:'connected',authentication:'verified',access:'verified',checkedAt:at,lastSuccessfulRead:at,
     verified:{principal:evidence.principal,tenant:evidence.tenant,resource:evidence.resource},capabilities:[...definition.capabilities],catalogEvidence:(evidence.catalogEvidence||[]).slice(0,512).map(t=>({name:String(t.name).slice(0,200),readOnlyHint:t.readOnlyHint===true,idempotentHint:t.idempotentHint===true})),failures:0,nextRetryAt:null,requiredAction:null,reason:null});
   }catch(error){if(!error.observed)this.failed(binding,error);}
   return this.status(binding);
  })();
  const entry={promise:checking,controller};this.checks.set(identity,entry);
  checking.finally(()=>{if(this.checks.get(identity)===entry)this.checks.delete(identity);}).catch(()=>{});
  return bounded(()=>checking,definition.policy.requestTimeoutMs*2,signal);
 }
 lease({runId,bindings,authorize,isActive}){
  if(this.closed||typeof runId!=='string'||!runId||typeof authorize!=='function'||typeof isActive!=='function'||!Array.isArray(bindings)||bindings.length>100||new Set(bindings.map(b=>b.name)).size!==bindings.length)throw failure('PERMISSION_DENIED');
  const captured=structuredClone(bindings);for(const binding of captured)this.definition(binding);
  const leaseId=randomUUID(),controller=new AbortController();
  const assertActive=()=>{if(controller.signal.aborted||!isActive()||!this.leases.has(leaseId))throw failure('CONNECTION_CLOSED');};
  const select=name=>{assertActive();const binding=captured.find(b=>b.name===name);if(!binding)throw failure('PERMISSION_DENIED');this.definition(binding);return binding;};
  const api={
   catalog:async name=>{const binding=select(name),slot=await this.connection(binding,{signal:controller.signal});assertActive();return [...slot.catalog.values()].map(tool=>structuredClone(tool));},
   status:name=>this.status(select(name)),
   call:async(name,toolName,args,{signal}={})=>{
    const binding=select(name),definition=this.definition(binding),combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
    if(Buffer.byteLength(JSON.stringify(args??{}))>1000000)throw failure('INVALID_RESULT');
    let slot=await this.connection(binding,{signal:combined}),tool=slot.catalog.get(toolName);
    if(!tool)throw failure('CAPABILITY_MISMATCH');
    const allowed=await authorize({runId,connection:structuredClone(binding),tool:structuredClone(tool),arguments:structuredClone(args??{}),readOnly:readOnly(tool)});
    assertActive();this.definition(binding);if(allowed!==true)throw failure('PERMISSION_DENIED');
    const originalCatalog=revision(tool);
    for(let attempt=0;;attempt++){
     try{
      const result=await this.using(slot,()=>bounded(s=>slot.client.callTool(toolName,args??{},{signal:s,runId}),definition.policy.requestTimeoutMs,combined));
      assertActive();this.definition(binding);
      if(!result||typeof result!=='object'||!Array.isArray(result.content))throw failure('INVALID_RESULT');
      return result;
     }catch(error){
      assertActive();
      // An uncertain mutation, unannotated operation or canceled request never replays.
      const retry=attempt<definition.policy.maxReadRetries&&readOnly(tool)&&tool.annotations.idempotentHint===true&&!combined.aborted&&['SESSION_EXPIRED','AUTH_EXPIRED'].includes(error?.code);
      if(!retry){this.failed(binding,error);throw classified(error);}
      await this.disconnect(binding);slot=await this.connection(binding,{signal:combined,repair:true});
      tool=slot.catalog.get(toolName);if(!tool||revision(tool)!==originalCatalog)throw failure('CAPABILITY_MISMATCH');
      this.definition(binding);assertActive();
      if(await authorize({runId,connection:structuredClone(binding),tool:structuredClone(tool),arguments:structuredClone(args??{}),readOnly:true})!==true)throw failure('PERMISSION_DENIED');
      assertActive();
     }
    }
   },
   close:()=>{controller.abort(failure('CONNECTION_CLOSED'));this.leases.delete(leaseId);}
  };
  this.leases.set(leaseId,{runId,bindings:captured,close:api.close});return api;
 }
 async close(){
  this.closed=true;for(const check of this.checks.values())check.controller.abort(failure('CONNECTION_CLOSED'));for(const lease of this.leases.values())lease.close();
  const slots=new Set([...this.slots.values(),...this.retired]);this.slots.clear();
  for(const slot of slots)await this.closeSlot(slot);
 }
}
