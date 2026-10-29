import { executionSafeguardMs, activeExecutionLimit } from './execution-policy.js';

// Copilot's sendAndWait includes human approval time. The host's two-hour
// safeguard counts only active execution, pausing while Proteus asks the user.
export class TurnWaiter {
  constructor(session, signal, timeoutMs = executionSafeguardMs) {
    this.session = session; this.remaining = timeoutMs; this.pauses = 0; this.closed = false;
    this.outcome = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
    this.unsubscribe = session.on(event => {
      if (event.agentId) return;
      if (event.type === 'session.idle' && event.data?.mode !== 'autopilot') this.resolve();
      if (event.type === 'session.error') this.reject(Object.assign(new Error(event.data.message),{code:event.data.errorCode||event.data.errorType}));
    });
    this.signal = signal; this.abort = () => this.reject(new Error('Cancelled'));
    signal.addEventListener('abort', this.abort, { once: true });
    this.arm();
  }
  arm() {
    if (this.closed || this.pauses) return;
    this.started = performance.now();
    this.timer = setTimeout(() => this.reject(activeExecutionLimit('Copilot')), Math.max(0, this.remaining));
  }
  pause() {
    if (this.closed) return;
    if (this.pauses++ === 0) { clearTimeout(this.timer); this.remaining -= performance.now() - this.started; }
  }
  resume() { if (!this.closed && this.pauses > 0 && --this.pauses === 0) this.arm(); }
  async run(prompt, attachments = []) {
    try {
      if (this.signal.aborted) throw new Error('Cancelled');
      await Promise.race([this.session.send({ prompt, ...(attachments.length ? { attachments } : {}) }).then(() => this.outcome), this.outcome]);
    } finally {
      this.closed = true; clearTimeout(this.timer); this.unsubscribe();
      this.signal.removeEventListener('abort', this.abort);
    }
  }
}
