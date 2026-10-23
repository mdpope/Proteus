import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { atomicJSON, readJSON } from '../../shared/files.js';
import { revision } from '../scheduling/schedules.js';

const execute = promisify(execFile);
function vaultJSON(value) { try { return JSON.parse(value); } catch { throw new Error('Bitwarden returned an unexpected response; details suppressed.'); } }
export function loginOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Use an exact HTTPS origin, such as https://login.example.com.');
  return url.origin;
}
export class BitwardenCLI {
  constructor(run = execute) { this.run = run; this.sessions = new Map(); }
  async command(provider, args, extraEnv = {}) {
    const env = { ...process.env };
    // Do not inherit unrelated provider sessions into this vault adapter.
    delete env.BW_SESSION;
    if (provider.appDataDirectory) env.BITWARDENCLI_APPDATA_DIR = provider.appDataDirectory;
    const session = this.sessions.get(provider.id);
    if (session && Date.now() - session.at < 15 * 60_000) env.BW_SESSION = session.key;
    else this.sessions.delete(provider.id);
    Object.assign(env, extraEnv);
    try { return (await this.run(provider.command, args, { env, timeout: 60_000, maxBuffer: 2_000_000, windowsHide: true })).stdout.trim(); }
    catch { throw new Error('Bitwarden command failed. Check the CLI path, login, and vault state. Secret-bearing output was suppressed.'); }
  }
  async status(provider) {
    const result = vaultJSON(await this.command(provider, ['status']));
    return { status: result.status, serverUrl: result.serverUrl || null, userEmail: result.userEmail || null };
  }
  async unlock(provider, password) {
    if (typeof password !== 'string' || !password) throw new Error('Enter the vault master password.');
    const key = await this.command(provider, ['unlock', '--passwordenv', 'PROTEUS_BW_UNLOCK', '--raw'], { PROTEUS_BW_UNLOCK: password });
    if (!key || /\s/.test(key)) throw new Error('Bitwarden did not return a usable session.');
    this.sessions.set(provider.id, { key, at: Date.now() });
    return { status: 'unlocked' };
  }
  async lock(provider) { try { await this.command(provider, ['lock']); } finally { this.sessions.delete(provider.id); } return { status: 'locked' }; }
  async getLogin(provider, binding, origin) {
    const item = vaultJSON(await this.command(provider, ['get', 'item', binding.itemId]));
    if (item.id !== binding.itemId || item.deletedDate) throw new Error('Credential item is unavailable.');
    if (binding.scope === 'organization') {
      if (item.organizationId !== binding.organizationId || !item.collectionIds?.includes(binding.collectionId)) throw new Error('Credential is outside the configured organization or collection.');
    } else if (item.organizationId) throw new Error('This binding expects a personal-vault item.');
    const matchesOrigin = item.login?.uris?.some(entry => { try { return new URL(entry.uri).origin === origin; } catch { return false; } });
    if (!matchesOrigin) throw new Error('This origin is not recorded on the Bitwarden login item. Add its exact login site in Bitwarden first.');
    if (typeof item.login?.password !== 'string' || !item.login.password) throw new Error('The item has no password. Complete passkey/SSO login interactively.');
    return { username: item.login.username || '', password: item.login.password };
  }
  clear() { this.sessions.clear(); }
}
export class CredentialBroker {
  constructor(home, adapters = { 'bitwarden-cli': new BitwardenCLI() }) {
    this.file = path.join(home, 'credentials.json'); this.adapters = adapters; this.busy = false;
    if (!fs.existsSync(this.file)) atomicJSON(this.file, { schemaVersion: 1, providers: [], bindings: [] });
  }
  get() { const value = readJSON(this.file); return { ...value, file: this.file, revision: revision(value) }; }
  save(value, expectedRevision) {
    if (this.get().revision !== expectedRevision) throw new Error('Credential settings changed. Reload before saving.');
    if (value.schemaVersion !== 1 || !Array.isArray(value.providers) || !Array.isArray(value.bindings)) throw new Error('Invalid credential configuration.');
    const providers = value.providers.map(p => {
      if (!/^[\w-]+$/.test(p.id) || !this.adapters[p.type] || !p.command?.trim() || (p.appDataDirectory && !path.isAbsolute(p.appDataDirectory))) throw new Error('Choose a supported provider, executable, and absolute CLI data folder.');
      return { id: p.id, name: p.name || p.id, type: p.type, command: p.command, appDataDirectory: p.appDataDirectory || '' };
    });
    if (new Set(providers.map(p => p.id)).size !== providers.length) throw new Error('Provider IDs must be unique.');
    const bindings = value.bindings.map(b => {
      if (!/^[\w-]+$/.test(b.id) || !providers.some(p => p.id === b.providerId) || !b.itemId?.trim() || !b.name?.trim() || !['organization', 'personal'].includes(b.scope)) throw new Error('Complete the login binding and select a provider.');
      if (b.scope === 'organization' && (!b.organizationId?.trim() || !b.collectionId?.trim())) throw new Error('Organization items require exact organization and collection IDs.');
      if (!Array.isArray(b.origins) || !b.origins.length) throw new Error('Add at least one exact login origin.');
      return { id: b.id, name: b.name, providerId: b.providerId, itemId: b.itemId, scope: b.scope, organizationId: b.organizationId || '', collectionId: b.collectionId || '', origins: b.origins.map(loginOrigin) };
    });
    if (new Set(bindings.map(b => b.id)).size !== bindings.length) throw new Error('Binding IDs must be unique.');
    if (revision(providers) !== revision(this.get().providers)) for (const adapter of Object.values(this.adapters)) adapter.clear?.();
    atomicJSON(this.file, { schemaVersion: 1, providers, bindings }); return this.get();
  }
  provider(id) { const provider = this.get().providers.find(p => p.id === id); if (!provider) throw new Error('Credential provider not found.'); return provider; }
  async operation(id, action, password) {
    if (this.busy) throw new Error('Another credential operation is in progress.');
    const provider = this.provider(id); const adapter = this.adapters[provider.type];
    this.busy = true;
    try {
      if (action === 'status') return await adapter.status(provider);
      if (action === 'unlock') return await adapter.unlock(provider, password);
      if (action === 'lock') return await adapter.lock(provider);
      throw new Error('Unknown credential action.');
    } finally { this.busy = false; }
  }
  async fill(bindingId, origin, consumer) {
    if (this.busy) throw new Error('Another credential operation is in progress.');
    origin = loginOrigin(origin);
    const binding = this.get().bindings.find(b => b.id === bindingId);
    if (!binding || !binding.origins.includes(origin)) throw new Error('No authorized login binding for this exact site.');
    const provider = this.provider(binding.providerId); this.busy = true;
    try {
      const login = await this.adapters[provider.type].getLogin(provider, binding, origin);
      // Secrets go only to the main-process consumer, never to renderer IPC or an agent tool.
      await consumer(login);
      return { filled: true, name: binding.name, origin };
    } finally { this.busy = false; }
  }
  close() { for (const adapter of Object.values(this.adapters)) adapter.clear?.(); }
}
