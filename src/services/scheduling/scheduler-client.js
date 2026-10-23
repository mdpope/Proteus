import { Worker } from 'node:worker_threads';

// One worker owns periodic schedule parsing and durable checkpoint writes.
// Engine serializes ticks; the worker's message loop also serializes requests.
export class SchedulerWorker {
  constructor(home, { workerURL = new URL('./scheduler-worker.js', import.meta.url), workerData = {} } = {}) {
    this.requests = new Map(); this.sequence = 0;
    this.metrics = { operations: 0, failures: 0, lastDurationMs: 0, maxDurationMs: 0, scanDurationMs: 0, checkpointDurationMs: 0, scheduleCount: 0 };
    this.worker = new Worker(workerURL, { execArgv: [], workerData: { ...workerData, home } });
    this.worker.on('message', message => {
      const request = this.requests.get(message.id); if (!request) return;
      this.requests.delete(message.id); this.metrics.operations++;
      this.metrics.lastDurationMs = message.durationMs || 0;
      this.metrics.maxDurationMs = Math.max(this.metrics.maxDurationMs, this.metrics.lastDurationMs);
      if (request.method === 'scan') this.metrics.scanDurationMs = this.metrics.lastDurationMs;
      if (request.method === 'checkpoint') this.metrics.checkpointDurationMs = this.metrics.lastDurationMs;
      if (message.result?.scheduleCount !== undefined) this.metrics.scheduleCount = message.result.scheduleCount;
      if (message.error) { this.metrics.failures++; request.reject(Object.assign(new Error(message.error), { code: message.code })); }
      else request.resolve(message.result);
      if (!this.requests.size) this.worker.unref();
    });
    this.worker.on('error', error => this.fail(error));
    this.worker.on('exit', code => {
      if (!this.closing || this.requests.size) this.fail(new Error(`Scheduler worker stopped (${code}).`));
      this.exited = true;
    });
    this.worker.unref();
  }
  fail(error) {
    this.failure ||= error; this.metrics.failures++;
    for (const request of this.requests.values()) request.reject(this.failure);
    this.requests.clear(); this.worker.unref();
  }
  request(method, ...args) {
    if (this.failure) return Promise.reject(this.failure);
    if (this.closing) return Promise.reject(new Error('Scheduler worker is closed.'));
    return this.dispatch(method, args);
  }
  dispatch(method, args) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence; this.requests.set(id, { resolve, reject, method }); this.worker.ref();
      try { this.worker.postMessage({ id, method, args }); }
      catch (error) { this.requests.delete(id); this.metrics.failures++; if (!this.requests.size) this.worker.unref(); reject(error); }
    });
  }
  scan(journal, timestamp) { return this.request('scan', journal, timestamp); }
  verify(due) { return this.request('verify', due); }
  checkpoint(journal) { return this.request('checkpoint', journal); }
  diagnostics() { return { ...this.metrics, activeRequests: this.requests.size, worker: this.failure ? 'failed' : this.closing ? 'closed' : 'ready' }; }
  close() {
    if (this.closePromise) return this.closePromise;
    this.closing = true;
    this.closePromise = (async () => {
      try { if (!this.failure && !this.exited) await this.dispatch('close', []); }
      finally { await this.worker.terminate(); }
    })();
    return this.closePromise;
  }
}
