import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

// Only source-owned labels can enter this private report. Never pass request data,
// provider output, paths or exception messages as labels or report fields.
export const performancePhaseNames = Object.freeze([
  'scheduler.tick', 'scheduler.permissions', 'scheduler.claim', 'scheduler.list',
  'context.get', 'run.persist', 'http.serialize', 'http.state.assemble', 'http.state.transfer', 'http.state.project', 'desktop.session.save',
  'browser.cookies.encrypt', 'browser.profiles.reconcile', 'remote.state',
  'remote.publish', 'remote.publish.serialize', 'remote.run.assemble',
  'remote.run.serialize', 'remote.sync', 'peer.heartbeat', 'peer.cache.serialize',
  'peer.cache.encrypt', 'peer.cache.disk',
  'remote.state.context', 'remote.state.attention', 'remote.state.schedules', 'remote.state.runs',
  'integrations.tick', 'integrations.batch', 'integrations.consumers', 'integrations.selected', 'integrations.identity',
  'attachments.cleanup', 'activity.persist',
]);
const allowed = new Set(performancePhaseNames);
const ring = (values, value, limit) => { values.push(value); if (values.length > limit) values.shift(); };
const rounded = value => Math.round(Math.max(0, Math.min(86_400_000, Number.isFinite(value) ? value : 0)) * 100) / 100;
const MAX_FILE_BYTES = 128 * 1024;

/** Bounded local timing only. Construct, start(), then await close() on shutdown.
 * Async elapsed phases include waits; only completed synchronous phases can be
 * correlated with an event-loop delay, and correlation does not establish cause.
 * clock/timers/io overrides exist for deterministic tests, not persisted settings.
 */
