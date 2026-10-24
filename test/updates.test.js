import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {Engine} from '../src/engine.js';
import {Updates} from '../src/services/updates/updates.js';
const {tree,atomic,readJob,writeJob,spaceBudget,packagePaths}=createRequire(import.meta.url)('../desktop/updates/update-package.cjs');
const {supervise}=createRequire(import.meta.url)('../desktop/updates/update-helper.cjs');
test('helper readiness releases IPC before handoff while the independent helper stays alive',async t=>{
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-helper-ipc-')),home=path.join(root,'data'),bundle=path.join(root,'candidate'),helper=path.join(bundle,'resources/app/desktop/updates/update-helper.cjs'),job=path.join(root,'job.json');
 fs.mkdirSync(home);fs.mkdirSync(path.dirname(helper),{recursive:true});
 fs.writeFileSync(helper,`const fs=require('node:fs');const file=process.argv[3];fs.writeFileSync(file+'.pid',String(process.pid));process.on('disconnect',()=>fs.writeFileSync(file+'.detached','yes'));process.send({ready:'synthetic-helper'});setInterval(()=>{},1000);`);
 let helperPid,parent;
 t.after(()=>{parent?.kill('SIGKILL');try{helperPid||=Number(fs.readFileSync(job+'.pid','utf8'));if(helperPid)process.kill(helperPid,'SIGTERM');}catch{}fs.rmSync(root,{recursive:true,force:true});});
 const script=`import {Updates} from ${JSON.stringify(new URL('../src/services/updates/updates.js',import.meta.url).href)};const u=new Updates({home:${JSON.stringify(home)},engine:{}},{platform:'linux'});await u.spawnHelper({id:'synthetic-helper',file:${JSON.stringify(job)},candidate:{bundle:${JSON.stringify(bundle)},executable:process.execPath}},true);await new Promise(r=>setTimeout(r,200));u.close();`;
 parent=spawn(process.execPath,['--input-type=module','-e',script],{stdio:['ignore','pipe','pipe']});let errors='';parent.stderr.on('data',chunk=>errors+=chunk);
 const code=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Helper IPC kept the parent alive')),4000);parent.once('error',reject);parent.once('exit',code=>{clearTimeout(timer);resolve(code);});});
 helperPid=Number(fs.readFileSync(job+'.pid','utf8'));assert.equal(code,0,errors);assert.equal(fs.readFileSync(job+'.detached','utf8'),'yes');assert.doesNotThrow(()=>process.kill(helperPid,0),'helper remains independent after the host closes');
});
function fixture(t){
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-updates-')),home=path.join(root,'data'),installation=path.join(root,'installed'),candidate=path.join(root,'candidate');
 for(const dir of [home,installation,candidate])fs.mkdirSync(dir);fs.writeFileSync(path.join(installation,'identity'),'old');fs.writeFileSync(path.join(candidate,'identity'),'new');
 const inspect=bundle=>{const old=fs.readFileSync(path.join(bundle,'identity'),'utf8')==='old';return {bundle,executable:path.join(bundle,'Proteus'),sourceFingerprint:(old?'a':'b').repeat(64),buildRevision:old?'baseline':'candidate',version:'synthetic',signing:{kind:'synthetic'},...tree(bundle)};};
 const engine=new Engine(home),service={home,engine,catalogs:{},notify(){},windowCount:()=>1},calls=[];
 const controller=new Updates(service,{installation,browserHome:home,packaged:true,platform:'linux',inspect,test:async candidate=>({passed:true,hash:candidate.hash}),launchHelper:job=>calls.push(job),quit:()=>calls.push('quit')});
 t.after(async()=>{await controller.close();await engine.close();fs.rmSync(root,{recursive:true,force:true,maxRetries:10});});
 atomic(controller.policyFile,{schemaVersion:1,home:controller.ownerHome,installation:controller.installation,auditedAt:new Date().toISOString(),generations:[]});
 const run=engine.createRun({schemaVersion:1,id:'update-chat',name:'Synthetic update',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic; no model called.'},'chat',null,{deferStart:true});run.status='completed';delete run.deferredStart;engine.persist(run);
 return {root,home,installation,candidate,inspect,engine,service,controller,calls,run};
}
async function prepare(f){return (await f.controller.handle({action:'prepare',candidate:f.candidate,sourceFingerprint:'b'.repeat(64)},f.run.id)).job;}
async function handoff(f,job){return f.controller.handle({action:'handoff',id:job.id,expectedRevision:job.revision,checkpoint:'Completed synthetic checks. Verify the restored app and remaining work.'},f.run.id);}

test('installed baseline helper path still arms the organized helper and acknowledges readiness',async t=>{
 const f=fixture(t);await prepare(f);const job=readJob(f.controller.file);
 writeJob(job.file,{phase:'waiting-for-idle'});
 const child=spawn(process.execPath,[new URL('../desktop/update-helper.cjs',import.meta.url).pathname,'arm',job.file],{stdio:['ignore','ignore','pipe','ipc']});
 t.after(()=>{try{child.kill('SIGKILL');}catch{}});
 let errors='';child.stderr.on('data',chunk=>errors+=chunk);
 const exited=new Promise(resolve=>child.once('exit',resolve));
 const ready=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Legacy helper launcher did not acknowledge readiness: '+errors)),4000);
  child.once('message',message=>{clearTimeout(timer);resolve(message);});
  child.once('error',error=>{clearTimeout(timer);reject(error);});
  child.once('exit',code=>{clearTimeout(timer);reject(Error('Legacy helper exited early: '+code+' '+errors));});
 });
 assert.equal(ready.ready,job.id);
 assert.equal(readJob(job.file).helperPid,child.pid);
 writeJob(job.file,{phase:'cancelled'});
 const code=await Promise.race([exited,new Promise(resolve=>{const timer=setTimeout(()=>resolve('timeout'),4000);timer.unref();})]);
 assert.equal(code,1,errors);assert.match(errors,/cancelled before shutdown/);
});

