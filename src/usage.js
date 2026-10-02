export class UsageCache {
  constructor(read, now = () => Date.now()) { this.read = read; this.now = now; this.value = null; this.next = 0; this.pending = null; }
  async get(force = false) {
    if (this.pending) return this.pending;
    if (!force && this.now() < this.next) return this.value;
    this.pending = (async () => {
      try {
        const quota = await this.read();
        this.value = { quota, checkedAt: new Date(this.now()).toISOString(), error: null };
        this.next = this.now() + 300_000;
      } catch (error) {
        this.value = { ...this.value, error: error.message || 'Copilot usage unavailable.' };
        this.next = this.now() + 60_000;
      }
      return this.value;
    })();
    try { return await this.pending; } finally { this.pending = null; }
  }
}
