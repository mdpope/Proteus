// Synthetic fixture only: never run against an operator's real data directory.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { atomicJSON } from '../src/files.js';
import { secret, seal } from '../src/remote-crypto.js';
import { startServer } from '../src/server.js';
import { startRelay } from '../relay/server.js';
import { until } from './remote-client.mjs';
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-mobile-test-'));
const workspace = path.join(home, 'workspace'); fs.mkdirSync(workspace);
fs.writeFileSync(path.join(workspace, 'AGENTS.md'), '# Synthetic workspace instructions\nValidate the evidence.');
fs.mkdirSync(path.join(workspace, '.agents/skills/example'), { recursive: true }); fs.writeFileSync(path.join(workspace, '.agents/skills/example/SKILL.md'), '---\nname: Synthetic skill\n---\nUse synthetic evidence.');
atomicJSON(path.join(home, 'settings.json'), { schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC', workspace: { cwd: workspace, additionalDirectories: [] }, skillDirectories: [], mcpServers: {} });
const token = secret(); let relay;
if (process.env.PROTEUS_TEST_CONTAINER === '1') {
  const envFile = path.join(home, 'relay.env'); fs.writeFileSync(envFile, `PROTEUS_RELAY_TOKEN=${token}\n`, { mode: 0o600 });
  execFileSync('docker', ['--context', 'colima-proteus', 'run', '--detach', '--rm', '--name', 'proteus-relay-test', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--env-file', envFile, '-p', '127.0.0.1:4328:4318', 'proteus-relay:local'], { stdio: 'ignore' });
  relay = { port: 4328, close: async () => execFileSync('docker', ['--context', 'colima-proteus', 'stop', 'proteus-relay-test'], { stdio: 'ignore' }) };
} else relay = await startRelay({ port: 4328, token });
const app = await startServer({ home, port: 0, timers: false });
const schedule = app.engine.schedules.list()[0]; app.engine.schedules.save({ ...app.engine.schedules.get(schedule.id), workspace: { cwd: workspace, additionalDirectories: [] } }, schedule.revision);
await app.remote.configure({ enabled: true, mode: 'external', relayURL: 'ws://127.0.0.1:4328', publicURL: 'ws://127.0.0.1:4328', relayToken: token });
await until(() => app.remote.status === 'online', 20_000);
const receive = app.remote.receive.bind(app.remote);
app.remote.receive = async (...args) => { try { return await receive(...args); } catch (error) { console.log('Synthetic protocol rejection: ' + error.message); throw error; } };
const fixture = http.createServer(async (req, res) => {
  if (req.url !== '/pair') { res.writeHead(404); res.end(); return; }
  const key = secret(); const aad = 'synthetic:cross-platform';
  const invite = await app.remote.pairing();
  res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: invite.code, key, aad, box: seal(key, { test: 'CryptoKit ↔ Node' }, aad) }));
});
await new Promise(resolve => fixture.listen(4329, '127.0.0.1', resolve));
console.log('Synthetic mobile test host ready. Relay: ' + (process.env.PROTEUS_TEST_CONTAINER === '1' ? 'Docker container' : 'Node process'));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await new Promise(resolve => fixture.close(resolve)); await app.close(); await relay.close(); fs.rmSync(home, { recursive: true, force: true }); process.exit(0); });