test('Engine Room can update without a model chat and still waits for unrelated active work',async t=>{
 const f=fixture(t),job=(await f.controller.handle({action:'prepare',candidate:f.candidate,sourceFingerprint:'b'.repeat(64)})).job;
 await f.controller.handle({action:'handoff',id:job.id,expectedRevision:job.revision});assert.equal(f.controller.job().runId,null);
 f.run.status='running';await f.controller.advance();assert.equal(f.calls.length,0);
 f.run.status='completed';await f.controller.advance();assert.ok(f.calls.includes('quit'));
 const saved=writeJob(f.controller.file,{phase:'verifying'}),before=JSON.stringify(f.run.events);
 // A successful compatible rollback uses the original installed identity.
 const result=await f.controller.recovery({action:'resume',id:saved.id,secret:saved.secret,outcome:'rollback'});
 assert.equal(result.accepted,true);assert.equal(result.delivery.kind,'desktop');assert.equal(f.engine.updateBarrier,false);assert.equal(JSON.stringify(f.run.events),before);
});
test('handoff waits for a settled turn, records authorization and never quits inside the tool call',async t=>{
 const f=fixture(t),job=await prepare(f);f.run.status='running';f.engine.persist(f.run);await handoff(f,job);assert.equal(f.calls.length,0);await f.controller.advance();assert.equal(f.calls.length,0);assert.match(f.controller.status().job.blocker,/running/);
 f.run.status='completed';f.engine.persist(f.run);await f.controller.advance();assert.equal(f.calls.length,2);assert.equal(f.calls[0].phase,'waiting-for-idle');assert.equal(readJob(f.controller.file).phase,'stopping');assert.equal(f.calls[1],'quit');assert.equal(f.engine.updateBarrier,true);assert.ok(readJob(f.controller.file).authorization.at);
});
test('new input before handoff cancels the checkpoint; durable recovery input stays queued behind the barrier',async t=>{
 const f=fixture(t);await handoff(f,await prepare(f));f.controller.newInput();assert.equal(f.controller.status().job.phase,'prepared');assert.equal(f.engine.updateBarrier,false);
 const job=f.controller.status().job;await handoff(f,job);await f.controller.advance();writeJob(f.controller.file,{phase:'verifying'});
 await f.engine.send(f.run.id,'User message arriving during verified restart','queue','synthetic-user');assert.equal(f.run.status,'queued');assert.equal(f.engine.running.size,0);assert.equal(f.run.events.at(-1).text,'User message arriving during verified restart');
});
test('verified restart and rollback queue the same original chat exactly once and preserve ordering',async t=>{
 const f=fixture(t);await handoff(f,await prepare(f));await f.controller.advance();const job=writeJob(f.controller.file,{phase:'verifying'});
 await f.engine.send(f.run.id,'New input first','queue','new-input');
 const args={action:'resume',id:job.id,secret:job.secret,outcome:'rollback'};
 const first=await f.controller.recovery(args),second=await f.controller.recovery(args);assert.equal(first.accepted,true);assert.equal(second.accepted,true);
 assert.equal(f.run.events.filter(event=>event.data?.delivery?.id===job.continuationId).length,1);assert.equal(f.run.id,job.runId);assert.ok(f.run.events.findIndex(event=>event.data?.delivery?.id==='new-input')<f.run.events.findIndex(event=>event.data?.delivery?.id===job.continuationId));assert.match(f.run.events.find(event=>event.data?.delivery?.id===job.continuationId).text,/compatible rollback/);assert.equal(f.engine.updateBarrier,false);
});
test('recovery preserves changed permission/session boundaries and refuses ambiguous delivery replay',async t=>{
 const f=fixture(t);await handoff(f,await prepare(f));await f.controller.advance();const job=writeJob(f.controller.file,{phase:'verifying'});f.run.chatPermissionRevision='new-permissions';f.engine.persist(f.run);
 const result=await f.controller.recovery({action:'resume',id:job.id,secret:job.secret});assert.equal(result.ambiguous,true);assert.equal(f.run.events.length,1);assert.equal(f.engine.updateBarrier,true);
});
test('independent supervisor verifies recovery data, rolls back once and resumes without restoring old data over new state',async t=>{
 const f=fixture(t);await handoff(f,await prepare(f));await f.controller.advance();const job=writeJob(f.controller.file,{ownerPid:99999999});let verifications=0,resumed;
 await supervise(job.file,{inspect:f.inspect,request:async()=>{},launchApp:()=>({}),verify:async(job,identity)=>{verifications++;fs.writeFileSync(path.join(f.home,'new-record'),'retained across compatible rollback');if(identity.buildRevision==='candidate')throw Error('Synthetic failed health');return {at:new Date().toISOString()};},resumeChat:async(job,outcome)=>{resumed={job,outcome};return writeJob(job.file,{phase:'complete',outcome});}});
 assert.equal(verifications,2);assert.equal(resumed.outcome,'rollback');assert.equal(fs.readFileSync(path.join(f.installation,'identity'),'utf8'),'old');assert.equal(fs.readFileSync(path.join(f.home,'new-record'),'utf8'),'retained across compatible rollback');
 const generation=path.join(job.recoveryRoot,job.id),receipt=JSON.parse(fs.readFileSync(path.join(generation,'recovery.json'),'utf8'));assert.equal(receipt.verified,true);assert.equal(fs.readdirSync(job.recoveryRoot).length,1);assert.equal(readJob(job.file).phase,'complete');
});

