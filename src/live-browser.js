import { randomUUID } from 'node:crypto';

// Volatile screenshots: one outstanding capture per tab, bounded expiring frame references.
export class LiveBrowser {
  constructor(browser, { now = Date.now } = {}) { this.browser = browser; this.now = now; this.frames = new Map(); this.pending = new Map(); this.generation = 0; }
  list(chatId) { return this.browser.list(chatId); }
  async frame(chatId, tabId) {
    if (!this.list(chatId).some(tab => tab.id === tabId)) throw new Error('This browser tab is not available to this chat.');
    const key = chatId + ':' + tabId;
    for (const [id, frame] of this.frames) if (this.now() - frame.at > 30_000) this.frames.delete(id);
    const cached = [...this.frames.values()].findLast(frame => frame.key === key);
    if (cached && this.now() - cached.at < 750 && this.browser.current(tabId, cached.revision)) return cached;
    if (this.pending.has(key)) return this.pending.get(key);
    const generation = this.generation;
    const task = (async () => {
      const captured = await this.browser.capture(chatId, tabId);
      if (generation !== this.generation) throw new Error('Browser viewing permission changed. Refresh the view.');
      if (!this.list(chatId).some(tab => tab.id === tabId) || !this.browser.current(tabId, captured.revision)) throw new Error('The browser page changed during capture. Refresh the view.');
      const frame = { ...captured, id: randomUUID(), tabId, chatId, key, at: this.now(), capturedAt: new Date(this.now()).toISOString() };
      this.frames.set(frame.id, frame);
      while (this.frames.size > 40) this.frames.delete(this.frames.keys().next().value);
      return frame;
    })();
    this.pending.set(key, task);
    try { return await task; } finally { this.pending.delete(key); }
  }
  reference(chatId, frameId, point) {
    const frame = this.frames.get(frameId);
    if (!frame || frame.chatId !== chatId || this.now() - frame.at > 30_000 || !this.list(chatId).some(tab => tab.id === frame.tabId) || !this.browser.current(frame.tabId, frame.revision)) throw new Error('The referenced browser frame is stale. Refresh and review the page before sending.');
    if (point && (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1)) throw new Error('Choose a point inside the browser image.');
    return `\n\nBrowser reference (user-observed page; recheck before acting): tab ${frame.tabId}, captured ${frame.capturedAt}, viewport ${frame.width}×${frame.height}${point ? `, marked point ${Math.round(point.x * frame.width)},${Math.round(point.y * frame.height)}` : ''}.`;
  }
  clear() { this.generation++; this.frames.clear(); }
}
