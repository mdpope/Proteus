import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';
import {InferenceJobs} from './inference-jobs.js';

export const localModelProviders=['llama-cpp','mtplx'];
const sourceKey=(hostId,providerId)=>hostId+':'+providerId;
const modelId=(hostId,providerId,id)=>'shared-'+createHash('sha256').update(JSON.stringify([hostId,providerId,id])).digest('hex').slice(0,40);
export class SharedInference {
 constructor(service){
  this.service=service;this.file=path.join(service.home,'shared-inference.json');this.routes=new Map();this.consumers=new Map();this.closed=false;
  this.value=readJSON(this.file,{schemaVersion:1,revision:randomUUID(),sharing:{},imports:[]});
  if(this.value.schemaVersion!==1||typeof this.value.revision!=='string'||!this.value.sharing||!Array.isArray(this.value.imports)||this.value.imports.length>64)throw Error('Inspect shared model settings; the original record was preserved.');
  for(const [id,value]of Object.entries(this.value.sharing))if(!localModelProviders.includes(id)||typeof value.enabled!=='boolean'||!Array.isArray(value.deviceIds)||value.deviceIds.some(id=>typeof id!=='string'))throw Error('Invalid shared model grant.');
  for(const row of this.value.imports)if(!/^[a-f0-9-]{36}$/i.test(row.hostId||'')||!localModelProviders.includes(row.providerId)||typeof row.enabled!=='boolean')throw Error('Invalid shared model import.');
  this.jobs=new InferenceJobs({file:path.join(service.home,'inference-receipts.json'),authorize:(deviceId,providerId)=>this.authorize(deviceId,providerId),adapter:id=>this.adapter(id)});
 }
 devices(){return (this.service.remote?.config.devices||[]).map(d=>({id:d.id,name:d.name}));}
 adapter(id){
  if(!localModelProviders.includes(id))throw Error('Only this computer\'s llama.cpp and MTPLX backends can be shared.');
  const provider=this.service.engine.providers[id],adapter=provider?.metadata||provider;
  if(!adapter||typeof adapter.request!=='function'||typeof adapter.models!=='function')throw Error('That local model backend is unavailable on this computer.');
  const url=new URL(adapter.endpoint);if(!['http:','https:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Use a loopback backend before sharing; remote providers cannot be re-exported.');return adapter;
 }
 authorize(deviceId,providerId){
  if(this.closed||!this.devices().some(d=>d.id===deviceId))throw Error('This paired device no longer has model access.');
  const grant=this.value.sharing[providerId];if(!grant?.enabled||!grant.deviceIds.includes(deviceId))throw Error('Model sharing is not enabled for this device and provider.');this.adapter(providerId);
 }
 info(){return {revision:this.value.revision,providers:localModelProviders.filter(id=>this.service.engine.providers[id]).map(id=>({id,label:id==='mtplx'?'MTPLX':'llama.cpp',...this.value.sharing[id],enabled:this.value.sharing[id]?.enabled===true,deviceIds:this.value.sharing[id]?.deviceIds||[]})),devices:this.devices(),imports:this.value.imports.map(row=>({...row,hostLabel:this.service.peers?.list().find(p=>p.hostId===row.hostId)?.label||'Paired computer'})),outgoingAllowed:this.service.computerAccess?.get().outgoingAllowed!==false};}
 async configure(args){
  if(args.expectedRevision!==this.value.revision)throw Error('Shared model settings changed. Refresh before saving.');let next=structuredClone(this.value);
  if(args.action==='share'){
   this.adapter(args.providerId);if(typeof args.enabled!=='boolean'||!Array.isArray(args.deviceIds)||args.deviceIds.length>20||args.deviceIds.some(id=>!this.devices().some(d=>d.id===id)))throw Error('Choose existing paired devices.');
   next.sharing[args.providerId]={...next.sharing[args.providerId],enabled:args.enabled,deviceIds:[...new Set(args.deviceIds)]};
  }else if(args.action==='import'){
   this.service.computerAccess?.assertOutgoing();if(typeof args.enabled!=='boolean'||!localModelProviders.includes(args.providerId)||!this.service.peers?.list().some(p=>p.hostId===args.hostId))throw Error('Choose a paired computer and local model provider.');
   const prior=next.imports.find(row=>sourceKey(row.hostId,row.providerId)===sourceKey(args.hostId,args.providerId));next.imports=next.imports.filter(row=>sourceKey(row.hostId,row.providerId)!==sourceKey(args.hostId,args.providerId));if(args.enabled)next.imports.push({...prior,hostId:args.hostId,providerId:args.providerId,enabled:true});if(next.imports.length>64)throw Error('Too many imported providers.');
  }else throw Error('Unknown shared model setting.');
  next.revision=randomUUID();atomicJSON(this.file,next);fs.chmodSync(this.file,0o600);this.value=next;this.routes.clear();
  if(args.action==='import'){const key=sourceKey(args.hostId,args.providerId);for(const controller of this.consumers.get(key)||[])controller.abort(Error('Shared provider selection changed.'));}
  for(const job of this.jobs.jobs.values())try{this.authorize(job.deviceId,job.providerId);}catch{this.jobs.stop(job,'Model sharing access changed.');}
  this.service.catalogs?.['shared-llm']&&(this.service.catalogs['shared-llm'].lastAttempt=null);this.service.notify?.();return this.info();
 }
 async catalogFor(deviceId){
  const providers=[];
  for(const id of localModelProviders){try{this.authorize(deviceId,id);}catch{continue;}
   try{const models=await this.adapter(id).models();this.authorize(deviceId,id);providers.push({providerId:id,models:models.slice(0,64).map(m=>({id:m.id,name:m.name||m.id,controls:m.controls,supportsVision:false})),available:true});}catch(error){providers.push({providerId:id,models:[],available:false,error:error.message});}
  }return {protocol:1,providers};
 }
 async handle(peer,method,args){
  if(method==='inference.catalog')return this.catalogFor(peer.device.id);
  if(method==='inference.start')return this.jobs.start(peer.device.id,peer.id,args);
  if(method==='inference.poll')return this.jobs.poll(peer.device.id,args);
  if(method==='inference.cancel')return this.jobs.cancel(peer.device.id,args);
  if(method==='inference.trim'){
   this.authorize(peer.device.id,args.providerId);const generation=this.value.revision,adapter=this.adapter(args.providerId),model=(await adapter.models()).find(m=>m.id===args.modelId);
   this.authorize(peer.device.id,args.providerId);if(generation!==this.value.revision)throw Error('Model sharing changed during admission.');
   const window=model?.controls?.contextTiers?.[0]?.totalTokens;if(!window||!Number.isSafeInteger(args.output)||args.output<1||args.output>Math.min(16384,model.controls.maxOutputTokens||16384)||!Array.isArray(args.messages)||!Array.isArray(args.tools)||Buffer.byteLength(JSON.stringify(args))>900000)throw Error('Invalid model admission request.');
   const trimmed=await adapter.trimHistory(args.messages,window,args.output,args.tools,AbortSignal.timeout(20000));this.authorize(peer.device.id,args.providerId);if(generation!==this.value.revision)throw Error('Model sharing changed during admission.');return {dropped:trimmed.dropped};
  }throw Error('Unsupported shared inference command.');
 }
 async request(hostId,method,args,options){
  if(this.closed)throw Error('Shared models are closing.');this.service.computerAccess?.assertOutgoing();const peers=this.service.peers;if(!peers)throw Error('Shared models require a paired desktop connection.');
  await peers.connect(hostId,{automatic:true});return peers.request(hostId,method,args,options);
 }
 async discover(){
  this.service.computerAccess?.assertOutgoing();const peers=this.service.peers?.list()||[],result=[];
  for(let at=0;at<peers.length;at+=4)await Promise.all(peers.slice(at,at+4).map(async peer=>{if(peer.paused)return;try{const value=await this.request(peer.hostId,'inference.catalog',{}, {timeoutMs:20000});for(const provider of value.providers||[])if(localModelProviders.includes(provider.providerId))result.push({hostId:peer.hostId,hostLabel:peer.label,...provider});}catch{result.push({hostId:peer.hostId,hostLabel:peer.label,available:false,error:'Offline, sharing unavailable, or provider sharing is not supported by this version.'});}}));return result;
 }
 async models(){
  this.service.computerAccess?.assertOutgoing();const rows=this.value.imports.filter(row=>row.enabled),result=[],routes=new Map();
  const catalogs=new Map();for(const row of rows){let value=catalogs.get(row.hostId);if(!value){try{value=await this.request(row.hostId,'inference.catalog',{}, {timeoutMs:20000});}catch{value={providers:[]};}catalogs.set(row.hostId,value);}
   const provider=value.providers?.find(p=>p.providerId===row.providerId&&p.available);const hostLabel=this.service.peers?.list().find(p=>p.hostId===row.hostId)?.label||'Paired computer';
   for(const model of provider?.models||[]){if(typeof model.id!=='string'||!model.id||model.id.length>200||!Number.isSafeInteger(model.controls?.contextTiers?.[0]?.totalTokens))continue;
    const id=modelId(row.hostId,row.providerId,model.id),sharedSource={hostId:row.hostId,providerId:row.providerId,modelId:model.id,hostLabel};routes.set(id,sharedSource);result.push({id,name:(model.name||model.id)+' / '+hostLabel,description:'Shared '+row.providerId+' model on '+hostLabel,supportsVision:false,sharedSource,controls:{...structuredClone(model.controls),maxOutputTokens:Math.min(16384,model.controls.maxOutputTokens||16384)}});
   }
  }this.routes=routes;return result;
 }
 route(id){const route=this.routes.get(id);if(!route||!this.value.imports.some(row=>row.enabled&&row.hostId===route.hostId&&row.providerId===route.providerId))throw Error('The selected shared model is unavailable. Refresh models; no fallback was selected.');this.service.computerAccess?.assertOutgoing();return route;}
 watch(route,controller){const key=sourceKey(route.hostId,route.providerId);let set=this.consumers.get(key);if(!set)this.consumers.set(key,set=new Set());set.add(controller);return ()=>{set.delete(controller);if(!set.size)this.consumers.delete(key);};}
 async close(){this.closed=true;for(const set of this.consumers.values())for(const controller of set)controller.abort(Error('Shared inference is closing.'));await this.jobs.close();}
}
