import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PermissionStore, permissionContext } from '../src/permissions.js';
import { Engine } from '../src/engine.js';
import { startServer } from '../src/server.js';

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-permissions-'));
const schedule = cwd => ({ schemaVersion:1,id:'permissions',name:'Permissions fixture',enabled:false,cron:'0 9 * * 1-5',timezone:'America/Denver',provider:'copilot',model:'fixture',workspace:{cwd,additionalDirectories:[]},prompt:'Fixture',misfire:'skip' });
const until = async predicate => { for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw new Error('Condition timed out.'); };

test('manual permission decisions preserve the recorded tool reference and original request',async()=>{
 const home=temp();const engine=new Engine(home,{copilot:{run:async({ask})=>{await ask({type:'permission',details:{kind:'shell',toolCallId:'manual-call',fullCommandText:'synthetic validation'}});}}});
 try{const run=engine.createRun(schedule(home));await until(()=>run.pending?.type==='permission');engine.reply(run.id,'deny',run.pending.id);await until(()=>run.status==='completed');const decision=run.events.find(event=>event.data?.permission)?.data.permission;assert.equal(decision.toolCallId,'manual-call');assert.equal(decision.automatic,false);assert.equal(decision.decision,'deny');assert.match(decision.request,/manual-call/);assert.equal(run.events.some(event=>event.data?.tool?.status==='completed'),false,'a permission decision cannot certify successful tool execution');}
 finally{await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});

test('folder trust survives restart and covers new files, not sibling or symlink escapes', () => {
  const home=temp();const root=path.join(home,'repo');const outside=path.join(home,'repo-other');fs.mkdirSync(root);fs.mkdirSync(outside);
  try {
    const store=new PermissionStore(home);const s=schedule(root);
    assert.equal(store.decide(s,{kind:'read',path:root}).allowed,false);
    store.setMode(s,'trusted');const restored=new PermissionStore(home);
    assert.equal(restored.decide(s,{kind:'write',fileName:path.join(root,'new/sub/file.md')}).allowed,true);
    assert.equal(restored.decide(s,{kind:'read',path:outside}).allowed,false);
    fs.symlinkSync(outside,path.join(root,'escape'));
    assert.equal(restored.decide(s,{kind:'write',fileName:path.join(root,'escape/new.md')}).allowed,false);
    fs.symlinkSync(path.join(outside,'missing'),path.join(root,'dangling'));
    assert.equal(restored.decide(s,{kind:'read',path:path.join(root,'dangling')}).allowed,false);
    assert.equal(restored.decide(s,{kind:'write',fileName:path.join(root,'ok'),managedApprovalRequired:true}).allowed,false);
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});
test('saved operations are exact commands and action-scoped MCP rules', () => {
  const home=temp();try {
    const store=new PermissionStore(home);const s=schedule(home);
    const query={kind:'mcp',serverName:'tracker',toolName:'items',readOnly:false,args:{action:'get',id:1}};
    store.remember(s,query,'always-tool');
    assert.equal(store.describe(s).mode, 'custom');
    assert.equal(store.decide(s,{kind:'mcp',serverName:'other',toolName:'unrelated',readOnly:true}).allowed,false);
    assert.equal(store.decide(s,{...query,args:{action:'get',id:2}}).allowed,true);
    assert.equal(store.decide(s,{...query,args:{action:'delete',id:1}}).allowed,false);
    const shell={kind:'shell',fullCommandText:'npm test'};store.remember(s,shell,'always-tool');
    assert.equal(store.decide(s,shell).allowed,true);
    assert.equal(store.decide(s,{...shell,fullCommandText:'npm test; rm result'}).allowed,false);
    assert.equal(store.decide(s,{...query,managedApprovalRequired:true}).allowed,false);
    assert.throws(()=>store.remember(s,{...query,managedApprovalRequired:true},'always-tool'),/not available/);
    const before=store.get();store.revoke(permissionContext(s).id,before.revision);
    assert.equal(store.decide(s,query).allowed,false);
    assert.throws(()=>store.setMode(s,'trusted',before.revision),/changed outside/);
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});

test('permission API changes resolve an already waiting tool in the same active chat', async () => {
  const home = temp(); const answers = [];
  const app = await startServer({ home, port: 0, timers: false, providers: { copilot: { run: async ({ ask }) => {
    answers.push(await ask({ type: 'permission', details: { kind: 'custom-tool', toolName: 'proteus_browser', args: { action: 'snapshot' } } }));
    answers.push(await ask({ type: 'permission', details: { kind: 'read', path: home } }));
    answers.push(await ask({ type: 'question', question: 'A real decision' }));
  } } } });
  try {
    const run = app.engine.createRun(schedule(home)); await until(() => run.pending?.type === 'permission');
    const context = app.engine.permissions.describe(run.schedule);
    const response = await fetch(app.origin + '/api/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${app.token}` }, body: JSON.stringify({ action: 'set-mode', runId: run.id, mode: 'trusted', expectedContextId: context.id, expectedRevision: app.engine.permissions.get().revision }) });
    assert.equal(response.status, 200);
    await until(() => run.pending?.type === 'question');
    assert.deepEqual(answers, ['approve-auto', 'approve-auto']);
    assert.equal(app.engine.getRun(run.id).pending.question, 'A real decision');
    app.engine.reply(run.id, 'Reviewed decision', run.pending.id); await until(() => run.status === 'completed');
    assert.deepEqual(run.events.filter(e => e.role === 'user').map(e => e.text), ['Fixture', 'Reviewed decision']);
  } finally { await app.close(); fs.rmSync(home, { recursive: true, force: true }); }
});

test('legacy partial trusted labels become saved rules without gaining any permissions', () => {
  const home = temp(); try {
    const store = new PermissionStore(home); const s = schedule(home);
    store.remember(s, { kind: 'read', path: home }, 'trust-folder');
    const saved = JSON.parse(fs.readFileSync(store.file)); saved.workspaces[0].mode = 'trusted';
    fs.writeFileSync(store.file, JSON.stringify(saved));
    assert.equal(store.describe(s).mode, 'custom');
    assert.equal(store.decide(s, { kind: 'read', path: home }).allowed, true);
    assert.equal(store.decide(s, { kind: 'write', fileName: path.join(home, 'new') }).allowed, false);
    assert.equal(store.decide(s, { kind: 'custom-tool', toolName: 'proteus_browser', args: { action: 'snapshot' } }).allowed, false);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});
test('trust is invalidated by new roots, providers, MCP configuration, or skill directories', () => {
  const home=temp();fs.mkdirSync(path.join(home,'other'));try {
    const store=new PermissionStore(home);const s=schedule(home);store.setMode(s,'autopilot');const request={kind:'shell',fullCommandText:'node task.js'};
    assert.equal(store.decide(s,request).allowed,true);
    for(const changed of [{...s,provider:'other'},{...s,workspace:{cwd:home,additionalDirectories:[path.join(home,'other')]}},{...s,mcpServers:{newServer:{command:'new'}}},{...s,skillDirectories:[path.join(home,'other')]}]) assert.equal(store.decide(changed,request).allowed,false);
    assert.equal(store.decide({...s,name:'Renamed',prompt:'New prompt'},request).allowed,true);
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});
test('auto-approval respects managed requests, sandbox escape, unknown kinds, and direct file boundaries', () => {
  const home=temp();try {
    const store=new PermissionStore(home);const s=schedule(home);store.setMode(s,'autopilot');
    for(const kind of ['shell','mcp','url','custom-tool']) assert.equal(store.decide(s,{kind}).allowed,true);
    assert.equal(store.decide(s,{kind:'new-tool-kind'}).allowed,false);
    assert.equal(store.decide(s,{kind:'shell',managedApprovalRequired:true}).allowed,false);
    assert.equal(store.decide(s,{kind:'shell',requestSandboxBypass:true}).allowed,false);
    assert.equal(store.decide(s,{kind:'read',path:'/outside-fixture'}).allowed,false);
    assert.deepEqual(store.choices(s,{kind:'shell',managedApprovalRequired:true}),[]);
    store.setMode(s,'trusted');
    assert.equal(store.decide(s,{kind:'mcp',readOnly:true}).allowed,true);
    assert.equal(store.decide(s,{kind:'mcp',readOnly:false}).allowed,false);
    assert.equal(store.decide(s,{kind:'custom-tool',toolName:'proteus_browser',args:{action:'snapshot'}}).allowed,true);
    assert.equal(store.decide(s,{kind:'custom-tool',toolName:'proteus_browser',args:{action:'click'}}).allowed,false);
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});
test('trusting a workspace clears subsequent queued permissions and persists across new scheduled runs', async () => {
  const home=temp();const answers=[];const provider={run:async({ask})=>answers.push(...await Promise.all(['one','two','three'].map(name=>ask({type:'permission',details:{kind:'write',fileName:path.join(home,name)}}))))};
  let engine=new Engine(home,{copilot:provider});try {
    let run=engine.createRun(schedule(home));await until(()=>run.pending);
    engine.reply(run.id,'trust-workspace',run.pending.id);await until(()=>run.status==='completed');
    assert.deepEqual(answers,['approve','approve-auto','approve-auto']);assert.equal(run.automaticApprovals,2);
    await engine.close();engine=new Engine(home,{copilot:provider});run=engine.createRun(schedule(home),'scheduled');await until(()=>run.status==='completed');assert.equal(run.automaticApprovals,3);
    engine.permissions.setMode(schedule(home),'ask');run=engine.createRun(schedule(home));await until(()=>run.pending);
    assert.throws(()=>engine.reply(run.id,'approve-auto',run.pending.id),/Permission scope changed/);
  } finally {await engine.close();await until(()=>!engine.running.size);fs.rmSync(home,{recursive:true,force:true});}
});
test('automatic approval records stable call, canonical target and matched trusted root without raw arguments',async()=>{
  const home=temp();const engine=new Engine(home,{copilot:{async run(){}}});
  try{
    const s=schedule(home);engine.permissions.setMode(s,'trusted');const target=path.join(home,'notes.md');
    const decision=engine.permissions.decide(s,{kind:'read',path:target,toolCallId:'call-123',args:{password:'must-not-serialize'}});
    assert.equal(decision.allowed,true);assert.equal(decision.resolvedTarget,path.join(fs.realpathSync(home),'notes.md'));assert.equal(decision.matchedRoot,fs.realpathSync(home));
    const run=engine.createRun(s,'chat',null,{deferStart:true});
    engine.recordAutomaticPermission(run,{kind:'read',toolCallId:'call-123',path:target,args:{password:'must-not-serialize'}},decision);
    const permission=run.events.at(-1).data.permission;
    assert.equal(permission.toolCallId,'call-123');assert.equal(permission.resolvedTarget,path.join(fs.realpathSync(home),'notes.md'));assert.equal(permission.matchedRoot,fs.realpathSync(home));
    assert.doesNotMatch(JSON.stringify(permission),/must-not-serialize/);
    engine.discardDeferredRun(run.id);
  }finally{await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});
test('changing permission mode resolves a waiting request but never answers a real question', async () => {
  const home=temp();const replies=[];const provider={run:async({ask})=>{
    replies.push(await ask({type:'permission',details:{kind:'shell',fullCommandText:'test command'}}));
    replies.push(await ask({type:'question',question:'Which result should be kept?'}));
  }};const engine=new Engine(home,{copilot:provider});try {
    const run=engine.createRun(schedule(home));await until(()=>run.pending?.type==='permission');
    engine.permissions.setMode(run.schedule,'autopilot');engine.recheckPermissions();await until(()=>run.pending?.type==='question');
    engine.recheckPermissions();assert.equal(run.status,'awaiting_input');engine.reply(run.id,'Keep the reviewed result',run.pending.id);await until(()=>run.status==='completed');
    assert.deepEqual(replies,['approve-auto','Keep the reviewed result']);
  } finally {await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});
test('permission API enforces authentication, revision checks, scope selection, and revocation', async () => {
  const home=temp();const app=await startServer({home,port:0,timers:false,providers:{copilot:{run:async()=>{}}}});const headers={'Content-Type':'application/json',Authorization:`Bearer ${app.token}`};
  const post=body=>fetch(app.origin+'/api/permissions',{method:'POST',headers,body:JSON.stringify(body)});
  try {
    assert.equal((await fetch(app.origin+'/api/permissions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
    let state=await (await fetch(app.origin+'/api/state',{headers})).json();assert.ok(state.permissionWorkspaces.length);
    const expectedContextId=app.engine.permissions.describe(app.engine.schedules.get('workspace-pulse')).id;
    assert.equal((await post({action:'set-mode',scheduleId:'workspace-pulse',mode:'autopilot',expectedContextId:'stale-context',expectedRevision:state.permissions.revision})).status,400);
    const result=await post({action:'set-mode',scheduleId:'workspace-pulse',mode:'autopilot',expectedContextId,expectedRevision:state.permissions.revision});assert.equal(result.status,200);
    assert.equal((await post({action:'set-mode',scheduleId:'workspace-pulse',mode:'ask',expectedContextId,expectedRevision:state.permissions.revision})).status,400);
    assert.equal((await post({action:'set-mode',workspace:{cwd:'/ignored'},mode:'autopilot'})).status,400);
    const chat=app.engine.createRun(schedule(home),'chat',null,{deferStart:true});
    const chatContext=app.engine.permissions.describe(chat.schedule).id;
    const workspaceRevision=app.engine.permissions.get().revision;
    assert.equal((await post({action:'set-chat-mode',runId:chat.id,mode:'autopilot',expectedContextId:chatContext,expectedChatRevision:null,expectedRequestId:'stale-request'})).status,400);
    const chatGrant=await post({action:'set-chat-mode',runId:chat.id,mode:'autopilot',expectedContextId:chatContext,expectedChatRevision:null});
    assert.equal(chatGrant.status,200);
    const granted=await chatGrant.json();assert.equal(granted.permissionContext.source,'chat');
    assert.equal(app.engine.permissions.get().revision,workspaceRevision);
    assert.equal((await post({action:'set-chat-mode',runId:chat.id,mode:'inherit',expectedContextId:chatContext,expectedChatRevision:null})).status,400);
    const revoked=await post({action:'set-chat-mode',runId:chat.id,mode:'inherit',expectedContextId:chatContext,expectedChatRevision:granted.permissionContext.chatRevision});
    assert.equal(revoked.status,200);assert.equal((await revoked.json()).permissionContext.source,'workspace');
    state=await (await fetch(app.origin+'/api/state',{headers})).json();const profile=state.permissions.workspaces[0];
    assert.equal((await post({action:'revoke',id:profile.id,expectedRevision:state.permissions.revision})).status,200);
    assert.equal(app.engine.permissions.get().workspaces.length,0);
  } finally {await app.close();fs.rmSync(home,{recursive:true,force:true});}
});

test('scheduled conversation approval requires its current request and cannot grant the next scheduled run',async()=>{
 const home=temp(),engine=new Engine(home,{copilot:{run:async()=>{}}});
 try{const spec=schedule(home),before=structuredClone(spec),run=engine.createRun(spec,'scheduled',null,{deferStart:true}),context=engine.describePermissions(run);
 assert.throws(()=>engine.setChatPermission(run.id,'autopilot',context.id,null),/current waiting permission/);
 run.status='awaiting_input';run.pending={id:'current-permission',type:'permission',details:{kind:'read',path:path.join(home,'request.txt')}};
 assert.throws(()=>engine.setChatPermission(run.id,'autopilot',context.id,null,'stale-request'),/current waiting permission/);
 assert.throws(()=>engine.setChatPermission(run.id,'autopilot','stale-context',null,run.pending.id),/Workspace configuration/);
 engine.setChatFolder(run.id,home,'read',false,context.id,null,false);assert.equal(engine.describePermissions(run).chatFolders[0].path,fs.realpathSync(home));
 const revision=run.chatPermissionRevision;engine.setChatPermission(run.id,'autopilot',context.id,revision,run.pending.id);assert.equal(engine.describePermissions(run).source,'chat');assert.equal(engine.describePermissions(run).mode,'autopilot');assert.throws(()=>engine.setChatPermission(run.id,'autopilot',context.id,revision,run.pending.id),/Chat approval changed/);
 run.status='completed';run.pending=null;engine.persist(run);const future=engine.createRun(spec,'scheduled',null,{deferStart:true});assert.equal(engine.describePermissions(future).mode,'ask');assert.deepEqual(engine.describePermissions(future).chatFolders,[]);assert.deepEqual(spec,before);
 engine.setChatPermission(run.id,'inherit',context.id,run.chatPermissionRevision);engine.setChatFolder(run.id,home,'read',true,context.id,run.chatPermissionRevision);assert.equal(engine.describePermissions(run).mode,'ask');
 }finally{await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});


test('permission UI projections share one fresh read, deduplicate contexts and retain the last reference',()=>{
 const home=temp();
 try{
  const store=new PermissionStore(home,{preserveInheritedDefaults:true}),spec={...schedule(home),context:{workspaceId:'synthetic'}};
  const original=store.get.bind(store);let reads=0,defaults=0,descriptions=0;
  store.get=()=>{reads++;return original();};store.workspaceDefaults=()=>{defaults++;return {mode:'custom',folders:[],rules:[],readOnlyTools:true};};
  const describe=store.describeContext.bind(store);store.describeContext=(...args)=>{descriptions++;return describe(...args);};
  for(const count of [25,248]){
   reads=0;defaults=0;descriptions=0;
   const runs=Array.from({length:count},(_,i)=>({id:'run-'+i,schedule:{...spec,name:'Chat '+i}})),snapshot=store.snapshot();
   const projected=runs.map(run=>store.describeRun(run,snapshot));assert.ok(projected.every(row=>row.mode==='custom'&&row.readOnlyTools));
   descriptions=0;
   const contexts=store.describeMany(runs.map(run=>({...run.schedule,ref:{runId:run.id}})),snapshot);
   assert.equal(reads,1);assert.equal(defaults,1);assert.equal(descriptions,1);assert.equal(contexts.length,1);
   assert.equal(contexts[0].label,'Chat '+(count-1));assert.deepEqual(contexts[0].ref,{runId:'run-'+(count-1)});
  }
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});

test('projection snapshots do not cache authorization, revisions or inherited defaults across requests',()=>{
 const home=temp();
 try{
  const store=new PermissionStore(home,{preserveInheritedDefaults:true}),spec={...schedule(home),context:{workspaceId:'synthetic'}},context=permissionContext(spec);
  const saved={schemaVersion:1,extension:{preserved:true},workspaces:[{...context,mode:'autopilot',folders:[],rules:[]}]};
  fs.writeFileSync(store.file,JSON.stringify(saved));const snapshot=store.snapshot();
  assert.equal(store.describeRun({schedule:spec},snapshot).mode,'autopilot');
  saved.workspaces[0].mode='ask';fs.writeFileSync(store.file,JSON.stringify(saved));
  assert.equal(store.describeRun({schedule:spec},snapshot).mode,'autopilot','A UI snapshot is consistent within its request');
  assert.equal(store.describeRun({schedule:spec}).mode,'ask');assert.equal(store.decide(spec,{kind:'shell',fullCommandText:'synthetic'}).allowed,false);
  assert.throws(()=>store.setMode(spec,'autopilot',snapshot.value.revision),/changed outside/);
  assert.deepEqual(store.get().extension,{preserved:true});
  // Matching profiles historically select the first row even in an extended file with duplicates.
  saved.workspaces.push({...saved.workspaces[0],mode:'autopilot'});fs.writeFileSync(store.file,JSON.stringify(saved));assert.equal(store.describe(spec).mode,'ask');
  saved.workspaces=[];fs.writeFileSync(store.file,JSON.stringify(saved));let inherited={mode:'autopilot',folders:[],rules:[]};store.workspaceDefaults=()=>inherited;
  const inheritedSnapshot=store.snapshot();assert.equal(store.describe(spec,inheritedSnapshot).mode,'autopilot');
  inherited={mode:'ask',folders:[],rules:[]};assert.equal(store.describe(spec).mode,'ask');assert.equal(store.decide(spec,{kind:'shell',fullCommandText:'synthetic'}).allowed,false);
  const granted={schedule:spec,chatPermission:{contextId:context.id,mode:'autopilot',folders:[],rules:[]}};
  assert.equal(store.describeRun(granted).source,'chat');assert.equal(store.describeRun(granted).mode,'autopilot');
  const other={...granted,schedule:{...spec,provider:'other'}};assert.equal(store.describeRun(other).mode,'ask','Chat grants remain bound to their exact execution identity');
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});


test('remote run projection shares its permission context and revision read',async()=>{
 const home=temp();
 try{
  const {remoteRun}=await import('../src/remote.js'),store=new PermissionStore(home),run={id:'synthetic',schedule:schedule(home),events:[],createdAt:new Date().toISOString()};
  const get=store.get.bind(store);let reads=0;store.get=()=>{reads++;return get();};
  const view=remoteRun(run,0,store);assert.equal(reads,1);assert.equal(view.permissionContext.mode,'ask');assert.equal(view.permissionRevision,get().revision);
  store.setMode(run.schedule,'autopilot');reads=0;assert.equal(remoteRun(run,0,store).permissionContext.mode,'autopilot');assert.equal(reads,1);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
