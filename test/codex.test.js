import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PermissionStore} from '../src/permissions.js';
import {CodexProvider,codexModel,codexSandbox,verifyCodexSandbox} from '../src/codex.js';
class RPC extends EventEmitter {
 constructor(){super();this.calls=[];this.closed=false;this.turn=0;this.responses=[];}
 async initialize(){this.initialized=true;return this;}
 async request(method,params){this.calls.push({method,params});if(method==='model/list')return {data:[{id:'runtime-model',model:'runtime-model',displayName:'Runtime model',supportedReasoningEfforts:[{reasoningEffort:'future'}],serviceTiers:[{id:'priority',name:'Fast'}]}]};if(method==='config/read')return {config:{plugins:{unselected:{enabled:true}}},layers:[{config:{mcp_servers:{unselected:{command:'do-not-start'}}}}]};if(method==='thread/start'||method==='thread/resume')return {thread:{id:'thread',path:'/synthetic/session.jsonl'},cwd:params.cwd,approvalPolicy:params.approvalPolicy,approvalsReviewer:params.approvalsReviewer,runtimeWorkspaceRoots:params.runtimeWorkspaceRoots,sandbox:params.sandbox==='workspace-write'?{type:'workspaceWrite',writableRoots:params.config.sandbox_workspace_write.writable_roots,networkAccess:false,excludeTmpdirEnvVar:true,excludeSlashTmp:true}:{type:'readOnly'}};if(method==='turn/start'){this.turn++;return {turn:{id:'turn-'+this.turn}};}if(method==='turn/interrupt'){queueMicrotask(()=>this.emit('notification',{method:'turn/completed',params:{threadId:'thread',turn:{status:'interrupted'}}}));return {};}return {};}
 respond(id,result){this.responses.push({id,result});}
 write(){}
 close(){this.closed=true;this.emit('closed',new Error('Closed'));}
 notice(method,params){this.emit('notification',{method,params:{threadId:'thread',...params}});}
}
const fixture=()=>{const rpc=new RPC();const context={providerContext:()=>({instructionText:'selected context',customAgents:[],disabledLegacyMcp:[],disabledSkills:[],mcpServers:{}})};const provider=new CodexProvider({clientFactory:()=>rpc},{context});const run={id:'run',schedule:{provider:'codex',model:'runtime-model',reasoningEffort:'future',serviceTier:'priority',workspace:{cwd:'/synthetic/work',additionalDirectories:['/synthetic/other']},context:{entries:[],includeDefaults:false}},events:[]};const controller=new AbortController();const args={run,prompt:'Hello',signal:controller.signal,emit:(role,text,data)=>run.events.push({role,text,data}),stream:(id,text)=>{run.liveMessages??={};run.liveMessages[id]=(run.liveMessages[id]||'')+text;},update:()=>{},ask:async()=>'approve'};return {rpc,provider,run,controller,args};};
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw new Error('Timed out');};
test('Codex preserves provider metadata and explicitly marks unknown context capacity',()=>{const m=codexModel({id:'m',supportedReasoningEfforts:[{reasoningEffort:'future'}],serviceTiers:[{id:'priority',name:'Fast'}]});assert.equal(m.controls.contextTiers[0].promptTokens,null);assert.deepEqual(m.controls.reasoningEfforts,['future']);assert.equal(m.controls.serviceTiers[0].name,'Fast');});
test('Codex maps selected context, approvals, streamed tools, completion, steering and continuation',async()=>{const f=fixture();try{const task=f.provider.run(f.args);await until(()=>f.rpc.calls.some(c=>c.method==='turn/start'));const start=f.rpc.calls.find(c=>c.method==='thread/start').params;assert.equal(start.config.mcp_servers.unselected.enabled,false);assert.equal(start.config.plugins.unselected.enabled,false);assert.equal(start.config.project_doc_max_bytes,0);assert.deepEqual(start.runtimeWorkspaceRoots,['/synthetic/work','/synthetic/other']);assert.match(start.developerInstructions,/selected context/);assert.equal(start.approvalPolicy,'untrusted');assert.equal(f.rpc.calls.find(c=>c.method==='turn/start').params.serviceTier,'priority');await f.provider.steer(f.run,'Adjustment');assert.equal(f.rpc.calls.at(-1).params.expectedTurnId,'turn-1');f.rpc.notice('item/started',{item:{id:'cmd',type:'commandExecution',command:'git status',cwd:'/synthetic/work'}});f.rpc.notice('item/commandExecution/outputDelta',{itemId:'cmd',delta:'worktree clean'});f.rpc.notice('item/completed',{item:{id:'cmd',type:'commandExecution',command:'git status',exitCode:0,aggregatedOutput:'worktree clean',status:'completed'}});f.rpc.notice('item/agentMessage/delta',{itemId:'msg',delta:'Summary'});f.rpc.notice('item/completed',{item:{id:'msg',type:'agentMessage',text:'Summary',phase:'final_answer'}});f.rpc.notice('turn/completed',{turn:{status:'completed'}});await task;assert.equal(f.run.events.find(e=>e.data?.tool).data.tool.output,'worktree clean');assert.equal(f.run.events.at(-1).data.phase,'final_answer');assert.equal(f.provider.active,null);f.run.schedule.serviceTier='';f.run.schedule.reasoningEffort='';const second=f.provider.run(f.args);await until(()=>f.rpc.turn===2);assert.ok(f.rpc.calls.some(c=>c.method==='thread/resume'&&c.params.threadId==='thread'));assert.equal(f.rpc.calls.findLast(c=>c.method==='turn/start').params.serviceTier,null);f.rpc.notice('turn/completed',{turn:{status:'completed'}});await second;}finally{await f.provider.close();}});
test('Codex sends only synthetic image inputs through private turn-scoped files and cleans up',async()=>{
 const f=fixture(),bytes=Buffer.from('synthetic-image-fixture');try{
  assert.deepEqual(f.provider.acceptedMediaTypes,['image/png','image/jpeg','image/gif','image/webp','text/plain']);
  const task=f.provider.run({...f.args,attachments:[{bytes,name:'Fixture.png',mediaType:'image/png'}]});await until(()=>f.rpc.calls.some(c=>c.method==='turn/start'));
  const input=f.rpc.calls.find(c=>c.method==='turn/start').params.input;assert.equal(input[0].type,'text');assert.equal(input[1].type,'localImage');assert.deepEqual(fs.readFileSync(input[1].path),bytes);assert.equal(fs.statSync(input[1].path).mode&0o777,0o600);
  f.rpc.notice('turn/completed',{turn:{status:'completed'}});await task;assert.equal(fs.existsSync(input[1].path),false);
  const textTurn=f.provider.run({...f.args,attachments:[{bytes:Buffer.from('Synthetic note only'),name:'Fixture.txt',mediaType:'text/plain'}]});await until(()=>f.rpc.turn===2);assert.deepEqual(f.rpc.calls.findLast(c=>c.method==='turn/start').params.input,[{type:'text',text:'Hello'},{type:'text',text:'Attached plain text file: Fixture.txt\n\nSynthetic note only'}]);f.rpc.notice('turn/completed',{turn:{status:'completed'}});await textTurn;
  await assert.rejects(f.provider.run({...f.args,attachments:[{bytes,name:'Fixture.pdf',mediaType:'application/pdf'}]}),/can receive images/);
 }finally{await f.provider.close();}
});
test('Codex waits for native interruption and refuses unenforceable agent scopes before a turn',async()=>{const f=fixture();try{const task=f.provider.run(f.args);await until(()=>f.rpc.turn===1);f.controller.abort();await assert.rejects(task,/interrupted/);assert.ok(f.rpc.calls.some(c=>c.method==='turn/interrupt'));assert.equal(f.provider.active,null);f.provider.context.providerContext=()=>({customAgents:[{displayName:'Restricted',tools:['read']} ]});await assert.rejects(f.provider.run({...f.args,signal:new AbortController().signal}),/cannot yet enforce/);assert.equal(f.rpc.turn,1);}finally{await f.provider.close();}});
test('Codex missing executable fails promptly and close does not wait for an impossible exit', async()=>{
 const {CodexRPC}=await import('../src/codex.js');const client=new CodexRPC({command:'/nonexistent/proteus-codex-fixture'});
 await assert.rejects(client.initialize(),/ENOENT/);await client.close();
});

