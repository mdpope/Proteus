import http from 'node:http';
import { contextPlan } from '../public/context-plan.js';
import { agentName } from '../public/agent-name.js';
import { UsageCache } from './usage.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { Engine } from './engine.js';
import { CopilotProvider } from './copilot.js';
import { SettingsStore } from './settings.js';
import { ContextStore } from './context.js';
import { StandupStore } from './standup.js';
import { storagePaths, exportTranscript } from './transcripts.js';
import { atomicJSON, defaultHome, readJSON, isWithin } from './files.js';
import { nextRuns, revision, validateSchedule } from './schedules.js';
import { readChatImage, readImage } from './chat-images.js';
import { RemoteHost } from './remote.js';

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
export async function startServer({ home = defaultHome(), port = 4317, providers, browser, timers = true, withSeed = true, background = false } = {}) {
  const unlock = lock(home);
  if (withSeed) seed(home);
  const settings = new SettingsStore(home, root);
  const context = new ContextStore(home, settings);
  const standup = new StandupStore(home, settings.get().timezone);
  const copilot = new CopilotProvider({}, { browser, context, settings });
  const engine = new Engine(home, providers || { copilot });
  const usage = new UsageCache(() => (providers?.copilot || copilot).quota());
  engine.prepareSchedule = schedule => {
    if (schedule.context && !schedule.contextSelection) return schedule;
    const snapshot = context.capture({ workspace: schedule.workspace, selectedIds: schedule.contextSelection?.selectedIds, agentId: schedule.contextSelection?.agentId, includeDefaults: schedule.contextSelection?.includeDefaults });
    return { ...schedule, context: snapshot, workspace: snapshot.workspace };
  };
  const permissionPreviews = new Map();
  function permissionSchedule(schedule) {
    if (schedule.context && !schedule.contextSelection) return schedule;
    const catalog = context.get();
    const key = JSON.stringify([schedule, catalog.revision, catalog.refreshedAt]);
    if (!permissionPreviews.has(key)) {
      if (permissionPreviews.size > 100) permissionPreviews.clear();
      try { permissionPreviews.set(key, engine.prepareSchedule(schedule)); }
      catch { return null; } // Invalid context must not hide the UI needed to repair it.
    }
    return permissionPreviews.get(key);
  }
  const token = randomBytes(32).toString('hex'); let origin; let remote; let providerStatus = null; const schedulerErrors = []; const eventClients = new Set();
  const notify = () => { for (const client of eventClients) client.write('event: change\ndata: {}\n\n'); };
  engine.on('change', notify);
  engine.on('scheduler-error', error => { schedulerErrors.push(error); if (schedulerErrors.length > 20) schedulerErrors.shift(); atomicJSON(path.join(home, 'scheduler-errors.json'), schedulerErrors); });
  const server = http.createServer(async (req, res) => {
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    try {
      if (req.headers.host !== new URL(origin).host) return json(403, { error: 'Invalid host.' });
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https: http:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'");
      const url = new URL(req.url, origin);
      if (url.pathname === '/' && url.searchParams.get('token') === token) {
        res.setHeader('Set-Cookie', `proteus=${token}; HttpOnly; SameSite=Strict; Path=/`);
        res.writeHead(303, { Location: '/' }); res.end(); return;
      }
      const authorized = req.headers.authorization === `Bearer ${token}` || req.headers.cookie?.split('; ').includes(`proteus=${token}`);
      if (!authorized) return json(401, { error: 'Open the app using the local launch URL.' });
      if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== origin) return json(403, { error: 'Cross-origin request rejected.' });
      if (req.method !== 'GET' && !req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Send JSON.' });
      if (url.pathname === '/api/events' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive' }); res.write(': connected\n\n');
        eventClients.add(res); req.on('close', () => eventClients.delete(res)); return;
      }
      if (url.pathname === '/api/remote' && req.method === 'GET') return json(200, remote.info());
      if (url.pathname === '/api/remote' && req.method === 'POST') {
        const value = await body(req);
        if (value.action === 'configure') return json(200, await remote.configure(value));
        if (value.action === 'pair') return json(200, await remote.pairing(value.publicURL));
        if (value.action === 'revoke') return json(200, remote.revoke(value.id));
        throw new Error('Unknown remote action.');
      }
      if (url.pathname === '/api/state') return json(200, {
        schedules: engine.schedules.list(), runs: engine.listRuns().map(run => ({ ...run, storage: storagePaths(home, run), permissionContext: engine.permissions.describe(run.schedule) })), providerStatus,
        permissions: engine.permissions.get(), permissionWorkspaces: [...new Map([
          { ...settings.get(), name: 'Default workspace', ref: { defaults: true } },
          ...engine.schedules.list().filter(schedule => !schedule.error).map(schedule => ({ ...schedule, ref: { scheduleId: schedule.id } })),
          ...engine.listRuns().map(run => ({ ...run.schedule, ref: { runId: run.id } }))
        ].map(permissionSchedule).filter(Boolean).map(schedule => { const context = engine.permissions.describe(schedule); return [context.id, { ...context, ref: schedule.ref }]; })).values()],
        home, settings: settings.get(), context: context.get(), standup: standup.get(), browserAvailable: !!browser, schedulerErrors, recoveryErrors: engine.recoveryErrors || [], version: '0.1.0',
        scheduler: { running: true, background, message: background ? 'The menu bar host keeps running when its window is closed. Quit Proteus stops execution. The Mac must be awake.' : 'Schedules run while this host process is running.' }
      });
      if (url.pathname === '/api/settings' && req.method === 'POST') {
        const value = await body(req); const old = settings.get();
        const saved = settings.save(value.settings, value.expectedRevision);
        if (JSON.stringify(old.workspace) !== JSON.stringify(saved.workspace)) {
          const config = context.config();
          context.mutate(config => Object.assign(config.workspaces.find(w => w.id === config.defaultWorkspaceId), saved.workspace), config.revision);
        }
        return json(200, saved);
      }
      if (url.pathname === '/api/context/preview' && req.method === 'POST') { const value = await body(req); return json(200, contextPlan(context.get(), value)); }
      if (url.pathname === '/api/context/refresh' && req.method === 'POST') return json(200, context.refresh());
      if (url.pathname === '/api/context' && req.method === 'POST') {
        const value = await body(req);
        if (value.action === 'favorite') { const result = context.favorite(value.id, value.enabled, value.expectedRevision); notify(); return json(200, result); }
        if (value.action === 'import') return json(200, context.importWorkspace(value.file, value.expectedRevision));
        const result = context.mutate(config => {
          if (value.action === 'mode') {
            if (!context.get().entries.some(entry => entry.id === value.id)) throw new Error('Context entry no longer exists.');
            config.modes[value.id] = value.mode;
            if (value.mode === 'universal') config.libraryFolders = [...new Set([...config.libraryFolders, ...context.get().entries.find(entry => entry.id === value.id).roots])];
          } else if (value.action === 'add-folders') {
            if (value.library) config.libraryFolders.push(...value.folders);
            else {
              const profile = config.workspaces.find(w => w.id === value.workspaceId);
              if (!profile) throw new Error('Workspace not found.');
              profile.additionalDirectories.push(...value.folders);
            }
          } else if (value.action === 'universal-folder') {
            config.universalFolders = config.universalFolders.filter(folder => folder !== value.folder);
            if (value.enabled) config.universalFolders.push(value.folder);
          } else if (value.action === 'remove-folder') {
            const profile = config.workspaces.find(w => w.id === value.workspaceId);
            if (value.library) { config.libraryFolders = config.libraryFolders.filter(root => root !== value.folder); config.universalFolders = config.universalFolders.filter(root => root !== value.folder); }
            else if (!profile || profile.cwd === value.folder) throw new Error('Choose another command folder before removing it.');
            else profile.additionalDirectories = profile.additionalDirectories.filter(root => root !== value.folder);
          } else if (value.action === 'document') config.documents.push({ path: value.file, kind: value.kind });
          else if (value.action === 'workspace') {
            if (value.create) config.workspaces.push({ id: 'workspace-' + Date.now().toString(36), name: value.name, cwd: value.cwd, additionalDirectories: [] });
            else {
              const profile = config.workspaces.find(w => w.id === value.workspaceId);
              if (!profile) throw new Error('Workspace not found.');
              Object.assign(profile, { name: value.name, cwd: value.cwd, additionalDirectories: [...new Set([profile.cwd, ...profile.additionalDirectories])].filter(root => root !== value.cwd) });
              if (value.makeDefault) config.defaultWorkspaceId = profile.id;
            }
          } else throw new Error('Unknown context action.');
        }, value.expectedRevision);
        const defaultProfile = result.workspaces.find(profile => profile.id === result.defaultWorkspaceId);
        const currentSettings = settings.get();
        settings.save({ ...currentSettings, workspace: { cwd: defaultProfile.cwd, additionalDirectories: defaultProfile.additionalDirectories } }, currentSettings.revision);
        return json(200, result);
      }
      if (url.pathname === '/api/standup' && req.method === 'POST') {
        const value = await body(req);
        return json(200, value.action === 'generate' ? standup.generate(value.expectedRevision) : standup.save(value.settings, value.expectedRevision));
      }
      if (url.pathname === '/api/run-context' && req.method === 'POST') {
        const value = await body(req); const run = engine.getRun(value.runId);
        if (['running', 'queued', 'awaiting_input'].includes(run.status)) throw new Error('Wait for this turn to finish before changing context.');
        context.refresh();
        const old = run.schedule.context;
        const snapshot = context.capture({ workspaceId: old?.workspaceId, ...(old?.followsWorkspace ? {} : { workspace: old?.baseWorkspace || run.schedule.workspace }), selectedIds: value.selectedIds ?? old?.selectedIds ?? [], agentId: value.agentId === undefined ? old?.agentId : value.agentId, includeDefaults: value.includeDefaults ?? old?.includeDefaults ?? true });
        run.initialSchedule ??= structuredClone(run.schedule);
        run.contextHistory ??= []; if (old) run.contextHistory.push(old);
        for (const event of run.events) if (event.role === 'assistant' && !event.agentName) event.agentName = agentName(run);
        run.schedule = { ...run.schedule, context: snapshot, workspace: snapshot.workspace };
        engine.event(run, 'system', 'Workspace context refreshed for the next turn. Existing conversation history is retained.');
        return json(200, { ok: true });
      }
      if (url.pathname === '/api/export' && req.method === 'POST') {
        const value = await body(req); return json(200, exportTranscript(home, engine.getRun(value.runId), value.format));
      }
      if (url.pathname === '/api/permissions' && req.method === 'POST') {
        const value = await body(req);
        if (typeof value.expectedRevision !== 'string') throw new Error('Reload permissions before saving.');
        if (value.action === 'revoke') engine.permissions.revoke(value.id, value.expectedRevision);
        else if (value.action === 'set-mode') {
          const schedule = value.runId ? engine.getRun(value.runId).schedule : value.scheduleId ? engine.prepareSchedule(engine.schedules.get(value.scheduleId)) : value.defaults === true ? engine.prepareSchedule(settings.get()) : null;
          if (!schedule) throw new Error('Choose a saved run, schedule, or default workspace.');
          if (engine.permissions.describe(schedule).id !== value.expectedContextId) throw new Error('Workspace configuration changed. Review its folders and integrations before authorizing.');
          engine.permissions.setMode(schedule, value.mode, value.expectedRevision);
        } else throw new Error('Unknown permission action.');
        engine.recheckPermissions(); return json(200, engine.permissions.get());
      }
      if (url.pathname === '/api/preview' && req.method === 'POST') { const value = await body(req); return json(200, { nextRuns: nextRuns(value.cron, value.timezone) }); }
      if (url.pathname === '/api/schedules' && req.method === 'POST') {
        const { schedule, expectedRevision } = await body(req);
        validateSchedule(schedule);
        if (schedule.contextSelection) context.capture({ workspace: schedule.workspace, selectedIds: schedule.contextSelection?.selectedIds, agentId: schedule.contextSelection?.agentId, includeDefaults: schedule.contextSelection?.includeDefaults });
        return json(200, engine.schedules.save(schedule, expectedRevision));
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
        const value = await body(req); const defaults = settings.get();
        const snapshot = context.capture({ workspaceId: value.workspaceId, workspace: value.workspace || (!value.workspaceId ? defaults.workspace : undefined), selectedIds: value.selectedIds, agentId: value.agentId, includeDefaults: value.includeDefaults });
        const schedule = validateSchedule({
          schemaVersion: 1, id: `chat-${Date.now()}-${randomBytes(4).toString('hex')}`, name: value.name || 'Workspace chat', enabled: false,
          cron: '0 9 * * 1-5', timezone: value.timezone || defaults.timezone,
          provider: value.provider || defaults.provider, model: value.model || defaults.model,
          workspace: snapshot.workspace, context: snapshot, skillDirectories: value.skillDirectories || defaults.skillDirectories,
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
      if (url.pathname === '/api/usage' && req.method === 'POST') return json(200, await usage.get((await body(req)).force === true));
      if (url.pathname === '/api/provider' && req.method === 'POST') { providerStatus = await copilot.status(); return json(200, providerStatus); }
      if (url.pathname === '/api/chat-image' && req.method === 'POST') {
        const value = await body(req);
        return json(200, readChatImage(engine.getRun(value.id), value.source));
      }
      if (url.pathname === '/api/markdown' && req.method === 'POST') {
        const { file, image } = await body(req);
        const roots = [...context.roots(), ...context.config().documents.map(doc => path.dirname(doc.path)), settings.get().workspace.cwd, ...settings.get().workspace.additionalDirectories, ...engine.schedules.list().filter(s => !s.error).flatMap(s => [s.workspace.cwd, ...s.workspace.additionalDirectories])];
        if (typeof file !== 'string' || !file.endsWith('.md') || !isWithin(file, roots)) throw new Error('Choose a Markdown file inside a configured workspace.');
        if (fs.statSync(file).size > 1_000_000) throw new Error('Markdown file is too large.');
        const content = fs.readFileSync(file, 'utf8');
        return json(200, image ? readImage({ source: image, texts: [content], cwd: path.dirname(file), roots }) : { file, content });
      }
      const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/features.js': ['features.js', 'text/javascript'], '/remote.js': ['remote.js', 'text/javascript'] };
      for (const file of ['runtime.js', 'style.css']) assets['/markdown/' + file] = ['markdown/' + file, file.endsWith('.css') ? 'text/css' : 'text/javascript'];
      for (const file of ['conversation.js', 'agent-name.js', 'usage.js', 'context-plan.js']) assets['/' + file] = [file, 'text/javascript'];
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
  const service = { engine, settings, context, standup, origin, token, home, url: `${origin}/?token=${token}`, async close() {
    if (timer) clearInterval(timer); await remote.close(); await engine.close(); await copilot.close();
    for (const client of eventClients) client.end(); eventClients.clear();
    await new Promise(resolve => server.close(resolve)); server.closeAllConnections();
    fs.rmSync(path.join(home, 'connection.json'), { force: true }); unlock();
  } };
  remote = service.remote = new RemoteHost(service); await remote.start(); return service;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = await startServer({ port: Number(process.env.PORT || 4317) });
  console.log(`Proteus: ${app.url}\nData: ${app.home}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
