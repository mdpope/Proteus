import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {scopedExecutionSandbox,validateScopedExecution} from '../src/services/scheduling/scoped-execution.js';
import {codexSandbox,verifyCodexSandbox} from '../src/providers/codex.js';
import {PermissionStore} from '../src/services/settings/permissions.js';
test('scoped execution pins explicit roots, denies ambient paths, preserves approval boundaries and rejects unsupported modes',t=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'scoped-execution-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const schedule={provider:'codex',workspace:{cwd:root,additionalDirectories:[]},executionPermissions:{mode:'custom',sandboxedCommands:true,folders:[{path:root,access:'read-write'}]}};
 const policy=scopedExecutionSandbox(schedule),profile=policy.config.permissions[policy.managedProfile];assert.equal(profile.filesystem[':root'],'deny');assert.equal(profile.filesystem[':slash_tmp'],'deny');assert.equal(profile.network.enabled,false);assert.equal(policy.approvalPolicy,'on-request');assert.equal(profile.filesystem[root],'write');
 assert.throws(()=>codexSandbox(schedule,{mode:'ask'},{permissionControls:true}),/changed/);
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