function sandboxFixture(){
 const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-codex-policy-'))),cwd=path.join(home,'cwd'),extra=path.join(home,'extra'),outside=path.join(home,'outside');for(const root of [cwd,extra,outside])fs.mkdirSync(root);
 const f=fixture();f.run.schedule.workspace={cwd,additionalDirectories:[extra]};const store=new PermissionStore(home);f.args.permissionProfile=()=>store.describe(f.run.schedule);return {...f,home,cwd,extra,outside,store,dispose:async()=>{await f.provider.close();fs.rmSync(home,{recursive:true,force:true});}};
}
test('Codex Ask and Custom remain read-only; Trusted uses only canonical granted workspace roots',async()=>{
 const f=sandboxFixture();try{
  for(const mode of ['ask','custom']){f.store.setMode(f.run.schedule,mode);assert.equal(codexSandbox(f.run.schedule,f.store.describe(f.run.schedule)).sandbox,'read-only');}
  f.store.setMode(f.run.schedule,'trusted');const profile=f.store.describe(f.run.schedule),policy=codexSandbox(f.run.schedule,profile);
  assert.deepEqual(policy.runtimeWorkspaceRoots,[f.cwd,f.extra].sort());assert.equal(policy.policy.networkAccess,false);assert.equal(policy.policy.excludeTmpdirEnvVar,true);assert.equal(policy.policy.excludeSlashTmp,true);
  assert.equal(f.store.decide(f.run.schedule,{kind:'shell',fullCommandText:'python3 helper.py'}).allowed,false,'Trusted folder writes do not auto-approve Python');
  profile.folders=profile.folders.filter(folder=>folder.path!==f.extra);assert.deepEqual(codexSandbox(f.run.schedule,profile).runtimeWorkspaceRoots,[f.cwd]);
  profile.folders=[];assert.equal(codexSandbox(f.run.schedule,profile).sandbox,'read-only','cwd cannot become implicitly writable without its grant');
  const oldProfile=f.store.describe(f.run.schedule);fs.rmdirSync(f.extra);fs.symlinkSync(f.outside,f.extra);assert.deepEqual(codexSandbox(f.run.schedule,oldProfile).runtimeWorkspaceRoots,[f.cwd],'retargeted symlink does not transfer trust');assert.equal(codexSandbox(f.run.schedule,f.store.describe(f.run.schedule)).sandbox,'read-only','changed context no longer matches the old saved permission profile');
 }finally{await f.dispose();}
});
test('Codex validates resolved runtime policy and refuses extra roots, network, temp writes or different reviewer',async()=>{
 const f=sandboxFixture();try{f.store.setMode(f.run.schedule,'trusted');const expected=codexSandbox(f.run.schedule,f.store.describe(f.run.schedule));const good={cwd:f.cwd,approvalPolicy:'untrusted',approvalsReviewer:'user',runtimeWorkspaceRoots:expected.runtimeWorkspaceRoots,sandbox:{...expected.policy,writableRoots:[f.extra]}};
 assert.doesNotThrow(()=>verifyCodexSandbox(good,expected,f.cwd));
 for(const alter of [v=>v.sandbox.writableRoots.push(f.outside),v=>v.sandbox.networkAccess=true,v=>v.sandbox.excludeSlashTmp=false,v=>v.sandbox.excludeTmpdirEnvVar=false,v=>v.approvalPolicy='never',v=>v.approvalsReviewer='auto_review',v=>v.runtimeWorkspaceRoots.push(f.outside),v=>v.sandbox.type='dangerFullAccess']){const value=structuredClone(good);alter(value);assert.throws(()=>verifyCodexSandbox(value,expected,f.cwd),/did not confirm/);}
 }finally{await f.dispose();}
});
test('Codex threads and continuation enforce exact trusted policy, retain protected approval gates, and stop on revocation',async()=>{
 const f=sandboxFixture();try{f.store.setMode(f.run.schedule,'trusted');const requests=[];f.args.ask=async request=>{requests.push(request);return f.store.decide(f.run.schedule,request.details).allowed?'approve-auto':'decline';};
 const first=f.provider.run(f.args);await until(()=>f.rpc.turn===1);const start=f.rpc.calls.find(c=>c.method==='thread/start').params;assert.equal(start.sandbox,'workspace-write');assert.equal(start.approvalPolicy,'untrusted');assert.deepEqual(f.rpc.calls.find(c=>c.method==='turn/start').params.sandboxPolicy.writableRoots,[f.cwd,f.extra].sort());
 for(const [id,extra] of [[1,{}],[2,{additionalPermissions:{fileSystem:{write:[f.outside]}}}],[3,{networkApprovalContext:{host:'example.test'}}]]){f.rpc.emit('request',{id,method:'item/commandExecution/requestApproval',params:{threadId:'thread',itemId:'command-'+id,command:'python3 helper.py',...extra}});await until(()=>f.rpc.responses.some(r=>r.id===id));assert.equal(f.rpc.responses.find(r=>r.id===id).result.decision,'decline');}
 assert.equal(requests[1].details.requestSandboxBypass,true);assert.equal(requests[2].details.managedApprovalRequired,true);
 f.rpc.notice('turn/completed',{turn:{status:'completed'}});await first;
 const second=f.provider.run(f.args);await until(()=>f.rpc.turn===2);assert.equal(f.rpc.calls.findLast(c=>c.method==='thread/resume').params.sandbox,'workspace-write');
 f.store.revoke(f.store.describe(f.run.schedule).id,f.store.get().revision);f.provider.recheckPermissions();await assert.rejects(second,/permissions changed/);assert.equal(f.rpc.closed,false,'wait for native interruption instead of killing the runtime before its tools can stop');assert.ok(f.rpc.calls.some(c=>c.method==='turn/interrupt'));
 }finally{await f.dispose();}
});
test('Codex existing Autopilot never auto-approves sandbox expansion or managed network requests',async()=>{
 const f=sandboxFixture();try{f.store.setMode(f.run.schedule,'autopilot');for(const request of [{kind:'shell',fullCommandText:'python3 helper.py',requestSandboxBypass:true},{kind:'shell',fullCommandText:'curl example.test',managedApprovalRequired:true}])assert.equal(f.store.decide(f.run.schedule,request).allowed,false);
 f.store.setMode(f.run.schedule,'custom');assert.equal(codexSandbox(f.run.schedule,f.store.describe(f.run.schedule)).sandbox,'read-only','retained folder rules alone do not opt Custom into workspace-write');
 }finally{await f.dispose();}
});

