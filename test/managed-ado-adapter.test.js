import test from 'node:test';
import assert from 'node:assert/strict';
import {managedAdoAdapter,adoServerProfile,boundedAdoArguments} from '../src/services/integrations/managed-ado-adapter.js';
import {adoIdentityProfile} from '../src/services/integrations/managed-ado-identity.js';
import {adoRequestTarget} from '../src/services/integrations/managed-ado-network-guard.js';
const guid=n=>String(n).repeat(8)+'-'+String(n).repeat(4)+'-4'+String(n).repeat(3)+'-8'+String(n).repeat(3)+'-'+String(n).repeat(12);
const definition=()=>({ownerId:'fixture',authentication:{adapter:adoIdentityProfile.adapter,clientId:guid(1),credentialOwnerId:'fixture',credentialRef:'fixture'},transport:adoServerProfile,expected:{tenant:guid(2),principal:guid(3),organizationId:guid(4),resource:'https://dev.azure.com/fixture',audience:adoIdentityProfile.audience,scopes:[adoIdentityProfile.scope]},policy:{requestTimeoutMs:10000}});
test('actual pinned ADO server initializes envvar mode and reports its own bounded annotated catalog without authentication or data calls',async t=>{
 let clock=0;const identity={use:(_definition,consume)=>consume('synthetic-not-a-real-token',3600000),invalidate:()=>{}};
 const adapter=managedAdoAdapter({identity,now:()=>clock,verify:()=>assert.fail('No business probes in catalog qualification')});const client=await adapter.connect(definition(),{signal:AbortSignal.timeout(15000)});t.after(()=>client.close());
 const tools=await client.listTools({signal:AbortSignal.timeout(10000)});assert.ok(tools.length>10);for(const name of ['core_list_projects','core_list_project_teams','wit_work_item','search_workitem']){const tool=tools.find(t=>t.name===name);assert.ok(tool,name);assert.equal(tool.annotations.readOnlyHint,true);assert.equal(tool.annotations.idempotentHint,true);assert.ok(tool.inputSchema.properties);}
 assert.equal(tools.find(t=>t.name==='wit_work_item_write').annotations.readOnlyHint,false);clock=3600000;assert.equal(client.isExpired(),true);await assert.rejects(client.callTool('wit_work_item',{action:'get',id:1}),{code:'AUTH_EXPIRED'});
});
test('credential-bearing network destinations remain inside the selected organization and known HTTPS services',()=>{
 for(const host of ['dev.azure.com','vssps.dev.azure.com','almsearch.dev.azure.com'])assert.equal(adoRequestTarget('https://'+host+'/fixture/_apis/example?api-version=7.2','fixture').hostname,host);
 for(const url of ['http://dev.azure.com/fixture/_apis','https://dev.azure.com/other/_apis','https://evil.test/fixture','https://dev.azure.com.evil.test/fixture','https://u:p@dev.azure.com/fixture','https://dev.azure.com/fixture/../other','https://dev.azure.com:444/fixture','https://dev.azure.com/%66ixture'])assert.throws(()=>adoRequestTarget(url,'fixture'),{code:'CONFIGURATION_MISMATCH'});
});
test('upstream validation receives only bounded argument trees, including recursive and large collection inputs',()=>{
 assert.doesNotThrow(()=>boundedAdoArguments({action:'get',id:1}));for(const value of [Array(1001).fill(1),'x'.repeat(64001),Array.from({length:30}).reduce(a=>({nested:a}),{})])assert.throws(()=>boundedAdoArguments(value),{code:'CAPABILITY_MISMATCH'});
});
