import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {startServer} from '../src/server.js';
import {startRelay} from '../relay/server.js';
import {atomicJSON} from '../src/shared/files.js';
import {secret} from '../src/services/remote/remote-crypto.js';
import {DesktopPeers} from '../src/services/remote/desktop-peers.js';
import {ChatControl,chatPage} from '../src/services/chats/chat-control.js';
import {chatControlTools} from '../src/services/chats/chat-control-tools.js';
import {until} from './remote-client.mjs';
import {privateTemporaryDirectory,ensurePrivateHome} from '../src/shared/private-paths.cjs';
import {cleanupStack} from './helpers/cleanup.js';

const model={id:'fixture',name:'Synthetic model',controls:{reasoningEfforts:['low'],contextTiers:[{id:'default'}],serviceTiers:[]}};
const safeStorage=()=>{const key=randomBytes(32);return {isEncryptionAvailable:()=>true,encryptString:text=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([iv,cipher.update(text),cipher.final(),cipher.getAuthTag()]);},decryptString:box=>{const decipher=createDecipheriv('aes-256-gcm',key,box.subarray(0,12));decipher.setAuthTag(box.subarray(-16));return Buffer.concat([decipher.update(box.subarray(12,-16)),decipher.final()]).toString();}};};
async function fixture(t){
 const cleanup=cleanupStack(t),root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-agent-chat-test-')),token=secret();
 cleanup(()=>fs.rmSync(root,{recursive:true,force:true,maxRetries:5,retryDelay:100}));
 const relay=await startRelay({port:0,token}),url=`ws://127.0.0.1:${relay.port}`;cleanup(()=>relay.close());
 const provider={status:async()=>({available:true,models:[model]}),run:async({prompt,ask,emit,signal})=>{if(prompt.startsWith('hold'))emit('assistant','Synthetic answer: '+await ask({type:'question',question:'Synthetic checkpoint?'}));else if(prompt.startsWith('permission')){await ask({type:'permission',question:'Synthetic approval',details:{kind:'custom-tool',toolName:'fixture',managedApprovalRequired:true}});emit('assistant','Synthetic approved result');}else if(prompt.startsWith('slow'))await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Cancelled')),{once:true}));else emit('assistant','Synthetic result: '+prompt);}};
 const start=async home=>{ensurePrivateHome(home);const workspace=path.join(home,'workspace');fs.mkdirSync(workspace,{recursive:true});if(!fs.existsSync(path.join(home,'settings.json')))atomicJSON(path.join(home,'settings.json'),{schemaVersion:1,provider:'copilot',model:'fixture',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}});const app=await startServer({home,port:0,timers:false,withSeed:false,providers:{copilot:provider}});cleanup(async()=>{app.peers?.close();await app.close();});clearInterval(app.chatControl.timer);return app;};
 const origin=await start(path.join(root,'origin')),owner=await start(path.join(root,'owner'));
 await owner.remote.configure({enabled:true,mode:'external',label:'Synthetic task owner',relayURL:url,publicURL:url,relayToken:token});await until(()=>owner.remote.status==='online');
 origin.peers=new DesktopPeers(origin.home,{safeStorage:safeStorage(),localHostId:origin.remote.config.hostId,heartbeatMs:0});await origin.peers.pair((await owner.remote.pairing()).code);
 const hostId=owner.remote.config.hostId,control=origin.chatControl;
 const create=async(service,prompt)=>service.engine.createRun(await service.buildChatSchedule({provider:'copilot',model:'fixture',prompt}),'chat');
 const caller=await create(origin,'hold origin');await until(()=>caller.pending);
 const grant=(actions=['read','dispatch','answer','cancel'],scope={})=>control.grant(caller.id,{hostId,actions,...scope});
 const command=(action,args={})=>({action,hostId,operationId:randomUUID(),...args});
 return {root,origin,owner,hostId,control,caller,grant,command,create,start};
}

test('encrypted multi-chat dispatch, independent feedback, ordinary answers and cancellation',async t=>{
 const f=await fixture(t),{control,caller,hostId,owner,origin,command}=f;f.grant();
 await origin.peers.connect(hostId);const watched=await f.create(owner,'hold UI selection');await until(()=>watched.pending);await origin.peers.request(hostId,'chat.get',{id:watched.id});
 const a=await control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'hold A'}),caller.id),b=await control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'hold B'}),caller.id);
 assert.equal(a.state,'accepted');assert.ok(a.taskId&&a.chatId);await until(()=>owner.engine.getRun(a.chatId).pending&&owner.engine.getRun(b.chatId).pending);
 const first=await control.handle({action:'wait',targets:[{taskId:a.taskId},{taskId:b.taskId}],timeoutMs:0},caller.id);assert.equal(first.results.length,2);assert.ok(first.results.every(r=>r.feedback.pending.type==='question'));
 const unchanged=await control.handle({action:'wait',targets:[{taskId:a.taskId},{taskId:b.taskId}],cursor:first.cursor,timeoutMs:30},caller.id);assert.equal(unchanged.changed,false);assert.equal(unchanged.results.length,0);
 const readA=await control.handle({action:'read',hostId,chatId:a.chatId},caller.id);
 await control.handle(command('reply',{chatId:a.chatId,requestId:readA.pending.id,answer:'A feedback'}),caller.id);await until(()=>owner.engine.getRun(a.chatId).status==='completed');
 const completion=await control.handle({action:'wait',targets:[{taskId:a.taskId},{taskId:b.taskId}],cursor:first.cursor,timeoutMs:0},caller.id);assert.equal(completion.results.length,1);assert.equal(completion.results[0].status,'completed');assert.match(JSON.stringify(completion),/A feedback/);assert.equal(completion.results[0].externalOutcomeVerified,false);
 assert.ok(caller.events.some(e=>e.data?.agentFeedback?.taskId===a.taskId&&e.text.includes('A feedback')));
 const uiPeer=[...owner.remote.peers.values()].find(p=>p.runId===watched.id);assert.ok(uiPeer,'task observation preserved UI watch');
 const cancelled=await control.handle(command('cancel',{chatId:b.chatId}),caller.id);assert.equal(cancelled.state,'accepted');await until(()=>owner.engine.getRun(b.chatId).status==='cancelled');
});

