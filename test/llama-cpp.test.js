import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LlamaCppProvider,llamaEndpoint,llamaModel,llamaFetch} from '../src/providers/llama-cpp.js';
const model={id:'fixture',owned_by:'llamacpp',meta:{n_ctx:32768,ftype:'Q4_K - Medium'},architecture:{input_modalities:['text']}};
const props={default_generation_settings:{n_ctx:32768},chat_template_caps:{supports_reasoning_effort:true,reasoning_effort_levels:['low','xhigh']}};
const frame=x=>'data: '+(typeof x==='string'?x:JSON.stringify(x))+'\n\n';
const answer=()=>frame({choices:[{delta:{content:'Confirmed'},finish_reason:'stop'}]})+frame({choices:[],usage:{prompt_tokens:100,completion_tokens:10,total_tokens:110}})+frame('[DONE]');
function fixture(replies=[answer()]){
 const calls=[],events=[];let next=0;
 const provider=new LlamaCppProvider({config:{},fetch:async(url,options)=>{calls.push({url,options});if(url.endsWith('/models'))return Response.json({data:[model]});if(url.endsWith('/props'))return Response.json(props);if(url.endsWith('/apply-template'))return Response.json({prompt:'rendered'});if(url.endsWith('/tokenize'))return Response.json({tokens:[1,2,3]});return new Response(replies[next++],{headers:{'content-type':'text/event-stream'}});}});
 const run={id:'fixture',events:[],schedule:{model:'fixture',reasoningEffort:'xhigh',workspace:{cwd:os.tmpdir(),additionalDirectories:[]},mcpServers:{},skillDirectories:[]}};
 return {provider,run,calls,events,args:{run,prompt:'Check',signal:new AbortController().signal,emit:(role,text,data)=>events.push({role,text,data}),stream:()=>{},update:()=>{},ask:async()=> 'deny'}};
}
test('llama endpoint rejects remote plaintext, credentials and unexpected paths',()=>{
 assert.equal(llamaEndpoint(),'http://127.0.0.1:8080/v1');assert.equal(llamaEndpoint('https://server:8080/v1/'),'https://server:8080/v1');
 for(const url of ['http://server/v1','https://user:secret@server/v1','https://server/v1?key=x','https://server/api'])assert.throws(()=>llamaEndpoint(url));
});
test('loaded context and reasoning options come from server metadata',()=>{
 const m=llamaModel(model,props);assert.equal(m.controls.contextTiers[0].totalTokens,32768);assert.deepEqual(m.controls.reasoningEfforts,['low','xhigh']);assert.equal(m.supportsVision,false);assert.throws(()=>llamaModel({id:'unknown'}));assert.deepEqual(llamaModel(model).controls.reasoningEfforts,[]);
});
test('discovery, streaming, continuation and usage retain llama provider identity',async()=>{
 const f=fixture([answer(),answer()]);assert.equal((await f.provider.status()).provider,'llama-cpp');await f.provider.run(f.args);await f.provider.run({...f.args,prompt:'Continue'});
 const requests=f.calls.filter(c=>c.url.endsWith('/chat/completions'));const body=JSON.parse(requests[0].options.body);
 assert.equal(body.reasoning_effort,'xhigh');assert.equal(requests[0].options.headers['X-MTPLX-Allow-Client-Controls'],undefined);assert.match(body.messages[0].content,/llama.cpp/);assert.equal(f.run.providerSessionId,'llama-cpp:fixture');assert.equal(f.run.usage.inputTokens,200);assert.ok(JSON.parse(requests[1].options.body).messages.some(m=>m.role==='assistant'&&m.content==='Confirmed'));await f.provider.close();
});
test('file tool denial returns a result without executing an unauthorized write',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'llama-deny-'));const call={choices:[{delta:{tool_calls:[{index:0,id:'write',type:'function',function:{name:'write_file',arguments:JSON.stringify({path:'denied.txt',content:'must not write',expectedSha256:''})}}]},finish_reason:'tool_calls'}]};
 const f=fixture([frame(call)+frame('[DONE]'),answer()]);f.run.schedule.workspace.cwd=root;
 try{await f.provider.run(f.args);await assert.rejects(fs.stat(path.join(root,'denied.txt')),/ENOENT/);assert.equal(f.calls.filter(c=>c.url.endsWith('/chat/completions')).length,2);}finally{await f.provider.close();await fs.rm(root,{recursive:true,force:true});}
});
test('API keys are attached only as authorization headers and redirects fail closed',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'llama-auth-'));try{const file=path.join(root,'key');await fs.writeFile(file,'private-test-key');let observed;const request=llamaFetch({apiKeyFile:file},async(url,options)=>{observed={url,options};return Response.json({});});await request('https://server/v1/models',{redirect:'error'});assert.equal(observed.options.headers.Authorization,'Bearer private-test-key');assert.equal(observed.options.redirect,'error');assert.ok(!observed.url.includes('private-test-key'));}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('cancellation and malformed streams fail without retry',async()=>{
 const f=fixture([frame({choices:[{delta:{content:'Partial'}}]})]);await assert.rejects(f.provider.run(f.args),/before completion/);assert.equal(f.calls.filter(c=>c.url.endsWith('/chat/completions')).length,1);
 const controller=new AbortController();controller.abort();await assert.rejects(f.provider.run({...f.args,signal:controller.signal}));await f.provider.close();
});

test('exact tokenizer admission evicts complete older turns and keeps current sources',async()=>{
 const f=fixture();let n=0;f.provider.request=async url=>url.endsWith('/apply-template')?Response.json({prompt:'actual template'}):Response.json({tokens:Array(n++?100:1000).fill(1)});
 const messages=[{role:'system',content:'current source'},{role:'user',content:'old'},{role:'assistant',content:'old answer'},{role:'user',content:'latest'}];
 const result=await f.provider.trimHistory(messages,1024,256,[],new AbortController().signal);assert.equal(result.dropped,2);assert.deepEqual(result.messages,[messages[0],messages[3]]);
 f.provider.request=async url=>url.endsWith('/apply-template')?Response.json({prompt:'too long'}):Response.json({tokens:Array(2000).fill(1)});
 await assert.rejects(f.provider.trimHistory([messages[0],messages[3]],1024,256,[]),/exceed the loaded/);await f.provider.close();
});
test('tokenizer errors fail closed rather than sending an oversized request',async()=>{
 const f=fixture();f.provider.request=async()=>Response.json({error:'unavailable'},{status:503});await assert.rejects(f.provider.trimHistory([],8192,2048,[]),/template accounting failed/);await f.provider.close();
});

test('invalid local connection configuration makes only this provider unavailable',async()=>{const p=new LlamaCppProvider({config:{endpoint:'http://remote/v1'}});assert.equal((await p.status()).available,false);assert.match((await p.status()).error,/configuration/);await p.close();});