export class PerformanceDiagnostics {
  constructor({ home, enabled = true, clock, timers, io = fs, watchdogIntervalMs = 250,
    lagThresholdMs = 100, slowThresholdMs = 50, discontinuityMs = 30_000 } = {}) {
    this.enabled = enabled === true; this.home = home; this.io = io;
    this.clock = clock || { monotonic: () => performance.now(), wall: () => Date.now() };
    this.timers = timers || { setTimeout, clearTimeout };
    this.interval = Math.max(10, watchdogIntervalMs); this.lagThreshold = Math.max(1, lagThresholdMs);
    this.slowThreshold = Math.max(1, slowThresholdMs); this.discontinuity = Math.max(1000, discontinuityMs);
    this.createdAt = this.clock.wall(); this.startedMono = this.clock.monotonic();
    this.integrationBatches = []; this.metrics = new Map(); this.active = new Map(); this.recentSync = [];
    this.slowPhases = []; this.eventLoop = []; this.longEventLoop = []; this.started = false; this.closed = false;
    this.dirty = true; this.writeFailures = 0; this.rotated = false; this.lastWriteMono = this.startedMono;
  }
  start() {
    if (this.started || this.closed || !this.enabled) return this;
    this.started = true; this.lastMono = this.clock.monotonic(); this.lastWall = this.clock.wall();
    this._schedule(); void this._write(); return this;
  }
  _schedule() {
    if (!this.started || this.closed) return;
    this.timer = this.timers.setTimeout(() => { this.timer = null; this._sample(); this._schedule(); }, this.interval);
    this.timer?.unref?.();
  }
  _sample() {
    const now = this.clock.monotonic(), wall = this.clock.wall();
    const elapsed = now - this.lastMono, wallElapsed = wall - this.lastWall;
    const lag = elapsed - this.interval;
    const discontinuity = elapsed < 0 || elapsed > this.discontinuity || Math.abs(wallElapsed - elapsed) > 1000;
    if (discontinuity || lag > this.lagThreshold) {
      const event = { at: wall, kind: discontinuity ? 'discontinuity' : 'lag', elapsedMs: rounded(elapsed), lagMs: rounded(lag),
        synchronousPhases: discontinuity ? [] : this.recentSync.filter(p => p.endMono > this.lastMono && p.startMono < now && p.durationMs >= this.slowThreshold)
          .slice(-8).map(({ name, at, durationMs }) => ({ name, at, durationMs })),
        activeAsyncPhases: [...this.active].map(([name, value]) => ({ name, count: value.count, elapsedMs: rounded(now - value.startMono) })) };
      ring(this.eventLoop, event, 32);
      if(discontinuity || lag >= 1000)ring(this.longEventLoop,event,16); this.dirty = true;
    }
    this.lastMono = now; this.lastWall = wall;
    this.recentSync = this.recentSync.filter(p => p.endMono >= now - this.discontinuity);
    if (this.dirty && now - this.lastWriteMono >= 5000) void this._write();
  }
  _record(name, kind, startMono, endMono, at, outcome) {
    if (this.closed) return;
    const durationMs = rounded(endMono - startMono), key = `${kind}:${name}`;
    let values = this.metrics.get(key); if (!values) { values = []; this.metrics.set(key, values); }
    ring(values, durationMs, 128);
    if (kind === 'sync') ring(this.recentSync, { name, at, durationMs, startMono, endMono }, 128);
    if (durationMs >= this.slowThreshold) ring(this.slowPhases, { name, kind, at, durationMs, outcome }, 64);
    this.dirty = true;
  }
  measureSync(name, fn) {
    if (!this.enabled || this.closed || !allowed.has(name)) return fn();
    const start = this.clock.monotonic(); let outcome = 'fulfilled';
    try { return fn(); } catch (error) { outcome = 'rejected'; throw error; }
    finally { const end = this.clock.monotonic(), at = this.clock.wall(); this._record(name, 'sync', start, end, at, outcome); }
  }
  async measure(name, fn) {
    if (!this.enabled || this.closed || !allowed.has(name)) return fn();
    const start = this.clock.monotonic(); let outcome = 'fulfilled';
    const active = this.active.get(name) || { count: 0, startMono: start }; active.count++; this.active.set(name, active);
    try { return await fn(); } catch (error) { outcome = 'rejected'; throw error; }
    finally {
      const end = this.clock.monotonic(), at = this.clock.wall();
      active.count--; if (!active.count) this.active.delete(name);
      this._record(name, 'async', start, end, at, outcome);
    }
  }
  integrationBackground(values) {
    if(!this.enabled||this.closed)return;
    const counts=Object.fromEntries(['runs','candidates','skipped','probed','rejected','globalEnumerations','batches'].map(key=>[key,Math.max(0,Math.min(1000000,Math.trunc(Number(values[key])||0)))]));
    ring(this.integrationBatches,counts,32);this.dirty=true;
  }
  snapshot() {
    const phases = [...this.metrics].map(([key, values]) => {
      const split = key.indexOf(':'), totalMs = values.reduce((sum, value) => sum + value, 0);
      return { name: key.slice(split + 1), kind: key.slice(0, split), samples: values.length,
        totalMs: rounded(totalMs), meanMs: rounded(totalMs / values.length), maxMs: Math.max(...values) };
    });
    return { version: 1, enabled: this.enabled, started: this.started, closed: this.closed, createdAt: this.createdAt,
      observedAt: this.clock.wall(), uptimeMs: rounded(this.clock.monotonic() - this.startedMono),
      limits: { phaseSamples: 128, slowPhases: 64, eventLoop: 32, longEventLoop: 16, fileBytes: MAX_FILE_BYTES },
      phases, integrationBatches: structuredClone(this.integrationBatches), slowPhases: structuredClone(this.slowPhases), eventLoop: structuredClone(this.eventLoop), longEventLoop: structuredClone(this.longEventLoop),
      activeAsyncPhases: [...this.active].map(([name, value]) => ({ name, count: value.count, elapsedMs: rounded(this.clock.monotonic() - value.startMono) })),
      persistence: { failures: this.writeFailures } };
  }
  _write() {
    if (!this.enabled || !this.home) return Promise.resolve();
    if (this.writing) { this.writeAgain = true; return this.writing; }
    this.writing = (async () => {
      do {
        this.writeAgain = false; this.dirty = false; this.lastWriteMono = this.clock.monotonic();
        const directory = path.join(this.home, 'diagnostics'), file = path.join(directory, 'performance.json'), temporary = file + '.tmp';
        try {
          await this.io.mkdir(directory, { recursive: true, mode: 0o700 });
          if (!this.rotated) {
            this.rotated = true;
            try { const stat = await this.io.stat(file); if (stat.isFile() && stat.size <= MAX_FILE_BYTES) await this.io.rename(file, path.join(directory, 'performance.previous.json')); } catch {}
          }
          const encoded = JSON.stringify(this.snapshot());
          if (Buffer.byteLength(encoded) > MAX_FILE_BYTES) throw new Error('Timing report exceeded bound');
          await this.io.writeFile(temporary, encoded, { mode: 0o600 });
          await this.io.chmod(temporary, 0o600); await this.io.rename(temporary, file);
        } catch { this.writeFailures++; this.dirty = true; try { await this.io.unlink(temporary); } catch {} }
      } while (this.writeAgain);
    })().finally(() => { this.writing = null; });
    return this.writing;
  }
  async close() {
    if (this.closing) return this.closing;
    this.closed = true; this.timers.clearTimeout(this.timer); this.timer = null;
    this.closing = this._write(); await this.closing;
  }
}
