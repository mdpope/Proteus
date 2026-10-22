import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Engine } from '../src/engine.js';
import { runSummary, remoteRun } from '../src/remote.js';

const schedule=(cwd,prompt,name='Workspace chat',manual=false)=>({schemaVersion:1,id:'synthetic-'+Math.random().toString(36).slice(2),name,chatTitleManual:manual,enabled:false,cron:'0 9 * * 1-5',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd,additionalDirectories:[]},misfire:'skip',prompt});

test('chat title revisions survive restart and reject stale edits',async()=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-chat-title-'));let engine=new Engine(home);
  try{
    const run=engine.createRun(schedule(home,'Please investigate the archive menu behavior in Team Tools'),'chat',null,{deferStart:true});
    assert.equal(run.title,'investigate the archive menu behavior in Team Tools');
    assert.equal(run.titleKind,'generated');
    const manual=engine.createRun(schedule(home,'Prompt',' Café notes ',true),'chat',null,{deferStart:true});
    assert.equal(manual.title,'Café notes');
    const old=run.titleRevision,renamed=engine.renameChat(run.id,'  Team archive review  ',old);
    assert.equal(renamed.title,'Team archive review');assert.equal(renamed.titleKind,'manual');
    assert.throws(()=>engine.renameChat(run.id,'stale',old),/changed/);
    assert.throws(()=>engine.renameChat(run.id,' ',renamed.titleRevision),/Enter a chat name/);
    assert.equal(runSummary(run).titleRevision,renamed.titleRevision);
    assert.equal(remoteRun(run).titleKind,'manual');
    await engine.close();engine=new Engine(home);
    assert.equal(engine.getRun(run.id).title,'Team archive review');
    assert.equal(engine.getRun(run.id).titleRevision,renamed.titleRevision);
    const legacy=engine.getRun(manual.id),legacyFile=path.join(home,'runs',legacy.id+'.json');
    delete legacy.titleRevision;delete legacy.titleKind;fs.writeFileSync(legacyFile,JSON.stringify(legacy));
    await engine.close();engine=new Engine(home);
    const migrated=engine.getRun(manual.id),legacyRevision=migrated.titleRevision;
    assert.equal(migrated.title,'Café notes');assert.equal(migrated.titleKind,'legacy');
    assert.equal(engine.renameChat(migrated.id,'Updated legacy',legacyRevision).titleKind,'manual');
    assert.throws(()=>engine.renameChat(migrated.id,'Stale legacy',legacyRevision),/changed/);
  }finally{await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});

