import {randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {MtplxProvider} from './mtplx.js';
import {mtplxReasoning} from './mtplx-protocol.js';

// The agent loop executes on the consuming computer. Only model input/output
// crosses the existing encrypted paired connection; no host tools are invoked.
export class SharedLlmProvider extends MtplxProvider {
 constructor({manager}={},services={}){
  let owner;super({endpoint:'http://127.0.0.1/v1',providerId:'shared-llm',label:'Shared models',fetch:(...args)=>owner.fetchModel(...args)},services);owner=this;this.managerFor=manager;this.acceptedMediaTypes=['text/plain'];
 }
 manager(){const value=this.managerFor?.();if(!value)throw Error('Shared models are not initialized.');return value;}
 async models(){const models=await this.manager().models();if(!models.length)throw Error('No enabled shared models are online. Open Providers to add a model from a paired computer.');return models;}
 async status(){try{const models=await this.models();return {provider:'shared-llm',label:'Shared models',available:true,models,sources:this.manager().catalogSources||[],defaultModel:models[0].id,capabilities:{steering:false,tools:true,context:'Chat history, selected sources, tools and approvals stay on this computer; inference runs on the named paired computer over the encrypted relay.'}};}catch(error){return {provider:'shared-llm',label:'Shared models',available:false,models:[],sources:(this.managerFor?.()?.catalogSources||[]).map(source=>({...source,available:false})),error:error.message};}}
 async run(args){const selected=(await this.models()).find(m=>m.id===args.run.schedule.model);if(!selected)throw Error('The selected shared model is unavailable.');const source=selected.sharedSource;this.current=args;try{return await super.run({...args,update:()=>{if(args.run.explicitProviderContext)args.run.explicitProviderContext.sharedSource=source;args.update();}});}finally{this.current=null;}}
 requestHeaders(){return {};}
 predictionOptions(schedule,model){const route=this.manager().route(model.id);return route.providerId==='mtplx'?mtplxReasoning(schedule,model):schedule.reasoningEffort?{reasoning_effort:schedule.reasoningEffort}:{};}
 async trimHistory(messages,window,output,tools,signal){
  signal?.throwIfAborted();const route=this.manager().route(this.current.run.schedule.model);
  const result=await this.manager().request(route.hostId,'inference.trim',{providerId:route.providerId,modelId:route.modelId,messages,tools,output},{timeoutMs:30000});signal?.throwIfAborted();
  if(!Number.isSafeInteger(result.dropped)||result.dropped<0||result.dropped>messages.length-2)throw Error('Invalid shared model context accounting.');
  const retained=result.dropped?[messages[0],...messages.slice(1+result.dropped)]:messages;
  if(retained[1]?.role!=='user'||retained.at(-1)!==messages.at(-1))throw Error('Shared context accounting would discard the latest input.');return {messages:retained,dropped:result.dropped};
 }
 async fetchModel(url,options){
  if(!url.endsWith('/chat/completions'))throw Error('Unsupported shared model endpoint.');
  const manager=this.manager(),body=JSON.parse(options.body),route=manager.route(body.model),id=randomUUID(),cancelController=new AbortController(),signal=AbortSignal.any([options.signal||new AbortController().signal,cancelController.signal]);
  signal?.throwIfAborted();
  const release=manager.watch?.(route,cancelController)||(()=>{});
  // A start is sent once with a durable identity. Timeouts, disconnections and
  // restarts never cause automatic generation or tool-execution replay.
  let stopped=false;const stop=async()=>{if(stopped)return;stopped=true;try{await manager.request(route.hostId,'inference.cancel',{id,providerId:route.providerId},{timeoutMs:8000});}catch{}};
  try{await new Promise((resolve,reject)=>{
   const cancel=()=>{void stop();reject(signal.reason||Error('Shared inference cancelled.'));};signal.addEventListener('abort',cancel,{once:true});
   manager.request(route.hostId,'inference.start',{id,providerId:route.providerId,modelId:route.modelId,body:{...body,model:route.modelId}},{id,timeoutMs:30000}).then(resolve,reject).finally(()=>signal.removeEventListener('abort',cancel));
  });}catch(error){release();void stop();throw error;}
  let cursor=0,queued=false,done=false;
  const stream=new ReadableStream({
   start:controller=>{void (async()=>{
    try{while(true){signal?.throwIfAborted();manager.route(body.model);
     const result=await manager.request(route.hostId,'inference.poll',{id,providerId:route.providerId,cursor},{timeoutMs:15000});signal?.throwIfAborted();
     if(!Number.isSafeInteger(result.cursor)||result.cursor<cursor||!Array.isArray(result.chunks)||result.chunks.length>12)throw Error('Invalid shared inference stream response.');
     if(['failed','cancelled','interrupted'].includes(result.status))throw Error(result.error||'Shared inference stopped. No request was retried.');
     if(result.status==='queued'&&!queued){queued=true;this.current?.emit('system','Waiting for the shared model on '+route.hostLabel+'.');}
     for(const chunk of result.chunks){if(typeof chunk!=='string'||chunk.length>24000)throw Error('Invalid shared stream chunk.');controller.enqueue(new Uint8Array(Buffer.from(chunk,'base64')));}cursor=result.cursor;
     if(result.finished){if(result.status!=='completed')throw Error('Shared inference did not complete.');done=true;controller.close();break;}
     await pause(result.status==='queued'?1000:500,undefined,{signal});
    }}catch(error){try{controller.error(error);}catch{}}finally{release();signal?.removeEventListener('abort',abort);if(!done)await stop();}
   })();},cancel:()=>{cancelController.abort();return stop();}
  });
  const abort=()=>{void stop();};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)void stop();
  return new Response(stream,{headers:{'content-type':'text/event-stream'}});
 }
}
