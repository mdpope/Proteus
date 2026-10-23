import { parentPort, workerData } from 'node:worker_threads';
import { RemoteCommandStore } from './remote-command-store.js';
let store;
try { store = new RemoteCommandStore(workerData.home, workerData.limits); parentPort.postMessage({ ready: true }); }
catch (error) { parentPort.postMessage({ startupError: error.message }); parentPort.close(); }
if (store) parentPort.on('message', ({ id, method, args }) => {
  try {
    const result = store[method](...args);
    parentPort.postMessage({ id, result });
    if (method === 'close') parentPort.close();
  } catch (error) { parentPort.postMessage({ id, error: error.message, code: error.code, details: error.details }); }
});
