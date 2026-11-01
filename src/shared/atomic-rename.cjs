const fs=require('node:fs');
const pause=new Int32Array(new SharedArrayBuffer(4));

// Windows readers and antivirus scanners can temporarily deny replacement.
// Retry the atomic rename itself; never unlink the current durable document.
function atomicRename(source,target,{platform=process.platform,rename=(a,b)=>fs.renameSync(a,b),wait=ms=>Atomics.wait(pause,0,0,ms)}={}){
 for(let attempt=0;;attempt++){
  try{return rename(source,target);}
  catch(error){
   if(platform!=='win32'||!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=10)throw error;
   wait(Math.min(100,10*2**attempt));
  }
 }
}
async function atomicRenameAsync(source,target,{platform=process.platform,rename=(a,b)=>fs.promises.rename(a,b),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 for(let attempt=0;;attempt++){
  try{return await rename(source,target);}
  catch(error){
   if(platform!=='win32'||!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=10)throw error;
   await wait(Math.min(100,10*2**attempt));
  }
 }
}
module.exports={atomicRename,atomicRenameAsync};
