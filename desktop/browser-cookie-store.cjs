const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { safeStorage } = require('electron');

// Chromium persists durable cookies itself, but drops session cookies on a full
// quit. Keep a device-encrypted continuation snapshot, scoped to the exact store.
class BrowserCookieStore {
  constructor(home, session, onError = () => {}, diagnostics) {
    this.diagnostics = diagnostics;
    this.session = session; this.onError = onError; this.pending = null;
    this.file = path.join(home, 'browser-sessions', createHash('sha256').update(session.storagePath).digest('hex') + '.bin');
    this.changed = () => { clearTimeout(this.timer); this.timer = setTimeout(() => void this.save().catch(onError), 300); this.timer.unref?.(); };
    this.ready = this.restore().catch(onError).finally(() => session.cookies.on('changed', this.changed));
  }
  async restore() {
    if ((!safeStorage.isEncryptionAvailable() || safeStorage.getSelectedStorageBackend?.() === 'basic_text')) return;
    let bytes; try { if ((await fs.promises.stat(this.file)).size > 8 * 1024 * 1024) throw new Error('Browser session snapshot is too large.'); bytes = await fs.promises.readFile(this.file); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    const saved = JSON.parse(safeStorage.decryptString(bytes));
    if (!Array.isArray(saved) || saved.length > 10000) throw new Error('Browser session snapshot is invalid.');
    const present = await this.session.cookies.get({});
    const key = cookie => JSON.stringify([cookie.domain, cookie.path, cookie.name]);
    const existing = new Set(present.map(key));
    for (const cookie of saved) {
      if (!cookie.session || existing.has(key(cookie)) || typeof cookie.domain !== 'string' || typeof cookie.name !== 'string' || typeof cookie.value !== 'string') continue;
      const hostname = cookie.domain.replace(/^\./, '');
      const url = new URL((cookie.secure ? 'https://' : 'http://') + hostname);
      if (url.hostname !== hostname || url.username || url.password) continue;
      const details = { url: url.origin + (cookie.path || '/'), name: cookie.name, value: cookie.value, path: cookie.path || '/', secure: !!cookie.secure, httpOnly: !!cookie.httpOnly, sameSite: cookie.sameSite };
      if (!cookie.hostOnly) details.domain = cookie.domain;
      await this.session.cookies.set(details);
    }
  }
  async save() {
    await this.ready;
    if ((!safeStorage.isEncryptionAvailable() || safeStorage.getSelectedStorageBackend?.() === 'basic_text')) return;
    if (this.pending) { await this.pending; return this.save(); }
    this.pending = (async () => {
      const cookies = (await this.session.cookies.get({})).filter(cookie => cookie.session);
      const json = JSON.stringify(cookies); if (cookies.length > 10000 || Buffer.byteLength(json) > 7 * 1024 * 1024) throw new Error('Browser session snapshot is too large.');
      const bytes = this.diagnostics ? this.diagnostics.measureSync('browser.cookies.encrypt',()=>safeStorage.encryptString(json)) : safeStorage.encryptString(json), temporary=this.file+'.tmp';
      try {
        await fs.promises.mkdir(path.dirname(this.file), { recursive: true });
        await fs.promises.writeFile(temporary, bytes, { mode: 0o600 });
        await fs.promises.chmod(temporary,0o600);
        await fs.promises.rename(temporary, this.file);
      } finally { await fs.promises.unlink(temporary).catch(()=>{}); }
    })().finally(() => { this.pending = null; });
    return this.pending;
  }
  async close() { await this.ready; clearTimeout(this.timer); this.session.cookies.removeListener('changed', this.changed); await this.save(); }
}
module.exports = { BrowserCookieStore };