test('a restarted supervisor reconciles an interrupted atomic app replacement without another data snapshot',async t=>{
 const f=fixture(t);await handoff(f,await prepare(f));await f.controller.advance();let job=readJob(f.controller.file);
 const recovery=path.join(job.recoveryRoot,job.id),replacement=f.installation+'.next-'+job.id;fs.mkdirSync(recovery,{recursive:true});fs.renameSync(f.installation,path.join(recovery,'Proteus.app'));fs.cpSync(job.candidate.bundle,replacement,{recursive:true});
 fs.cpSync(f.home,path.join(recovery,'data-0'),{recursive:true});
 job=writeJob(job.file,{phase:'installing',recovery,replacement,ownerPid:99999999,recoveryData:[{root:f.home,...tree(f.home)}],freeSpaceBefore:0});let launches=0;
 await supervise(job.file,{inspect:f.inspect,launchApp:()=>{launches++;return {};},verify:async()=>({at:new Date().toISOString()}),resumeChat:async job=>writeJob(job.file,{phase:'complete'})});
 assert.equal(launches,1);assert.equal(fs.readFileSync(path.join(f.installation,'identity'),'utf8'),'new');assert.equal(fs.readdirSync(recovery).filter(name=>name.startsWith('data')).length,1);assert.equal(readJob(job.file).phase,'complete');
 await supervise(job.file,{inspect:()=>{throw Error('A completed replacement must not run again.');}});
});

