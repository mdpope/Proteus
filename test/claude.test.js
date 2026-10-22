import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {ClaudeProvider,ClaudeRPC,claudeModel,claudeMcpConfig,stopClaudeProcess,claudeAccountAvailable,claudeQuota} from '../src/claude.js';
import {normalizeProviderUsage,ProviderUsageCache} from '../src/usage.js';
import {providerUsageSummary} from '../public/usage.js';
const model={value:'test',displayName:'Synthetic',supportedEffortLevels:['low','high'],supportsFastMode:true};
class Fake extends EventEmitter {
  constructor(action){super();this.action=action;this.responses=[];}
  async initialize(hooks){this.hooks=hooks;return {hooks_applied:true,models:[model],account:{tokenSource:'oauth'},fast_mode_disabled_reason:'sdk_opt_in_required'};}
  write(message){if(message.type==='user'){this.userMessage=message;queueMicrotask(()=>this.action?.(this));}}
  respond(id,response){this.responses.push({id,response});this.emit('response');}
  async close(){this.closed=true;}
}
const schedule={model:'test',workspace:{cwd:'/tmp',additionalDirectories:[]},reasoningEffort:'high'};
const runArgs=()=>({run:{id:'test',schedule:structuredClone(schedule)},prompt:'synthetic',emit:()=>{},update:()=>{},stream:()=>{},ask:async()=> 'approve',signal:new AbortController().signal});
const result=c=>c.emit('message',{type:'result',subtype:'success',usage:{input_tokens:10,output_tokens:2},session_id:'native-test'});
test('Claude capabilities originate in runtime metadata; disabled fast mode is not offered',()=>{
  assert.deepEqual(claudeModel(model).controls.reasoningEfforts,['low','high']);assert.equal(claudeModel(model).controls.contextTiers[0].totalTokens,null);
  assert.equal(claudeModel(model,{fast_mode_disabled_reason:'sdk_opt_in_required'}).controls.serviceTiers.length,0);
});
test('Claude model labels reveal runtime-resolved aliases without inventing pinned choices',()=>{
  const aliases=[{value:'sonnet',displayName:'Sonnet',resolvedModel:'claude-sonnet-5',description:'Current model'}, {value:'claude-fable-5[1m]',displayName:'Fable',resolvedModel:'claude-fable-5'}].map(item=>claudeModel(item));
  assert.equal(aliases[0].id,'sonnet');assert.match(aliases[0].name,/Sonnet.*claude-sonnet-5.*alias/);
  assert.match(aliases[0].description,/can change/);assert.equal(aliases[1].id,'claude-fable-5[1m]');
  assert.equal(claudeModel({value:'pinned-id',displayName:'Pinned',resolvedModel:'pinned-id'}).name,'Pinned');
});
test('Claude MCP configuration admits selected stdio and HTTPS only, preserving explicit scope',()=>{
  const selected={local:{type:'stdio',command:'/usr/bin/false',args:['--synthetic'],env:{KEY:'SYNTHETIC_SECRET'},workingDirectory:'/tmp'},remote:{type:'http',url:'https://mcp.example.invalid/api',headers:{Authorization:'Bearer SYNTHETIC_SECRET'}}};
  assert.deepEqual(claudeMcpConfig(selected,'/tmp').mcpServers,{local:{type:'stdio',command:'/usr/bin/false',args:['--synthetic'],env:{KEY:'SYNTHETIC_SECRET'}},remote:selected.remote});
  assert.throws(()=>claudeMcpConfig({bad:{type:'http',url:'http://example.invalid',headers:{}}},'/tmp'),/HTTPS/);
  assert.throws(()=>claudeMcpConfig({bad:{type:'stdio',command:'/usr/bin/false',workingDirectory:'/elsewhere'}},'/tmp'),/working directory is unavailable/);
  assert.throws(()=>claudeMcpConfig({bad:{type:'stdio',command:'/usr/bin/false',workingDirectory:'relative'}},'/tmp'),/absolute working directory/);
  assert.throws(()=>claudeMcpConfig({bad:{type:'stdio',command:'/usr/bin/false',tools:['read']}},'/tmp'),/cannot enforce/);
  assert.throws(()=>claudeMcpConfig({bad:{type:'stdio',command:'/usr/bin/false',tools:[]}},'/tmp'),/cannot enforce/);
  assert.deepEqual(claudeMcpConfig({allowed:{type:'stdio',command:'/usr/bin/false',tools:['*']}},'/tmp').mcpServers.allowed,{type:'stdio',command:'/usr/bin/false',args:[],env:{}});
});
test('Claude private stdio launcher preserves selected source cwd and env without shell or secret argv',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-claude-mcp-fixture-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const chat=path.join(root,'chat'),source=path.join(root,'source');fs.mkdirSync(chat);fs.mkdirSync(source);
  fs.writeFileSync(path.join(source,'server.cjs'),"process.stdout.write(JSON.stringify({cwd:process.cwd(),arg:process.argv[2],key:process.env.SYNTHETIC_KEY,electronNode:process.env.ELECTRON_RUN_AS_NODE||null}));");
  let config,configFile,spec,specMode,output;
  const p=new ClaudeProvider({clientFactory:options=>{
    configFile=options.mcpConfigPath;config=JSON.parse(fs.readFileSync(configFile,'utf8'));
    const launched=config.mcpServers.local;const specFile=launched.args[1];spec=JSON.parse(fs.readFileSync(specFile,'utf8'));specMode=fs.statSync(specFile).mode&0o777;
    output=JSON.parse(execFileSync(launched.command,launched.args,{encoding:'utf8',env:{...process.env,...launched.env}}));
    const client=new Fake(result);client.request=async()=>({mcpServers:[{name:'local',status:'connected'}]});return client;
  }});
  const a=runArgs();a.run.schedule.workspace.cwd=chat;a.run.schedule.mcpServers={local:{type:'stdio',command:process.execPath,args:['server.cjs','SYNTHETIC_ARG'],workingDirectory:source,env:{SYNTHETIC_KEY:'SYNTHETIC_ENV_SECRET'}}};
  await p.run(a);
  assert.equal(specMode,0o600);assert.equal(spec.workingDirectory,fs.realpathSync(source));
  assert.equal(JSON.stringify(config).includes('SYNTHETIC_ENV_SECRET'),false);
  assert.equal(config.mcpServers.local.args.join(' ').includes('SYNTHETIC_ENV_SECRET'),false);
  assert.equal(config.mcpServers.local.env.ELECTRON_RUN_AS_NODE,'1');
  assert.deepEqual(output,{cwd:fs.realpathSync(source),arg:'SYNTHETIC_ARG',key:'SYNTHETIC_ENV_SECRET',electronNode:null});
  assert.equal(fs.existsSync(configFile),false);assert.equal(fs.existsSync(config.mcpServers.local.args[1]),false);
});
test('Claude captured context includes only selected MCP sources, without legacy defaults',async()=>{
  let config;const context={providerContext:()=>({disabledLegacyMcp:[],mcpServers:{chosen:{type:'http',url:'https://chosen.example.invalid'}},customAgents:[],instructionText:''})};
  const p=new ClaudeProvider({clientFactory:options=>{config=JSON.parse(fs.readFileSync(options.mcpConfigPath,'utf8'));const client=new Fake(result);client.request=async()=>({mcpServers:[{name:'chosen',status:'connected'}]});return client;}},{context});
  const a=runArgs();a.run.schedule.context={includeDefaults:false,entries:[]};a.run.schedule.mcpServers={unselected:{type:'http',url:'https://unselected.example.invalid'}};
  await p.run(a);assert.deepEqual(Object.keys(config.mcpServers),['chosen']);
});
test('Claude turn loads selected MCP servers from a private file and waits for connection before user content',async()=>{
  let configFile,config,mode,args,observedUserBeforeStatus=false,statusChecks=0;
  const provider=new ClaudeProvider({clientFactory:options=>{
    configFile=options.mcpConfigPath;args=options.args;
    assert.ok(configFile);mode=fs.statSync(configFile).mode&0o777;config=JSON.parse(fs.readFileSync(configFile,'utf8'));
    const client=new Fake(result);client.request=async payload=>{assert.deepEqual(payload,{subtype:'mcp_status'});statusChecks++;return {mcpServers:[{name:'remote',status:'connected'},{name:'unselected',status:'connected'}]};};
    client.write=message=>{if(message.type==='user'){observedUserBeforeStatus=statusChecks===0;client.userMessage=message;queueMicrotask(()=>result(client));}};
    return client;
  }});
  const a=runArgs();a.run.schedule.mcpServers={remote:{type:'http',url:'https://mcp.example.invalid/api',headers:{Authorization:'Bearer SYNTHETIC_SECRET'}}};
  await provider.run(a);
  assert.equal(mode,0o600);assert.deepEqual(Object.keys(config.mcpServers),['remote']);assert.equal(config.mcpServers.remote.headers.Authorization,'Bearer SYNTHETIC_SECRET');
  assert.equal(args.join(' ').includes('SYNTHETIC_SECRET'),false);assert.equal(observedUserBeforeStatus,false);assert.equal(statusChecks,1);
  assert.equal(a.run.mcpConnections.remote.status,'connected');assert.equal(fs.existsSync(configFile),false);
});
test('Claude MCP needs-auth, failed, and permission denial do not bypass the selected-server boundary',async()=>{
  for(const state of ['needs-auth','failed']){
    let client,configFile;const p=new ClaudeProvider({clientFactory:options=>{configFile=options.mcpConfigPath;client=new Fake();client.request=async()=>({mcpServers:[{name:'remote',status:state,error:'SYNTHETIC_SECRET'}]});return client;}});
    const a=runArgs();a.run.schedule.mcpServers={remote:{type:'sse',url:'https://mcp.example.invalid/sse'}};
    await assert.rejects(p.run(a),error=>error.message.includes(state)&&!error.message.includes('SYNTHETIC_SECRET'));
    assert.equal(client.userMessage,undefined);assert.equal(client.closed,true);assert.equal(fs.existsSync(configFile),false);
  }
  let client;const p=new ClaudeProvider({clientFactory:()=>{client=new Fake();client.request=async()=>({mcpServers:[{name:'remote',status:'connected'}]});return client;}});
  const a=runArgs();a.run.schedule.mcpServers={remote:{type:'http',url:'https://mcp.example.invalid/api'}};a.ask=async()=> 'deny';
  const pending=p.run(a);await new Promise(resolve=>setImmediate(resolve));
  const responded=new Promise(resolve=>client.once('response',resolve));client.emit('request',{request_id:'approval',request:{subtype:'hook_callback',input:{tool_name:'mcp__remote__read',tool_use_id:'tool-1',tool_input:{synthetic:true}}}});await responded;
  assert.equal(client.responses.at(-1).response.hookSpecificOutput.permissionDecision,'deny');result(client);await pending;
});
test('Claude selected MCP startup and status errors redact provider secrets',async()=>{
  const a=runArgs();a.run.schedule.mcpServers={remote:{type:'http',url:'https://mcp.example.invalid/api',headers:{Authorization:'Bearer SYNTHETIC_SECRET'}}};
  const startup=new ClaudeProvider({clientFactory:()=>{const client=new Fake();client.initialize=async()=>{throw new Error('Bearer SYNTHETIC_SECRET');};return client;}});
  await assert.rejects(startup.run(a),error=>!error.message.includes('SYNTHETIC_SECRET')&&/selected MCP/.test(error.message));
  const status=new ClaudeProvider({clientFactory:()=>{const client=new Fake();client.request=async()=>{throw new Error('Bearer SYNTHETIC_SECRET');};return client;}});
  await assert.rejects(status.mcpStatus(a.run),error=>!error.message.includes('SYNTHETIC_SECRET')&&/status is unavailable/.test(error.message));
});
test('Claude MCP status probe is selected-only, sends no model turn, and cleanup failure blocks success',async()=>{
  let configFile,client;const p=new ClaudeProvider({clientFactory:options=>{configFile=options.mcpConfigPath;client=new Fake();client.write=()=>assert.fail('Status probe must not send a model turn');client.request=async()=>({mcpServers:[{name:'local',status:'connected'}]});return client;}});
  const a=runArgs();a.run.schedule.mcpServers={local:{type:'stdio',command:'/usr/bin/false'}};
  const status=await p.mcpStatus(a.run);assert.equal(status.servers[0].status,'connected');assert.equal(client.closed,true);assert.equal(fs.existsSync(configFile),false);
  const failed=new ClaudeProvider({clientFactory:options=>{configFile=options.mcpConfigPath;client=new Fake();client.request=async()=>({mcpServers:[{name:'local',status:'connected'}]});client.close=async()=>{throw new Error('cleanup EPERM');};return client;}});
  await assert.rejects(failed.mcpStatus(a.run),/cleanup EPERM/);assert.equal(fs.existsSync(configFile),false);assert.ok(failed.cleanupError);
});
test('Claude MCP status waits for selected pending servers in one runtime, without a model turn',async()=>{
  let time=0,client,configFile,checks=0;
  const p=new ClaudeProvider({mcpStatusNow:()=>time,mcpStatusWait:async ms=>{time+=ms;},mcpStatusSettleMs:1000,mcpStatusPollMs:250,
    clientFactory:options=>{configFile=options.mcpConfigPath;client=new Fake();client.write=()=>assert.fail('Status probe must not send a model turn');client.request=async()=>({mcpServers:[{name:'local',status:++checks<3?'pending':'connected'}]});return client;}});
  const a=runArgs();a.run.schedule.mcpServers={local:{type:'stdio',command:'/usr/bin/false'}};
  const status=await p.mcpStatus(a.run);
  assert.equal(status.servers[0].status,'connected');assert.equal(checks,3);assert.equal(time,500);
  assert.equal(client.closed,true);assert.equal(fs.existsSync(configFile),false);
});
test('Claude MCP status returns honest pending after its bounded wait and terminal needs-auth immediately',async()=>{
  let time=0,checks=0,client;
  const make=status=>new ClaudeProvider({mcpStatusNow:()=>time,mcpStatusWait:async ms=>{time+=ms;},mcpStatusSettleMs:500,mcpStatusPollMs:250,
    clientFactory:()=>{client=new Fake();client.request=async()=>{checks++;return {mcpServers:[{name:'local',status}]};};return client;}});
  const a=runArgs();a.run.schedule.mcpServers={local:{type:'stdio',command:'/usr/bin/false'}};
  assert.equal((await make('pending').mcpStatus(a.run)).servers[0].status,'pending');
  assert.equal(checks,3);assert.equal(time,500);assert.equal(client.closed,true);
  checks=0;time=0;
  const auth=await make('needs-auth').mcpStatus(a.run);
  assert.equal(auth.servers[0].status,'needs-auth');assert.equal(checks,1);assert.equal(time,0);assert.equal(client.closed,true);
});
test('Claude MCP status cancellation closes the isolated runtime and removes private config',async()=>{
  const controller=new AbortController();let client,configFile;
  const p=new ClaudeProvider({clientFactory:options=>{configFile=options.mcpConfigPath;client=new Fake();client.request=async()=>{controller.abort();return {mcpServers:[{name:'local',status:'pending'}]};};return client;}});
  const a=runArgs();a.run.schedule.mcpServers={local:{type:'stdio',command:'/usr/bin/false'}};
  await assert.rejects(p.mcpStatus(a.run,{signal:controller.signal}),/cancelled/);
  assert.equal(client.closed,true);assert.equal(fs.existsSync(configFile),false);assert.equal(p.mcpProbe,null);
});
test('Claude MCP status checks serialize with each other and with a new turn',async()=>{
  let release,client;const p=new ClaudeProvider({clientFactory:()=>{client=new Fake();client.initialize=()=>new Promise(resolve=>{release=()=>resolve({hooks_applied:true,models:[model]});});client.request=async()=>({mcpServers:[{name:'local',status:'connected'}]});return client;}});
  const a=runArgs();a.run.schedule.mcpServers={local:{type:'stdio',command:'/usr/bin/false'}};
  const pending=p.mcpStatus(a.run);assert.ok(p.mcpProbe);
  await assert.rejects(p.mcpStatus(a.run),/already running/);
  await assert.rejects(p.run(a),/connection check to finish/);
  release();await pending;assert.equal(p.mcpProbe,null);assert.equal(client.closed,true);
});
test('Claude uses native session continuation, accumulates tokens, streams no thinking',async()=>{
  const created=[];const provider=new ClaudeProvider({clientFactory:opts=>{const c=new Fake(client=>{client.emit('message',{type:'stream_event',event:{type:'content_block_delta',delta:{type:'thinking_delta',thinking:'private'}}});result(client);});created.push({opts,c});return c;}});
  const a=runArgs();let streamed=false;a.stream=()=>{streamed=true;};await provider.run(a);await provider.run(a);
  assert.equal(a.run.providerSessionId,'native-test');assert.equal(a.run.usage.inputTokens,20);assert.ok(created[1].opts.args.includes('--resume'));assert.equal(streamed,false);assert.ok(created.every(x=>x.c.closed));
  assert.equal(created[0].c.hooks.PreToolUse[0].hookCallbackIds[0],'proteus_permission');
});
test('Claude sends approved image and UTF-8 text as structured streaming user content',async()=>{
  const clients=[];const provider=new ClaudeProvider({clientFactory:()=>{const client=new Fake(result);clients.push(client);return client;}});
  assert.deepEqual(provider.acceptedMediaTypes,['image/png','image/jpeg','image/gif','image/webp','text/plain']);
  const attachments=[
    {bytes:Buffer.from([137,80,78,71]),name:'Synthetic.png',mediaType:'image/png'},
    {bytes:Buffer.from('Only synthetic text.'),name:'Synthetic.txt',mediaType:'text/plain'},
  ];
  await provider.run({...runArgs(),attachments});
  assert.deepEqual(clients[0].userMessage.message.content,[
    {type:'text',text:'synthetic'},
    {type:'image',source:{type:'base64',media_type:'image/png',data:attachments[0].bytes.toString('base64')}},
    {type:'text',text:'Attached plain text file: Synthetic.txt\n\nOnly synthetic text.'},
  ]);
  await assert.rejects(provider.run({...runArgs(),attachments:[{bytes:Buffer.from([0xff]),name:'bad.txt',mediaType:'text/plain'}]}),/UTF-8/);
  await assert.rejects(provider.run({...runArgs(),attachments:[{bytes:Buffer.from('%PDF'),name:'bad.pdf',mediaType:'application\/pdf'}]}),/PDF and other files/);
  assert.equal(clients.length,1);
});
test('Claude missing approval IDs cannot reuse a grant and user-question answers survive duplicate callback',async()=>{
  let client;const provider=new ClaudeProvider({clientFactory:()=>client=new Fake()});const a=runArgs();let asks=0;a.ask=async()=>{asks++;return 'approve';};const pending=provider.run(a);
  await new Promise(r=>setImmediate(r));
  const response=()=>new Promise(r=>client.once('response',r));
  let wait=response();client.emit('request',{request_id:'a',request:{subtype:'hook_callback',input:{tool_name:'Read',tool_input:{file_path:'/tmp/a'}}}});await wait;
  wait=response();client.emit('request',{request_id:'b',request:{subtype:'can_use_tool',tool_name:'Read',input:{file_path:'/tmp/a'}}});await wait;assert.equal(asks,2);
  const input={questions:[{question:'Which?',options:[{label:'A'}]}]};a.ask=async()=> 'A';
  wait=response();client.emit('request',{request_id:'c',request:{subtype:'hook_callback',input:{tool_name:'AskUserQuestion',tool_use_id:'q',tool_input:input}}});await wait;
  wait=response();client.emit('request',{request_id:'d',request:{subtype:'can_use_tool',tool_name:'AskUserQuestion',tool_use_id:'q',input}});await wait;
  assert.ok(client.responses.at(-1).response.updatedInput.answers['Which?']);result(client);await pending;
});
test('Claude active execution times out, stops child, and handles abort',async()=>{
  let client;const provider=new ClaudeProvider({timeoutMs:10,clientFactory:()=>client=new Fake()});await assert.rejects(provider.run(runArgs()),/time limit/);assert.equal(client.closed,true);
  const aborter=new AbortController(),a=runArgs();a.signal=aborter.signal;const pending=provider.run(a);await new Promise(r=>setImmediate(r));aborter.abort();await assert.rejects(pending,/Cancelled/);assert.equal(client.closed,true);
});
test('Claude quota is unknown before authoritative events and preserves reset metadata afterward',async()=>{
  const provider=new ClaudeProvider({clientFactory:()=>new Fake(c=>{c.emit('message',{type:'rate_limit_event',rate_limit_info:{rateLimitType:'five_hour',utilization:.25,resetsAt:1900000000,status:'allowed'}});result(c);})});
  assert.equal((await provider.quota()).available,false);await provider.run(runArgs());const q=await provider.quota();assert.equal(q.windows[0].remainingPercent,75);assert.equal(q.windows[0].resetAt,new Date(1900000000000).toISOString());
});
test('provider quotas normalize windows without estimating missing allowance and cache failures independently',async()=>{
  const raw={rateLimitsByLimitId:{codex:{limitName:'Codex',primary:{usedPercent:30,resetsAt:1900000000,windowDurationMins:300},secondary:{usedPercent:50}}}};
  const q=normalizeProviderUsage('codex',raw);assert.equal(providerUsageSummary(q).remaining,50);assert.equal(q.windows[0].remainingPercent,70);
  assert.equal(providerUsageSummary(normalizeProviderUsage('codex',{})).remaining,null);
  let reads=0;const cache=new ProviderUsageCache({codex:async()=>{reads++;return raw;},claude:async()=>{throw new Error('Unavailable');}});
  const [a,b]=await Promise.all([cache.get(),cache.get()]);assert.equal(reads,1);assert.equal(a.providers.codex.available,true);assert.equal(b.providers.claude.available,false);
});
test('provider quota timeout leaves healthy rows available and ignores late data',async()=>{
  let resolve;const cache=new ProviderUsageCache({claude:()=>new Promise(r=>{resolve=r;}),copilot:async()=>({quotaSnapshots:{premium_interactions:{remainingPercentage:80}}})},()=>1,5);
  const result=await cache.get();assert.equal(result.providers.copilot.windows[0].remainingPercent,80);assert.match(result.providers.claude.error,/timed out/);
  resolve({windows:[{id:'late',remainingPercent:99}]});await new Promise(r=>setImmediate(r));assert.equal(result.providers.claude.available,false);
});
test('Claude errors fail a turn even if followed by a success result',async()=>{
  const provider=new ClaudeProvider({clientFactory:()=>new Fake(c=>{c.emit('message',{type:'assistant',error:'authentication_failed'});result(c);})});await assert.rejects(provider.run(runArgs()),/authentication_failed/);
});
test('Claude quota stays unknown when an event gives status but no utilization',async()=>{
  const provider=new ClaudeProvider({clientFactory:()=>new Fake(c=>{c.emit('message',{type:'rate_limit_event',rate_limit_info:{rateLimitType:'seven_day',status:'allowed'}});result(c);})});await provider.run(runArgs());assert.equal((await provider.quota()).windows[0].remainingPercent,null);
});
test('observed Claude usage ages independently from polling and expired windows lose their current percentage',async()=>{
  let now=Date.parse('2026-10-03T00:00:00Z');const observedAt=new Date(now).toISOString();const cache=new ProviderUsageCache({claude:async()=>({windows:[{id:'five_hour',remainingPercent:75,resetAt:new Date(now-1).toISOString()}],observedAt,available:true})},()=>now);
  const result=await cache.get();assert.equal(result.providers.claude.stale,true);assert.equal(result.providers.claude.windows[0].remainingPercent,null);assert.equal(result.providers.claude.windows[0].reportedRemainingPercent,75);assert.equal(result.providers.claude.observedAt,observedAt);
});
test('Claude refuses a runtime that does not confirm permission hooks',async()=>{
  const c=new Fake();c.initialize=async()=>({models:[model]});const p=new ClaudeProvider({clientFactory:()=>c});await assert.rejects(p.run(runArgs()),/permission hooks/);assert.equal(c.closed,true);
});
test('Claude cancellation escalates against tool descendants after direct CLI exits', {skip:process.platform==='win32'}, async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-claude-kill-'));let client,pid;
  const alive=id=>{try{process.kill(id,0);return true;}catch{return false;}};
  try{
    const fixture=path.join(root,'fixture');fs.writeFileSync(fixture,`#!${process.execPath}\nconst {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'],{stdio:['ignore','ignore','ignore']});setTimeout(()=>console.log(JSON.stringify({type:'fixture_ready',pid:c.pid})),150);setInterval(()=>{},1000);\n`,{mode:0o700});
    client=new ClaudeRPC({command:fixture});const [ready]=await once(client,'message');pid=ready.pid;assert.equal(alive(pid),true);await client.close();
    for(let n=0;n<30&&alive(pid);n++)await new Promise(r=>setTimeout(r,20));assert.equal(alive(pid),false);
  }finally{await client?.close();if(pid&&alive(pid))process.kill(pid,'SIGKILL');fs.rmSync(root,{recursive:true,force:true});}
});
test('fresh account API percentages remain authoritative when reset timestamps are already past',async()=>{
  const now=Date.parse('2026-10-03T18:00:00Z');const cache=new ProviderUsageCache({copilot:async()=>({quotaSnapshots:{premium_interactions:{remainingPercentage:87,resetDate:'2026-10-03T17:59:59Z'}}})},()=>now);
  const result=await cache.get();assert.equal(result.providers.copilot.windows[0].remainingPercent,87);assert.equal(result.providers.copilot.stale,false);assert.equal(result.providers.copilot.windows[0].resetAt,'2026-11-01T00:00:00.000Z');assert.equal(result.providers.copilot.windows[0].resetSource,'expected-monthly');assert.equal(result.providers.copilot.windows[0].reportedResetAt,'2026-10-03T17:59:59.000Z');
});
const signalError=code=>Object.assign(new Error(code),{code});
test('Claude TERM permission denial falls back only to the owned child and confirms exit',async()=>{
  const sent=[];let gone=false;const child={pid:43210,exitCode:null,signalCode:null,kill(signal){sent.push(signal);gone=true;this.signalCode=signal;return true;}};
  await stopClaudeProcess(child,{graceMs:5,pollMs:1,platform:'darwin',signalGroup(pid,signal){assert.equal(pid,-child.pid);if(gone)throw signalError('ESRCH');throw signalError('EPERM');}});
  assert.deepEqual(sent,['SIGTERM']);
});
test('Claude delayed KILL denial rejects safely after bounded direct-child fallback',async()=>{
  const signals=[],direct=[];const child={pid:43211,exitCode:null,signalCode:null,kill(signal){direct.push(signal);throw signalError('EPERM');}};
  await assert.rejects(stopClaudeProcess(child,{graceMs:5,pollMs:1,platform:'darwin',signalGroup(pid,signal){signals.push(signal);if(signal==='SIGKILL')throw signalError('EPERM');}}),/could not confirm termination.*EPERM/);
  assert.ok(signals.includes('SIGTERM'));assert.ok(signals.includes('SIGKILL'));assert.deepEqual(direct,['SIGKILL']);
});
test('Claude group probe permission denial is not mistaken for an exited process',async()=>{
  const child={pid:43212,exitCode:0,signalCode:null,kill(){assert.fail('Already exited child must not be signalled');}};
  await assert.rejects(stopClaudeProcess(child,{graceMs:2,pollMs:1,platform:'darwin',signalGroup(){throw signalError('EPERM');}}),/could not confirm termination.*EPERM/);
});
test('Claude concurrent close is idempotent',async()=>{
  const client=Object.create(ClaudeRPC.prototype);client.child={pid:undefined};const a=client.close(),b=client.close();assert.equal(a,b);await Promise.all([a,b]);
});
test('Claude failed capability cleanup reports an error and blocks fresh process until cleanup recovers',async()=>{
  let creates=0,denied=true;const c=new Fake();c.close=async()=>{if(denied)throw new Error('cleanup EPERM');};const provider=new ClaudeProvider({clientFactory:()=>{creates++;return c;}});
  assert.match((await provider.status()).error,/cleanup EPERM/);assert.equal((await provider.status()).available,false);assert.equal(creates,1);
  denied=false;assert.equal((await provider.status()).available,true);assert.equal(creates,2);
});
test('Claude abort catches failed cleanup, removes listeners and blocks another turn',async()=>{
  const c=new Fake();c.close=async()=>{throw new Error('cleanup EPERM');};const provider=new ClaudeProvider({clientFactory:()=>c});const a=runArgs(),controller=new AbortController();a.signal=controller.signal;
  const pending=provider.run(a);await new Promise(r=>setImmediate(r));controller.abort();await assert.rejects(pending,/cleanup EPERM/);
  assert.equal(c.listenerCount('message'),0);await assert.rejects(provider.run(runArgs()),/cleanup EPERM/);
});
test('Claude recognizes authenticated profile-only initialization without exposing account identity',async()=>{
  assert.equal(claudeAccountAvailable({subscriptionType:'Claude Pro',apiProvider:'firstParty'}),true);
  assert.equal(claudeAccountAvailable({tokenSource:'none',apiProvider:'firstParty'}),false);
  const c=new Fake();c.initialize=async()=>({models:[model],account:{email:'synthetic@example.invalid',organization:'synthetic',subscriptionType:'Claude Pro',apiProvider:'firstParty'}});
  const p=new ClaudeProvider({clientFactory:()=>c});const s=await p.status();assert.equal(s.available,true);assert.equal(s.models.length,1);assert.equal(JSON.stringify(s).includes('synthetic@example.invalid'),false);
});

