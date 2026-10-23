import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {Engine} from '../src/engine.js';
import {PermissionStore} from '../src/services/settings/permissions.js';
import {CodexProvider,codexSandbox,codexSandboxPreservesAccess} from '../src/providers/codex.js';

class PreviewRPC extends EventEmitter {
 constructor(){super();this.calls=[];this.responses=[];this.turns=0;}
 async initialize(){return this;}
 async request(method,params){
  this.calls.push({method,params});
  if(method==='model/list')return {data:[{id:'synthetic-model',model:'synthetic-model',supportedReasoningEfforts:[]}]};
  if(method==='config/read')return {config:{},layers:[]};
  if(method==='thread/start'||method==='thread/resume')return {thread:{id:'synthetic-thread'},cwd:params.cwd,approvalPolicy:params.approvalPolicy,approvalsReviewer:params.approvalsReviewer,runtimeWorkspaceRoots:params.runtimeWorkspaceRoots,sandbox:params.sandbox==='workspace-write'?{type:'workspaceWrite',writableRoots:params.config.sandbox_workspace_write.writable_roots,networkAccess:false,excludeTmpdirEnvVar:true,excludeSlashTmp:true}:{type:'readOnly'}};
  if(method==='turn/start')return {turn:{id:'turn-'+(++this.turns)}};
  if(method==='turn/interrupt'){queueMicrotask(()=>this.notice('turn/completed',{turn:{status:'interrupted'}}));return {};}
  return {};
 }
 respond(id,result){this.responses.push({id,result});}
 write(value){this.responses.push(value);}
 notice(method,params){this.emit('notification',{method,params:{threadId:'synthetic-thread',...params}});}
 async close(){this.emit('closed',new Error('Synthetic runtime closed.'));}
}
const until=async predicate=>{for(let i=0;i<400;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,5));}throw new Error('Synthetic transition timed out.');};
function fixture(t,{preview=true}={}){
 const home=fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-preview-permission-'))),cwd=path.join(home,'work'),extra=path.join(home,'extra'),other=path.join(home,'other');
 for(const folder of [cwd,extra,other])fs.mkdirSync(folder);
 const rpc=new PreviewRPC(),provider=new CodexProvider({desktopPreview:preview,clientFactory:()=>rpc});
 const engine=new Engine(path.join(home,'app'),{codex:provider},undefined,{desktopPreview:preview});
 t.after(async()=>{await engine.close();fs.rmSync(home,{recursive:true,force:true});});
 const schedule={schemaVersion:1,id:'synthetic-permission-transition',name:'Synthetic approval review',enabled:false,cron:'0 0 * * *',timezone:'UTC',provider:'codex',model:'synthetic-model',workspace:{cwd,additionalDirectories:[]},context:{workspaceId:'synthetic-workspace',entries:[],includeDefaults:false},misfire:'skip',prompt:'Synthetic permission test; no native command executes.'};
 const interrupts=()=>rpc.calls.filter(call=>call.method==='turn/interrupt').length;
 const finish=async run=>{rpc.notice('turn/completed',{turn:{status:'completed'}});await until(()=>run.status==='completed'&&!engine.running.size);};
 const fileRequest=async(run,file,id=1)=>{rpc.notice('item/started',{item:{id:'file-'+id,type:'fileChange',changes:[{path:file}]}});rpc.emit('request',{id,method:'item/fileChange/requestApproval',params:{threadId:'synthetic-thread',itemId:'file-'+id}});await until(()=>run.pending?.type==='permission');};
 return {home,cwd,extra,other,rpc,provider,engine,schedule,interrupts,finish,fileRequest};
}

