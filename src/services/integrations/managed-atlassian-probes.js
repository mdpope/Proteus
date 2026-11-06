import Ajv2020 from 'ajv/dist/2020.js';
import {atlassianOAuthProfile} from './managed-atlassian-oauth.js';
const fail=code=>Object.assign(Error('The selected Atlassian identity, site or tool capability is not verified.'),{code});
const issuePattern=/^(?:[A-Z][A-Z0-9_]{0,63}-[1-9][0-9]{0,15}|[1-9][0-9]{0,19})$/;
export const atlassianCapabilities=Object.freeze({
 'atlassian.resources.read':'getAccessibleAtlassianResources',
 'atlassian.identity.read':'atlassianUserInfo',
 'jira.issue.read':'getJiraIssue',
 'jira.issue.search':'searchJiraIssuesUsingJql'
});
const json=result=>{
 if(result?.isError)throw fail('ACCESS_DENIED');
 if(result?.structuredContent!==undefined)return result.structuredContent;
 if(!Array.isArray(result?.content)||result.content.some(c=>c.type!=='text'))throw fail('CAPABILITY_MISMATCH');
 try{return JSON.parse(result.content.map(c=>c.text).join('\n'));}catch{throw fail('CAPABILITY_MISMATCH');}
};
function siteURL(value){try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error();return url.origin;}catch{throw fail('CONFIGURATION_MISMATCH');}}
export function qualifyAtlassianDefinition(definition){
 if(definition.authentication.adapter!==atlassianOAuthProfile.adapter||definition.transport.type!=='http'||definition.transport.endpoint!==atlassianOAuthProfile.endpoint||definition.expected.audience!==atlassianOAuthProfile.endpoint||definition.capabilities.some(c=>!Object.hasOwn(atlassianCapabilities,c)))throw fail('CONFIGURATION_MISMATCH');
 siteURL(definition.expected.resource);
 for(const probe of definition.probes){
  if(!['jira-issue','jira-search'].includes(probe.id)||probe.capability!==(probe.id==='jira-issue'?'jira.issue.read':'jira.issue.search')||!issuePattern.test(probe.parameters?.issueIdOrKey||''))throw fail('CONFIGURATION_MISMATCH');
 }
 for(const [capability,probe]of [['jira.issue.read','jira-issue'],['jira.issue.search','jira-search']])if(definition.capabilities.includes(capability)&&!definition.probes.some(p=>p.id===probe))throw fail('CAPABILITY_MISMATCH');
 return definition;
}
// These exact reads are explicitly approved by the owner definition, independent
// of model auto-approval. Server annotations are reported, never inferred from
// these names. Schema drift fails before sending a probe with guessed arguments.
export async function verifyAtlassian(definition,{call,listTools,signal,identityOnly=false}){
 qualifyAtlassianDefinition(definition);
 const tools=await listTools({signal}),catalog=new Map(tools.map(t=>[t.name,t])),ajv=new Ajv2020({strict:false,validateFormats:false,logger:false});
 const used=new Set();
 const read=async(name,args)=>{
  const tool=catalog.get(name);if(!tool||tool.annotations?.destructiveHint===true)throw fail('CAPABILITY_MISMATCH');
  try{if(!ajv.compile(tool.inputSchema)(args))throw Error();}catch{throw fail('CAPABILITY_MISMATCH');}
  signal?.throwIfAborted();const result=json(await call(name,args,{signal}));used.add(name);return result;
 };
 const identity=await read('atlassianUserInfo',{});
 if(identity?.account_id!==definition.expected.principal)throw fail('ACCESS_DENIED');
 const resources=await read('getAccessibleAtlassianResources',{});
 if(!Array.isArray(resources)||!resources.some(r=>r.id===definition.expected.tenant&&siteURL(r.url)===siteURL(definition.expected.resource)))throw fail('ACCESS_DENIED');
 const verified=new Set(['atlassian.resources.read','atlassian.identity.read']);
 if(!identityOnly)for(const probe of definition.probes){
  const issue=probe.parameters.issueIdOrKey,cloudId=definition.expected.tenant;
  if(probe.id==='jira-issue'){
   const result=await read('getJiraIssue',{cloudId,issueIdOrKey:issue});
   if(result?.key!==issue&&result?.id!==issue)throw fail('ACCESS_DENIED');verified.add('jira.issue.read');
  }else if(probe.id==='jira-search'){
   const result=await read('searchJiraIssuesUsingJql',{cloudId,jql:(/^[0-9]+$/.test(issue)?'id = ':'key = ')+JSON.stringify(issue),fields:['summary'],maxResults:1});
   // An authorized empty query is valid search evidence, never item-read proof.
   if(!Array.isArray(result?.issues)||result.issues.length>1||result.issues.some(row=>row.key!==issue&&row.id!==issue))throw fail('CAPABILITY_MISMATCH');verified.add('jira.issue.search');
  }
 }
 if(!identityOnly&&!definition.capabilities.every(c=>verified.has(c)))throw fail('CAPABILITY_MISMATCH');
 return {principal:identity.account_id,tenant:definition.expected.tenant,resource:definition.expected.resource,
  capabilities:identityOnly?[]:definition.capabilities.filter(c=>verified.has(c)),
  catalogEvidence:[...used].map(name=>({name,readOnlyHint:catalog.get(name).annotations?.readOnlyHint===true,idempotentHint:catalog.get(name).annotations?.idempotentHint===true}))};
}
