// Completion clears the current error after successful recovery. Keep the
// original failure independently, including when an older owner resumes chat.
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {readJob,writeJob,atomic,digest}=require('./update-package.cjs');
function recordFailure(file,phase,error,{save=atomic}={}){
 const job=readJob(file),at=new Date().toISOString(),message=String(error?.message||error),receiptFile=path.join(path.dirname(file),'failure-'+randomUUID()+'.json');
 const row={at,phase,error:message.slice(0,4000)};
 try{
  save(receiptFile,{schemaVersion:1,jobId:job.id,at,phase,error:message,stack:String(error?.stack||''),candidate:{hash:job.candidate?.hash,installationHash:job.candidate?.installationHash,buildRevision:job.candidate?.buildRevision}});
  Object.assign(row,{receiptFile,receiptHash:digest(fs.readFileSync(receiptFile))});
 }catch(captureError){row.captureError=String(captureError.message||captureError);}
 const patch={failureHistory:[...(job.failureHistory||[]).slice(-19),row],checkpoint:(job.checkpoint||'')+'\n\nSupervisor failure during '+phase+': '+row.error+(row.receiptFile?'\nPreserved failure receipt: '+path.basename(receiptFile):'\nFailure receipt could not be saved: '+row.captureError)};
 // Diagnostic storage failure must not replace the original cause or stop
 // compatible baseline recovery. The existing helper log is the last fallback.
 try{return writeJob(file,patch);}catch(captureError){console.error('Supervisor failure during '+phase+': '+row.error+'; failure journal could not be saved: '+captureError.message);return {...job,...patch};}
}
module.exports={recordFailure};
