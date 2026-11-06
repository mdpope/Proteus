// Coalesce display refreshes from multiple windows without caching across owner
// mutations or externally edited schedules/permissions. This cache is never used
// for authorization. The producer must capture/post its snapshot synchronously.
export class StateResponseCache {
  constructor({ stamp, ttlMs = 300, maxPending = 4, maxEntries = 8, clock = Date.now }) {
    this.stamp = stamp; this.ttlMs = ttlMs; this.maxPending = maxPending; this.maxEntries = maxEntries; this.clock = clock;
    this.cache = new Map(); this.pending = new Map(); this.active = new Set();
  }
  clear() { this.cache.clear(); }
  async get(key, produce) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const stamp = this.stamp(), cached = this.cache.get(key);
      if (cached?.stamp === stamp && this.clock() - cached.at < this.ttlMs) return cached.body;
      let pending = this.pending.get(key);
      // A generation change waits for the prior snapshot instead of starting
      // another worker job for the same view. Never return its stale permissions.
      if(pending&&pending.stamp!==stamp){await pending.promise;continue;}
      if (!pending || pending.stamp !== stamp) {
        if (this.active.size >= this.maxPending) throw Object.assign(new Error('State display is busy. Retry the refresh.'),{code:'STATE_CACHE_BUSY'});
        const promise = produce();
        pending = { stamp, promise }; this.pending.set(key, pending); this.active.add(pending);
        const current = pending;
        promise.finally(() => {
          this.active.delete(current);
          if (this.pending.get(key) === current) this.pending.delete(key);
        }).catch(() => {});
      }
      const body = await pending.promise;
      if (pending.stamp !== this.stamp()) continue;
      if (this.cache.size >= this.maxEntries) this.cache.delete(this.cache.keys().next().value);
      this.cache.set(key, { stamp: pending.stamp, body, at: this.clock() });
      return body;
    }
    throw Object.assign(new Error('State changed during refresh. Retry the refresh.'),{code:'STATE_CHANGED'});
  }
}
