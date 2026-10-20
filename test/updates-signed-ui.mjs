// Opt-in, real packaged runtime/helper acceptance against disposable installation/data paths.
// Mac verifies signing; Linux verifies packaged source and whole-bundle hashes.
import {_electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{inspectPackage,atomic,readJob}=require('../desktop/update-package.cjs');
const mac=process.platform==='darwin',identityLabel=mac?'signed':'hashed';
const [baselinePath,candidatePath]=process.argv.slice(2);if(!baselinePath||!candidatePath)throw Error('Pass a helper-capable packaged baseline and a different packaged candidate. Only disposable copies are installed.');
const baseline=inspectPackage(path.resolve(baselinePath)),candidate=inspectPackage(path.resolve(candidatePath)),rollback=process.argv.includes('--rollback'),live=process.argv.includes('--live-provider'),configuredOwner=!process.argv.includes('--fresh-owner');
// Large package copies can use disk without lengthening Chromium's TMPDIR socket paths.
const fixtureRoot=process.env.PROTEUS_UPDATE_TEST_ROOT||os.tmpdir();if(!path.isAbsolute(fixtureRoot))throw Error('Use an absolute disposable update fixture root.');
const root=fs.realpathSync(fs.mkdtempSync(path.join(fixtureRoot,'proteus-packaged-update-'))),home=path.join(root,'data'),browser=path.join(root,'browser'),installation=path.join(root,mac?'Proteus.app':'Proteus');
fs.mkdirSync(home);fs.cpSync(baseline.bundle,installation,{recursive:true,verbatimSymlinks:true,preserveTimestamps:true});
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:root,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const inherited=['PATH','HOME','USER','LOGNAME','SHELL','LANG','LC_ALL','DISPLAY','WAYLAND_DISPLAY','XAUTHORITY','XDG_RUNTIME_DIR','DBUS_SESSION_BUS_ADDRESS','TMPDIR','TMP','TEMP'];
const isolatedEnv=Object.fromEntries(inherited.filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]));
// Every helper relaunch inherits this disposable user home, even when its
// launch environment deliberately drops provider-specific CLI overrides.
const fixtureUserHome=path.join(root,'user-home');if(!live)fs.mkdirSync(fixtureUserHome);
if(!live)Object.assign(isolatedEnv,{HOME:fixtureUserHome,COPILOT_HOME:path.join(root,'copilot'),COPILOT_CLI_PATH:path.join(root,'no-copilot'),PROTEUS_CODEX_PATH:path.join(root,'no-codex'),PROTEUS_CLAUDE_PATH:path.join(root,'no-claude'),CLAUDE_CONFIG_DIR:path.join(root,'claude')});
const launchEnv=live?{...process.env,PROTEUS_HOME:home,PORT:'0'}:{...isolatedEnv,PROTEUS_HOME:home,PORT:'0'};
const launchArgs=[mac?'--use-mock-keychain':'--password-store=basic',...(process.platform==='linux'&&process.env.PROTEUS_TEST_OZONE_PLATFORM==='x11'?['--ozone-platform=x11']:[]),'--user-data-dir='+browser];
let app,ownedPid,jobFile,passed=false;
const wait=async(fn,label,ms=180000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,300));}throw Error('Timed out: '+label);};
const alive=pid=>{if(!Number.isSafeInteger(pid)||pid<1||pid===process.pid)return false;try{process.kill(pid,0);if(process.platform==='linux'&&fs.readFileSync('/proc/'+pid+'/stat','utf8').match(/\) ([A-Z]) /)?.[1]==='Z')return false;return true;}catch(error){if(['ESRCH','ENOENT'].includes(error.code))return false;throw error;}};
const stopOwned=async pid=>{if(!alive(pid))return;process.kill(pid,'SIGTERM');for(let n=0;n<80&&alive(pid);n++)await new Promise(resolve=>setTimeout(resolve,100));if(alive(pid))process.kill(pid,'SIGKILL');for(let n=0;n<20&&alive(pid);n++)await new Promise(resolve=>setTimeout(resolve,100));if(alive(pid))throw Error('Disposable update child did not exit: '+pid);};
const receipt=path.join(root,'receipt');fs.mkdirSync(receipt,{mode:0o700});
let cleanupPending;
const cleanup=()=>cleanupPending??=(async()=>{
 // Only PIDs obtained from this private fixture's owner connection/job are touched.
 const ownerPids=new Set([ownedPid]),helperPids=new Set();
 try{ownerPids.add(JSON.parse(fs.readFileSync(path.join(home,'connection.json'))).pid);}catch{}
 try{const job=readJob(jobFile);helperPids.add(job.helperPid);ownerPids.add(job.launchPid);ownerPids.add(job.health?.identity?.pid);}catch{}
 try{helperPids.add(Number(fs.readFileSync(path.join(root,'health-failure-helper.cjs.pid'),'utf8')));}catch{}
 for(const pid of helperPids)await stopOwned(pid);for(const pid of ownerPids)await stopOwned(pid);
 if(app){let timer;await Promise.race([app.close().catch(()=>{}),new Promise(resolve=>timer=setTimeout(resolve,3000))]);clearTimeout(timer);}
})();
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{atomic(path.join(receipt,'interrupted.json'),{signal,at:new Date().toISOString()});void cleanup().finally(()=>process.exit(130));});
const request=async(route,body)=>{const c=JSON.parse(fs.readFileSync(path.join(home,'connection.json'))),response=await fetch(c.origin+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(body?.action==='prepare'?120000:10000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Owner request failed');return result;};
const rehearsalReplies=new Set();
const settleRehearsal=async run=>{if(!live&&run.schedule.provider==='rehearsal'&&run.status==='awaiting_input'&&run.pending?.type==='question'&&run.pending.question==='This sample run needs feedback. What should the next checkpoint focus on?'&&!rehearsalReplies.has(run.pending.id)){await request('/api/runs/'+run.id+'/reply',{requestId:run.pending.id,answer:'Explicit synthetic updater feedback. No model or external workflow was called.'});rehearsalReplies.add(run.pending.id);}};
try{
 app=await _electron.launch({executablePath:inspectPackage(installation).executable,args:launchArgs,env:launchEnv,timeout:60000});ownedPid=app.process().pid;app.process().stderr.on('data',chunk=>fs.appendFileSync(path.join(root,'baseline-stderr.log'),chunk));const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 const setup=await app.evaluate(async({app},{live,root,configuredOwner})=>{const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();if(configuredOwner)s.remote.save();const catalog=live?await s.catalogs.codex.get():null;const model=catalog?.models.find(row=>row.isDefault)||catalog?.models[0];if(live&&!catalog.available)throw Error(catalog.error||'Real Codex unavailable');const schedule={schemaVersion:1,id:'signed-update-test',name:'Disposable packaged update acceptance',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:live?'codex':'rehearsal',model:model?.id||'',reasoningEffort:model?.controls.reasoningEfforts.includes('low')?'low':'',workspace:{cwd:root,additionalDirectories:[]},context:{entries:[],includeDefaults:false},misfire:'skip',prompt:live?'Reply with INITIAL_UPDATE_TEST_OK. No tools are needed.':'Explicit synthetic update rehearsal; no real provider called.'};const run=s.engine.createRun(schedule,'chat');return {id:run.id,policy:s.updates.policyFile,installation:s.updates.installation,ownerHome:s.updates.ownerHome};},{live,root,configuredOwner});
 await wait(async()=>{const r=JSON.parse(fs.readFileSync(path.join(home,'runs',setup.id+'.json')));if(r.status==='failed')throw Error('Initial provider turn failed');await settleRehearsal(r);return r.status==='completed';},'initial updating chat');
 const prior=JSON.parse(fs.readFileSync(path.join(home,'runs',setup.id+'.json')));
 atomic(setup.policy,{schemaVersion:1,home:setup.ownerHome,installation:setup.installation,auditedAt:new Date().toISOString(),generations:[],scope:'Only this disposable installation/data home exists; no live installation copied.'});
 const history=await app.evaluate(async({app},id)=>{const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService(),scope={scope:'chat',id};let row=await s.contentTabs.mutateAsync({...scope,expectedRevision:0,operations:[{action:'open',tab:{id:'signed-history',type:'browser',url:'https://example.test/a',title:'Synthetic history A',history:{entries:[{id:'first',url:'https://example.test/a',title:'A'}],index:0,currentEntryId:'first',revision:0}}}]});const operation={action:'browser-navigate',tabId:'signed-history',operationId:'signed-update-nav-b',baseRevision:row.tabs[0].history.revision,entryId:'second',url:'https://example.test/b',title:'B',visitedAt:'2026-10-19T12:00:00.000Z'};await s.contentTabs.mutateAsync({...scope,operations:[operation]});row=await s.contentTabs.getAsync('chat',id);await s.contentTabs.mutateAsync({...scope,operations:[{action:'browser-traverse',tabId:'signed-history',operationId:'signed-update-back',baseRevision:row.tabs[0].history.revision,entryId:'first',visitedAt:'2026-10-19T12:00:01.000Z'}]});return {scope,operation,history:(await s.contentTabs.getAsync('chat',id)).tabs[0].history};},setup.id);
 if(rollback){
  const helper=path.join(root,'health-failure-helper.cjs');
  fs.writeFileSync(helper,`const fs=require('node:fs');const file=process.argv[2],modulePath=process.argv[3],{supervise,verifyLive}=require(modulePath),{readJob}=require(require('node:path').join(require('node:path').dirname(modulePath),'update-package.cjs'));(async()=>{process.send({ready:readJob(file).id});process.disconnect();while(readJob(file).phase!=='stopping')await new Promise(r=>setTimeout(r,50));await supervise(file,{verify:async(job,identity)=>{const receipt=await verifyLive(job,identity);if(identity.sourceFingerprint===job.candidate.sourceFingerprint&&job.outcome!=='rollback')throw Error('Explicit isolated health-failure injection after actual packaged candidate verification');return receipt;}});})().catch(e=>{console.error(e);process.exitCode=1});`);
  await app.evaluate(({app},helper)=>{const require=process.mainModule.require.bind(process.mainModule);const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();s.updates.launchHelper=job=>new Promise((resolve,reject)=>{const fs=require('node:fs'),path=require('node:path'),log=fs.openSync(path.join(path.dirname(job.file),'injected-helper.log'),'a',0o600),child=require('node:child_process').spawn(job.candidate.executable,[helper,job.file,path.join(job.candidate.bundle,process.platform==='darwin'?'Contents/Resources/app':'resources/app','desktop/update-helper.cjs')],{detached:true,stdio:['ignore',log,log,'ipc'],env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}});fs.closeSync(log);fs.writeFileSync(helper+'.pid',String(child.pid),{mode:0o600});child.unref();child.channel.unref();const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Injected helper did not acknowledge readiness.'));},15000);const finish=error=>{clearTimeout(timer);if(child.connected)child.disconnect();child.channel?.unref();error?reject(error):resolve();};child.once('message',message=>finish(message.ready===job.id?null:Error('Wrong helper')));child.once('error',finish);child.once('exit',()=>finish(Error('Injected helper exited before readiness.')));});},helper);
 }
 // Finish setup, then detach the test's Node inspector before exercising
 // real app exit. Keeping a debugger attached can hold Electron's Node runtime
 // after its service/runner lock is already closed.
 await app.evaluate(()=>{setTimeout(()=>process.mainModule.require('node:inspector').close(),0);});app=null;
 const prepared=await request('/api/updates',{action:'prepare',candidate:candidate.bundle,sourceFingerprint:candidate.sourceFingerprint});
 jobFile=JSON.parse(fs.readFileSync(path.join(path.dirname(setup.policy),'current.json'))).file;
 await request('/api/updates',{action:'handoff',id:prepared.job.id,expectedRevision:prepared.job.revision,runId:setup.id,checkpoint:'Finish this disposable acceptance: reply with CODEX_UPDATE_VERIFIED. No tools, file edits or external effects are needed.'});
 await wait(()=>{const j=readJob(jobFile);if(j.phase==='attention')throw Error(j.error);return j.phase==='complete';},'independent helper restart/rollback and automatic same-chat delivery',240000);
 ownedPid=JSON.parse(fs.readFileSync(path.join(home,'connection.json'))).pid;
 await wait(async()=>{const run=JSON.parse(fs.readFileSync(path.join(home,'runs',setup.id+'.json')));await settleRehearsal(run);return run.status==='completed';},'automatically resumed provider turn');
 const job=readJob(jobFile),restored=JSON.parse(fs.readFileSync(path.join(home,'runs',setup.id+'.json')));
 assert.equal(job.outcome,rollback?'rollback':'updated');assert.equal(inspectPackage(installation).sourceFingerprint,rollback?baseline.sourceFingerprint:candidate.sourceFingerprint);assert.equal(restored.providerSessionId,prior.providerSessionId);assert.deepEqual(restored.events.slice(0,prior.events.length),prior.events);assert.equal(restored.events.filter(event=>event.data?.delivery?.id===job.continuationId).length,1);if(live)assert.ok(restored.events.some(event=>event.role==='assistant'&&event.text.includes('CODEX_UPDATE_VERIFIED')));
 let current=await request('/api/content-tabs',{action:'get',...history.scope});assert.deepEqual(current.tabs.find(tab=>tab.id==='signed-history').history,history.history);await request('/api/content-tabs',{action:'mutate',...history.scope,operations:[history.operation]});current=await request('/api/content-tabs',{action:'get',...history.scope});assert.deepEqual(current.tabs.find(tab=>tab.id==='signed-history').history,history.history,'replayed receipt must retain the complete Back/Forward stack');
 const duplicate=await request('/api/updates/recovery',{action:'resume',id:job.id,secret:job.secret,outcome:job.outcome}).catch(error=>({error:error.message}));assert.ok(duplicate.error,'completed recovery endpoint refuses another dispatch');
 const acceptance={passed:true,baseline:baseline.buildRevision,candidate:candidate.buildRevision,outcome:job.outcome,provider:live?'codex':'explicit rehearsal',usage:restored.usage,identity:identityLabel,ownerFixture:configuredOwner?'explicitly configured legacy baseline':'fresh automatically persisted owner',checks:['exact '+identityLabel+' runtime and separate helper','actual renderer health',rollback?'compatible code rollback without restoring old data':'verified code replacement without restoring old data','same original chat/session resumes automatically once','prior events/configuration and complete Back/Forward stacks/operation receipts survive'],artifacts:receipt};
 atomic(path.join(receipt,'acceptance.json'),{...acceptance,baselineIdentity:baseline,candidateIdentity:candidate,priorEventCount:prior.events.length,restoredEventCount:restored.events.length,continuationCount:restored.events.filter(event=>event.data?.delivery?.id===job.continuationId).length,history:current.tabs.find(tab=>tab.id==='signed-history').history});
 atomic(path.join(receipt,'job.json'),Object.fromEntries(Object.entries(job).filter(([key])=>key!=='secret')));
 for(const name of ['helper.log','injected-helper.log','launch.log']){const log=path.join(path.dirname(jobFile),name);if(fs.existsSync(log))fs.copyFileSync(log,path.join(receipt,name));}
 if(fs.existsSync(path.join(root,'baseline-stderr.log')))fs.copyFileSync(path.join(root,'baseline-stderr.log'),path.join(receipt,'baseline-stderr.log'));
 fs.copyFileSync(new URL(import.meta.url),path.join(receipt,'updates-signed-ui.mjs'));
 passed=true;console.log(JSON.stringify(acceptance));
}catch(error){atomic(path.join(receipt,'failure.json'),{error:error.message,stack:error.stack});if(jobFile&&fs.existsSync(jobFile))fs.copyFileSync(jobFile,path.join(receipt,'failed-job-private.json'));console.error(error.stack,'ARTIFACTS',root);throw error;}finally{
 await cleanup();
 if(passed)for(const name of fs.readdirSync(root))if(name!=='receipt')fs.rmSync(path.join(root,name),{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