test('Codex document tool remains available on resumed chats and enforces approval',async()=>{
 const f=fixture();let opened=0;f.provider.browser={openDocument:async()=>{opened++;return {opened:true};}};
 f.args.ask=async()=> 'deny';
 try{for(let turn=1;turn<=2;turn++){
  const task=f.provider.run(f.args);await until(()=>f.rpc.turn===turn);
  const params=f.rpc.calls.findLast(c=>c.method=== (turn===1?'thread/start':'thread/resume')).params;
  const config=params.config.mcp_servers.proteus_app,env=config.env;
  assert.equal(config.enabled,true);assert.match(params.developerInstructions,/proteus_open_document/);
  const response=await fetch(env.PROTEUS_DOCUMENT_ENDPOINT,{method:'POST',headers:{authorization:env.PROTEUS_DOCUMENT_CAPABILITY},body:JSON.stringify({action:'open',arguments:{path:'/synthetic/doc.md'}})});
  assert.equal(response.status,400);assert.equal(opened,0);
  f.rpc.notice('turn/completed',{turn:{status:'completed'}});await task;
  await assert.rejects(fetch(env.PROTEUS_DOCUMENT_ENDPOINT));
 }}finally{await f.provider.close();}
});

test('chat-only folder grants reach Codex roots without granting the original cwd under Ask',async()=>{
 const f=sandboxFixture();try{
  const read={...f.store.describe(f.run.schedule),mode:'custom',chatFolders:[{path:f.outside,access:'read'}],folders:[{path:f.outside,access:'read'}]};
  const limited=codexSandbox(f.run.schedule,read);assert.equal(limited.sandbox,'read-only');assert.ok(limited.runtimeWorkspaceRoots.includes(f.outside));
  f.store.setMode(f.run.schedule,'trusted');const trusted=f.store.describe(f.run.schedule);trusted.chatFolders=[{path:f.outside,access:'read-write'}];trusted.folders.push(...trusted.chatFolders);
  assert.ok(codexSandbox(f.run.schedule,trusted).policy.writableRoots.includes(f.outside));
  trusted.chatFolders=[];trusted.folders=trusted.folders.filter(g=>g.path!==f.outside);assert.ok(!codexSandbox(f.run.schedule,trusted).policy.writableRoots.includes(f.outside));
 }finally{await f.dispose();}
});

