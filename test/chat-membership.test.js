import {chatResourcePlacement} from '../public/chat-resource-placement.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Engine} from '../src/engine.js';
import {chatMembership} from '../public/chat-membership.js';
import {permissionContext} from '../src/permissions.js';
test('moving an active chat preserves pending input, session, execution roots and approval identity across restart',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-membership-')),engine=new Engine(home);
 try{
  const schedule={schemaVersion:1,id:'fixture',name:'Fixture',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt:'Fixture',context:{workspaceId:'old',workspaceName:'Old',followsWorkspace:true,configurationRevision:'old',entries:[]}};
  const run=engine.createRun(schedule,'chat',null,{deferStart:true});run.status='awaiting_input';run.pending={id:'request',type:'question',question:'Continue?'};run.providerSessionId='session';run.chatPermission={contextId:permissionContext(run.schedule).id,mode:'autopilot',folders:[]};
  const id=permissionContext(run.schedule).id,events=structuredClone(run.events);
  engine.moveWorkspace(run.id,{workspaceId:'new',workspaceName:'New'});
  assert.deepEqual(chatMembership(run),{workspaceId:'new',workspaceName:'New'});assert.equal(run.schedule.context.workspaceId,'old');assert.equal(run.schedule.context.followsWorkspace,false);
  assert.equal(permissionContext(run.schedule).id,id);assert.equal(run.chatPermission.contextId,id);assert.equal(run.providerSessionId,'session');assert.deepEqual(run.events,events);assert.equal(run.pending.id,'request');assert.equal(run.status,'awaiting_input');
  engine.moveWorkspace(run.id,{workspaceId:null});assert.equal(chatMembership(run).workspaceId,null);
  // Restart recovery normally interrupts active work, so freeze only the fixture status here.
  run.status='completed';delete run.pending;engine.persist(run);await engine.close();
  const reopened=new Engine(home);assert.equal(chatMembership(reopened.getRun(run.id)).workspaceId,null);assert.equal(reopened.getRun(run.id).providerSessionId,'session');await reopened.close();
 }finally{await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});


test('resource placement favors the existing workspace chat over duplicate standalone and unrelated remote views',()=>{
 const workspace={id:'workspace:local:new',type:'workspace',workspaceId:'new'},view={id:'workspace-chat',type:'run',runId:'chat',parentId:workspace.id},standalone={id:'chat',type:'run'},remote={id:'remote',type:'run',runId:'chat',parentId:'remote-workspace',hostId:'other'};
 assert.deepEqual(chatResourcePlacement('chat',{tabs:[standalone,workspace,view,remote]},{workspaceId:'new'}),{scope:'workspace',id:'new',parentId:workspace.id,afterId:view.id});assert.equal(chatResourcePlacement('chat',{tabs:[standalone,remote]},{workspaceId:'new'}).scope,'chat');assert.equal(chatResourcePlacement('chat',{tabs:[workspace]},{workspaceId:'new'}).scope,'workspace');
});
