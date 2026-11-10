// Keep failed recovery checks actionable without recording owner responses,
// credentials, document descriptors or arbitrary server error strings.
const knownErrors=[
 [/^Saved tab membership, order, descriptors or closed identities changed/, 'tab-preservation'],
 [/^A saved (workspaces|projects|windows) identity/, 'navigation-preservation'],
 [/^Project defaults or chat membership changed/, 'project-preservation'],
 [/^A pre-restart chat, event history or effective configuration changed/, 'chat-preservation'],
 [/^The restored app window is not ready/, 'window-not-ready'],
 [/^Recovery dispatch is not behind its idle barrier/, 'barrier-inactive'],
 [/^This recovery request does not match/, 'owner-binding'],
 [/^The update is not awaiting recovery verification/, 'job-phase'],
];
function failureReason(error){
 const known=knownErrors.find(([pattern])=>pattern.test(String(error?.message||'')))?.[1];
 if(known)return known;
 const reason=error?.recoveryFailure;
 return typeof reason==='string'&&/^(owner-connection-(missing|invalid)|owner-process-unavailable|owner-request-timeout|owner-transport-failed|owner-response-invalid|owner-http-([45][0-9]{2}|error))$/.test(reason)?reason:'owner-request-failed';
}
async function verifyRecovery(job,expected,{request,timeout=60000,interval=250,report=()=>{}}={}){
 const started=Date.now(),end=started+timeout;let last='owner-request-failed',first=true,attempt=0;
 const progress=stage=>report({stage,attempt,startedAt:new Date(started).toISOString(),deadlineAt:new Date(end).toISOString(),lastProgressAt:new Date().toISOString(),...(attempt>1||stage==='failed'?{lastFailure:last}:{})});
 while(first||Date.now()<end){
  first=false;attempt++;progress('owner-request');
  try{
   const receipt=await request(job,'/api/updates/recovery',{action:'verify',id:job.id,secret:job.secret},{timeout:Math.max(1,end-Date.now())});
   if(timeout>0&&Date.now()>end)break;
   const checks={fingerprint:receipt.identity?.sourceFingerprint===expected.sourceFingerprint,installation:receipt.identity?.installation===job.installation,home:receipt.identity?.home===job.home,barrier:receipt.identity?.barrier===true};
   const failed=Object.keys(checks).filter(key=>!checks[key]);
   if(!failed.length){progress('verified');return receipt;}
   last='identity-check:'+failed.join(',');
  }catch(error){last=failureReason(error);}
  progress('retrying');
  if(Date.now()>=end)break;
  await new Promise(resolve=>setTimeout(resolve,Math.min(interval,Math.max(0,end-Date.now()))));
 }
 progress('failed');
 throw Error('Timed out: updated host identity and recovery barrier; last check: '+last);
}
module.exports={verifyRecovery};
