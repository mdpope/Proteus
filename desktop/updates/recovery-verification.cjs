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
function failureReason(error){return knownErrors.find(([pattern])=>pattern.test(String(error?.message||'')))?.[1]||'owner-request-failed';}
async function verifyRecovery(job,expected,{request,timeout=60000,interval=250}={}){
 const end=Date.now()+timeout;let last='owner-request-failed';
 for(;;){
  try{
   const receipt=await request(job,'/api/updates/recovery',{action:'verify',id:job.id,secret:job.secret});
   const checks={fingerprint:receipt.identity?.sourceFingerprint===expected.sourceFingerprint,installation:receipt.identity?.installation===job.installation,home:receipt.identity?.home===job.home,barrier:receipt.identity?.barrier===true};
   const failed=Object.keys(checks).filter(key=>!checks[key]);
   if(!failed.length)return receipt;
   last='identity-check:'+failed.join(',');
  }catch(error){last=failureReason(error);}
  if(Date.now()>=end)throw Error('Timed out: updated host identity and recovery barrier; last check: '+last);
  await new Promise(resolve=>setTimeout(resolve,interval));
 }
}
module.exports={verifyRecovery};