test('preview sandbox comparator permits only canonical additions and rejects reductions, mixed changes and unknown policy',t=>{
 const f=fixture(t),s=f.schedule,ask={mode:'ask',folders:[],chatFolders:[]};
 const original=codexSandbox(s,ask),readAdded=codexSandbox(s,{...ask,chatFolders:[{path:f.extra,access:'read'}]});
 assert.equal(codexSandboxPreservesAccess(original,readAdded),true);
 assert.equal(codexSandboxPreservesAccess(readAdded,original),false);
 const trusted={mode:'trusted',readOnlyTools:true,folders:[{path:f.cwd,access:'read-write'}],chatFolders:[]},write=codexSandbox(s,trusted);
 assert.equal(codexSandboxPreservesAccess(original,write),true);assert.equal(codexSandboxPreservesAccess(write,original),false);
 const added={...trusted,folders:[...trusted.folders,{path:f.extra,access:'read-write'}],chatFolders:[{path:f.extra,access:'read-write'}]},writeAdded=codexSandbox(s,added);
 assert.equal(codexSandboxPreservesAccess(write,writeAdded),true);
 const mixed=codexSandbox(s,{...trusted,folders:[...trusted.folders,{path:f.other,access:'read-write'}],chatFolders:[{path:f.other,access:'read-write'}]});
 assert.equal(codexSandboxPreservesAccess(writeAdded,mixed),false);
 assert.equal(codexSandboxPreservesAccess(readAdded,write),false,'read-to-write change must also retain old runtime roots');
 const broader=codexSandbox(s,{...trusted,folders:[{path:f.home,access:'read-write'}],chatFolders:[{path:f.home,access:'read-write'}]});
 assert.equal(codexSandboxPreservesAccess(writeAdded,broader),true,'a canonical ancestor covers previous roots');
 for(const alter of [value=>value.policy.networkAccess=true,value=>value.cwd=f.other,value=>value.policy.futurePolicy=true,value=>value.runtimeWorkspaceRoots.push(path.join(f.home,'missing')),value=>value.config.sandbox_workspace_write.exclude_slash_tmp=false]){const bad=structuredClone(write);alter(bad);assert.equal(codexSandboxPreservesAccess(original,bad),false);}
 fs.rmdirSync(f.extra);fs.symlinkSync(f.other,f.extra);assert.equal(codexSandboxPreservesAccess(readAdded,readAdded),false,'retargeted symlink cannot preserve a captured bound');
});

test('preview Trust workspace approves pending edit without interrupt or replay, adopting broader sandbox on explicit continuation',async t=>{
 const f=fixture(t),run=f.engine.createRun(f.schedule,'chat');await until(()=>f.rpc.turns===1);
 await f.fileRequest(run,path.join(f.cwd,'sample.txt'));f.engine.reply(run.id,'trust-workspace',run.pending.id);
 await until(()=>f.rpc.responses.some(response=>response.id===1));
 assert.equal(f.rpc.responses.find(response=>response.id===1).result.decision,'accept');assert.equal(f.interrupts(),0);assert.equal(run.status,'running');assert.equal(f.rpc.turns,1);
 assert.equal(f.rpc.calls.find(call=>call.method==='turn/start').params.sandboxPolicy.type,'readOnly');
 await f.finish(run);f.engine.resume(run.id,'Continue synthetic review');await until(()=>f.rpc.turns===2);
 assert.ok(f.rpc.calls.some(call=>call.method==='thread/resume'&&call.params.threadId==='synthetic-thread'));
 assert.equal(f.rpc.calls.findLast(call=>call.method==='turn/start').params.sandboxPolicy.type,'workspaceWrite');await f.finish(run);
});

