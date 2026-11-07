// Recovery bytes are captured only after the old owner has exited and its late
// filesystem flushes have settled. A new live owner always aborts capture.
const fs=require('node:fs'),path=require('node:path');
const {tree}=require('./update-package.cjs');
function dataOwner(home,{alive}={}){
 let text;try{text=fs.readFileSync(path.join(home,'runner.lock'),'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}
 const pid=Number(text);if(!Number.isSafeInteger(pid)||pid<1)throw Error('The data owner lock is invalid; preserve it for inspection.');
 return alive(pid)?pid:null; // The normal owner startup reclaims a dead lock.
}
async function settledRecovery(roots,options,{released,inspect=tree,quietMs=2000,timeoutMs=60000,intervalMs=250,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const deadline=now()+timeoutMs;let previous=null,stableAt=null;
 for(;;){
  if(!released())throw Error('A live owner reclaimed its data home before recovery capture.');
  const next=roots.map((root,i)=>inspect(root,options[i]));
  if(!released())throw Error('A live owner reclaimed its data home during recovery inspection.');
  const same=previous&&next.every((row,i)=>row.hash===previous[i].hash);
  if(!same)stableAt=now();
  else if(now()-stableAt>=quietMs)return next;
  if(now()>=deadline)throw Error('Recovery data did not become quiescent after graceful shutdown; no replacement occurred.');
  previous=next;await sleep(intervalMs);
 }
}
module.exports={dataOwner,settledRecovery};
