const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>value?.[key]!==undefined).map(key=>[key,value[key]]));

/** Only the requested coordinator's owner receipt crosses the chat boundary.
 * Package verification and completion of the coordinator's remaining checks differ. */
export function updateObservation(service,run){
 if(run.schedule?.purpose!=='update')return undefined;
 const status=service.updates?.status?.();
 if(!status)return {available:false};
 const job=status.job?.runId===run.id?status.job:null;
 const identity=pick(status.identity,['platform','arch','packaged','buildRevision','sourceFingerprint']);
 return {available:true,identity,selection:run.schedule.updateSession?pick(run.schedule.updateSession,['releaseId','version','manifestDigest']):null,
  job:job?{...pick(job,['id','revision','phase','version','buildRevision','outcome','error','blocker','health','verificationProgress']),continuationDelivered:!!job.continuation}:null,
  packageVerified:!!(job?.phase==='complete'&&job.outcome==='updated'&&job.health?.verified&&identity.buildRevision===job.buildRevision)};
}

export function updateStillRunning(update){
 const job=update?.job;
 return !!job&&(!['complete','cancelled','attention'].includes(job.phase)||job.phase==='complete'&&!job.continuationDelivered);
}
