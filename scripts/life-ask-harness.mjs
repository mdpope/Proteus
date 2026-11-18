// Disposable Life Ask owner for cross-language client qualification (docs/life-ask.md).
// Starts a throwaway relay and Proteus owner in a private temporary home with a synthetic Life
// account binding, then writes a scoped `life-ask` pairing link to a private local file.
// Never connects to the real relay, Life account or application data. Ctrl-C deletes everything.
//
//   node scripts/life-ask-harness.mjs [--port 8790] [--link-file <path>] [--account <64 hex>]
//
// Output (stdout, one JSON line): {relay, hostID, accountID, linkFile, home}. The pairing link
// (containing the disposable invitation key) is written only to linkFile (mode 0600). Send
// SIGUSR2 to issue a fresh invitation; scoped receipts appear in <home>/life-ask/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../src/server.js';
import { startRelay } from '../relay/server.js';
import { secret } from '../src/services/remote/remote-crypto.js';

const argument = (name, fallback) => { const index = process.argv.indexOf(name); return index > 0 ? process.argv[index + 1] : fallback; };
const port = Number(argument('--port', 0));
const accountID = argument('--account', 'a'.repeat(64));
if (!/^[0-9a-f]{64}$/.test(accountID)) throw new Error('--account must be 64 lowercase hex characters.');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-life-ask-harness-'));
fs.chmodSync(home, 0o700);
const linkFile = path.resolve(argument('--link-file', path.join(home, 'pairing-link.txt')));
const token = secret();
const relay = await startRelay({ port, token });
const app = await startServer({ home: path.join(home, 'owner'), port: 0, timers: false, providers: {} });
const relayURL = 'ws://127.0.0.1:' + relay.port;
await app.remote.configure({ enabled: true, mode: 'external', relayURL, publicURL: relayURL, relayToken: token });
for (let attempt = 0; app.remote.status !== 'online'; attempt++) { if (attempt > 400) throw new Error('Disposable relay did not come online.'); await new Promise(resolve => setTimeout(resolve, 25)); }
const asks = app.remote.service.lifeAsk;
asks.identity = () => ({ accountId: accountID });
asks.enabled = () => true;
const issue = async () => { const invite = await app.remote.pairing(undefined, { purpose: 'life-ask' }); fs.writeFileSync(linkFile, invite.code + '\n', { mode: 0o600 }); return invite.expiresAt; };
const expiresAt = await issue();
console.log(JSON.stringify({ synthetic: true, relay: relayURL, hostID: app.remote.identity().hostId, accountID, linkFile, expiresAt, home }));
process.on('SIGUSR2', () => { issue().then(at => console.log(JSON.stringify({ reissued: true, expiresAt: at }))).catch(error => console.error(error.message)); });
const stop = async () => { try { await app.close(); await relay.close(); } finally { fs.rmSync(home, { recursive: true, force: true }); if (!linkFile.startsWith(home)) fs.rmSync(linkFile, { force: true }); process.exit(0); } };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
