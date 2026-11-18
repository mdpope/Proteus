// Retiring an obsolete attempt is not accepting its failed installation. Keep
// the original journal and bind a separate receipt to a later healthy owner.
const fs=require('node:fs'),path=require('node:path');
const {digest,fileDigest,tree,readJob,inspectPackage}=require('./update-package.cjs');
const fields=['schemaVersion','kind','jobId','home','installation','jobHash','originalError','successId','successHash','candidateHash','ownerPid','maintenanceDigest','recoveries','obsoleteRecovery'];
// Legacy snapshot failures predate failedBeforeReplacement. They have no
// installed outcome, health or replacement, and retain an explicit failure.
const failedAttempt=job=>job.outcome==='rollback'||job.failedBeforeReplacement||(!job.outcome&&!job.health&&!job.replacement&&typeof job.error==='string'&&!!job.error);
function witness(row){return Object.fromEntries(fields.map(key=>[key,row[key]]));}
function readResolution(row,job,owner){
 if(row.ownerRevalidation&&digest(JSON.stringify(row.ownerRevalidation))!==row.maintenanceDigest)throw Error('Fresh owner reconciliation evidence changed.');
 if(row.schemaVersion!==1||row.kind!=='superseded-failed-update'||job.phase!=='attention'||!failedAttempt(job)||row.jobId!==job.id||row.home!==owner.home||row.installation!==owner.installation||row.jobHash!==fileDigest(job.file)||row.originalError!==(job.error||null)||!Number.isFinite(Date.parse(row.at))||!Array.isArray(row.recoveries)||row.recoveries.length<2||digest(JSON.stringify(witness(row)))!==row.planDigest)throw Error('Superseded reconciliation differs from the preserved update journal.');
 return row;
}
function plan(job,maintenance,dependencies,{ordinary,json,alive}){
 const owner=maintenance.owner;
 if(job.phase!=='attention'||!failedAttempt(job))throw Error('Only a failed or rolled-back attempt can be superseded.');
 const isAlive=dependencies.alive||alive;
 if(isAlive(job.helperPid)||fs.existsSync(ordinary(job.file+'.helper-lock')))throw Error('The independent helper or its lock is unresolved.');
 // Other old attention jobs can be reviewed sequentially. They must not create
 // a circular requirement that each be cleared before any can be reconciled.
 const attentionIDs=new Set(maintenance.jobs.filter(row=>row.phase==='attention').map(row=>row.id));
 const allowedRoots=new Set([...attentionIDs].map(id=>path.join(owner.updates,'recoveries',id)));
 if(maintenance.missing.length||maintenance.discovered.length||maintenance.verified.length<2||maintenance.issues.some(row=>!(row.kind==='active-update'&&attentionIDs.has(row.id))&&!(row.kind==='unregistered-recovery'&&allowedRoots.has(row.directory))))throw Error('Two registered verified recoveries and resolved update work are required.');
 const current=(dependencies.inspect||inspectPackage)(owner.installation,{platform:owner.platform});
 const success=maintenance.jobs.filter(row=>row.phase==='complete').map(row=>readJob(ordinary(path.join(owner.updates,'jobs',row.id,'job.json')))).filter(row=>row.outcome==='updated'&&row.health?.identity?.packaged===true&&row.health.identity.home===owner.home&&row.health.identity.installation===owner.installation&&row.health.identity.sourceFingerprint===current.sourceFingerprint&&row.health.identity.buildRevision===row.candidate.buildRevision&&row.candidate.hash===current.hash&&row.candidate.sourceFingerprint===current.sourceFingerprint&&(!row.candidate.installationHash||row.candidate.installationHash===current.installationHash)&&JSON.stringify(row.candidate.signing)===JSON.stringify(current.signing)&&Date.parse(row.createdAt)>Date.parse(job.createdAt)&&Number.isFinite(Date.parse(row.health.at))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
 if(!success)throw Error('A later completed healthy update matching the current installation is required.');
 const connection=json(path.join(owner.home,'connection.json')),lock=ordinary(path.join(owner.home,'runner.lock'));
 if(fs.statSync(lock).size>128)throw Error('The owner lock needs inspection.');
 const ownerPid=Number(fs.readFileSync(lock,'utf8'));
 if(!Number.isSafeInteger(ownerPid)||ownerPid<1||connection.pid!==ownerPid||!isAlive(ownerPid))throw Error('The verified application owner changed or is not running.');
 // A normal restart invalidates the historical PID, not the immutable package.
 // Only the explicit bootstrap obtains a fresh authenticated owner observation;
 // ordinary reconciliation retains the original same-process requirement.
 const fresh=dependencies.revalidatedOwner;
 let ownerRevalidation=null;
 if(fresh){
  const identity=fresh.identity;
  if(!identity||identity.packaged!==true||identity.pid!==ownerPid||identity.home!==owner.home||identity.installation!==owner.installation||identity.sourceFingerprint!==current.sourceFingerprint||identity.buildRevision!==current.buildRevision||typeof identity.sessionId!=='string'||!identity.sessionId||fresh.jobId!==success.id||fresh.jobRevision!==success.revision)throw Error('Fresh owner evidence does not match the verified installation and completed update.');
  ownerRevalidation={identity,jobId:fresh.jobId,jobRevision:fresh.jobRevision,maintenancePlanDigest:maintenance.planDigest};
 }else if(success.health.identity.pid!==ownerPid)throw Error('The verified application owner changed or is not running.');
 let obsoleteRecovery=null;
 const location=job.recovery||job.incompleteRecovery;
 if(location){
  if(location!==path.join(owner.updates,'recoveries',job.id))throw Error('The obsolete recovery escaped its owning attempt.');
  ordinary(location);
  if(maintenance.verified.some(row=>row.directory===location))throw Error('A retained recovery cannot be retired as a failed attempt.');
  if(fs.existsSync(location)){
   if(!fs.lstatSync(location).isDirectory()||fs.realpathSync(location)!==location)throw Error('The obsolete recovery is not an ordinary directory.');
   // Full hashing refuses sockets/devices and captures all partial-copy evidence.
   obsoleteRecovery={directory:location,...tree(location)};
  }
 }
 const state={schemaVersion:1,kind:'superseded-failed-update',jobId:job.id,home:owner.home,installation:owner.installation,jobHash:fileDigest(job.file),originalError:job.error||null,successId:success.id,successHash:fileDigest(success.file),candidateHash:current.hash,ownerPid,maintenanceDigest:maintenance.planDigest,recoveries:maintenance.verified.map(row=>({id:row.id,directory:row.directory,receiptHash:row.receiptHash})).sort((a,b)=>a.id.localeCompare(b.id)),obsoleteRecovery};
 // Preserve the legacy receipt witness so the currently installed owner and
 // frozen candidate can validate this receipt. Fresh evidence is bound through
 // the existing maintenance digest; newer readers also validate its preimage.
 if(ownerRevalidation){state.ownerRevalidation=ownerRevalidation;state.maintenanceDigest=digest(JSON.stringify(ownerRevalidation));}
 return {...state,planDigest:digest(JSON.stringify(witness(state))),canApply:true,jobRevision:job.revision,uiResponsivenessVerified:false,continuationReplayed:false};
}
module.exports={plan,readResolution,failedAttempt};
