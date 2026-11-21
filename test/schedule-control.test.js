import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID,createHash} from 'node:crypto';
import {startServer} from '../src/server.js';import {revision} from '../src/services/scheduling/schedules.js';import {ScheduleControl} from '../src/services/scheduling/schedule-control.js';import {scheduleAccessRule} from '../src/services/settings/schedule-access-rule.js';import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';import {until} from './remote-client.mjs';
import {scheduleControlTools} from '../src/services/scheduling/schedule-control-tools.js';
import {managedWorkspace} from '../src/services/integrations/managed-requirements.js';
async function fixture(t){
 const home=fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-schedule-control-')));fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'copilot',model:'fixture',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{unrelated:{command:'never-start',env:{PRIVATE_FIXTURE_SECRET:'not-returned'}}}}));
 const provider={status:async()=>({available:true,models:[{id:'fixture',controls:{reasoningEfforts:['low','high']}}]}),run:async({prompt,emit,ask,signal})=>{if(prompt==='hold')await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Stopped')),{once:true}));else if(prompt==='permission')await ask({type:'permission',question:'Synthetic tool requires human',details:{kind:'custom-tool',toolName:'fixture',managedApprovalRequired:true}});else emit('assistant','Synthetic completion');}};
 const app=await startServer({home,port:0,timers:false,withSeed:false,providers:{copilot:provider}});t.after(async()=>{await app.close();fs.rmSync(home,{recursive:true,force:true});});
 const schedule={schemaVersion:1,id:'serial-test',name:'Synthetic serial test',enabled:false,provider:'copilot',model:'fixture',reasoningEffort:'low',workspace:{cwd:home,additionalDirectories:[]},cron:'0 9 * * 1-5',timezone:'UTC',misfire:'skip',prompt:'complete',contextSelection:{selectedIds:[],includeDefaults:false},mcpServers:{},extensionMetadata:{keep:true}};app.engine.schedules.save(schedule);
 const control=app.scheduleControl,hostId=app.remote.info().hostId,request=(action,extra={})=>({action,hostId,scheduleId:schedule.id,expectedRevision:revision(app.engine.schedules.get(schedule.id)),...extra});return {home,app,control,hostId,schedule,request};
}
test('schedule deletion is revision-bound, replayable after reopening the store and preserves past runs',async t=>{
 const {app,schedule}=await fixture(t);
 const run=app.engine.createRun(schedule,'manual');
 await until(()=>run.status==='completed');
 const args={id:schedule.id,expectedRevision:revision(schedule),operationId:randomUUID()};
 assert.throws(()=>app.engine.deleteSchedule({...args,expectedRevision:'f'.repeat(64)}),/changed/);
 assert.equal(app.engine.deleteSchedule(args).deleted,true);
 assert.equal(app.engine.schedules.list().some(item=>item.id===schedule.id),false);
 assert.equal(app.engine.getRun(run.id).status,'completed');
 assert.throws(()=>app.engine.schedules.save(schedule,revision(schedule)),/changed/);
 const {ScheduleStore}=await import('../src/services/scheduling/schedules.js');
 const reopened=new ScheduleStore(app.engine.schedules.dir);
 assert.equal(reopened.remove(args.id,args.expectedRevision,args.operationId,()=>assert.fail('replayed mutation')).replayed,true);
});

test('manual schedule starts replay the admitted run after later revisions',async t=>{
 const {app,schedule}=await fixture(t);
 const request={id:schedule.id,expectedRevision:revision(schedule),operationId:randomUUID()};
 const run=app.engine.runSchedule(request);
 assert.equal(run.id,request.operationId);
 assert.equal(app.engine.runSchedule(request),run);
 await until(()=>run.status==='completed');
 app.engine.schedules.save({...schedule,name:'Edited later'},request.expectedRevision);
 assert.equal(app.engine.runSchedule(request),run);
 assert.throws(()=>app.engine.runSchedule({...request,operationId:randomUUID()}),/changed/);
 assert.throws(()=>app.engine.runSchedule({...request,expectedRevision:'f'.repeat(64)}),/another schedule or revision/);
 assert.equal(app.engine.listRuns().length,1);
});

test('source reconciliation verifies hashes and CAS, preserves enabled/history, and reconciles repeated delivery',async t=>{
 const {home,app,control,request,schedule}=await fixture(t),manifest=path.join(home,'workflow.json'),exportPath=path.join(home,'export.json');
 fs.writeFileSync(manifest,'{"workflow":"synthetic"}');
 const current={...schedule,enabled:true,source:{system:'fixture',manifest}};app.engine.schedules.save(current,revision(schedule));
 const captured=app.engine.createRun(current,'manual');await until(()=>captured.status==='completed');
 fs.writeFileSync(exportPath,JSON.stringify({...current,name:'New source name',enabled:false}));
 const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex'),sourceExport={exportPath,exportSha256:hash(exportPath),manifestSha256:hash(manifest)};
 const preview=await control.handle(request('preview-reconcile',{settingsScope:'future-runs',sourceExport}));assert.equal(preview.applied,false);assert.equal(app.engine.schedules.get(schedule.id).name,current.name);
 const args=request('reconcile',{settingsScope:'future-runs',sourceExport,planDigest:preview.planDigest,operationId:randomUUID()});
 const saved=await control.handle(args);assert.equal(saved.enabled,true);assert.equal(saved.name,'New source name');assert.equal((await control.handle(args)).taskId,saved.taskId);assert.equal(captured.schedule.name,current.name);
 fs.writeFileSync(manifest,'changed');await assert.rejects(control.handle(request('preview-reconcile',{settingsScope:'future-runs',sourceExport})),/changed/);
 await assert.rejects(control.handle({...request('preview-reconcile',{settingsScope:'future-runs',sourceExport}),expectedRevision:'stale'}),/changed/);
});
test('schedule status respects newest-first paging and catalog rescan leaves future settings unchanged',async t=>{
 const {app,control,request,schedule,home}=await fixture(t);
 for(let i=0;i<5;i++){const run=app.engine.createRun(schedule,'manual');await until(()=>run.status==='completed');run.createdAt=new Date(1000*i).toISOString();}
 const first=await control.handle(request('status',{limit:3}));assert.equal(first.runs.length,3);assert.equal(first.runs[0].createdAt,new Date(4000).toISOString());assert.ok(first.nextCursor);
 const second=await control.handle(request('status',{limit:3,cursor:first.nextCursor}));assert.equal(second.runs.length,2);
 const before=revision(app.engine.schedules.get(schedule.id));fs.writeFileSync(path.join(home,'AGENTS.md'),'new source');
 const refreshed=await control.handle(request('refresh-catalog'));assert.equal(refreshed.refreshed,true);assert.equal(revision(app.engine.schedules.get(schedule.id)),before);assert.ok(refreshed.sources.some(entry=>entry.kind==='instruction'));
});
test('resolved schedule reads and source discovery expose metadata without source bodies or MCP secrets',async t=>{
 const {home,app,control,request}=await fixture(t);
 fs.writeFileSync(path.join(home,'AGENTS.md'),'PRIVATE_SOURCE_BODY');await app.context.refreshAsync();
 const sources=await control.handle(request('sources',{limit:1}));assert.ok(sources.sources.length);assert.ok(!JSON.stringify(sources).includes('PRIVATE_SOURCE_BODY'));
 const entry=app.context.get().entries.find(entry=>entry.path===path.join(home,'AGENTS.md'));
 await control.handle(request('update',{settingsScope:'future-runs',changes:{contextSelection:{selectedIds:[entry.id],includeDefaults:false}}}));
 const read=await control.handle(request('read'));assert.equal((await control.handle(request('list'))).schedules.find(row=>row.id===read.id).revision,read.revision);assert.equal(read.executionPermissions,null);assert.equal(read.workspace.cwd,home);assert.ok(read.resolved.sources.some(source=>source.id===entry.id&&source.kind==='instruction'));assert.ok(read.resolved.effectivePermissions.mode);
 assert.ok(!JSON.stringify(read).includes('PRIVATE_SOURCE_BODY'));assert.ok(!JSON.stringify(read).includes('PRIVATE_FIXTURE_SECRET'));
 const schema=scheduleControlTools(control)[0].parameters;assert.ok(schema.properties.action.enum.includes('preview'));assert.ok(schema.properties.changes.properties.executionPermissions.properties.folders);
});
test('permission previews preserve source-owned schedules and runs; test receipts retain the start-time configuration',async t=>{
 const {home,app,control,request,schedule}=await fixture(t),before=revision(app.engine.schedules.get(schedule.id));
 const changes={executionPermissions:{mode:'custom',readOnlyTools:false,folders:[{path:home,access:'read'}],rules:[{kind:'mcp',server:'workflow',tool:'lookup',action:'read'}]}};
 const preview=await control.handle(request('preview',{settingsScope:'future-runs',changes}));assert.equal(preview.applied,false);assert.equal(preview.configuration.effectivePermissions.mode,'custom');assert.ok(preview.configuration.effectivePermissions.folders.some(folder=>folder.path===home&&folder.access==='read'));assert.equal(revision(app.engine.schedules.get(schedule.id)),before);assert.equal(app.engine.runs.size,0);
 await assert.rejects(control.handle({...request('preview',{settingsScope:'future-runs',changes}),expectedRevision:'stale'}),/changed/);
 await assert.rejects(control.handle(request('preview',{settingsScope:'future-runs',changes:{executionPermissions:{mode:'autopilot'}}})),/blanket/);
 await control.handle(request('update',{settingsScope:'future-runs',changes}));
 const started=await control.handle(request('start-test',{operationId:randomUUID(),settingsScope:'future-runs'}));await until(()=>app.engine.getRun(started.runId).status==='completed');
 await control.handle(request('update',{settingsScope:'future-runs',changes:{executionPermissions:{mode:'ask'}}}));
 const status=await control.handle(request('status',{runId:started.runId}));assert.equal(status.capturedConfiguration.effectivePermissions.mode,'custom');assert.equal(status.externalOutcomeVerified,false);assert.equal(app.engine.schedules.get(schedule.id).enabled,false);
 const owned={...app.engine.schedules.get(schedule.id),source:{system:'fixture',manifest:'fixture-only'}};app.engine.schedules.save(owned,revision(app.engine.schedules.get(schedule.id)));
 assert.equal((await control.handle(request('preview',{settingsScope:'future-runs',changes}))).sourceManaged,true);
 await assert.rejects(control.handle(request('update',{settingsScope:'future-runs',changes})),/source workflow/);
});
test('scheduler owner updates use fresh CAS, preserve unknown fields and captured snapshots, and keep MCP definitions private',async t=>{
 const f=await fixture(t),{control,request,app}=f,read=await control.handle(request('read'));assert.deepEqual(read.mcpServerNames,[]);assert.deepEqual(read.availableMcpServerNames,['unrelated']);assert.ok(!JSON.stringify(read).includes('PRIVATE_FIXTURE_SECRET'));
 const first=await control.handle(request('start-test',{operationId:randomUUID(),settingsScope:'future-runs'}));await until(()=>app.engine.getRun(first.runId).status==='completed');
 const updated=await control.handle(request('update',{settingsScope:'future-runs',changes:{reasoningEffort:'high',mcpServerNames:['unrelated']}}));assert.equal(updated.reasoningEffort,'high');assert.equal(updated.enabled,false);assert.equal(app.engine.getRun(first.runId).schedule.reasoningEffort,'low');assert.deepEqual(app.engine.schedules.get(f.schedule.id).extensionMetadata,{keep:true});
 await assert.rejects(control.handle({...request('disable'),expectedRevision:read.revision,settingsScope:'future-runs'}),/changed/);
 await assert.rejects(control.handle(request('update',{settingsScope:'existing-run',changes:{model:'fixture'}})),/future-runs/);
 await assert.rejects(control.handle(request('update',{settingsScope:'future-runs',changes:{executionPermissions:{mode:'autopilot'}}})),/blanket/);
 await assert.rejects(control.handle(request('update',{settingsScope:'future-runs',changes:{mcpServerNames:['unknown']}})),/existing owner/);
});
test('test starts return durable linkage, deduplicate concurrent/restarted requests, preserve pauses and retry captured settings explicitly',async t=>{
 const f=await fixture(t),{control,app,request}=f,args=request('start-test',{operationId:randomUUID(),settingsScope:'future-runs'}),[first,second]=await Promise.all([control.handle(args),control.handle(args)]);assert.equal(first.runId,second.runId);assert.equal(app.engine.getRun(first.runId).schedule.context.followsWorkspace,false);assert.equal(app.engine.schedules.get(f.schedule.id).enabled,false);await until(()=>app.engine.getRun(first.runId).status==='completed');
 const restarted=new ScheduleControl(app);t.after(()=>restarted.close());assert.equal((await restarted.handle(args)).runId,first.runId);await assert.rejects(restarted.handle({...args,settingsScope:'captured-run'}),/different/);
 await control.handle(request('update',{settingsScope:'future-runs',changes:{reasoningEffort:'high'}}));
 const retried=await control.handle(request('retry-test',{operationId:randomUUID(),retryOf:first.runId,expectedRunRevision:first.runRevision,settingsScope:'captured-run'}));assert.equal(retried.captured.reasoningEffort,'low');assert.equal(app.engine.schedules.get(f.schedule.id).reasoningEffort,'high');await until(()=>app.engine.getRun(retried.runId).status==='completed');
 assert.equal((await control.handle(request('status',{runId:retried.runId}))).operationId,retried.operationId);
});
test('overlap and native takeover stay blocked; stop is exact, durable and cannot answer pending tool approvals',async t=>{
 const f=await fixture(t),{app,control,request}=f;await control.handle(request('update',{settingsScope:'future-runs',changes:{prompt:'permission'}}));const started=await control.handle(request('start-test',{operationId:randomUUID(),settingsScope:'future-runs'}));await until(()=>app.engine.getRun(started.runId).pending);const status=await control.handle(request('status',{runId:started.runId}));assert.equal(status.pending.humanApprovalRequired,true);
 await assert.rejects(control.handle(request('start-test',{operationId:randomUUID(),settingsScope:'future-runs'})),/active/);
 const stop=request('stop-test',{operationId:randomUUID(),runId:started.runId,expectedRunRevision:status.runRevision});await control.handle(stop);await until(()=>app.engine.getRun(started.runId).status==='cancelled');const count=app.engine.getRun(started.runId).events.length;await control.handle(stop);assert.equal(app.engine.getRun(started.runId).events.length,count);
 const other={...app.engine.schedules.get(f.schedule.id),id:'other',prompt:'hold'};app.engine.schedules.save(other);const unrelated=app.engine.createRun(other,'manual');await assert.rejects(control.handle(request('stop-test',{operationId:randomUUID(),runId:unrelated.id,expectedRunRevision:revision(unrelated.schedule)})),/exact run/);app.engine.cancel(unrelated.id);
 const native={...other,id:'native-service',provider:'local-process',integration:{type:'omi',job:'audio'}};app.engine.schedules.save(native);await assert.rejects(control.handle({action:'start-test',hostId:f.hostId,scheduleId:native.id,expectedRevision:revision(native),operationId:randomUUID(),settingsScope:'future-runs'}),/Native service/);
});
test('source refresh explicitly targets an idle captured run and retains original context/model/history',async t=>{
 const f=await fixture(t),{home,app,control,request}=f;fs.writeFileSync(path.join(home,'AGENTS.md'),'Synthetic old instruction');await app.context.refreshAsync();const id=app.context.get().entries.find(entry=>entry.path===path.join(home,'AGENTS.md')).id;
 await control.handle(request('update',{settingsScope:'future-runs',changes:{contextSelection:{selectedIds:[id],includeDefaults:false}}}));const first=await control.handle(request('start-test',{operationId:randomUUID(),settingsScope:'future-runs'}));await until(()=>app.engine.getRun(first.runId).status==='completed');const run=app.engine.getRun(first.runId),original=JSON.stringify(run.events),old=run.schedule.context.entries[0].hash;
 fs.writeFileSync(path.join(home,'AGENTS.md'),'Synthetic new instruction');await control.handle(request('refresh-sources',{settingsScope:'existing-run',runId:run.id,expectedRunRevision:revision(run.schedule)}));assert.notEqual(run.schedule.context.entries[0].hash,old);assert.equal(run.initialSchedule.context.entries[0].hash,old);assert.equal(run.schedule.model,'fixture');assert.equal(run.schedule.reasoningEffort,'low');assert.equal(JSON.stringify(run.events.slice(0,-1)),original);
});
test('Chat Details refresh keeps scheduled workspace sources and their managed account binding',async t=>{
 const {home,app,schedule}=await fixture(t);
 const root=path.join(home,'referenced-workspace');
 fs.mkdirSync(root);
 const file=path.join(root,'AGENTS.md');
 fs.writeFileSync(file,'Original referenced instructions');
 app.context.mutate(config=>config.workspaces.push({id:'referenced',name:'Referenced workspace',cwd:root,additionalDirectories:[]}),app.context.config().revision);
 await app.context.refreshAsync();
 const configured={...schedule,workspaceSources:[{workspaceId:'referenced',categories:['folders','instructions','permissions']}],
  managedConnectionWorkspaceId:'referenced',managedConnections:[{name:'fixture',capabilities:[],required:true}]};
 const provider=app.engine.providers.copilot;
 provider.run=async({run,emit})=>emit('assistant','Resolved account workspace: '+managedWorkspace(run.schedule));
 const run=app.engine.createRun(configured,'manual');
 await until(()=>run.status==='completed');
 const original=structuredClone(run.schedule),permissions=structuredClone(run.schedule.executionPermissions);
 // Reproduce the state left by the old Chat Details refresh.
 run.initialSchedule=original;
 run.schedule={...run.schedule,context:app.context.capture({workspace:original.context.baseWorkspace,includeDefaults:false})};
 run.schedule.workspace=run.schedule.context.workspace;
 assert.throws(()=>managedWorkspace(run.schedule),/explicit captured workspace/);
 fs.writeFileSync(file,'Revised referenced instructions');
 const refresh=()=>fetch(app.origin+'/api/run-context',{method:'POST',headers:{Authorization:'Bearer '+app.token,'Content-Type':'application/json'},body:JSON.stringify({runId:run.id})});
 const response=await refresh();
 assert.equal(response.status,200,await response.text());
 assert.equal(managedWorkspace(run.schedule),'referenced');
 assert.equal(run.schedule.context.sourceWorkspaces[0].workspaceId,'referenced');
 assert.deepEqual(run.schedule.context.sourceWorkspaces[0].categories,['folders','instructions','permissions']);
 assert.equal(run.schedule.context.entries.find(entry=>entry.path===file).content,'Revised referenced instructions');
 assert.equal(run.initialSchedule.context.entries.find(entry=>entry.path===file).content,'Original referenced instructions');
 assert.deepEqual(run.schedule.workspace,original.workspace);
 assert.deepEqual(run.schedule.executionPermissions,permissions);
 app.engine.resume(run.id,'Continue with the revised instructions');
 await until(()=>run.status==='completed'||run.status==='failed');
 assert.equal(run.status,'completed');
 assert.equal(run.events.at(-1).text,'Resolved account workspace: referenced');
});
test('opted-in scheduled runs read body edits without a catalog rescan and audit the captured revisions',async t=>{
 const {home,app,schedule,control,request}=await fixture(t);
 const file=path.join(home,'AGENTS.md');
 const header='---\nname: Synthetic source\n---\n';
 fs.writeFileSync(file,header+'Original body');
 await app.context.refreshAsync();
 const source=app.context.get().entries.find(entry=>entry.path===file);
 await control.handle(request('update',{settingsScope:'future-runs',changes:{contextSelection:{selectedIds:[source.id],includeDefaults:false}}}));
 fs.writeFileSync(file,header+'Updated body');
 assert.throws(()=>app.engine.createRun(app.engine.schedules.get(schedule.id),'scheduled'),/Instructions changed/);
 const configured=await control.handle(request('update',{settingsScope:'future-runs',changes:{autoRefreshSources:true}}));
 assert.equal(configured.autoRefreshSources,true);
 const run=app.engine.createRun(app.engine.schedules.get(schedule.id),'scheduled');
 await until(()=>run.status==='completed');
 const entry=run.schedule.context.entries.find(item=>item.id===source.id);
 const audit=run.events.find(event=>event.data?.sourceRefresh);
 assert.equal(entry.content,header+'Updated body');
 assert.deepEqual(audit.data.sourceRefresh,[{id:source.id,name:source.name,from:source.hash,to:entry.hash}]);
 assert.equal(app.context.get().entries.find(item=>item.id===source.id).hash,source.hash,'refresh must not update the shared catalog');
 fs.writeFileSync(file,header.replace('Synthetic source','New metadata')+'Updated body');
 assert.throws(()=>app.engine.createRun(app.engine.schedules.get(schedule.id),'scheduled'),/metadata changed/);
 assert.equal(app.engine.listRuns().length,1);
});
test('opted-in chat follows exact instruction and skill bodies between turns while preserving the selection and history',async t=>{
 const {home,app}=await fixture(t);
 const instruction=path.join(home,'AGENTS.md'),skill=path.join(home,'.agents','skills','fixture','SKILL.md');
 const header='---\nname: Fixture skill\n---\n';
 fs.mkdirSync(path.dirname(skill),{recursive:true});
 fs.writeFileSync(instruction,'First revision');
 fs.writeFileSync(skill,header+'First skill revision');
 await app.context.refreshAsync();
 const selectedIds=app.context.get('default').entries.filter(entry=>[instruction,skill].includes(entry.path)).map(entry=>entry.id);
 const run=app.engine.createRun(await app.buildChatSchedule({workspaceId:'default',provider:'copilot',model:'fixture',prompt:'complete',selectedIds,includeDefaults:false}),'chat');
 await until(()=>run.status==='completed');
 const prior=structuredClone(run.schedule);
 const policy=expectedUpdatedAt=>fetch(app.origin+'/api/run-context',{method:'POST',headers:{Authorization:'Bearer '+app.token,'Content-Type':'application/json'},body:JSON.stringify({runId:run.id,action:'set-auto-refresh',enabled:true,expectedUpdatedAt})});
 assert.equal((await policy('old revision')).status,400);
 const response=await policy(run.updatedAt);
 assert.equal(response.status,200,await response.text());
 fs.writeFileSync(instruction,'Second revision');
 fs.writeFileSync(skill,header+'Second skill revision');
 fs.writeFileSync(path.join(home,'new.instructions.md'),'Unselected instruction');
 app.engine.resume(run.id,'Continue with current selected sources');
 await until(()=>['completed','failed'].includes(run.status));
 assert.equal(run.status,'completed',run.events.at(-1).text);
 assert.deepEqual(run.schedule.workspace,prior.workspace);
 assert.deepEqual(run.schedule.context.selectedIds,prior.context.selectedIds);
 assert.deepEqual(run.schedule.context.entries.map(entry=>entry.content).sort(),['Second revision',header+'Second skill revision'].sort());
 assert.deepEqual(run.contextHistory[0],prior.context);
 assert.equal(run.events.filter(event=>event.data?.sourceRefresh).length,1);
 app.context.mutate(config=>{config.workspaces[0].modes[selectedIds[0]]='disabled';},app.context.config().revision);
 app.engine.resume(run.id,'Try with the changed selection');
 await until(()=>run.status==='failed');
 assert.match(run.events.at(-1).text,/Workspace configuration changed/);
 assert.equal(run.contextHistory.length,1);
});
test('agent schedule scopes are exact, separate from chat/filesystem grants and remembered without blanket tool authority',async t=>{
 const f=await fixture(t),{app,control,request,hostId}=f;const caller=app.engine.createRun(await app.buildChatSchedule({provider:'copilot',model:'fixture',prompt:'hold',includeDefaults:false}),'chat');await until(()=>app.engine.running.has(caller.id));
 app.chatControl.grant(caller.id,{hostId,actions:['read','dispatch']});await assert.rejects(control.handle(request('read'),caller.id),/not authorized/);
 const scope={hostId,scheduleIds:[f.schedule.id],actions:['schedule-read','schedule-test']};const details={kind:'schedule-access',toolName:'proteus_schedules',args:{scope}};app.engine.permissions.remember(caller.schedule,details,'always-tool');const rule=scheduleAccessRule(scope);assert.equal(rule.kind,'custom-tool');
 await control.handle({action:'request-access',...scope},caller.id);assert.equal((await control.handle(request('read'),caller.id)).id,f.schedule.id);await assert.rejects(control.handle(request('disable',{settingsScope:'future-runs'}),caller.id),/not authorized/);
 const expanded={...scope,actions:['schedule-read','schedule-update']};assert.equal(app.engine.permissions.decide(caller.schedule,{...details,args:{scope:expanded}}).allowed,false);app.engine.cancel(caller.id);
});
test('blank chat exclusion drops inherited MCP defaults while explicit schedule MCP selection survives',async t=>{
 const {app}=await fixture(t);const empty=await app.buildChatSchedule({provider:'copilot',model:'fixture',prompt:'Synthetic',includeDefaults:false});assert.deepEqual(empty.mcpServers,{});
 const explicit=await app.buildChatSchedule({provider:'copilot',model:'fixture',prompt:'Synthetic',includeDefaults:false,mcpServers:{scoped:{command:'synthetic-only'}}});assert.deepEqual(Object.keys(explicit.mcpServers),['scoped']);
});


test('pausing remains available when the model is offline and inventory pages reject stale revisions',async t=>{
 const {app,control,request,schedule}=await fixture(t);const other={...schedule,id:'second'};app.engine.schedules.save(other);const first=await control.handle({...request('list'),limit:1});assert.ok(first.nextCursor);
 app.engine.providers.copilot.status=async()=>({available:false,error:'Synthetic offline'});const paused=await control.handle(request('disable',{settingsScope:'future-runs'}));assert.equal(paused.enabled,false);
 app.engine.schedules.save({...other,name:'Changed'},revision(other));await assert.rejects(control.handle({...request('list'),limit:1,cursor:first.nextCursor}),/inventory changed/);
});


test('future permission edits require their own exact scope and reject blanket tool rules',async t=>{
 const f=await fixture(t),{app,control,request,hostId}=f;const caller=app.engine.createRun(await app.buildChatSchedule({provider:'copilot',model:'fixture',prompt:'hold',includeDefaults:false}),'chat');await until(()=>app.engine.running.has(caller.id));
 control.access.grants.push({actor:caller.id,contextId:app.chatControl.context(caller.id),scope:{hostId,scheduleIds:[f.schedule.id],actions:['schedule-update']}});
 await assert.rejects(control.handle(request('update',{settingsScope:'future-runs',changes:{executionPermissions:{mode:'custom',rules:[]}}}),caller.id),/not authorized/);
 await assert.rejects(control.handle(request('update',{settingsScope:'future-runs',changes:{executionPermissions:{mode:'custom',rules:[{kind:'mcp',server:'workflow',tool:'*'}]}}})),/constrained/);
 await assert.rejects(control.handle(request('update',{settingsScope:'future-runs',changes:{executionPermissions:{mode:'custom',rules:[{kind:'shell',command:'python3'}]}}})),/constrained/);app.engine.cancel(caller.id);
});
