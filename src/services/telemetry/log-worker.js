import { parentPort, workerData } from 'node:worker_threads';
import { LogStore } from './log-store.js';
let store;
try { store = new LogStore(workerData.home); parentPort.postMessage({ ready: true }); }
catch (error) { parentPort.postMessage({ startupError: error.message }); parentPort.close(); }
const methods = new Set(['append','query','detail','close']);
if (store) parentPort.on('message', ({ id, method, args }) => {
  try {
    if (!methods.has(method)) throw new Error('Unsupported log operation.');
    const result = store[method](...args); parentPort.postMessage({ id, result });
    if (method === 'close') parentPort.close();
  } catch (error) { parentPort.postMessage({ id, error: error.message }); }
});