test('authorization is required, direct grants remain operator-only, denied/revoked/context-changed access is rejected',async t=>{
 const f=await fixture(t),{control,caller,hostId,owner,command}=f;
 await assert.rejects(control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'no grant'}),caller.id),/authorized/);
 await assert.rejects(control.handle({action:'grant',originChatId:caller.id,scope:{hostId,actions:['dispatch']}},caller.id),/Only the trusted/);
 // A real engine permission is exercised independently of the held provider question.
 f.origin.engine.reply(caller.id,'release',caller.pending.id);await until(()=>caller.status==='completed');
 let response;const originalProvider=f.origin.engine.providers.copilot;const askProvider={status:async()=>({available:true,models:[model]}),run:async({run,emit})=>{response=await control.handle({action:'request-access',scope:{hostId,actions:['read','dispatch']}},run.id);emit('assistant','grant result');}};
 f.origin.engine.providers.copilot=askProvider;const requester=await f.create(f.origin,'request grant');await until(()=>requester.pending?.type==='permission');assert.equal(requester.pending.details.kind,"chat-access");f.origin.engine.reply(requester.id,'deny',requester.pending.id);await until(()=>requester.status==='failed');assert.equal(response,undefined);assert.ok(!control.access.grants.some(g=>g.actor===requester.id));
 f.origin.engine.providers.copilot=originalProvider;await f.origin.engine.send(caller.id,'hold resumed origin','queue',randomUUID());await until(()=>caller.pending);const g=f.grant();
 const task=await control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'secret fixture result'}),caller.id);await until(()=>owner.engine.getRun(task.chatId).status==='completed');await control.refresh();
 control.revoke(g.grant.id,control.access.revision);
 assert.equal((await control.handle({action:'tasks'},caller.id)).tasks[0].state,'unavailable');
 assert.match((await control.handle({action:'wait',targets:[{taskId:task.taskId}]},caller.id)).results[0].error,/authorized/);
 f.grant();caller.schedule.context={...caller.schedule.context,workspaceId:'changed-context',workspace:{cwd:path.join(f.root,'different')}};
 await assert.rejects(control.handle({action:'read',hostId,chatId:task.chatId},caller.id),/authorized/);
});