test('Codex records its isolated provider session home without changing the process environment',async()=>{
 const f=fixture(),original=process.env.CODEX_HOME;f.provider.options.env={...process.env,CODEX_HOME:'/synthetic/private-preview/codex'};
 try{const task=f.provider.run(f.args);await until(()=>f.rpc.turn===1);assert.equal(f.run.providerHome,'/synthetic/private-preview/codex');assert.equal(process.env.CODEX_HOME,original);f.rpc.notice('turn/completed',{turn:{status:'completed'}});await task;}finally{await f.provider.close();}
});

test('resumed Codex chats receive current browser/tab schemas through a turn-bound approval-checked MCP catalog',async()=>{
 const f=fixture();const calls=[],approvals=[];let answer='decline';
 f.provider.browser={agent:async(args,id)=>{calls.push({args,id});return {id:'synthetic-tab',loaded:false,hidden:true};},manageTabs:async args=>{calls.push({args});return {tabs:[]};}};
 f.args.ask=async request=>{approvals.push(request);return answer;};
 const bridge=async(env,value)=>{const response=await fetch(env.PROTEUS_DOCUMENT_ENDPOINT,{method:'POST',headers:{authorization:env.PROTEUS_DOCUMENT_CAPABILITY},body:JSON.stringify(value)});return {status:response.status,value:await response.json()};};
 try{
  const first=f.provider.run(f.args);await until(()=>f.rpc.turn===1);const start=f.rpc.calls.find(c=>c.method==='thread/start').params;
  assert.ok(start.dynamicTools.some(t=>t.name==='proteus_browser'));f.rpc.notice('turn/completed',{turn:{status:'completed'}});await first;
  // Simulate resuming an old saved thread: the provider does not accept dynamicTools on resume.
  const second=f.provider.run(f.args);await until(()=>f.rpc.turn===2);const resume=f.rpc.calls.findLast(c=>c.method==='thread/resume').params;
  assert.equal(resume.dynamicTools,undefined);assert.match(resume.developerInstructions,/fresh tools published by the proteus_app MCP server/);
  const env=resume.config.mcp_servers.proteus_app.env;const listed=await bridge(env,{action:'list'});assert.equal(listed.status,200);
  const browser=listed.value.find(t=>t.name==='proteus_browser'),tabs=listed.value.find(t=>t.name==='proteus_tabs');assert.ok(browser&&tabs);assert.ok(browser.inputSchema.properties.action.enum.includes('load'));assert.equal(browser.inputSchema.properties.hidden.type,'boolean');assert.equal(browser.inputSchema.properties.unloaded.type,'boolean');assert.match(browser.description,/no per-tab sharing/);
  const args={action:'open',url:'https://fixture.invalid',hidden:true,unloaded:true,profileId:'fixture'};
  const denied=await bridge(env,{action:'call',name:'proteus_browser',arguments:args});assert.equal(denied.value.resultType,'failure');assert.equal(calls.length,0);
  answer='approve';const opened=await bridge(env,{action:'call',name:'proteus_browser',arguments:args});assert.equal(opened.status,200);assert.deepEqual(calls,[{args,id:'run'}]);assert.equal(approvals.at(-1).details.toolName,'proteus_browser');assert.equal(approvals.at(-1).details.kind,'custom-tool');
  f.rpc.notice('turn/completed',{turn:{status:'completed'}});await second;await assert.rejects(bridge(env,{action:'list'}));
  const third=f.provider.run(f.args);await until(()=>f.rpc.turn===3);const next=f.rpc.calls.findLast(c=>c.method==='thread/resume').params.config.mcp_servers.proteus_app.env;assert.notEqual(next.PROTEUS_DOCUMENT_CAPABILITY,env.PROTEUS_DOCUMENT_CAPABILITY);assert.ok((await bridge(next,{action:'list'})).value.some(t=>t.name==='proteus_tabs'));f.rpc.notice('turn/completed',{turn:{status:'completed'}});await third;
 }finally{await f.provider.close();}
});
test('resumed browser approval cannot perform an action after its turn ends',async()=>{
 const f=fixture();let approve,calls=0;f.run.providerSessionId='thread';f.provider.browser={agent:async()=>{calls++;return {};}};f.args.ask=()=>new Promise(resolve=>{approve=resolve;});
 try{
  const task=f.provider.run(f.args);await until(()=>f.rpc.turn===1);const env=f.rpc.calls.find(c=>c.method==='thread/resume').params.config.mcp_servers.proteus_app.env;
  const pending=fetch(env.PROTEUS_DOCUMENT_ENDPOINT,{method:'POST',headers:{authorization:env.PROTEUS_DOCUMENT_CAPABILITY},body:JSON.stringify({action:'call',name:'proteus_browser',arguments:{action:'close',tabId:'fixture'}})});pending.catch(()=>{});await until(()=>approve);
  f.rpc.notice('turn/completed',{turn:{status:'completed'}});await task;approve('approve');await new Promise(resolve=>setTimeout(resolve,10));assert.equal(calls,0);await assert.rejects(pending);
 }finally{await f.provider.close();}
});
