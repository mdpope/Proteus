import {adoAgentPoolTools,callAdoAgentPool} from './managed-ado-agent-pools.js';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {qualifyAdoAuthentication,selectedAdoDomains} from './managed-ado-alternative-profile.js';
export const adoServerProfile=Object.freeze({type:'stdio',package:'@azure-devops/mcp',version:'2.11.0',integrity:'sha512-sxc62at/r5ur7rvFDsqNC4IP52EqVelY1c0+7kBp+H+I5rrz4Fd8ovnrbmi+lvKfG3Vv9bqdsLGfo+/EejXf7g=='});
const fail=code=>Object.assign(Error('The managed ADO server could not complete this request.'),{code});
export function qualifyAdoDefinition(definition){qualifyAdoAuthentication(definition);if(Object.keys(adoServerProfile).some(k=>definition.transport?.[k]!==adoServerProfile[k]))throw fail('CONFIGURATION_MISMATCH');return definition;}
export function boundedAdoArguments(value,depth=0){
 if(depth>24)throw fail('CAPABILITY_MISMATCH');
 if(typeof value==='string'&&value.length>64000)throw fail('CAPABILITY_MISMATCH');
 if(value&&typeof value==='object'){const values=Object.values(value);if(values.length>1000)throw fail('CAPABILITY_MISMATCH');for(const v of values)boundedAdoArguments(v,depth+1);}
}
export function managedAdoAdapter({identity,verify,fetchFn=fetch,now=()=>Date.now()}){
 return {async connect(definition,{signal}={}){
  qualifyAdoDefinition(definition);signal?.throwIfAborted();let client,transport,expiresAt,dead=false,health=null,generation=0;
  await identity.use(definition,async(token,expiry)=>{
   signal?.throwIfAborted();expiresAt=expiry;
   transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../../managed-ado-launcher.mjs',import.meta.url))],stderr:'ignore',maxBufferSize:16000000,
    env:{ELECTRON_RUN_AS_NODE:'1',...(definition.authentication.adapter==='ado-pat'?{PERSONAL_ACCESS_TOKEN:token,PROTEUS_ADO_AUTH_MODE:'pat'}:{ADO_MCP_AUTH_TOKEN:token,PROTEUS_ADO_AUTH_MODE:'envvar'}),PROTEUS_ADO_DOMAINS:JSON.stringify(selectedAdoDomains(definition)),PROTEUS_ADO_ORGANIZATION:new URL(definition.expected.resource).pathname.slice(1),PROTEUS_ADO_TENANT:definition.expected.tenant,LOG_LEVEL:'error'}});
   // Intercept only the fixed owner's health notification before the SDK sees it.
   const start=transport.start.bind(transport);transport.start=async()=>{const receive=transport.onmessage;transport.onmessage=message=>{if(message.method==='notifications/proteus/ado-health'){
    const code=message.params?.code;if(['AUTH_EXPIRED','ACCESS_DENIED','RATE_LIMITED'].includes(code)){health=code;generation++;if(code==='AUTH_EXPIRED'){dead=true;identity.invalidate(definition);}}return;
   }receive?.(message);};await start();};
   client=new Client({name:'Proteus managed ADO owner',version:'1.0.0'},{capabilities:{}});
   try{await client.connect(transport,{signal,timeout:definition.policy.requestTimeoutMs});}
   catch{await client.close().catch(()=>{});throw fail(health||'UNAVAILABLE');}
  });
  const isExpired=()=>dead||expiresAt<=now()+90000;
  const listTools=async({signal}={})=>{
   const tools=[],seen=new Set();let cursor;
   do{const result=await client.listTools(cursor?{cursor}:{},{signal,timeout:definition.policy.requestTimeoutMs});tools.push(...result.tools);if(tools.length>512||Buffer.byteLength(JSON.stringify(tools))>2000000)throw fail('CAPABILITY_MISMATCH');cursor=result.nextCursor;if(cursor&&seen.has(cursor))throw fail('CAPABILITY_MISMATCH');seen.add(cursor);}while(cursor);return selectedAdoDomains(definition).includes('pipelines')?[...tools,...adoAgentPoolTools]:tools;
  };
  const call=async(name,args,{signal}={})=>{
   if(isExpired())throw fail('AUTH_EXPIRED');boundedAdoArguments(args);if(Buffer.byteLength(JSON.stringify(args))>1000000)throw fail('CAPABILITY_MISMATCH');
   if(adoAgentPoolTools.some(t=>t.name===name)){if(!selectedAdoDomains(definition).includes('pipelines'))throw fail('CAPABILITY_MISMATCH');return callAdoAgentPool(definition,name,args,{identity,fetchFn,signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(definition.policy.requestTimeoutMs)])});}
   const before=generation;try{
    const result=await client.callTool({name,arguments:args},undefined,{signal,timeout:definition.policy.requestTimeoutMs});
    if(result.isError){if(generation>before)throw fail(health);return {isError:true,content:[{type:'text',text:'The configured ADO server could not complete this operation. Review connection health and the selected resource.'}]};}return result;
   }catch(error){throw fail(generation>before?health:['AUTH_EXPIRED','CAPABILITY_MISMATCH'].includes(error.code)?error.code:'UNAVAILABLE');}
  };
  return {isExpired,listTools,callTool:call,verify:options=>verify(definition,{...options,call,listTools}),close:async()=>{dead=true;await client.close();}};
 }};
}