test('preview chat folder addition preserves pending approval, but removal from an effective runtime interrupts',async t=>{
 const f=fixture(t),run=f.engine.createRun(f.schedule,'chat');await until(()=>f.rpc.turns===1);
 await f.fileRequest(run,path.join(f.extra,'sample.txt'));f.engine.reply(run.id,'trust-folder-chat',run.pending.id);
 await until(()=>f.rpc.responses.some(response=>response.id===1));assert.equal(f.interrupts(),0);assert.equal(run.status,'running');
 assert.deepEqual(f.rpc.calls.find(call=>call.method==='turn/start').params.runtimeWorkspaceRoots,[f.cwd]);
 await f.finish(run);f.engine.resume(run.id,'Continue with selected folder');await until(()=>f.rpc.turns===2);
 assert.ok(f.rpc.calls.findLast(call=>call.method==='turn/start').params.runtimeWorkspaceRoots.includes(f.extra));
 f.engine.setChatFolder(run.id,f.extra,'read-write',true,f.engine.describePermissions(run).id,run.chatPermissionRevision);
 await until(()=>run.status==='failed'&&!f.engine.running.size);assert.equal(f.interrupts(),1);assert.match(run.events.at(-1).text,/Choose Continue/);assert.equal(f.rpc.turns,2);
});

test('preview Use workspace setting interrupts actual write reduction and never accepts an obsolete pending edit',async t=>{
 const f=fixture(t);f.engine.permissions.setMode(f.schedule,'trusted');f.engine.permissions.setMode(f.schedule,'ask');
 const run=f.engine.createRun(f.schedule,'chat',null,{deferStart:true});
 f.engine.setChatPermission(run.id,'autopilot',f.engine.describePermissions(run).id,null);f.engine.startDeferredRun(run.id);await until(()=>f.rpc.turns===1);
 // A native sandbox-bypass request remains pending even in broad approval mode.
 f.rpc.emit('request',{id:2,method:'item/commandExecution/requestApproval',params:{threadId:'synthetic-thread',itemId:'protected',command:'synthetic command',additionalPermissions:{fileSystem:{write:[f.extra]}}}});
 await until(()=>run.pending?.type==='permission');f.engine.setChatPermission(run.id,'inherit',f.engine.describePermissions(run).id,run.chatPermissionRevision,run.pending.id);
 await until(()=>run.status==='failed'&&!f.engine.running.size);assert.equal(f.interrupts(),1);assert.equal(f.rpc.turns,1);assert.equal(run.providerSessionId,'synthetic-thread');
 assert.equal(f.rpc.responses.some(response=>response.id===2&&response.result?.decision==='accept'),false);
 assert.match(run.events.at(-1).text,/No actions were automatically retried/);
});

test('preview Always allow preserves inherited trust and rules; normal store and adapter behavior are unchanged',async t=>{
 const f=fixture(t),defaults={mode:'trusted',readOnlyTools:true,folders:[{path:f.cwd,access:'read-write'}],rules:[{kind:'shell',command:'existing synthetic command'}]};
 f.engine.permissions.workspaceDefaults=()=>defaults;
 const run=f.engine.createRun(f.schedule,'chat');await until(()=>f.rpc.turns===1);
 f.rpc.emit('request',{id:3,method:'item/commandExecution/requestApproval',params:{threadId:'synthetic-thread',itemId:'new-command',command:'new synthetic command'}});
 await until(()=>run.pending?.type==='permission');f.engine.reply(run.id,'always-tool',run.pending.id);await until(()=>f.rpc.responses.some(response=>response.id===3));
 const profile=f.engine.describePermissions(run);assert.equal(profile.mode,'trusted');assert.deepEqual(profile.folders,defaults.folders);assert.equal(profile.rules.length,2);assert.equal(f.interrupts(),0);await f.finish(run);
 const normal=new PermissionStore(path.join(f.home,'normal'));normal.workspaceDefaults=()=>defaults;normal.remember(f.schedule,{kind:'shell',fullCommandText:'new synthetic command'},'always-tool');assert.equal(normal.describe(f.schedule).mode,'custom');assert.deepEqual(normal.describe(f.schedule).folders,[]);
});

