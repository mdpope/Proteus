// A manually reopened app must not claim or write the data home while its
// independent supervisor is capturing/replacing it. Verification launches are
// allowed only after replacement has reached the owner-health phase.
function supervisorOwnsCapture(job,{home,installation,alive}={}){
 if(!job||job.home!==home||job.installation!==installation)throw Error('The pending update does not match this installation and data home.');
 return ['stopping','backing-up','installing','recovering'].includes(job.phase)&&Number.isSafeInteger(job.helperPid)&&job.helperPid>0&&alive(job.helperPid);
}
module.exports={supervisorOwnsCapture};
