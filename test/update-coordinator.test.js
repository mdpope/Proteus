import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {startServer} from '../src/server.js';
import {atomicJSON} from '../src/shared/files.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {updateCoordinatorConfiguration,updateCoordinatorPrompt} from '../src/services/updates/update-coordinator.js';
import {randomUUID} from 'node:crypto';
const model={id:'fixture',name:'Synthetic model',controls:{reasoningEfforts:['high'],serviceTiers:[{id:'priority'}],contextTiers:[{id:'default'}]}};
test('update defaults are explicit and validated against current provider metadata',async()=>{
 const saved={provider:'codex',model:'fixture',reasoningEffort:'high',serviceTier:'priority'},catalogs={codex:{get:async()=>({models:[model]})}};
 assert.deepEqual(await updateCoordinatorConfiguration({updateCoordinator:saved},catalogs,{}),saved);
 await assert.rejects(updateCoordinatorConfiguration({},catalogs,{}),/Configure/);
 await assert.rejects(updateCoordinatorConfiguration({updateCoordinator:saved},catalogs,{provider:'claude',model:'fixture'}),/unavailable/);
 await assert.rejects(updateCoordinatorConfiguration({updateCoordinator:saved},catalogs,{...saved,reasoningEffort:'invented'}),/unavailable/);
 await assert.rejects(updateCoordinatorConfiguration({updateCoordinator:saved},{codex:{get:async()=>({models:[model],stale:true})}},{}),/unavailable/);
 assert.match(updateCoordinatorPrompt('Synthetic release'),/same chat after restart/);
});