test('non-preview Codex retains the original interruption behavior for a trust increase',async t=>{
 const f=fixture(t,{preview:false}),run=f.engine.createRun(f.schedule,'chat');await until(()=>f.rpc.turns===1);
 await f.fileRequest(run,path.join(f.cwd,'sample.txt'));f.engine.reply(run.id,'trust-workspace',run.pending.id);
 await until(()=>run.status==='failed'&&!f.engine.running.size);assert.equal(f.interrupts(),1);assert.match(run.events.at(-1).text,/Workspace permissions changed during/);
});

test('preview mixed permission change rejects an obsolete approval even when its new saved rule allows the request',async t=>{
 const f=fixture(t);f.engine.permissions.setMode(f.schedule,'trusted');
 const run=f.engine.createRun(f.schedule,'chat');await until(()=>f.rpc.turns===1);
 await f.fileRequest(run,path.join(f.extra,'sample.txt'),4);
 f.engine.permissions.mutate(run.schedule,profile=>{profile.mode='custom';profile.readOnlyTools=false;profile.folders=[{path:f.extra,access:'read-write'}];});
 f.engine.recheckPermissions();
 await until(()=>run.status==='failed'&&!f.engine.running.size);await until(()=>f.rpc.responses.some(response=>response.id===4));
 assert.equal(f.interrupts(),1);assert.equal(f.rpc.responses.some(response=>response.id===4&&response.result?.decision==='accept'),false);
 assert.match(f.rpc.responses.find(response=>response.id===4).error.message,/Permissions changed/);
 assert.equal(f.engine.permissions.decide(run.schedule,{kind:'write',fileName:path.join(f.extra,'sample.txt')}).allowed,true,'host permission changed, but obsolete native turn must not continue');
 assert.equal(f.rpc.turns,1);
});

test('preview chat modes pause and restore saved scopes independently of read-only tools',async t=>{
 const f=fixture(t),run=f.engine.createRun(f.schedule,'chat',null,{deferStart:true});
 f.engine.permissions.workspaceDefaults=()=>({mode:'custom',readOnlyTools:true,folders:[{path:f.cwd,access:'read-write'}],rules:[{kind:'shell',command:'workspace command'}]});
 const setMode=mode=>f.engine.setChatPermission(run.id,mode,f.engine.describePermissions(run).id,run.chatPermissionRevision||null);
 f.engine.setChatFolder(run.id,f.extra,'read',false,f.engine.describePermissions(run).id,null);
 f.engine.setChatReadOnly(run.id,false,f.engine.describePermissions(run).id,run.chatPermissionRevision);
 run.chatPermission.rules=[{kind:'shell',command:'chat command'}];f.engine.persist(run);
 const saved=structuredClone(run.chatPermission);
 for(const mode of ['ask','autopilot','custom','inherit']){
  const current=setMode(mode);assert.equal(current.chatMode,mode);assert.equal(current.chatReadOnlyTools,false);assert.equal(current.workspaceReadOnlyTools,true);
  assert.deepEqual(current.chatFolders,saved.folders);assert.deepEqual(current.chatRules,saved.rules);assert.equal(current.workspaceRules.length,1);
  assert.equal(f.engine.decidePermission(run,{kind:'shell',fullCommandText:'chat command'}).allowed,mode!=='ask');
  assert.equal(f.engine.decidePermission(run,{kind:'write',fileName:path.join(f.cwd,'synthetic')}).allowed,mode!=='ask');
  assert.equal(current.readOnlyTools,false);
 }
 const before=run.chatPermissionRevision;
 assert.throws(()=>f.engine.setChatReadOnly(run.id,true,'stale',before),/changed/);
 assert.throws(()=>f.engine.setChatReadOnly(run.id,true,f.engine.describePermissions(run).id,'stale'),/changed/);
 assert.throws(()=>f.engine.setChatReadOnly(run.id,true,f.engine.describePermissions(run).id,before,'stale-request'),/request changed/);
 assert.equal(run.chatPermissionRevision,before);
 f.engine.setChatReadOnly(run.id,null,f.engine.describePermissions(run).id,before);assert.equal(f.engine.describePermissions(run).readOnlyTools,true);
 setMode('ask');assert.equal(f.engine.describePermissions(run).readOnlyTools,false);assert.equal(f.engine.describePermissions(run).workspaceReadOnlyTools,true);
 setMode('custom');assert.equal(f.engine.describePermissions(run).readOnlyTools,true);
});

