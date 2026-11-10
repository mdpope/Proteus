// Recovery bytes are captured only after the old owner has exited and its late
// filesystem flushes have settled. A new live owner always aborts capture.
const fs=require('node:fs'),path=require('node:path');
const {tree}=require('./update-package.cjs');
function dataOwner(home,{alive}={}){
 let text;try{text=fs.readFileSync(path.join(home,'runner.lock'),'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}
 const pid=Number(text);if(!Number.isSafeInteger(pid)||pid<1)throw Error('The data owner lock is invalid; preserve it for inspection.');
 return alive(pid)?pid:null; // The normal owner startup reclaims a dead lock.
}
async function settledRecovery(roots,options,{released,inspect=tree,quietMs=2000,timeoutMs=60000,intervalMs=250,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),onProgress=()=>{}}={}){
 const startedAt=now();
 let deadline=null,previous=null,stableAt=null,attempt=0,budgetMs=timeoutMs;
 for(;;){
  if(!released())throw Error('A live owner reclaimed its data home before recovery capture.');
  const scanStartedAt=now();
  const next=roots.map((root,i)=>inspect(root,options[i]));
  if(!released())throw Error('A live owner reclaimed its data home during recovery inspection.');
  const completedAt=now(),scanMs=completedAt-scanStartedAt;
  attempt++;
  // Establish a baseline before timing settlement. Large cold profiles need
  // enough time for complete comparisons, while continued changes stay bounded.
  if(previous===null){
   budgetMs=Math.max(timeoutMs,3*scanMs+quietMs+intervalMs);
   deadline=completedAt+budgetMs;
  }
  const same=previous&&next.every((row,i)=>row.hash===previous[i].hash);
  if(!same)stableAt=completedAt;
  const timedOut=completedAt>=deadline;
  const verified=!timedOut&&!!same&&completedAt-stableAt>=quietMs;
  const progress={stage:timedOut?'timed-out':verified?'verified':'comparing',attempt,scanMs,elapsedMs:completedAt-startedAt,budgetMs,matchedPrevious:!!same,stableMs:completedAt-stableAt};
  onProgress(progress);
  if(verified)return next;
  if(timedOut)throw Error(`Recovery data did not become quiescent after graceful shutdown; no replacement occurred. Completed ${attempt} scans in ${progress.elapsedMs} ms; last scan ${scanMs} ms, settlement budget ${budgetMs} ms.`);
  previous=next;await sleep(intervalMs);
 }
}
module.exports={dataOwner,settledRecovery};
