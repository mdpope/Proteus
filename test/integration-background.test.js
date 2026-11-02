import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {IntegrationHealth} from '../src/services/integrations/integrations.js';
import {PerformanceDiagnostics} from '../src/services/telemetry/performance-diagnostics.js';
import {privateTemporaryDirectory,hasPrivatePermissions} from '../src/shared/private-paths.cjs';

function fixture(t,dormant=600,live=32){
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-background-'));
 t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const runs=Array.from({length:dormant+live},(_,i)=>({id:'synthetic-'+i,title:'Synthetic',live:i>=dormant,providerSessionId:'session',schedule:{provider:'fake',context:{entries:[],padding:'x'.repeat(27000)},mcpServers:{one:{command:'synthetic'},two:{command:'synthetic'}}}}));
 const byId=new Map(runs.map(run=>[run.id,run]));let scans=0,selections=0,calls=0;
 const provider={sessions:new Map(),hasMcpSession:run=>run.live,selectedMcp:run=>{assert.ok(run.live,'dormant context must not be resolved');selections++;return run.schedule.mcpServers;},mcpStatus:async()=>{calls++;return {servers:[{name:'one',status:'connected'},{name:'two',status:'connected'}]};}};
 const diagnostics=new PerformanceDiagnostics({enabled:true}),engine={listRuns:()=>{scans++;return runs;},getRun:id=>byId.get(id),providers:{fake:provider},running:new Map(),performanceDiagnostics:diagnostics};
 const health=new IntegrationHealth(home,{engine});
 return {health,runs,byId,provider,engine,diagnostics,counts:()=>({scans,selections,calls})};
}

test('slow background replacement yields; concurrent manual state stays ordered and close drains it',async t=>{
 const f=fixture(t,0,1),run=f.runs[0],row=f.health.consumers(run.id)[0];
 const rename=fs.promises.rename;let release,entered=false,closed=false;
 const gate=new Promise(resolve=>release=resolve);
 fs.promises.rename=async(from,to)=>{if(to===f.health.file&&!entered){entered=true;await gate;}return rename.call(fs.promises,from,to);};
 t.after(()=>{fs.promises.rename=rename;release();});
 const background=f.health.persist({background:true});
 for(let i=0;!entered&&i<200;i++)await new Promise(resolve=>setTimeout(resolve,10));
 assert.ok(entered,'write reaches async replacement while the owner loop continues');
 const saved=f.health.save(row.id,{contexts:[{label:'Synthetic manual context'}]},f.health.snapshot().revision);
 assert.equal(typeof saved.then,'function');
 const observed=f.health.observe(run,[{name:'one',status:'connected'}]);
 const closing=f.health.close().then(()=>{closed=true;});await new Promise(setImmediate);assert.equal(closed,false);
 release();await Promise.all([background,saved,observed,closing]);
 const durable=JSON.parse(fs.readFileSync(f.health.file));
 assert.equal(durable.profiles[row.id].contexts[0].label,'Synthetic manual context');
 assert.equal(durable.observations[row.id].connection,'connected');
 assert.equal(hasPrivatePermissions(f.health.file),true,'Background replacement retains private mode or Windows DACL');
 assert.ok(!fs.readdirSync(path.dirname(f.health.file)).some(name=>name.endsWith('.tmp')));
});

test('600 dormant runs and live probes use one inventory and yield during actual work',async t=>{
 const f=fixture(t);let turns=0,done=false;
 const sentinel=()=>{if(!done){turns++;setImmediate(sentinel);}};setImmediate(sentinel);
 await f.health.tick();done=true;
 assert.equal(f.counts().scans,1);assert.equal(f.counts().calls,32);assert.ok(turns>1);
 const report=f.diagnostics.snapshot(),counts=report.integrationBatches.at(-1);
 assert.equal(counts.runs,632);assert.equal(counts.globalEnumerations,1);assert.equal(counts.probed,32);assert.equal(counts.skipped,632);
 assert.ok(report.phases.some(row=>row.name==='integrations.tick'&&row.kind==='async'));
 assert.ok(report.phases.some(row=>row.name==='integrations.batch'&&row.kind==='sync'));
 assert.doesNotMatch(JSON.stringify(report),/synthetic-|padding|session|command/);
});

