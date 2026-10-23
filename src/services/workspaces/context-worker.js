import { parentPort, workerData } from 'node:worker_threads';
import { ContextStore } from './context.js';
try { const store = new ContextStore(workerData.home, null, { skipRefresh: true }); store.refresh(workerData.options); parentPort.postMessage({ catalog: store.catalog }); } catch (error) { parentPort.postMessage({ error: error.message }); }
