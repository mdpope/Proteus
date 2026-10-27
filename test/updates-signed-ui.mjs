// Opt-in, real packaged runtime/helper acceptance against disposable installation/data paths.
// Mac verifies signing; Linux verifies packaged source and whole-bundle hashes.
import {_electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {observeUpdateOwner} from './update-owner-observation.mjs';
const require=createRequire(import.meta.url),{inspectPackage,atomic,readJob}=require('../desktop/updates/update-package.cjs');
const mac=process.platform==='darwin',win=process.platform==='win32',identityLabel=mac?'signed':win?'signed release and exact installer':'hashed';
const windows=win?require('../desktop/updates/windows-installation.cjs'):null;
const execute=(file,args)=>new Promise((resolve,reject)=>{const child=spawn(file,args,{windowsHide:true,stdio:'ignore'});child.once('error',reject);child.once('exit',resolve);});
if(win){let registered;try{registered=windows.registration();}catch{}if(registered)throw Error('Use a disposable Windows account: a live Proteus installation is registered.');}
const [baselinePath,candidatePath]=process.argv.slice(2);if(!baselinePath||!candidatePath)throw Error('Pass a helper-capable packaged baseline and a different packaged candidate. Only disposable copies are installed.');
const baseline=inspectPackage(path.resolve(baselinePath)),candidate=inspectPackage(path.resolve(candidatePath)),rollback=process.argv.includes('--rollback'),live=process.argv.includes('--live-provider'),configuredOwner=!process.argv.includes('--fresh-owner');
const recoverySocket=process.argv.includes('--recovery-socket'),preflightFailure=process.argv.includes('--preflight-failure');
const noChat=process.argv.includes('--no-chat'),manifest=process.argv[process.argv.indexOf('--manifest')+1];
if(recoverySocket&&win)throw Error('Unix recovery socket fixtures require Mac or Linux.');
if(preflightFailure&&win&&(live||noChat||rollback))throw Error('Windows snapshot failure requires a separate rehearsal chat without rollback injection.');
if(preflightFailure&&live)throw Error('Failure injection uses rehearsal only.');

if(win&&(!process.argv.includes('--manifest')||!path.isAbsolute(manifest)))throw Error('Windows acceptance requires the exact signed --manifest path.');
if(noChat&&live)throw Error('Use either standalone Engine Room or live same-chat acceptance.');
// Large package copies can use disk without lengthening Chromium's TMPDIR socket paths.
const fixtureRoot=process.env.PROTEUS_UPDATE_TEST_ROOT||os.tmpdir();if(!path.isAbsolute(fixtureRoot))throw Error('Use an absolute disposable update fixture root.');
const root=fs.realpathSync(privateTemporaryDirectory(path.join(fixtureRoot,'proteus-packaged-update-'))),home=path.join(root,'data'),browser=path.join(root,'browser'),installation=path.join(root,mac?'Proteus.app':'Proteus');
fs.mkdirSync(home);if(!win)fs.cpSync(baseline.bundle,installation,{recursive:true,verbatimSymlinks:true,preserveTimestamps:true});
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:root,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const inherited=['PATH','HOME','USER','LOGNAME','SHELL','LANG','LC_ALL','DISPLAY','WAYLAND_DISPLAY','XAUTHORITY','XDG_RUNTIME_DIR','DBUS_SESSION_BUS_ADDRESS','XDG_CURRENT_DESKTOP','XDG_SESSION_DESKTOP','DESKTOP_SESSION','KDE_FULL_SESSION','KDE_SESSION_VERSION','XDG_SESSION_TYPE','TMPDIR','TMP','TEMP','SystemRoot','WINDIR','ComSpec','USERPROFILE','HOMEDRIVE','HOMEPATH','LOCALAPPDATA','APPDATA','COMPUTERNAME'];
const isolatedEnv=Object.fromEntries(inherited.filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]));
// Rehearsals select basic storage in a private profile; these synthetic desktop
// values exercise the real helper/relaunch environment, not a user's keyring.
const desktopSelection=process.platform==='linux'?{XDG_CURRENT_DESKTOP:'KDE',XDG_SESSION_DESKTOP:'KDE',DESKTOP_SESSION:'plasma',KDE_FULL_SESSION:'true',KDE_SESSION_VERSION:'6',XDG_SESSION_TYPE:'x11'}:{};
if(!live)Object.assign(isolatedEnv,desktopSelection);
// Every helper relaunch inherits this disposable user home, even when its
// launch environment deliberately drops provider-specific CLI overrides.
const fixtureUserHome=path.join(root,'user-home');if(!live)fs.mkdirSync(fixtureUserHome);
if(!live)Object.assign(isolatedEnv,{HOME:fixtureUserHome,COPILOT_HOME:path.join(root,'copilot'),COPILOT_CLI_PATH:path.join(root,'no-copilot'),PROTEUS_CODEX_PATH:path.join(root,'no-codex'),PROTEUS_CLAUDE_PATH:path.join(root,'no-claude'),CLAUDE_CONFIG_DIR:path.join(root,'claude')});
const launchEnv=live?{...process.env,PROTEUS_HOME:home,PORT:'0'}:{...isolatedEnv,PROTEUS_HOME:home,PORT:'0'};
const launchArgs=[mac?'--use-mock-keychain':'--password-store=basic',...(process.platform==='linux'&&process.env.PROTEUS_TEST_OZONE_PLATFORM==='x11'?['--ozone-platform=x11']:[]),'--user-data-dir='+browser];
let app,ownedPid,jobFile,socketServer,snapshotLock,passed=false;
const wait=async(fn,label,ms=180000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,300));}throw Error('Timed out: '+label);};
const alive=pid=>{if(!Number.isSafeInteger(pid)||pid<1||pid===process.pid)return false;try{process.kill(pid,0);if(process.platform==='linux'&&fs.readFileSync('/proc/'+pid+'/stat','utf8').match(/\) ([A-Z]) /)?.[1]==='Z')return false;return true;}catch(error){if(['ESRCH','ENOENT'].includes(error.code))return false;throw error;}};
const stopOwned=async pid=>{if(!alive(pid))return;process.kill(pid,'SIGTERM');for(let n=0;n<80&&alive(pid);n++)await new Promise(resolve=>setTimeout(resolve,100));if(alive(pid))process.kill(pid,'SIGKILL');for(let n=0;n<20&&alive(pid);n++)await new Promise(resolve=>setTimeout(resolve,100));if(alive(pid))throw Error('Disposable update child did not exit: '+pid);};
const receipt=path.join(root,'receipt');fs.mkdirSync(receipt,{mode:0o700});
const releaseSnapshotLock=async()=>{if(!snapshotLock)return;const child=snapshotLock;snapshotLock=null;if(child.exitCode!==null||child.signalCode!==null)throw Error('Synthetic lock process exited unexpectedly');const done=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('Synthetic lock process did not release'));},10000);child.once('exit',(code)=>{clearTimeout(timer);code===0?resolve():reject(Error('Synthetic lock exit: '+code));});});child.stdin.end();await done;};
let cleanupPending;
const cleanup=()=>cleanupPending??=(async()=>{
 // Only PIDs obtained from this private fixture's owner connection/job are touched.
 const ownerPids=new Set([ownedPid]),helperPids=new Set();
 try{ownerPids.add(JSON.parse(fs.readFileSync(path.join(home,'connection.json'))).pid);}catch{}
 try{const job=readJob(jobFile);helperPids.add(job.helperPid);ownerPids.add(job.launchPid);ownerPids.add(job.health?.identity?.pid);}catch{}
 try{helperPids.add(Number(fs.readFileSync(path.join(root,'health-failure-helper.cjs.pid'),'utf8')));}catch{}
 for(const pid of helperPids)await stopOwned(pid);for(const pid of ownerPids)await stopOwned(pid);
 if(snapshotLock)await releaseSnapshotLock();
 if(socketServer)await new Promise(resolve=>socketServer.close(resolve));
 if(app){let timer;await Promise.race([app.close().catch(()=>{}),new Promise(resolve=>timer=setTimeout(resolve,3000))]);clearTimeout(timer);}
 if(win&&fs.existsSync(path.join(installation,'Uninstall Proteus.exe'))){assert.equal(await execute(path.join(installation,'Uninstall Proteus.exe'),['/S','/currentuser']),0);await wait(()=>{try{return !windows.registration();}catch{return true;}},'disposable uninstaller completion',60000);}
 // A pre-release rollback baseline may predate URI-handler cleanup. Remove
 // only handlers still owned by this exact disposable installation.
 if(win)for(const scheme of ['proteus','proteus-desktop']){
  const reg=path.join(process.env.SystemRoot,'System32','reg.exe'),key='HKCU\\Software\\Classes\\'+scheme;let command;
  try{command=execFileSync(reg,['query',key+'\\shell\\open\\command','/ve'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']}).match(/REG_SZ\s+(.+)/)?.[1]?.trim();}catch(error){if(error.status===1)continue;throw error;}
  if(command==='"'+path.join(installation,'Proteus.exe')+'" "%1"')execFileSync(reg,['delete',key,'/f'],{windowsHide:true,stdio:'ignore'});
 }
})();
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{atomic(path.join(receipt,'interrupted.json'),{signal,at:new Date().toISOString()});void cleanup().finally(()=>process.exit(130));});
const request=async(route,body)=>{const c=JSON.parse(fs.readFileSync(path.join(home,'connection.json'))),response=await fetch(c.origin+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(['prepare','import-release'].includes(body?.action)?240000:10000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Owner request failed');return result;};
const rehearsalReplies=new Set();
const settleRehearsal=async run=>{if(!live&&run.schedule.provider==='rehearsal'&&run.status==='awaiting_input'&&run.pending?.type==='question'&&run.pending.question==='This sample run needs feedback. What should the next checkpoint focus on?'&&!rehearsalReplies.has(run.pending.id)){await request('/api/runs/'+run.id+'/reply',{requestId:run.pending.id,answer:'Explicit synthetic updater feedback. No model or external workflow was called.'});rehearsalReplies.add(run.pending.id);}};
try{
 if(recoverySocket||preflightFailure&&!win){
  const file=path.join(home,preflightFailure?'unknown.sock':'terminal-tmux/socket');fs.mkdirSync(path.dirname(file),{recursive:true});
  socketServer=net.createServer();await new Promise((resolve,reject)=>{socketServer.once('error',reject);socketServer.listen(file,resolve);});
  fs.writeFileSync(path.join(home,'terminal-metadata-fixture.json'),'retain terminal metadata');
 }
 if(win){await windows.runInstaller(windows.installerFor(baseline),installation);windows.verifyRegistration(installation,baseline.version);assert.equal(inspectPackage(installation).hash,baseline.hash);console.log('Disposable Windows baseline installed and payload verified.');}
 app=await _electron.launch({executablePath:inspectPackage(installation).executable,args:launchArgs,env:launchEnv,timeout:60000});ownedPid=app.process().pid;app.process().stderr.on('data',chunk=>fs.appendFileSync(path.join(root,'baseline-stderr.log'),chunk));const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 const setup=await app.evaluate(async({app},{live,root,configuredOwner})=>{const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();if(configuredOwner)s.remote.save();const catalog=live?await s.catalogs.codex.get():null;const model=catalog?.models.find(row=>row.isDefault)||catalog?.models[0];if(live&&!catalog.available)throw Error(catalog.error||'Real Codex unavailable');const schedule={schemaVersion:1,id:'signed-update-test',name:'Disposable packaged update acceptance',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:live?'codex':'rehearsal',model:model?.id||'',reasoningEffort:model?.controls.reasoningEfforts.includes('low')?'low':'',workspace:{cwd:root,additionalDirectories:[]},context:{entries:[],includeDefaults:false},misfire:'skip',prompt:live?'Reply with INITIAL_UPDATE_TEST_OK. No tools are needed.':'Explicit synthetic update rehearsal; no real provider called.'};const run=s.engine.createRun(schedule,'chat');return {id:run.id,policy:s.updates.policyFile,installation:s.updates.installation,ownerHome:s.updates.ownerHome};},{live,root,configuredOwner});
 await wait(async()=>{const r=JSON.parse(fs.readFileSync(path.join(home,'runs',setup.id+'.json')));if(r.status==='failed')throw Error('Initial provider turn failed');await settleRehearsal(r);return r.status==='completed';},'initial updating chat');
 const prior=JSON.parse(fs.readFileSync(path.join(home,'runs',setup.id+'.json')));
 atomic(setup.policy,{schemaVersion:1,home:setup.ownerHome,installation:setup.installation,auditedAt:new Date().toISOString(),generations:[],scope:'Only this disposable installation/data home exists; no live installation copied.'});
 const history=await app.evaluate(async({app},id)=>{const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService(),scope={scope:'chat',id};let row=await s.contentTabs.mutateAsync({...scope,expectedRevision:0,operations:[{action:'open',tab:{id:'signed-history',type:'browser',url:'https://example.test/a',title:'Synthetic history A',history:{entries:[{id:'first',url:'https://example.test/a',title:'A'}],index:0,currentEntryId:'first',revision:0}}}]});const operation={action:'browser-navigate',tabId:'signed-history',operationId:'signed-update-nav-b',baseRevision:row.tabs[0].history.revision,entryId:'second',url:'https://example.test/b',title:'B',visitedAt:'2026-10-19T12:00:00.000Z'};await s.contentTabs.mutateAsync({...scope,operations:[operation]});row=await s.contentTabs.getAsync('chat',id);await s.contentTabs.mutateAsync({...scope,operations:[{action:'browser-traverse',tabId:'signed-history',operationId:'signed-update-back',baseRevision:row.tabs[0].history.revision,entryId:'first',visitedAt:'2026-10-19T12:00:01.000Z'}]});return {scope,operation,history:(await s.contentTabs.getAsync('chat',id)).tabs[0].history};},setup.id);
 if(rollback||mac&&!live||process.platform==='linux'&&!live){
  const helper=path.join(root,'health-failure-helper.cjs');
  fs.copyFileSync(new URL('./packaged-update-helper-fixture.cjs',import.meta.url),helper);
  await app.evaluate(({app},{helper,flags})=>{const require=process.mainModule.require.bind(process.mainModule);const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();s.updates.launchHelper=job=>new Promise((resolve,reject)=>{const fs=require('node:fs'),path=require('node:path'),log=fs.openSync(path.join(path.dirname(job.file),'injected-helper.log'),'a',0o600),child=require('node:child_process').spawn(job.candidate.executable,[helper,job.file,path.join(job.candidate.bundle,process.platform==='darwin'?'Contents/Resources/app':'resources/app','desktop/updates/update-helper.cjs'),...flags],{detached:true,stdio:['ignore',log,log,'ipc'],env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}});fs.closeSync(log);fs.writeFileSync(helper+'.pid',String(child.pid),{mode:0o600});child.unref();child.channel.unref();const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Injected helper did not acknowledge readiness.'));},15000);const finish=error=>{clearTimeout(timer);if(child.connected)child.disconnect();child.channel?.unref();error?reject(error):resolve();};child.once('message',message=>finish(message.ready===job.id?null:Error('Wrong helper')));child.once('error',finish);child.once('exit',()=>finish(Error('Injected helper exited before readiness.')));});},{helper,flags:[...(rollback?['--rollback']:[]),...(mac&&!live?['--mock-keychain']:[]),...(process.platform==='linux'&&!live?['--inspect-owner']:[])]});
 }
 // Finish setup, then detach the test's Node inspector before exercising
 // real app exit. Keeping a debugger attached can hold Electron's Node runtime
 // after its service/runner lock is already closed.
 await app.evaluate(()=>{setTimeout(()=>process.mainModule.require('node:inspector').close(),0);});app=null;
 const prepared=await request('/api/updates',win?{action:'import-release',manifest,channel:'stable'}:{action:'prepare',candidate:candidate.bundle,sourceFingerprint:candidate.sourceFingerprint});
 if(win&&preflightFailure){
  const sentinel=path.join(home,'synthetic-snapshot-sentinel.txt');fs.writeFileSync(sentinel,'SYNTHETIC SNAPSHOT SENTINEL\n',{flag:'wx'});
  const lockScript=path.resolve(import.meta.dirname,'windows-snapshot-lock.ps1');
  snapshotLock=spawn(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-File',lockScript,sentinel],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  await new Promise((resolve,reject)=>{let output='',errors='';const timer=setTimeout(()=>reject(Error('Synthetic Windows lock did not become ready')),10000);snapshotLock.stdout.on('data',chunk=>{output+=chunk;if(output.includes('LOCK_READY')){clearTimeout(timer);resolve();}});snapshotLock.stderr.on('data',chunk=>errors+=chunk);snapshotLock.once('error',error=>{clearTimeout(timer);reject(error);});snapshotLock.once('exit',code=>{clearTimeout(timer);reject(Error('Synthetic Windows lock exited before readiness: '+code+' '+errors));});});
  assert.throws(()=>fs.readFileSync(sentinel),/EBUSY|EPERM|EACCES/,'OS must refuse reading the exclusively held sentinel');
 }
 console.log('Candidate prepared after exact package and isolated renderer checks.');
 jobFile=JSON.parse(fs.readFileSync(path.join(path.dirname(setup.policy),'current.json'))).file;
 await request('/api/updates',{action:'handoff',id:prepared.job.id,expectedRevision:prepared.job.revision,...(noChat?{}:{runId:setup.id}),checkpoint:'Finish this disposable acceptance: reply with CODEX_UPDATE_VERIFIED. No tools, file edits or external effects are needed.'});
 await wait(()=>{const j=readJob(jobFile);if(j.phase==='attention')throw Error(j.error);return j.phase==='complete';},'independent helper restart/rollback and automatic same-chat delivery',win?600000:240000);
 ownedPid=JSON.parse(fs.readFileSync(path.join(home,'connection.json'))).pid;
 if(process.platform==='linux'&&!live){
  const observation=await observeUpdateOwner({pid:ownedPid,home,browserHome:browser,executable:inspectPackage(installation).executable,log:path.join(path.dirname(jobFile),'launch.log'),keys:Object.keys(desktopSelection)});
  assert.deepEqual(observation.desktop,desktopSelection,'Update and rollback preserve the desktop identity used to select credential storage');
  atomic(path.join(receipt,'owner-environment.json'),observation);
 }
 await wait(async()=>{const run=JSON.parse(fs.readFileSync(path.join(home,'runs',setup.id+'.json')));await settleRehearsal(run);return run.status==='completed';},'automatically resumed provider turn');
 const job=readJob(jobFile),restored=JSON.parse(fs.readFileSync(path.join(home,'runs',setup.id+'.json')));
 assert.equal(job.outcome,rollback||preflightFailure?'rollback':'updated');assert.equal(inspectPackage(installation).sourceFingerprint,rollback||preflightFailure?baseline.sourceFingerprint:candidate.sourceFingerprint);assert.equal(restored.providerSessionId,prior.providerSessionId);assert.deepEqual(restored.events.slice(0,prior.events.length),prior.events);assert.equal(restored.events.filter(event=>event.data?.delivery?.id===job.continuationId).length,noChat?0:1);if(noChat){assert.equal(job.runId,null);assert.deepEqual(restored.events,prior.events);}if(live)assert.ok(restored.events.some(event=>event.role==='assistant'&&event.text.includes('CODEX_UPDATE_VERIFIED')));
 let current=await request('/api/content-tabs',{action:'get',...history.scope});assert.deepEqual(current.tabs.find(tab=>tab.id==='signed-history').history,history.history);await request('/api/content-tabs',{action:'mutate',...history.scope,operations:[history.operation]});current=await request('/api/content-tabs',{action:'get',...history.scope});assert.deepEqual(current.tabs.find(tab=>tab.id==='signed-history').history,history.history,'replayed receipt must retain the complete Back/Forward stack');
 if(preflightFailure){assert.equal(job.failedBeforeReplacement,true);assert.match(job.preInstallFailure.error,win?/synthetic-snapshot-sentinel|EBUSY|EPERM|EACCES|sharing/i:/unknown.sock/);assert.ok(restored.events.some(event=>event.text?.includes('Update failed before application replacement:')));assert.equal(job.recovery,null);if(win){assert.equal(inspectPackage(installation).hash,baseline.hash);await releaseSnapshotLock();assert.equal(fs.readFileSync(path.join(home,'synthetic-snapshot-sentinel.txt'),'utf8'),'SYNTHETIC SNAPSHOT SENTINEL\n');const policy=JSON.parse(fs.readFileSync(setup.policy,'utf8'));assert.ok(Array.isArray(policy.generations));assert.equal(policy.generations.length,0,'No verified recovery generation may be registered');}}
 if(recoverySocket){assert.equal(fs.lstatSync(path.join(home,'terminal-tmux/socket')).isSocket(),true);assert.equal(fs.existsSync(path.join(job.recovery,'data-0/terminal-tmux/socket')),false);assert.equal(fs.readFileSync(path.join(job.recovery,'data-0/terminal-metadata-fixture.json'),'utf8'),'retain terminal metadata');}
 const duplicate=await request('/api/updates/recovery',{action:'resume',id:job.id,secret:job.secret,outcome:job.outcome}).catch(error=>({error:error.message}));assert.ok(duplicate.error,'completed recovery endpoint refuses another dispatch');
 const acceptance={passed:true,baseline:baseline.buildRevision,candidate:candidate.buildRevision,outcome:job.outcome,provider:noChat?'standalone; existing rehearsal chat unchanged':live?'codex':'explicit rehearsal',usage:restored.usage,identity:identityLabel,ownerFixture:configuredOwner?'explicitly configured legacy baseline':'fresh automatically persisted owner',checks:['exact '+identityLabel+' runtime and separate helper','actual renderer health',preflightFailure?'snapshot failure relaunches unchanged baseline and reports failure once':rollback?'compatible code rollback without restoring old data':'verified code replacement without restoring old data',noChat?'standalone update does not dispatch any chat':'same original chat/session resumes automatically once','prior events/configuration and complete Back/Forward stacks/operation receipts survive',...(recoverySocket?['managed terminal socket survives update and is omitted from recovery; durable terminal metadata is retained']:[])],artifacts:receipt};
 atomic(path.join(receipt,'acceptance.json'),{...acceptance,baselineIdentity:baseline,candidateIdentity:candidate,priorEventCount:prior.events.length,restoredEventCount:restored.events.length,continuationCount:restored.events.filter(event=>event.data?.delivery?.id===job.continuationId).length,history:current.tabs.find(tab=>tab.id==='signed-history').history});
 atomic(path.join(receipt,'job.json'),Object.fromEntries(Object.entries(job).filter(([key])=>key!=='secret')));
 for(const name of ['helper.log','injected-helper.log','launch.log']){const log=path.join(path.dirname(jobFile),name);if(fs.existsSync(log))fs.copyFileSync(log,path.join(receipt,name));}
 if(fs.existsSync(path.join(root,'baseline-stderr.log')))fs.copyFileSync(path.join(root,'baseline-stderr.log'),path.join(receipt,'baseline-stderr.log'));
 fs.copyFileSync(new URL(import.meta.url),path.join(receipt,'updates-signed-ui.mjs'));
 passed=true;console.log(JSON.stringify(acceptance));
}catch(error){atomic(path.join(receipt,'failure.json'),{error:error.message,stack:error.stack});if(jobFile&&fs.existsSync(jobFile))fs.copyFileSync(jobFile,path.join(receipt,'failed-job-private.json'));console.error(error.stack,'ARTIFACTS',root);throw error;}finally{
 await cleanup();
 if(passed)for(const name of fs.readdirSync(root))if(name!=='receipt'){
  const target=path.resolve(root,name);if(!target.startsWith(root+path.sep))throw Error('Unexpected disposable fixture path.');
  await wait(()=>{try{fs.rmSync(target,{recursive:true,force:true,maxRetries:2,retryDelay:100});return true;}catch(error){if(!['EPERM','EBUSY','ENOTEMPTY'].includes(error.code))throw error;return false;}},'disposable Windows process handles released',60000);
 }
}
