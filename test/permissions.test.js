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
  } finally {await engine.close();await until(()=>!engine.running);fs.rmSync(home,{recursive:true,force:true});}
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
