import { parentPort, workerData } from 'node:worker_threads';
import { BrowserHistoryStore } from './browser-history-store.js';
let store;
try { store=new BrowserHistoryStore(workerData.home,workerData.options);parentPort.postMessage({ready:true}); }
catch(error){parentPort.postMessage({startupError:error.message});parentPort.close();}
const methods=new Set(['suggest','record','query','settings','delete','prune','sync','apply','peerError','importLegacy','accountImport','status','navigation','navigationGet','seed','batchNavigation','relocateNavigation','close']);
if(store)parentPort.on('message',({id,method,args})=>{try{if(!methods.has(method))throw new Error('Unsupported history worker operation.');const result=store[method](...args);parentPort.postMessage({id,result});if(method==='close')parentPort.close();}catch(error){parentPort.postMessage({id,error:error.message,code:error.code});}});
