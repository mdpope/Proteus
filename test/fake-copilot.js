export function fakeSession(fields = {}) {
  const listeners = new Set();
  return { sessionId: 'fixture',
    on(handler) { listeners.add(handler); return () => listeners.delete(handler); },
    event(type, data = {}) { for (const handler of listeners) handler({ type, data }); },
    async send() { this.event('session.idle'); },
    async abort() {}, async disconnect() {}, ...fields
  };
}
