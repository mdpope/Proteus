// Start the same relay image used by Linux, and connect the running Mac host to it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultHome, readJSON } from '../src/files.js';
import { secret } from '../src/remote-crypto.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = defaultHome(); const connection = readJSON(path.join(home, 'connection.json'));
if (new URL(connection.origin).hostname !== '127.0.0.1') throw new Error('Expected the local Proteus host.');
const api = async value => { const response = await fetch(connection.origin + '/api/remote', { method: 'POST', headers: { Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(value) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); return result; };
const current = readJSON(path.join(home, 'remote.json'), {});
const token = current.relayToken || secret(); const envFile = path.join(home, 'relay.env'); fs.writeFileSync(envFile, `PROTEUS_RELAY_TOKEN=${token}\n`, { mode: 0o600 }); fs.chmodSync(envFile, 0o600);
const address = process.env.PROTEUS_RELAY_ADDRESS || Object.entries(os.networkInterfaces()).filter(([name]) => !name.startsWith('utun')).flatMap(([, interfaces]) => interfaces).find(i => i.family === 'IPv4' && !i.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.address))?.address;
if (!address) throw new Error('Connect to a local network or set PROTEUS_RELAY_ADDRESS.');
if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)[\d.]+$/.test(address)) throw new Error('Choose a private local IPv4 address.');
const prefix = process.env.PROTEUS_DOCKER_CONTEXT ? ['--context', process.env.PROTEUS_DOCKER_CONTEXT] : [];
const docker = args => execFileSync('docker', [...prefix, ...args], { stdio: 'pipe' }).toString().trim();
docker(['info', '--format', '{{.ServerVersion}}']);
let existing;
try { existing = JSON.parse(docker(['inspect', 'proteus-relay']))[0]; } catch { /* No prior container. */ }
if (existing && existing.Config.Labels?.['org.proteusapp.proteus.relay'] !== 'true') throw new Error('An unrelated container named proteus-relay already exists.');
console.log('Building the relay image…'); docker(['build', '-t', 'proteus-relay:local', path.join(root, 'relay')]);
await api({ action: 'configure', enabled: false });
if (existing) docker(['rm', '-f', 'proteus-relay']);
docker(['run', '--detach', '--name', 'proteus-relay', '--label', 'org.proteusapp.proteus.relay=true', '--restart', 'unless-stopped', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--env-file', envFile, '-p', '0.0.0.0:4318:4318', 'proteus-relay:local']);
const relayURL = `ws://${address}:4318`;
let reachable = false;
for (let attempt = 0; attempt < 20; attempt++) {
  try { const response = await fetch(`http://${address}:4318/health`, { signal: AbortSignal.timeout(1000) }); if (response.ok) { reachable = true; break; } } catch { /* VM port forwarding may take a moment. */ }
  await new Promise(resolve => setTimeout(resolve, 500));
}
if (!reachable) throw new Error('Relay container started but its Mac LAN address is unreachable. Check VM port forwarding and the Mac firewall.');
await api({ action: 'configure', enabled: true, mode: 'external', relayURL: 'ws://127.0.0.1:4318', publicURL: relayURL, relayToken: token });
console.log(`Relay started at ${relayURL}. Open Remote Access in Proteus to pair your iPhone/iPad.`);
