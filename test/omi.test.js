import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OmiIntegration, safeOmiMetadata, isOmiSchedule } from '../src/omi.js';
import { ScheduleStore } from '../src/schedules.js';
import { runLocalProcess } from '../src/local-process.js';

function fixture(t, options = {}) {
  const root = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-omi-test-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const state = path.join(root, 'native'), automationRoot = path.join(root, 'automations'), policyRoot = path.join(root, 'policy');
  fs.mkdirSync(state); fs.mkdirSync(automationRoot); fs.mkdirSync(policyRoot);
  for (const file of ['AGENTS.md','agent/transcript-intake.md','agent/omi-transcript-intake.md','plugins/milo/skills/transcript-intake/SKILL.md']) { fs.mkdirSync(path.dirname(path.join(policyRoot,file)), {recursive:true}); fs.writeFileSync(path.join(policyRoot,file), 'Synthetic policy only'); }
  const configPath = path.join(state,'config.json'), workerPath = path.join(state,'omi_worker.py');
  fs.writeFileSync(configPath, JSON.stringify({ state_dir: state, semantic: {wtbos_root:policyRoot} })); fs.writeFileSync(workerPath,'# synthetic, never run');
  const calls = [];
  const omi = new OmiIntegration(path.join(root,'proteus'), { launchdProbe: async () => ({state:'unloaded'}), execute: async options => { calls.push(options); return {exitCode:0}; }, ...options });
  const settings = { ...omi.getSettings(), pipelineRoot: state, pythonPath: process.execPath, workerPath, configPath, automationRoot };
  return { root, state, automationRoot, policyRoot, omi, settings, calls, store: new ScheduleStore(path.join(root,'schedules')) };
}
async function configure(f, enabled = false) { return f.omi.saveSettings({...f.settings,enabled,takeoverConfirmed:enabled}, f.omi.getSettings().revision); }
function automation(f, id, fields = {}) {
  const sourceId = id === 'intake' ? 'cerebro-transcript-intake' : 'cerebro-transcript-follow-up-review';
  const dir = path.join(f.automationRoot, sourceId); fs.mkdirSync(dir,{recursive:true});
  const value = {id:sourceId,name:'Synthetic personal intake',prompt:'PRIVATE synthetic workflow text',status:'ACTIVE',model:'test-model',reasoning_effort:'low',rrule:id === 'intake' ? 'FREQ=HOURLY;INTERVAL=1;BYMINUTE=15;BYSECOND=0':'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU;BYHOUR=20;BYMINUTE=45;BYSECOND=0',cwds:[f.state],...fields};
  fs.writeFileSync(path.join(dir,'automation.toml'),Object.entries(value).map(([key,item])=>`${key} = ${JSON.stringify(item)}`).join('\n'));
  const manifestId=id==='intake'?'cerebro-transcript-intake':'cerebro-transcript-review';fs.mkdirSync(path.join(f.policyRoot,'automations'),{recursive:true});
  fs.writeFileSync(path.join(f.policyRoot,'automations',manifestId+'.json'),JSON.stringify({schema_version:1,id:manifestId,timezone:'America/Denver',schedule:{weekdays:['MO','TU','WE','TH','FR','SA','SU'],hours:id==='intake'?Array.from({length:24},(_,i)=>i):[20],minute:id==='intake'?15:45},prompt:value.prompt,model:value.model,reasoning_effort:value.reasoning_effort}));
}

