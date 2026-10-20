// Synthetic acceptance only: isolated home, worker ticks and a deliberate diagnostic stall.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-scheduler-ui-')));
fs.mkdirSync(path.join(home,'schedules'));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
fs.writeFileSync(path.join(home,'scheduler.json'),JSON.stringify({lastPoll:new Date().toISOString(),slots:{},syntheticExtension:{retained:true}}));
for(let i=0;i<20;i++)fs.writeFileSync(path.join(home,'schedules',`synthetic-${i}.json`),JSON.stringify({schemaVersion:1,id:`synthetic-${i}`,name:'Synthetic scheduler fixture',enabled:false,cron:'0 9 * * 1-5',timezone:'America/Denver',provider:'rehearsal',model:'',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic only.'}));
const bundle=process.argv[2]&&path.resolve(process.argv[2]);let app;
try{
 app=await electron.launch({...(bundle?{executablePath:path.join(bundle,'Contents/MacOS/Proteus')}:{}),args:[...(bundle?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 const result=await app.evaluate(async({app})=>{
  const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
  await service.engine.tick();let pulses=0;const timer=setInterval(()=>pulses++,5);
  try{
   // Multiple callers must share/serialize a poll, with shutdown retaining the final checkpoint.
   await Promise.all(Array.from({length:12},()=>service.engine.tick()));
   await new Promise(resolve=>setTimeout(resolve,25));
   const before=service.performanceDiagnostics.snapshot();
   // Align a synthetic stall across the next watchdog deadline.
   await new Promise(resolve=>setTimeout(resolve,220));
   service.performanceDiagnostics.measureSync('scheduler.permissions',()=>{const end=performance.now()+400;while(performance.now()<end){/* deliberate synthetic stall */}});
   await new Promise(resolve=>setTimeout(resolve,700));
   const after=service.performanceDiagnostics.snapshot();
   return {pulses,before,after,scheduler:service.engine.schedulerWorker?.diagnostics(),runs:service.engine.listRuns().length};
  }finally{clearInterval(timer);}
 });
 assert.ok(result.pulses>0);assert.equal(result.runs,0);assert.ok(result.after.slowPhases.some(p=>p.name==='scheduler.permissions'&&p.kind==='sync'&&p.durationMs>=390));assert.ok(result.after.eventLoop.some(e=>e.kind==='lag'&&e.synchronousPhases.some(p=>p.name==='scheduler.permissions')));assert.ok(JSON.stringify(result.after).length<256000);
 await page.locator('[data-page="runs"]').click();await page.locator('#topbar-home').waitFor();
 await app.close();app=null;
 const journal=JSON.parse(fs.readFileSync(path.join(home,'scheduler.json'),'utf8'));assert.deepEqual(journal.syntheticExtension,{retained:true});
 const diagnostics=JSON.parse(fs.readFileSync(path.join(home,'diagnostics/performance.json'),'utf8'));
 assert.ok(JSON.stringify(diagnostics).includes('scheduler.permissions'));
 console.log(JSON.stringify({passed:true,synthetic:true,worker:result.scheduler,uiResponsiveAfterStall:true,unknownCheckpointFieldsPreserved:true,diagnosticsWritten:true,diagnostics:result.after}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
