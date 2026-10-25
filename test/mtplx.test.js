import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MtplxProvider,mtplxEndpoint,mtplxEvents} from '../src/providers/mtplx.js';
import {mtplxModel,mtplxReasoning,mtplxInput,mtplxMessages,trimMtplxHistory} from '../src/providers/mtplx-protocol.js';
import {MtplxMcp} from '../src/providers/mtplx-mcp.js';
import {mtplxFileTools} from '../src/providers/mtplx-files.js';
import {validateToolArguments,mtplxResult} from '../src/providers/mtplx-tools.js';
import {validateModelOptions,chatModelOptions} from '../src/models/model-catalog.js';
const model={id:'local-model',owned_by:'mtplx',context_length:262144,capability:'chat',supports_vision:true,modalities:{input:['text','image']}};
const settings={model:model.id,reasoning:'auto',reasoning_effort:'medium',reasoning_policy:{supported:true,modes:['auto','on','off'],default_mode:'auto',effort_levels:['xhigh','medium','low'],default_effort:'medium'}};
const frame=value=>'data: '+(typeof value==='string'?value:JSON.stringify(value))+'\r\n\r\n';
const answer=(text='Hello 🐱')=>frame({choices:[{delta:{content:text}}]})+frame({choices:[{delta:{},finish_reason:'stop'}]})+frame({choices:[],usage:{prompt_tokens:52,completion_tokens:9,total_tokens:61}})+frame('[DONE]');
const tool=(name,args,id='tool-1')=>frame({choices:[{delta:{tool_calls:[{index:0,id,type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]})+frame({choices:[{delta:{},finish_reason:'tool_calls'}]})+frame('[DONE]');
function fixture({replies=[answer()],context,mcpConnect}={}){
  const calls=[],events=[],streamed=[],permissions=[];let next=0;
  const provider=new MtplxProvider({mcpConnect,fetch:async(url,options)=>{calls.push({url,options});if(url.endsWith('/models'))return Response.json({data:[model]});if(url.endsWith('/settings'))return Response.json(settings);return new Response(replies[next++]||answer(),{headers:{'content-type':'text/event-stream'}});}}, {context});
  const run={id:'test',events:[{role:'user',text:'First message'},{role:'assistant',text:'Earlier answer'},{role:'system',text:'Not user input'},{role:'user',text:'Follow up'}],schedule:{model:model.id,workspace:{cwd:'/synthetic',additionalDirectories:[]},mcpServers:{},skillDirectories:[]}};
  const args={run,prompt:'Follow up',attachments:[],signal:new AbortController().signal,emit:(role,text,data)=>events.push({role,text,data}),stream:(id,text)=>{streamed.push(text);run.liveMessages??={};run.liveMessages[id]=(run.liveMessages[id]||'')+text;},ask:async request=>{permissions.push(request);return 'approve';},update:()=>{}};
  return {provider,run,args,calls,events,streamed,permissions,requests:()=>calls.filter(c=>c.url.endsWith('/chat/completions'))};
}
test('MTPLX uses live reasoning metadata, exact per-chat fields and explicit client-control opt-in',async()=>{
  const f=fixture();f.run.schedule.reasoningMode='on';f.run.schedule.reasoningEffort='xhigh';await f.provider.run(f.args);
  const request=f.requests()[0],body=JSON.parse(request.options.body);
  assert.equal(body.enable_thinking,true);assert.equal(body.reasoning_effort,'xhigh');assert.equal(request.options.headers['X-MTPLX-Allow-Client-Controls'],'true');assert.ok(body.tools.some(t=>t.function.name==='mcp'));assert.equal(body.parallel_tool_calls,false);assert.equal(body.max_tokens,16384);
  const status=await f.provider.status();assert.deepEqual(status.models[0].controls.reasoningEfforts,['xhigh','medium','low']);assert.deepEqual(status.models[0].controls.reasoningModes,['auto','on','off']);assert.equal(status.models[0].supportsVision,true);
  assert.deepEqual(mtplxReasoning({reasoningMode:'off',reasoningEffort:'xhigh'},status.models[0]),{enable_thinking:false});assert.deepEqual(mtplxReasoning({},status.models[0]),{});
  assert.throws(()=>validateModelOptions({reasoningMode:'on'},mtplxModel(model)),/unavailable/);assert.throws(()=>validateModelOptions({reasoningEffort:'high'},status.models[0]),/unavailable/);
  assert.equal(chatModelOptions({model:model.id,reasoningMode:'off'}).reasoningMode,'off');
});
test('MTPLX supplies selected text/agent context, one copy of each message and measured usage',async()=>{
  const f=fixture({context:{providerContext:()=>({instructionText:'SELECTED_SOURCE',customAgents:[{displayName:'Test',prompt:'SELECTED_AGENT',tools:null}],mcpServers:{},disabledLegacyMcp:[]})}});f.run.schedule.context={entries:[],includeDefaults:false};await f.provider.run(f.args);
  const body=JSON.parse(f.requests()[0].options.body);assert.match(body.messages[0].content,/SELECTED_SOURCE/);assert.match(body.messages[0].content,/SELECTED_AGENT/);assert.deepEqual(body.messages.slice(1),[{role:'user',content:'First message'},{role:'assistant',content:'Earlier answer'},{role:'user',content:'Follow up'}]);assert.equal(f.streamed.join(''),'Hello 🐱');assert.deepEqual(f.run.liveMessages,{});assert.equal(f.run.usage.inputTokens,52);assert.equal(f.run.contextUsage.modelContextWindow,262144);assert.ok(f.run.schedule.context.suppliedAt);
});
test('MTPLX executes selected MCP schema/approval/result loop and continues model output',async()=>{
  let executed=0;const client={listTools:async()=>({tools:[{name:'echo',inputSchema:{type:'object',properties:{value:{type:'string'}},required:['value'],additionalProperties:false},annotations:{readOnlyHint:true}}]}),callTool:async request=>{executed++;assert.deepEqual(request.arguments,{value:'known'});return {content:[{type:'text',text:'KNOWN_RESULT'}]};},close:async()=>{}};
  const f=fixture({replies:[tool('mcp',{action:'call-tool',server:'selected',tool:'echo',arguments:{value:'known'}}),answer('Used result')],mcpConnect:async()=>client});f.run.schedule.mcpServers={selected:{type:'stdio',command:'fixture'}};await f.provider.run(f.args);
  assert.equal(executed,1);assert.equal(f.permissions.length,1);assert.equal(f.permissions[0].details.kind,'mcp');assert.equal(f.permissions[0].details.readOnly,true);assert.equal(f.permissions[0].details.serverName,'selected');assert.ok(JSON.parse(f.requests()[1].options.body).messages.some(m=>m.role==='tool'&&m.content==='KNOWN_RESULT'));assert.ok(f.events.some(e=>e.role==='assistant'&&e.text==='Used result'));
});
test('denied, malformed, unselected and filtered MCP calls never dispatch',async()=>{
  for(const scenario of ['deny','malformed','unselected','filtered']){
    let called=0;const client={listTools:async()=>({tools:[{name:'echo',inputSchema:{type:'object',properties:{n:{type:'number'}},required:['n']}}]}),callTool:async()=>{called++;},close:async()=>{}};
    const f=fixture({replies:[tool('mcp',{action:'call-tool',server:scenario==='unselected'?'other':'selected',tool:'echo',arguments:{n:scenario==='malformed'?'invalid':1}}),answer()],mcpConnect:async()=>client});f.run.schedule.mcpServers={selected:{command:'fixture',...(scenario==='filtered'?{tools:['different']}:{})}};if(scenario==='deny')f.args.ask=async()=> 'deny';await f.provider.run(f.args);assert.equal(called,0,scenario);
  }
});
test('uncertain MCP execution stops the turn with one call and closes replay pairs on restart',async()=>{
  let called=0;const f=fixture({replies:[tool('mcp',{action:'call-tool',server:'s',tool:'write',arguments:{}})],mcpConnect:async()=>({listTools:async()=>({tools:[{name:'write',inputSchema:{type:'object'}}]}),callTool:async()=>{called++;throw Error('transport closed');},close:async()=>{}})});f.run.schedule.mcpServers={s:{command:'fixture'}};await assert.rejects(f.provider.run(f.args),/uncertain/);assert.equal(called,1);assert.equal(f.requests().length,1);
  const replay=mtplxMessages(JSON.parse(JSON.stringify(f.run)),'Inspect state','System');assert.ok(replay.some(m=>m.role==='tool'&&/may have occurred/.test(m.content)));assert.equal(called,1);
});
test('selected agent tool ceiling excludes file writes and MCP calls outside its server scope',async()=>{
  const context={providerContext:()=>({instructionText:'',agent:'agent-main',customAgents:[{name:'agent-main',displayName:'Scoped',prompt:'Read only',tools:['view']}],mcpServers:{},disabledLegacyMcp:[]})};const f=fixture({context});f.run.schedule.context={entries:[],includeDefaults:false};await f.provider.run(f.args);assert.deepEqual(JSON.parse(f.requests()[0].options.body).tools.map(t=>t.function.name),['read_file']);
});
test('MCP server selection changes during permission wait cannot dispatch a stale grant',async()=>{
  let called=0;const f=fixture({replies:[tool('mcp',{action:'call-tool',server:'s',tool:'echo',arguments:{}}),answer()],mcpConnect:async()=>({listTools:async()=>({tools:[{name:'echo',inputSchema:{type:'object'}}]}),callTool:async()=>{called++;},close:async()=>{}})});f.run.schedule.mcpServers={s:{command:'first'}};f.args.ask=async()=>{f.run.schedule.mcpServers.s.command='changed';return 'approve';};await f.provider.run(f.args);assert.equal(called,0);
});
test('MTPLX media input and image tool results use actual image content, not base64 text',()=>{
  const vision=mtplxModel(model),image={name:'pixel',mediaType:'image/png',bytes:Buffer.from('image')},content=mtplxInput('Look',[image],vision);assert.equal(content[1].type,'image_url');assert.match(content[1].image_url.url,/^data:image\/png;base64,/);assert.throws(()=>mtplxInput('Look',[image],{supportsVision:false}),/does not advertise/);assert.equal(mtplxInput('Read',[{name:'note',mediaType:'text/plain',bytes:Buffer.from('Text')}],vision)[1].type,'text');
  const result=mtplxResult({content:[{type:'image',mimeType:'image/png',data:Buffer.from('image').toString('base64')}]},true);assert.equal(result.content[0].type,'image_url');
});
test('file helper enforces roots, symlinks, protected metadata and edit hashes',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'mtplx-files-')),outside=await fs.mkdtemp(path.join(os.tmpdir(),'mtplx-outside-'));try{
    const run={schedule:{workspace:{cwd:root,additionalDirectories:[]}}},[read,write]=mtplxFileTools(run);await fs.writeFile(path.join(root,'note.txt'),'before');await fs.symlink(outside,path.join(root,'escape'));
    await assert.rejects(read.handler({path:path.join(outside,'secret')}),/outside/);await assert.rejects(write.handler({path:'escape/file',content:'no',expectedSha256:''}),/outside/);await assert.rejects(write.handler({path:'.git/config',content:'no',expectedSha256:''}),/Protected/);
    await assert.rejects(write.handler({path:'note.txt',content:'after',expectedSha256:''}),/changed|exists/);const before=JSON.parse(await read.handler({path:'note.txt'}));await write.handler({path:'note.txt',content:'after',expectedSha256:before.sha256});assert.equal(await fs.readFile(path.join(root,'note.txt'),'utf8'),'after');await assert.rejects(write.handler({path:'note.txt',content:'bad',expectedSha256:before.sha256}),/changed/);
  }finally{await fs.rm(root,{recursive:true,force:true});await fs.rm(outside,{recursive:true,force:true});}
});
test('real stdio MCP SDK discovery/filter/call/status closes the selected child',async()=>{
  const mcp=new MtplxMcp(()=>({fixture:{command:process.execPath,args:[fileURLToPath(new URL('./fixtures/mtplx-mcp.mjs',import.meta.url))],tools:['echo']}}));try{assert.deepEqual((await mcp.tools('fixture')).map(t=>t.name),['echo']);const result=await mcp.call('fixture','echo',{value:'REAL_MCP'});assert.equal(result.content[0].text,'REAL_MCP');assert.equal((await mcp.status()).servers[0].status,'connected');await assert.rejects(mcp.client('unselected'),/not selected/);}finally{await mcp.close();}
});
test('MCP argument validation rejects shape/type errors without coercing or accepting remote refs',()=>{assert.throws(()=>validateToolArguments({type:'object',properties:{n:{type:'number'}},required:['n'],additionalProperties:false},{n:'1'}),/schema/);assert.throws(()=>validateToolArguments({$ref:'https://example.com/schema'},{}));});
test('history trimming removes complete old turns but retains current sources, tool pairs and latest input',()=>{
  const messages=[{role:'system',content:'CURRENT_SOURCE'},{role:'user',content:'x'.repeat(5000)},{role:'assistant',content:'Old answer'},{role:'user',content:'Latest'},{role:'assistant',content:'',tool_calls:[{id:'c',function:{name:'mcp',arguments:'{}'}}]},{role:'tool',tool_call_id:'c',content:'Result'}];const result=trimMtplxHistory(messages,6000,500,[]);assert.equal(result.dropped,2);assert.equal(result.messages[0].content,'CURRENT_SOURCE');assert.equal(result.messages[1].content,'Latest');assert.equal(result.messages.at(-1).tool_call_id,'c');assert.throws(()=>trimMtplxHistory([{role:'system',content:'x'.repeat(10000)},{role:'user',content:'latest'}],4096,1000,[]),/Select fewer/);
});
test('broken and inconsistent streams preserve partial text and never execute a truncated tool intent',async()=>{
  for(const reply of [frame({choices:[{delta:{content:'Partial'}}]}),frame({choices:[{delta:{content:'Partial'},finish_reason:'stop'}]})]){const f=fixture({replies:[reply]});await assert.rejects(f.provider.run(f.args),/completion/);assert.equal(f.events.find(e=>e.role==='assistant').data.partial,true);assert.equal(f.requests().length,1);}
});
test('incremental SSE handles every UTF-8 byte boundary and unterminated final frame',async()=>{const bytes=new TextEncoder().encode(frame({content:'🐱'})+'data: [DONE]'),body=new ReadableStream({start(c){for(const byte of bytes)c.enqueue(new Uint8Array([byte]));c.close();}}),values=[];for await(const value of mtplxEvents(body))values.push(value);assert.deepEqual(values,[JSON.stringify({content:'🐱'}),'[DONE]']);});
test('stop aborts an in-flight model request with no replacement',async()=>{
  const f=fixture();let started;const ready=new Promise(resolve=>started=resolve),original=f.provider.request;f.provider.request=async(url,options)=>{if(!url.endsWith('/chat/completions'))return original(url,options);started();return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));};const result=f.provider.run(f.args);await ready;await f.provider.close();await assert.rejects(result,/aborted/);
});
test('loopback-only model transport rejects remote endpoints and credentials',()=>{assert.equal(mtplxEndpoint(),'http://127.0.0.1:8000/v1');for(const url of ['https://example.com/v1','http://192.168.1.2/v1','http://localhost/wrong','http://user:pass@localhost/v1','http://localhost/v1?token=secret'])assert.throws(()=>mtplxEndpoint(url));});
