import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {scopedExecutionSandbox,validateScopedExecution} from '../src/services/scheduling/scoped-execution.js';
import {codexSandbox,verifyCodexSandbox} from '../src/providers/codex.js';
import {PermissionStore} from '../src/services/settings/permissions.js';
import {Engine} from '../src/engine.js';
import {until} from './remote-client.mjs';
test('scoped execution pins explicit roots, denies ambient paths, preserves approval boundaries and rejects unsupported modes',t=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'scoped-execution-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const schedule={provider:'codex',workspace:{cwd:root,additionalDirectories:[]},executionPermissions:{mode:'custom',sandboxedCommands:true,folders:[{path:root,access:'read-write'}]}};
 const policy=scopedExecutionSandbox(schedule),profile=policy.config.permissions[policy.managedProfile];assert.equal(profile.filesystem[':root'],'deny');assert.equal(profile.filesystem[':slash_tmp'],'deny');assert.equal(profile.network.enabled,false);assert.equal(policy.approvalPolicy,'on-request');assert.equal(profile.filesystem[root],'write');
 assert.throws(()=>codexSandbox(schedule,{mode:'ask'},{permissionControls:true}),/Review the schedule’s captured execution permissions/);
 assert.throws(()=>codexSandbox(schedule,{mode:'custom'}),/cannot enforce/);
 assert.throws(()=>validateScopedExecution({...schedule,provider:'mtplx'}),/cannot enforce/);
 assert.throws(()=>validateScopedExecution({...schedule,executionPermissions:{...schedule.executionPermissions,folders:[{path:'/',access:'read-write'}]}}),/narrow/);
 const receipt={cwd:root,approvalPolicy:'on-request',approvalsReviewer:'user',activePermissionProfile:{id:policy.managedProfile,extends:null},runtimeWorkspaceRoots:policy.runtimeWorkspaceRoots,sandbox:{networkAccess:false}};
 verifyCodexSandbox(receipt,policy,root);assert.throws(()=>verifyCodexSandbox({...receipt,approvalPolicy:'never'},policy,root),/confirm/);assert.throws(()=>verifyCodexSandbox({...receipt,sandbox:{networkAccess:true}},policy,root),/confirm/);
 const store=new PermissionStore(path.join(root,'permissions.json')),permission={mode:'custom',rules:[{kind:'mcp',server:'selected',tool:'lookup'}],folders:[]};
 assert.equal(store.decide(schedule,{kind:'mcp-connect',serverName:'selected'},permission).allowed,true);
 assert.equal(store.decide(schedule,{kind:'mcp-connect',serverName:'other'},permission).allowed,false);
 assert.equal(store.decide(schedule,{kind:'mcp',serverName:'selected',toolName:'delete'},permission).allowed,false);
 assert.equal(store.decide(schedule,{kind:'shell',fullCommandText:'python arbitrary.py',requestSandboxBypass:true},permission).allowed,false);
});

test('scoped scheduled chats reject incompatible approval modes and can remove an older override',async t=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'scoped-approval-')));
 const provider={run:async({run,permissionProfile,ask,emit})=>{
  codexSandbox(run.schedule,permissionProfile(),{permissionControls:true});
  await ask({type:'question',question:'Synthetic waiting turn?'});
  emit('assistant','Synthetic scoped turn complete.');
 }};
 const engine=new Engine(path.join(root,'owner'),{codex:provider},undefined,{permissionControls:true});
 t.after(async()=>{await engine.close();fs.rmSync(root,{recursive:true,force:true});});
 const spec={schemaVersion:1,id:'scoped-fixture',name:'Scoped approval fixture',provider:'codex',model:'fixture',
  workspace:{cwd:root,additionalDirectories:[]},cron:'0 9 * * *',timezone:'UTC',misfire:'skip',enabled:false,prompt:'Synthetic test',
  executionPermissions:{mode:'custom',sandboxedCommands:true,folders:[{path:root,access:'read-write'}]}};
 const run=engine.createRun(spec,'manual');
 await until(()=>run.pending?.type==='question');
 engine.reply(run.id,'Finish the first turn',run.pending.id);
 await until(()=>run.status==='completed'&&!engine.running.has(run.id));
 const profile=engine.describePermissions(run);
 assert.equal(profile.scopedCommands,true);
 run.status='awaiting_input';run.pending={id:'fixture-approval',type:'permission'};
 for(const mode of ['ask','autopilot'])assert.throws(()=>engine.setChatPermission(run.id,mode,profile.id,null,run.pending.id),/uses scoped commands/);
 assert.equal(run.chatPermission,undefined);
 assert.equal(run.chatPermissionRevision,undefined);
 run.status='completed';run.pending=null;
 // Reproduce a run already left with the old incompatible setting.
 run.chatPermission={contextId:profile.id,mode:'autopilot',folders:[]};run.chatPermissionRevision='old-override';engine.persist(run);
 engine.resume(run.id,'Try with the old override');
 await until(()=>run.status==='failed'&&!engine.running.has(run.id));
 assert.match(run.events.at(-1).text,/choose Use schedule permissions/);
 const restored=engine.setChatPermission(run.id,'inherit',profile.id,'old-override');
 assert.equal(restored.mode,'custom');
 engine.resume(run.id,'Continue with the saved schedule permissions');
 await until(()=>run.pending?.type==='question');
 engine.reply(run.id,'Finish the recovered turn',run.pending.id);
 await until(()=>run.status==='completed'&&!engine.running.has(run.id));
});
