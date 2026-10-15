import { Worker } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';

// No persisted payload cache: only bounded active requests live on the host thread.
export class RemoteCommandJournal {
  constructor(home, { limits, workerURL = new URL('./remote-command-worker.js', import.meta.url), maxRequests = 64, workerOptions } = {}) {
    this.requests = new Map(); this.sequence = 0; this.maxRequests = maxRequests; this.metrics = { operations: 0, failures: 0, lastDurationMs: 0, maxDurationMs: 0 };
    this.worker = new Worker(workerURL, { workerData: { home, limits, options: workerOptions } });
    this.ready = new Promise((resolve, reject) => { this.readyResolve = resolve; this.readyReject = reject; });
    // Initialization can fail while remote access is disabled; surface it on use.
    this.ready.catch(() => {});
    this.worker.on('message', message => {
      if (message.ready) { this.initialized = true; this.readyResolve(); if (!this.requests.size) this.worker.unref(); return; }
      if (message.startupError) { this.fail(new Error(message.startupError)); return; }
      const request = this.requests.get(message.id); if (!request) return;
      this.requests.delete(message.id); this.metrics.operations++;
      this.metrics.lastDurationMs = performance.now() - request.started; this.metrics.maxDurationMs = Math.max(this.metrics.maxDurationMs, this.metrics.lastDurationMs);
      if (message.error) { this.metrics.failures++; request.reject(Object.assign(new Error(message.error), { code: message.code })); } else request.resolve(message.result);
      if (!this.requests.size) this.worker.unref();
    });
    this.worker.on('error', error => this.fail(error));
    this.worker.on('exit', code => { if (!this.initialized || !this.closing || this.requests.size) this.fail(new Error(`Remote command journal worker stopped (${code}).`)); });
  }
  fail(error) {
    this.failure ||= error; this.readyReject(this.failure);
    for (const request of this.requests.values()) request.reject(this.failure);
    this.requests.clear(); this.worker.unref();
  }
  async request(method, ...args) {
    if (this.failure) throw this.failure;
    if (this.closing) throw new Error('Remote command journal is closed.');
    await this.ready;
    if (this.failure) throw this.failure;
    if (this.closing) throw new Error('Remote command journal is closed.');
    if (this.requests.size >= this.maxRequests) throw new Error('Remote command journal is busy. Retry shortly.');
    return this.dispatch(method, args);
  }
  dispatch(method, args) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence; this.requests.set(id, { resolve, reject, started: performance.now() }); this.worker.ref();
      try { this.worker.postMessage({ id, method, args }); }
      catch (error) { this.requests.delete(id); this.metrics.failures++; if (!this.requests.size) this.worker.unref(); reject(error); }
    });
  }
  claim(key, digest, issuedAt) { return this.request('claim', key, digest, issuedAt); }
  complete(key, digest, outcome) { return this.request('complete', key, digest, outcome); }
  async diagnostics() { return { ...await this.request('diagnostics'), ...this.metrics, activeRequests: this.requests.size, worker: 'ready' }; }
  async close() {
    if (this.closePromise) return this.closePromise;
    this.closing = true;
    // RemoteHost first drains command tasks. The close message then follows all writes.
    this.closePromise = (async () => { try { await this.ready; if (!this.failure) await this.dispatch('close', []); } catch { /* A failed worker has already rejected its callers. */ } finally { this.closing = true; await this.worker.terminate(); } })();
    return this.closePromise;
  }
}
