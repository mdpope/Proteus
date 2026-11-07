// Exercise the real app-server tool catalog against an entirely synthetic MCP.
// No model turn, provider account, credentials or business source data is used.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {CodexRPC,codexExecutable} from '../src/providers/codex.js';import {codexMcpReadOnly} from '../src/providers/codex-mcp-policy.js';
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-mcp-ro-'))),nativeHome=path.join(root,'native'),file=path.join(root,'fixture.cjs');fs.mkdirSync(nativeHome);
fs.writeFileSync(file,`const rl=require('readline').createInterface({input:process.stdin});rl.on('line',line=>{const m=JSON.parse(line);if(m.id===undefined)return;let result={};if(m.method==='initialize')result={protocolVersion:m.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'synthetic-readonly',version:'1'}};if(m.method==='tools/list')result={tools:[{name:'lookup',description:'Synthetic read',inputSchema:{type:'object',properties:{}},annotations:{readOnlyHint:true,destructiveHint:false}},{name:'modify',description:'Synthetic write',inputSchema:{type:'object',properties:{}},annotations:{readOnlyHint:false}}]};if(m.method==='resources/list')result={resources:[]};if(m.method==='resources/templates/list')result={resourceTemplates:[]};process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result})+'\\n');});`);
const client=new CodexRPC({command:codexExecutable({}),cwd:root,env:{...process.env,CODEX_HOME:nativeHome}});
try{
 await client.request('initialize',{clientInfo:{name:'proteus-readonly-probe',version:'1'},capabilities:{experimentalApi:true}});
 const thread=await client.request('thread/start',{cwd:root,approvalPolicy:'on-request',approvalsReviewer:'user',sandbox:'read-only',config:{project_doc_max_bytes:0,mcp_servers:{synthetic:{enabled:true,command:process.execPath,args:[file]}},apps:{_default:{enabled:false}}}});
 assert.equal(await codexMcpReadOnly(client,thread.thread.id,'synthetic','lookup'),true);
 assert.equal(await codexMcpReadOnly(client,thread.thread.id,'synthetic','modify'),false);
 assert.equal(await codexMcpReadOnly(client,thread.thread.id,'synthetic','missing'),false);
 console.log(JSON.stringify({passed:true,nativeCatalog:true,annotatedRead:true,writeDenied:true,unknownDenied:true,modelTurnStarted:false}));
}finally{await client.close();fs.rmSync(root,{recursive:true,force:true});}
