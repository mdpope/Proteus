import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { Engine } from './engine.js';
import { CopilotProvider } from './copilot.js';
import { SettingsStore } from './settings.js';
import { atomicJSON, defaultHome, readJSON, isWithin } from './files.js';
import { nextRuns, revision, validateSchedule } from './schedules.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function seed(home, cwd = root) {
  const file = path.join(home, 'schedules', 'workspace-pulse.json');
  if (!fs.existsSync(file)) atomicJSON(file, {
    schemaVersion: 1, id: 'workspace-pulse', name: 'Workspace pulse', enabled: false,
    cron: '0 9 * * 1-5', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    provider: 'rehearsal', model: '', workspace: { cwd, additionalDirectories: [] }, misfire: 'skip',
    prompt: 'Rehearse a scheduled workspace check and ask for feedback before the next checkpoint.'
  });
}
function lock(home) {
  fs.mkdirSync(home, { recursive: true, mode: 0o700 }); const file = path.join(home, 'runner.lock');
  try { fs.writeFileSync(file, String(process.pid), { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(fs.readFileSync(file, 'utf8'));
    if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Invalid runner lock. Inspect it before restarting.');
    try { process.kill(pid, 0); throw new Error(`A runner already owns this data directory (PID ${pid}).`); }
    catch (probe) { if (probe.code !== 'ESRCH') throw probe; }
    fs.unlinkSync(file); fs.writeFileSync(file, String(process.pid), { flag: 'wx', mode: 0o600 });
  }
  return () => { if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === String(process.pid)) fs.unlinkSync(file); };
}
async function body(req) {
  let text = ''; for await (const chunk of req) { text += chunk; if (text.length > 2_000_000) throw new Error('Request too large.'); }
  return text ? JSON.parse(text) : {};
}
export async function startServer({ home = defaultHome(), port = 4317, providers, browser, timers = true, withSeed = true } = {}) {
  const unlock = lock(home);
  if (withSeed) seed(home);
  const settings = new SettingsStore(home, root);
  const copilot = new CopilotProvider({}, { browser });
  const engine = new Engine(home, providers || { copilot });
  const token = randomBytes(32).toString('hex'); let origin; let providerStatus = null; const schedulerErrors = [];
  engine.on('scheduler-error', error => { schedulerErrors.push(error); if (schedulerErrors.length > 20) schedulerErrors.shift(); atomicJSON(path.join(home, 'scheduler-errors.json'), schedulerErrors); });
  const server = http.createServer(async (req, res) => {
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    try {
      if (req.headers.host !== new URL(origin).host) return json(403, { error: 'Invalid host.' });
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'");
      const url = new URL(req.url, origin);
      if (url.pathname === '/' && url.searchParams.get('token') === token) {
        res.setHeader('Set-Cookie', `proteus=${token}; HttpOnly; SameSite=Strict; Path=/`);
        res.writeHead(303, { Location: '/' }); res.end(); return;
      }
      const authorized = req.headers.authorization === `Bearer ${token}` || req.headers.cookie?.split('; ').includes(`proteus=${token}`);
      if (!authorized) return json(401, { error: 'Open the app using the local launch URL.' });
      if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== origin) return json(403, { error: 'Cross-origin request rejected.' });
      if (req.method !== 'GET' && !req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Send JSON.' });
      if (url.pathname === '/api/state') return json(200, {
        schedules: engine.schedules.list(), runs: engine.listRuns().map(run => ({ ...run, permissionContext: engine.permissions.describe(run.schedule) })), providerStatus,
        permissions: engine.permissions.get(), permissionWorkspaces: [...new Map([
          { ...settings.get(), name: 'Default workspace', ref: { defaults: true } },
          ...engine.schedules.list().filter(schedule => !schedule.error).map(schedule => ({ ...schedule, ref: { scheduleId: schedule.id } })),
          ...engine.listRuns().map(run => ({ ...run.schedule, ref: { runId: run.id } }))
        ].map(schedule => { const context = engine.permissions.describe(schedule); return [context.id, { ...context, ref: schedule.ref }]; })).values()],
        home, settings: settings.get(), browserAvailable: !!browser, schedulerErrors, recoveryErrors: engine.recoveryErrors || [], version: '0.1.0',
        scheduler: { running: true, background: false, message: 'Schedules run while this prototype is open. Missed runs follow each schedule’s policy.' }
      });
      if (url.pathname === '/api/settings' && req.method === 'POST') { const value = await body(req); return json(200, settings.save(value.settings, value.expectedRevision)); }
      if (url.pathname === '/api/permissions' && req.method === 'POST') {
        const value = await body(req);
        if (typeof value.expectedRevision !== 'string') throw new Error('Reload permissions before saving.');
        if (value.action === 'revoke') engine.permissions.revoke(value.id, value.expectedRevision);
        else if (value.action === 'set-mode') {
          const schedule = value.runId ? engine.getRun(value.runId).schedule : value.scheduleId ? engine.schedules.get(value.scheduleId) : value.defaults === true ? settings.get() : null;
          if (!schedule) throw new Error('Choose a saved run, schedule, or default workspace.');
          if (engine.permissions.describe(schedule).id !== value.expectedContextId) throw new Error('Workspace configuration changed. Review its folders and integrations before authorizing.');
          engine.permissions.setMode(schedule, value.mode, value.expectedRevision);
        } else throw new Error('Unknown permission action.');
        engine.recheckPermissions(); return json(200, engine.permissions.get());
      }
      if (url.pathname === '/api/preview' && req.method === 'POST') { const value = await body(req); return json(200, { nextRuns: nextRuns(value.cron, value.timezone) }); }
      if (url.pathname === '/api/schedules' && req.method === 'POST') {
        const { schedule, expectedRevision } = await body(req); return json(200, engine.schedules.save(schedule, expectedRevision));
      }
      if (url.pathname === '/api/import' && req.method === 'POST') {
        const { schedules } = await body(req); if (!Array.isArray(schedules)) throw new Error('Expected an array of schedules.');
        const existing = new Set(engine.schedules.list().map(s => s.id)); const seen = new Set();
        for (const schedule of schedules) {
          validateSchedule(schedule); if (existing.has(schedule.id) || seen.has(schedule.id)) throw new Error(`Schedule already exists: ${schedule.id}`); seen.add(schedule.id);
        }
        for (const schedule of schedules) engine.schedules.save({ ...schedule, enabled: false });
        return json(200, { imported: schedules.length, enabled: false });
      }
      if (url.pathname === '/api/run' && req.method === 'POST') { const { id } = await body(req); return json(200, engine.createRun(engine.schedules.get(id))); }
      if (url.pathname === '/api/chat' && req.method === 'POST') {
        const value = await body(req); const defaults = settings.get(); const schedule = validateSchedule({
          schemaVersion: 1, id: `chat-${Date.now()}`, name: value.name || 'Workspace chat', enabled: false,
          cron: '0 9 * * 1-5', timezone: value.timezone || defaults.timezone,
          provider: value.provider || defaults.provider, model: value.model || defaults.model,
          workspace: value.workspace || defaults.workspace, skillDirectories: value.skillDirectories || defaults.skillDirectories,
          mcpServers: value.mcpServers || defaults.mcpServers, editorContext: value.editorContext, misfire: 'skip', prompt: value.prompt
        });
        return json(200, engine.createRun(schedule, 'chat'));
      }
      const match = url.pathname.match(/^\/api\/runs\/([a-f0-9-]+)\/(reply|resume|cancel)$/);
      if (match && req.method === 'POST') {
        const value = await body(req); const [, id, action] = match;
        if (action === 'reply') return json(200, engine.reply(id, value.answer, value.requestId));
        if (action === 'resume') return json(200, engine.resume(id, value.prompt));
        engine.cancel(id); return json(200, { ok: true });
      }
      if (url.pathname === '/api/provider' && req.method === 'POST') { providerStatus = await copilot.status(); return json(200, providerStatus); }
      if (url.pathname === '/api/markdown' && req.method === 'POST') {
        const { file } = await body(req);
        const roots = [settings.get().workspace.cwd, ...settings.get().workspace.additionalDirectories, ...engine.schedules.list().filter(s => !s.error).flatMap(s => [s.workspace.cwd, ...s.workspace.additionalDirectories])];
        if (typeof file !== 'string' || !file.endsWith('.md') || !isWithin(file, roots)) throw new Error('Choose a Markdown file inside a configured workspace.');
        if (fs.statSync(file).size > 1_000_000) throw new Error('Markdown file is too large.');
        return json(200, { file, content: fs.readFileSync(file, 'utf8') });
      }
      const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
      if (req.method === 'GET' && assets[url.pathname]) {
        const [file, type] = assets[url.pathname]; res.writeHead(200, { 'Content-Type': type }); res.end(fs.readFileSync(path.join(root, 'public', file))); return;
      }
      json(404, { error: 'Not found.' });
    } catch (error) { json(400, { error: error.message }); }
  });
  try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); }); }
  catch (error) { unlock(); throw error; }
  origin = `http://127.0.0.1:${server.address().port}`;
  atomicJSON(path.join(home, 'connection.json'), { origin, token, pid: process.pid });
  const timer = timers ? setInterval(() => { try { engine.tick(); } catch (error) { engine.emit('scheduler-error', { error: error.message, at: new Date().toISOString() }); } }, 1000) : null;
  return { engine, settings, origin, token, home, url: `${origin}/?token=${token}`, async close() {
    if (timer) clearInterval(timer); await engine.close(); await copilot.close();
    await new Promise(resolve => server.close(resolve)); server.closeAllConnections();
    fs.rmSync(path.join(home, 'connection.json'), { force: true }); unlock();
  } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = await startServer({ port: Number(process.env.PORT || 4317) });
  console.log(`Proteus: ${app.url}\nData: ${app.home}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
