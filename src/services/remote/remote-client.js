// Wire-compatible with src/services/remote/remote-crypto.js and Apple CryptoKit AES.GCM.combined.
// Conversation payloads stay on this encrypted wire. Account credential custody is a separate adapter.
import {remoteTransportLimits as limits} from './remote-transport.js';
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
    return sealText(key,JSON.stringify(value),aad);
}
async function sealText(key, text, aad) {
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: encoder.encode(aad), tagLength: 128 }, key, encoder.encode(text)));
    const combined = new Uint8Array(nonce.length + encrypted.length); combined.set(nonce); combined.set(encrypted, nonce.length); return base64(combined);
}
export async function unseal(key, box, aad) {
    if (typeof box !== 'string' || box.length > 8_000_000) throw new Error('Invalid encrypted message.');
    const bytes = bytes64(box); if (bytes.length < 28) throw new Error('Invalid encrypted message.');
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12), additionalData: encoder.encode(aad), tagLength: 128 }, key, bytes.subarray(12));
    return JSON.parse(decoder.decode(plaintext));
}
export function pairingRelayOrigin(value, { allowLocalNetwork = false } = {}) {
    const relay = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(relay.hostname);
    const octets = relay.hostname.split('.');
    const ipv4 = octets.length === 4 && octets.every(value => /^\d{1,3}$/.test(value) && Number(value) <= 255);
    const [a, b] = octets.map(Number);
    const privateNetwork = ipv4 && (a === 10 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31) || relay.hostname.endsWith('.local');
    if (relay.origin !== value || relay.username || relay.password || (relay.protocol !== 'wss:' && !(relay.protocol === 'ws:' && (loopback || allowLocalNetwork && privateNetwork)))) throw new Error(allowLocalNetwork ? 'Desktop pairing requires a secure relay or a private local network relay.' : 'Browser pairing requires a secure relay, or loopback for local testing.');
    return relay.origin;
}
export function parsePairing(code, options) {
    let capsule;
    if (typeof code !== 'string' || code.length > 10_000) throw new Error('Paste a fresh pairing code from the computer.');
    try {
        const trimmed = code.trim();
        const encoded = trimmed.startsWith('proteus://') ? new URL(trimmed).searchParams.get('data') : trimmed.replace(/^#?pair=/, '');
        capsule = JSON.parse(decoder.decode(bytes64(encoded.replace(/-/g, '+').replace(/_/g, '/'))));
    } catch { throw new Error('This is not a Proteus pairing code.'); }
    if (capsule.version !== 1 || !uuid.test(capsule.hostId || '') || !/^[a-f0-9]{64}$/i.test(capsule.key || '') || !Number.isFinite(Date.parse(capsule.expiresAt)) || Date.parse(capsule.expiresAt) <= Date.now()) throw new Error('Pairing expired or is invalid. Generate a fresh code on the computer.');
    pairingRelayOrigin(capsule.relay, options);
    return capsule;
}
export class BrowserRemoteClient extends EventTarget {
    constructor(host, { socketFactory = url => new WebSocket(url), name = 'Proteus browser', onPaired = async () => {}, onCredential = async () => {}, timeoutMs = 20_000 } = {}) {
        super(); this.host = host; this.socketFactory = socketFactory; this.name = name; this.onPaired = onPaired; this.onCredential = onCredential; this.waiting = new Map(); this.outgoing = 0; this.incoming = 0; this.sendQueue = Promise.resolve(); this.receiveQueue = Promise.resolve(); this.queuedSendBytes=0;this.queuedReceiveBytes=0;this.queuedReceivePackets=0;this.status = 'disconnected'; this.timeoutMs=timeoutMs; this.stage='relay';
    }
    event(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
    progress(stage,message) { this.stage=stage;this.event('stage',{stage,message}); }
    async connect() {
        if (this.socket) throw new Error('This connection already started.');
        this.status = 'connecting'; this.event('status', this.status);
        if (this.host.inviteKey) {if(this.host.expiresAt&&Date.parse(this.host.expiresAt)<=Date.now())throw new Error('Invitation expired before connection. Generate a fresh code on the computer.');this.inviteKey = await importKey(this.host.inviteKey);}
        this.progress('relay','Connecting to the relay…');
        return new Promise((resolve, reject) => {
            this.connected = { resolve, reject };
            this.timer = setTimeout(() => this.fail(this.stage==='account-save'?'Account save did not finish. Check website sign-in and retry; the computer may have consumed the invitation.':this.stage==='pairing'?'Pairing did not finish. Check the computer’s Connections page and create a fresh invitation.':'Computer authentication did not finish. Check that the computer is online and retry.'), this.timeoutMs);
            this.socket = this.socketFactory(`${this.host.relay}/socket?role=client&host=${encodeURIComponent(this.host.hostId)}`);
            this.socket.addEventListener('message', event => this.queueMessage(event.data));
            this.socket.addEventListener('error', () => this.fail('Could not reach the relay. Check the computer connection and relay origin settings.'));
            this.socket.addEventListener('close', event => {if(event.code===1008)this.event('recovery-blocked',{reason:'authentication'});this.fail(event.code === 1013 ? 'Computer is offline or the relay is busy. Connect the computer to the relay, then retry.' : event.code === 1012 ? 'Computer disconnected during '+this.stage+'. Reconnect when it is online.' : event.code === 1008 ? 'Relay refused the connection during '+this.stage+'. Check computer access and use a fresh invitation for pairing.' : 'Connection interrupted during '+this.stage+' (close '+event.code+'). Reconnect; pairing may require a fresh invitation.');});
        });
    }
    queueMessage(data) {
        if(this.status==='closed')return;
        if(typeof data!=='string'||data.length>limits.packetBytes){this.fail('The relay sent an oversized or unsupported message. Reconnect before retrying.');return;}
        const bytes=encoder.encode(data).length;
        if(bytes>limits.packetBytes||this.queuedReceivePackets>=limits.queuedReceivePackets||this.queuedReceiveBytes+bytes>limits.queuedReceiveBytes){this.fail('The remote connection is receiving more data than it can process. Reconnect to refresh its state.');return;}
        this.queuedReceivePackets++;this.queuedReceiveBytes+=bytes;
        this.receiveQueue=this.receiveQueue.then(()=>{if(this.status!=='closed')return this.receive(JSON.parse(data));}).catch(()=>{if(this.status!=='closed'){this.event('recovery-blocked',{reason:'verification'});this.fail('Encrypted verification failed during '+this.stage+'. Reconnect or generate a fresh invitation.');}}).finally(()=>{this.queuedReceivePackets--;this.queuedReceiveBytes-=bytes;});
    }
    raw(packet) {
        if(this.socket?.readyState!==1)throw new Error('Computer is not connected.');
        const encoded=JSON.stringify(packet),bytes=encoder.encode(encoded).length;
        if(bytes>limits.packetBytes||(this.socket.bufferedAmount||0)+bytes>limits.bufferedBytes)throw new Error('The remote connection cannot buffer more data. Reconnect to refresh its state.');
        this.socket.send(encoded);
    }
    sendPause(ms){return new Promise(resolve=>{this.sendDelay={resolve,timer:setTimeout(()=>{this.sendDelay=null;resolve();},ms)};});}
    async authenticate() {
        if(this.status==='closed')return;this.progress('authentication','Authenticating this browser with the computer…');
        const bytes = crypto.getRandomValues(new Uint8Array(32)); const nonce = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join(''); this.prefix = `${this.challenge}:${nonce}`;
        this.raw({ type: 'auth', deviceId: this.host.deviceId, box: await seal(this.host.key, { nonce }, `${this.challenge}:auth`) });
    }
    async receive(packet) {
        if(this.status==='closed')return;
        if (packet.type === 'challenge') {
            if (this.challenge || !/^[a-f0-9]{64}$/.test(packet.challenge || '')) throw new Error('Invalid challenge.'); this.challenge = packet.challenge;
            if (this.host.key) await this.authenticate();
            else {this.progress('pairing','Computer reached. Verifying the invitation…');this.raw({ type: 'pair', box: await seal(this.inviteKey, { name: this.name }, `${this.challenge}:pair`) });}
        } else if (packet.type === 'paired') {
            if (!this.inviteKey || this.host.key) throw new Error('Unexpected pairing.');
            const device = await unseal(this.inviteKey, packet.box, `${this.challenge}:paired`);
            if (!uuid.test(device.id)) throw new Error('Invalid device.');this.progress('account-save','Invitation accepted. Saving the account destination…');try{await this.onCredential({hostId:this.host.hostId, relay:this.host.relay, label:this.host.label, deviceId:device.id, key:device.key, pairedAt:device.pairedAt});}catch{this.fail('Invitation accepted, but account save failed. Check website sign-in and create a fresh invitation; no account destination was confirmed.');return;}if(this.status==='closed')return;this.credentialSaved=true; this.host.key = await importKey(device.key); this.host.deviceId = device.id; this.host.pairedAt = device.pairedAt; delete this.host.inviteKey; this.inviteKey = null;
            await this.onPaired(this.host); await this.authenticate();
        } else if (packet.type === 'ready') {
            if (this.status !== 'connecting' || !this.prefix) throw new Error('Unexpected ready message.');
            const value = await unseal(this.host.key, packet.box, `${this.prefix}:ready`); if (value.protocol !== 1) throw new Error('Unsupported protocol.');
            clearTimeout(this.timer);this.progress('connected',this.credentialSaved?'Destination saved and authenticated. Connected to the computer.':'Authenticated. Connected to the computer.'); this.status = 'online'; this.connected.resolve(this); this.connected = null; this.event('status', this.status);
        } else if (packet.type === 'data') {
            if (this.status !== 'online' || packet.seq !== this.incoming + 1) throw new Error('Invalid sequence.');
            const value = await unseal(this.host.key, packet.box, `${this.prefix}:host:${packet.seq}`); this.incoming = packet.seq;
            if (value.type === 'result') { const pending = this.waiting.get(value.id); if (pending) { clearTimeout(pending.timer); this.waiting.delete(value.id); value.error ? pending.reject(Object.assign(new Error(value.error),value.code==='JOURNAL_BUSY'?{code:value.code,details:value.details}:{})) : pending.resolve(value.result); } }
            else if(value.type === 'revoked' && value.deviceId === this.host.deviceId){this.event('revoked',{authenticated:true,deviceId:value.deviceId});this.fail('This device was revoked by the computer.');}
            else if (value.type === 'event') this.event('change', value);
            else throw new Error('Invalid message.');
        } else if (packet.type === 'revoked' || packet.type === 'rejected') { this.event('recovery-blocked',{reason:'authentication'}); this.event('rejected', {authenticated:false,type:packet.type}); this.fail(this.stage==='pairing'?'Computer rejected the invitation. It may be expired or already consumed. Create a fresh invitation.':'Computer rejected authentication. Saved pairing was preserved; review Connections on the computer.'); }
        else throw new Error('Unexpected message.');
    }
    request(method, args = {}, { id = crypto.randomUUID(), issuedAt = new Date().toISOString(), timeoutMs = 60_000 } = {}) {
        if (this.status !== 'online') return Promise.reject(new Error('Connect this computer first.'));
        if (this.waiting.has(id)) return Promise.reject(new Error('This action is already waiting for a response.'));
        if(this.waiting.size>=limits.pendingRequests)return Promise.reject(Object.assign(new Error('Too many remote actions are pending. Wait for the current responses before retrying.'),{code:'REMOTE_BUSY'}));
        let serialized,wireBytes;try{serialized=JSON.stringify({id,method,args,issuedAt});wireBytes=4*Math.ceil((encoder.encode(serialized).length+28)/3)+128;}catch(error){return Promise.reject(error);}
        if(wireBytes>limits.packetBytes)return Promise.reject(new Error('This remote request exceeds the encrypted message limit.'));
        if(this.queuedSendBytes+wireBytes>limits.queuedSendBytes)return Promise.reject(Object.assign(new Error('The remote send queue is full. Wait for the current requests before retrying.'),{code:'REMOTE_BUSY'}));
        this.queuedSendBytes+=wireBytes;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.waiting.delete(id); reject(new Error('Response timed out. Refresh the computer state before retrying; the action may already have completed.')); }, Math.max(1000,Math.min(timeoutMs,60_000)));
            this.waiting.set(id, { resolve, reject, timer });
            this.sendQueue = this.sendQueue.then(async () => {
                // Leave room for authentication and routing within relay windows.
                if(this.status!=='online'||!this.waiting.has(id))return;
                this.sentAt ||= [];
                for(;;){this.sentAt=this.sentAt.filter(row=>Date.now()-row.at<10_100);if(this.sentAt.length<80&&this.sentAt.reduce((sum,row)=>sum+row.bytes,0)+wireBytes<24_000_000)break;await this.sendPause(Math.max(1,10_100-(Date.now()-this.sentAt[0].at)));if(this.status!=='online'||!this.waiting.has(id))return;}
                if(this.status!=='online'||!this.waiting.has(id))return;
                this.sentAt.push({at:Date.now(),bytes:wireBytes});
                const seq = ++this.outgoing; this.raw({ type: 'data', seq, box: await sealText(this.host.key, serialized, `${this.prefix}:client:${seq}`) });
            }).catch(() => this.fail('Could not send the encrypted request. Reconnect before retrying; check the owner state because the action may have completed.')).finally(()=>{this.queuedSendBytes-=wireBytes;});
        });
    }
    fail(message) {
        if (this.status === 'closed') return;
        if(this.sendDelay){clearTimeout(this.sendDelay.timer);this.sendDelay.resolve();this.sendDelay=null;}
        clearTimeout(this.timer);if(this.credentialSaved&&this.status!=='online'&&!message.includes('Disconnected'))message+=' The account destination was saved; reconnect using it rather than reusing the invitation.'; this.status = 'closed'; this.connected?.reject(new Error(message)); this.connected = null;
        for (const pending of this.waiting.values()) { clearTimeout(pending.timer); pending.reject(new Error(message)); } this.waiting.clear();
        this.socket?.close(); this.inviteKey = null; delete this.host.inviteKey; this.event('status', 'offline'); this.event('failure', message);
    }
    close() { this.fail('Disconnected.'); }
}
