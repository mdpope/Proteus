import http from 'node:http';
import fs from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';

const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const send = (ws, value) => { if (ws?.readyState === WebSocket.OPEN) { if (ws.bufferedAmount > 8_000_000) ws.close(1013, 'Slow connection'); else ws.send(JSON.stringify(value)); } };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
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
  if (!info.isFile() || info.mode & 0o077 || (process.getuid && info.uid !== process.getuid()) || info.size > 64_000) throw new Error('Relay host tokens require an owner-only regular file (0600).');
  let values; try { values = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error('Relay host token file must contain valid JSON.'); }
  if (!values || Array.isArray(values) || typeof values !== 'object' || !Object.keys(values).length || Object.entries(values).some(([hostId, value]) => !uuid.test(hostId) || !/^[a-f0-9]{64}$/.test(value))) throw new Error('Relay token file must map host UUIDs to distinct 64-character hex tokens.');
  if (new Set(Object.values(values)).size !== Object.keys(values).length) throw new Error('Each host needs a distinct registration token.');
  return new Map(Object.entries(values));
}
export async function startRelay({ port = 4318, bind = '127.0.0.1', token = process.env.PROTEUS_RELAY_TOKEN, allowedClientOrigins = process.env.PROTEUS_RELAY_ALLOWED_CLIENT_ORIGINS || '', hostTokensFile = process.env.PROTEUS_RELAY_HOST_TOKENS_FILE } = {}) {
  const origins = relayOrigins(allowedClientOrigins);
  const hostTokens = relayHostTokens(hostTokensFile);
  if (!hostTokens && !/^[a-f0-9]{64}$/.test(token || '')) throw new Error('Set a random 32-byte PROTEUS_RELAY_TOKEN or an owner-only host token map.');
  const hosts = new Map(); const clients = new Map();
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(req.url === '/health' ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(req.url === '/health' ? { service: 'proteus-relay', protocol: 1 } : { error: 'Not found' }));
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8_000_000, perMessageDeflate: false });
  server.on('upgrade', (req, socket, head) => {
    let url; try { url = new URL(req.url, 'http://relay'); } catch { socket.destroy(); return; }
    const hostId = url.searchParams.get('host'); const role = url.searchParams.get('role');
    const reject = () => { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); };
    if (url.pathname !== '/socket' || !uuid.test(hostId || '') || !['host', 'client'].includes(role) || (req.headers.origin && (role !== 'client' || !origins.has(req.headers.origin)))) return reject();
    const registrationToken = hostTokens ? hostTokens.get(hostId) : token;
    if (role === 'host' && (!registrationToken || !equal(req.headers.authorization, `Bearer ${registrationToken}`) || hosts.has(hostId))) return reject();
    if (wss.clients.size >= 64) return reject();
    wss.handleUpgrade(req, socket, head, ws => {
      ws.alive = true; ws.on('pong', () => { ws.alive = true; }); ws.on('error', () => {});
      if (role === 'host') {
        hosts.set(hostId, ws);
        ws.on('message', bytes => {
          try {
            const message = JSON.parse(bytes); const client = clients.get(message.clientId);
            if (client?.hostId === hostId) {
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
        clients.set(clientId, { ws, hostId, authenticationTimer });
        send(host, { type: 'connect', clientId }); let budget = 0;
        const timer = setInterval(() => { budget = 0; }, 10_000);
        ws.on('message', bytes => {
          if (++budget > 100) { ws.close(1008, 'Too many messages'); return; }
          try { send(host, { type: 'message', clientId, packet: JSON.parse(bytes) }); }
          catch { ws.close(1008, 'Invalid message'); }
        });
        ws.on('close', () => { clearInterval(timer); clearTimeout(authenticationTimer); clients.delete(clientId); send(hosts.get(hostId), { type: 'disconnect', clientId }); });
      }
    });
  });
  const heartbeat = setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) ws.terminate(); else { ws.alive = false; ws.ping(); } } }, 20_000);
  try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, bind, resolve); }); }
  catch (error) { clearInterval(heartbeat); throw error; }
  return { port: server.address().port, async close() { clearInterval(heartbeat); for (const ws of wss.clients) ws.terminate(); await new Promise(resolve => wss.close(resolve)); await new Promise(resolve => server.close(resolve)); } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const relay = await startRelay({ port: Number(process.env.PORT || 4318), bind: process.env.BIND || '0.0.0.0' });
  console.log(`Proteus relay listening on port ${relay.port}. Message content remains encrypted.`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await relay.close(); process.exit(0); });
}