test('approval questions, stale ordinary replies, unavailable model controls and steering fail closed',async t=>{
 const f=await fixture(t),{control,caller,owner,hostId,command}=f;f.grant();
 owner.catalogs.copilot.get=async()=>({available:true,models:[{id:'auto',isDefault:true},{id:'disabled-fixture',policy:{state:'disabled'}},model]});
 assert.deepEqual((await control.handle({action:'models',hostId,provider:'copilot'},caller.id)).models.map(m=>m.id),['fixture']);
 await assert.rejects(control.handle(command('create',{provider:'copilot',model:'invented',prompt:'test'}),caller.id),/refreshed/);
 await assert.rejects(control.handle(command('create',{provider:'copilot',model:'fixture',reasoningEffort:'invented',prompt:'test'}),caller.id),/unavailable/);
 const task=await control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'permission fixture'}),caller.id);await until(()=>owner.engine.getRun(task.chatId).pending);
 const run=await control.handle({action:'read',hostId,chatId:task.chatId},caller.id);assert.equal(run.pending.humanApprovalRequired,true);
 await assert.rejects(control.handle(command('reply',{chatId:task.chatId,requestId:run.pending.id,answer:'approve'}),caller.id),/ordinary question/);
 await assert.rejects(control.handle(command('send',{chatId:task.chatId,prompt:'steer',mode:'steer'}),caller.id),/does not support/);
 assert.equal(owner.engine.getRun(task.chatId).pending.id,run.pending.id);
 // Owner boundary independently refuses an agent approval.
 await assert.rejects(owner.remote.execute({},'chat.reply',{agentControl:true,id:task.chatId,requestId:run.pending.id,answer:'approve'}),/ordinary question/);
});

test('stable operation identity survives simultaneous calls, dropped response, reconnect and both service restarts',async t=>{
 const f=await fixture(t),{control,caller,owner,hostId,command,origin}=f;f.grant();
 const args=command('create',{provider:'copilot',model:'fixture',prompt:'retry fixture'});
 const original=control.request.bind(control);let drop=true;control.request=async(...a)=>{const result=await original(...a);if(a[1]==='chat.start'&&drop){drop=false;throw Error('Synthetic dropped response after effect');}return result;};
 const [a,b]=await Promise.all([control.handle(args,caller.id),control.handle(args,caller.id)]);assert.equal(a.taskId,b.taskId);assert.equal(a.state,'uncertain');assert.equal(owner.engine.listRuns().length,1);
 control.disconnect(hostId);const recovered=await control.handle({action:'retry',taskId:a.taskId},caller.id);assert.equal(recovered.state,'accepted');assert.equal(owner.engine.listRuns().length,1);
 await assert.rejects(control.handle({...args,prompt:'changed'},caller.id),/different arguments/);
 await until(()=>owner.engine.getRun(recovered.chatId).status==='completed');await control.refresh();const feedbackCount=caller.events.filter(e=>e.data?.agentFeedback).length;
 await control.close();origin.chatControl=new ChatControl(origin,{pollMs:0});const restored=origin.chatControl;
 await restored.refresh();assert.equal(caller.events.filter(e=>e.data?.agentFeedback).length,feedbackCount);
 await owner.close();owner.close=async()=>{};const restarted=await f.start(owner.home);await until(()=>restarted.remote.status==='online');restored.disconnect(hostId);
 assert.equal((await restored.handle({...args},caller.id)).chatId,recovered.chatId);assert.equal(restarted.engine.listRuns().length,1);
});

test('notify is explicit, task results are durable, and deliberate origin cancellation prevents automatic continuation',async t=>{
 const f=await fixture(t),{control,caller,owner,command,origin}=f;f.grant();
 const task=await control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'notify fixture',notify:true}),caller.id);await until(()=>owner.engine.getRun(task.chatId).status==='completed');await control.refresh();
 assert.equal(caller.queuedMessages.length,1);await control.refresh();assert.equal(caller.queuedMessages.length,1);
 const stopped=await control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'hold stopped-origin child',notify:true}),caller.id);await until(()=>owner.engine.getRun(stopped.chatId).pending);origin.engine.cancel(caller.id);await until(()=>caller.status==='cancelled');const child=owner.engine.getRun(stopped.chatId);owner.engine.reply(child.id,'completion while origin stopped',child.pending.id);await until(()=>child.status==='completed');await control.refresh();assert.equal(caller.status,'cancelled');assert.ok(caller.events.some(e=>e.text.includes('completion while origin stopped')));
});

