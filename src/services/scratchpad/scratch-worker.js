import {parentPort, workerData} from 'node:worker_threads';
import {ScratchStore} from './scratch-store.js';

let store;
try {
 store = new ScratchStore({home: workerData.home, ...workerData.options});
 parentPort.postMessage({ready: true});
} catch (error) {parentPort.postMessage({startupError: error.message}); parentPort.close();}
const methods = new Set(['tree','asset','paste','setup', 'directory', 'list', 'row', 'read', 'mutate', 'sync', 'rebuild', 'indexStatus', 'planPaths', 'migratePaths', 'close']);
let indexing = {running:false}, scan;
async function synchronize(args, associations=[]) {
 if (scan) throw Error('Scratchpad indexing is already running.');
 indexing={running:true,added:0,updated:0,removed:0,scanned:0};
 const work=(async()=>{
  for(const association of associations)store.directory(association);
  const steps=store.syncSteps(args);let step;
  // Yield the worker between batches: list/read messages can return partial
  // results while the index grows. Mutations wait for this one scan to finish.
  do { for(let count=0;count<20;count++){step=steps.next();if(step.done)break;indexing={...step.value,errors:step.value.errors.length,running:true};}if(!step.done)await new Promise(resolve=>setImmediate(resolve)); } while(!step.done);
  return step.value;
 })();scan=work;
 try {const result=await work;indexing={...result,errors:result.errors.length,running:false};return result;}
 catch(error){indexing={...indexing,running:false,error:error.message};throw error;}
 finally{scan=null;}
}
if (store) parentPort.on('message', async ({id, method, args}) => {
 try {
  if (!methods.has(method)) throw Error('Unsupported Scratchpad operation.');
  let result;
  if(method==='indexStatus')result=indexing;
  else if(method==='sync'||method==='rebuild')result=await synchronize(method==='sync'?args[0]:{},method==='rebuild'?args[0]:[]);
  else {if(scan&&!['list','row','read'].includes(method))await scan;result=await store[method](...args);}
  parentPort.postMessage({id, result});
  if (method === 'close') parentPort.close();
 } catch (error) {parentPort.postMessage({id, error: error.message, code: error.code});}
});
