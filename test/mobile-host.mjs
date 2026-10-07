// Synthetic fixture only: never run against an operator's real data directory.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { atomicJSON } from '../src/files.js';
import { secret, seal } from '../src/remote-crypto.js';
import { startServer } from '../src/server.js';
import { RehearsalProvider } from '../src/rehearsal.js';
import { startRelay } from '../relay/server.js';
import { copilotModel } from '../src/model-catalog.js';
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
const rehearsal = new RehearsalProvider();
let authConnected = false;
const syntheticQuota = remaining => async () => ({available:true,windows:[{id:"synthetic",label:"Synthetic account allowance",remainingPercent:remaining,resetAt:"2099-10-05T12:00:00Z"}]});
const app = await startServer({ home, port: 0, timers: false, providers: { copilot: {
  quota: syntheticQuota(73),
  mcpStatus: async () => ({servers:[{name:'synthetic-integration',status:authConnected?'connected':'needs-auth',remote:true}]}),
  mcpLogin: async () => { setTimeout(()=>{authConnected=true;},1200); return {server:'synthetic-integration',status:'sign-in-required'}; },
  status: async () => ({available:true,models:[copilotModel({id:"synthetic-mobile",name:"Synthetic mobile",supportedReasoningEfforts:["none","high"],capabilities:{supports:{reasoningEffort:true},limits:{max_output_tokens:128000}},billing:{tokenPrices:{maxPromptTokens:272000,longContext:{maxPromptTokens:872000}}}})]}), run: args => rehearsal.run(args) }, rehearsal: {
  async run(args) {
    args.emit('tool', 'Read synthetic notes', { tool: { callId: 'synthetic-read', name: 'view', summary: 'Read synthetic notes', status: 'completed', arguments: '{"path":"fixture.md"}', output: 'Expanded synthetic tool result', durationMs: 120 } });
    if (args.prompt.includes('Permission rehearsal')) await args.ask({ type: 'permission', question: 'Read synthetic fixture?', details: { kind: 'read', path: workspace } });
    return rehearsal.run(args);
  }
}, codex:{status:async()=>({available:false,models:[]}),quota:syntheticQuota(41)},claude:{status:async()=>({available:false,models:[]}),quota:syntheticQuota(88)} } });
const schedule = app.engine.schedules.list()[0]; app.engine.schedules.save({ ...app.engine.schedules.get(schedule.id), workspace: { cwd: workspace, additionalDirectories: [] } }, schedule.revision);
await app.remote.configure({ label: 'Build Mac', enabled: true, mode: 'external', relayURL: 'ws://127.0.0.1:4328', publicURL: 'ws://127.0.0.1:4328', relayToken: token });
await until(() => app.remote.status === 'online', 20_000);
const receive = app.remote.receive.bind(app.remote);
app.remote.receive = async (...args) => { try { return await receive(...args); } catch (error) { console.log('Synthetic protocol rejection: ' + error.message); throw error; } };
// A second independent execution host shares the relay, never the first host's state.
const secondHome = path.join(home, 'second-host'); fs.mkdirSync(secondHome);
const secondWorkspace = path.join(secondHome, 'workspace'); fs.mkdirSync(secondWorkspace);
fs.writeFileSync(path.join(secondWorkspace, 'AGENTS.md'), '# Synthetic second host only');
atomicJSON(path.join(secondHome, 'settings.json'), { schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC', workspace: { cwd: secondWorkspace, additionalDirectories: [] }, skillDirectories: [], mcpServers: {} });
const unavailable = { status: async () => ({available:false,models:[],error:'Synthetic host'}) };
const second = await startServer({home: secondHome, port: 0, timers: false, providers: {rehearsal: new RehearsalProvider(), copilot: unavailable, codex: unavailable, claude: unavailable}});
await second.remote.configure({label:'Work Mac',enabled:true,mode:'external',relayURL:'ws://127.0.0.1:4328',publicURL:'ws://127.0.0.1:4328',relayToken:token});
await until(() => second.remote.status === 'online', 20_000);
const browserVisits = new Map();
const fixture = http.createServer(async (req, res) => {
  if (['/browser/one', '/browser/two', '/browser/three'].includes(req.url)) {
    const count = (browserVisits.get(req.url) || 0) + 1; browserVisits.set(req.url, count);
    const first = req.url.endsWith('/one'); const third = req.url.endsWith('/three');
    const title = first ? 'First' : third ? 'Third' : 'Second';
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} browser page</title><h1>${title} browser page</h1><p>Load ${count}</p><a href="/browser/${first?'two':third?'two':'three'}">${third?'Previous':'Next'} browser page</a>`);return;
  }
  if (req.url === '/latest') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ context: app.engine.listRuns()[0]?.schedule.context, reasoningEffort: app.engine.listRuns()[0]?.schedule.reasoningEffort, contextTier: app.engine.listRuns()[0]?.schedule.contextTier, queuedMessages: app.engine.listRuns()[0]?.queuedMessages })); return; }
  if (!req.url.startsWith('/pair')) { res.writeHead(404); res.end(); return; }
  const target = req.url.includes('host=second') ? second : app;
  // Every native test starts with an idle synthetic runner, including after a failed test.
  for (const run of target.engine.listRuns()) if (['running', 'queued', 'awaiting_input'].includes(run.status)) target.engine.cancel(run.id);
  target.context.mutate(config => { config.favorites = []; }, target.context.config().revision);
  const defaults = target.settings.get();
  target.settings.save({...defaults,provider:req.url.includes("models=1")?"copilot":"rehearsal",model:req.url.includes("models=1")?"synthetic-mobile":"",reasoningEffort:"",contextTier:"default"},defaults.revision);
  authConnected = false;
  const key = secret(); const aad = 'synthetic:cross-platform';
  const invite = await target.remote.pairing();
  res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: invite.code, key, aad, box: seal(key, { test: 'CryptoKit ↔ Node' }, aad) }));
});
await new Promise(resolve => fixture.listen(4329, '127.0.0.1', resolve));
console.log('Synthetic mobile test host ready. Relay: ' + (process.env.PROTEUS_TEST_CONTAINER === '1' ? 'Docker container' : 'Node process'));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await new Promise(resolve => fixture.close(resolve)); await app.close(); await second.close(); await relay.close(); fs.rmSync(home, { recursive: true, force: true }); process.exit(0); });