test('preview read-only settings save independently, permit only observational tools and never grant file writes',async t=>{
 const f=fixture(t),run=f.engine.createRun(f.schedule,'chat',null,{deferStart:true});
 f.engine.permissions.mutate(f.schedule,profile=>Object.assign(profile,{mode:'custom',readOnlyTools:false,folders:[],rules:[]}));
 f.engine.permissions.configureWorkspace('synthetic-workspace',{mode:'custom',readOnlyTools:true,folders:[],rules:[]});
 assert.equal(f.engine.describePermissions(run).workspaceReadOnlyTools,true);
 for(const action of ['list','snapshot'])assert.equal(f.engine.decidePermission(run,{kind:'custom-tool',toolName:'proteus_browser',args:{action}}).allowed,true);
 for(const action of ['open','navigate','scroll','close','click'])assert.equal(f.engine.decidePermission(run,{kind:'custom-tool',toolName:'proteus_browser',args:{action}}).allowed,false);
 assert.equal(f.engine.decidePermission(run,{kind:'mcp',serverName:'synthetic',toolName:'read',readOnly:true}).allowed,true);
 assert.equal(f.engine.decidePermission(run,{kind:'write',fileName:path.join(f.cwd,'synthetic')}).allowed,false);
 assert.equal(codexSandbox(f.schedule,f.engine.describePermissions(run),{desktopPreview:true}).sandbox,'read-only');
 f.engine.permissions.configureWorkspace('synthetic-workspace',{mode:'ask',readOnlyTools:true,folders:[],rules:[]});
 assert.equal(f.engine.describePermissions(run).readOnlyTools,false);assert.equal(f.engine.describePermissions(run).workspaceReadOnlyTools,true);
 const normal=fixture(t,{preview:false}),normalRun=normal.engine.createRun(normal.schedule,'chat',null,{deferStart:true});
 for(const mode of ['ask','custom'])assert.throws(()=>normal.engine.setChatPermission(normalRun.id,mode,normal.engine.describePermissions(normalRun).id,null),/Choose/);
 assert.throws(()=>normal.engine.setChatReadOnly(normalRun.id,true,normal.engine.describePermissions(normalRun).id,null),/permission controls/);
 assert.equal(normal.engine.permissions.choices(normal.schedule,{kind:'shell',fullCommandText:'synthetic'}).some(choice=>choice.value==='always-tool-chat'),false);
});

test('preview native Saved sandbox requires canonical cwd write grant, excludes read-only roots and never widens temp or network',t=>{
 const f=fixture(t),sub=path.join(f.cwd,'sub');fs.mkdirSync(sub);
 const sandbox=folders=>codexSandbox(f.schedule,{mode:'custom',folders},{desktopPreview:true});
 assert.equal(sandbox([{path:sub,access:'read-write'}]).sandbox,'read-only','a granted subfolder cannot make its cwd parent writable');
 assert.equal(sandbox([{path:f.cwd,access:'read'}]).sandbox,'read-only');
 const folders=[{path:f.cwd,access:'read-write'},{path:f.extra,access:'read-write'},{path:f.other,access:'read'}];
 const saved=sandbox(folders);assert.equal(saved.sandbox,'workspace-write');assert.deepEqual(saved.policy.writableRoots,[f.cwd,f.extra].sort());assert.equal(saved.policy.networkAccess,false);assert.equal(saved.policy.excludeTmpdirEnvVar,true);assert.equal(saved.policy.excludeSlashTmp,true);
 assert.equal(codexSandbox(f.schedule,{mode:'custom',folders}).sandbox,'read-only','production still holds custom sandbox changes');
 const alias=path.join(f.home,'alias');fs.symlinkSync(f.cwd,alias);
 assert.equal(sandbox([{path:alias,access:'read-write'}]).sandbox,'read-only','stored noncanonical alias is not a native grant');
});