test('snapshot failure restarts the unchanged baseline and reports failure through the original continuation',{skip:process.platform==='win32'},async t=>{
 const f=fixture(t);await handoff(f,await prepare(f));await f.controller.advance();const job=writeJob(f.controller.file,{ownerPid:99999999});
 const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(path.join(f.home,'unknown.sock'),resolve);});t.after(()=>new Promise(resolve=>server.close(resolve)));
 let launches=0,verified=0,resumes=0;
 await supervise(job.file,{inspect:f.inspect,launchApp:()=>{launches++;assert.equal(fs.readFileSync(path.join(f.installation,'identity'),'utf8'),'old');return {};},verify:async(j,identity)=>{verified++;assert.equal(identity.hash,job.previous.hash);assert.equal(j.failedBeforeReplacement,true);return {at:new Date().toISOString()};},resumeChat:async(j,outcome)=>{
  resumes++;assert.equal(outcome,'rollback');assert.match(j.checkpoint,/failed before application replacement.*unknown.sock/);
  const args={action:'resume',id:j.id,secret:j.secret,outcome};await f.controller.recovery(args);await f.controller.recovery(args);
  return writeJob(j.file,{phase:'complete',outcome});
 }});
 assert.equal(launches,1);assert.equal(verified,1);assert.equal(resumes,1);
 const saved=readJob(job.file);assert.equal(saved.failedBeforeReplacement,true);assert.match(saved.preInstallFailure.error,/unknown.sock/);assert.equal(saved.recovery,null);
 assert.match(f.controller.status().job.error,/unknown.sock/);
 const messages=f.run.events.filter(e=>e.data?.delivery?.id===job.continuationId);assert.equal(messages.length,1);assert.match(messages[0].text,/update failed before replacement; previous app restarted/);
 await supervise(job.file,{inspect:()=>{throw Error('Completed failed-preflight recovery must not run again.');}});
});
test('helper readiness failure leaves the host running and releases the final barrier',async t=>{
 const f=fixture(t);f.controller.launchHelper=()=>{throw Error('Synthetic runtime cannot launch.');};await handoff(f,await prepare(f));await assert.rejects(f.controller.advance(),/cannot launch/);assert.equal(f.controller.status().job.phase,'prepared');assert.equal(f.engine.updateBarrier,false);assert.equal(f.calls.length,0);
});
test('recovery barrier retains queued user input across process restart and dispatches only after release',async t=>{
 const f=fixture(t);f.engine.updateBarrier=true;await f.engine.send(f.run.id,'Retain this exact input','queue','retained-before-restart');await f.engine.close();
 const next=new Engine(f.home,{rehearsal:{run:async({emit})=>emit('assistant','Synthetic immediate provider; no model called.'),close(){}}},undefined,{recoveryBarrier:true});t.after(()=>next.close());const restored=next.getRun(f.run.id);assert.equal(restored.status,'queued');await next.drain();assert.equal(next.running.size,0);assert.equal(restored.nextPrompt,'Retain this exact input');next.updateBarrier=false;await next.drain();await Promise.all([...next.executions]);assert.equal(restored.status,'completed');assert.equal(restored.events.filter(event=>event.data?.delivery?.id==='retained-before-restart').length,1);
});
test('recovery health verifies every prior chat prefix while permitting new queued events',async t=>{
 const f=fixture(t);await handoff(f,await prepare(f));await f.controller.advance();const job=writeJob(f.controller.file,{phase:'verifying'});
 await f.engine.send(f.run.id,'New queued input','queue','preservation-new-input');
 const healthy=await f.controller.recovery({action:'verify',id:job.id,secret:job.secret});assert.deepEqual(healthy.preservation,{runs:1,events:1});
 f.run.events[0].text='Synthetic corruption of original event';f.engine.persist(f.run);
 await assert.rejects(f.controller.recovery({action:'verify',id:job.id,secret:job.secret}),/event history/);assert.equal(f.engine.updateBarrier,true);
});
test('update budgets sum copies on one volume and independently reject a full recovery volume',()=>{
 const options={exists:()=>true,stat:file=>({dev:file.startsWith('/recovery')?2:1}),statfs:file=>({bavail:file.startsWith('/recovery')?50:100,bsize:1}),reserve:10};
 const same=spaceBudget([{directory:'/install',bytes:30},{directory:'/stage',bytes:40}],options);assert.equal(same.length,1);assert.equal(same[0].needed,80);
 assert.throws(()=>spaceBudget([{directory:'/install',bytes:1},{directory:'/recovery',bytes:41}],options),/not enough space/);
});
test('attention recovery can release ordinary work only from a verified desktop app without replay',async t=>{
 const f=fixture(t);await handoff(f,await prepare(f));await f.controller.advance();let job=writeJob(f.controller.file,{phase:'attention',error:'Synthetic ambiguous continuation'});
 f.service.updateUIHealth=async()=>false;await assert.rejects(f.controller.handle({action:'resume-work',id:job.id,expectedRevision:job.revision}),/verification/);assert.equal(f.engine.updateBarrier,true);
 f.service.updateUIHealth=async()=>true;await f.controller.handle({action:'resume-work',id:job.id,expectedRevision:job.revision});assert.equal(f.engine.updateBarrier,false);job=readJob(f.controller.file);assert.equal(job.phase,'attention');assert.ok(job.ordinaryWorkResumedAt);assert.equal(f.run.events.length,1);
});
test('Linux supervised packaging uses the actual lowercase executable',t=>{
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-update-paths-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(path.join(root,'resources/app'),{recursive:true});fs.writeFileSync(path.join(root,'resources/app/package.json'),'{}');assert.equal(packagePaths(root,'linux').executable,path.join(root,'proteus'));
});
test('cancelled update staging retires before another preparation while receipts remain available',async t=>{
 const f=fixture(t),job=await prepare(f),file=f.controller.file,bundle=readJob(file).candidate.bundle;
 const cancelled=await f.controller.handle({action:'cancel',id:job.id,expectedRevision:job.revision});
 assert.equal(cancelled.job.phase,'cancelled');assert.equal(fs.existsSync(bundle),false);assert.equal(fs.existsSync(file),true);assert.ok(readJob(file).stagingRetirement.at);
 const next=await prepare(f);assert.notEqual(next.id,job.id);assert.equal(readJob(file).phase,'cancelled');
 const inventory=await f.controller.handle({action:'storage'});assert.equal(inventory.dryRun,true);assert.equal(inventory.jobs.length,2);assert.equal(inventory.jobs.filter(row=>row.files>0).length,1);
});
test('cancellation does not race an in-flight helper readiness check',async t=>{
 const f=fixture(t),job=await prepare(f);f.controller.busy=true;
 await assert.rejects(f.controller.handle({action:'cancel',id:job.id,expectedRevision:job.revision}),/check is running/);
 assert.equal(readJob(f.controller.file).phase,'prepared');assert.equal(fs.existsSync(readJob(f.controller.file).candidate.bundle),true);f.controller.busy=false;
});
test('package workers are bounded and shutdown waits for queued work without starting more',async t=>{
 const f=fixture(t);f.controller.packageQueue=new Promise(resolve=>setTimeout(resolve,20));
 const pending=Array.from({length:4},()=>f.controller.packageWork('inventoryStorage',f.controller.root,{home:f.home,installation:f.installation}).catch(error=>error.message));
 await assert.rejects(f.controller.packageWork('inventoryStorage',f.controller.root),/busy/);
 await f.controller.close();assert.deepEqual(await Promise.all(pending),Array(4).fill('The updater is closing.'));assert.equal(f.controller.packagePending,0);
});
