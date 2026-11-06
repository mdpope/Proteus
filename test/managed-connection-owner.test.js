import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {ManagedConnectionOwner} from '../src/services/integrations/managed-connection-owner.js';
import {atlassianOAuthProfile as p} from '../src/services/integrations/managed-atlassian-oauth.js';
import {managedWorkspace} from '../src/services/integrations/managed-requirements.js';
const definition=()=>({id:'connection',name:'fixture-atlassian',label:'Fixture Atlassian',enabled:true,ownerId:'owner',workspaceIds:['workspace'],transport:{type:'http',endpoint:p.endpoint},authentication:{adapter:p.adapter,credentialRef:'opaque',credentialOwnerId:'owner'},expected:{principal:'person',tenant:'site',resource:'https://fixture.atlassian.net',audience:p.endpoint,scopes:[]},capabilities:['atlassian.identity.read'],probes:[],policy:{healthIntervalMs:900000,preflightLeadMs:300000,requestTimeoutMs:1000,maxReadRetries:1}});
function setup(t){
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'managed-owner-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const schedules=[],runs=[],notifications=[];let checks=0,now=Date.now(),allowed=true;
 const service={home,remote:{info:()=>({hostId:'owner'})},notify:()=>{},activity:{log:(...args)=>notifications.push(args)},context:{config:()=>({workspaces:[{id:'workspace',name:'Fixture'},{id:'other',name:'Other'}]})},engine:{schedules:{list:()=>schedules},listRuns:()=>runs,getRun:id=>runs.find(r=>r.id===id),permissions:{decide:()=>({allowed,reason:'fixture'})}}};
 const adapters={[p.adapter]:{connect:async()=>({listTools:async()=>[],callTool:async()=>assert.fail('no model calls'),verify:async()=>{checks++;return {principal:'person',tenant:'site',resource:'https://fixture.atlassian.net',capabilities:['atlassian.identity.read']};},close:async()=>{}})}};
 const owner=new ManagedConnectionOwner(service,{adapters,now:()=>now,storage:{isEncryptionAvailable:()=>true},authFactory:()=>({status:()=>({state:'unchecked'}),close:async()=>{},signIn:()=>assert.fail('maintenance must not sign in')})});t.after(()=>owner.close());
 return {owner,home,schedules,runs,notifications,checks:()=>checks,advance:ms=>{now+=ms;},now:()=>now,deny:()=>{allowed=false;}};
}
async function save(owner,value=definition()){return owner.action({action:'save',definition:value,expectedRevision:owner.registry.read().revision});}
test('owner edits are revision checked, protect active runs and preserve referenced identities',async t=>{
 const f=setup(t),initial=f.owner.registry.read().revision;await save(f.owner);
 assert.deepEqual(f.owner.contract().adapters.map(a=>a.id),['atlassian-oauth-v2','ado-entra-public-client']);assert.equal(f.owner.contract().definitionSchema.properties.authentication.properties.clientId.type,'string');
 await assert.rejects(f.owner.action({action:'save',definition:definition(),expectedRevision:initial}),/changed/);
 const binding=f.owner.binding(definition()),lease=f.owner.manager.lease({runId:'running',bindings:[binding],authorize:async()=>true,isActive:()=>true});
 await assert.rejects(save(f.owner,{...definition(),label:'Changed'}),/captured/);lease.close();
 f.schedules.push({id:'future',managedConnections:[{name:definition().name}]});
 await assert.rejects(f.owner.action({action:'remove',connectionId:'connection',expectedRevision:f.owner.registry.read().revision}),/referenced/);
 await f.owner.action({action:'disable',connectionId:'connection',expectedRevision:f.owner.registry.read().revision});assert.equal(f.owner.snapshot().connections[0].status.state,'disabled');
});
test('model-free preflight coalesces near-term checks, caches fresh evidence and leaves unrelated work untouched',async t=>{
 const f=setup(t);await save(f.owner);await f.owner.tick();assert.equal(f.checks(),0);
 f.schedules.push({id:'future',enabled:true,managedConnectionWorkspaceId:'workspace',workspaceSources:[{workspaceId:'workspace'}],nextRuns:[new Date(f.now()+240000).toISOString()],managedConnections:[{name:definition().name}]});
 await Promise.all([f.owner.tick(),f.owner.tick()]);assert.equal(f.checks(),1);await f.owner.tick();assert.equal(f.checks(),1);
 const health=JSON.parse(fs.readFileSync(path.join(f.home,'managed-mcp-health.json')));assert.equal(health.observations[0][1].state,'ready');
 assert.deepEqual(f.notifications,[]);assert.equal(f.runs.length,0);
});
test('agent discovery is selected-workspace scoped and verify requires the captured revision and own grant',async t=>{
 const f=setup(t);await save(f.owner);f.runs.push({id:'selected',schedule:{context:{workspaceId:'workspace'},managedConnections:[{name:definition().name}]}},{id:'other',schedule:{context:{workspaceId:'other'},managedConnections:[{name:definition().name}]}});
 const selected=await f.owner.agent('selected',{action:'list'}),other=await f.owner.agent('other',{action:'list'});assert.equal(selected.connections[0].connectionId,'connection');assert.equal(other.connections[0].state,'configuration-mismatch');assert.equal(other.connections[0].expected,undefined);
 const expectedRevision=selected.connections[0].configurationRevision;
 await assert.rejects(f.owner.agent('selected',{action:'verify',connectionId:'connection',expectedRevision:'old'}),/captured revision/);
 f.deny();await assert.rejects(f.owner.agent('selected',{action:'verify',connectionId:'connection',expectedRevision}),/not granted/);assert.equal(f.checks(),0);
});
test('standalone schedules explicitly bind a captured source workspace, never a default or folder match',()=>{
 const schedule={context:{workspaceId:null,sourceWorkspaces:[{workspaceId:'source'}]},managedConnectionWorkspaceId:'source'};assert.equal(managedWorkspace(schedule),'source');
 assert.throws(()=>managedWorkspace({...schedule,managedConnectionWorkspaceId:undefined}),/explicit/);
 assert.throws(()=>managedWorkspace({...schedule,managedConnectionWorkspaceId:'foreign'}),/explicit/);
});
