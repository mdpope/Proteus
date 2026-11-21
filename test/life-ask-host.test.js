import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {startServer} from '../src/server.js';
import {legacyEnvelope,validateAdmission} from '../src/services/life/life-ask.js';

test('opt-in host connects admission through one engine chat, answer event and cloud mirror',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-ask-host-')),library=path.join(home,'library');fs.mkdirSync(library);fs.mkdirSync(path.join(library,'AgentRequests'));
 const models=[{id:'gpt-6.1-terra',controls:{reasoningEfforts:['medium']}}];let executions=0,policy,obsidianEnabled=true;
 const provider={status:async()=>({available:true,models}),run:async({emit,run})=>{
  executions++;
  policy=app.lifeAskHost.toolPolicy(run);
  const reminders=policy.tools.find(tool=>tool.name==='proteus_reminders');
  const outcome=JSON.parse(await reminders.handler({action:'list.create',accountId:'synthetic',operationId:randomUUID(),input:{name:'Synthetic list'}}));
  assert.equal(outcome.record.name,'Synthetic list');
  const scratch=policy.tools.find(tool=>tool.name==='proteus_scratchpad');
  const status=JSON.parse(await scratch.handler({action:'status'}));
  assert.equal(status.capturedProjectId,app.lifeAskHost.settings().projectId);
  const saved=JSON.parse(await scratch.handler({action:'create',title:'Fixture',body:'before',rootId:status.rootId,operationId:randomUUID()}));
  const edited=JSON.parse(await scratch.handler({action:'update',id:saved.id,body:'after',rootId:status.rootId,expectedRevision:saved.revision,operationId:randomUUID()}));
  assert.equal(edited.id,saved.id);
  assert.equal(JSON.parse(await scratch.handler({action:'read',id:saved.id,rootId:status.rootId})).body,'after');
  assert.deepEqual(policy.servers.obsidian.tools,['search_vault','read_note']);
  assert.equal(policy.servers['obsidian-other'],undefined);
  policy.assertServer('obsidian');
  obsidianEnabled=false;
  assert.throws(()=>policy.assertServer('obsidian'),/access changed/);

  await assert.rejects(scratch.handler({action:'request-access'}),/outside the captured/);
  await assert.rejects(scratch.handler({action:'create',projectId:'other'}),/outside the captured/);
  emit('assistant','**Synthetic answer**',{phase:'final',lifeAskResult:{kind:'search',item:'',answer:'**Synthetic answer**',professional:false}});
 }};
 const app=await startServer({home,port:0,timers:false,providers:{codex:provider}});
 t.after(async()=>{await app.close();fs.rmSync(home,{recursive:true,force:true});});
 assert.equal(app.lifeAskHost.enabled(),false);let account='synthetic';app.life.api.identity=()=>({accountId:account,origin:'https://synthetic.invalid',workspaceId:'synthetic'});
 const reminderEffects=[];
 app.life.api.assertIdentity=identity=>assert.equal(identity.accountId,account);
 app.life.action=async(operation,input,id,identity)=>{
  assert.equal(identity.accountId,'synthetic');assert.equal(operation,'reminders.list.create');
  reminderEffects.push({operation,id});return {record:{name:input.name}};
 };
 app.life.save({schemaVersion:3,enabled:true},app.life.get().revision);
 const config=path.join(home,'native-config.json');fs.writeFileSync(config,JSON.stringify({library:{root:library}}));
 app.omi.getSettings=()=>({configPath:config});app.omi.verifyRuntime=()=>{};
 let transcriptions=0;app.lifeAskHost.executor.native={transcribe:async()=>{transcriptions++;return {transcript:'Synthetic question',times:{asrStartedAt:1000,asrEndedAt:2000}};},file:async()=>{throw Error('Research cannot file.');}};
 const notifications=[];app.activity.publish=async item=>{notifications.push(item);return {};};
 await assert.rejects(app.lifeAskHost.save({enabled:true},app.lifeAskHost.view().revision),/Choose a folder for the Life workspace/);
 const lifeFolder=path.join(home,'Life Workspace');assert.equal(app.lifeAskHost.setWorkspaceFolder(lifeFolder).needsFolder,false);
 const saved=await app.lifeAskHost.save({enabled:true},app.lifeAskHost.view().revision);assert.equal(saved.settings.enabled,true);
 await app.scratchpad.configure({folder:lifeFolder,expectedRevision:app.scratchpad.settings().revision});
 const lifeWorkspace=app.lifeAskHost.workspace().workspaceId,contextGet=app.context.get.bind(app.context),resolveMcp=app.context.resolveMcp.bind(app.context);
 const source={id:'synthetic-obsidian',kind:'mcp',name:'obsidian',hash:'synthetic-hash'};
 app.context.get=(workspaceId,...args)=>{
  const catalog=contextGet(workspaceId,...args);
  if(workspaceId===lifeWorkspace)catalog.entries.push({...source,mode:obsidianEnabled?'workspace':'disabled'});
  catalog.entries.push({id:'synthetic-other',kind:'mcp',name:'obsidian-other',mode:'available'});
  return catalog;
 };
 app.context.resolveMcp=(entry,...args)=>entry.id===source.id
  ? {type:'stdio',command:'/synthetic/obsidianMCP',tools:['search_vault','read_note','delete_note']}
  : resolveMcp(entry,...args);
 const pcmBytes=120*16000*2,bytes=Buffer.alloc(pcmBytes+44);bytes.write('RIFF');bytes.writeUInt32LE(pcmBytes+36,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(16000,24);bytes.writeUInt32LE(32000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(pcmBytes,40);bytes.fill(255,46);bytes.writeInt16LE(4000,44);
 const requestId=randomUUID(),request={version:1,requestId,executionOwner:'proteus-life',accountID:account,hostID:app.remote.identity().hostId,device:{id:'synthetic'},audio:{format:'wav',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),data:bytes.toString('base64')},times:{captureStartedAt:1000,captureEndedAt:2000},endReason:'timeout'};
 const envelope=JSON.stringify(legacyEnvelope(validateAdmission(request),request.audio.data)).replaceAll('/','\\/');
 assert.ok(Buffer.byteLength(envelope)>10_000_000);
 const original=path.join(library,'AgentRequests',requestId+'.json');
 fs.writeFileSync(original,envelope);
 const native=app.lifeAskHost.executor.native,transcribe=native.transcribe;
 native.transcribe=async receipt=>{
  const frozen=app.lifeAskHost.executor.file(receipt,'request');
  assert.ok(fs.statSync(frozen).size>5_000_000);
  return transcribe(receipt);
 };
 assert.equal((await app.lifeAskHost.cloud.scan()).accepted,1);
 assert.equal(fs.readFileSync(original,'utf8'),envelope);
 const deadline=Date.now()+5000;while(!app.lifeAsk.read(requestId).effectsComplete){if(Date.now()>deadline)throw Error('Pipeline did not settle: '+JSON.stringify(app.lifeAsk.read(requestId)));await new Promise(resolve=>setTimeout(resolve,5));}
 const receipt=app.lifeAsk.read(requestId);assert.equal(receipt.state,'answered');assert.equal(executions,1);assert.equal(transcriptions,1);
 const run=app.engine.getRun(receipt.chatId);assert.equal(run.chatType,'life-ask');assert.deepEqual(run.schedule.workspace.additionalDirectories,[]);assert.deepEqual(run.schedule.context.entries,[]);
 assert.equal(run.projectName,'Ask');assert.equal(run.workspaceName,'Life');assert.equal(app.lifeAskHost.workspace().currentFolder,fs.realpathSync(lifeFolder));assert.equal(app.lifeAskHost.ensureLifeProject('home').workspaceId,run.workspaceId||app.lifeAskHost.workspace().workspaceId);assert.equal(run.schedule.context.workspaceId,null);assert.equal(run.schedule.context.followsWorkspace,false);
 const projectId=run.projectId;await app.lifeAskHost.save({enabled:true},app.lifeAskHost.view().revision);assert.equal(app.lifeAskHost.settings().projectId,projectId);
 assert.equal(app.workspaceProjects.read().projects.filter(row=>row.id===projectId).length,1);
 assert.equal(run.events[0].data.attachments[0].sha256,request.audio.sha256);assert.equal(run.events[0].data.lifeAskAudio,true);assert.equal(run.nextAttachmentDispatch,undefined);
 assert.equal(app.attachments.historyFile(run.id,request.audio.sha256).size,bytes.length);
 assert.equal(reminderEffects.length,1);assert.equal(notifications.filter(item=>item.type==='life.answer').length,1);assert.equal(notifications.filter(item=>item.type==='chat.completed').length,0);
 assert.equal(JSON.parse(fs.readFileSync(path.join(library,'AgentAnswers',requestId+'.json'))).chatId,run.id);
 assert.equal((await app.lifeAsk.admit(request)).state,'duplicate');assert.equal(executions,1);
 const catalog=app.workspaceProjects.read(),defaultWorkspace=app.context.config().defaultWorkspaceId;
 const target=catalog.projects.find(row=>row.workspaceId===defaultWorkspace);
 app.workspaceProjects.projects({action:'move-chat',chatId:run.id,projectId:target.id,workspaceId:target.workspaceId,expectedRevision:catalog.revision,expectedUpdatedAt:run.updatedAt},app.engine);
 app.lifeAskHost.placement.associate(run,receipt,projectId);assert.equal(run.projectId,target.id,'a user move is never undone');assert.deepEqual(run.schedule.workspace.additionalDirectories,[]);
 account='other';await assert.rejects(policy.tools[0].handler({action:'list'}),/different or unavailable/);assert.equal(app.lifeAskHost.enabled(),false);assert.equal(app.lifeAskHost.view().items.length,0);assert.equal((await app.lifeAsk.admit(request)).reason,'account-mismatch');
 await app.lifeAskHost.save({enabled:true},app.lifeAskHost.view().revision);assert.notEqual(app.lifeAskHost.settings().projectId,projectId,'another account gets its own project');
 assert.equal(app.workspaceProjects.read().projects.find(row=>row.id===projectId).name,'Ask');
});