test('chat-only approval is isolated, revocable, context-bound and keeps filesystem grants',async()=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-chat-permissions-'));let engine=new Engine(home);
  try{
    const one=engine.createRun(schedule(home,'One'),'chat',null,{deferStart:true});
    const two=engine.createRun(schedule(home,'Two'),'chat',null,{deferStart:true});
    const scheduled=engine.createRun(schedule(home,'Scheduled'),'scheduled',null,{deferStart:true});
    const context=engine.permissions.describe(one.schedule),revision=engine.permissions.get().revision;
    const applied=engine.setChatPermission(one.id,'autopilot',context.id,null);
    assert.equal(applied.source,'chat');assert.equal(applied.workspaceMode,'ask');
    assert.equal(engine.permissions.get().revision,revision);
    assert.equal(engine.describePermissions(two).source,'workspace');
    assert.equal(engine.describePermissions(scheduled).source,'workspace');
    assert.equal(engine.decidePermission(one,{kind:'shell',fullCommandText:'synthetic'}).allowed,true);
    assert.equal(engine.decidePermission(two,{kind:'shell',fullCommandText:'synthetic'}).allowed,false);
    assert.equal(engine.decidePermission(scheduled,{kind:'shell',fullCommandText:'synthetic'}).allowed,false);
    assert.equal(engine.decidePermission(one,{kind:'write',fileName:path.join(home,'output.txt')}).allowed,false);
    assert.equal(engine.decidePermission(one,{kind:'shell',managedApprovalRequired:true}).allowed,false);
    assert.equal(engine.decidePermission(one,{kind:'future-tool'}).allowed,false);
    assert.throws(()=>engine.setChatPermission(one.id,'inherit',context.id,null),/changed/);
    const waiting=engine.askNext(two,{type:'permission',details:{kind:'shell',fullCommandText:'synthetic'}},new AbortController().signal);
    assert.equal(two.status,'awaiting_input');
    assert.throws(()=>engine.setChatPermission(two.id,'autopilot',context.id,null,'stale-request'),/request changed/);
    assert.equal(engine.describePermissions(two).source,'workspace');
    engine.setChatPermission(two.id,'autopilot',context.id,null,two.pending.id);
    assert.equal(await waiting,'approve-auto');
    engine.setChatPermission(two.id,'inherit',context.id,two.chatPermissionRevision);
    assert.equal(engine.decidePermission(two,{kind:'shell',fullCommandText:'synthetic'}).allowed,false);
    await engine.close();engine=new Engine(home);
    assert.equal(engine.describePermissions(engine.getRun(one.id)).source,'chat');
    const restored=engine.getRun(one.id);
    restored.schedule={...restored.schedule,workspace:{...restored.schedule.workspace,additionalDirectories:[path.join(home,'other')]}};
    engine.persist(restored);
    assert.equal(engine.describePermissions(restored).source,'workspace');
    restored.schedule.workspace.additionalDirectories=[];engine.persist(restored);
    assert.equal(engine.describePermissions(restored).source,'workspace');
    assert.throws(()=>engine.setChatPermission(one.id,'inherit','wrong',restored.chatPermissionRevision),/Workspace configuration changed/);
    engine.setChatPermission(one.id,'inherit',engine.permissions.describe(restored.schedule).id,restored.chatPermissionRevision);
    assert.equal(engine.describePermissions(restored).source,'workspace');
  }finally{await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});

test('queued edits preserve identity and attachments and reject processed, stale and steering messages',async()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-edit-queue-')),engine=new Engine(home);
 try{const run=engine.createRun(schedule(home,'Initial'),'chat',null,{deferStart:true});await engine.send(run.id,'Original','queue','message-one');const queued=run.queuedMessages[0];queued.attachmentDispatch={proofId:'synthetic-proof'};const model=queued.modelOptions;
 engine.editQueued(run.id,'message-one','Revised','Original');assert.equal(queued.prompt,'Revised');assert.equal(queued.modelOptions,model);assert.equal(queued.attachmentDispatch.proofId,'synthetic-proof');assert.equal(run.events.find(e=>e.data?.delivery?.id==='message-one').text,'Revised');assert.equal(remoteRun(run).queuedMessages[0].hasAttachments,true);
 assert.throws(()=>engine.editQueued(run.id,'message-one','Lost','Original'),/changed/);engine.queuedSteers.set(run.id,Promise.resolve());assert.throws(()=>engine.editQueued(run.id,'message-one','Lost','Revised'),/steering/);engine.queuedSteers.clear();run.queuedMessages=[];assert.throws(()=>engine.editQueued(run.id,'message-one','Lost','Revised'),/delivered/);
 }finally{await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});

test('remote full chats and index summaries expose the same workspace association with captured-context fallback',()=>{
 const make=context=>({id:'synthetic',title:'Workspace chat',trigger:'chat',status:'completed',createdAt:'2026-10-12T00:00:00Z',events:[],schedule:{provider:'rehearsal',name:'Synthetic',...context.schedule},...context.run});
 for(const run of [make({schedule:{context:{workspaceId:'schedule-workspace',workspaceName:'Schedule workspace'}}}),make({run:{context:{workspaceId:'captured-workspace',workspaceName:'Captured workspace',entries:[]}}}),make({schedule:{context:{workspaceId:'only-id'}}}),make({schedule:{context:{}},run:{context:{workspaceId:'captured-with-empty',workspaceName:'Captured fallback'}}})]){
   const summary=runSummary(run),full=remoteRun(run);assert.equal(full.workspaceId,summary.workspaceId);assert.equal(full.workspaceName,summary.workspaceName);assert.equal(full.context.workspaceId,full.workspaceId);
 }
 const detached=make({});assert.equal(remoteRun(detached).workspaceId,null);assert.equal(runSummary(detached).workspaceName,'');
});
