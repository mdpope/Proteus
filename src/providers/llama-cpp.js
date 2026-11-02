import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import {Readable} from 'node:stream';
import {MtplxProvider} from './mtplx.js';

export function llamaEndpoint(value='http://127.0.0.1:8080/v1'){
 const url=new URL(value);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!['/v1','/v1/'].includes(url.pathname)||url.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('llama.cpp requires HTTPS or loopback HTTP ending in /v1, without URL credentials.');
 return url.href.replace(/\/$/,'');
}
export function llamaConfig(file=process.env.PROTEUS_LLAMA_CPP_CONFIG||path.join(os.homedir(),'.config','proteus','llama-cpp.json')){
 if(!fs.existsSync(file))return {};
 const value=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));llamaEndpoint(value.endpoint);
 for(const key of ['apiKeyFile','caFile'])if(value[key])value[key]=path.resolve(path.dirname(file),value[key]);
 return value;
}
// A supplied CA adds trust for this server only; OS/global TLS verification stays enabled.
export function llamaFetch({apiKeyFile,caFile}={},request=globalThis.fetch){
 return async(url,options={})=>{
  const key=apiKeyFile?fs.readFileSync(apiKeyFile,'utf8').trim():'';
  if(apiKeyFile&&(!key||/[\r\n]/.test(key)))throw Error('Invalid llama.cpp API key file.');
  const headers={...options.headers,...(key?{Authorization:'Bearer '+key}:{})};
  if(!caFile||new URL(url).protocol!=='https:')return request(url,{...options,headers});
  return new Promise((resolve,reject)=>{
   const req=https.request(url,{method:options.method||'GET',headers,ca:fs.readFileSync(caFile),signal:options.signal},res=>{
    resolve(new Response(Readable.toWeb(res),{status:res.statusCode,headers:res.headers}));
   });req.on('error',reject);req.end(options.body);
  });
 };
}
export function llamaModel(model,props={}){
 const window=props.default_generation_settings?.n_ctx??model.meta?.n_ctx;
 if(!Number.isSafeInteger(window)||window<1024)throw Error('llama.cpp did not advertise its loaded context size.');
 const caps=props.chat_template_caps||{};
 const efforts=caps.supports_reasoning_effort===true&&Array.isArray(caps.reasoning_effort_levels)?caps.reasoning_effort_levels.filter(v=>typeof v==='string'&&/^[\w.-]{1,80}$/.test(v)):[];
 const reasoning=efforts.length>0;
 return {id:model.id,name:model.id,description:'llama.cpp / '+(model.meta?.ftype||'GGUF'),supportsVision:model.architecture?.input_modalities?.includes('image')===true,
  controls:{reasoningEfforts:efforts,reasoningSupported:reasoning,reasoningModes:[],contextTiers:[{id:'default',promptTokens:null,totalTokens:window}],maxOutputTokens:Math.min(4096,Math.floor(window/4)),serviceTiers:[]}};
}
// Reuse the existing local provider's serial tool/approval loop, cancellation,
// persisted protocol pairs and selected MCP/file boundaries. Only transport differs.
export class LlamaCppProvider extends MtplxProvider {
 constructor(options={},services={}){
  let config,configurationError;try{config=options.config||llamaConfig();llamaEndpoint(config.endpoint);}catch(error){configurationError=error;config={};}
  super({...options,endpoint:config.endpoint||'http://127.0.0.1:8080/v1',fetch:llamaFetch(config,options.fetch),providerId:'llama-cpp',label:'llama.cpp',validateEndpoint:llamaEndpoint},services);
  this.configurationError=configurationError;
 }
 async models(signal){
  if(this.configurationError)throw Error('Inspect llama.cpp connection configuration: '+this.configurationError.message);
  const combined=AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(8000)]);
  const [response,propsResponse]=await Promise.all([this.request(this.endpoint+'/models',{signal:combined,redirect:'error'}),this.request(this.endpoint.replace(/\/v1$/,'')+'/props',{signal:combined,redirect:'error'})]);
  if(!response.ok||!propsResponse.ok)throw Error('llama.cpp discovery failed (HTTP '+response.status+'/'+propsResponse.status+'). Start the server and check its API key.');
  const value=await response.json(),props=await propsResponse.json();
  const models=(value.data||[]).filter(m=>m.owned_by==='llamacpp'&&typeof m.id==='string'&&m.id.length<=200).map(m=>llamaModel(m,props));
  if(!models.length)throw Error('llama.cpp did not advertise a loaded model.');return models;
 }
 async trimHistory(messages,window,output,tools,signal){
  const result=[...messages],root=this.endpoint.replace(/\/v1$/,'');let dropped=0;
  // Use this server's actual chat template and tokenizer, including tool schemas.
  // Evict complete older turns only; current sources and the latest input survive.
  while(true){
   const apply=await this.request(root+'/apply-template',{method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:result,tools,add_generation_prompt:true})});
   if(!apply.ok)throw Error('llama.cpp template accounting failed (HTTP '+apply.status+').');
   const {prompt}=await apply.json();if(typeof prompt!=='string')throw Error('llama.cpp did not return a rendered chat template.');
   const tokenized=await this.request(root+'/tokenize',{method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({content:prompt,add_special:true})});
   if(!tokenized.ok)throw Error('llama.cpp token accounting failed (HTTP '+tokenized.status+').');
   const {tokens}=await tokenized.json();if(!Array.isArray(tokens))throw Error('llama.cpp did not return token accounting.');
   if(tokens.length+output+256<=window)return {messages:result,dropped};
   let next=-1;for(let i=2;i<result.length;i++)if(result[i].role==='user'){next=i;break;}
   if(next<0)throw Error('Current sources, tools and message exceed the loaded llama.cpp context. Increase server context or select fewer sources.');dropped+=next-1;result.splice(1,next-1);
  }
 }
 async status(){try{const models=await this.models();return {provider:this.providerId,label:this.label,available:true,models,defaultModel:models[0].id,capabilities:{steering:false,tools:true,context:'Selected sources, approved tools/MCPs and persisted local conversation history.'}};}catch(error){return {provider:this.providerId,label:this.label,available:false,models:[],error:error.message};}}
 requestHeaders(){return {};}
 predictionOptions(schedule){return schedule.reasoningEffort?{reasoning_effort:schedule.reasoningEffort}:{};}
}
