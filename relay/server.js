import http from 'node:http';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import {remoteTransportLimits as limits,transportBudget,connectionVerdict} from './transport.mjs';

const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function sendRelayPacket(ws,value){
  if(ws?.readyState!==WebSocket.OPEN)return false;
  const encoded=JSON.stringify(value),bytes=Buffer.byteLength(encoded);
  if(bytes>limits.packetBytes){ws.close(1009,'Message too large');return false;}
  if(ws.bufferedAmount+bytes>limits.bufferedBytes){ws.close(1013,'Slow connection');return false;}
  if(ws.proteusWire){ws.proteusWire.sentPackets++;ws.proteusWire.sentBytes+=bytes;}
  ws.send(encoded);return true;
}
const send=sendRelayPacket;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function hasPrivatePermissions(file, info) {
  // The standalone Linux container has no desktop source tree. Only Windows
  // needs the desktop ACL helper; Unix retains the owner and mode checks here.
  if (process.platform === 'win32') return createRequire(import.meta.url)('../src/shared/private-paths.cjs').hasPrivatePermissions(file, info);
  return !(info.mode & 0o077) && (!process.getuid || info.uid === process.getuid());
}
export function relayOrigins(values = []) {
  if (typeof values === 'string') values = values.split(',').map(value => value.trim()).filter(Boolean);
  if (!Array.isArray(values)) throw new Error('Allowed client origins must be an exact-origin list.');
  return new Set(values.map(value => {
    let url; try { url = new URL(value); } catch { throw new Error('Invalid allowed client origin.'); }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (value.includes('*') || value !== url.origin || url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) throw new Error('Use exact HTTPS client origins, without paths or wildcards.');
    return value;
  }));
}
export function relayHostTokens(file) {
  if (!file) return null;
  const info = fs.lstatSync(file);
  if (!info.isFile() || !hasPrivatePermissions(file, info) || info.size > 64_000) throw new Error('Relay host tokens require an owner-only regular file (0600 on Unix; private ACL on Windows).');
  let values; try { values = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error('Relay host token file must contain valid JSON.'); }
  if (!values || Array.isArray(values) || typeof values !== 'object' || !Object.keys(values).length || Object.entries(values).some(([hostId, value]) => !uuid.test(hostId) || !/^[a-f0-9]{64}$/.test(value))) throw new Error('Relay token file must map host UUIDs to distinct 64-character hex tokens.');
  if (new Set(Object.values(values)).size !== Object.keys(values).length) throw new Error('Each host needs a distinct registration token.');
  return new Map(Object.entries(values));
}
export async function startRelay({ port = 4318, bind = '127.0.0.1', token = process.env.PROTEUS_RELAY_TOKEN, allowedClientOrigins = process.env.PROTEUS_RELAY_ALLOWED_CLIENT_ORIGINS || '', hostTokensFile = process.env.PROTEUS_RELAY_HOST_TOKENS_FILE, heartbeatMs = 20_000 } = {}) {
  const origins = relayOrigins(allowedClientOrigins);
  const hostTokens = relayHostTokens(hostTokensFile);
  if (!hostTokens && !/^[a-f0-9]{64}$/.test(token || '')) throw new Error('Set a random 32-byte PROTEUS_RELAY_TOKEN or an owner-only host token map.');
  const hosts = new Map(); const clients = new Map(); const closedConnections=[];
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(req.url === '/health' ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(req.url === '/health' ? { service: 'proteus-relay', protocol: 1 } : { error: 'Not found' }));
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: limits.packetBytes, perMessageDeflate: false });
  server.on('upgrade', (req, socket, head) => {
    let url; try { url = new URL(req.url, 'http://relay'); } catch { socket.destroy(); return; }
    const hostId = url.searchParams.get('host'); const role = url.searchParams.get('role');
    const reject = () => { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); };
    if (url.pathname !== '/socket' || !uuid.test(hostId || '') || !['host', 'client'].includes(role) || (req.headers.origin && (role !== 'client' || !origins.has(req.headers.origin)))) return reject();
    const registrationToken = hostTokens ? hostTokens.get(hostId) : token;
    if (role === 'host' && (!registrationToken || !equal(req.headers.authorization, `Bearer ${registrationToken}`) || hosts.has(hostId))) return reject();
    if (wss.clients.size >= 64) return reject();
    wss.handleUpgrade(req, socket, head, ws => {
      ws.proteusWire={receivedPackets:0,receivedBytes:0,sentPackets:0,sentBytes:0};
      ws.on('message',bytes=>{ws.proteusWire.receivedPackets++;ws.proteusWire.receivedBytes+=bytes.length;});
      ws.on('close',(code,reason)=>{const known=['Host traffic budget exceeded','Client traffic budget exceeded','Message too large','Slow connection','Host disconnected','Temporary congestion; reconnect','Pairing timed out','Device access ended'];closedConnections.push({role,code,reason:known.includes(reason.toString())?reason.toString():'other',...ws.proteusWire});if(closedConnections.length>32)closedConnections.shift();});
      ws.alive = true; ws.on('pong', () => { ws.alive = true; }); ws.on('message', () => { ws.alive = true; }); ws.on('error', () => {});
      if (role === 'host') {
        hosts.set(hostId, ws);
        send(ws,{type:'relay.ready',capabilities:['client.disconnect.v1']});
        const budget=transportBudget({packets:limits.hostWindowPackets,bytes:limits.hostWindowBytes});
        ws.on('message', bytes => {
          if(!budget(bytes.length)){ws.close(1013,'Host traffic budget exceeded');return;}
          try {
            const message = JSON.parse(bytes); const client = clients.get(message.clientId);
            if(message.type==='client.disconnect'&&client?.hostId===hostId){client.ws.close(1013,'Temporary congestion; reconnect');return;}
            if (client?.hostId === hostId) {
              if(!client.outboundBudget(bytes.length)){client.ws.close(1013,'Client traffic budget exceeded');return;}
              if (message.packet?.type === 'ready') clearTimeout(client.authenticationTimer);
              send(client.ws, message.packet);
              if (['rejected', 'revoked'].includes(message.packet?.type)) client.ws.close(1008, 'Device access ended');
            }
          }
          catch { ws.close(1008, 'Invalid message'); }
        });
        ws.on('close', () => { if (hosts.get(hostId) === ws) hosts.delete(hostId); for (const client of clients.values()) if (client.hostId === hostId) client.ws.close(1012, 'Host disconnected'); });
      } else {
        const host = hosts.get(hostId); if (!host) { ws.close(1013, 'Host offline'); return; }
        const clientId = randomUUID(); const authenticationTimer = setTimeout(() => ws.close(1008, 'Pairing timed out'), 60_000);
        clients.set(clientId, { ws, hostId, authenticationTimer,outboundBudget:transportBudget({packets:limits.hostWindowPackets,bytes:limits.clientWindowBytes}) });
        send(host, { type: 'connect', clientId });
        const budget=transportBudget({packets:limits.clientWindowPackets,bytes:limits.clientWindowBytes});
        ws.on('message', bytes => {
          if (!budget(bytes.length)) { ws.close(1013, 'Client traffic budget exceeded'); return; }
          try { send(host, { type: 'message', clientId, packet: JSON.parse(bytes) }); }
          catch { ws.close(1008, 'Invalid message'); }
        });
        ws.on('close', () => { clearTimeout(authenticationTimer); clients.delete(clientId); send(hosts.get(hostId), { type: 'disconnect', clientId }); });
      }
    });
  });
  const heartbeat = setInterval(() => { for (const ws of wss.clients) { const verdict=connectionVerdict(ws); if (verdict==='terminate') ws.terminate(); else if (verdict==='ping') ws.ping(); } }, heartbeatMs);
  try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, bind, resolve); }); }
  catch (error) { clearInterval(heartbeat); throw error; }
  return { port: server.address().port, diagnostics:()=>({closedConnections:structuredClone(closedConnections)}), async close() { clearInterval(heartbeat); for (const ws of wss.clients) ws.terminate(); await new Promise(resolve => wss.close(resolve)); await new Promise(resolve => server.close(resolve)); } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const relay = await startRelay({ port: Number(process.env.PORT || 4318), bind: process.env.BIND || '0.0.0.0' });
  console.log(`Proteus relay listening on port ${relay.port}. Message content remains encrypted.`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await relay.close(); process.exit(0); });
}
