import assert from 'node:assert/strict';
import {mkdtemp, readdir, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {OpenRouterCredentials, OpenRouterProvider, openRouterModels} from '../src/providers/openrouter.js';
import {managedRequirementsSchema} from '../src/services/integrations/managed-requirements.js';
import {validateToolArguments} from '../src/providers/mtplx-tools.js';
import {remoteRun} from '../src/services/remote/remote.js';
import {openRouterQuickModels, openRouterCostText} from '../public/features/chats/openrouter-models.js';

const model = {
  id: 'test/chat:free', name: 'Catalog test', context_length: 131072,
  architecture: {input_modalities: ['text','image'], output_modalities: ['text']},
  supported_parameters: ['tools'], pricing: {prompt: '0', completion: '0.000001'},
  top_provider: {max_completion_tokens: 8192},
};
const frame = value => 'data: '+(typeof value==='string'?value:JSON.stringify(value))+'\n\n';
const chunk = (delta, finish_reason) => frame({choices:[{delta,finish_reason}]});
const usage = cost => frame({choices:[], usage:{prompt_tokens:80,completion_tokens:10,total_tokens:90,...(cost===undefined?{}:{cost})}});
const end = frame('[DONE]');
const answer = cost => chunk({content:'Answer'},'stop')+usage(cost)+end;
const tool = chunk({reasoning_details:[{index:0,type:'reasoning.text',text:'First '}]}) +
  chunk({reasoning_details:[{index:0,text:'second'}],tool_calls:[{
    index:0,id:'call_1',type:'function',function:{name:'mcp',arguments:'{"action":"list"}'},
  }]},'tool_calls')+usage(0.000025)+end;

function fixture(replies, row=model) {
  const requests=[], events=[], progression=[];
  const run={id:'test-run',events:[],turns:[{model:row.id}],schedule:{provider:'openrouter',model:row.id,workspace:{cwd:'/synthetic',additionalDirectories:[]}}};
  const provider=new OpenRouterProvider({credentials:{key:()=> 'fixture-key'}, fetch:async(url,options)=>{
    assert.equal(options.redirect,'error');
    if(url.endsWith('/models')){
      assert.equal(options.headers,undefined);
      return Response.json({data:[row]});
    }
    assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.Authorization,'Bearer fixture-key');
    const reply=replies[requests.length];
    requests.push(JSON.parse(options.body));
    return new Response(reply,{headers:{'content-type':'text/event-stream'}});
  }},{});
  return {provider,requests,events,progression,run,args:{run,prompt:'Test',signal:new AbortController().signal,
    emit:(role,text,data)=>events.push({role,text,data}),stream:()=>{},ask:async()=>{throw Error('Unexpected approval');},
    update:()=>progression.push(structuredClone(run.openRouterCost))}};
}

test('normalizes chat capability and rates and keeps only favorites and selected models in the quick picker',()=>{
  const rows=openRouterModels([model,{...model,id:'test/other'},{...model,id:'test/image',architecture:{input_modalities:['text'],output_modalities:['image']}},{...model,architecture:{input_modalities:42}}]);
  assert.deepEqual(rows.map(m=>m.id),['test/chat:free','test/other']);
  assert.deepEqual(rows[0].pricing,{currency:'USD',input:0,output:0.000001});
  assert.equal(rows[0].supportsVision,true);
  assert.equal(rows[0].supportsTools,true);
  assert.deepEqual(openRouterQuickModels(rows,model.id,new Set()),[rows[0]]);
  assert.deepEqual(openRouterQuickModels(rows,'',new Set(['test/other'])),[rows[1]]);
});