test('Omi is disabled without touching native files or creating settings', async t => {
  const f=fixture(t); const before=fs.readdirSync(f.state); const data=await f.omi.status();
  assert.equal(data.status.enabled,false); assert.equal(fs.existsSync(f.omi.file),false); assert.deepEqual(fs.readdirSync(f.state),before);
  assert.equal(data.jobs.length,3); assert.ok(data.jobs.every(job=>job.args));
});
test('prepare creates ordinary disabled native and Codex schedules, preserving source policy', async t => {
  const f=fixture(t); automation(f,'intake'); automation(f,'followup'); await configure(f);
  const schedules=f.omi.prepareSchedules(f.store,f.omi.getSettings().revision);
  assert.equal(schedules.length,5); assert.ok(schedules.every(s=>s.enabled===false));
  const intake=schedules.find(s=>s.integration.job==='intake');
  assert.equal(intake.provider,'codex'); assert.equal(intake.cron,'15 * * * *'); assert.match(intake.prompt,/PRIVATE synthetic/); assert.ok(intake.prompt.includes(path.join(f.policyRoot,'plugins/milo/skills/transcript-intake/SKILL.md')));
  assert.equal(f.omi.automationInventory()[0].sourceStatus,'ACTIVE');
  const old=f.store.list()[0]; f.store.save({...old,enabled:true,name:'Edited by operator'},old.revision);
  const prepared=f.omi.prepareSchedules(f.store,f.omi.getSettings().revision); assert.equal(prepared.find(s=>s.id===old.id).name,'Edited by operator'); assert.ok(prepared.every(s=>!s.enabled));
  assert.throws(()=>f.omi.prepareSchedules(f.store,'stale'),/changed/);
});
test('disabled native, imported, replayed and stripped snapshots fail before subprocess', async t => {
  const f=fixture(t); await configure(f); const schedules=f.omi.prepareSchedules(f.store,f.omi.getSettings().revision); const schedule=schedules[0];
  await assert.rejects(f.omi.provider().run({run:{schedule},signal:new AbortController().signal,emit:()=>{}}),/disabled/);
  assert.equal(f.calls.length,0);
  assert.equal(isOmiSchedule({id:'omi-transcript-intake',provider:'codex'}),true);
  await assert.rejects(f.omi.assertRunnable({id:'omi-transcript-intake',provider:'codex',integration:{type:'omi',job:'intake'}}),/disabled/);
});
test('execution reads current settings and refuses active or unknown native ownership', async t => {
  const f=fixture(t); await configure(f,true); const schedule=f.omi.prepareSchedules(f.store,f.omi.getSettings().revision)[0];
  const emit=[]; await f.omi.provider().run({run:{schedule},signal:new AbortController().signal,emit:(...args)=>emit.push(args)});
  assert.equal(f.calls.length,1); assert.deepEqual(f.calls[0].args.slice(1),['--config',f.settings.configPath,'run','--max-jobs','8']); assert.ok(emit.length>=2);
  f.omi.launchdProbe=async()=>({state:'loaded'}); await assert.rejects(f.omi.assertRunnable(schedule),/ownership/);
  f.omi.launchdProbe=async()=>({state:'unknown'}); await assert.rejects(f.omi.assertRunnable(schedule),/ownership/);
  await configure(f,false); await assert.rejects(f.omi.assertRunnable(schedule),/disabled/);
});
test('enable is explicit, revision protected and fails while native service is loaded', async t => {
  const f=fixture(t,{launchdProbe:async()=>({state:'loaded'})});
  await assert.rejects(f.omi.saveSettings({...f.settings,enabled:true},f.omi.getSettings().revision),/Confirm/);
  await assert.rejects(configure(f,true),/ownership/); assert.equal(f.omi.getSettings().enabled,false);
  await assert.rejects(f.omi.saveSettings(f.settings,'bad'),/changed/);
});
test('Codex replacement cannot run until its source automation is paused', async t => {
  const f=fixture(t); automation(f,'intake'); await configure(f); const schedule=f.omi.prepareSchedules(f.store,f.omi.getSettings().revision).find(s=>s.provider==='codex');
  await assert.rejects(f.omi.saveSettings({...f.omi.getSettings(),intakeEnabled:true,intakeTakeoverConfirmed:true},f.omi.getSettings().revision),/paused/);
  automation(f,'intake',{status:'PAUSED'});await f.omi.saveSettings({...f.omi.getSettings(),intakeEnabled:true,intakeTakeoverConfirmed:true},f.omi.getSettings().revision);await f.omi.assertRunnable(schedule);
  automation(f,'intake');await assert.rejects(f.omi.assertRunnable(schedule),/paused/);
  await assert.rejects(f.omi.assertRunnable({...schedule,integration:undefined}),/Unrecognized/);
});
test('changed cadence or missing canonical policy fails before importing', async t => {
  const f=fixture(t); automation(f,'intake',{rrule:'FREQ=MINUTELY'}); await configure(f);
  assert.throws(()=>f.omi.prepareSchedules(f.store,f.omi.getSettings().revision),/changed/); assert.equal(f.store.list().length,0);
  automation(f,'intake'); fs.unlinkSync(path.join(f.policyRoot,'AGENTS.md'));
  assert.throws(()=>f.omi.prepareSchedules(f.store,f.omi.getSettings().revision)); assert.equal(f.store.list().length,0);
});
test('logs and status expose bounded allowlisted metadata, never transcript content', async t => {
  const f=fixture(t); await configure(f); fs.mkdirSync(path.join(f.state,'logs'));
  const secret='PRIVATE-TEXT-OR-TOKEN'; fs.writeFileSync(path.join(f.state,'logs/launchd.out.log'),[`raw ${secret}`,JSON.stringify({free_bytes:1024, transcript:secret, jobs:{done:3,[secret]:10}, errors:[secret],checked_at:'2026-10-03T01:00:00Z'}), JSON.stringify({status:secret}), 'x'.repeat(40000)].join('\n'));
  fs.writeFileSync(path.join(f.state,'status.json'),JSON.stringify({free_bytes:10,state_dir:secret,transcript:secret}));
  const logs=f.omi.logs('audio'); assert.equal(logs.records.length,1); assert.equal(logs.withheld,3); assert.equal(logs.records[0].jobs.done,3); assert.ok(!JSON.stringify(logs).includes(secret));
  const status=await f.omi.status(); assert.ok(!JSON.stringify(status).includes(secret)); assert.equal(status.status.metadata.audio.free_bytes,10);
  assert.throws(()=>f.omi.logs('../config')); assert.throws(()=>f.omi.logs('audio','../../config'));
  assert.deepEqual(safeOmiMetadata({errors:['secret'],controls:{token:'secret',status:'ok'}}),{error_count:1,controls:{status:'ok'}});
});
test('metadata reader rejects symlinks escaping the configured root', async t => {
  const f=fixture(t); await configure(f); fs.writeFileSync(path.join(f.root,'outside.json'),JSON.stringify({free_bytes:123})); fs.symlinkSync(path.join(f.root,'outside.json'),path.join(f.state,'status.json'));
  assert.equal((await f.omi.status()).status.metadata.audio.available,false);
});
test('native process uses argument array and retains only sanitized metadata', async () => {
  const records=[]; await runLocalProcess({command:process.execPath,args:['-e','console.log(JSON.stringify({free_bytes:42,secret:"private"}));console.error("private");'],sanitize:line=>{try{return safeOmiMetadata(JSON.parse(line));}catch{return null;}},onRecord:record=>records.push(record)});
  assert.deepEqual(records,[{stream:'stdout',data:{free_bytes:42}}]);
});
test('native process abort, timeout, nonzero exit and launch errors are bounded', async () => {
  const controller=new AbortController(); const running=runLocalProcess({command:process.execPath,args:['-e','setInterval(()=>{},1000)'],signal:controller.signal,killGraceMs:20}); setTimeout(()=>controller.abort(),30); await assert.rejects(running,/Cancelled/);
  await assert.rejects(runLocalProcess({command:process.execPath,args:['-e','setInterval(()=>{},1000)'],timeoutMs:30,killGraceMs:20}),/time limit/);
  await assert.rejects(runLocalProcess({command:process.execPath,args:['-e','process.exit(2)']}),/exited 2/);
  await assert.rejects(runLocalProcess({command:'/no-such-executable'}),/Could not start/);
});

