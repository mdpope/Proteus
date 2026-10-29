const {parentPort,workerData}=require('node:worker_threads');
const packageTools=require('./update-package.cjs'),storage=require('./update-storage.cjs'),maintenance=require('./update-maintenance.cjs');
try{
 const {method,args}=workerData;
 if(!['inspectPackage','copyTree','inventoryStorage','retireStaging','maintenancePlan','applyMaintenance'].includes(method))throw Error('Unsupported package worker operation.');
 const result=(packageTools[method]||storage[method]||maintenance[method])(...args);parentPort.postMessage({result});
}catch(error){parentPort.postMessage({error:error.message,code:error.code});}