test('preview allow once and remembered command scopes remain distinct across repeats, restart, sibling chats and changed context',async t=>{
 for(const answer of ['approve','always-tool-chat','always-tool']){
  const f=fixture(t),run=f.engine.createRun(f.schedule,'chat');await until(()=>f.rpc.turns===1);
  const request={kind:'shell',fullCommandText:'synthetic repeated command'};
  const command=id=>f.rpc.emit('request',{id,method:'item/commandExecution/requestApproval',params:{threadId:'synthetic-thread',itemId:'command-'+id,command:request.fullCommandText}});
  command(20);await until(()=>run.pending?.type==='permission');assert.ok(run.pending.permissionChoices.some(choice=>choice.value==='always-tool-chat'));
  f.engine.reply(run.id,answer,run.pending.id);await until(()=>f.rpc.responses.some(response=>response.id===20));assert.equal(f.interrupts(),0);
  command(21);
  if(answer==='approve'){await until(()=>run.pending);f.engine.reply(run.id,'approve',run.pending.id);}
  await until(()=>f.rpc.responses.some(response=>response.id===21));
  assert.equal(run.events.filter(event=>event.data?.permission?.automatic).length,answer==='approve'?0:1);
  const expectedSource=answer==='always-tool-chat'?'chat':'workspace';
  if(answer!=='approve')assert.equal(run.events.find(event=>event.data?.permission?.automatic).data.permission.source,expectedSource);
  await f.finish(run);
  const sibling=f.engine.createRun(f.schedule,'chat',null,{deferStart:true});
  assert.equal(f.engine.decidePermission(sibling,request).allowed,answer==='always-tool');
  const restored=new Engine(path.join(f.home,'app'),{},undefined,{desktopPreview:true});
  assert.equal(restored.decidePermission(restored.getRun(run.id),request).allowed,answer!=='approve');
  assert.equal(restored.decidePermission(restored.getRun(sibling.id),request).allowed,answer==='always-tool');
  const changed=restored.getRun(run.id);changed.schedule={...changed.schedule,provider:'other'};restored.persist(changed);
  assert.equal(changed.chatPermission??null,null);assert.equal(restored.decidePermission(changed,request).allowed,false);await restored.close();
 }
});

test('preview protected requests cannot remember chat rules and stale permission context cannot persist a grant',async t=>{
 const f=fixture(t),run=f.engine.createRun(f.schedule,'chat');await until(()=>f.rpc.turns===1);
 for(const protection of [{managedApprovalRequired:true},{requestSandboxBypass:true}])assert.deepEqual(f.engine.permissions.choices(f.schedule,{kind:'shell',fullCommandText:'synthetic',...protection}),[]);
 f.rpc.emit('request',{id:30,method:'item/commandExecution/requestApproval',params:{threadId:'synthetic-thread',itemId:'protected',command:'synthetic',additionalPermissions:{fileSystem:{write:[f.extra]}}}});
 await until(()=>run.pending);assert.throws(()=>f.engine.reply(run.id,'always-tool-chat',run.pending.id),/scope changed/);assert.equal(run.chatPermission,undefined);
 f.engine.reply(run.id,'deny',run.pending.id);await until(()=>f.rpc.responses.some(response=>response.id===30));
 f.rpc.emit('request',{id:31,method:'item/commandExecution/requestApproval',params:{threadId:'synthetic-thread',itemId:'normal',command:'synthetic'}});await until(()=>run.pending);
 run.schedule.workspace.additionalDirectories=[f.extra];assert.throws(()=>f.engine.reply(run.id,'always-tool-chat',run.pending.id),/scope changed/);assert.equal(run.chatPermission,undefined);
 run.schedule.workspace.additionalDirectories=[];f.engine.reply(run.id,'deny',run.pending.id);await until(()=>f.rpc.responses.some(response=>response.id===31));await f.finish(run);
});

