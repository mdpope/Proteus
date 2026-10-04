// Shared encrypted wire transport; the browser retains nonextractable IndexedDB keys.
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
