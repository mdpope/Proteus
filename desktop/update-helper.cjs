// Runs with the staged signed Electron runtime, outside the installation being replaced.
// It never starts a provider or owns the application-data runner lock.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const {atomic,tree,inspectPackage,compatible,copyTree,spaceBudget,readJob,writeJob,recoveryPolicy,digest,excluded}=require('./update-package.cjs');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const alive=pid=>{try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
async function until(check,timeout,label){const end=Date.now()+timeout;while(!await check()){if(Date.now()>=end)throw Error('Timed out: '+label);await sleep(250);}}
function environment(home,browser,extra={}){const names=['PATH','HOME','USER','LOGNAME','SHELL','LANG','LC_ALL','DISPLAY','WAYLAND_DISPLAY','XAUTHORITY','XDG_RUNTIME_DIR','DBUS_SESSION_BUS_ADDRESS','TMPDIR','TMP','TEMP'];const env=Object.fromEntries(names.filter(name=>process.env[name]!==undefined).map(name=>[name,process.env[name]]));return {...env,PROTEUS_HOME:home,PORT:'0',...extra,...(browser?{COPILOT_HOME:path.join(home,'copilot'),COPILOT_CLI_PATH:path.join(home,'no-copilot'),PROTEUS_CODEX_PATH:path.join(home,'no-codex'),PROTEUS_CLAUDE_PATH:path.join(home,'no-claude'),CLAUDE_CONFIG_DIR:path.join(home,'claude')}:{} )};}
async function smoke(candidate){
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-update-test-')),home=path.join(temporary,'data');fs.mkdirSync(home);let app;
 try{const {_electron}=require('playwright');app=await _electron.launch({executablePath:candidate.executable,args:[process.platform==='darwin'?'--use-mock-keychain':'--password-store=basic','--user-data-dir='+path.join(temporary,'browser')],env:environment(home,true),timeout:60000});const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor({timeout:30000});const info=await page.evaluate(async()=>{const response=await fetch('/api/home');if(!response.ok)throw Error('Update test could not reach its owner.');return response.json();});if(info.buildRevision!==candidate.buildRevision||errors.length)throw Error('The candidate failed isolated UI/runtime acceptance.');return {passed:true,at:new Date().toISOString(),buildRevision:info.buildRevision,sourceFingerprint:candidate.sourceFingerprint,hash:candidate.hash,checks:['exact packaged hashes/signing','isolated renderer startup','owner API identity'],scope:'synthetic smoke; no real provider or production data accessed'};}
 finally{if(app)await app.close();fs.rmSync(temporary,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
}
async function ownerRequest(job,route,body){
 const connection=JSON.parse(fs.readFileSync(path.join(job.home,'connection.json'),'utf8')),url=new URL(connection.origin);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/'||!Number.isSafeInteger(connection.pid)||!alive(connection.pid))throw Error('The updated owner is unavailable.');
 const response=await fetch(url.origin+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+connection.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Update owner request failed.');return result;
}
async function verifyLive(job,identity){let receipt;await until(async()=>{try{receipt=await ownerRequest(job,'/api/updates/recovery',{action:'verify',id:job.id,secret:job.secret});return receipt.identity?.sourceFingerprint===identity.sourceFingerprint&&receipt.identity?.installation===job.installation&&receipt.identity?.home===job.home&&receipt.identity?.barrier===true;}catch{return false;}},60000,'updated host identity and recovery barrier');return receipt;}
function launch(job){const executable=require('./update-package.cjs').packagePaths(job.installation).executable,log=fs.openSync(path.join(path.dirname(job.file),'launch.log'),'a',0o600),child=spawn(executable,['--user-data-dir='+job.browserHome],{detached:true,stdio:['ignore',log,log],env:environment(job.home,false,{PROTEUS_UPDATE_JOB:job.file})});child.unref();fs.closeSync(log);return child;}
function retire(file,job){
 const inventory=recoveryPolicy(file,job),rows=inventory.generations.slice().sort((a,b)=>a.at.localeCompare(b.at));
 while(rows.length>=2){const index=rows.findIndex(row=>row.eligible===true);if(index<0)throw Error('Two unresolved recovery generations are retained. Finish their verification before creating another.');const row=rows[index];if(digest(fs.readFileSync(row.receiptFile))!==row.receiptHash)throw Error('A retained recovery receipt changed; no generation was removed.');
  const commands=require('node:child_process').execFileSync('/bin/ps',['-ax','-o','command='],{encoding:'utf8'});if(commands.split('\n').some(command=>command.includes(row.directory+path.sep)))throw Error('A retained recovery application is in use. Finish that process before updating.');
  fs.rmSync(row.directory,{recursive:true,force:true});rows.splice(index,1);inventory.generations=rows;atomic(file,inventory);
 }
 return inventory;
}
function retainGeneration(job){
 const file=job.recoveryPolicy,inventory=recoveryPolicy(file,job),receiptFile=path.join(job.recovery,'recovery.json');
 if(!inventory.generations.some(row=>row.directory===job.recovery)){inventory.generations.push({id:job.id,directory:job.recovery,at:new Date().toISOString(),receiptFile,receiptHash:digest(fs.readFileSync(receiptFile)),verified:true,eligible:true});atomic(file,inventory);}
}

async function resume(job,outcome){
 let delay=1000;
 for(;;){
  try{const reply=await ownerRequest(job,'/api/updates/recovery',{action:'resume',id:job.id,secret:job.secret,outcome});if(reply.ambiguous)throw Object.assign(Error(reply.reason),{terminal:true});if(reply.accepted)return writeJob(job.file,{phase:'complete',outcome,continuation:{id:job.continuationId,acceptedAt:new Date().toISOString(),delivery:reply.delivery},helperPid:process.pid,error:null});writeJob(job.file,{phase:'awaiting-chat-resume',outcome,blocker:reply.reason||'Waiting for the original provider.'});}
  catch(error){if(error.terminal){writeJob(job.file,{phase:'attention',error:error.message});throw error;}writeJob(job.file,{phase:'awaiting-chat-resume',outcome,blocker:error.message});}
  await sleep(delay);delay=Math.min(60000,delay*2);
 }
}
async function supervise(file,{inspect=inspectPackage,request=ownerRequest,launchApp=launch,verify=verifyLive,resumeChat=resume}={}){
 let job=readJob(file);if(job.phase==='complete'){if(job.recovery)retainGeneration(job);return job;}if(['cancelled','attention'].includes(job.phase))return job;
 const lock=file+'.helper-lock';try{fs.writeFileSync(lock,String(process.pid),{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;const pid=Number(fs.readFileSync(lock,'utf8'));if(!Number.isSafeInteger(pid)||alive(pid))throw Error('An updater already owns this journal.');fs.unlinkSync(lock);fs.writeFileSync(lock,String(process.pid),{flag:'wx',mode:0o600});}
 try{
  job=writeJob(file,{helperPid:process.pid});
  const candidate=inspect(job.candidate.bundle);if(candidate.hash!==job.candidate.hash)throw Error('The accepted staged candidate changed.');
  if(['stopping','backing-up'].includes(job.phase)){
   await until(()=>!alive(job.ownerPid)&&!fs.existsSync(path.join(job.home,'runner.lock')),60000,'graceful app exit and runner lock release');
   const current=inspect(job.installation);compatible(current,candidate);if(current.hash!==job.previous.hash)throw Error('The installed application changed after acceptance.');
   const stat=fs.statfsSync(path.dirname(job.installation)),before=Number(stat.bavail)*Number(stat.bsize);
   const roots=[...new Set([job.home,job.browserHome])].filter(root=>root&&![job.home,job.browserHome].some(parent=>parent&&parent!==root&&root.startsWith(parent+path.sep))),sizes=roots.map(root=>tree(root,{exclude:excluded}));
   if(roots.some(root=>path.dirname(file).startsWith(root+path.sep)))throw Error('Recovery journals must be outside the data snapshots.');
   if(!job.recovery)retire(job.recoveryPolicy,job);const recovery=job.recovery||path.join(job.recoveryRoot,job.id);fs.mkdirSync(recovery,{recursive:true,mode:0o700});
   const crossVolume=fs.statSync(path.dirname(job.installation)).dev!==fs.statSync(recovery).dev;
   const volumes=spaceBudget([{directory:recovery,bytes:sizes.reduce((sum,row)=>sum+row.bytes,0)+(crossVolume?current.bytes:0)},{directory:path.dirname(job.installation),bytes:candidate.bytes+(crossVolume?current.bytes:0)}]);
   job=writeJob(file,{phase:'backing-up',recovery,freeSpaceBefore:job.freeSpaceBefore??before,volumeBudgets:volumes,recoveryData:roots.map((root,index)=>({root,...sizes[index]}))});
   for(const [index,root]of roots.entries()){const destination=path.join(recovery,'data-'+index);if(!fs.existsSync(destination)||tree(destination,{exclude:excluded}).hash!==sizes[index].hash)copyTree(root,destination);if(tree(destination,{exclude:excluded}).hash!==sizes[index].hash)throw Error('Recovery data verification failed; the installation is unchanged.');}
   const next=job.installation+'.next-'+job.id;if(!fs.existsSync(next))copyTree(candidate.bundle,next);if(inspect(next).hash!==candidate.hash)throw Error('Staged replacement differs from accepted bytes.');
   job=writeJob(file,{phase:'installing',replacement:next});
  }
  if(job.phase==='installing'){
   if(!job.recoveryData?.length)throw Error('The verified data recovery receipt is missing.');
   for(const [index,row]of job.recoveryData.entries())if(tree(path.join(job.recovery,'data-'+index),{exclude:excluded}).hash!==row.hash)throw Error('A recovery data snapshot changed before replacement.');
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
   catch(error){if(job.outcome==='rollback')throw error;await stopFailed();job=writeJob(file,{phase:'recovering',failedBuild:candidate.buildRevision,error:error.message,launchPid:null});}
  }
  if(job.phase==='recovering'){
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
  if(!['verifying','awaiting-chat-resume'].includes(job.phase))throw Error('This update phase needs inspection before replacement can continue.');
  if(job.phase==='awaiting-chat-resume')await verifyOutcome(job.outcome==='rollback'?job.previous:candidate);
  const after=fs.statfsSync(path.dirname(job.installation));job=writeJob(file,{phase:'awaiting-chat-resume',freeSpaceAfter:Number(after.bavail)*Number(after.bsize)});
  const result=await resumeChat(job,job.outcome);if(result.phase==='complete')retainGeneration(readJob(file));return result;
 }catch(error){writeJob(file,{phase:'attention',error:error.message,helperPid:null});throw error;}
 finally{fs.rmSync(lock,{force:true});}
}

module.exports={smoke,supervise,retire,retainGeneration,environment,ownerRequest,verifyLive};
if(require.main===module){const [action,file]=process.argv.slice(2);if(!['arm','supervise'].includes(action)||!path.isAbsolute(file||''))throw Error('Use the bound update journal.');void (async()=>{if(action==='arm'){const job=readJob(file);if(job.phase!=='waiting-for-idle')throw Error('This update is not waiting for handoff.');process.send?.({ready:job.id});process.disconnect?.();await until(()=>{const phase=readJob(file).phase;if(['prepared','cancelled'].includes(phase))throw Error('The handoff was cancelled before shutdown.');return phase==='stopping';},60000,'host handoff');}return supervise(file);})().catch(error=>{console.error(error.message);process.exitCode=1;});}