test('owner inventory exceeds 1000 chats with stable, revision-bound pages',()=>{
 const rows=Array.from({length:1001},(_,i)=>({id:randomUUID(),title:'Synthetic '+i,status:'completed',trigger:'chat',events:[],schedule:{provider:'rehearsal'},createdAt:new Date(i).toISOString(),updatedAt:new Date(i).toISOString()}));
 const service={engine:{visibleRuns:()=>rows}};let cursor,seen=[];do{const page=chatPage(service,{cursor,limit:73});seen.push(...page.items);cursor=page.nextCursor;assert.equal(page.total,1001);assert.equal(page.partial,false);}while(cursor);assert.equal(new Set(seen.map(r=>r.id)).size,1001);
 const first=chatPage(service);rows[0].title='Renamed';assert.throws(()=>chatPage(service,{cursor:first.nextCursor}),/changed/);
});

test('tools include explicit host, durable operation identity and bounded wait schema',()=>{const [tool]=chatControlTools({handle:()=>({})},'actor');assert.equal(tool.name,'proteus_chats');assert.equal(tool.parameters.properties.targets.maxItems,8);assert.equal(tool.parameters.properties.timeoutMs.maximum,25000);});

test('project moves cannot widen task authority, including cached feedback and owner mutations',async t=>{
 const f=await fixture(t),{owner,control,caller,hostId,command}=f;
 const project=owner.workspaceProjects.read().projects[0];f.grant(['read','dispatch','answer'],{projectId:project.id});
 const task=await control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'project secret',projectId:project.id}),caller.id);await until(()=>owner.engine.getRun(task.chatId).status==='completed');await control.refresh();
 const run=owner.engine.getRun(task.chatId);owner.workspaceProjects.projects({action:'create',workspaceId:project.workspaceId,name:'Other scope',expectedRevision:owner.workspaceProjects.read().revision},owner.engine);const other=owner.workspaceProjects.read().projects.find(p=>p.name==='Other scope');
 owner.workspaceProjects.projects({action:'move-chat',chatId:run.id,projectId:other.id,expectedRevision:owner.workspaceProjects.read().revision,expectedUpdatedAt:run.updatedAt},owner.engine);
 await assert.rejects(control.handle({action:'read',hostId,chatId:run.id},caller.id),/outside/);
 assert.equal((await control.handle({action:'tasks'},caller.id)).tasks[0].state,'unavailable');
 await assert.rejects(owner.remote.execute({},'chat.send',{id:run.id,prompt:'must not run',mode:'queue',messageId:randomUUID(),agentControl:true,expectedProjectId:project.id}),/project changed/);
 assert.ok(!run.events.some(e=>e.text==='must not run'));
});

test('pause, disconnection and authenticated owner revocation close independent agent observers',async t=>{
 const f=await fixture(t),{origin,owner,control,caller,hostId,command}=f;f.grant();
 const task=await control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'hold pause'}),caller.id);await until(()=>owner.engine.getRun(task.chatId).pending);
 await origin.peers.pause(hostId,true);assert.equal(control.connections.size,0);await assert.rejects(control.handle({action:'read',hostId,chatId:task.chatId},caller.id),/paused/);
 await origin.peers.pause(hostId,false);await control.handle({action:'read',hostId,chatId:task.chatId},caller.id);
 origin.peers.disconnect(hostId);assert.equal(control.connections.size,0);await assert.rejects(control.handle({action:'read',hostId,chatId:task.chatId},caller.id),/resume/);
 await origin.peers.connect(hostId);await control.handle({action:'read',hostId,chatId:task.chatId},caller.id);
 owner.remote.revoke(origin.peers.records.get(hostId).deviceId);await until(()=>!origin.peers.records.has(hostId));assert.equal(control.connections.size,0);
 assert.equal((await control.handle({action:'tasks'},caller.id)).tasks[0].state,'unavailable');
});

test('local dispatch uses the same receipt boundary and exposes no native session paths or configuration',async t=>{
 const f=await fixture(t),{control,origin}=f,hostId=origin.remote.config.hostId;
 const args={action:'create',hostId,operationId:randomUUID(),provider:'copilot',model:'fixture',prompt:'local fixture'};
 const task=await control.handle(args);assert.equal(task.state,'accepted');assert.equal((await control.handle(args)).chatId,task.chatId);await until(()=>origin.engine.getRun(task.chatId).status==='completed');
 const view=await control.handle({action:'read',hostId,chatId:task.chatId});assert.ok(!JSON.stringify(view).includes(origin.home));assert.equal(view.schedule,undefined);assert.equal(view.nativeSessionPath,undefined);
});

