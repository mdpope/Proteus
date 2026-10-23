import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { once } from 'node:events';
import { startServer } from '../src/server.js';

for (const stalled of ['headers', 'body']) test(`shutdown drains idle keep-alive and incomplete HTTP ${stalled}, releasing runner ownership`, async t => {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-shutdown-'));
  const fake = { status: async () => ({ available: true, models: [] }), run: async () => {}, close: async () => {} };
  const app = await startServer({ home, port: 0, timers: false, withSeed: false, providers: { copilot: fake } });
  const agent = new http.Agent({ keepAlive: true });
  let socket, closing;
  t.after(async () => { socket?.destroy(); agent.destroy(); await (closing || app.close()); fs.rmSync(home, { recursive: true, force: true }); });
  await new Promise((resolve, reject) => {
    http.get(app.origin + '/api/state', { agent, headers: { Authorization: `Bearer ${app.token}` } }, response => {
      assert.equal(response.statusCode, 200); response.resume(); response.once('end', resolve);
    }).once('error', reject);
  });
  assert.ok(Object.values(agent.freeSockets).some(sockets => sockets.length), 'An idle keep-alive connection exists');
  socket = net.connect(new URL(app.origin).port, '127.0.0.1');
  socket.on('error', () => {});
  await once(socket, 'connect');
  // A complete request proves this socket was accepted before we strand its next request.
  const accepted = once(socket, 'data');
  socket.write('GET /api/state HTTP/1.1\r\nHost: localhost\r\n\r\n');
  await accepted; socket.resume();
  const partial = stalled === 'headers'
    ? 'POST /api/life/data HTTP/1.1\r\nHost: localhost\r\n'
    : `POST /api/life/data HTTP/1.1\r\nHost: localhost\r\nAuthorization: Bearer ${app.token}\r\nContent-Type: application/json\r\nContent-Length: 1024\r\n\r\n{`;
  await new Promise(resolve => socket.write(partial, resolve));
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(socket.destroyed, false);
  assert.equal(fs.existsSync(path.join(home, 'runner.lock')), true);
  assert.equal(fs.existsSync(path.join(home, 'connection.json')), true);
  closing = app.close();
  let deadline;
  try {
    await Promise.race([closing, new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Shutdown remained blocked on an incomplete HTTP request')), 1000); })]);
  } finally { clearTimeout(deadline); }
  assert.equal(fs.existsSync(path.join(home, 'runner.lock')), false);
  assert.equal(fs.existsSync(path.join(home, 'connection.json')), false);
  const replacement = await startServer({ home, port: 0, timers: false, withSeed: false, providers: { copilot: fake } });
  await replacement.close();
});
