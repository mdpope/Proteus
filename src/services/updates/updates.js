import {verifyRelease,extractRelease} from './desktop-releases.js';
import {DesktopReleaseFeed} from './desktop-release-feed.js';
import {initializeFreshRecovery} from './recovery-inventory.js';
import {captureNavigation,verifyNavigation} from './navigation-preservation.js';
import {taskFeedbackDelivery} from '../chats/task-feedback-kind.js';
import {ensurePrivateHome} from '../../shared/private-paths.cjs';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {atomicJSON} from '../../shared/files.js';
import {packageOperation} from './update-package-worker.js';
const require=createRequire(import.meta.url);
const {inspectPackage,compatible,spaceBudget,readJob,writeJob,digest,recoveryPolicy}=require('../../../desktop/updates/update-package.cjs');
const {helperEnvironment}=require('../../../desktop/updates/helper-environment.cjs');
const active=new Set(['queued','running','awaiting_input']);
const terminal=new Set(['complete','cancelled','attention']);
export function pendingUpdate(home,installation){
 try{home=fs.realpathSync(home);installation=fs.realpathSync(installation);const root=path.join(path.dirname(home),'Proteus Updates',digest(home+'\0'+installation).slice(0,24)),reference=JSON.parse(fs.readFileSync(path.join(root,'current.json'),'utf8'));if(path.dirname(path.dirname(reference.file))!==path.join(root,'jobs'))throw Error('Invalid update owner.');const job=readJob(reference.file);return !terminal.has(job.phase)&&!['prepared','waiting-for-idle'].includes(job.phase)?reference.file:null;}catch(error){if(error.code==='ENOENT')return null;throw error;}
}
const processAlive=pid=>{if(!Number.isSafeInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
export class Updates {
 constructor(service,{installation,browserHome,packaged=false,freshHome=false,quit=()=>{},blockers=()=>[],inspect=inspectPackage,test,launchHelper,platform=process.platform}={}){
  Object.assign(this,{service,installation,browserHome,packaged,quit,blockers,inspect,test,launchHelper,platform});
  this.releaseClient=service.releaseClient||new DesktopReleaseFeed();
  this.ownerHome=fs.realpathSync(service.home);if(installation)this.installation=fs.realpathSync(installation);if(browserHome&&fs.existsSync(browserHome))this.browserHome=fs.realpathSync(browserHome);
  this.root=path.join(path.dirname(this.ownerHome),'Proteus Updates',digest(this.ownerHome+'\0'+(this.installation||'source')).slice(0,24));this.pointer=path.join(this.root,'current.json');this.policyFile=path.join(this.root,'recovery-policy.json');
  this.sessionId=randomUUID();this.busy=false;
  if(freshHome&&packaged&&platform==='win32')try{
   require('../../../desktop/updates/windows-installation.cjs').verifyRegistration(this.installation,this.inspect(this.installation).version);
   initializeFreshRecovery(this.policyFile,{home:this.ownerHome,installation:this.installation});
  }catch(error){this.error=error.message;}
  service.engine.updateGuard=input=>this.newInput(input);
  const file=process.env.PROTEUS_UPDATE_JOB;
  if(file&&this.owns(file)){const job=readJob(file);if(!terminal.has(job.phase)){this.file=file;service.engine.updateBarrier=true;}}
  if(!this.file)try{const ref=JSON.parse(fs.readFileSync(this.pointer,'utf8'));if(this.owns(ref.file))this.file=ref.file;}catch(error){if(error.code!=='ENOENT')this.error='The saved update reference needs inspection; it was preserved.';}
  if(this.file){const job=this.job();if(!terminal.has(job.phase)&&!['prepared','waiting-for-idle'].includes(job.phase))service.engine.updateBarrier=true;}
  this.timer=setInterval(()=>void this.advance().catch(error=>{this.error=error.message;this.service.notify?.();}),1000);this.timer.unref?.();
 }
 owns(file){return typeof file==='string'&&path.isAbsolute(file)&&path.dirname(path.dirname(file))===path.join(this.root,'jobs')&&path.basename(file)==='job.json';}
 job(){return this.file?readJob(this.file):null;}
 packageWork(method,...args){if((this.packagePending||0)>=4)return Promise.reject(Error('Update inspection is busy. Wait for the current check to finish.'));this.packagePending=(this.packagePending||0)+1;const task=(this.packageQueue||Promise.resolve()).catch(()=>{}).then(()=>{if(this.closed)throw Error('The updater is closing.');return packageOperation(method,...args);}).finally(()=>{this.packagePending--;});this.packageQueue=task;return task;}
 inspectAsync(bundle){return this.inspect===inspectPackage?this.packageWork('inspectPackage',bundle,{platform:this.platform}):Promise.resolve().then(()=>this.inspect(bundle));}
 refreshIdentity(){if(this.runningIdentity)return Promise.resolve(this.runningIdentity);if(this.identityPending)return this.identityPending;this.identityPending=this.inspectAsync(this.installation).then(value=>{this.runningIdentity=value;this.service.notify?.();return value;}).catch(error=>{this.error=error.message;throw error;}).finally(()=>{this.identityPending=null;});return this.identityPending;}
 identity(){let packaged=this.runningIdentity;try{if(this.packaged&&!packaged){if(this.inspect!==inspectPackage)packaged=this.runningIdentity=this.inspect(this.installation);else if(!this.identityPending&&!this.closed&&!this.error)void this.refreshIdentity().catch(()=>{});}}catch(error){this.error=error.message;}return {protocol:1,sessionId:this.sessionId,platform:this.platform,arch:process.arch,pid:process.pid,packaged:this.packaged,installation:this.installation||null,home:this.ownerHome,buildRevision:packaged?.buildRevision||(this.packaged?'checking':'source'),sourceFingerprint:packaged?.sourceFingerprint||null,identityPending:!!this.identityPending,barrier:this.service.engine.updateBarrier===true,capabilities:{prepare:this.packaged&&['darwin','linux','win32'].includes(this.platform),compatibleRollback:!!packaged}};}
 status(){let job;try{job=this.job();}catch(error){this.error=error.message;}return {identity:this.identity(),error:this.error||null,download:this.download||null,job:job?{id:job.id,revision:job.revision,phase:job.phase,runId:job.runId,version:job.candidate?.version,buildRevision:job.candidate?.buildRevision,outcome:job.outcome||null,error:job.error||job.preInstallFailure?.error||job.failureHistory?.at(-1)?.error||null,failureHistory:job.failureHistory||[],blocker:['complete','cancelled'].includes(job.phase)?null:job.blocker||null,health:job.health?{verified:true,at:job.health.at}:null,continuation:job.continuation||null,freeSpaceChange:job.freeSpaceAfter===undefined?null:job.freeSpaceAfter-job.freeSpaceBefore}:null};}
 readRecoveryPolicy(){try{return recoveryPolicy(this.policyFile,{home:this.ownerHome,installation:this.installation});}catch(error){if(error.code==='ENOENT')throw Error('The installer must inventory this installation’s existing recovery generations before supervised restart. See the Updates recovery setup instructions.');throw error;}}
 context(run){return digest(JSON.stringify({provider:run.schedule.provider,providerSessionId:run.providerSessionId,workspace:run.schedule.workspace,context:run.schedule.context,permissions:run.schedule.permissions,chatPermissionRevision:run.chatPermissionRevision,model:run.schedule.model,effort:run.schedule.reasoningEffort}));}
 preservation(){
  const runs=this.service.engine.listRuns().map(run=>({id:run.id,eventCount:run.events.length,eventHash:digest(JSON.stringify(run.events)),contextHash:this.context(run)}));
  const navigation=captureNavigation(this.service);
  const receipt={schemaVersion:1,at:new Date().toISOString(),runs,...(navigation?{navigation}:{})},file=path.join(path.dirname(this.file),'preservation.json');
  atomicJSON(file,receipt);return digest(fs.readFileSync(file));
 }
 verifyPreservation(job){
  const file=path.join(path.dirname(job.file),'preservation.json');
  if(!job.preservationHash||fs.statSync(file).size>16*1024*1024||digest(fs.readFileSync(file))!==job.preservationHash)throw Error('The pre-restart chat preservation receipt is unavailable or changed.');
  const receipt=JSON.parse(fs.readFileSync(file,'utf8'));
  if(receipt.schemaVersion!==1||!Array.isArray(receipt.runs))throw Error('The pre-restart chat preservation receipt is invalid.');
  for(const row of receipt.runs){const run=this.service.engine.runs.get(row.id);if(!run||run.events.length<row.eventCount||digest(JSON.stringify(run.events.slice(0,row.eventCount)))!==row.eventHash||this.context(run)!==row.contextHash)throw Error('A pre-restart chat, event history or effective configuration changed. Preserve the recovery data for inspection.');}
  return {runs:receipt.runs.length,events:receipt.runs.reduce((sum,row)=>sum+row.eventCount,0),...(receipt.navigation?{navigation:verifyNavigation(receipt.navigation,captureNavigation(this.service))}:{})};
 }
 async handle(value={},runId){
  if(value.action==='status'||value.action==='identity'||!value.action)return this.status();
  if(value.action==='build-status')return require('../../../desktop/updates/windows-builder.cjs').buildStatus(this.root);
  if(value.action==='cancel-build')return require('../../../desktop/updates/windows-builder.cjs').cancelBuild(this.root,value);
  if(value.action==='build-release'){
   const selected=await this.resolveRelease(value);if(selected.resolution==='published')return selected;
   if(!this.packaged||this.platform!=='win32')throw Error('Source builds require the designated installed Windows owner.');
   return require('../../../desktop/updates/windows-builder.cjs').startBuild(this.root,value);
  }
  if(value.action==='storage')return this.packageWork('inventoryStorage',this.root,{home:this.ownerHome,installation:this.installation});
  if(value.action==='maintenance'||value.action==='maintain'){
   if(!this.packaged)throw Error('Maintenance requires an installed desktop app.');
   if(this.busy||this.downloading)throw Error('Another update operation is running.');
   this.busy=true;
   try{return await this.packageWork(value.action==='maintenance'?'maintenancePlan':'applyMaintenance',this.root,{home:this.ownerHome,installation:this.installation,browserHome:this.browserHome,platform:this.platform,planDigest:value.planDigest});}
   finally{this.busy=false;}
  }
  if(value.action==='inspect'){if(!this.packaged||!path.isAbsolute(value.candidate||''))throw Error('Choose a packaged candidate from the desktop app.');const candidate=await this.inspectAsync(value.candidate);return {candidate:{version:candidate.version,buildRevision:candidate.buildRevision,sourceFingerprint:candidate.sourceFingerprint,hash:candidate.hash,signing:candidate.signing}};}
  if(value.action==='releases')return this.releases(value.channel);
  if(value.action==='resolve-release')return this.resolveRelease(value);
  if(value.action==='stage-release'||value.action==='import-release')return this.stageRelease(value,runId);
  if(value.action==='prepare')return this.prepare(value,runId);
  const job=this.job();if(!job||job.id!==value.id||job.revision!==value.expectedRevision)throw Error('The update changed. Refresh its status before continuing.');
  if(runId&&job.runId&&job.runId!==runId)throw Error('This update belongs to its original chat.');
  if(value.action==='resume-work'){
   if(runId||job.phase!=='attention')throw Error('Resume ordinary work from the desktop Updates recovery screen.');
   const current=await this.inspectAsync(this.installation);
   if(![job.previous.hash,job.candidate.hash].includes(current.hash)||(this.service.windowCount?.()||0)<1||this.service.updateUIHealth&&!await this.service.updateUIHealth())throw Error('The current app has not passed runtime/UI identity verification. Preserve the recovery journal for repair.');
   writeJob(this.file,{ordinaryWorkResumedAt:new Date().toISOString()});this.service.engine.updateBarrier=false;void this.service.engine.drain();return this.status();
  }
  if(value.action==='cancel'){
   if(this.busy)throw Error('Another update check is running. Wait for it to finish before cancellation.');
   if(!['prepared','waiting-for-idle'].includes(job.phase))throw Error('The update has passed its idle barrier. Inspect its recovery status.');
   this.busy=true;try{writeJob(this.file,{phase:'cancelled',blocker:null});this.service.engine.updateBarrier=false;void this.service.engine.drain();await this.packageWork('retireStaging',this.file);return this.status();}finally{this.busy=false;}
  }
  if(value.action==='handoff')this.readRecoveryPolicy();
  if(value.action!=='handoff'||job.phase!=='prepared')throw Error('Prepare and test a candidate before handing off.');
  const id=runId||value.runId||job.runId,run=id?this.service.engine.getRun(id):null;
  if(run&&(run.archivedAt||run.trigger!=='chat'||run.schedule.provider==='local-process'))throw Error('Choose an existing unarchived provider chat.');
  if(run&&(typeof value.checkpoint!=='string'||!value.checkpoint.trim()||value.checkpoint.length>12000))throw Error('Record completed work and remaining verification before restarting.');
  if(value.checkpoint!==undefined&&(typeof value.checkpoint!=='string'||value.checkpoint.length>12000))throw Error('The update checkpoint is too long or invalid.');
  writeJob(this.file,{phase:'waiting-for-idle',runId:run?.id||null,provider:run?.schedule.provider||null,providerSessionId:run?.providerSessionId||null,contextHash:run?this.context(run):null,eventCount:run?.events.length||0,checkpoint:value.checkpoint?.trim()||'Operator-triggered Engine Room update.',authorization:{source:runId?'authorized updating chat':'desktop Updates handoff',at:new Date().toISOString()},blocker:'Waiting for all active work to finish.'});
  this.service.notify?.();return this.status();
 }
 releaseDirectories(){
  if(this.platform==='win32'){ensurePrivateHome(path.dirname(this.root));ensurePrivateHome(this.root);}
  const downloads=path.join(this.root,'downloads');fs.mkdirSync(downloads,{recursive:true,mode:0o700});
  // The owner lock serializes this data home. A prior process may have stopped
  // mid-download; these disposable copies never contain a recovery generation.
  for(const entry of fs.readdirSync(downloads,{withFileTypes:true})){
   if(!/^[-a-f0-9]{36}$/.test(entry.name)||!entry.isDirectory()||entry.isSymbolicLink())throw Error('An unexpected download staging entry needs inspection.');
   fs.rmSync(path.join(downloads,entry.name),{recursive:true,force:true});
  }
 }
 async releases(channel='stable'){
  if(!this.packaged)throw Error('Install the desktop app to check published releases.');
  const envelopes=await this.releaseClient.releases({channel,platform:this.platform,arch:process.arch});
  return {releases:envelopes.map(envelope=>{const release=verifyRelease(envelope,{channel,platform:this.platform});return {...release,manifestDigest:digest(JSON.stringify(envelope))};})};
 }
 async resolveRelease(value){
  if(!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(value.version||'')||value.sourceFingerprint!==undefined&&!/^[a-f0-9]{64}$/.test(value.sourceFingerprint)||value.sourceCommit!==undefined&&!/^[a-f0-9]{40,64}$/.test(value.sourceCommit))throw Error('Specify the requested version and, when known, exact source fingerprint or commit.');
  const {releases}=await this.releases(value.channel),matches=releases.filter(row=>row.version===value.version&&(!value.sourceFingerprint||row.sourceFingerprint===value.sourceFingerprint)&&(!value.sourceCommit||row.sourceCommit===value.sourceCommit));
  if(matches.length>1)throw Error('More than one release matches. Select an exact source fingerprint or release ID.');
  return {resolution:matches.length?'published':'build-required',platform:this.platform,arch:process.arch,requested:{version:value.version,sourceFingerprint:value.sourceFingerprint||null,sourceCommit:value.sourceCommit||null},release:matches[0]||null,note:matches.length?'Reuse the signed published release.':'Only the designated builder for this OS/architecture builds a missing release. Consumer machines wait for its signed publication on downloads.proteus.example. A failed catalog request is never treated as a missing release.'};
 }
 async stageRelease(value,runId){
  if(this.busy||this.downloading)throw Error('Another update check is running.');
  if(!this.packaged)throw Error('Install the desktop app before staging a published release.');
  if(this.job()&&!terminal.has(this.job().phase))throw Error('Finish or cancel the current update first.');
  this.downloading=true;let directory,prepared;
  try{
   const release=await this.selectedRelease(value);this.releaseDirectories();
   spaceBudget([{directory:this.root,bytes:release.artifact.bytes+release.artifact.unpackedBytes*2}]);
   directory=path.join(this.root,'downloads',randomUUID());fs.mkdirSync(directory,{mode:0o700});
   const archive=path.join(directory,'release.tar.gz');this.download={phase:'downloading',version:release.version,buildRevision:release.buildRevision};this.service.notify?.();
   if(value.action==='import-release')fs.copyFileSync(path.join(path.dirname(value.manifest),release.artifact.filename),archive,fs.constants.COPYFILE_EXCL);
   else await this.releaseClient.downloadRelease(release,archive);
   this.download={...this.download,phase:'verifying'};this.service.notify?.();
   const candidate=await extractRelease(archive,path.join(directory,'application'),release);
   this.downloading=false;this.download={...this.download,phase:'testing'};
   prepared=await this.prepare({candidate:candidate.bundle,sourceFingerprint:release.sourceFingerprint},runId,release);
   return prepared;
  }catch(error){this.error=error.message;throw error;}
  finally{this.downloading=false;this.download=null;if(directory)fs.rmSync(directory,{recursive:true,force:true});this.service.notify?.();}
 }
 async selectedRelease(value){
  const channel=value.channel||'stable';let envelope;
  if(value.action==='import-release'){
   if(!path.isAbsolute(value.manifest||''))throw Error('Choose an offline signed release manifest.');
   const stat=fs.lstatSync(value.manifest);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>128*1024)throw Error('The offline release manifest is invalid.');
   try{envelope=JSON.parse(fs.readFileSync(value.manifest,'utf8'));}
   catch{throw Error('The selected release manifest is not valid JSON. Choose the signed release.json file. No update was started.');}
  }else{
   const envelopes=await this.releaseClient.releases({channel,platform:this.platform,arch:process.arch});
   envelope=envelopes.find(item=>verifyRelease(item,{channel,platform:this.platform}).id===value.releaseId);
   if(!envelope||digest(JSON.stringify(envelope))!==value.manifestDigest)throw Error('The selected release changed. Check available releases again.');
  }
  return verifyRelease(envelope,{channel,platform:this.platform});
 }
 async prepare(value,runId,release=null){
  if(this.busy||this.downloading)throw Error('Another update check is running.');
  if(!this.packaged||!['darwin','linux','win32'].includes(this.platform))throw Error('Supervised updates require a packaged desktop installation. Source checkouts keep their normal build workflow.');
  const previousJob=this.job();if(previousJob&&!terminal.has(previousJob.phase))throw Error('Finish or cancel the current update before preparing another.');
  if(typeof value.candidate!=='string'||!path.isAbsolute(value.candidate)||!/^[a-f0-9]{64}$/.test(value.sourceFingerprint||''))throw Error('Choose an exact packaged candidate and its tested source fingerprint.');
  this.busy=true;let preparing,persisted=false;
  try{
   await this.packageWork('inventoryStorage',this.root,{home:this.ownerHome,installation:this.installation,retire:true});
   const previous=await this.inspectAsync(this.installation),candidate=await this.inspectAsync(value.candidate);this.runningIdentity=previous;compatible(previous,candidate);if(candidate.sourceFingerprint!==value.sourceFingerprint)throw Error('The candidate differs from the requested source fingerprint.');
   if(this.platform==='win32'){if(!release||!previous.installer||!candidate.installer)throw Error('Choose a signed Windows release with its registered installer.');require('../../../desktop/updates/windows-installation.cjs').verifyRegistration(this.installation,previous.version);}
   if(candidate.bundle===previous.bundle||candidate.bundle.startsWith(previous.bundle+path.sep))throw Error('Stage the candidate outside the running installation.');
   if(this.platform==='win32'){ensurePrivateHome(path.dirname(this.root));ensurePrivateHome(this.root);}
   spaceBudget([{directory:this.root,bytes:candidate.bytes}]);
   const id=randomUUID(),directory=path.join(this.root,'jobs',id),staged=path.join(directory,'candidate',path.basename(candidate.bundle));fs.mkdirSync(directory,{recursive:true,mode:0o700});preparing=directory;
   await this.packageWork('copyTree',candidate.bundle,staged);const copy=await this.inspectAsync(staged);if(copy.hash!==candidate.hash||this.platform==='win32'&&copy.installationHash!==candidate.installationHash)throw Error('The private candidate copy changed.');
   const acceptance=await (this.test?this.test(copy):require('../../../desktop/updates/update-helper.cjs').smoke(copy));
   if(acceptance.passed!==true||acceptance.hash!==copy.hash)throw Error('The exact candidate has no passing isolated acceptance receipt.');
   const file=path.join(directory,'job.json'),job={schemaVersion:1,platform:this.platform,id,file,revision:1,phase:'prepared',createdAt:new Date().toISOString(),home:fs.realpathSync(this.service.home),browserHome:this.browserHome,installation:previous.bundle,previous,candidate:copy,acceptance,release,runId:runId||null,secret:randomBytes(32).toString('hex'),continuationId:'update_'+id.replaceAll('-',''),recoveryRoot:path.join(this.root,'recoveries'),recoveryPolicy:this.policyFile,recoveryCachePolicy:1};
   atomicJSON(file,job);atomicJSON(this.pointer,{schemaVersion:1,file});this.file=file;persisted=true;this.error=null;this.service.notify?.();return this.status();
  }finally{if(preparing&&!persisted)await fs.promises.rm(preparing,{recursive:true,force:true});this.busy=false;}
 }
 newInput({runId,source}={}){
  if(this.delivering)return;
  const job=this.job();if(!job||terminal.has(job.phase)||job.phase==='prepared')return;
  // Status from another task is data rather than a new human instruction.
  // Its work still blocks idle through waiting(); input into the updating chat
  // itself continues to require a fresh checkpoint, regardless of provenance.
  if(source===taskFeedbackDelivery&&runId&&runId!==job.runId)return;
  if(job.phase==='waiting-for-idle'){writeJob(this.file,{phase:'prepared',blocker:'New user input arrived. Review the checkpoint and hand off again.'});this.service.engine.updateBarrier=false;return;}
  // During verified restart, Engine persists queued input behind the barrier.
  // Recovery appends its single continuation after those messages.
 }
 waiting(job){
  const runs=this.service.engine.listRuns().filter(run=>active.has(run.status)||run.capacityRetry||this.service.engine.running.has(run.id)||this.service.engine.backgroundRuns.has(run.id));
  const building=this.platform==='win32'?require('../../../desktop/updates/windows-builder.cjs').buildStatus(this.root):null;
  return [...runs.map(run=>'Chat '+run.id.slice(0,8)+' is '+run.status),...(building?.job?.running||building?.job?.phase==='starting'?['Windows release build is still running.']:[]),...this.blockers()];
 }
 async advance(){
  if(this.busy||!this.file)return;const job=this.job();
  if(['complete','cancelled'].includes(job.phase)){if(job.phase==='complete'&&job.recovery&&!job.failedBeforeReplacement)require('../../../desktop/updates/update-helper.cjs').retainGeneration(job);if(this.retiredStagingId!==job.id){this.busy=true;try{const result=await this.packageWork('retireStaging',job.file);if(result.eligible)this.retiredStagingId=job.id;}finally{this.busy=false;}}return;}
  if(['backing-up','installing','verifying','recovering','awaiting-chat-resume'].includes(job.phase)){if(!processAlive(job.helperPid)&&!this.restartedHelper){this.busy=true;try{await this.inspectAsync(job.candidate.bundle);this.restartedHelper=true;this.spawnHelper(job);}finally{this.busy=false;}}return;}
  if(job.phase!=='waiting-for-idle')return;
  const blockers=this.waiting(job);if(blockers.length){const blocker=blockers.join('; ');if(job.blocker!==blocker)writeJob(this.file,{blocker});return;}
  const run=job.runId?this.service.engine.getRun(job.runId):null;if(run?.events.slice(job.eventCount).some(event=>event.role==='user'))return this.newInput();
  if(run&&(run.archivedAt||this.context(run)!==job.contextHash)){writeJob(this.file,{phase:'prepared',blocker:'The chat session or effective configuration changed. Review and hand off again.'});return;}
  this.busy=true;this.service.engine.updateBarrier=true;
  try{
   await this.service.engine.schedulerTick;
   if(this.job().phase!=='waiting-for-idle'||this.waiting(job).length){this.service.engine.updateBarrier=false;return;}
   // No await between the final idle check, durable handoff and graceful Quit.
   await this.spawnHelper(this.job(),true);
   if(this.job().phase!=='waiting-for-idle'||this.waiting(job).length){this.service.engine.updateBarrier=false;return;}
   const preservationHash=this.preservation();
   writeJob(this.file,{phase:'stopping',ownerPid:process.pid,checkpointContext:run?this.context(run):null,stoppedEventCount:run?.events.length||0,preservationHash});this.quit();
  }catch(error){writeJob(this.file,{phase:'prepared',blocker:error.message});this.service.engine.updateBarrier=false;throw error;}
  finally{this.busy=false;}
 }
 spawnHelper(job,arm=false){
  if(this.launchHelper)return this.launchHelper(job);
  const log=fs.openSync(path.join(path.dirname(job.file),'helper.log'),'a',0o600);
  const child=spawn(job.candidate.executable,[path.join(job.candidate.bundle,this.platform==='darwin'?'Contents/Resources/app':'resources/app','desktop/updates/update-helper.cjs'),arm?'arm':'supervise',job.file],{detached:true,cwd:path.dirname(job.file),stdio:['ignore',log,log,'ipc'],env:helperEnvironment()});fs.closeSync(log);child.unref();child.channel?.unref();
  if(!arm){child.on('error',error=>{this.error='The independent helper could not start: '+error.message;});return;}
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();finish(Error('The independent helper did not acknowledge readiness. Proteus stayed open.'));},15000);const finish=(error)=>{clearTimeout(timer);child.removeListener('error',failed);child.removeListener('exit',exited);child.removeListener('message',ready);if(child.connected)child.disconnect();child.channel?.unref();error?reject(error):resolve();};const failed=error=>finish(error),exited=()=>finish(Error('The independent helper exited before handoff. Proteus stayed open.')),ready=message=>{if(message?.ready===job.id)finish();else finish(Error('The helper acknowledged another job.'));};child.once('error',failed);child.once('exit',exited);child.once('message',ready);});
 }

 async recovery(value){
  const job=this.job();if(!job||!this.owns(job.file)||job.id!==value.id||job.secret!==value.secret||job.home!==this.ownerHome||job.installation!==this.installation)throw Error('This recovery request does not match the bound installation.');
  if(!['verifying','awaiting-chat-resume'].includes(job.phase))throw Error('The update is not awaiting recovery verification.');
  if(value.action==='verify'){await this.refreshIdentity();const identity=this.identity();if((this.service.windowCount?.()||0)<1||this.service.updateUIHealth&&!await this.service.updateUIHealth())throw Error('The restored app window is not ready.');if(!identity.barrier)throw Error('Recovery dispatch is not behind its idle barrier.');const preservation=this.verifyPreservation(job);return {identity,preservation,at:new Date().toISOString(),windows:this.service.windowCount?.()||0};}
  if(value.action==='quit'){this.quit();return {stopping:true};}
  if(value.action!=='resume')throw Error('Unknown update recovery action.');
  if(!job.runId){
   const identity=this.identity(),expected=value.outcome==='rollback'?job.previous:job.candidate;
   if(identity.sourceFingerprint!==expected.sourceFingerprint||(this.service.windowCount?.()||0)<1||this.service.updateUIHealth&&!await this.service.updateUIHealth())throw Error('The installed desktop update has not passed runtime/UI identity verification.');
   this.verifyPreservation(job);this.service.engine.updateBarrier=false;void this.service.engine.drain();
   return {accepted:true,delivery:{id:job.continuationId,state:'accepted',kind:'desktop'}};
  }
  const run=this.service.engine.getRun(job.runId),delivery=run.events.find(event=>event.data?.delivery?.id===job.continuationId)?.data?.delivery;
  if(delivery){this.service.engine.updateBarrier=false;void this.service.engine.drain();return delivery.state==='failed'?{ambiguous:true,reason:'The original continuation has an unresolved delivery failure. Inspect its provider session; it will not be replayed.'}:{accepted:true,delivery};}
  if(run.archivedAt||this.context(run)!==(job.checkpointContext||job.contextHash))return {ambiguous:true,reason:'The original chat or effective permissions changed. Automatic continuation requires review.'};
  if(['running','awaiting_input'].includes(run.status))return {accepted:false,reason:'Waiting for the original chat turn to settle.'};
  const catalog=run.schedule.provider==='rehearsal'?{available:true}:await this.service.catalogs[run.schedule.provider]?.get();
  if(!catalog?.available||this.service.engine.providerAuthHold?.(run.schedule.provider))return {accepted:false,reason:'Waiting for the original provider to reconnect. Sign-in requirements remain unchanged.'};
  const identity=this.identity(),prompt=`Proteus supervised update recovery (${job.id}). Outcome: ${job.failedBeforeReplacement?'update failed before replacement; previous app restarted and independently verified':value.outcome==='rollback'?'compatible rollback after candidate failure':'updated and independently verified'}. Current runtime: ${identity.buildRevision}; source ${identity.sourceFingerprint}. This is the authorized continuation of this same chat. Preserve existing permissions and retry receipts; do not repeat previous external effects.\n\nCheckpoint and remaining work:\n${job.checkpoint}\n\nContinue remaining verification now and report the actual outcome.`;
  this.delivering=true;
  try{const resumed=await this.service.engine.send(run.id,prompt,'queue',job.continuationId);this.service.engine.updateBarrier=false;void this.service.engine.drain();this.service.onUpdateResumed?.(run.id);return {accepted:true,delivery:resumed.events.find(event=>event.data?.delivery?.id===job.continuationId)?.data.delivery};}
  finally{this.delivering=false;}
 }
 close(){this.closed=true;clearInterval(this.timer);return this.packageQueue?.catch(()=>{});}
}
export function updateTools(controller,runId){return controller?[{name:'proteus_update',defer:'auto',description:'Inspect this running Proteus installation or supervise its own authorized update. Use maintenance to inspect bound application/backup folders and full recovery receipts, then maintain with its unchanged planDigest to reconcile missing records and retire eligible staging/backups. No arbitrary paths or elevated shell. Resolve the exact requested version through resolve-release before building; reuse matching signed releases. List published releases, then stage the selected release ID and manifest digest, or import an offline signed release manifest. The owner verifies publisher signature, target, archive hashes and isolated UI startup. Local developer candidates retain their explicit source-fingerprint flow on Mac/Linux. Handoff records completed/remaining work and returns before shutdown: finish this turn so the idle barrier can start the independent helper. It never cancels unrelated work. Compatible restart/rollback automatically continues this same chat with one durable delivery ID. Refresh status/revision before handoff/cancel; source mode is reported honestly.',parameters:{type:'object',properties:{action:{type:'string',enum:['status','identity','build-release','build-status','cancel-build','storage','maintenance','maintain','releases','resolve-release','stage-release','import-release','prepare','handoff','cancel']},channel:{type:'string',enum:['stable','preview']},operationId:{type:'string'},buildRequestHash:{type:'string'},version:{type:'string'},sourceCommit:{type:'string'},planDigest:{type:'string'},releaseId:{type:'string'},manifestDigest:{type:'string'},manifest:{type:'string'},candidate:{type:'string'},sourceFingerprint:{type:'string'},checkpoint:{type:'string'},id:{type:'string'},expectedRevision:{type:'integer'}},required:['action'],additionalProperties:false},handler:async args=>JSON.stringify(await controller.handle(args,runId))}]:[];}
