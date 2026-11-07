import { Worker } from 'node:worker_threads';

// One lazy worker per owner, bounded pending snapshots, no synchronous fallback.
// A stalled filesystem is timed out without stalling the owner. A later request
// may start a replacement only after the old worker has actually exited.
export class StateProjectionClient {
  constructor({ workerURL = new URL('./state-projection-worker.js', import.meta.url), timeoutMs = 15000, maxPending = 4 } = {}) {
    this.workerURL = workerURL; this.timeoutMs = timeoutMs; this.maxPending = maxPending;
    this.pending = new Map(); this.sequence = 0;
    this.metrics = { operations: 0, failures: 0, lastDurationMs: 0, maxDurationMs: 0, lastBodyBytes: 0 };
  }
  start() {
    const worker = this.worker = new Worker(this.workerURL, { execArgv: [] });
    worker.on('message', message => {
      if (this.worker !== worker) return;
      const request = this.pending.get(message.id); if (!request) return;
      this.pending.delete(message.id); clearTimeout(request.timer);
      this.metrics.operations++;
      this.metrics.lastDurationMs = message.durationMs;
      this.metrics.lastBodyBytes = Number.isSafeInteger(message.bodyBytes) && message.bodyBytes >= 0 ? message.bodyBytes : 0;
      this.metrics.maxDurationMs = Math.max(this.metrics.maxDurationMs, message.durationMs || 0);
      if (message.error) { this.metrics.failures++; request.reject(Object.assign(new Error(message.error),{code:'STATE_PROJECTION_FAILED'})); }
      else request.resolve(message.body);
      if (!this.pending.size) worker.unref();
    });
    worker.on('error', error => this.fail(worker, Object.assign(error,{code:'STATE_WORKER_ERROR'})));
    worker.on('exit', code => {
      if (this.worker !== worker) return;
      this.fail(worker, Object.assign(new Error(`State display worker stopped (${code}).`),{code:'STATE_WORKER_EXIT'}));
      this.worker = null; this.stopping = false;
    });
    worker.unref();
  }
  fail(worker, error, { countFailure = true } = {}) {
    if (this.worker !== worker || this.stopping) return;
    this.stopping = true; if (countFailure) this.metrics.failures++;
    for (const request of this.pending.values()) { clearTimeout(request.timer); request.reject(error); }
    this.pending.clear();
    this.termination = worker.terminate();
  }
  serialize(input) {
    if (this.closed || this.stopping) return Promise.reject(Object.assign(new Error('State display worker is unavailable. Retry the refresh.'),{code:'STATE_WORKER_UNAVAILABLE'}));
    if (this.pending.size >= this.maxPending) return Promise.reject(Object.assign(new Error('State display is busy. Retry the refresh.'),{code:'STATE_PROJECTION_BUSY'}));
    if (!this.worker) this.start();
    return new Promise((resolve, reject) => {
      const id = ++this.sequence, worker = this.worker;
      const timer = setTimeout(() => this.fail(worker, Object.assign(new Error('State display refresh timed out.'),{code:'STATE_PROJECTION_TIMEOUT'})), this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer }); worker.ref();
      try { worker.postMessage({ id, input }); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); if (!this.pending.size) worker.unref(); reject(error); }
    });
  }
  diagnostics() { return { ...this.metrics, activeRequests: this.pending.size, worker: this.closed ? 'closed' : this.stopping ? 'stopping' : this.worker ? 'ready' : 'not-started' }; }
  async close() {
    this.closed = true;
    if (this.worker) this.fail(this.worker, new Error('State display worker is closed.'), { countFailure: false });
    await this.termination;
  }
}
