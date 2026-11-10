import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const {dataOwner,settledRecovery}=createRequire(import.meta.url)('../desktop/updates/recovery-quiescence.cjs');
function clock(){let time=0;return {now:()=>time,sleep:async ms=>{time+=ms;}};}
test('late shutdown writes reset the quiet interval before capture',async()=>{
 const c=clock();let calls=0;const rows=await settledRecovery(['home'],[{}],{...c,quietMs:500,intervalMs:250,released:()=>true,inspect:()=>({hash:++calls<3?'old':'flushed'})});assert.equal(rows[0].hash,'flushed');assert.equal(calls,5);
});
test('an owner reclaim aborts without returning a capture',async()=>{
 const c=clock();let checks=0;await assert.rejects(settledRecovery(['home'],[{}],{...c,released:()=>++checks<4,inspect:()=>({hash:'same'})}),/live owner reclaimed/);
});
test('a continuously changing source fails within the bound',async()=>{
 const c=clock();let revision=0;await assert.rejects(settledRecovery(['home'],[{}],{...c,quietMs:500,timeoutMs:1000,intervalMs:250,released:()=>true,inspect:()=>({hash:String(++revision)})}),/did not become quiescent/);assert.equal(c.now(),1000);
});
test('a cold baseline longer than one minute still requires and accepts a complete matching scan',async()=>{
 let time=0,calls=0;
 const progress=[];
 const rows=await settledRecovery(['home'],[{}],{
  now:()=>time,sleep:async ms=>{time+=ms;},released:()=>true,
  inspect:()=>{calls++;time+=70000;return {hash:'unchanged'};},
  onProgress:row=>progress.push(row)
 });
 assert.equal(rows[0].hash,'unchanged');
 assert.equal(calls,2);
 assert.equal(progress[0].matchedPrevious,false);
 assert.equal(progress[1].stage,'verified');
 assert.equal(progress[1].scanMs,70000);
 assert.equal(progress[1].elapsedMs,140250);
 assert.equal(progress[1].budgetMs,212250);
});
test('slow changing profiles exhaust the measured settlement budget and retain timing evidence',async()=>{
 let time=0,calls=0;
 const progress=[];
 await assert.rejects(settledRecovery(['home'],[{}],{
  now:()=>time,sleep:async ms=>{time+=ms;},released:()=>true,
  inspect:()=>{time+=70000;return {hash:String(++calls)};},
  onProgress:row=>progress.push(row)
 }),/Completed 5 scans.*last scan 70000 ms/);
 assert.equal(calls,5);
 assert.equal(progress.at(-1).stage,'timed-out');
 assert.equal(progress.at(-1).matchedPrevious,false);
});
test('a comparison completed after the settlement deadline cannot report success',async()=>{
 let time=0,calls=0;
 const progress=[];
 await assert.rejects(settledRecovery(['home'],[{}],{
  timeoutMs:1000,quietMs:500,now:()=>time,sleep:async ms=>{time+=ms;},released:()=>true,
  inspect:()=>{if(++calls>1)time+=2000;return {hash:'same'};},
  onProgress:row=>progress.push(row)
 }),/did not become quiescent/);
 assert.equal(progress.at(-1).stage,'timed-out');
 assert.equal(progress.at(-1).matchedPrevious,true);
});
test('only a live owner blocks baseline recovery; invalid locks remain protected',t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-owner-lock-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));const file=path.join(home,'runner.lock');assert.equal(dataOwner(home,{alive:()=>false}),null);fs.writeFileSync(file,'123');assert.equal(dataOwner(home,{alive:()=>false}),null);assert.equal(fs.readFileSync(file,'utf8'),'123');assert.equal(dataOwner(home,{alive:()=>true}),123);fs.writeFileSync(file,'invalid');assert.throws(()=>dataOwner(home,{alive:()=>false}),/invalid/);assert.equal(fs.readFileSync(file,'utf8'),'invalid');
});

const {supervisorOwnsCapture}=createRequire(import.meta.url)('../desktop/updates/pre-owner-gate.cjs');
test('reopening during capture cannot claim the data home; verified candidate launch remains available',()=>{
 const options={home:'/data',installation:'/app',alive:()=>true},job={home:'/data',installation:'/app',helperPid:12};
 for(const phase of ['stopping','backing-up','installing','recovering'])assert.equal(supervisorOwnsCapture({...job,phase},options),true);
 for(const phase of ['prepared','waiting-for-idle','verifying','awaiting-chat-resume','attention','complete'])assert.equal(supervisorOwnsCapture({...job,phase},options),false);
 assert.equal(supervisorOwnsCapture({...job,phase:'backing-up'},{...options,alive:()=>false}),false);
 assert.throws(()=>supervisorOwnsCapture({...job,home:'/other',phase:'backing-up'},options),/does not match/);
});
