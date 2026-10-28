import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicRename } from '../../shared/atomic-rename.cjs';

/**
 * Owns chat record files. Lifecycle, approval and user-input saves stay immediate
 * and synchronous, exactly as before. High-frequency provider events during a
 * running turn are coalesced: the record is serialized at most once per `delayMs`
 * on the owner thread, and the temporary write plus fsync run on the libuv pool.
 *
 * Ordering: every save takes a generation. A deferred save renames its temporary
 * file synchronously only if no newer save for that chat happened meanwhile, so an
 * older background write can never replace a newer immediate one. JavaScript runs
 * the check and renameSync without interleaving.
 *
 * Durability: a crash can lose at most the last `delayMs` of coalesced provider
 * events. Provider sessions retain their own transcript; user input, approvals,
 * question answers and status transitions are never deferred.
 */
export class RunWriter {
  constructor({ fileFor, delayMs = 250, canWrite = () => true, onError = () => {} }) {
    Object.assign(this, { fileFor, delayMs, canWrite, onError });
    this.generations = new Map(); this.timers = new Map(); this.inflight = new Map(); this.failed = new Set(); this.closed = false;
  }
  next(id) { const value = (this.generations.get(id) || 0) + 1; this.generations.set(id, value); return value; }
  pending(id) { return this.timers.has(id) || this.inflight.has(id); }
  /** Synchronous durable save; supersedes any queued or in-flight deferred save. */
  writeNow(run) {
    this.cancel(run.id); this.next(run.id);
    return writeSync(this.fileFor(run.id), JSON.stringify(run));
  }
  /** Coalesce a save for this chat; returns immediately. */
  defer(run) {
    // After a background failure, surface the next error to the caller as before.
    if (this.closed || this.failed.delete(run.id)) return this.writeNow(run);
    if (this.timers.has(run.id)) return;
    const timer = setTimeout(() => { this.timers.delete(run.id); void this.flush(run); }, this.delayMs);
    timer.unref?.(); this.timers.set(run.id, timer);
  }
  cancel(id) { const timer = this.timers.get(id); if (timer) { clearTimeout(timer); this.timers.delete(id); } }
  async flush(run) {
    // Serialize chained saves per chat so temporary files complete in order.
    const previous = this.inflight.get(run.id) || Promise.resolve();
    const operation = previous.then(() => this.write(run)).catch(error => this.onError(error, run));
    this.inflight.set(run.id, operation);
    try { await operation; } finally { if (this.inflight.get(run.id) === operation) this.inflight.delete(run.id); }
  }
  async write(run) {
    if (!this.canWrite(run)) return;
    const generation = this.next(run.id), file = this.fileFor(run.id), contents = JSON.stringify(run);
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const temporary = `${file}.${randomUUID()}.tmp`;
    let handle, created = false;
    try {
      handle = await fsp.open(temporary, 'wx', 0o600); created = true;
      await handle.writeFile(contents); await handle.sync(); await handle.close(); handle = undefined;
      // A newer immediate save or deletion wins; this snapshot is obsolete.
      if (this.generations.get(run.id) !== generation || !this.canWrite(run)) return;
      atomicRename(temporary, file); created = false;
    } finally {
      if (handle) await handle.close().catch(() => {});
      if (created) await fsp.unlink(temporary).catch(() => {});
    }
  }
  /** Write every queued chat now. Used at shutdown and update checkpoints. */
  async drain(runs) {
    for (const [id, timer] of [...this.timers]) { clearTimeout(timer); this.timers.delete(id); const run = runs(id); if (run) void this.flush(run); }
    await Promise.allSettled([...this.inflight.values()]);
  }
  async close(runs) { await this.drain(runs); this.closed = true; }
}

function writeSync(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  let fd, created = false;
  try {
    fd = fs.openSync(temporary, 'wx', 0o600); created = true;
    fs.writeFileSync(fd, contents); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    atomicRename(temporary, file); created = false;
    return Buffer.byteLength(contents);
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
    if (created) try { fs.unlinkSync(temporary); } catch {}
  }
}
