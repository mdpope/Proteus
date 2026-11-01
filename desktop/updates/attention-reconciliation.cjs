// A post-health retirement failure is not an installation failure. Resolve its
// maintenance hold with a separate, verifiable receipt; never rewrite the old
// journal, replay a continuation, repair a backup, or delete anything here.
const fs=require('node:fs'),path=require('node:path');
const {digest,fileDigest,readJob,inspectPackage}=require('./update-package.cjs');
const alive=pid=>{if(!Number.isSafeInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
function ordinary(file){
 for(let part=path.resolve(file);;part=path.dirname(part)){
  try{if(fs.lstatSync(part).isSymbolicLink())throw Error('Reconciliation paths must not traverse symbolic links.');}catch(error){if(error.code!=='ENOENT')throw error;}
  if(path.dirname(part)===part)break;
 }
 return file;
}
function json(file){ordinary(file);const stat=fs.statSync(file);if(!stat.isFile()||stat.size>1024*1024)throw Error('Reconciliation metadata must be a bounded ordinary file.');return JSON.parse(fs.readFileSync(file,'utf8'));}
function resolutionFile(job){return path.join(path.dirname(job.file),'attention-resolution.json');}
const witnessFields=['schemaVersion','kind','jobId','home','installation','jobHash','originalError','candidateHash','preservationHash','originalHealthAt','ownerPid','maintenanceDigest','recoveries'];
function readAttentionResolution(job,owner=job){
 const file=resolutionFile(job);ordinary(file);if(!fs.existsSync(file))return null;
 const row=json(file);
 if(row.schemaVersion!==1||row.kind!=='verified-post-install-attention'||row.jobId!==job.id||row.home!==owner.home||row.installation!==owner.installation||row.jobHash!==fileDigest(job.file)||job.phase!=='attention'||job.outcome!=='updated'||!job.health||job.error!=='Recovery data differs from its receipt.'||row.originalError!==job.error||row.candidateHash!==job.candidate.hash||row.preservationHash!==job.preservationHash||row.originalHealthAt!==job.health.at||!Number.isFinite(Date.parse(row.at))||!/^[a-f0-9]{64}$/.test(row.planDigest||'')||!Array.isArray(row.recoveries)||row.recoveries.length<2||!row.recoveries.some(r=>r.directory===job.recovery))throw Error('Attention reconciliation differs from the preserved update journal.');
 if(digest(JSON.stringify(Object.fromEntries(witnessFields.map(key=>[key,row[key]]))))!==row.planDigest)throw Error('Attention reconciliation verification evidence changed.');
 return {...row,receiptFile:file,receiptHash:fileDigest(file)};
}
function attentionPlan(root,options={},dependencies={}){
 if(!/^[-a-f0-9]{36}$/.test(options.id||''))throw Error('Choose one exact attention job.');
 const maintenance=require('./update-maintenance.cjs'),plan=maintenance.maintenancePlan(root,options,dependencies);
 const file=ordinary(path.join(root,'jobs',options.id,'job.json')),job=readJob(file);
 if(job.home!==plan.owner.home||job.installation!==plan.owner.installation||job.id!==options.id||job.revision!==options.expectedRevision)throw Error('The update changed. Refresh its status before reconciliation.');
 if(readAttentionResolution(job,plan.owner))throw Error('This attention job already has a reconciliation receipt. Inspect maintenance.');
 if(job.phase!=='attention'||job.outcome!=='updated'||job.failedBeforeReplacement||!job.recovery||!Number.isFinite(Date.parse(job.ordinaryWorkResumedAt))||!Number.isFinite(Date.parse(job.health?.at))||Date.parse(job.ordinaryWorkResumedAt)<Date.parse(job.health.at)||job.health?.identity?.packaged!==true||job.health.identity.home!==plan.owner.home||job.health.identity.installation!==plan.owner.installation||job.health.identity.sourceFingerprint!==job.candidate.sourceFingerprint||job.health.identity.buildRevision!==job.candidate.buildRevision||job.error!=='Recovery data differs from its receipt.')throw Error('Only a reviewed post-install recovery-checksum attention job with verified health can be reconciled.');
 if(plan.issues.some(row=>row.kind!=='active-update'||row.id!==job.id||row.phase!=='attention')||plan.missing.length||plan.discovered.length||plan.verified.length<2||!plan.verified.some(row=>row.directory===job.recovery))throw Error('All registered recoveries and other update work must verify before reconciliation.');
 const isAlive=dependencies.alive||alive;
 if(isAlive(job.helperPid)||fs.existsSync(ordinary(file+'.helper-lock')))throw Error('The independent helper or its lock is unresolved.');
 const current=(dependencies.inspect||inspectPackage)(plan.owner.installation,{platform:plan.owner.platform});
 if(current.hash!==job.candidate.hash||current.sourceFingerprint!==job.candidate.sourceFingerprint||job.candidate.installationHash&&current.installationHash!==job.candidate.installationHash||JSON.stringify(current.signing)!==JSON.stringify(job.candidate.signing))throw Error('The installed application no longer matches the verified outcome.');
 const connection=json(path.join(plan.owner.home,'connection.json')),lock=ordinary(path.join(plan.owner.home,'runner.lock'));
 if(fs.statSync(lock).size>128)throw Error('The owner lock needs inspection.');
 const ownerPid=Number(fs.readFileSync(lock,'utf8'));
 if(!Number.isSafeInteger(ownerPid)||ownerPid<1||connection.pid!==ownerPid||job.health.identity.pid!==ownerPid||!isAlive(ownerPid))throw Error('The verified application owner changed or is not running.');
 const preservationFile=ordinary(path.join(path.dirname(file),'preservation.json'));
 if(fs.statSync(preservationFile).size>16*1024*1024||!/^[a-f0-9]{64}$/.test(job.preservationHash||'')||fileDigest(preservationFile)!==job.preservationHash)throw Error('The original preservation receipt changed.');
 const preservation=JSON.parse(fs.readFileSync(preservationFile,'utf8'));
 if(preservation.schemaVersion!==1||!Array.isArray(preservation.runs)||preservation.runs.length!==job.health.preservation?.runs||preservation.runs.reduce((sum,row)=>sum+row.eventCount,0)!==job.health.preservation?.events)throw Error('The health and preservation receipts do not agree.');
 const state={schemaVersion:1,kind:'verified-post-install-attention',jobId:job.id,home:plan.owner.home,installation:plan.owner.installation,jobHash:fileDigest(file),originalError:job.error,candidateHash:current.hash,preservationHash:job.preservationHash,originalHealthAt:job.health.at,ownerPid,maintenanceDigest:plan.planDigest,recoveries:plan.verified.map(row=>({id:row.id,directory:row.directory,receiptHash:row.receiptHash})).sort((a,b)=>a.id.localeCompare(b.id))};
 return {...state,planDigest:digest(JSON.stringify(state)),canApply:true,jobRevision:job.revision,uiResponsivenessVerified:false,continuationReplayed:false};
}
function reconcileAttention(root,options={},dependencies={}){
 if(!/^[-a-f0-9]{36}$/.test(options.id||'')||!/^[a-f0-9]{64}$/.test(options.planDigest||''))throw Error('Inspect reconciliation and supply its exact job and plan digest.');
 const home=fs.realpathSync(options.home),installation=fs.realpathSync(options.installation);
 if(root!==path.join(path.dirname(home),'Proteus Updates',digest(home+'\0'+installation).slice(0,24))||fs.realpathSync(ordinary(root))!==root)throw Error('Reconciliation is bound to this installation and data home.');
 const file=ordinary(path.join(root,'jobs',options.id,'job.json')),job=readJob(file);
 if(job.revision!==options.expectedRevision)throw Error('The update changed. Refresh its status before reconciliation.');
 // A lost response returns the original receipt, never repeats an effect.
 const existing=readAttentionResolution(job,options);
 if(existing){if(existing.planDigest!==options.planDigest)throw Error('The reconciliation receipt belongs to another plan.');return {...existing,alreadyApplied:true};}
 const lock=ordinary(path.join(path.dirname(file),'attention-reconciliation.lock')),fd=fs.openSync(lock,'wx',0o600);
 try{
  fs.writeFileSync(fd,String(process.pid));fs.fsyncSync(fd);
  const plan=attentionPlan(root,options,dependencies);
  if(plan.planDigest!==options.planDigest)throw Error('Reconciliation state changed. Inspect a fresh plan; no state was changed.');
  if(fileDigest(file)!==plan.jobHash)throw Error('The preserved update journal changed before receipt commit.');
  const result={...plan,at:new Date().toISOString()},target=resolutionFile(job),temporary=ordinary(target+'.pending');
  const out=fs.openSync(temporary,'wx',0o600);
  try{fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');fs.fsyncSync(out);}finally{fs.closeSync(out);}
  try{fs.linkSync(temporary,target);}finally{fs.unlinkSync(temporary);}
  return {...result,receiptFile:target,receiptHash:fileDigest(target),alreadyApplied:false};
 }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
module.exports={attentionPlan,reconcileAttention,readAttentionResolution};
