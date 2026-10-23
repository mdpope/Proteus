// Metadata queries have their own runtime. Each executing chat owns a separate
// adapter, so adapter-global cancellation and approval listeners stay local.
export class SessionProvider {
  constructor(factory) {
    this.factory = factory;
    this.metadata = factory();
    this.sessions = new Map();
    this.locks = new Set();
    this.retired = new Set();
    this.closing = false;
    this.acceptedMediaTypes = this.metadata.acceptedMediaTypes;
    this.acceptedSteeringMediaTypes = this.metadata.acceptedSteeringMediaTypes;
    for (const method of ['status', 'quota', 'models', 'selectedMcp', 'withMcpSelectionBatch']) {
      if (typeof this.metadata[method] === 'function') this[method] = (...args) => this.metadata[method](...args);
    }
    for (const method of ['mcpStatus', 'mcpLogin', 'mcpRecover', 'mcpHealth', 'selectIntegrationContext']) {
      if (typeof this.metadata[method] === 'function') this[method] = (run, ...args) => this.withSession(run, adapter => adapter[method](run, ...args));
    }
    if (typeof this.metadata.steer === 'function') this.steer = (run, prompt, attachments) => {
      const entry = this.sessions.get(run.id);
      if (!entry?.turn) throw new Error('This chat is not running. Queue a message instead.');
      return entry.adapter.steer(run, prompt, attachments);
    };
  }

  set integrations(value) {
    this.integrationHealth = value;
    this.metadata.integrations = value;
    for (const entry of this.sessions.values()) entry.adapter.integrations = value;
  }

  set chatControl(value) {
    this.control=value;this.metadata.chatControl=value;
    for(const entry of this.sessions.values())entry.adapter.chatControl=value;
  }

  create() {
    if (this.closing) throw new Error('The provider is shutting down.');
    const adapter = this.factory();
    adapter.integrations = this.integrationHealth;
    adapter.chatControl = this.control;
    return adapter;
  }

  async retire(adapter) {
    this.retired.add(adapter);
    await adapter.close?.();
    this.retired.delete(adapter);
  }

  async withSession(run, operation) {
    let entry = this.sessions.get(run.id);
    if (!entry) {
      entry = { adapter: this.create(), turn: false, readers: 0 };
      this.sessions.set(run.id, entry);
    }
    entry.readers++;
    try { return await operation(entry.adapter); }
    finally {
      entry.readers--;
      if (!entry.turn && !entry.readers && this.sessions.get(run.id) === entry) {
        this.sessions.delete(run.id);
        try { await this.retire(entry.adapter); } finally { this.onIdle?.(); }
      }
    }
  }

  hasMcpSession(run) { return !!this.sessions.get(run.id)?.adapter.hasMcpSession?.(run); }
  queueReason(run) {
    if (this.closing) return 'Waiting for this provider to finish reconnecting.';
    if (this.sessions.has(run.id)) return 'Waiting for this chat’s connection check to finish.';
    if (this.locks.has(run.providerSessionId || run.id)) return 'Waiting for the active turn in this same provider session.';
    return null;
  }
  recheckPermissions() { for (const entry of this.sessions.values()) entry.adapter.recheckPermissions?.(); }

  async run(args) {
    const { run } = args;
    const key = run.providerSessionId || run.id;
    if (this.locks.has(key) || this.sessions.has(run.id)) throw new Error('This chat already has a turn or connection operation in progress.');
    const entry = { adapter: this.create(), turn: true, readers: 0 };
    this.locks.add(key);
    this.sessions.set(run.id, entry);
    try { return await entry.adapter.run(args); }
    finally {
      entry.turn = false;
      this.locks.delete(key);
      if (!entry.readers && this.sessions.get(run.id) === entry) {
        this.sessions.delete(run.id);
        try { await this.retire(entry.adapter); } finally { this.onIdle?.(); }
      }
    }
  }

  async close() {
    this.closing = true;
    const adapters = new Set([this.metadata, ...this.retired, ...[...this.sessions.values()].map(entry => entry.adapter)]);
    const results = await Promise.allSettled([...adapters].map(adapter => adapter.close?.()));
    // Authentication recovery may reopen this provider after all turns finish.
    this.closing = false;
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
  }
}
