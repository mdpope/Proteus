import Ajv2020 from 'ajv/dist/2020.js';
import {qualifyAdoDefinition} from './managed-ado-adapter.js';
const fail=code=>Object.assign(Error('The required ADO resource or capability is not verified.'),{code});
const guid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const adoCapabilities=Object.freeze({'ado.projects.read':'core_list_projects','ado.teams.read':'work','ado.work-items.read':'wit_work_item','ado.work-items.query':'wit_query'});
export function qualifyAdoProbes(definition){
 qualifyAdoDefinition(definition);if(definition.capabilities.some(c=>!Object.hasOwn(adoCapabilities,c)))throw fail('CAPABILITY_MISMATCH');
 for(const probe of definition.probes){
  if(probe.id!==probe.capability||!Object.hasOwn(adoCapabilities,probe.capability))throw fail('CAPABILITY_MISMATCH');
  const parameters=probe.parameters||{};
  if(probe.capability==='ado.projects.read'){if(Object.keys(parameters).length)throw fail('CONFIGURATION_MISMATCH');continue;}
  if(!guid.test(parameters.projectId||''))throw fail('CONFIGURATION_MISMATCH');
  if(probe.capability==='ado.teams.read'&&!guid.test(parameters.teamId||''))throw fail('CONFIGURATION_MISMATCH');
  if(probe.capability.startsWith('ado.work-items.')&&(!Number.isSafeInteger(parameters.workItemId)||parameters.workItemId<1))throw fail('CONFIGURATION_MISMATCH');
 }
 if(!definition.capabilities.every(c=>definition.probes.some(p=>p.capability===c)))throw fail('CAPABILITY_MISMATCH');return definition;
}
// Version 2.11.0 wraps each text block in its own random 128-bit delimiter.
// Parse that exact versioned envelope as data; never execute embedded prose.
function unwrap(text){
 if(typeof text!=='string')throw fail('CAPABILITY_MISMATCH');
 const match=/^<<([a-f0-9]{32})>> \[UNTRUSTED [^\n]+\] <<\1>>\n([\s\S]*)\n<<\/\1>>$/.exec(text);
 return match?match[2]:text;
}
function json(result,{prefix}={}){
 if(result?.isError)throw fail('ACCESS_DENIED');if(result?.structuredContent!==undefined)return result.structuredContent;
 if(!Array.isArray(result?.content)||result.content.some(c=>c.type!=='text'))throw fail('CAPABILITY_MISMATCH');
 const blocks=result.content.map(c=>unwrap(c.text));if(prefix&&blocks.shift()!==prefix)throw fail('CAPABILITY_MISMATCH');if(blocks.length!==1)throw fail('CAPABILITY_MISMATCH');
 try{return JSON.parse(blocks[0]);}catch{throw fail('CAPABILITY_MISMATCH');}
}
export async function verifyAdo(definition,{call,listTools,signal}){
 qualifyAdoProbes(definition);const tools=await listTools({signal}),catalog=new Map(tools.map(t=>[t.name,t])),ajv=new Ajv2020({strict:false,validateFormats:false,logger:false}),used=new Set();
 const read=async(name,args,options)=>{
  const tool=catalog.get(name);if(!tool||tool.annotations?.readOnlyHint!==true||tool.annotations?.idempotentHint!==true||tool.annotations?.destructiveHint===true)throw fail('CAPABILITY_MISMATCH');
  try{if(!ajv.compile(tool.inputSchema)(args))throw Error();}catch{throw fail('CAPABILITY_MISMATCH');}
  signal?.throwIfAborted();const result=json(await call(name,args,{signal}),options);used.add(name);return result;
 };
 for(const probe of definition.probes){
  const p=probe.parameters||{};
  if(probe.capability==='ado.projects.read'){
   const rows=await read('core_list_projects',{stateFilter:'wellFormed',top:1,skip:0});if(!Array.isArray(rows)||rows.length>1||rows.some(r=>!guid.test(r.id||'')))throw fail('CAPABILITY_MISMATCH');
  }else if(probe.capability==='ado.teams.read'){
   const result=await read('work',{action:'get_team_settings',project:p.projectId,team:p.teamId},{prefix:'Project: '+p.projectId+', Team: '+p.teamId});if(!result||!Array.isArray(result.workingDays)||!result.areaPathField)throw fail('CAPABILITY_MISMATCH');
  }else if(probe.capability==='ado.work-items.read'){
   const result=await read('wit_work_item',{action:'get',project:p.projectId,id:p.workItemId,fields:['System.Id']});if(result?.id!==p.workItemId)throw fail('ACCESS_DENIED');
  }else{
   const result=await read('wit_query',{action:'wiql',project:p.projectId,top:1,wiql:'SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.Id] = '+p.workItemId});if(!Array.isArray(result?.workItems)||result.workItems.length>1||result.workItems.some(r=>r.id!==p.workItemId))throw fail('CAPABILITY_MISMATCH');
  }
 }
 return {principal:definition.expected.principal,tenant:definition.expected.tenant,resource:definition.expected.resource,capabilities:[...definition.capabilities],catalogEvidence:[...used].map(name=>({name,readOnlyHint:catalog.get(name).annotations.readOnlyHint===true,idempotentHint:catalog.get(name).annotations.idempotentHint===true}))};
}
