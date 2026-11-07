// Runs with the staged signed Electron runtime, outside the installation being replaced.
// It never starts a provider or owns the application-data runner lock.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const {privateTemporaryDirectory}=require('../../src/shared/private-paths.cjs');
const {atomic,tree,inspectPackage,compatible,copyTree,spaceBudget,readJob,writeJob,recoveryPolicy,digest,excluded}=require('./update-package.cjs');
const {copyRecovery}=require('./update-storage.cjs');
const {dataOwner,settledRecovery}=require('./recovery-quiescence.cjs');
const {verifyCandidate}=require('./update-candidate.cjs');
const {recordFailure}=require('./update-failure.cjs');
const {withoutCrashpadEnvironment}=require('./helper-environment.cjs');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const alive=pid=>{try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
async function until(check,timeout,label){const end=Date.now()+timeout;while(!await check()){if(Date.now()>=end)throw Error('Timed out: '+label);await sleep(250);}}
function environment(home,browser,extra={},source=process.env){
 // Keep the same provider-owned credential namespaces/executables on restart and
 // rollback. These are locations, not tokens; do not copy authentication secrets
 // or Electron's helper-only RUN_AS_NODE switch into the relaunched application.
 // Chromium uses the desktop identity as well as the bus to select protected
 // credential storage. Losing KDE/GNOME context can select another backend even
 // with an unlocked wallet. Preserve existing values, never infer a backend.
 const names=['PATH','HOME','USER','LOGNAME','SHELL','LANG','LC_ALL','DISPLAY','WAYLAND_DISPLAY','XAUTHORITY','XDG_RUNTIME_DIR','DBUS_SESSION_BUS_ADDRESS','XDG_CURRENT_DESKTOP','XDG_SESSION_DESKTOP','DESKTOP_SESSION','KDE_FULL_SESSION','KDE_SESSION_VERSION','XDG_SESSION_TYPE','TMPDIR','TMP','TEMP','SystemRoot','WINDIR','ComSpec','USERPROFILE','HOMEDRIVE','HOMEPATH','LOCALAPPDATA','APPDATA','COMPUTERNAME','CLAUDE_CONFIG_DIR','PROTEUS_CLAUDE_PATH','CODEX_HOME','PROTEUS_CODEX_PATH','COPILOT_HOME','COPILOT_CLI_PATH'];
 const env=Object.fromEntries(names.filter(name=>source[name]!==undefined).map(name=>[name,source[name]]));
 return withoutCrashpadEnvironment({...env,PROTEUS_HOME:home,PORT:'0',...extra,...(browser?{COPILOT_HOME:path.join(home,'copilot'),COPILOT_CLI_PATH:path.join(home,'no-copilot'),CODEX_HOME:path.join(home,'codex'),PROTEUS_CODEX_PATH:path.join(home,'no-codex'),PROTEUS_CLAUDE_PATH:path.join(home,'no-claude'),CLAUDE_CONFIG_DIR:path.join(home,'claude')}:{} )});
}
async function smoke(candidate){
 const temporary=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-update-test-')),home=path.join(temporary,'data');fs.mkdirSync(home);let app;
 try{const {_electron}=require('playwright');app=await _electron.launch({executablePath:candidate.executable,args:[process.platform==='darwin'?'--use-mock-keychain':'--password-store=basic','--user-data-dir='+path.join(temporary,'browser')],env:environment(home,true),timeout:60000});const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor({timeout:60000});const info=await page.evaluate(async()=>{const response=await fetch('/api/home');if(!response.ok)throw Error('Update test could not reach its owner.');return response.json();});if(info.buildRevision!==candidate.buildRevision||errors.length)throw Error('The candidate failed isolated UI/runtime acceptance.');return {passed:true,at:new Date().toISOString(),buildRevision:info.buildRevision,sourceFingerprint:candidate.sourceFingerprint,hash:candidate.hash,checks:['exact packaged hashes/signing','isolated renderer startup','owner API identity'],scope:'synthetic smoke; no real provider or production data accessed'};}
 finally{if(app)await app.close();fs.rmSync(temporary,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
}
async function ownerRequest(job,route,body){
 const connection=JSON.parse(fs.readFileSync(path.join(job.home,'connection.json'),'utf8')),url=new URL(connection.origin);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/'||!Number.isSafeInteger(connection.pid)||!alive(connection.pid))throw Error('The updated owner is unavailable.');
 const response=await fetch(url.origin+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+connection.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Update owner request failed.');return result;
}
async function verifyLive(job,identity){return require('./recovery-verification.cjs').verifyRecovery(job,identity,{request:ownerRequest});}
function launch(job){const executable=require('./update-package.cjs').packagePaths(job.installation).executable,log=fs.openSync(path.join(path.dirname(job.file),'launch.log'),'a',0o600),child=spawn(executable,['--user-data-dir='+job.browserHome],{detached:true,stdio:['ignore',log,log],env:environment(job.home,false,{PROTEUS_UPDATE_JOB:job.file})});child.unref();fs.closeSync(log);return child;}
function retire(file,job,{inspect=inspectPackage}={}){
 const inventory=recoveryPolicy(file,job),rows=inventory.generations.slice().sort((a,b)=>a.at.localeCompare(b.at));
 if(rows.length<=2)return inventory;
 // A new full generation and the running outcome must verify before either
 // previous generation can retire. Budget the temporary third copy up front.
 if(!job.health||!['verifying','awaiting-chat-resume','complete'].includes(job.phase)||!rows.some(row=>row.directory===job.recovery))throw Error('Verify the new recovery and live outcome before retirement.');
 const {verifyGeneration}=require('./update-maintenance.cjs');
 for(const row of rows)verifyGeneration(row,job,{inspect});
 const retired=rows.slice(0,-2);if(retired.some(row=>row.eligible!==true))throw Error('An older unresolved recovery generation was preserved.');
 for(const row of retired){const commands=process.platform==='win32'?'':require('node:child_process').execFileSync('/bin/ps',['-ax','-o','command='],{encoding:'utf8'});if(process.platform==='win32'?require('./windows-installation.cjs').inUse(row.directory):commands.split('\n').some(command=>command.includes(row.directory+path.sep)))throw Error('A retained recovery application is in use. Finish that process before updating.');}
 const receiptFile=path.join(path.dirname(job.file),'recovery-retirement.json'),intentFile=path.join(path.dirname(job.file),'recovery-retirement-intent.json');
 if(fs.existsSync(intentFile))throw Error('A prior recovery retirement needs receipt-based reconciliation before retry.');
 const available=()=>{const stat=fs.statfsSync(path.dirname(file));return Number(stat.bavail)*Number(stat.bsize);},before=available();
 atomic(intentFile,{schemaVersion:1,jobId:job.id,at:new Date().toISOString(),policyBefore:inventory,retiredReceipts:retired.map(row=>({id:row.id,receipt:JSON.parse(fs.readFileSync(row.receiptFile,'utf8'))})),survivors:rows.slice(-2).map(row=>({id:row.id,receiptHash:row.receiptHash}))});
 for(const row of retired){
  fs.rmSync(row.directory,{recursive:true});inventory.generations=inventory.generations.filter(item=>item.directory!==row.directory);atomic(file,inventory);
 }
 atomic(receiptFile,{schemaVersion:1,jobId:job.id,at:new Date().toISOString(),retired:retired.map(row=>row.id),retained:inventory.generations.map(row=>row.id),freeSpaceChange:available()-before});
 return inventory;
}
function retainGeneration(job){
 const file=job.recoveryPolicy,inventory=recoveryPolicy(file,job),receiptFile=path.join(job.recovery,'recovery.json');
 const retained=inventory.generations.find(row=>row.directory===job.recovery);
 if(retained){if(!fs.existsSync(retained.receiptFile)||digest(fs.readFileSync(retained.receiptFile))!==retained.receiptHash)throw Error('A retained recovery receipt is missing or changed. Preserve the recovery inventory for inspection.');return {retained:true};}
 let receiptHash;
 try{receiptHash=digest(fs.readFileSync(receiptFile));}
 catch(error){
  if(error.code!=='ENOENT')throw error;
  // A maintenance audit can explicitly record a pre-existing lost generation.
  // This is unavailable history, never a verified backup or a recreated receipt.
  const unavailable=inventory.unavailableGenerations?.find(row=>row.id===job.id&&row.directory===job.recovery&&row.available===false&&row.verified===false&&row.eligible===false&&row.reason==='directory absent during verified maintenance');
  if(job.phase==='complete'&&!fs.existsSync(job.recovery)&&unavailable&&inventory.audit?.kind==='owner-maintenance'&&inventory.generations.some(row=>row.verified&&fs.existsSync(row.receiptFile)&&digest(fs.readFileSync(row.receiptFile))===row.receiptHash))return {retained:false,unavailable:true,recordedByMaintenance:true};
  // A completed historical job may outlive its deliberately rotated payload.
  // Recognize that only from two newer, currently verified recovery receipts;
  // never recreate a deleted generation or suppress an unresolved missing copy.
  const later=inventory.generations.filter(row=>row.eligible===true&&Date.parse(row.at)>Date.parse(job.createdAt));
  if(job.phase==='complete'&&!fs.existsSync(job.recovery)&&later.length>=2&&later.every(row=>fs.existsSync(row.receiptFile)&&digest(fs.readFileSync(row.receiptFile))===row.receiptHash))return {retained:false,superseded:true,verifiedSuccessors:later.map(row=>row.id)};
  throw Error('The completed update recovery receipt is missing. Verify and reconcile the retained recovery generations before another restart.');
 }
 inventory.generations.push({id:job.id,directory:job.recovery,at:new Date().toISOString(),receiptFile,receiptHash,verified:true,eligible:true});atomic(file,inventory);return {retained:true};
}

async function installWindows(job,candidate,{inspect=inspectPackage,rollback=false,runInstaller=require('./windows-installation.cjs').runInstaller,verifyRegistration=require('./windows-installation.cjs').verifyRegistration}={}){
 const windows=require('./windows-installation.cjs'),recoveryApp=path.join(job.recovery,'Proteus');
 if(!fs.existsSync(recoveryApp)){
  if(rollback)throw Error('The Windows recovery application is unavailable.');
  const current=inspect(job.installation);if(current.installationHash!==job.previous.installationHash)throw Error('The Windows installation changed before recovery capture.');
  copyTree(job.installation,recoveryApp);
 }
 const previous=inspect(recoveryApp);
 if(previous.installationHash!==job.previous.installationHash)throw Error('The exact Windows recovery snapshot changed.');
 const selected=rollback?previous:candidate,installer=windows.installerFor(selected);
 // Record the verified single recovery generation before the registered installer
 // can change anything. Retrying uses the same app/data snapshot.
 atomic(path.join(job.recovery,'recovery.json'),{schemaVersion:1,verified:true,at:new Date().toISOString(),previous:job.previous,roots:job.recoveryData,app:'Proteus'});
 let current;try{current=inspect(job.installation);}catch{}
 let registered=false;try{verifyRegistration(job.installation,selected.version);registered=true;}catch{}
 if(current?.hash!==selected.hash||current?.installer?.sha256!==selected.installer.sha256||!registered)await runInstaller(installer,job.installation);
 const installed=inspect(job.installation);
 if(installed.hash!==selected.hash||installed.installer?.sha256!==selected.installer.sha256)throw Error('The Windows installer did not install the accepted application bytes.');
 verifyRegistration(job.installation,selected.version);
 return installed;
}

async function resume(job,outcome){
 let delay=1000;
 for(;;){
  try{const reply=await ownerRequest(job,'/api/updates/recovery',{action:'resume',id:job.id,secret:job.secret,outcome});if(reply.ambiguous)throw Object.assign(Error(reply.reason),{terminal:true});if(reply.accepted)return writeJob(job.file,{phase:'complete',outcome,blocker:null,continuation:job.runId?{id:job.continuationId,acceptedAt:new Date().toISOString(),delivery:reply.delivery}:null,helperPid:process.pid,error:null});writeJob(job.file,{phase:'awaiting-chat-resume',outcome,blocker:reply.reason||'Waiting for the original provider.'});}
  catch(error){if(error.terminal){writeJob(job.file,{phase:'attention',error:error.message});throw error;}writeJob(job.file,{phase:'awaiting-chat-resume',outcome,blocker:error.message});}
  await sleep(delay);delay=Math.min(60000,delay*2);
 }
}
async function supervise(file,{inspect=inspectPackage,request=ownerRequest,launchApp=launch,verify=verifyLive,resumeChat=resume}={}){
 let job=readJob(file);if(job.phase==='complete'){if(job.recovery&&!job.failedBeforeReplacement)retainGeneration(job);return job;}if(['cancelled','attention'].includes(job.phase))return job;
 const lock=file+'.helper-lock';try{fs.writeFileSync(lock,String(process.pid),{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;const pid=Number(fs.readFileSync(lock,'utf8'));if(!Number.isSafeInteger(pid)||alive(pid))throw Error('An updater already owns this journal.');fs.unlinkSync(lock);fs.writeFileSync(lock,String(process.pid),{flag:'wx',mode:0o600});}
 try{
  job=writeJob(file,{helperPid:process.pid});
  const candidate=verifyCandidate(job,'supervise',{inspect});
  if(['stopping','backing-up'].includes(job.phase)){
   await until(()=>!alive(job.ownerPid)&&!dataOwner(job.home,{alive}),60000,'graceful app exit and runner lock release');
   const current=inspect(job.installation);compatible(current,candidate);if(current.hash!==job.previous.hash)throw Error('The installed application changed after acceptance.');
   const stat=fs.statfsSync(path.dirname(job.installation)),before=Number(stat.bavail)*Number(stat.bsize);
   const roots=[...new Set([job.home,job.browserHome])].filter(root=>root&&![job.home,job.browserHome].some(parent=>parent&&parent!==root&&root.startsWith(parent+path.sep))),copyOptions=roots.map(root=>({recoveryCaches:job.recoveryCachePolicy===1&&!!job.browserHome&&(job.browserHome===root||job.browserHome.startsWith(root+path.sep)),cachePrefix:job.browserHome&&(job.browserHome===root||job.browserHome.startsWith(root+path.sep))?path.relative(root,job.browserHome).split(path.sep).join('/'):'',runtimePrefix:job.home===root||job.home.startsWith(root+path.sep)?path.relative(root,job.home).split(path.sep).join('/'):null})),sizes=await settledRecovery(roots,copyOptions.map(options=>({exclude:excluded,...options})),{released:()=>!alive(job.ownerPid)&&!dataOwner(job.home,{alive})});
   if(roots.some(root=>path.dirname(file).startsWith(root+path.sep)))throw Error('Recovery journals must be outside the data snapshots.');
   const recovery=job.recovery||path.join(job.recoveryRoot,job.id);fs.mkdirSync(recovery,{recursive:true,mode:0o700});
   const crossVolume=fs.statSync(path.dirname(job.installation)).dev!==fs.statSync(recovery).dev;
   const volumes=spaceBudget([{directory:recovery,bytes:sizes.reduce((sum,row)=>sum+row.bytes,0)+(crossVolume||job.platform==='win32'?current.bytes:0)},{directory:path.dirname(job.installation),bytes:candidate.bytes+(crossVolume||job.platform==='win32'?current.bytes:0)}]);
   job=writeJob(file,{phase:'backing-up',recovery,freeSpaceBefore:job.freeSpaceBefore??before,volumeBudgets:volumes,recoveryData:roots.map((root,index)=>({root,...sizes[index],recoveryCachePolicy:copyOptions[index].recoveryCaches?1:0,cachePrefix:copyOptions[index].cachePrefix,runtimePrefix:copyOptions[index].runtimePrefix}))});
   for(const [index,root]of roots.entries()){
    if(dataOwner(job.home,{alive}))throw Error('A live owner reclaimed its data home before recovery copying.');
    copyRecovery(root,path.join(recovery,'data-'+index),{manifestFile:path.join(recovery,'copy-'+index+'.json'),expectedHash:sizes[index].hash,...copyOptions[index]});
   }
   if(dataOwner(job.home,{alive}))throw Error('A live owner reclaimed its data home during recovery copying.');
   const next=job.platform==='win32'?candidate.bundle:job.installation+'.next-'+job.id;if(!fs.existsSync(next))copyTree(candidate.bundle,next);if(inspect(next).hash!==candidate.hash)throw Error('Staged replacement differs from accepted bytes.');
   job=writeJob(file,{phase:'installing',replacement:next});
  }
  if(job.phase==='installing'){
   if(!job.recoveryData?.length)throw Error('The verified data recovery receipt is missing.');
   for(const [index,row]of job.recoveryData.entries())if(tree(path.join(job.recovery,'data-'+index),{exclude:excluded,recoveryCaches:row.recoveryCachePolicy===1,cachePrefix:row.cachePrefix||'',runtimePrefix:row.runtimePrefix??null}).hash!==row.hash)throw Error('A recovery data snapshot changed before replacement.');
   if(job.platform==='win32'){
    try{await installWindows(job,candidate,{inspect});job=writeJob(file,{phase:'verifying',outcome:'updated'});}
    catch(error){recordFailure(file,'installing',error);job=writeJob(file,{phase:'recovering',failedBuild:candidate.buildRevision,error:error.message,launchPid:null});}
   }else{
   const recoveryApp=path.join(job.recovery,'Proteus.app'),installed=fs.existsSync(job.installation)?inspect(job.installation):null;
   if(installed?.hash===job.previous.hash){
    if(!fs.existsSync(recoveryApp)){
     if(fs.statSync(path.dirname(job.installation)).dev===fs.statSync(job.recovery).dev)fs.renameSync(job.installation,recoveryApp);
     else {copyTree(job.installation,recoveryApp);if(inspect(recoveryApp).hash!==job.previous.hash)throw Error('Cross-volume recovery verification failed.');}
    }
    if(fs.existsSync(job.installation)){if(inspect(recoveryApp).hash!==job.previous.hash)throw Error('The recovery app changed.');const oldSlot=job.installation+'.old-'+job.id;if(fs.existsSync(oldSlot))throw Error('An unexpected in-flight old application needs inspection.');fs.renameSync(job.installation,oldSlot);}
   }
   else if(installed&&installed.hash!==candidate.hash)throw Error('The installation has an unexpected identity; it was preserved.');
   if(!fs.existsSync(recoveryApp)||inspect(recoveryApp).hash!==job.previous.hash)throw Error('The exact recovery application is missing.');
   if(!fs.existsSync(job.installation)){if(!fs.existsSync(job.replacement)||inspect(job.replacement).hash!==candidate.hash)throw Error('The accepted replacement is unavailable.');fs.renameSync(job.replacement,job.installation);}
   if(inspect(job.installation).hash!==candidate.hash)throw Error('Installed update does not match accepted bytes.');
   const oldSlot=job.installation+'.old-'+job.id;if(fs.existsSync(oldSlot)){if(inspect(oldSlot).hash!==job.previous.hash)throw Error('The in-flight old app changed.');fs.rmSync(oldSlot,{recursive:true,force:true});}
   atomic(path.join(job.recovery,'recovery.json'),{schemaVersion:1,verified:true,at:new Date().toISOString(),previous:job.previous,roots:job.recoveryData,app:'Proteus.app'});
   job=writeJob(file,{phase:'verifying',outcome:'updated'});
   }
  }
  const stopFailed=async()=>{
   try{await request(job,'/api/updates/recovery',{action:'quit',id:job.id,secret:job.secret});}catch{if(job.launchPid&&alive(job.launchPid))process.kill(job.launchPid,'SIGTERM');}
   await until(()=>!fs.existsSync(path.join(job.home,'runner.lock'))&&(!job.launchPid||!alive(job.launchPid)),60000,'failed candidate stopped before rollback');
  };
  const verifyOutcome=async(identity)=>{
   let connected=false;try{const connection=JSON.parse(fs.readFileSync(path.join(job.home,'connection.json'),'utf8'));connected=alive(connection.pid);}catch{}
   if(!connected&&(!job.launchPid||!alive(job.launchPid))){const child=launchApp(job);job=writeJob(file,{launchPid:child?.pid||null});}
   const health=await verify(job,identity);job=writeJob(file,{health});
  };
  if(job.phase==='verifying'){
   try{await verifyOutcome(job.outcome==='rollback'?job.previous:candidate);}
   catch(error){if(job.outcome==='rollback')throw error;recordFailure(file,'verifying',error);await stopFailed();job=writeJob(file,{phase:'recovering',failedBuild:candidate.buildRevision,error:error.message,launchPid:null});}
  }
  if(job.phase==='recovering'){
   if(job.platform==='win32'){
    await installWindows(job,candidate,{inspect,rollback:true});job=writeJob(file,{phase:'verifying',outcome:'rollback',launchPid:null});await verifyOutcome(job.previous);
   }else{
   const recoveryApp=path.join(job.recovery,'Proteus.app'),failed=job.installation+'.failed-'+job.id,installed=fs.existsSync(job.installation)?inspect(job.installation):null;
   if(installed?.hash===candidate.hash){if(fs.existsSync(failed))throw Error('A prior failed replacement needs inspection.');fs.renameSync(job.installation,failed);}
   else if(installed&&installed.hash!==job.previous.hash)throw Error('The rollback target changed; it was preserved.');
   if(!fs.existsSync(job.installation)){if(inspect(recoveryApp).hash!==job.previous.hash)throw Error('Recovery signing/hash verification failed.');const restored=job.installation+'.recover-'+job.id;if(!fs.existsSync(restored))copyTree(recoveryApp,restored);if(inspect(restored).hash!==job.previous.hash)throw Error('The restored baseline copy changed.');fs.renameSync(restored,job.installation);}
   if(inspect(job.installation).hash!==job.previous.hash)throw Error('Recovered application differs from the exact baseline.');
   if(!fs.existsSync(recoveryApp))copyTree(job.installation,recoveryApp);
   job=writeJob(file,{phase:'verifying',outcome:'rollback',launchPid:null});await verifyOutcome(job.previous);
   // The failed signed candidate remains in its immutable staging area while
   // the helper runs. Keep its receipt rather than a second failed app copy.
   fs.rmSync(failed,{recursive:true,force:true});
   }
  }
  if(!['verifying','awaiting-chat-resume'].includes(job.phase))throw Error('This update phase needs inspection before replacement can continue.');
  if(job.phase==='awaiting-chat-resume')await verifyOutcome(job.outcome==='rollback'?job.previous:candidate);
  if(!job.failedBeforeReplacement){
   require('./update-maintenance.cjs').verifyGeneration({directory:job.recovery},job,{inspect});
   retainGeneration(job);retire(job.recoveryPolicy,job,{inspect});
  }
  const after=fs.statfsSync(path.dirname(job.installation));job=writeJob(file,{phase:'awaiting-chat-resume',freeSpaceAfter:Number(after.bavail)*Number(after.bsize)});
  const result=await resumeChat(job,job.outcome);if(result.phase==='complete'&&!job.failedBeforeReplacement)retainGeneration(readJob(file));return result;
 }catch(error){
  const failed=recordFailure(file,readJob(file).phase,error);
  // Snapshot/preflight failure occurs after graceful Quit but before replacement.
  // Restart only an independently verified unchanged baseline, behind the same
  // recovery barrier and durable continuation. Never leave the operator with a
  // closed app, and never restore data or replay an uncertain provider delivery.
  if(['stopping','backing-up'].includes(failed.phase)){
   try{
    if(alive(failed.ownerPid)||dataOwner(failed.home,{alive}))throw Error('The previous owner has not released its data home.');
    if(inspect(failed.installation).hash!==failed.previous.hash)throw Error('The baseline changed before failed-preflight recovery.');
    const checkpoint=failed.checkpoint+'\n\nUpdate failed before application replacement: '+error.message+' The previous application is unchanged. Report this failure and inspect the preserved journal before any new installation attempt.';
    job=writeJob(file,{phase:'verifying',outcome:'rollback',failedBeforeReplacement:true,preInstallFailure:{phase:failed.phase,error:error.message,at:new Date().toISOString()},incompleteRecovery:failed.recovery||null,recovery:null,checkpoint,blocker:null});
    const child=launchApp(job);job=writeJob(file,{launchPid:child?.pid||null});
    const health=await verify(job,job.previous);job=writeJob(file,{phase:'awaiting-chat-resume',health});
    return await resumeChat(job,'rollback');
   }catch(recoveryError){writeJob(file,{phase:'attention',error:error.message+' Baseline recovery: '+recoveryError.message,helperPid:null});throw recoveryError;}
  }
  writeJob(file,{phase:'attention',error:error.message,helperPid:null});throw error;
 }
 finally{fs.rmSync(lock,{force:true});}
}

module.exports={smoke,supervise,installWindows,retire,retainGeneration,environment,ownerRequest,verifyLive,runCLI};
function runCLI(args=process.argv.slice(2)){const [action,file]=args;if(!['arm','supervise'].includes(action)||!path.isAbsolute(file||''))throw Error('Use the bound update journal.');void (async()=>{if(action==='arm'){const job=readJob(file);if(job.phase!=='waiting-for-idle')throw Error('This update is not waiting for handoff.');verifyCandidate(job,'readiness');writeJob(file,{helperPid:process.pid});process.send?.({ready:job.id});process.disconnect?.();await until(()=>{const phase=readJob(file).phase;if(['prepared','cancelled'].includes(phase))throw Error('The handoff was cancelled before shutdown.');return phase==='stopping';},60000,'host handoff');}return supervise(file);})().catch(error=>{console.error(error.message);process.exitCode=1;});}

if(require.main===module)runCLI();
