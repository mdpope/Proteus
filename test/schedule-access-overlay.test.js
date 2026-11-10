import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {addScheduleAccess,effectiveScheduleAccess,revokeScheduleAccess,assertScheduleManagedAccess} from '../src/services/scheduling/access-overlay.js';
import {resolveExecutionCapabilities} from '../src/services/scheduling/execution-capabilities.js';
import {ScheduleStore,revision} from '../src/services/scheduling/schedules.js';
import {reconciliationPlan} from '../src/services/scheduling/source-reconciliation.js';
import {createHash} from 'node:crypto';
import {ownerSelectionUpdate,clearOwnerSelection} from '../src/services/scheduling/source-selection-overrides.js';
import {startServer} from '../src/server.js';
const base=cwd=>({schemaVersion:1,id:'workflow-fixture',name:'Fixture',provider:'codex',model:'fixture',workspace:{cwd,additionalDirectories:[]},cron:'0 9 * * *',timezone:'UTC',misfire:'skip',prompt:'Synthetic',enabled:false});
function home(t,cleanup=true){const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'schedule-access-')));if(cleanup)t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
test('capability resolution distinguishes command approval from native sandbox enforcement',()=>{
 for(const provider of ['codex','copilot','claude']){const result=resolveExecutionCapabilities({provider,executionPermissions:{sandboxedCommands:true}});assert.equal(result.capabilities.exactCommandApproval,true);assert.equal(result.supported,true);assert.equal(result.missing.length,0);assert.equal(result.capabilities.runtimeQualificationRequired,provider!=='codex');}
});
test('explicit schedule grants survive restart/provider switch; revocation and Ask remain effective',t=>{
 const dir=home(t),store=new ScheduleStore(path.join(dir,'schedules')),original=base(dir);store.save(original);
 const granted=addScheduleAccess(original,{folder:{path:dir,access:'read'}});store.save(granted,revision(original));
 const reloaded=new ScheduleStore(store.dir).get(original.id);
 for(const provider of ['codex','copilot','claude'])assert.deepEqual(effectiveScheduleAccess({...reloaded,provider}).folders,[{path:dir,access:'read'}]);
 const revoked=revokeScheduleAccess(reloaded,reloaded.accessOverlay.grants[0].id);assert.equal(effectiveScheduleAccess(revoked),undefined);assert.ok(revoked.accessOverlay.grants[0].revokedAt);
 assert.equal(effectiveScheduleAccess({...reloaded,executionPermissions:{mode:'ask'}}).mode,'ask');
 assert.throws(()=>effectiveScheduleAccess({...reloaded,workspace:{cwd:dir,additionalDirectories:['/changed']}}),/resources changed/);
 assert.throws(()=>addScheduleAccess(original,{rule:{kind:'shell',command:'python script.py'}}),/command identity|request payloads/);
});
test('source reconciliation retains owner consent, enabled state and unknown fields',t=>{
 const dir=home(t),manifest=path.join(dir,'workflow.json'),exportPath=path.join(dir,'export.json');fs.writeFileSync(manifest,'{}');
 const current=addScheduleAccess({...base(dir),enabled:true,source:{system:'fixture',manifest},unknown:{keep:true}},{rule:{kind:'mcp',server:'selected',tool:'lookup',action:'read'}});
 fs.writeFileSync(exportPath,JSON.stringify({...current,enabled:false,name:'Updated',accessOverlay:undefined}));
 const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const result=reconciliationPlan(current,{exportPath,manifestSha256:hash(manifest),exportSha256:hash(exportPath)});
 assert.deepEqual(result.next.accessOverlay,current.accessOverlay);assert.equal(result.next.enabled,true);assert.deepEqual(result.next.unknown,{keep:true});assert.equal(effectiveScheduleAccess(result.next).rules.length,1);
});
test('failed provider save leaves live schedule unchanged and records durable deduplicated ERROR',async t=>{
 const dir=home(t,false),provider={status:async()=>({available:true,models:[{id:'fixture'}]})},options={home:dir,port:0,timers:false,withSeed:false,providers:{codex:provider}};
 let app=await startServer(options);t.after(async()=>{await app.close();fs.rmSync(dir,{recursive:true,force:true,maxRetries:5});});
 const schedule={...base(dir),executionPermissions:{mode:'custom',sandboxedCommands:true,folders:[{path:dir,access:'read-write'}]}};app.engine.schedules.save(schedule);
 const post=async()=>fetch(app.origin+'/api/schedules',{method:'POST',headers:{Authorization:'Bearer '+app.token,'Content-Type':'application/json'},body:JSON.stringify({schedule:{...schedule,provider:'mtplx'},expectedRevision:revision(schedule)})});
 for(let index=0;index<2;index++){const response=await post();assert.equal(response.status,400);assert.match((await response.json()).error,/cannot enforce/);}
 assert.equal(app.engine.schedules.get(schedule.id).provider,'codex');const errors=app.activity.notifications().items.filter(item=>item.type==='schedule.error');assert.equal(errors.length,1);assert.equal(errors[0].level,'error');assert.equal(errors[0].scheduleId,schedule.id);assert.ok(errors[0].correlationId);
 await app.close();app=await startServer(options);assert.equal(app.activity.notifications().items.find(item=>item.id===errors[0].id).level,'error');
});

