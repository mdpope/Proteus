import {boundedAdoJSON} from './managed-ado-resource-identity.js';
import {adoFailure as fail,qualifyAdoAuthentication} from './managed-ado-alternative-profile.js';
const id={type:'integer',minimum:1},properties={action:{type:'string'},poolId:id,agentId:id,name:{type:'string',minLength:1,maxLength:128},autoProvision:{type:'boolean'},autoUpdate:{type:'boolean'}};
export const adoAgentPoolTools=Object.freeze([
 {name:'ado_agent_pool_read',description:'Read agent pools or agents in the verified Azure DevOps organization. No registration credentials or agent capabilities/environment are returned.',inputSchema:{type:'object',properties:{action:{enum:['list','get','agents']},poolId:id},required:['action'],additionalProperties:false},annotations:{readOnlyHint:true,idempotentHint:true,destructiveHint:false,openWorldHint:true}},
 {name:'ado_agent_pool_write',description:'Create, update or delete an agent pool, or remove an agent, in the verified organization. Requires explicit operation authority. Never automatically retry an uncertain write. Does not create registration tokens.',inputSchema:{type:'object',properties:{...properties,action:{enum:['create','update','delete','remove-agent']}},required:['action'],additionalProperties:false},annotations:{readOnlyHint:false,idempotentHint:false,destructiveHint:true,openWorldHint:true}}
]);
const pool=p=>Object.fromEntries(['id','name','size','isHosted','autoProvision','autoUpdate','poolType'].filter(k=>['string','number','boolean'].includes(typeof p?.[k])).map(k=>[k,p[k]]));
const agent=p=>Object.fromEntries(['id','name','version','osDescription','enabled','status'].filter(k=>['string','number','boolean'].includes(typeof p?.[k])).map(k=>[k,p[k]]));
// The official pinned MCP lacks agent-pool tools. These fixed documented REST
// operations share its exact owner credential/organization binding. No arbitrary
// URL, headers, script, secret response or automatic mutation retry is exposed.
export async function callAdoAgentPool(definition,name,args,{identity,fetchFn=fetch,signal}={}){
 qualifyAdoAuthentication(definition);
 const read=name==='ado_agent_pool_read';if(!adoAgentPoolTools.some(t=>t.name===name)||!args||typeof args!=='object'||Array.isArray(args))throw fail('CONFIGURATION_MISMATCH');
 const allowed=read?['action','poolId']:Object.keys(properties);if(Object.keys(args).some(k=>!allowed.includes(k)))throw fail('CONFIGURATION_MISMATCH');
 const positive=x=>Number.isSafeInteger(x)&&x>0;
 if(args.poolId!==undefined&&!positive(args.poolId)||args.agentId!==undefined&&!positive(args.agentId))throw fail('CONFIGURATION_MISMATCH');
 let method='GET',suffix='',body;
 if(read){if(!['list','get','agents'].includes(args.action)||args.action!=='list'&&!positive(args.poolId)||args.action==='list'&&args.poolId!==undefined)throw fail('CONFIGURATION_MISMATCH');if(args.action!=='list')suffix='/'+args.poolId+(args.action==='agents'?'/agents':'');}
 else{
  if(!['create','update','delete','remove-agent'].includes(args.action)||args.action!=='create'&&!positive(args.poolId)||args.action==='create'&&args.poolId!==undefined)throw fail('CONFIGURATION_MISMATCH');
  if(args.action==='remove-agent'?!positive(args.agentId):args.agentId!==undefined)throw fail('CONFIGURATION_MISMATCH');
  suffix=args.action==='create'?'':'/'+args.poolId+(args.action==='remove-agent'?'/agents/'+args.agentId:'');method=args.action==='create'?'POST':args.action==='update'?'PATCH':'DELETE';
  if(['create','update'].includes(args.action)){
   if(args.action==='create'&&typeof args.name!=='string'||args.name!==undefined&&(typeof args.name!=='string'||!args.name.trim()||args.name.length>128||/[\x00-\x1f\x7f]/.test(args.name)))throw fail('CONFIGURATION_MISMATCH');
   for(const k of ['autoProvision','autoUpdate'])if(args[k]!==undefined&&typeof args[k]!=='boolean')throw fail('CONFIGURATION_MISMATCH');
   body=Object.fromEntries(['name','autoProvision','autoUpdate'].filter(k=>args[k]!==undefined).map(k=>[k,args[k]]));if(!Object.keys(body).length)throw fail('CONFIGURATION_MISMATCH');
  }else if(['name','autoProvision','autoUpdate'].some(k=>args[k]!==undefined))throw fail('CONFIGURATION_MISMATCH');
 }
 return identity.use(definition,async token=>{
  signal?.throwIfAborted();let response;
  try{response=await fetchFn(definition.expected.resource+'/_apis/distributedtask/pools'+suffix+'?api-version=7.1',{method,headers:{authorization:(definition.authentication.adapter==='ado-pat'?'Basic ':'Bearer ')+token,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal});}catch{throw fail('UNAVAILABLE');}
  if(response.redirected||response.status>=300&&response.status<400){await response.body?.cancel();throw fail('CONFIGURATION_MISMATCH');}
  if(!response.ok){await response.body?.cancel();throw fail(response.status===401?'AUTH_REQUIRED':response.status===403?'ACCESS_DENIED':response.status===429?'RATE_LIMITED':'UNAVAILABLE');}
  if(method==='DELETE'){await response.body?.cancel();return {content:[{type:'text',text:JSON.stringify({completed:true})}]};}
  const data=await boundedAdoJSON(response);let result;
  if(read&&args.action!=='get'){if(!Array.isArray(data.value)||data.value.length>10000)throw fail('CAPABILITY_MISMATCH');if(data.value.some(p=>!positive(p?.id)))throw fail('CAPABILITY_MISMATCH');result={items:data.value.map(args.action==='agents'?agent:pool)};}else{if(!positive(data?.id)||args.poolId!==undefined&&data.id!==args.poolId)throw fail('ACCESS_DENIED');result=pool(data);}
  return {content:[{type:'text',text:JSON.stringify(result)}]};
 });
}
