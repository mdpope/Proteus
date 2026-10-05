// Wire-compatible with src/remote-crypto.js and Apple CryptoKit AES.GCM.combined.
// Conversation payloads stay on this encrypted wire. Account credential custody is a separate adapter.
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const bytes64 = text => Uint8Array.from(atob(text), character => character.charCodeAt(0));
const base64 = bytes => { let text = ''; for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(text); };
export async function importKey(hex) {
    if (!/^[a-f0-9]{64}$/i.test(hex || '')) throw new Error('Invalid pairing key.');
    return crypto.subtle.importKey('raw', Uint8Array.from(hex.match(/../g), value => parseInt(value, 16)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(key, value, aad) {
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: encoder.encode(aad), tagLength: 128 }, key, encoder.encode(JSON.stringify(value))));
    const combined = new Uint8Array(nonce.length + encrypted.length); combined.set(nonce); combined.set(encrypted, nonce.length); return base64(combined);
}
export async function unseal(key, box, aad) {
    if (typeof box !== 'string' || box.length > 8_000_000) throw new Error('Invalid encrypted message.');
    const bytes = bytes64(box); if (bytes.length < 28) throw new Error('Invalid encrypted message.');
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12), additionalData: encoder.encode(aad), tagLength: 128 }, key, bytes.subarray(12));
    return JSON.parse(decoder.decode(plaintext));
}
export function parsePairing(code) {
    let capsule;
    if (typeof code !== 'string' || code.length > 10_000) throw new Error('Paste a fresh pairing code from the Mac.');
    try {
        const trimmed = code.trim();
        const encoded = trimmed.startsWith('proteus://') ? new URL(trimmed).searchParams.get('data') : trimmed.replace(/^#?pair=/, '');
        capsule = JSON.parse(decoder.decode(bytes64(encoded.replace(/-/g, '+').replace(/_/g, '/'))));
    } catch { throw new Error('This is not a Proteus pairing code.'); }
    const relay = new URL(capsule.relay);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(relay.hostname);
    if (capsule.version !== 1 || !uuid.test(capsule.hostId || '') || !/^[a-f0-9]{64}$/i.test(capsule.key || '') || !Number.isFinite(Date.parse(capsule.expiresAt)) || Date.parse(capsule.expiresAt) <= Date.now()) throw new Error('Pairing expired or is invalid. Generate a fresh code on the Mac.');
    if (relay.origin !== capsule.relay || relay.username || relay.password || (relay.protocol !== 'wss:' && !(relay.protocol === 'ws:' && loopback))) throw new Error('Browser pairing requires a secure relay, or loopback for local testing.');
    return capsule;
}
export class BrowserRemoteClient extends EventTarget {
    constructor(host, { socketFactory = url => new WebSocket(url), name = 'Proteus browser', onPaired = async () => {}, onCredential = async () => {} } = {}) {
        super(); this.host = host; this.socketFactory = socketFactory; this.name = name; this.onPaired = onPaired; this.onCredential = onCredential; this.waiting = new Map(); this.outgoing = 0; this.incoming = 0; this.sendQueue = Promise.resolve(); this.receiveQueue = Promise.resolve(); this.status = 'disconnected';
    }
    event(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
    async connect() {
        if (this.socket) throw new Error('This connection already started.');
        this.status = 'connecting'; this.event('status', this.status);
        if (this.host.inviteKey) this.inviteKey = await importKey(this.host.inviteKey);
        return new Promise((resolve, reject) => {
            this.connected = { resolve, reject };
            this.timer = setTimeout(() => this.fail('The Mac did not finish authentication. Check that it is online and retry.'), 20_000);
            this.socket = this.socketFactory(`${this.host.relay}/socket?role=client&host=${encodeURIComponent(this.host.hostId)}`);
            this.socket.addEventListener('message', event => { this.receiveQueue = this.receiveQueue.then(() => this.receive(JSON.parse(event.data))).catch(() => this.fail('Encrypted connection verification failed. Reconnect or pair this browser again.')); });
            this.socket.addEventListener('error', () => this.fail('Could not reach the relay. Check the Mac connection and relay origin settings.'));
            this.socket.addEventListener('close', event => this.fail(event.code === 1013 ? 'Mac is offline. Connect it to the relay and retry.' : event.code === 1012 ? 'Mac disconnected. Reconnect when it is online.' : 'Remote connection closed. Reconnect to continue.'));
        });
    }
    raw(packet) { if (this.socket?.readyState !== 1) throw new Error('Mac is not connected.'); this.socket.send(JSON.stringify(packet)); }
    async authenticate() {
        const bytes = crypto.getRandomValues(new Uint8Array(32)); const nonce = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join(''); this.prefix = `${this.challenge}:${nonce}`;
        this.raw({ type: 'auth', deviceId: this.host.deviceId, box: await seal(this.host.key, { nonce }, `${this.challenge}:auth`) });
    }
    async receive(packet) {
        if (packet.type === 'challenge') {
            if (this.challenge || !/^[a-f0-9]{64}$/.test(packet.challenge || '')) throw new Error('Invalid challenge.'); this.challenge = packet.challenge;
            if (this.host.key) await this.authenticate();
            else this.raw({ type: 'pair', box: await seal(this.inviteKey, { name: this.name }, `${this.challenge}:pair`) });
        } else if (packet.type === 'paired') {
            if (!this.inviteKey || this.host.key) throw new Error('Unexpected pairing.');
            const device = await unseal(this.inviteKey, packet.box, `${this.challenge}:paired`);
            if (!uuid.test(device.id)) throw new Error('Invalid device.'); await this.onCredential({hostId:this.host.hostId, relay:this.host.relay, label:this.host.label, deviceId:device.id, key:device.key, pairedAt:device.pairedAt}); this.host.key = await importKey(device.key); this.host.deviceId = device.id; this.host.pairedAt = device.pairedAt; delete this.host.inviteKey; this.inviteKey = null;
            await this.onPaired(this.host); await this.authenticate();
        } else if (packet.type === 'ready') {
            if (this.status !== 'connecting' || !this.prefix) throw new Error('Unexpected ready message.');
            const value = await unseal(this.host.key, packet.box, `${this.prefix}:ready`); if (value.protocol !== 1) throw new Error('Unsupported protocol.');
            clearTimeout(this.timer); this.status = 'online'; this.connected.resolve(this); this.connected = null; this.event('status', this.status);
        } else if (packet.type === 'data') {
            if (this.status !== 'online' || packet.seq !== this.incoming + 1) throw new Error('Invalid sequence.');
            const value = await unseal(this.host.key, packet.box, `${this.prefix}:host:${packet.seq}`); this.incoming = packet.seq;
            if (value.type === 'result') { const pending = this.waiting.get(value.id); if (pending) { clearTimeout(pending.timer); this.waiting.delete(value.id); value.error ? pending.reject(new Error(value.error)) : pending.resolve(value.result); } }
            else if(value.type === 'revoked' && value.deviceId === this.host.deviceId){this.event('revoked',{authenticated:true,deviceId:value.deviceId});this.fail('This device was revoked by the Mac.');}
            else if (value.type === 'event') this.event('change', value);
            else throw new Error('Invalid message.');
        } else if (packet.type === 'revoked' || packet.type === 'rejected') { this.event('rejected', {authenticated:false,type:packet.type}); this.fail('The connection was rejected. Your saved pairing was preserved; retry or review Connections on the Mac.'); }
        else throw new Error('Unexpected message.');
    }
    request(method, args = {}, { id = crypto.randomUUID(), issuedAt = new Date().toISOString() } = {}) {
        if (this.status !== 'online') return Promise.reject(new Error('Connect this Mac first.'));
        if (this.waiting.has(id)) return Promise.reject(new Error('This action is already waiting for a response.'));
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.waiting.delete(id); reject(new Error('Response timed out. Refresh the Mac state before retrying; the action may already have completed.')); }, 60_000);
            this.waiting.set(id, { resolve, reject, timer });
            this.sendQueue = this.sendQueue.then(async () => { const seq = ++this.outgoing; this.raw({ type: 'data', seq, box: await seal(this.host.key, { id, method, args, issuedAt }, `${this.prefix}:client:${seq}`) }); }).catch(() => this.fail('Could not send the encrypted request. Reconnect before retrying.'));
        });
    }
    fail(message) {
        if (this.status === 'closed') return;
        clearTimeout(this.timer); this.status = 'closed'; this.connected?.reject(new Error(message)); this.connected = null;
        for (const pending of this.waiting.values()) { clearTimeout(pending.timer); pending.reject(new Error(message)); } this.waiting.clear();
        this.socket?.close(); this.inviteKey = null; delete this.host.inviteKey; this.event('status', 'offline'); this.event('failure', message);
    }
    close() { this.fail('Disconnected.'); }
}
