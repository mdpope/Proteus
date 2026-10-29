// The candidate helper verifies before acknowledging readiness, including for
// older owners. Evidence lives beside the journal so old staging retirement
// cannot erase the only explanation of a package-integrity failure.
const path=require('node:path'),{randomUUID}=require('node:crypto');
const {inspectPackage,atomic}=require('./update-package.cjs');
function verifyCandidate(job,stage,{inspect=inspectPackage}={}){
 if(!['readiness','supervise'].includes(stage))throw Error('Unknown candidate integrity stage.');
 const expected={hash:job.candidate.hash,installationHash:job.candidate.installationHash,sourceFingerprint:job.candidate.sourceFingerprint,buildRevision:job.candidate.buildRevision};
 let candidate,error;
 try{candidate=inspect(job.candidate.bundle,{entries:true});}
 catch(failure){error=failure.message;}
 const passed=!error&&candidate.hash===expected.hash&&(job.platform!=='win32'||candidate.installationHash===expected.installationHash);
 const file=path.join(path.dirname(job.file),'candidate-integrity-'+stage+'-'+randomUUID()+'.json');
 atomic(file,{schemaVersion:1,at:new Date().toISOString(),jobId:job.id,stage,passed,expected,...(candidate?{observed:{hash:candidate.hash,installationHash:candidate.installationHash,sourceFingerprint:candidate.sourceFingerprint,buildRevision:candidate.buildRevision,entries:candidate.entries||[]}}:{}),...(error?{error}: {})});
 if(!passed)throw Error('The accepted staged candidate changed. Integrity evidence: '+path.basename(file)+(error?' ('+error+')':''));
 return candidate;
}
module.exports={verifyCandidate};