test('feedback survives a complete origin restart without resuming an interrupted model turn',async t=>{
 const f=await fixture(t),{origin,owner,control,caller,command}=f;f.grant();
 const task=await control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'hold restart origin',notify:true}),caller.id);await until(()=>owner.engine.getRun(task.chatId).pending);
 const storage=origin.peers.safeStorage;origin.peers.close();await origin.close();origin.close=async()=>{};
 const child=owner.engine.getRun(task.chatId);owner.engine.reply(child.id,'durable after complete restart',child.pending.id);await until(()=>child.status==='completed');
 const restarted=await f.start(origin.home);restarted.peers=new DesktopPeers(origin.home,{safeStorage:storage,localHostId:restarted.remote.config.hostId,heartbeatMs:0});
 await restarted.chatControl.refresh();const restored=restarted.engine.getRun(caller.id);
 assert.equal(restored.status,'interrupted');assert.equal(restored.events.filter(e=>e.data?.agentFeedback?.taskId===task.taskId).length,1);assert.match(restored.events.at(-1).text,/durable after complete restart/);await restarted.chatControl.refresh();assert.equal(restored.events.filter(e=>e.data?.agentFeedback?.taskId===task.taskId).length,1);
});

test('a retained provider tool cannot run under a later turn of the same chat',async t=>{
 const f=await fixture(t),{origin,caller,control}=f;const tool=chatControlTools(control,caller.id)[0];assert.ok(JSON.parse(await tool.handler({action:'computers'})).computers.length);
 origin.engine.reply(caller.id,'finish first turn',caller.pending.id);await until(()=>caller.status==='completed');await origin.engine.send(caller.id,'hold next turn','queue',randomUUID());await until(()=>caller.pending);
 await assert.rejects(tool.handler({action:'computers'}),/active turn/);
 assert.ok(JSON.parse(await chatControlTools(control,caller.id)[0].handler({action:'computers'})).computers.length);
});

test('stopping the origin during metadata refresh prevents a later dispatch effect',async t=>{
 const f=await fixture(t),{origin,owner,control,caller,command}=f;f.grant();let release;
 const models=control.models.bind(control);control.models=async(...args)=>{await new Promise(resolve=>release=resolve);return models(...args);};
 const operation=control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'must never dispatch'}),caller.id);const outcome=assert.rejects(operation,/active turn/);await until(()=>!!release);origin.engine.cancel(caller.id);release();await outcome;assert.equal(owner.engine.listRuns().length,0);
});

test('an explicit human approval grants only the requested originating scope',async t=>{
 const f=await fixture(t),{origin,control,hostId}=f;let result;
 origin.engine.providers.copilot={status:async()=>({available:true,models:[model]}),run:async({run,emit})=>{result=await control.handle({action:'request-access',scope:{hostId,actions:['read']}},run.id);emit('assistant','Synthetic approved grant');}};
 const run=await f.create(origin,'approve synthetic scope');await until(()=>run.pending?.type==='permission');assert.equal(run.pending.details.kind,"chat-access");assert.deepEqual(run.pending.permissionChoices,[]);
 origin.engine.reply(run.id,'approve',run.pending.id);await until(()=>run.status==='completed');assert.equal(result.granted,true);assert.equal(result.grant.actor,run.id);assert.deepEqual(result.grant.actions,['read']);assert.equal(result.grant.hostId,hostId);
});