test('preview Saved cwd grant added during approval keeps the running sandbox fixed and applies on explicit continuation',async t=>{
 const f=fixture(t),run=f.engine.createRun(f.schedule,'chat');await until(()=>f.rpc.turns===1);
 await f.fileRequest(run,path.join(f.cwd,'saved-sample.txt'),40);f.engine.reply(run.id,'trust-folder-chat',run.pending.id);await until(()=>f.rpc.responses.some(response=>response.id===40));
 assert.equal(f.interrupts(),0);assert.equal(f.rpc.turns,1);assert.equal(f.rpc.calls.findLast(call=>call.method==='turn/start').params.sandboxPolicy.type,'readOnly');
 await f.finish(run);f.engine.resume(run.id,'Explicit continuation');await until(()=>f.rpc.turns===2);
 assert.equal(f.rpc.calls.findLast(call=>call.method==='turn/start').params.sandboxPolicy.type,'workspaceWrite');
 f.engine.setChatPermission(run.id,'ask',f.engine.describePermissions(run).id,run.chatPermissionRevision);
 await until(()=>run.status==='failed'&&!f.engine.running.size);assert.equal(f.interrupts(),1);assert.equal(f.rpc.turns,2);assert.match(run.events.at(-1).text,/No actions were automatically retried/);
});

test('preview chat rule removal checks revision and pending identity and preserves inherited rules and other chat grants',async t=>{
 const f=fixture(t),run=f.engine.createRun(f.schedule,'chat');await until(()=>f.rpc.turns===1);
 f.rpc.emit('request',{id:50,method:'item/commandExecution/requestApproval',params:{threadId:'synthetic-thread',itemId:'remember',command:'remembered synthetic'}});
 await until(()=>run.pending);f.engine.reply(run.id,'always-tool-chat',run.pending.id);await until(()=>f.rpc.responses.some(response=>response.id===50));await f.finish(run);
 const profile=f.engine.describePermissions(run),ruleId=profile.chatRuleIds[0];
 f.engine.permissions.workspaceDefaults=()=>({mode:'custom',folders:[{path:f.cwd,access:'read'}],rules:[{kind:'shell',command:'inherited synthetic'}],readOnlyTools:true});
 for(const args of [[ruleId,'wrong',profile.chatRevision],[ruleId,profile.id,'wrong'],[ruleId,profile.id,profile.chatRevision,'wrong']])assert.throws(()=>f.engine.revokeChatRule(run.id,...args),/changed/);
 const result=f.engine.revokeChatRule(run.id,ruleId,profile.id,profile.chatRevision);assert.deepEqual(result.chatRules,[]);assert.equal(result.workspaceRules.length,1);assert.equal(result.workspaceReadOnlyTools,true);assert.equal(result.folders.length,1);
 assert.equal(f.engine.decidePermission(run,{kind:'shell',fullCommandText:'remembered synthetic'}).allowed,false);
 assert.equal(f.engine.decidePermission(run,{kind:'shell',fullCommandText:'inherited synthetic'}).allowed,true);
 assert.throws(()=>f.engine.revokeChatRule(run.id,ruleId,result.id,result.chatRevision),/no longer exists/);
});

