// Shared encrypted transport. Legacy browser-only pairings remain in scoped IndexedDB;
// account-backed destination credentials are imported into session memory only.
export { BrowserRemoteClient, parsePairing, importKey, seal, unseal } from '../../../src/remote-client.js';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export class PairingStore {
    constructor(account) { if (!/^[a-f0-9]{64}$/.test(account)) throw new Error('Sign in again to use remote workspaces.'); this.account = account; }
    async open() {
        if (this.database) return this.database;
        this.database = await new Promise((resolve, reject) => { const request = indexedDB.open(`proteus-remote-v1-${this.account}`, 1); request.onupgradeneeded = () => request.result.createObjectStore('hosts', { keyPath: 'hostId' }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error('Browser storage is unavailable. Enable private site storage to pair a Mac.')); });
        return this.database;
    }
    async operation(mode, callback) {
        const db = await this.open(); return new Promise((resolve, reject) => { const transaction = db.transaction('hosts', mode); const request = callback(transaction.objectStore('hosts')); let result; request.onsuccess = () => { result = request.result; }; transaction.oncomplete = () => resolve(result); transaction.onerror = () => reject(new Error('Could not save this browser pairing.')); transaction.onabort = transaction.onerror; });
    }
    list() { return this.operation('readonly', store => store.getAll()); }
    save(host) { const { hostId, relay, label, deviceId, key, cursor, pairedAt } = host; if (!uuid.test(hostId) || key?.extractable !== false || key.algorithm?.name !== 'AES-GCM') throw new Error('Invalid protected pairing.'); return this.operation('readwrite', store => store.put({ hostId, relay, label, deviceId, key, cursor: cursor || '', pairedAt })); }
    remove(hostId) { return this.operation('readwrite', store => store.delete(hostId)); }
    clear() { return this.operation('readwrite', store => store.clear()); }
    close() { this.database?.close(); this.database = null; }
}

export class AccountSessionError extends Error {
    constructor(message = 'Website sign-in changed or expired. Sign in again before connecting.') { super(message); this.name = 'AccountSessionError'; this.sessionInvalid = true; }
}
function destination(value, key = false) {
    if (!value || !uuid.test(value.hostId || '') || !uuid.test(value.deviceId || '') || typeof value.label !== 'string' || !value.label.trim() || value.label.length > 80) throw new Error('The saved destination is invalid. Review it in your account.');
    const relay = new URL(value.relay), local = ['localhost', '127.0.0.1', '[::1]'].includes(relay.hostname);
    if (relay.origin !== value.relay || relay.username || relay.password || !(relay.protocol === 'wss:' || relay.protocol === 'ws:' && local)) throw new Error('The saved relay address is invalid.');
    if (key && !/^[a-f0-9]{64}$/i.test(value.key || '')) throw new Error('The saved destination credential is invalid. Pair this Mac again.');
    return {hostId:value.hostId, relay:value.relay, label:value.label, deviceId:value.deviceId, pairedAt:value.pairedAt, source:'account', ...(key ? {key:value.key} : {})};
}
// Only the selected destination credential is fetched. Raw keys never enter browser storage.
export class AccountPairingStore {
    constructor(account, { fetcher = (...args) => fetch(...args), csrf = () => document.querySelector('meta[name="csrf-token"]')?.content || '', sessionURL = '/remote/session', base = '/remote/destinations' } = {}) {
        if (!/^[a-f0-9]{64}$/.test(account)) throw new AccountSessionError();
        if (![sessionURL, base].every(path => /^\/(?!\/)[^?#]*$/.test(path))) throw new Error('Account endpoints must belong to this website.');
        this.account=account;this.fetcher=fetcher;this.csrf=csrf;this.sessionURL=sessionURL;this.base=base;
    }
    async checked(path, {method='GET', body} = {}) {
        const response = await this.fetcher(path, {method, signal:AbortSignal.timeout(15_000), credentials:'same-origin', cache:'no-store', redirect:'manual', headers:{Accept:'application/json', 'X-Proteus-Account':this.account, ...(method==='GET'?{}:{'Content-Type':'application/json','X-CSRF-TOKEN':this.csrf()})}, ...(body===undefined?{}:{body:JSON.stringify(body)})});
        if ([0,401,403,419].includes(response.status) || response.type==='opaqueredirect') throw new AccountSessionError();
        if (!response.ok) {
            const failure = new Error(response.status===409 ? 'The saved destination changed in another session. Reload before trying again.' : 'The account destination request failed. Please retry.');failure.status=response.status;throw failure;
        }
        if (response.status===204) return null;
        return response.json();
    }
    async verifySession() {
        const value = await this.checked(this.sessionURL);
        if (value?.account !== this.account) throw new AccountSessionError();
        return true;
    }
    async request(path='', options) { await this.verifySession(); return this.checked(this.base+path,options); }
    async list() { const value=await this.request();if(!Array.isArray(value.destinations)||value.destinations.length>32)throw new Error('The account destination list is invalid.');return value.destinations.map(row=>destination(row)); }
    async credential(hostId) {
        if(!uuid.test(hostId))throw new Error('Choose a valid destination.');
        const value=destination(await this.request('/'+hostId+'/credential'),true);
        if(value.hostId!==hostId)throw new Error('The saved destination identity changed.');
        const {key,...metadata}=value;return {...metadata,key:await importAccountKey(key),cursor:''};
    }
    async saveCredential(record) { const value=destination(record,true);const {source,...body}=value;const saved=await this.request('',{method:'POST',body});return destination(saved?.destination||saved); }
    async remove(host) { if(!uuid.test(host.hostId)||!uuid.test(host.deviceId))throw new Error('Choose a valid destination.');return this.request('/'+host.hostId,{method:'DELETE',body:{deviceId:host.deviceId}}); }
}
import { importKey as importAccountKey } from '../../../src/remote-client.js';