test('failed async replacement preserves durable state, removes staging and fails Close',async t=>{
 const f=fixture(t,0,1);f.health.persist();const before=fs.readFileSync(f.health.file);
 const rename=fs.promises.rename;fs.promises.rename=async(from,to)=>{if(to===f.health.file)throw Object.assign(Error('Synthetic disk denial'),{code:'EACCES'});return rename.call(fs.promises,from,to);};
 try{
  f.health.data.profiles.synthetic={label:'Not committed'};
  await assert.rejects(f.health.persist({background:true}),/Synthetic disk denial/);
  assert.deepEqual(fs.readFileSync(f.health.file),before);
  assert.ok(!fs.readdirSync(path.dirname(f.health.file)).some(name=>name.endsWith('.tmp')));
  await assert.rejects(f.health.close(),/Synthetic disk denial/);
 }finally{fs.promises.rename=rename;}
});

test('configuration/session changes during a probe discard results and close drains coalesced work',async t=>{
 const f=fixture(t,0,1);let release;
 f.provider.mcpStatus=()=>new Promise(resolve=>{release=()=>resolve({servers:[{name:'one',status:'connected'}]});});
 const ticking=f.health.tick();assert.equal(f.health.tick(),ticking);
 while(!release)await new Promise(setImmediate);
 f.runs[0].schedule.context.padding+='changed';release();await ticking;
 assert.deepEqual(f.health.data.observations,{});
 release=null;const next=f.health.tick();while(!release)await new Promise(setImmediate);
 f.runs[0].live=false;release();await next;assert.deepEqual(f.health.data.observations,{});
 f.runs[0].live=true;release=null;const last=f.health.tick();while(!release)await new Promise(setImmediate);
 let drained=false;const closing=f.health.close().then(()=>{drained=true;});await new Promise(setImmediate);assert.equal(drained,false);
 release();await Promise.all([closing,last]);assert.equal(f.health.pending.size,0);assert.deepEqual(f.health.data.observations,{});
});

test('yield boundaries recheck removed runs, due dates, provider holds and active-turn recovery',async t=>{
 const f=fixture(t,20,1),run=f.runs.at(-1);let calls=0,repairs=0;
 f.provider.mcpStatus=async()=>{calls++;return {servers:[{name:'one',status:'failed'}]};};
 f.provider.mcpRecover=async()=>{repairs++;return {servers:[{name:'one',status:'failed'}]};};
 const rows=f.health.consumers(run.id);f.health.data.observations[rows[1].id]={nextCheckAt:new Date(Date.now()+3600000).toISOString()};
 f.engine.running.set(run.id,{id:run.id});await f.health.tick();assert.equal(repairs,0);assert.equal(calls,1);
 await f.health.tick();assert.equal(calls,1,'future observations are skipped');
 f.health.data.observations={};setImmediate(()=>f.byId.delete(run.id));await f.health.tick();assert.equal(calls,1,'removed run is not probed from the candidate snapshot');
});

test('background diagnostics retain bounded fixed counters only',()=>{
 const diagnostics=new PerformanceDiagnostics({enabled:true});
 for(let i=0;i<50;i++)diagnostics.integrationBackground({runs:Infinity,candidates:1e20,skipped:-8,secret:'PRIVATE_PAYLOAD'});
 const report=diagnostics.snapshot();assert.equal(report.integrationBatches.length,32);assert.equal(report.integrationBatches[0].candidates,1000000);assert.equal(report.integrationBatches[0].skipped,0);assert.doesNotMatch(JSON.stringify(report),/PRIVATE_PAYLOAD|secret/);
});
