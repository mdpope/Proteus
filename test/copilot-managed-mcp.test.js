import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import {CopilotProvider} from '../src/providers/copilot.js';
test('Copilot attaches the managed bridge and preserves approval for unrelated operations',async()=>{
 let config;const listeners=new Set(),provider=new CopilotProvider();
 const session={sessionId:'synthetic',on:fn=>{listeners.add(fn);return ()=>listeners.delete(fn);},send:async()=>{for(const fn of listeners)fn({id:'done',type:'session.idle',data:{}});},disconnect:async()=>{},abort:async()=>{}};
 provider.connect=async()=>({rpc:{models:{list:async()=>({models:[{id:'fixture',name:'Fixture',capabilities:{}}]})}},createSession:async value=>{config=value;return session;}});
 const run={id:'run',events:[],usage:{inputTokens:0,outputTokens:0},schedule:{model:'fixture',provider:'copilot',workspace:{cwd:os.tmpdir(),additionalDirectories:[]}}};
 const server={type:'stdio',command:process.execPath,args:['synthetic-owner-client'],env:{PROTEUS_MANAGED_MCP_CAPABILITY:'synthetic'}};
 const requests=[];
 const args={run,prompt:'synthetic',signal:new AbortController().signal,emit:()=>{},update:()=>{},ask:async request=>{requests.push(request);return 'decline';},managedMcp:{example:server}};
 await provider.run(args);assert.deepEqual(config.mcpServers.example,server);
 assert.equal((await config.onPermissionRequest({kind:'mcp',serverName:'example',toolName:'write'})).kind,'approve-once');assert.equal(requests.length,0);
 assert.equal((await config.onPermissionRequest({kind:'mcp',serverName:'unrelated',toolName:'read'})).kind,'reject');assert.equal(requests.length,1);
 run.schedule.mcpServers={example:{command:'competing'}};await assert.rejects(provider.run(args),/competing/);
 await provider.close();
});