test('desktop updates create one new release-named chat per stable operation and capture saved defaults',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-update-session-'));
 atomicJSON(path.join(home,'settings.json'),{schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{},updateCoordinator:{provider:'codex',model:'fixture',reasoningEffort:'high',serviceTier:'priority'}});
 const app=await startServer({home,port:0,timers:false,providers:{codex:{status:async()=>({available:true,models:[model]}),run:async()=>{}}}});app.engine.drain=async()=>{};
 t.after(async()=>{await app.close();fs.rmSync(home,{recursive:true,force:true});});
 const release={id:'synthetic-oct26',version:'0.2.31',buildRevision:'synthetic',sourceFingerprint:'a'.repeat(64)};
 app.updates={packaged:true,job:()=>null,close:async()=>{},selectedRelease:async value=>{assert.equal(value.releaseId,release.id);return release;}};
 const post=async value=>{const response=await fetch(app.origin+'/api/updates/coordinator',{method:'POST',headers:{authorization:'Bearer '+app.token,'content-type':'application/json'},body:JSON.stringify(value)});return {status:response.status,value:await response.json()};};
 const request={operationId:randomUUID(),releaseId:release.id,manifestDigest:'b'.repeat(64)};
 const results=await Promise.all([post(request),post(request)]);assert.equal(results[0].status,200,JSON.stringify(results));assert.equal(results[0].value.id,results[1].value.id);assert.equal(app.engine.listRuns().length,1);
 const run=app.engine.getRun(results[0].value.id);assert.equal(run.title,'Proteus 0.2.31 update');assert.equal(run.schedule.purpose,'update');assert.equal(run.schedule.reasoningEffort,'high');assert.equal(run.schedule.context.workspaceId,null);assert.deepEqual(run.schedule.context.entries,[]);assert.equal(run.schedule.updateSession.releaseId,release.id);
 assert.match(run.schedule.prompt,/THIS new chat/);assert.match(run.schedule.prompt,/same chat after restart/);
 assert.equal((await post({...request,manifestDigest:'c'.repeat(64)})).status,400);
 assert.equal((await post({...request,operationId:randomUUID()})).status,400,'A second active update is not started');
 run.status='completed';app.engine.persist(run);const next=await post({...request,operationId:randomUUID()});assert.equal(next.status,200);assert.notEqual(next.value.id,run.id);assert.equal(app.engine.listRuns().length,2,'A later upgrade never reuses the old completed chat');
});
for(const provider of ['codex','copilot','claude'])test(provider+' coordinator creation is unassigned and retains captured defaults',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-update-chat-'));const defaults={provider,model:'fixture',reasoningEffort:'high',serviceTier:'priority'};
 atomicJSON(path.join(home,'settings.json'),{schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{},updateCoordinator:defaults});
 const app=await startServer({home,port:0,timers:false,providers:{[provider]:{status:async()=>({available:true,models:[model]}),run:async()=>{}}}});app.engine.drain=async()=>{};
 t.after(async()=>{await app.close();fs.rmSync(home,{recursive:true,force:true});});
 const response=await fetch(app.origin+'/api/chat',{method:'POST',headers:{authorization:'Bearer '+app.token,'content-type':'application/json'},body:JSON.stringify({purpose:'update',prompt:'Prepare the synthetic requested release'})});const run=await response.json();assert.equal(response.status,200,JSON.stringify(run));
 assert.equal(run.schedule.purpose,'update');assert.equal(run.schedule.context.workspaceId,null);assert.equal(run.schedule.context.agentId,null);assert.deepEqual(run.schedule.context.entries,[]);assert.equal(run.schedule.provider,provider);assert.equal(run.schedule.model,'fixture');assert.equal(run.schedule.serviceTier,'priority');assert.equal(run.projectId??null,null);assert.equal(app.workspaceProjects.get(app.engine).memberships[run.id]?.projectId??null,null);
 app.settings.save({...app.settings.get(),updateCoordinator:{...defaults,reasoningEffort:''}},app.settings.get().revision);assert.equal(app.engine.getRun(run.id).schedule.reasoningEffort,'high');
 // The person who started this coordinator is not asked again for its update tool.
 const live=app.engine.getRun(run.id),update=app.engine.decidePermission(live,{kind:'custom-tool',toolName:'proteus_update',args:{action:'status'}});
 assert.equal(update.allowed,true);assert.equal(update.reason,'User-started update coordinator');
 assert.equal(app.engine.decidePermission(live,{kind:'custom-tool',toolName:'proteus_browser',args:{action:'open'}}).allowed,false,'Other tools keep their approval');
 assert.equal(app.engine.decidePermission(live,{kind:'custom-tool',toolName:'proteus_update',requestSandboxBypass:true}).allowed,false);
 // Guided desktop-control setup reuses these defaults but is not an update chat.
 live.status='completed';
 const setup=await fetch(app.origin+'/api/desktop-control/setup',{method:'POST',headers:{authorization:'Bearer '+app.token,'content-type':'application/json'},body:'{}'}),guide=await setup.json();assert.equal(setup.status,200,JSON.stringify(guide));
 assert.equal(guide.schedule.purpose,'desktop-control-setup');assert.equal(guide.schedule.updateAuthorization,undefined);assert.equal(guide.schedule.provider,provider);assert.match(guide.schedule.prompt,/Cua Driver/);assert.match(guide.schedule.prompt,/ask me before running any installer/);
 assert.equal(app.engine.decidePermission(app.engine.getRun(guide.id),{kind:'custom-tool',toolName:'proteus_update'}).allowed,false,'Setup chats do not inherit update-tool approval');
});


test('an update captures only saved destination options, including when optional values were not saved',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-update-options-'));
 const saved={provider:'codex',model:'fixture'};
 atomicJSON(path.join(home,'settings.json'),{schemaVersion:1,provider:'codex',model:'fixture',reasoningEffort:'high',serviceTier:'priority',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{},updateCoordinator:saved});
 const app=await startServer({home,port:0,timers:false,providers:{codex:{status:async()=>({available:true,models:[model]}),run:async()=>{}}}});
 t.after(async()=>{await app.close();fs.rmSync(home,{recursive:true,force:true});});
 const schedule=await app.buildChatSchedule({purpose:'update',prompt:'Synthetic defaults isolation',provider:'copilot',model:'other',reasoningEffort:'invented',contextTier:'long_context',serviceTier:'invented'});
 assert.equal(schedule.provider,'codex');assert.equal(schedule.model,'fixture');assert.equal(schedule.reasoningEffort,'');assert.equal(schedule.contextTier,'default');assert.equal(schedule.serviceTier,'');
});