test('supervised schedule approval autosaves only explicit schedule consent',async t=>{
 const dir=home(t,false),provider={status:async()=>({available:true,models:[{id:'fixture'}]}),run:async({ask,emit})=>{await ask({type:'permission',question:'Open synthetic origin?',details:{kind:'url',url:'https://fixture.example/path'}});emit('assistant','Synthetic completion');}};
 const app=await startServer({home:dir,port:0,timers:false,withSeed:false,providers:{copilot:provider}});t.after(async()=>{await app.close();fs.rmSync(dir,{recursive:true,force:true,maxRetries:5});});
 const {until}=await import('./remote-client.mjs');
 const initial={...base(dir),provider:'copilot',executionPermissions:{mode:'custom',folders:[],rules:[]}};app.engine.schedules.save(initial);
 for(const decision of ['approve','deny','allow-schedule']){
  const run=app.engine.createRun(app.engine.schedules.get(initial.id),'manual');await until(()=>run.pending?.type==='permission');
  assert.ok(run.pending.permissionChoices.some(choice=>choice.value==='allow-schedule'));
  app.engine.reply(run.id,decision,run.pending.id);await until(()=>run.status==='completed');
  assert.equal(!!app.engine.schedules.get(initial.id).accessOverlay,decision==='allow-schedule');
 }
 const next=app.engine.createRun(app.engine.schedules.get(initial.id),'manual');await until(()=>next.status==='completed');assert.equal(next.pending,null);
});

test('managed schedule consent pins owner/workspace/connection revision across providers',t=>{
 const dir=home(t),schedule={...base(dir),managedConnections:[{name:'fixture',required:true,capabilities:['read']}]},bindings=[{connectionId:'connection',name:'fixture',ownerId:'owner',workspaceId:'workspace',configurationRevision:'revision'}];
 assert.throws(()=>addScheduleAccess(schedule,{folder:{path:dir,access:'read'}}),/bindings/);
 const saved=addScheduleAccess(schedule,{folder:{path:dir,access:'read'}},{managedBindings:bindings});
 for(const provider of ['codex','copilot','claude']){assert.doesNotThrow(()=>assertScheduleManagedAccess({...saved,provider},bindings));for(const key of ['ownerId','workspaceId','connectionId','configurationRevision'])assert.throws(()=>assertScheduleManagedAccess({...saved,provider},[{...bindings[0],[key]:'changed'}]),/changed/);}
});

test('owner provider selection survives canonical reconciliation and restart; clear restores current canonical selection',t=>{
 const dir=home(t),store=new ScheduleStore(path.join(dir,'schedules')),manifest=path.join(dir,'workflow.json'),exportPath=path.join(dir,'export.json');fs.writeFileSync(manifest,'{}');
 const original={...base(dir),source:{system:'fixture',manifest},reasoningEffort:'low'};store.save(original);
 const changed=ownerSelectionUpdate(original,{...original,provider:'copilot',model:'destination-model',reasoningEffort:undefined});store.save(changed,revision(original));
 const exported={...original,model:'canonical-new-model',reasoningEffort:'high'};fs.writeFileSync(exportPath,JSON.stringify(exported));const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const plan=reconciliationPlan(changed,{exportPath,manifestSha256:hash(manifest),exportSha256:hash(exportPath)});assert.equal(plan.next.provider,'copilot');assert.equal(plan.next.model,'destination-model');assert.equal(plan.next.reasoningEffort,undefined);store.save(plan.next,revision(changed));
 const reloaded=new ScheduleStore(store.dir).get(original.id);assert.equal(reloaded.ownerSelectionOverride.selection.provider,'copilot');assert.equal(reloaded.ownerSelectionOverride.baseSelection.model,'canonical-new-model');
 const cleared=clearOwnerSelection(reloaded);assert.equal(cleared.provider,'codex');assert.equal(cleared.model,'canonical-new-model');assert.equal(cleared.reasoningEffort,'high');assert.equal(cleared.ownerSelectionOverride,undefined);
});

test('source export bookkeeping does not invalidate workflow consent; authority changes do',t=>{
 const dir=home(t),schedule={...base(dir),source:{system:'fixture',manifest:'/workflow.json',exportedAt:'before'}};
 const saved=addScheduleAccess(schedule,{folder:{path:dir,access:'read'}});
 assert.doesNotThrow(()=>effectiveScheduleAccess({...saved,source:{...saved.source,exportedAt:'after',exportSha256:'different'}}));
 assert.throws(()=>effectiveScheduleAccess({...saved,source:{...saved.source,manifest:'/other.json'}}),/resources changed/);
});
