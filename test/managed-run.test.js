import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {ManagedConnectionRegistry} from '../src/services/integrations/managed-connection-registry.js';
import {ManagedConnections} from '../src/services/integrations/managed-connections.js';
import {prepareManagedRun,mergeManagedServers,validateManagedRequirements} from '../src/services/integrations/managed-run.js';
import {permissionContext} from '../src/services/settings/permissions.js';
import {SessionProvider} from '../src/providers/session-provider.js';
function fixture(t){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'managed-run-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const registry=new ManagedConnectionRegistry(home,{ownerId:'owner'});
 const definition={id:'one',name:'example',label:'Synthetic connection',enabled:true,ownerId:'owner',workspaceIds:['workspace'],transport:{type:'http',endpoint:'https://example.test/mcp'},authentication:{adapter:'fixture',credentialRef:'fixture',credentialOwnerId:'owner'},expected:{principal:'person',tenant:'tenant',resource:'site',audience:'audience',scopes:['read']},capabilities:['issue.read'],probes:[{id:'issue',capability:'issue.read'}],policy:{healthIntervalMs:900000,preflightLeadMs:300000,requestTimeoutMs:1000,maxReadRetries:1}};
 registry.save(definition,{expectedRevision:registry.read().revision});let calls=0,fail=false;
 const manager=new ManagedConnections({registry,adapters:{fixture:{connect:async()=>({listTools:async()=>[{name:'read',inputSchema:{type:'object'},annotations:{readOnlyHint:true}},{name:'write',inputSchema:{type:'object'}}],callTool:async()=>{calls++;return {content:[{type:'text',text:'synthetic'}]};},verify:async()=>{if(fail)throw Error('offline');return {...definition.expected,capabilities:definition.capabilities};},close:async()=>{}})}}});t.after(()=>manager.close());
 const run={id:'run',events:[],schedule:{provider:'codex',workspace:{cwd:home,additionalDirectories:[]},context:{workspaceId:'workspace'},managedConnections:[{name:'example',capabilities:['issue.read'],required:true}]}};
 const controller=new AbortController(),requests=[];
 const args={run,signal:controller.signal,update:()=>{},emit:(_role,text)=>run.events.push(text),ask:async request=>{requests.push(request);return request.details.kind==='mcp-connect'||request.details.readOnly?'approve-auto':'decline';}};
 return {registry,definition,manager,args,run,controller,requests,calls:()=>calls,fail:()=>{fail=true;}};
}
test('session adapter gets the actual owner MCP route and releases it after completion',async t=>{
 const f=fixture(t);let server;
 const provider=new SessionProvider(()=>({supportsManagedConnections:true,run:async args=>{
  server=args.managedMcp.example;assert.equal(args.run.schedule.mcpServers,undefined);
  assert.ok(args.run.schedule.managedConnectionBindings[0].configurationRevision);
  const client=new Client({name:'synthetic-provider',version:'1'},{});
  try{await client.connect(new StdioClientTransport({...server,stderr:'ignore'}));
   assert.equal((await client.callTool({name:'read',arguments:{}})).content[0].text,'synthetic');
   await assert.rejects(client.callTool({name:'write',arguments:{}}));
  }finally{await client.close();}
 },close:async()=>{}}));provider.managedConnections=f.manager;t.after(()=>provider.close());
 await provider.run(f.args);assert.equal(f.calls(),1);assert.equal(f.manager.leases.size,0);
 assert.equal(provider.sessions.size,0);assert.ok(!JSON.stringify(f.run).includes('PROTEUS_MANAGED_MCP_CAPABILITY'));
 await assert.rejects(fetch(server.env.PROTEUS_MANAGED_MCP_ENDPOINT));
 assert.deepEqual(f.requests.map(r=>[r.details.kind,r.details.readOnly]),[['mcp-connect',false],['mcp',true],['mcp',false]]);
});
test('optional unavailable or unconfigured connectors do not block independent work',async t=>{
 const f=fixture(t);f.fail();f.run.schedule.managedConnections[0].required=false;
 f.run.schedule.managedConnections.push({name:'missing',required:false,capabilities:['issue.read']});
 const bridge=await prepareManagedRun(f.manager,f.args);t.after(()=>bridge.close());
 assert.deepEqual(bridge.servers,{});assert.equal(f.run.managedConnectionReadiness.length,2);assert.equal(f.run.events.length,2);
});
test('required configuration, capability or readiness failures stop before provider work',async t=>{
 const f=fixture(t);let ran=false;const provider=new SessionProvider(()=>({supportsManagedConnections:true,run:async()=>{ran=true;},close:async()=>{}}));provider.managedConnections=f.manager;
 f.run.schedule.managedConnections[0].capabilities=['not.present'];await assert.rejects(provider.run(f.args),/capabilities/);
 assert.equal(ran,false);assert.equal(provider.sessions.size,0);assert.equal(provider.locks.size,0);
 f.run.schedule.managedConnections[0].capabilities=['issue.read'];f.fail();await assert.rejects(provider.run(f.args),/not ready/);assert.equal(ran,false);
});
test('binding changes change permission identity only for managed runs and retain preceding pins',async t=>{
 const f=fixture(t),old=permissionContext(f.run.schedule).id;
 const a=await prepareManagedRun(f.manager,f.args);await a.close();const first=permissionContext(f.run.schedule).id;assert.notEqual(first,old);
 f.registry.save({...f.definition,expected:{...f.definition.expected,resource:'different'}},{expectedRevision:f.registry.read().revision});
 f.run.schedule.managedConnections[0].required=false;
 const b=await prepareManagedRun(f.manager,f.args);await b.close();assert.notEqual(permissionContext(f.run.schedule).id,first);assert.equal(f.run.managedConnectionHistory.length,1);
});
test('ambiguous native definitions and malformed portable requirements fail closed',()=>{
 assert.throws(()=>mergeManagedServers({example:{url:'https://unrelated.test'}},{example:{command:'owner'}}),/competing/);
 assert.throws(()=>validateManagedRequirements([{name:'example',required:true,capabilities:[],endpoint:'https://unrelated.test'}]));
 assert.throws(()=>validateManagedRequirements([{name:'example',required:'yes',capabilities:[]}]));
});