test('Claude structured usage uses 0–100 percentages and never exposes session or attribution data',()=>{
  const q=claudeQuota({rate_limits_available:true,subscription_type:'max',session:{model_usage:{private:123}},behaviors:{skills:['private-skill']},rate_limits:{five_hour:{utilization:0.25,resets_at:null},seven_day:{utilization:20,resets_at:'2026-10-05T19:00:00Z'},seven_day_sonnet:null,model_scoped:[{display_name:'Provider model bucket',utilization:50,resets_at:null}],extra_usage:{is_enabled:false,utilization:100}}});
  assert.equal(q.windows[0].remainingPercent,99.75);assert.equal(q.windows[1].remainingPercent,80);assert.equal(q.windows[2].remainingPercent,50);assert.equal(q.windows.length,3);
  assert.equal(JSON.stringify(q).includes('private'),false);assert.equal('subscription_type' in q,false);assert.equal('observedAt' in q,false);
  assert.equal(claudeQuota({rate_limits_available:true,rate_limits:{five_hour:{utilization:null,resets_at:'invalid'}}}).windows[0].remainingPercent,null);
  assert.equal(claudeQuota({rate_limits_available:true,rate_limits:{five_hour:{utilization:-1}}}).windows[0].remainingPercent,null);
  assert.equal(claudeQuota({rate_limits_available:false,rate_limits:null}).available,false);
});
test('Claude fresh quota coalesces, is bounded, sends no user turn and closes only its probe',async()=>{
  let count=0,initTimeout,requestTimeout,requestPayload,args;const probe=new Fake();probe.initialize=async(hooks,timeout)=>{initTimeout=timeout;};probe.request=async(payload,timeout)=>{requestPayload=payload;requestTimeout=timeout;await new Promise(r=>setImmediate(r));return {rate_limits_available:true,rate_limits:{five_hour:{utilization:10}}};};probe.write=()=>assert.fail('Usage must not run a model turn');
  const p=new ClaudeProvider({quotaTimeoutMs:100,clientFactory:options=>{count++;args=options.args;return probe;}});const active=new Fake();p.active=active;
  const [a,b]=await Promise.all([p.quota(),p.quota()]);assert.equal(count,1);assert.equal(a.windows[0].remainingPercent,90);assert.deepEqual(a,b);assert.deepEqual(requestPayload,{subtype:'get_usage'});assert.ok(initTimeout<=100&&requestTimeout<=100);assert.ok(args.includes('--no-session-persistence'));assert.equal(probe.closed,true);assert.equal(active.closed,undefined);
});
test('Claude unavailable structured quota does not reuse a previous account event',async()=>{
  const c=new Fake();c.request=async()=>({rate_limits_available:false,rate_limits:null});const p=new ClaudeProvider({clientFactory:()=>c});p.rateLimits=new Map([['five_hour',{id:'five_hour',remainingPercent:80}]]);assert.equal((await p.quota()).available,false);
});
test('Claude quota cleanup denial blocks repeated process creation',async()=>{
  let count=0;const c=new Fake();c.request=async()=>({rate_limits_available:true,rate_limits:{five_hour:{utilization:10}}});c.close=async()=>{throw new Error('cleanup EPERM');};const p=new ClaudeProvider({clientFactory:()=>{count++;return c;}});
  assert.equal((await p.quota()).available,false);assert.match((await p.quota()).error,/cleanup EPERM/);assert.equal(count,1);
});
test('Claude provider shutdown closes an in-flight quota probe',async()=>{
  const probe=new Fake();let reject;probe.initialize=()=>new Promise((_,r)=>{reject=r;});probe.close=async()=>{probe.closed=true;reject?.(new Error('Closed'));};const p=new ClaudeProvider({clientFactory:()=>probe});const pending=p.quota();await p.close();await pending;assert.equal(probe.closed,true);assert.equal(p.quotaClient,null);
});