test('preview permission HTTP saves independent read-only defaults, downgrades and removes only reviewed default folders',async t=>{
 const {seedDesktopPreview}=await import('../src/desktop-preview.js'),{startServer}=await import('../src/server.js');
 const root=fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-preview-permission-api-'))),home=path.join(root,'app'),cwd=path.join(root,'work'),extra=path.join(root,'extra');fs.mkdirSync(cwd);fs.mkdirSync(extra);
 seedDesktopPreview({home,workFolders:[{name:'Synthetic workspace',path:cwd}],sourceFolders:[]});
 const app=await startServer({home,port:0,timers:false,desktopPreview:true,providers:{rehearsal:{async run(){}}}});
 t.after(async()=>{await app.close();fs.rmSync(root,{recursive:true,force:true});});app.engine.drain=async()=>{};
 const workspace=app.context.config().workspaces[0],run=app.engine.createRun({schemaVersion:1,id:'preview-http-permission',name:'Synthetic permission API',enabled:false,cron:'0 0 * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd,additionalDirectories:[]},context:{workspaceId:workspace.id,entries:[],includeDefaults:false},misfire:'skip',prompt:'Synthetic fixture'},'chat',null,{deferStart:true});
 const post=async(route,value)=>{const response=await fetch(app.origin+route,{method:'POST',headers:{authorization:'Bearer '+app.token,'content-type':'application/json'},body:JSON.stringify(value)});return {status:response.status,data:await response.json()};};
 const save=approvals=>post('/api/context',{action:'save-workspace',workspaceId:workspace.id,expectedRevision:app.context.config().revision,configuration:{approvals}});
 let saved=await save({mode:'custom',readOnlyTools:true,folders:[{path:cwd,access:'read-write'}],rules:[]});assert.equal(saved.status,200,JSON.stringify(saved.data));
 app.engine.permissions.mutate(run.schedule,profile=>profile.folders.push({path:extra,access:'read-write'}));
 assert.equal(app.engine.describePermissions(run).readOnlyTools,true);
 saved=await save({mode:'custom',readOnlyTools:false,folders:[{path:cwd,access:'read'}],rules:[]});assert.equal(saved.status,200);
 let profile=app.engine.describePermissions(run);assert.equal(profile.readOnlyTools,false);assert.deepEqual(profile.workspaceFolders.find(folder=>folder.path===cwd),{path:cwd,access:'read'});assert.ok(profile.workspaceFolders.some(folder=>folder.path===extra));
 saved=await save({mode:'custom',readOnlyTools:true,folders:[],rules:[]});assert.equal(saved.status,200);profile=app.engine.describePermissions(run);assert.deepEqual(profile.workspaceFolders,[{path:extra,access:'read-write'}]);
 let response=await post('/api/permissions',{action:'set-chat-read-only',runId:run.id,enabled:false,expectedContextId:profile.id,expectedChatRevision:profile.chatRevision});assert.equal(response.status,200);profile=response.data.permissionContext;assert.equal(profile.chatReadOnlyTools,false);assert.equal(profile.workspaceReadOnlyTools,true);
 response=await post('/api/permissions',{action:'set-chat-mode',runId:run.id,mode:'ask',expectedContextId:profile.id,expectedChatRevision:profile.chatRevision});assert.equal(response.status,200);profile=response.data.permissionContext;assert.equal(profile.mode,'ask');assert.equal(profile.readOnlyTools,false);
 response=await post('/api/permissions',{action:'set-chat-read-only',runId:run.id,enabled:null,expectedContextId:profile.id,expectedChatRevision:profile.chatRevision});assert.equal(response.status,200);profile=response.data.permissionContext;assert.equal(profile.chatReadOnlyTools,null);assert.equal(profile.readOnlyTools,false);
 response=await post('/api/permissions',{action:'set-chat-mode',runId:run.id,mode:'custom',expectedContextId:profile.id,expectedChatRevision:profile.chatRevision});assert.equal(response.status,200);profile=response.data.permissionContext;assert.equal(profile.readOnlyTools,true);
 response=await post('/api/permissions',{action:'set-chat-read-only',runId:run.id,enabled:false,expectedContextId:profile.id,expectedChatRevision:'stale'});assert.equal(response.status,400);assert.equal(app.engine.describePermissions(run).readOnlyTools,true);
});