for(const mode of ['chat','workspace'])test(`${mode} Auto-approve grants only the requested chat scope and keeps revocation effective`,async t=>{
 const f=await fixture(t),{origin,control,hostId}=f;let result,start;
 const ready=new Promise(resolve=>start=resolve),chatId=randomUUID(),scope={hostId,chatIds:[chatId],projectId:'synthetic-project',actions:['read']};
 origin.engine.providers.copilot={status:async()=>({available:true,models:[model]}),run:async({run,emit})=>{await ready;result=await control.handle({action:'request-access',scope},run.id);emit('assistant','Synthetic automatic grant');}};
 const run=await f.create(origin,'automatic synthetic scope');
 if(mode==='chat')origin.engine.setChatPermission(run.id,'autopilot',origin.engine.permissions.describe(run.schedule).id,null);
 else origin.engine.permissions.setMode(run.schedule,'autopilot');
 start();await until(()=>run.status==='completed');
 assert.equal(result.granted,true);assert.equal(run.pending,null);assert.deepEqual(result.grant.actions,['read']);assert.deepEqual(result.grant.chatIds,[chatId]);assert.equal(result.grant.projectId,scope.projectId);assert.equal(result.grant.actor,run.id);assert.equal(result.grant.contextId,control.context(run.id));
 assert.equal(control.permitted(run.id,hostId,'read',chatId,scope.projectId),true);
 assert.equal(control.permitted(run.id,hostId,'dispatch',chatId,scope.projectId),false);assert.equal(control.permitted(run.id,hostId,'read',randomUUID(),scope.projectId),false);assert.equal(control.permitted(run.id,hostId,'read',chatId,'other-project'),false);
 const receipt=run.events.find(event=>event.data?.permission?.kind==='chat-access').data.permission;assert.equal(receipt.automatic,true);assert.equal(receipt.source,mode);
 control.revoke(result.grant.id,control.access.revision);assert.equal(control.permitted(run.id,hostId,'read',chatId,scope.projectId),false);
});

test('enabling chat Auto-approve resolves a pending scope request without broadening its captured target',async t=>{
 const f=await fixture(t),{origin,control,hostId}=f;let result;const chatId=randomUUID(),scope={hostId,chatIds:[chatId],actions:['read']};
 origin.engine.providers.copilot={status:async()=>({available:true,models:[model]}),run:async({run,emit})=>{result=await control.handle({action:'request-access',scope},run.id);emit('assistant','Synthetic rechecked grant');}};
 const run=await f.create(origin,'pending synthetic scope');await until(()=>run.pending?.type==='permission');
 scope.actions.push('dispatch');scope.chatIds.push(randomUUID());
 origin.engine.setChatPermission(run.id,'autopilot',origin.engine.permissions.describe(run.schedule).id,null,run.pending.id);
 await until(()=>run.status==='completed');assert.deepEqual(result.grant.actions,['read']);assert.deepEqual(result.grant.chatIds,[chatId]);assert.equal(run.automaticApprovals,1);
});

for(const change of ['approval','context','stop','peer'])test(`changing ${change} before an automatic scope grant is saved fails closed`,async t=>{
 const f=await fixture(t),{origin,control,hostId}=f;let start;const ready=new Promise(resolve=>start=resolve),ask=origin.engine.ask.bind(origin.engine);
 origin.engine.ask=async(run,request,signal)=>{
  const answer=await ask(run,request,signal);
  if(request.details?.kind==='chat-access'){
   if(change==='approval')origin.engine.setChatPermission(run.id,'inherit',origin.engine.permissions.describe(run.schedule).id,run.chatPermissionRevision);
   if(change==='context')run.schedule.context={...run.schedule.context,workspaceId:'changed-synthetic-context'};
   if(change==='stop')origin.engine.cancel(run.id);
   if(change==='peer')origin.peers.records.get(hostId).paused=true;
  }
  return answer;
 };
 origin.engine.providers.copilot={status:async()=>({available:true,models:[model]}),run:async({run})=>{await ready;await control.handle({action:'request-access',scope:{hostId,actions:['read']}},run.id);}};
 const run=await f.create(origin,'changing synthetic scope');origin.engine.setChatPermission(run.id,'autopilot',origin.engine.permissions.describe(run.schedule).id,null);start();
 await until(()=>['failed','cancelled'].includes(run.status));assert.equal(control.access.grants.some(grant=>grant.actor===run.id),false);
});

test('revocation during dispatch suppresses the response but preserves a known accepted receipt',async t=>{
 const f=await fixture(t),{control,caller,owner,command}=f;const grant=f.grant(),original=control.request.bind(control);
 control.request=async(...args)=>{const result=await original(...args);if(args[1]==='chat.start')control.revoke(grant.grant.id,control.access.revision);return result;};
 await assert.rejects(control.handle(command('create',{provider:'copilot',model:'fixture',prompt:'revoked during response'}),caller.id),/authorized/);
 assert.equal(owner.engine.listRuns().length,1);assert.equal([...control.tasks.values()][0].state,'accepted');assert.ok([...control.tasks.values()][0].chatId);assert.equal(caller.events.filter(e=>e.data?.agentFeedback).length,0);
});
