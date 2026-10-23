import fs from 'node:fs';
import { workerData } from 'node:worker_threads';

const sync = fs.fsyncSync;
let writes = 0;
fs.fsyncSync = fd => {
  writes++;
  if (workerData.startedFile) fs.writeFileSync(workerData.startedFile, String(writes));
  if (workerData.delayMs) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, workerData.delayMs);
  if (workerData.failFirstWrite && writes === 1) throw Object.assign(new Error('Injected checkpoint write failure'), { code: 'EIO' });
  return sync(fd);
};
await import('../../src/services/scheduling/scheduler-worker.js');
