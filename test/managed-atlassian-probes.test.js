import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifyAtlassianDefinition,verifyAtlassian} from '../src/services/integrations/managed-atlassian-probes.js';
import {atlassianOAuthProfile as p} from '../src/services/integrations/managed-atlassian-oauth.js';
const definition=()=>({authentication:{adapter:p.adapter},transport:{type:'http',endpoint:p.endpoint},expected:{principal:'fixture-person',tenant:'fixture-site',resource:'https://fixture.atlassian.net',audience:p.endpoint},capabilities:['jira.issue.read','jira.issue.search'],probes:[{id:'jira-issue',capability:'jira.issue.read',parameters:{issueIdOrKey:'FIXTURE-1'}},{id:'jira-search',capability:'jira.issue.search',parameters:{issueIdOrKey:'FIXTURE-1'}}]});
const tool=(name,properties={},required=[])=>({name,inputSchema:{type:'object',properties,required,additionalProperties:false}});
function fixture(){
 const calls=[],tools=[tool('atlassianUserInfo'),tool('getAccessibleAtlassianResources'),tool('getJiraIssue',{cloudId:{type:'string'},issueIdOrKey:{type:'string'}},['cloudId','issueIdOrKey']),tool('searchJiraIssuesUsingJql',{cloudId:{type:'string'},jql:{type:'string'},fields:{type:'array',items:{type:'string'}},maxResults:{type:'integer',maximum:1}},['cloudId','jql'])];
 const results={atlassianUserInfo:{account_id:'fixture-person',email:'irrelevant-label@example.invalid'},getAccessibleAtlassianResources:[{id:'fixture-site',url:'https://fixture.atlassian.net'}],getJiraIssue:{id:'10001',key:'FIXTURE-1'},searchJiraIssuesUsingJql:{issues:[]}};
 const args={listTools:async()=>tools,call:async(name,input)=>{calls.push({name,input});return {content:[{type:'text',text:JSON.stringify(results[name])}]};}};
 return {args,calls,tools,results};
}
test('actual identity/site and distinct Jira probes establish separate capabilities without invented annotations',async()=>{
 const f=fixture(),evidence=await verifyAtlassian(definition(),f.args);
 assert.deepEqual(evidence.capabilities,['jira.issue.read','jira.issue.search']);assert.equal(f.calls.length,4);
 assert.deepEqual(f.calls.find(c=>c.name==='searchJiraIssuesUsingJql').input,{cloudId:'fixture-site',jql:'key = "FIXTURE-1"',fields:['summary'],maxResults:1});
 assert.ok(evidence.catalogEvidence.every(t=>t.readOnlyHint===false&&t.idempotentHint===false));
 assert.ok(!JSON.stringify(evidence).includes('irrelevant-label'));
});
test('a scoped empty search proves search access but never supplies separate issue-read evidence',async()=>{
 const f=fixture(),d=definition();d.capabilities=['jira.issue.search'];d.probes=d.probes.filter(p=>p.id==='jira-search');
 const evidence=await verifyAtlassian(d,f.args);assert.deepEqual(evidence.capabilities,['jira.issue.search']);assert.equal(f.calls.some(c=>c.name==='getJiraIssue'),false);
 d.capabilities.push('jira.issue.read');assert.throws(()=>qualifyAtlassianDefinition(d),{code:'CAPABILITY_MISMATCH'});
});
test('wrong account, site or changed authoritative tool schema fails before unrelated evidence reads',async()=>{
 const wrong=fixture();wrong.results.atlassianUserInfo.account_id='other';await assert.rejects(verifyAtlassian(definition(),wrong.args),{code:'ACCESS_DENIED'});assert.equal(wrong.calls.length,1);
 const site=fixture();site.results.getAccessibleAtlassianResources[0].id='other';await assert.rejects(verifyAtlassian(definition(),site.args),{code:'ACCESS_DENIED'});assert.equal(site.calls.length,2);
 const schema=fixture();schema.tools.find(t=>t.name==='getJiraIssue').inputSchema.required.push('newRequiredField');await assert.rejects(verifyAtlassian(definition(),schema.args),{code:'CAPABILITY_MISMATCH'});assert.equal(schema.calls.some(c=>c.name==='getJiraIssue'),false);
 const destructive=fixture();destructive.tools[0].annotations={destructiveHint:true};await assert.rejects(verifyAtlassian(definition(),destructive.args),{code:'CAPABILITY_MISMATCH'});assert.equal(destructive.calls.length,0);
});
test('identity-only renewal verification does not ingest issue data or claim Jira readiness',async()=>{
 const f=fixture(),evidence=await verifyAtlassian(definition(),{...f.args,identityOnly:true});assert.equal(f.calls.length,2);assert.deepEqual(evidence.capabilities,[]);
});
test('health probes cannot inject arbitrary JQL or mutate an unrelated endpoint',()=>{
 for(const changed of [{...definition(),transport:{type:'http',endpoint:'https://mcp.atlassian.com/v1/mcp'}},{...definition(),probes:[{id:'jira-search',capability:'jira.issue.search',parameters:{issueIdOrKey:'FIXTURE-1 OR project=OTHER'}}]}])assert.throws(()=>qualifyAtlassianDefinition(changed),{code:'CONFIGURATION_MISMATCH'});
});

test('discovery accepts declared draft-07 input schemas from MCP tools and still rejects missing required arguments',async()=>{
 const {discoverAtlassian}=await import('../src/services/integrations/managed-atlassian-probes.js');
 const tools=['atlassianUserInfo','getAccessibleAtlassianResources'].map(name=>({name,inputSchema:{$schema:'http://json-schema.org/draft-07/schema#',type:'object',properties:{},additionalProperties:false}}));
 const call=async name=>({content:[{type:'text',text:JSON.stringify(name==='atlassianUserInfo'?{account_id:'fixture',name:'Fixture'}:[{id:'site',name:'Site',url:'https://fixture.atlassian.net',scopes:['read:jira-work']}])}]});
 assert.equal((await discoverAtlassian({listTools:async()=>tools,call})).account.id,'fixture');
 tools[0].inputSchema.required=['unexpected'];await assert.rejects(discoverAtlassian({listTools:async()=>tools,call}),e=>e.code==='CAPABILITY_MISMATCH'&&e.detail==='INPUT_ARGUMENTS_REJECTED');
});
