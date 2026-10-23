import {Worker} from 'node:worker_threads';

// One bounded operation at a time per Updates owner. This module never owns
// app data, starts providers, or performs an installation.
export function packageOperation(method,...args){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('../../../desktop/updates/update-package-worker.cjs',import.meta.url),{workerData:{method,args}});
  let settled=false;
  worker.once('message',message=>{settled=true;message.error?reject(Object.assign(new Error(message.error),{code:message.code})):resolve(message.result);});
  worker.once('error',error=>{settled=true;reject(error);});
  worker.once('exit',code=>{if(!settled)reject(new Error('Package worker stopped before completing its operation ('+code+').'));});
 });
}
