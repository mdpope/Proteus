import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {startServer} from '../src/server.js';import {revision} from '../src/services/scheduling/schedules.js';import {ScheduleControl} from '../src/services/scheduling/schedule-control.js';import {scheduleAccessRule} from '../src/services/settings/schedule-access-rule.js';import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';import {until} from './remote-client.mjs';
import {scheduleControlTools} from '../src/services/scheduling/schedule-control-tools.js';
async function fixture(t){
 const home=fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-schedule-control-')));fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'copilot',model:'fixture',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{unrelated:{command:'never-start',env:{PRIVATE_FIXTURE_SECRET:'not-returned'}}}}));
 const provider={status:async()=>({available:true,models:[{id:'fixture',controls:{reasoningEfforts:['low','high']}}]}),run:async({prompt,emit,ask,signal})=>{if(prompt==='hold')await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Stopped')),{once:true}));else if(prompt==='permission')await ask({type:'permission',question:'Synthetic tool requires human',details:{kind:'custom-tool',toolName:'fixture',managedApprovalRequired:true}});else emit('assistant','Synthetic completion');}};
 const app=await startServer({home,port:0,timers:false,withSeed:false,providers:{copilot:provider}});t.after(async()=>{await app.close();fs.rmSync(home,{recursive:true,force:true});});
 const schedule={schemaVersion:1,id:'serial-test',name:'Synthetic serial test',enabled:false,provider:'copilot',model:'fixture',reasoningEffort:'low',workspace:{cwd:home,additionalDirectories:[]},cron:'0 9 * * 1-5',timezone:'UTC',misfire:'skip',prompt:'complete',contextSelection:{selectedIds:[],includeDefaults:false},mcpServers:{},extensionMetadata:{keep:true}};app.engine.schedules.save(schedule);
 const control=app.scheduleControl,hostId=app.remote.info().hostId,request=(action,extra={})=>({action,hostId,scheduleId:schedule.id,expectedRevision:revision(app.engine.schedules.get(schedule.id)),...extra});return {home,app,control,hostId,schedule,request};
}
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