test('counts each generation once, updates before the follow-up request and replays reasoning with local tool results',async()=>{
  const f=fixture([tool,answer(0)]);
  await f.provider.run(f.args);
  assert.equal(f.requests.length,2);
  assert.equal(f.requests[0].model,model.id);
  assert.deepEqual(f.requests[0].provider,{require_parameters:true});
  assert.ok(f.requests[0].tools.some(entry=>entry.function.name==='mcp'));
  const messages=f.requests[1].messages;
  assert.equal(messages.at(-2).reasoning_details[0].text,'First second');
  assert.equal(messages.at(-1).tool_call_id,'call_1');
  assert.deepEqual(f.run.openRouterCost,{requests:2,reportedRequests:2,usd:0.000025});
  assert.deepEqual(f.run.turns[0].openRouterCost,f.run.openRouterCost);
  assert.deepEqual(remoteRun(f.run).openRouterCost,f.run.openRouterCost);
  assert.ok(f.progression.some(v=>v?.requests===2&&v.reportedRequests===1&&v.usd===0.000025));
  assert.equal(f.run.usage.inputTokens,160);
});

test('free, missing and partial charges stay distinct and text-only models receive no tool definitions',async()=>{
  const fixtureModel={...model,supported_parameters:[]};
  const free=fixture([answer(0)],fixtureModel);
  await free.provider.run(free.args);
  assert.equal(free.requests[0].tools,undefined);
  assert.match(openRouterCostText(free.run.openRouterCost,'completed'),/0\.00 USD/);
  const unknown=fixture([answer(undefined)],fixtureModel);
  await unknown.provider.run(unknown.args);
  assert.equal(unknown.run.openRouterCost.usd,undefined);
  assert.equal(openRouterCostText(unknown.run.openRouterCost,'completed'),'Cost unavailable');
  assert.equal(openRouterCostText(unknown.run.openRouterCost,'running'),'Awaiting reported cost');
  const interrupted=fixture([tool,chunk({content:'Partial'})]);
  await assert.rejects(interrupted.provider.run(interrupted.args),/before completion/);
  assert.match(openRouterCostText(interrupted.run.openRouterCost,'failed'),/partial$/);
  assert.equal(interrupted.requests.length,2);
});

test('validates keys before protected storage and replaces the saved key only on success',async()=>{
  const home=await mkdtemp(path.join(os.tmpdir(),'proteus-openrouter-'));
  const key='sk-or-v1-proteus-fixture-test-key';
  let accepted=true;
  const storage={isEncryptionAvailable:()=>true,encryptString:text=>Buffer.from([...Buffer.from(text)].reverse()),decryptString:bytes=>Buffer.from([...bytes].reverse()).toString()};
  const credentials=new OpenRouterCredentials(home,storage,async(url,options)=>{
    assert.equal(url,'https://openrouter.ai/api/v1/key');
    assert.equal(options.redirect,'error');
    assert.ok(options.headers.Authorization.startsWith('Bearer sk-or-'));
    return Response.json({}, {status:accepted?200:401});
  });
  try {
    assert.equal(credentials.key(),'');
    await credentials.configure({action:'connect',key});
    assert.equal(credentials.key(),key);
    const vault=path.join(home,'managed-mcp-credentials');
    const [file]=await readdir(vault);
    assert.equal((await readFile(path.join(vault,file),'utf8')).includes(key),false);
    accepted=false;
    await assert.rejects(credentials.configure({action:'connect',key:key+'-replacement'}),/401/);
    assert.equal(credentials.key(),key);
    await credentials.configure({action:'disconnect'});
    assert.equal(credentials.key(),'');
    await assert.rejects(new OpenRouterCredentials(home,{isEncryptionAvailable:()=>false}).configure({action:'connect',key}),/Protected/);
  } finally { await rm(home,{recursive:true,force:true}); }
});

test('OpenRouter omits unsupported uniqueness hints on the wire and retains owner validation',()=>{
  const {provider}=fixture([]);
  const original={type:'object',properties:{managedConnections:managedRequirementsSchema}};
  const definitions=[{type:'function',function:{name:'proteus_chats',parameters:original}}];
  const options=provider.completionOptions({},null,definitions);
  const capabilities=schema=>schema.properties.managedConnections.items.properties.capabilities;
  assert.equal(capabilities(options.tools[0].function.parameters).uniqueItems,undefined);
  assert.equal(capabilities(original).uniqueItems,true);
  assert.throws(()=>validateToolArguments(original,{managedConnections:[
    {name:'sample',capabilities:['read','read'],required:true},
  ]}),/must NOT have duplicate items/);
});