test('cancellation escalates a stubborn descendant after its parent exits', {skip:process.platform==='win32'}, async () => {
  const controller=new AbortController(); let descendant;
  const source=`const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});process.stdout.write('ready');setInterval(()=>{},1000)"],{stdio:['ignore','pipe','ignore']});child.stdout.once('data',()=>{console.log(child.pid);child.stdout.destroy();});setInterval(()=>{},1000);`;
  await assert.rejects(runLocalProcess({command:process.execPath,args:['-e',source],signal:controller.signal,timeoutMs:5000,killGraceMs:40,sanitize:line=>Number(line),onRecord:({data})=>{descendant=data;controller.abort();}}),/Cancelled/);
  assert.ok(descendant>0);
  let alive=true; for(let n=0;n<50;n++){try{process.kill(descendant,0);}catch(error){if(error.code==='ESRCH'){alive=false;break;}}await new Promise(resolve=>setTimeout(resolve,10));}
  assert.equal(alive,false,'descendant must not outlive cancellation completion');
});

test('general intake works independently of Omi runtime and loaded native services after explicit source cutover',async t=>{
 const f=fixture(t,{launchdProbe:async()=>({state:'loaded'})});automation(f,'intake',{status:'PAUSED'});automation(f,'followup',{status:'PAUSED'});await configure(f);
 await f.omi.saveSettings({...f.omi.getSettings(),workflowRoot:f.policyRoot,intakeEnabled:true,intakeTakeoverConfirmed:true,pipelineRoot:path.join(f.root,'missing-native')},f.omi.getSettings().revision);
 fs.unlinkSync(f.settings.configPath);const schedules=f.omi.prepareSchedules(f.store,f.omi.getSettings().revision,'general');assert.equal(schedules.length,2);assert.ok(schedules.every(s=>s.enabled===false));
 for(const schedule of schedules){await f.omi.assertRunnable(schedule);assert.equal(schedule.timezone,'America/Denver');assert.equal(schedule.integration.area,'general');assert.ok(schedule.integration.sourceId);assert.ok(schedule.integration.manifestId);}
 const native={id:'omi-audio-worker',provider:'local-process',integration:{type:'omi',job:'audio'}};await assert.rejects(f.omi.assertRunnable(native),/disabled/);
 assert.equal(f.calls.length,0);
});
test('area preparation never disables or duplicates the other area and keeps stable identities',async t=>{
 const f=fixture(t);automation(f,'intake');automation(f,'followup');await configure(f);const all=f.omi.prepareSchedules(f.store,f.omi.getSettings().revision);assert.equal(all.length,5);
 const ai=f.store.list().find(s=>s.integration.job==='intake');f.store.save({...ai,enabled:true},ai.revision);
 const native=f.omi.prepareSchedules(f.store,f.omi.getSettings().revision,'omi');assert.equal(native.length,3);assert.equal(f.store.get(ai.id).enabled,true);
 const audio=f.store.list().find(s=>s.id==='omi-audio-worker');f.store.save({...audio,enabled:true},audio.revision);
 const general=f.omi.prepareSchedules(f.store,f.omi.getSettings().revision,'general');assert.equal(general.length,2);assert.equal(f.store.get(audio.id).enabled,true);assert.equal(f.store.list().length,5);
 assert.throws(()=>f.omi.prepareSchedules(f.store,f.omi.getSettings().revision,'unknown'),/Choose/);
});
test('canonical drift and stale imported snapshots fail closed without exposing policy text in status',async t=>{
 const f=fixture(t);automation(f,'intake',{status:'PAUSED'});await configure(f);let settings=f.omi.getSettings();await f.omi.saveSettings({...settings,intakeEnabled:true,intakeTakeoverConfirmed:true},settings.revision);
 const schedule=f.omi.prepareSchedules(f.store,f.omi.getSettings().revision,'general')[0];assert.equal(f.omi.automationInventory()[0].canonicalVerified,true);assert.ok(!JSON.stringify(await f.omi.status()).includes('PRIVATE synthetic'));
 const file=path.join(f.automationRoot,'cerebro-transcript-intake/automation.toml');fs.appendFileSync(file,'\n'); // Formatting alone does not alter policy identity.
 await f.omi.assertRunnable(schedule);
 const stale={...schedule,integration:{...schedule.integration}};delete stale.integration.sourceRevision;await assert.rejects(f.omi.assertRunnable(stale),/legacy snapshot/);
 const manifest=path.join(f.policyRoot,'automations/cerebro-transcript-intake.json'),value=JSON.parse(fs.readFileSync(manifest));fs.writeFileSync(manifest,JSON.stringify({...value,prompt:'Canonical changed'}));
 assert.equal(f.omi.automationInventory()[0].canonicalVerified,false);await assert.rejects(f.omi.assertRunnable(schedule),/differ/);assert.throws(()=>f.omi.prepareSchedules(f.store,f.omi.getSettings().revision,'general'),/differ/);
 automation(f,'intake',{status:'PAUSED',prompt:'Updated canonical and installed source'});await assert.rejects(f.omi.assertRunnable(schedule),/source changed/);assert.throws(()=>f.omi.prepareSchedules(f.store,f.omi.getSettings().revision,'general'),/changed source/);
});
test('legacy settings default the general gate off; preparing old snapshots preserves edits and adds source identity',async t=>{
 const f=fixture(t);automation(f,'intake');await configure(f);const old=JSON.parse(fs.readFileSync(f.omi.file));delete old.intakeEnabled;delete old.intakeTakeoverConfirmed;delete old.workflowRoot;fs.writeFileSync(f.omi.file,JSON.stringify(old));
 assert.equal(f.omi.getSettings().intakeEnabled,false);f.omi.prepareSchedules(f.store,f.omi.getSettings().revision,'general');const source=f.store.list()[0];const integration={...source.integration};delete integration.sourceRevision;
 const saved=f.store.save({...source,name:'Operator label',integration},source.revision);const migrated=f.omi.prepareSchedules(f.store,f.omi.getSettings().revision,'general')[0];assert.equal(migrated.id,saved.id);assert.equal(migrated.name,'Operator label');assert.ok(migrated.integration.sourceRevision);assert.equal(migrated.enabled,false);
 await assert.rejects(f.omi.assertRunnable({...migrated,integration:undefined}),/disabled/);
});
