import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {ManagedConnections} from '../src/services/integrations/managed-connections.js';
import {managedMcpBridge} from '../src/services/integrations/managed-mcp-bridge.js';
const binding={connectionId:'one',configurationRevision:'one',name:'example',workspaceId:'workspace',ownerId:'owner'};
test('real native MCP client uses the owner catalog and per-run policy without upstream credentials',async t=>{
 let calls=0,authorizations=[];
 const manager=new ManagedConnections({registry:{resolve:()=>({name:'example',authentication:{adapter:'test'},policy:{requestTimeoutMs:3000,healthIntervalMs:900000,maxReadRetries:1}})},adapters:{test:{connect:async()=>({
  listTools:async()=>[{name:'read',description:'Synthetic read',inputSchema:{type:'object'},annotations:{readOnlyHint:true,idempotentHint:true}},{name:'write',inputSchema:{type:'object'}}],
  callTool:async name=>{calls++;return {content:[{type:'text',text:'Owner executed '+name}]};},close:async()=>{}
 })}}});
 t.after(()=>manager.close());
 const bridge=await managedMcpBridge(manager,{runId:'run',bindings:[binding],isActive:()=>true,authorize:async request=>{authorizations.push(request);return request.readOnly;}});
 t.after(()=>bridge.close());
 const config=bridge.servers.example;
 assert.ok(!JSON.stringify(config).includes('refreshToken'));
 const client=new Client({name:'synthetic-native-client',version:'1'},{capabilities:{}});
 const transport=new StdioClientTransport({...config,stderr:'pipe'});transport.stderr?.on('data',()=>{});
 t.after(()=>client.close());await client.connect(transport);
 const catalog=await client.listTools();assert.equal(catalog.tools[0].annotations.readOnlyHint,true);
 assert.equal((await client.callTool({name:'read',arguments:{}})).content[0].text,'Owner executed read');
 await assert.rejects(client.callTool({name:'write',arguments:{}}));assert.equal(calls,1);
 assert.deepEqual(authorizations.map(a=>[a.runId,a.tool.name,a.readOnly]),[['run','read',true],['run','write',false]]);
 const url=config.env.PROTEUS_MANAGED_MCP_ENDPOINT;
 assert.equal((await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,403);
 assert.equal((await fetch(url,{method:'POST',headers:{authorization:config.env.PROTEUS_MANAGED_MCP_CAPABILITY,origin:'https://untrusted.test','content-type':'application/json'},body:'{}'})).status,403);
 await bridge.close();await assert.rejects(client.listTools());
});
