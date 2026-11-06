import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const failure=code=>Object.assign(Error('Managed HTTP connection failed.'),{code});
const classify=error=>{
 if(['SIGN_IN_REQUIRED','ROTATION_UNCERTAIN','RENEWAL_FAILED'].includes(error?.code))return failure('AUTH_REQUIRED');
 if(['CREDENTIAL_STORE_UNAVAILABLE','PROTECTED_STORAGE_UNAVAILABLE'].includes(error?.code))return failure('STORE_LOCKED');
 if(['AUTH_EXPIRED','AUTH_REQUIRED','ACCESS_DENIED','RATE_LIMITED','SESSION_EXPIRED','CAPABILITY_MISMATCH','CONFIGURATION_MISMATCH','STORE_LOCKED','TIMEOUT'].includes(error?.code))return Object.assign(failure(error.code),Number.isFinite(error.retryAfterMs)?{retryAfterMs:Math.max(0,Math.min(3600000,error.retryAfterMs))}:{});
 return failure('UNAVAILABLE');
};
const retryAfter=(value,now)=>{
 if(!value)return 1000;const seconds=Number(value),date=Date.parse(value);
 return Math.max(1000,Math.min(3600000,Number.isFinite(seconds)?seconds*1000:Number.isFinite(date)?date-now:1000));
};
// Vendor qualification and token access are trusted owner adapters. The MCP SDK
// receives a credential-injecting fetch, never an OAuth provider that might
// register, broaden consent or replay a failed mutation on its own.
export function managedHttpAdapter({qualify,withToken,invalidate,verify,fetchFn=fetch,now=()=>Date.now()}){
 return {async connect(definition,{signal}){
  if(!qualify||!withToken||!verify)throw failure('CAPABILITY_MISMATCH');
  await qualify(definition);signal?.throwIfAborted();
  const url=new URL(definition.transport.endpoint);
  if(definition.transport.type!=='http'||url.protocol!=='https:'||url.username||url.password||url.hash||url.search)throw failure('CONFIGURATION_MISMATCH');
  const client=new Client({name:'Proteus managed MCP owner',version:'1.0.0'},{capabilities:{}});
  const controller=new AbortController();
  const guardedFetch=async(input,init={})=>{
   const target=new URL(input instanceof Request?input.url:String(input));
   if(target.href!==url.href||!['GET','POST','DELETE'].includes(init.method||'GET'))throw failure('CONFIGURATION_MISMATCH');
   const combined=AbortSignal.any([controller.signal,...(init.signal?[init.signal]:[])]);
   try{return await withToken(definition,async token=>{
    combined.throwIfAborted();const headers=new Headers(init.headers);headers.set('authorization','Bearer '+token);
    const response=await fetchFn(target,{...init,headers,redirect:'manual',signal:combined});
    if(response.redirected||response.status>=300&&response.status<400){await response.body?.cancel();throw failure('CONFIGURATION_MISMATCH');}
    if(!response.ok&&![202,405].includes(response.status)){
     await response.body?.cancel();
     if(response.status===401){await invalidate?.(definition);throw failure('AUTH_EXPIRED');}
     if(response.status===403)throw failure('ACCESS_DENIED');
     if(response.status===404&&headers.has('mcp-session-id'))throw failure('SESSION_EXPIRED');
     if(response.status===429)throw Object.assign(failure('RATE_LIMITED'),{retryAfterMs:retryAfter(response.headers.get('retry-after'),now())});
     throw failure('UNAVAILABLE');
    }
    if(!response.body)return response;
    // Bound each response before the SDK parses JSON/SSE. Cancel upstream on
    // overflow, downstream cancellation and owner shutdown.
    const reader=response.body.getReader();let bytes=0;
    const body=new ReadableStream({async pull(out){try{
     const result=await reader.read();if(result.done){out.close();return;}
     bytes+=result.value.byteLength;if(bytes>16000000){await reader.cancel();out.error(failure('CAPABILITY_MISMATCH'));return;}
     out.enqueue(result.value);
    }catch{out.error(failure('UNAVAILABLE'));}},cancel:reason=>reader.cancel(reason)});
    return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
   });}catch(error){throw classify(error);}
  };
  const transport=new StreamableHTTPClientTransport(url,{fetch:guardedFetch,reconnectionOptions:{maxRetries:0,initialReconnectionDelay:1000,maxReconnectionDelay:1000,reconnectionDelayGrowFactor:1}});
  const abort=()=>{controller.abort();void client.close().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
  try{await client.connect(transport,{signal,timeout:definition.policy.requestTimeoutMs});signal?.throwIfAborted();}
  catch(error){controller.abort();await client.close().catch(()=>{});throw classify(error);}
  finally{signal?.removeEventListener('abort',abort);}
  const call=async(name,args,{signal}={})=>{
   try{return await client.callTool({name,arguments:args},undefined,{signal,timeout:definition.policy.requestTimeoutMs});}
   catch(error){throw classify(error);}
  };
  const listTools=async({signal}={})=>{
    const tools=[],seen=new Set();let cursor;
    do{
     const result=await client.listTools(cursor?{cursor}:{},{signal,timeout:definition.policy.requestTimeoutMs});tools.push(...result.tools);
     if(tools.length>512||Buffer.byteLength(JSON.stringify(tools))>2000000)throw failure('CAPABILITY_MISMATCH');
     cursor=result.nextCursor;if(cursor&&seen.has(cursor))throw failure('CAPABILITY_MISMATCH');seen.add(cursor);
    }while(cursor);
    return tools;
   };
  return {
   listTools,callTool:call,
   verify:options=>verify(definition,{...options,call,listTools}),
   close:async()=>{controller.abort();await client.close();}
  };
 }};
}