test('Claude steering drains interruption and requires matching replay acknowledgment without losing the next result',async()=>{
 let client,inputs=0;const p=new ClaudeProvider({clientFactory:()=>{client=new Fake(c=>{inputs++;if(inputs===1)c.emit('message',{type:'system',session_id:'native-test'});else c.emit('message',{...c.userMessage,session_id:'native-test'});});client.request=async r=>{assert.equal(r.subtype,'interrupt');result(client);return {};};return client;}});
 const args=runArgs(),task=p.run(args);for(let i=0;i<100&&!inputs;i++)await new Promise(r=>setTimeout(r,2));
 const steer=p.steer(args.run,'Synthetic correction');await steer;assert.equal(inputs,2);assert.equal(client.closed,undefined);assert.equal(client.userMessage.message.content,'Synthetic correction');assert.ok(client.userMessage.uuid);
 result(client);await task;assert.equal(client.closed,true);assert.equal(args.run.usage.inputTokens,20);await assert.rejects(p.steer(args.run,'Too late'),/ended/);
});

test('Claude steering timeout is an explicit unconfirmed failure, never success or automatic resend',async()=>{
 let client,inputs=0;const p=new ClaudeProvider({steerTimeoutMs:25,clientFactory:()=>{client=new Fake(()=>{inputs++;});client.request=async()=>{result(client);return {};};return client;}});
 const args=runArgs(),task=p.run(args);task.catch(()=>{});for(let i=0;i<100&&!inputs;i++)await new Promise(r=>setTimeout(r,2));
 await assert.rejects(p.steer(args.run,'Unacknowledged correction'),/unconfirmed/);await assert.rejects(task,/unconfirmed/);assert.equal(inputs,2);assert.equal(client.closed,true);
});
