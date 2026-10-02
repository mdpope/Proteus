import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { seal, unseal, secret } from '../src/remote-crypto.js';
export const until = async (check, timeout = 8000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (check()) return; await new Promise(r => setTimeout(r, 20)); } throw new Error('Remote condition timed out.'); };
export class RemoteClient extends EventEmitter {
  constructor(capsule, device) { super(); this.capsule = capsule; this.device = device; this.incoming = 0; this.outgoing = 0; this.waiting = new Map(); this.events = []; }
  static capsule(code) { return JSON.parse(Buffer.from(new URL(code).searchParams.get('data'), 'base64url')); }
  async connect() {
    const { relay, hostId } = this.capsule;
    this.ws = new WebSocket(`${relay}/socket?role=client&host=${hostId}`);
    this.ws.on('error', error => { this.failure = error.message; });
    this.ws.on('message', bytes => {
      try {
        const packet = JSON.parse(bytes);
        if (packet.type === 'challenge') {
          this.challenge = packet.challenge;
          if (this.device) this.auth();
          else this.raw({ type: 'pair', box: seal(this.capsule.key, { name: 'Synthetic mobile client' }, `${this.challenge}:pair`) });
        } else if (packet.type === 'paired') { this.device = unseal(this.capsule.key, packet.box, `${this.challenge}:paired`); this.auth(); }
        else if (packet.type === 'ready') { unseal(this.device.key, packet.box, `${this.prefix}:ready`); this.ready = true; }
        else if (packet.type === 'data') {
          if (packet.seq !== ++this.incoming) throw new Error('Out-of-order response');
          const value = unseal(this.device.key, packet.box, `${this.prefix}:host:${packet.seq}`);
          if (value.type === 'result') { const pending = this.waiting.get(value.id); this.waiting.delete(value.id); if (pending) value.error ? pending.reject(new Error(value.error)) : pending.resolve(value.result); }
          else { this.events.push(value); this.emit('event', value); }
        } else { this.failure = packet.type; this.emit('rejected', packet.type); }
      } catch (error) { this.failure = error.message; }
    });
    await until(() => this.ready || this.failure); if (this.failure) throw new Error(this.failure); return this;
  }
  auth() { const nonce = secret(); this.prefix = `${this.challenge}:${nonce}`; this.raw({ type: 'auth', deviceId: this.device.id, box: seal(this.device.key, { nonce }, `${this.challenge}:auth`) }); }
  raw(value) { this.ws.send(JSON.stringify(value)); }
  request(method, args = {}, id = randomUUID(), issuedAt = new Date().toISOString()) {
    const seq = ++this.outgoing; const packet = { type: 'data', seq, box: seal(this.device.key, { id, method, args, issuedAt }, `${this.prefix}:client:${seq}`) };
    this.lastPacket = packet;
    return new Promise((resolve, reject) => { this.waiting.set(id, { resolve, reject }); this.raw(packet); });
  }
  close() { this.ws?.terminate(); }
}
