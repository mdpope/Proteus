// Synthetic, provider-free reproduction. Does not read the operator's app data.
import {IntegrationHealth} from '../src/services/integrations/integrations.js';
import {PerformanceDiagnostics} from '../src/services/telemetry/performance-diagnostics.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import inspector from 'node:inspector';

const args=process.argv.slice(2),profileAt=args.indexOf('--cpu-profile');
const profileFile=profileAt<0?null:args.splice(profileAt,2)[1];
if(profileAt>=0&&!profileFile)throw Error('--cpu-profile requires a private output path');
const counts=args.length?args.map(Number):[150,300,600];
if(counts.some(n=>!Number.isInteger(n)||n<1||n>2000))throw Error('Use integer run counts from 1 through 2000');
const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-integration-profile-'));
const session=profileFile?new inspector.Session():null;
const post=(method)=>new Promise((resolve,reject)=>session.post(method,(error,result)=>error?reject(error):resolve(result)));
try{
 if(session){session.connect();await post('Profiler.enable');await post('Profiler.start');}
 for(const count of counts){
  const runs=Array.from({length:count},(_,i)=>({id:'synthetic-'+i,title:'Synthetic',schedule:{provider:'synthetic',context:{entries:[],padding:'x'.repeat(27000)},mcpServers:{one:{type:'stdio',command:'synthetic'},two:{type:'stdio',command:'synthetic'}}}}));
  const byId=new Map(runs.map(run=>[run.id,run]));
  let globalScans=0,sessionChecks=0;
  const engine={providers:{synthetic:{hasMcpSession(){sessionChecks++;return false;}}},listRuns(){globalScans++;return runs;},getRun:id=>byId.get(id),running:new Map(),performanceDiagnostics:new PerformanceDiagnostics({enabled:true})};
  const health=new IntegrationHealth(home,{engine});
  let timerFired=false;const sentinel=setTimeout(()=>{timerFired=true;},0),start=performance.now();
  await health.tick();
  console.log(JSON.stringify({mode:'checkout-algorithm',runs:count,consumers:count*2,elapsedMs:Math.round(performance.now()-start),globalScans,sessionChecks,timerFired}));clearTimeout(sentinel);
  // Diagnostic lower-bound control only: no live checks, persistence, recovery or
  // revision races. This is NOT a replacement implementation of tick().
  globalScans=0;sessionChecks=0;timerFired=false;
  const controlTimer=setTimeout(()=>{timerFired=true;},0),controlStart=performance.now();let batch=0;
  for(const row of health.consumers()){
   if(engine.providers[row.provider].hasMcpSession(engine.getRun(row.runId)))throw Error('Unexpected synthetic live session');
   if(++batch%16===0)await new Promise(setImmediate);
  }
  await new Promise(setImmediate);
  console.log(JSON.stringify({mode:'single-scan-yield-control',runs:count,elapsedMs:Math.round(performance.now()-controlStart),globalScans,sessionChecks,timerFired}));clearTimeout(controlTimer);
 }
}finally{
 try{if(session){const {profile}=await post('Profiler.stop');fs.writeFileSync(profileFile,JSON.stringify(profile),{mode:0o600,flag:'wx'});}}
 finally{session?.disconnect();fs.rmSync(home,{recursive:true,force:true});}
}
