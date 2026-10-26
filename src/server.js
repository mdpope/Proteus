import {publicAssets} from './shared/public-assets.js';
import {MtplxProvider} from './providers/mtplx.js';
import {replyWithAttachments,questionAttachmentMediaTypes} from './services/chats/question-attachments.js';
import {readMarkdownFile} from './shared/file-metadata.js';
import {ensurePrivateHome} from './shared/private-paths.cjs';
import {DesktopControl} from './services/remote/desktop-control.js';
import { DesktopPreview, desktopPreviewCodexHome } from './desktop-preview.js';
import { WorkspaceProjects } from './services/workspaces/workspace-projects.js';
import { hostPlatformMetadata } from './shared/host-platform.js';
import {TabManagement} from './services/workspaces/tab-management.js';
import {ChatControl} from './services/chats/chat-control.js';
import { PerformanceDiagnostics } from './services/telemetry/performance-diagnostics.js';
import {BrowserHistory,browserHistorySettings} from './services/browser/browser-history.js';
import {BrowserProfiles} from './services/browser/browser-profiles.js';
import { SessionProvider } from './providers/session-provider.js';
import { IntegrationHealth } from './services/integrations/integrations.js';
import { ActivityStore } from './services/telemetry/activity.js';
import { AppAccount } from './services/remote/app-account.js';
import { ModelCatalog, chatModelOptions, validateModelOptions } from './models/model-catalog.js';
import http from 'node:http';
import { contextPlan } from '../public/features/workspaces/context-plan.js';
import {chatMembership} from '../public/features/chats/chat-membership.js';
import { agentName } from '../public/features/chats/agent-name.js';
import { ProviderUsageCache } from './services/telemetry/usage.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { Engine } from './engine.js';
import { CopilotProvider } from './providers/copilot.js';
import { CodexProvider } from './providers/codex.js';
import { ClaudeProvider } from './providers/claude.js';
import { OmiIntegration, isOmiSchedule } from './services/tools/omi.js';
import { LifeStore } from './services/life/life.js';
import { WorkspaceFiles } from './services/workspaces/workspace-files.js';
import { SettingsStore } from './services/settings/settings.js';
import { ContextStore } from './services/workspaces/context.js';
import { StandupStore } from './services/tools/standup.js';
import { storagePaths, exportTranscript } from './services/tools/transcripts.js';
import { atomicJSON, defaultHome, readJSON, isWithin } from './shared/files.js';
import { nextRuns, revision, validateSchedule } from './services/scheduling/schedules.js';
import { readChatImage, readImage } from './services/chats/chat-images.js';
import { chatDelta } from './services/chats/chat-deltas.js';
import { RemoteHost, remoteRun, runSummary, chatActivityAt } from './services/remote/remote.js';
import { ContentTabs } from './services/workspaces/content-tabs.js';
import { ProjectFollow } from './services/workspaces/project-follow.js';
import { fileStamp } from './shared/file-stamp.js';
import { ChatAttachmentStore, chatAttachmentLimits } from './services/chats/chat-attachments.js';
import { ProviderAuthManager } from './providers/provider-auth.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets=publicAssets(path.join(root,'public'));
assets['/remote.js']=['services/remote/remote.js','text/javascript'];
assets['/features.js']=['shared/ui/features.js','text/javascript'];
assets['/terminal/ghostty-vt.wasm']=['terminal/ghostty-vt.wasm','application/wasm'];
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
  if(process.platform==='win32')ensurePrivateHome(home);else fs.mkdirSync(home, { recursive: true, mode: 0o700 }); const file = path.join(home, 'runner.lock');
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
async function body(req, maxBytes = 2_000_000) {
  let bytes = 0; const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length; if (bytes > maxBytes) throw new Error('Request too large.');
    chunks.push(chunk);
  }
  return bytes ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

export async function startServer({ home = defaultHome(), port = 4317, providers, browser, openExternal, timers = true, withSeed = true, background = false, lifeOptions = {}, desktopPreview = false, updateRecovery=false } = {}) {
  const previewCodexHome = desktopPreview ? desktopPreviewCodexHome(home, desktopPreview.codexHome) : null;
  const unlock = lock(home);
  if (withSeed && !desktopPreview) seed(home);
  const settings = new SettingsStore(home, root);
  const context = new ContextStore(home, settings, {skipRefresh:true});
  const preview = desktopPreview ? new DesktopPreview(home, context) : new WorkspaceProjects(home, context);
  await context.refreshAsync();
  context.deferRefresh = true;
  const standup = new StandupStore(home, settings.get().timezone);
  const copilot = new SessionProvider(() => new CopilotProvider({}, { browser, context, settings }));
  const codex = new SessionProvider(() => new CodexProvider(desktopPreview ? { permissionControls:true, desktopPreview:true, env: {...process.env,CODEX_HOME:previewCodexHome} } : {permissionControls:true}, { browser, context }));
  if (desktopPreview) codex.options = codex.metadata.options;
  const claude = new SessionProvider(() => new ClaudeProvider({}, { browser, context }));
  const omi = new OmiIntegration(home);
  const life = new LifeStore(home, {...lifeOptions, openExternal:lifeOptions.openExternal||openExternal, onChange: () => queueMicrotask(() => notify())});
  const account = new AppAccount(life);
  const browserProfiles=new BrowserProfiles(home,account);
  const activity = new ActivityStore(home, { identity: () => life.api.identity(), publish: (item, identity, kind='notifications') => account.request({ path:'/'+kind, method:'POST', body:item, identity }) });
  const workspaceFiles = new WorkspaceFiles(() => context.config());
  const attachments = new ChatAttachmentStore(home);
  const adapters = { ...(providers || (desktopPreview ? { codex, mtplx:new SessionProvider(()=>new MtplxProvider({}, {context,browser})) } : { copilot, codex, claude })), ...(!desktopPreview ? {'local-process': omi.provider()} : {}) };
  const engine = new Engine(home, adapters, undefined, {permissionControls:true,recoveryBarrier:updateRecovery});
  const desktopControl=desktopPreview?null:new DesktopControl({active:owner=>owner==='operator'||['running','awaiting_input'].includes(engine.getRun(owner)?.status)});
  if(browser)browser.desktopControl=desktopControl;
  const performanceDiagnostics = new PerformanceDiagnostics({home});
  engine.performanceDiagnostics = performanceDiagnostics;
  activity.performanceDiagnostics=performanceDiagnostics;attachments.performanceDiagnostics=performanceDiagnostics;
  for(const adapter of Object.values(adapters))adapter.questionInputs=(id,requestId)=>engine.readQuestionAttachments(id,requestId);
  for (const [target, method, phase] of [[engine.schedules,'list','scheduler.list'],[context,'get','context.get'],[engine,'persist','run.persist']]) {
    const original = target[method];
    target[method] = function (...args) { return performanceDiagnostics.measureSync(phase, () => original.apply(this,args)); };
  }
  engine.permissions.migrateWorkspaces(context.config());
  context.permissionStore = engine.permissions;
  const workspacePermissionDefaults = (id,config) => {
    const scope=id?context.executionScope(id,config):settings.get().workspace;
    return {...scope.approvals,workingRoots:[scope.cwd,...(scope.additionalDirectories||[])]};
  };
  engine.permissions.workspaceDefaults = workspacePermissionDefaults;
  const integrations=new IntegrationHealth(home,{engine,context,onChange:()=>{notify();remote?.changed();}});
  for(const adapter of Object.values(adapters)){adapter.integrations=integrations;adapter.onIdle=()=>queueMicrotask(()=>engine.drain());}
  engine.on('change',run=>{try{integrations.capture(run);}catch(error){activity.log('warning','integrations.storage','Connection health could not be saved.',{error});}});
  const providerAuth = new ProviderAuthManager({adapters,settings,activeTurn:providerId=>[...engine.running.values(),...engine.backgroundRuns.values()].filter(Boolean).some(slot=>engine.getRun(slot.id).schedule.provider===providerId),onTerminal:()=>queueMicrotask(()=>engine.drain())});
  engine.providerAuthHold=providerId=>providerAuth.isActive(providerId)||(!adapters[providerId]?.sessions&&integrations.pending.has(providerId));
  const usage = new ProviderUsageCache(Object.fromEntries(Object.entries(adapters).filter(([id]) => ['copilot', 'codex', 'claude'].includes(id))));
  usage.setActive(false);
  const allowanceRunStatus=new Map();
  engine.on('change',run=>{
    if(!run?.id)return;
    if(run.deleted){allowanceRunStatus.delete(run.id);usage.setActive(engine.listRuns().some(item=>['queued','running'].includes(item.status)));return;}
    const prior=allowanceRunStatus.get(run.id);
    allowanceRunStatus.set(run.id,run.status);
    usage.setActive(engine.listRuns().some(item=>['queued','running'].includes(item.status)));
    if(prior&&prior!==run.status&&['completed','failed','cancelled','interrupted'].includes(run.status))usage.invalidate(run.schedule.provider);
  });
  engine.beforeRun = schedule => omi.assertRunnable(schedule);
  engine.beforeTurn = run => {
    preview?.assertAvailable(run.schedule.context);
    const old = run.schedule.context;
    if (!old?.workspaceId || !old.followsWorkspace || !old.configurationRevision) return;
    const profile = context.executionScope(old.workspaceId);
    if(profile.deletedAt){run.schedule.context={...old,followsWorkspace:false};return;}
    if (old.configurationRevision === revision(profile)) return;
    const options = { workspaceId:old.workspaceId };
    for (const key of ['selectedIds','agentId','includeDefaults']) if (old.defaultOverrides?.[key] !== false) options[key] = old[key];
    const snapshot = context.capture(options);
    run.initialSchedule ??= structuredClone(run.schedule); run.contextHistory ??= []; run.contextHistory.push(old);
    run.schedule = {...run.schedule,context:snapshot,workspace:snapshot.workspace};
    engine.event(run,'system','Workspace configuration refreshed for this turn. Earlier conversation and configuration history were retained.');
    for (const warning of snapshot.warnings || []) engine.event(run, 'system', warning.message, { contextWarning: warning });
  };
  engine.executionLane = schedule => schedule.provider === 'local-process' && ['audio', 'library', 'semantic'].includes(schedule.integration?.job) ? `omi:${schedule.integration.job}` : null;
  engine.prepareSchedule = schedule => {
    omi.assertEnabled(schedule);
    if (schedule.provider === 'local-process') return schedule;
    if (schedule.context && !schedule.contextSelection) return schedule;
    const snapshot = context.capture({ workspace: schedule.workspace, selectedIds: schedule.contextSelection?.selectedIds, agentId: schedule.contextSelection?.agentId, includeDefaults: schedule.contextSelection?.includeDefaults });
    return { ...schedule, context: snapshot, workspace: snapshot.workspace };
  };
  const catalogs = Object.fromEntries(Object.entries(adapters).filter(([id, adapter]) => id !== 'local-process' && adapter.status).map(([id, adapter]) => [id, new ModelCatalog(() => adapter.status())]));
  const catalog = (desktopPreview ? catalogs.codex : catalogs.copilot) || new ModelCatalog(() => desktopPreview ? codex.status() : copilot.status());
  const providerStatuses = () => Object.fromEntries(Object.entries(catalogs).map(([id, catalog]) => [id, catalog.value]));
  const permissionPreviews = new Map();
  function permissionSchedule(schedule, catalog) {
    // A saved run's permissions belong to its captured context, even when its
    // originating schedule retained selections for future executions. Recapturing
    // here both mislabels that context and churns the preview cache on every poll.
    if (schedule.context && (schedule.ref?.runId || !schedule.contextSelection)) return schedule;
    catalog ??= context.get();
    const key = JSON.stringify([schedule, catalog.revision, catalog.refreshedAt]);
    if (!permissionPreviews.has(key)) {
      if (permissionPreviews.size > 100) permissionPreviews.clear();
      try { permissionPreviews.set(key, engine.prepareSchedule(schedule)); }
      catch { return null; } // Invalid context must not hide the UI needed to repair it.
    }
    return permissionPreviews.get(key);
  }
  async function buildChatSchedule(value){
    const defaults=settings.get();
    const updateCoordinator=value.purpose==='update';
    if(updateCoordinator&&value.chatType==='internet')throw Error('Update coordinators require an ordinary unassigned chat.');
    if(updateCoordinator){
      const {updateCoordinatorConfiguration,updateCoordinatorPrompt}=await import('./services/updates/update-coordinator.js');
      value={...value,...await updateCoordinatorConfiguration(defaults,catalogs,value),workspaceId:null,projectId:null,includeDefaults:false,selectedIds:[],agentId:null,skillDirectories:[],mcpServers:{},workspace:defaults.workspace,prompt:updateCoordinatorPrompt(value.prompt||'Check and install the explicitly requested release after required validation.')};
    }
    if(value.workspaceId){ const profile = context.scope(value.workspaceId); value = {...profile.defaults,...value}; }
    if(value.chatType==='internet'){
      const provider=value.provider,configured=defaults.internetSearches?.[provider];
      if(!configured?.model)throw new Error('Configure Internet Searches for this provider in Engine Room first.');
      const catalog=await catalogs[provider]?.get(),model=catalog?.models?.find(m=>m.id===configured.model);
      if(!model||catalog.stale||catalog.error)throw new Error('Internet Search defaults are unavailable. Refresh the provider in Engine Room.');
      validateModelOptions(configured,model);
      value={chatType:'internet',provider,...configured,workspaceId:value.workspaceId||context.get().defaultWorkspaceId,prompt:value.prompt,includeDefaults:true,selectedIds:[],skillDirectories:[],mcpServers:{}};
    }
    const snapshot=context.capture({workspaceId:value.workspaceId,workspace:value.workspace||(!value.workspaceId?defaults.workspace:undefined),selectedIds:value.selectedIds,agentId:value.agentId,includeDefaults:value.includeDefaults});
    if(updateCoordinator)Object.assign(snapshot,{workspaceId:null,workspaceName:null,workspace:structuredClone(defaults.workspace),baseWorkspace:structuredClone(defaults.workspace),includeDefaults:false,selectedIds:[],agentId:null,entries:[]});
    const chatTitle=typeof value.name==='string'?value.name.trim():'';
    return validateSchedule({schemaVersion:1,id:`chat-${Date.now()}-${randomBytes(4).toString('hex')}`,name:chatTitle||'Workspace chat',chatType:value.chatType==='internet'?'internet':'user',chatTitleManual:!!chatTitle,...(updateCoordinator?{purpose:'update'}:{}),enabled:false,cron:'0 9 * * 1-5',timezone:value.timezone||defaults.timezone,provider:value.provider||defaults.provider,model:value.model||defaults.model,reasoningMode:value.reasoningMode,reasoningEffort:value.reasoningEffort??((value.model||defaults.model)===defaults.model&&(value.provider||defaults.provider)===defaults.provider?defaults.reasoningEffort:undefined),contextTier:value.contextTier??((value.model||defaults.model)===defaults.model&&(value.provider||defaults.provider)===defaults.provider?defaults.contextTier:undefined),serviceTier:value.serviceTier??((value.model||defaults.model)===defaults.model&&(value.provider||defaults.provider)===defaults.provider?defaults.serviceTier:undefined),workspace:snapshot.workspace,context:snapshot,skillDirectories:value.skillDirectories||defaults.skillDirectories,mcpServers:value.mcpServers||defaults.mcpServers,editorContext:value.editorContext,misfire:'skip',prompt:value.prompt});
  }
  const token = randomBytes(32).toString('hex'); let origin; let remote; const schedulerErrors = []; const eventClients = new Set();
  const notify = () => { for (const client of eventClients) client.write('event: change\ndata: {}\n\n'); };
  engine.on('change', notify);
  engine.on('scheduler-error', error => { schedulerErrors.push(error); if (schedulerErrors.length > 20) schedulerErrors.shift(); try { atomicJSON(path.join(home, 'scheduler-errors.json'), schedulerErrors); } catch (failure) { schedulerErrors.at(-1).persistenceError = failure.code || 'IO_ERROR'; } });
  const server = http.createServer(async (req, res) => {
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(performanceDiagnostics.measureSync('http.serialize', () => JSON.stringify(value))); };
    try {
      if (req.headers.host !== new URL(origin).host) return json(403, { error: 'Invalid host.' });
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data: blob: https: http:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'");
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
      if (url.pathname === '/api/project-follow' && req.method === 'POST') return json(200, service.projectFollow.handle(await body(req)));
      // Local authenticated diagnostics expose counters only, never command payloads or keys.
      if (url.pathname === '/api/performance/diagnostics' && req.method === 'GET') return json(200, { ...performanceDiagnostics.snapshot(), scheduler: engine.schedulerWorker?.diagnostics() || {status:'not-started'} });
      if (url.pathname === '/api/remote/diagnostics' && req.method === 'GET') return json(200, await remote.commandDiagnostics());
      if (url.pathname === '/api/remote' && req.method === 'POST') {
        const value = await body(req);
        if (value.action === 'configure') return json(200, await remote.configure(value));
        if (value.action === 'pair') return json(200, await remote.pairing(value.publicURL));
        if (value.action === 'device-status') return json(200, remote.deviceStatus(value.id));
        if (value.action === 'revoke') return json(200, remote.revoke(value.id));
        if (value.action === 'resource-access') return json(200, remote.setResourceAccess(value.id, value.enabled));
        if (value.action === 'browser-access') return json(200, remote.setBrowserAccess(value.id, value.enabled));
        if (value.action === 'document-access') return json(200, remote.setDocumentAccess(value.id, value.enabled));
        if (value.action === 'document-review') return json(200, remote.reviewDocument(value.requestId,value.approved));
        throw new Error('Unknown remote action.');
      }
      if (url.pathname === '/api/content-tabs' && req.method === 'POST') { const value=await body(req); if(value.scope==='project'){const snapshot=preview.snapshot();preview.projectFor({projectId:value.id},snapshot);for(const op of value.operations||[])if(op.action==='open'&&op.tab?.type==='chat'&&preview.membership(engine.getRun(op.tab.chatId),snapshot.catalog).projectId!==value.id)throw new Error('This chat belongs to another project.');} if(value.scope==='chat')engine.getRun(value.id);if(value.scope==='workspace'){context.scope(value.id);for(const op of value.operations||[])if(op.action==='open'&&op.tab?.type==='chat'&&chatMembership(engine.getRun(op.tab.chatId)).workspaceId!==value.id)throw new Error('This chat belongs to another workspace.');} if(value.action==='document'){if(!service.contentTabDocument)throw new Error('Document is not available on this desktop.');return json(200,service.contentTabDocument(value));} if(value.action==='get')return json(200,await service.contentTabs.getAsync(value.scope,value.id,{historyLimit:value.historyLimit})); if(value.action==='history')return json(200,await service.contentTabs.history(value)); if(value.action==='mutate')return json(200,await service.mutateContentTabs(value)); throw new Error('Unknown tab action.'); }
      if (url.pathname === '/api/app' && req.method === 'GET') {const result=await account.request();if(Array.isArray(result.history))void service.browserHistory.importAccount(account,{items:result.history,identity:result.identity}).catch(error=>activity.log('warning','browser.history-import',error.message));return json(200,result);}
      if (url.pathname === '/api/app' && req.method === 'POST') return json(200, await account.request(await body(req)));
      if (url.pathname === '/api/team/lists' && req.method === 'GET') return json(200, await account.lists());
      if (url.pathname === '/api/team/lists' && req.method === 'POST') return json(200, await account.team(await body(req)));
      if(url.pathname==='/api/browser-history'){const value=req.method==='GET'?{action:'query',...Object.fromEntries(url.searchParams)}:await body(req);const action=value.action||'query';if(!['query','record','delete','settings','sync','status'].includes(action))throw new Error('Unknown browser history action.');return json(200,action==='sync'?await service.peers?.syncHistory()||{synced:false}:action==='settings'?await browserHistorySettings(service,value):await service.browserHistory[action](value));}
      if(url.pathname==='/api/updates/recovery'&&req.method==='POST'){if(!service.updates)throw Error('Supervised desktop updates are unavailable.');return json(200,await service.updates.recovery(await body(req)));}
      if(url.pathname==='/api/updates'){if(!service.updates)return json(200,{identity:{packaged:false,capabilities:{prepare:false}},job:null});return json(200,await service.updates.handle(req.method==='GET'?{action:'status'}:await body(req)));}
      if(url.pathname==='/api/desktop-control'){if(!desktopControl)throw Error('Native desktop control is unavailable in this isolated preview.');return json(200,await desktopControl.handle(req.method==='GET'?{action:'status'}:await body(req)));}
      if(url.pathname==='/api/browser-profiles'){const result=await browserProfiles.handle(req.method==='GET'?{action:'list'}:await body(req));notify();return json(200,result);}
      if(url.pathname==='/api/attention'&&req.method==='GET')return json(200,{items:service.desktopAttention()});
      if (url.pathname === '/api/notifications' && req.method === 'GET') return json(200, activity.notifications());
      if (url.pathname === '/api/notifications' && req.method === 'POST') { const value=await body(req); if(value.action==='read'){const result=activity.read(value.id);notify();remote.changed();return json(200,result);}if(value.action==='preferences')return json(200,activity.preferences(value.preferences));throw new Error('Unknown notification action.'); }
      if (url.pathname === '/api/logs' && req.method === 'GET') return json(200, url.searchParams.has('id') ? await activity.logDetail(url.searchParams.get('id')) : await activity.logs(Object.fromEntries(url.searchParams)));
      if (url.pathname === '/api/logs' && req.method === 'POST') {const v=await body(req,256000);return json(200,activity.log(v.level,v.event,v.message,{details:v.details}));}
      if (url.pathname === '/api/home' && req.method === 'GET') {
        const root=new URL('../',import.meta.url);
        const read=name=>fs.readFileSync(new URL(name,root),'utf8').slice(0,200_000);
        const metadata=JSON.parse(read('package.json'));
        const supervised=service.updates?.identity().capabilities.prepare===true;
        return json(200,{version:metadata.version,buildRevision:metadata.buildRevision||'source',readme:read('README.md'),changelog:read('CHANGELOG.md'),update:{available:false,supported:supervised,message:supervised?'Test and stage an exact packaged candidate in Engine Room → Updates.':'Supervised updates require an installed helper-capable desktop package.'}});
      }
      if (url.pathname === '/api/resources' && req.method === 'GET') return json(200, service.resources ? await service.resources.list() : {supported:false,processes:[],tabs:[],observedAt:new Date().toISOString()});
      if (url.pathname === '/api/resources' && req.method === 'POST') {if(!service.resources)throw new Error('Resource controls require the desktop app.');return json(200,await service.resources.action(await body(req)));}
      if (url.pathname === '/api/chat-attention' && req.method === 'POST') {const value=await body(req,16000);if(value.action!=='review'||typeof value.id!=='string')throw new Error('Choose a chat failure to review.');return json(200,engine.reviewFailure(value.id,value.expectedFailureEventAt));}
      if(url.pathname.startsWith('/api/desktop-preview')||url.pathname.startsWith('/api/workspace-projects')) {
        if(url.pathname.startsWith('/api/desktop-preview')&&!desktopPreview)return json(404,{error:'Desktop preview is disabled.'});
        const projectPath=url.pathname.replace('/api/workspace-projects','/api/desktop-preview');
        if(projectPath==='/api/desktop-preview'&&req.method==='GET')return json(200,preview.get(engine));
        if(projectPath==='/api/desktop-preview/projects'&&req.method==='POST'){const value=await body(req);preview.projects(value,engine);await preview.reconcileContentTabs(service.contentTabs,engine);if(['delete','move-project'].includes(value.action))await (service.reconcileWorkspaceProjects||service.reconcilePreviewProjects)?.();notify();remote.changed();return json(200,preview.get(engine));}
        if(projectPath==='/api/desktop-preview/sources'&&req.method==='POST'){const result=await preview.sources(await body(req),engine);notify();remote.changed();return json(200,result);}
        return json(404,{error:'Unknown project operation.'});
      }
      if(url.pathname==='/api/terminal-agent'&&req.method==='POST'){if(!service.terminalAgent)throw Error('Terminal agent access requires the host desktop.');return json(200,await service.terminalAgent(await body(req,128000),'operator'));}
      if(url.pathname==='/api/tabs/manage'&&req.method==='POST')return json(200,await service.tabManagement.handle(await body(req,64000)));
      if(url.pathname==='/api/chat-control'&&req.method==='POST')return json(200,await service.chatControl.handle(await body(req,64000),'operator'));
      if(url.pathname==='/api/chat-workspace'&&req.method==='POST'){
        const value=await body(req,16000);
        if(preview&&value.projectId){const result=preview.projects({...value,chatId:value.id,action:'move-chat'},engine);await preview.reconcileContentTabs(service.contentTabs,engine);notify();remote.changed();return json(200,result);}
        const result=await service.tabManagement.handle({action:'move-chat',chatId:value.id,workspaceId:value.workspaceId,expectedUpdatedAt:value.expectedUpdatedAt});notify();remote.changed();return json(200,result);
      }
      if (url.pathname === '/api/chat-lifecycle' && req.method === 'POST') {
        const value=await body(req,16000);
        if(!['archive','unarchive','delete','promote'].includes(value.action)||typeof value.id!=='string')throw new Error('Choose a chat and archive, unarchive or delete action.');
        const hostId=value.hostId||remote.info().hostId;
        if(hostId===remote.info().hostId&&value.action==='promote')return json(200,engine.promoteChat(value.id,value.expectedUpdatedAt));
        if(hostId===remote.info().hostId)return json(200,engine.lifecycle(value.id,value.action,{expectedUpdatedAt:value.expectedUpdatedAt,expectedArchivedAt:value.expectedArchivedAt}));
        if(!service.peers)throw new Error('The paired computer is unavailable.');
        const result=await service.peers.request(hostId,value.action==='promote'?'chat.promote':value.action==='delete'?'chat.delete':'chat.archive',{id:value.id,...(value.action==='delete'?{}:{archived:value.action==='archive'}),expectedUpdatedAt:value.expectedUpdatedAt,expectedArchivedAt:value.expectedArchivedAt});
        service.peers.reconcileChat(hostId,result);
        return json(200,result);
      }
      if (url.pathname === '/api/chats/index' && req.method === 'GET') {
        const info=remote.info(),lastSyncAt=new Date().toISOString();
        const includeArchived=url.searchParams.get('includeArchived')==='1',projectCatalog=preview?.read();
        const local=engine.visibleRuns(includeArchived).slice(0,1000).map(r=>({id:r.id,chatId:r.id,hostId:info.hostId,local:true,title:r.title,titleRevision:r.titleRevision,trigger:r.trigger,chatType:r.chatType,provider:r.schedule.provider,status:r.status,createdAt:r.createdAt,updatedAt:r.updatedAt,lastActivityAt:chatActivityAt(r),archivedAt:r.archivedAt||null,archived:!!r.archivedAt,attentionRequired:r.status==='awaiting_input'||(!r.archivedAt&&['failed','interrupted'].includes(r.status)&&!r.failureReviewedAt),failureEventAt:['failed','interrupted'].includes(r.status)?r.failureEventAt||r.updatedAt:null,failureReviewedAt:r.failureReviewedAt||null,...chatMembership(r),...(preview?preview.membership(r,projectCatalog):{}),scheduleName:r.trigger==='chat'?'':r.schedule.name,destinationName:info.label}));
        const peer=service.peers?await service.peers.index():{items:[],hosts:[],partial:false};
        const items=[...local,...peer.items.filter(item=>includeArchived||!item.archivedAt)].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))||a.hostId.localeCompare(b.hostId)||a.chatId.localeCompare(b.chatId));
        return json(200,{items,hosts:[{id:info.hostId,name:info.label,online:true,lastSyncAt},...peer.hosts],partial:peer.partial});
      }
      if (url.pathname === '/api/chat-view') {
        const run=engine.getRun(url.searchParams.get('id'));
        const before=url.searchParams.has('beforeEvent')?Number(url.searchParams.get('beforeEvent')):undefined;
        const view={...remoteRun(run,0,engine.permissions,before),...(preview?preview.membership(run):{}),schedule:run.schedule,storage:storagePaths(home,run)};
        return json(200,before===undefined?chatDelta(run,view,url.searchParams.get('cursor')):view);
      }
      if (url.pathname === '/api/state') {
        const state=performanceDiagnostics.measureSync('http.state.assemble', () => {
        const projectSnapshot=preview.snapshot(),workspaceProjects=preview.get(engine,projectSnapshot),contextCatalog=integrations.decorateCatalog(context.get());
        const permissionSnapshot=engine.permissions.snapshot({workspaceDefaults:id=>workspacePermissionDefaults(id,projectSnapshot.config)});
        return {
        hostName:remote.info().label,hostId:remote.info().hostId,
        workspaceProjects,
        ...(desktopPreview?{desktopPreview:workspaceProjects}:{}),
        attention:service.desktopAttention(),updates:service.updates?.status()||null,
        schedules: engine.schedules.list(), runs: engine.listRuns().map(run => url.searchParams.has('summaries') ? {...runSummary(run),...workspaceProjects.memberships[run.id],trigger:run.trigger,usage:run.usage,schedule:{id:run.schedule.id,name:run.schedule.name,provider:run.schedule.provider,model:run.schedule.model,workspace:run.schedule.workspace},permissionContext:engine.permissions.describeRun(run,permissionSnapshot)} : ({ ...run, ...workspaceProjects.memberships[run.id], storage: storagePaths(home, run), permissionContext: engine.permissions.describeRun(run,permissionSnapshot) })), providerSteeringMediaTypes:Object.fromEntries(Object.entries(engine.providers).map(([id,provider])=>[id,provider.acceptedSteeringMediaTypes||[]])),providerSteering:Object.fromEntries(Object.entries(engine.providers).map(([id,provider])=>[id,typeof provider.steer==='function'])),providerStatus: catalog.value, providerStatuses: providerStatuses(),questionAttachmentMediaTypes:Object.fromEntries(Object.keys(adapters).map(id=>[id,questionAttachmentMediaTypes.filter(type=>adapters[id]?.acceptedMediaTypes?.includes(type))])),attachmentMediaTypes:Object.fromEntries(Object.keys(adapters).map(id=>[id,adapters[id]?.acceptedMediaTypes||[]])),mcpStatusProviders:Object.keys(adapters).filter(id=>typeof adapters[id]?.mcpStatus==='function'),mcpLoginProviders:['copilot','codex','claude'].filter(id=>typeof adapters[id]?.mcpLogin==='function'),
        permissions: permissionSnapshot.value, permissionWorkspaces: engine.permissions.describeMany([
          { ...settings.get(), name: 'Default workspace', ref: { defaults: true } },
          ...engine.schedules.list().filter(schedule => !schedule.error).map(schedule => ({ ...schedule, ref: { scheduleId: schedule.id } })),
          ...engine.listRuns().map(run => ({ ...run.schedule, ref: { runId: run.id } }))
        ].map(schedule=>permissionSchedule(schedule,contextCatalog)).filter(Boolean),permissionSnapshot),
        home, life: life.get(), settings: settings.get(), context: contextCatalog, standup: standup.get(), browserAvailable: !!browser, schedulerErrors, recoveryErrors: engine.recoveryErrors || [], ...hostPlatformMetadata(), version: readJSON(path.join(root,'package.json')).version,
        scheduler: { running: true, background, message: background ? 'The desktop host keeps running when its window is closed. Quit Proteus stops execution. The computer must be awake.' : 'Schedules run while this host process is running.' }
      };
        });
        return json(200,state);
      }
      if (['/api/omi','/api/transcription'].includes(url.pathname) && req.method === 'GET') return json(200, { ...await omi.status(), schedules: engine.schedules.list().filter(isOmiSchedule) });
      if (['/api/omi/settings','/api/transcription/settings'].includes(url.pathname) && req.method === 'POST') {
        const value = await body(req); const saved = await omi.saveSettings(value.settings, value.expectedRevision); notify(); return json(200, saved);
      }
      if (['/api/omi/prepare','/api/transcription/prepare'].includes(url.pathname) && req.method === 'POST') {
        const value = await body(req); const schedules = omi.prepareSchedules(engine.schedules, value.expectedRevision, value.area); notify(); return json(200, { schedules });
      }
      if (['/api/omi/logs','/api/transcription/logs'].includes(url.pathname) && req.method === 'GET') return json(200, omi.logs(url.searchParams.get('job'), url.searchParams.get('stream') || 'out', url.searchParams.get('limit') || 50));
      if (url.pathname === '/api/life' && req.method === 'POST') {
        const value = await body(req); const saved = await life.save(value.settings || value, value.expectedRevision); notify(); return json(200, saved);
      }
      if (['/api/life/backup-verify','/api/life/setup-plan','/api/life/setup-apply'].includes(url.pathname)) return json(410, {error:'Life now connects through the website API. Sign in from Setup; database administration is not available here.'});
      if (url.pathname === '/api/life/data' && req.method === 'POST') { const value = await body(req); return json(200, await life.data(value.section, value.query || {})); }
      if (url.pathname === '/api/life/action' && req.method === 'POST') { const value = await body(req, 30 * 1024 * 1024); const result = await life.action(value.action, value.input || {}, value.idempotencyKey, value.identity); notify(); return json(200, result); }
      if (url.pathname === '/api/life/evidence' && req.method === 'POST') { const value=await body(req); return json(200, await life.evidence(value.attachmentId, value.identity)); }
      if (url.pathname === '/api/workspace-files/roots' && req.method === 'GET') return json(200, workspaceFiles.roots());
      if (url.pathname === '/api/workspace-files/list' && req.method === 'POST') return json(200, workspaceFiles.list(await body(req)));
      if (url.pathname === '/api/workspace-files/folder' && req.method === 'POST') return json(200, workspaceFiles.createFolder(await body(req)));
      if (url.pathname === '/api/workspace-files/read' && req.method === 'POST') return json(200, workspaceFiles.read(await body(req)));
      if (url.pathname === '/api/workspace-files/create' && req.method === 'POST') return json(200, workspaceFiles.createMarkdown(await body(req)));
      if (url.pathname === '/api/settings' && req.method === 'POST') {
        const value = await body(req); const old = settings.get();
        if(value.settings?.updateCoordinator&&JSON.stringify(value.settings.updateCoordinator)!==JSON.stringify(old.updateCoordinator))await (await import('./services/updates/update-coordinator.js')).updateCoordinatorConfiguration(value.settings,catalogs);
        for(const [provider,options] of Object.entries(value.settings?.internetSearches||{})){
          if(JSON.stringify(old.internetSearches?.[provider])===JSON.stringify(options))continue;
          const metadata=await catalogs[provider]?.get(),model=metadata?.models?.find(m=>m.id===options.model);
          if(!model||metadata.stale||metadata.error)throw new Error('Refresh the Internet Search provider catalog before saving defaults.');
          validateModelOptions(options,model);
        }
        const saved = settings.save(value.settings, value.expectedRevision);
        if (JSON.stringify(old.workspace) !== JSON.stringify(saved.workspace)) {
          const config = context.config();
          context.mutate(config => Object.assign(config.workspaces.find(w => w.id === config.defaultWorkspaceId), saved.workspace), config.revision);
        }
        return json(200, saved);
      }
      if (url.pathname === '/api/context' && req.method === 'GET') return json(200, integrations.decorateCatalog(context.get(url.searchParams.get('workspaceId') || undefined)));
      if (url.pathname === '/api/context/preview' && req.method === 'POST') { const value = await body(req); return json(200, contextPlan(context.get(value.workspaceId), value)); }
      if (url.pathname === '/api/context/refresh' && req.method === 'POST') { const value = await body(req); const result = await context.refreshAsync({workspaceId:value.workspaceId,root:value.root}); notify(); return json(200,result); }
      if (url.pathname === '/api/context' && req.method === 'POST') {
        const value = await body(req);
        if(value.action==='reorder-workspaces'){const result=context.reorderWorkspaces(value.ids,value.expectedRevision);notify();remote.changed();return json(200,result);}
        if (value.action === 'favorite') { const result = context.favorite(value.id, value.enabled, value.expectedRevision, value.workspaceId); notify(); return json(200, result); }
        if (value.action === 'import-workspace') { const result = context.importConfiguration(value,value.expectedRevision); context.scanPending = false; await context.refreshAsync({workspaceId:result.copiedWorkspaceId}); notify(); return json(200,{...context.get(result.copiedWorkspaceId),copiedWorkspaceId:result.copiedWorkspaceId}); }
        if (value.action === 'copy-workspace') { const result = context.copyWorkspace(value.workspaceId, value.name, value.expectedRevision); engine.permissions.copyWorkspace(value.workspaceId, result.copiedWorkspaceId); if(context.scanPending){context.scanPending=false;await context.refreshAsync();} notify(); return json(200, {...context.get(result.copiedWorkspaceId),copiedWorkspaceId:result.copiedWorkspaceId}); }
        if (value.action === 'save-workspace') {
          let removedApprovalFolders = [];
          if(value.configuration?.approvals){
            const selected = context.scope(value.workspaceId), incoming = value.configuration.approvals;
            if (Array.isArray(incoming.folders)) removedApprovalFolders = selected.approvals.folders.filter(folder=>!incoming.folders.some(next=>next.path===folder.path)).map(folder=>folder.path);
            const approvals = {...selected.approvals,...incoming};
            value.configuration.approvals = approvals;
          }
          const result = context.mutate(config => { const profile = context.scope(value.workspaceId,config); const allowed = ['name','cwd','additionalDirectories','libraryFolders','universalFolders','documents','modes','favorites','workspaceFiles','defaults','discovery','approvals']; for (const key of allowed) if (Object.hasOwn(value.configuration || {},key)) profile[key] = structuredClone(value.configuration[key]); }, value.expectedRevision);
          if (value.configuration?.approvals) engine.permissions.configureWorkspace(value.workspaceId,context.scope(value.workspaceId).approvals,{replaceFolders:value.replaceApprovalFolders===true,replaceRules:value.replaceApprovalRules===true,removedFolders:removedApprovalFolders});
          if (context.scanPending) { context.scanPending = false; await context.refreshAsync({workspaceId:value.workspaceId}); }
          engine.recheckPermissions(); notify(); return json(200, { ...context.get(value.workspaceId), revision: result.revision });
        }
        if (value.action === 'import') { context.importWorkspace(value.file,value.expectedRevision);if(context.scanPending){context.scanPending=false;await context.refreshAsync();}notify();return json(200,context.get(value.workspaceId)); }
        const result = context.mutate(config => {
          const scoped = context.scope(value.workspaceId, config);
          if (value.action === 'mode') {
            if (!context.get(value.workspaceId).entries.some(entry => entry.id === value.id)) throw new Error('Context entry no longer exists.');
            scoped.modes[value.id] = value.mode;
            if (value.mode === 'universal' && !preview) scoped.libraryFolders = [...new Set([...scoped.libraryFolders, ...context.get(value.workspaceId).entries.find(entry => entry.id === value.id).roots])];
          } else if (value.action === 'add-folders') {
            if (value.library) scoped.libraryFolders.push(...value.folders);
            else {
              const profile = config.workspaces.find(w => w.id === value.workspaceId);
              if (!profile) throw new Error('Workspace not found.');
              profile.additionalDirectories.push(...value.folders);
            }
          } else if (value.action === 'universal-folder') {
            scoped.universalFolders = scoped.universalFolders.filter(folder => folder !== value.folder);
            if (value.enabled) scoped.universalFolders.push(value.folder);
          } else if (value.action === 'remove-folder') {
            const profile = config.workspaces.find(w => w.id === value.workspaceId);
            if (value.library) { scoped.libraryFolders = scoped.libraryFolders.filter(root => root !== value.folder); scoped.universalFolders = scoped.universalFolders.filter(root => root !== value.folder); }
            else if (!profile || profile.cwd === value.folder) throw new Error('Choose another command folder before removing it.');
            else profile.additionalDirectories = profile.additionalDirectories.filter(root => root !== value.folder);
          } else if (value.action === 'document') scoped.documents.push({ path: value.file, kind: value.kind });
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
        if (context.scanPending) { context.scanPending = false; await context.refreshAsync({workspaceId:value.workspaceId}); }
        notify(); return json(200, context.get(value.workspaceId));
      }
      if (url.pathname === '/api/standup' && req.method === 'POST') {
        const value = await body(req);
        return json(200, value.action === 'present' ? standup.present(value.current) : value.action === 'generate' ? standup.generate(value.expectedRevision) : standup.save(value.settings, value.expectedRevision));
      }
      if (url.pathname === '/api/run-context' && req.method === 'POST') {
        const value = await body(req); const run = engine.getRun(value.runId);
        if (['running', 'queued', 'awaiting_input'].includes(run.status)) throw new Error('Wait for this turn to finish before changing context.');
        await context.refreshAsync({ workspaceId: run.schedule.context?.workspaceId });
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
        if (['grant-chat-folder','revoke-chat-folder'].includes(value.action)) {
          const permissionContext = engine.setChatFolder(value.runId,value.folder,value.access,value.action==='revoke-chat-folder',value.expectedContextId,value.expectedChatRevision);
          return json(200,{permissionContext,permissionRevision:engine.permissions.get().revision});
        }
        if (value.action === 'revoke-chat-rule') {
          const permissionContext = engine.revokeChatRule(value.runId, value.ruleId, value.expectedContextId, value.expectedChatRevision, value.expectedRequestId);
          return json(200, { permissionContext, permissionRevision: engine.permissions.get().revision });
        }
        if (value.action === 'set-chat-read-only') {
          const permissionContext = engine.setChatReadOnly(value.runId, value.enabled, value.expectedContextId, value.expectedChatRevision, value.expectedRequestId);
          return json(200, { permissionContext, permissionRevision: engine.permissions.get().revision });
        }
        if (value.action === 'set-chat-mode') {
          const context = engine.setChatPermission(value.runId, value.mode, value.expectedContextId, value.expectedChatRevision, value.expectedRequestId);
          return json(200, { permissionContext: context, permissionRevision: engine.permissions.get().revision });
        }
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
        const saved=engine.schedules.save(schedule, expectedRevision);
        return json(200, {...saved,revision:revision(saved)});
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
      if (url.pathname === '/api/chat-title' && req.method === 'POST') {
        const value = await body(req);
        return json(200, engine.renameChat(value.id, value.title, value.expectedTitleRevision));
      }
      if(url.pathname==='/api/attachments'&&req.method==='POST'){
        const value=await body(req),deviceId='local-desktop',providerId=value.id?engine.getRun(value.id).schedule.provider:value.providerId;
        if(value.action==='begin'){
          if(value.providerId!==providerId||!adapters[providerId]?.acceptedMediaTypes?.includes(value.mediaType))throw new Error(`${providerId} cannot receive ${value.mediaType} attachments.`);
          if(!value.id&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.draftId||''))throw new Error('Choose a valid chat draft.');
          return json(200,await attachments.begin({chatId:value.id||'draft:'+value.draftId,deviceId,messageId:value.messageId,providerId,name:value.name,mediaType:value.mediaType,size:value.size,sha256:value.sha256}));
        }
        if(value.action==='chunk')return json(200,await attachments.chunk({uploadId:value.uploadId,deviceId,index:value.index,dataBase64:value.dataBase64}));
        if(value.action==='finish')return json(200,await attachments.finish({uploadId:value.uploadId,deviceId}));
        if(value.action==='authorize')return json(200,await remote.attachmentConsents.authorize({...(value.id?{chatId:value.id}:{draftId:value.draftId}),deviceId,messageId:value.messageId,providerId,attachments:value.attachments,acceptedMediaTypes:adapters[providerId]?.acceptedMediaTypes||[]}));
        throw new Error('Unknown attachment action.');
      }
      if (url.pathname === '/api/chat' && req.method === 'POST') {
        let value = await body(req);
        const project=value.purpose==='update'?null:preview?.projectFor(value);if(project&&(desktopPreview||value.projectId||value.workspaceId))value={...value,workspaceId:project.workspaceId};
        const schedule=await buildChatSchedule(value),files=Array.isArray(value.attachments)?value.attachments:[];
        if(!files.length){const run=engine.createRun(schedule,'chat');if(project)preview.associate(run,project,engine);return json(200,run);}
        if(files.length>chatAttachmentLimits.maxBatchFiles||!value.consentId||!value.draftId||!value.messageId||value.providerId!==schedule.provider)throw new Error('Review the exact files and named provider before sending.');
        await remote.attachmentConsents.verify({consentId:value.consentId,draftId:value.draftId,messageId:value.messageId,providerId:schedule.provider,deviceId:'local-desktop',attachmentIds:files});
        const run=engine.createRun(schedule,'chat',null,{deferStart:true});if(project)preview.associate(run,project,engine);let prepared;
        try{prepared=await remote.attachmentConsents.prepareSend({consentId:value.consentId,draftId:value.draftId,chatId:run.id,messageId:value.messageId,providerId:schedule.provider,deviceId:'local-desktop',attachmentIds:files});engine.startDeferredRun(run.id,{proofId:prepared.proofId,attachmentIds:files,messageId:value.messageId});return json(200,run);}
        catch(error){if(prepared)await remote.attachmentConsents.releaseProof(prepared.proofId).catch(()=>{});engine.discardDeferredRun(run.id);throw error;}
      }
      const match = url.pathname.match(/^\/api\/runs\/([a-f0-9-]+)\/(reply|resume|cancel|send|edit-queued|remove-queued|steer-queued|recover)$/);
      if (match && req.method === 'POST') {
        const value = await body(req); const [, id, action] = match;
        if (action === 'reply') return json(200, await replyWithAttachments(engine,id,value,'local-desktop'));
        if (action === 'send' && typeof value.prompt === 'string' && /^\/mcp\s+auth(?:\s|$)/i.test(value.prompt.trim())) {
          const run = engine.getRun(id); const provider = engine.providers[run.schedule.provider];
          if (!provider?.mcpLogin) throw new Error('This provider does not support MCP sign-in through Proteus. Sign in on the owning computer, then refresh connections.');
          if (!openExternal) throw new Error('Use MCP connections in chat details to open the sign-in link.');
          if ([...engine.running.values()].some(slot=>slot.id!==id&&engine.getRun(slot.id).schedule.provider===run.schedule.provider)&&!provider.sessions) throw new Error('Wait for this provider’s active chats before signing in.');
          const name = value.prompt.trim().replace(/^\/mcp\s+auth\s*/i, '').trim();
          if (!name) throw new Error('Use /mcp auth <server>, or Manage connections in chat details.');
          if (run.events.some(e => e.data?.delivery?.id === value.messageId && value.messageId)) return json(200, run);
          const configured = Object.keys(provider.selectedMcp(run));
          const named = run.schedule.context?.entries.filter(e => e.kind === 'mcp' && e.name.toLowerCase() === name.toLowerCase()).map(e => e.runtimeName).filter(Boolean) || [];
          const matches = configured.filter(key => key.toLowerCase() === name.toLowerCase() || named.includes(key));
          if (matches.length !== 1) throw new Error('Choose an exact server from MCP connections: ' + configured.join(', '));
          engine.event(run, 'user', value.prompt, {delivery:{id:value.messageId,state:'delivered'}});
          try { const result = await provider.mcpLogin(run, matches[0]);
            if (result.authorizationUrl) await openExternal(result.authorizationUrl);
            engine.event(run,'system',result.authorizationUrl ? 'MCP sign-in opened in the host browser. Finish signing in, refresh MCP connections, then continue or steer this chat to retry.' : 'MCP connection restored. Continue or steer this chat to retry.');
          } catch(error) { engine.event(run,'system','MCP sign-in failed: '+error.message); throw error; }
          return json(200, run);
        }
        if(action==='recover'){
          if(value.modelOptions){const run=engine.getRun(id),options=chatModelOptions(value.modelOptions);if(value.action!=='continue')throw Error('Choose Continue chat to change model settings.');if(run.schedule.provider!=='rehearsal'){const catalog=await catalogs[run.schedule.provider]?.get(),model=catalog?.models?.find(item=>item.id===options.model);if(!model)throw Error('Selected model is unavailable. Refresh models and choose an available model.');validateModelOptions(options,model);}value.modelOptions=options;}
          return json(200,await engine.recovery.command(id,value));
        }
        if (action === 'send') {
          const run = engine.getRun(id);
          if (value.modelOptions && value.mode !== 'steer') {
            const options = chatModelOptions(value.modelOptions);
            if (run.schedule.provider !== 'rehearsal') {
              const catalog = await catalogs[run.schedule.provider]?.get();
              const model = catalog?.models?.find(m => m.id === options.model);
              if (!model) throw new Error('Selected model is unavailable. Refresh models and choose an available model.');
              validateModelOptions(options, model);
            }
          }
          if(value.messageId&&run.events.some(event=>event.data?.delivery?.id===value.messageId))return json(200,run);
          const files=Array.isArray(value.attachments)?value.attachments:[];
          if(files.length){
            if(files.length>chatAttachmentLimits.maxBatchFiles||!value.messageId||!value.consentId||value.providerId!==run.schedule.provider)throw new Error('Review the exact files and named provider before sending.');
            const prepared=await remote.attachmentConsents.prepareSend({consentId:value.consentId,chatId:run.id,messageId:value.messageId,providerId:run.schedule.provider,deviceId:'local-desktop',attachmentIds:files});
            try{return json(200,await engine.send(id,value.prompt,value.mode||'queue',value.messageId,value.modelOptions,{proofId:prepared.proofId,attachmentIds:files}));}
            catch(error){await remote.attachmentConsents.releaseProof(prepared.proofId).catch(()=>{});throw error;}
          }
          return json(200, await engine.send(id, value.prompt, value.mode, value.messageId, value.modelOptions));
        }
        if (action === 'edit-queued') return json(200,engine.editQueued(id,value.messageId,value.prompt,value.expectedPrompt));
        if (action === 'steer-queued') return json(200,await engine.steerQueued(id,value.messageId));
        if (action === 'remove-queued') return json(200, engine.removeQueued(id, value.messageId));
        if (action === 'resume') {
          if(value.modelOptions){
            const run=engine.getRun(id),options=chatModelOptions(value.modelOptions);
            if(run.schedule.provider!=='rehearsal'){
              const catalog=await catalogs[run.schedule.provider]?.get(),model=catalog?.models?.find(item=>item.id===options.model);
              if(!model)throw new Error('Selected model is unavailable. Refresh models and choose an available model.');
              validateModelOptions(options,model);
            }
            return json(200,await engine.send(id,value.prompt,'queue',value.messageId,options));
          }
          // Modern remote clients include an idempotent delivery ID even when
          // resuming an ended turn. Preserve it and let the owner choose queue/start.
          if(value.messageId)return json(200,await engine.send(id,value.prompt,value.mode||'queue',value.messageId));
          return json(200, engine.resume(id, value.prompt));
        }
        engine.cancel(id); return json(200, { ok: true });
      }
      if (url.pathname === '/api/integrations') {
        if(req.method==='GET')return json(200,integrations.snapshot());
        const value=await body(req);
        if(value.action==='favorite'){const workspace=context.config().workspaces.find(row=>context.get(row.id).entries.some(entry=>entry.id===value.id));if(!workspace)throw Error('This source is no longer in the source library.');context.favorite(value.id,value.enabled,value.expectedRevision,workspace.id);notify();return json(200,integrations.snapshot());}
        if(value.action==='refresh-sources'){await context.refreshAsync({});notify();return json(200,integrations.snapshot());}
        if(value.action==='save')return json(200,integrations.save(value.id,value.profile,value.expectedRevision));
        if(['check','recover'].includes(value.action))return json(200,await integrations.check(value.id,{recover:value.action==='recover'}));
        throw new Error('Unknown integration action.');
      }
      if (url.pathname === '/api/mcp' && req.method === 'POST') {
        const value = await body(req); const run = engine.getRun(value.runId);
        const provider = engine.providers[run.schedule.provider];
        if (!provider?.mcpStatus) throw new Error('This provider does not report selected MCP connection status through Proteus.');

        if(integrations.pending.has(run.schedule.provider))throw new Error('A connection check is already in progress for this provider.');
        return await integrations.withProvider(run.schedule.provider,async()=>{
        if (value.action === 'login') {
          if(typeof provider.mcpLogin!=='function')throw new Error('This provider does not support MCP sign-in through Proteus. Sign in on the owning computer, then refresh connections.');
          const result = await provider.mcpLogin(run, value.server);
          if (result.authorizationUrl && value.openOnMac) {
            if (!openExternal) throw new Error('Open Proteus on the host computer to finish browser sign-in.');
            await openExternal(result.authorizationUrl); return json(200, {server:result.server,status:result.status,openedOnMac:true});
          }
          return json(200, result);
        }
        if (value.action !== 'status') throw new Error('Unknown MCP connection action.');
        const result=await provider.mcpStatus(run);integrations.observe(run,result.servers);return json(200,result);
        });
      }
      if (url.pathname === '/api/usage' && req.method === 'POST') return json(200, await usage.get((await body(req)).force === true));
      if (url.pathname === '/api/provider' && req.method === 'POST') { const value = await body(req); const selectedCatalog = value.provider ? catalogs[value.provider] : catalog; if (!selectedCatalog) throw new Error('Provider catalog is unavailable.'); const result = await selectedCatalog.get(value.force !== false); if(desktopPreview&&selectedCatalog===catalogs.codex)preview.initializeProviderDefaults(settings,result); notify(); remote.changed(); return json(200, result); }
      if (url.pathname === '/api/provider-auth' && req.method === 'POST') return json(200, await providerAuth.handle(await body(req)));
      if (url.pathname === '/api/chat-image' && req.method === 'POST') {
        const value = await body(req);
        return json(200, readChatImage(engine.getRun(value.id), value.source));
      }
      if (url.pathname === '/api/markdown' && req.method === 'POST') {
        const { file, image } = await body(req);
        const roots = [...context.roots(), ...context.config().documents.map(doc => path.dirname(doc.path)), settings.get().workspace.cwd, ...settings.get().workspace.additionalDirectories, ...engine.schedules.list().filter(s => !s.error).flatMap(s => [s.workspace.cwd, ...s.workspace.additionalDirectories])];
        if (typeof file !== 'string' || !/\.md$/i.test(file) || !isWithin(file, roots)) throw new Error('Choose a Markdown file inside a configured workspace.');
        const document=readMarkdownFile(file);
        return json(200, image ? readImage({ source: image, texts: [document.content], cwd: path.dirname(file), roots }) : document);
      }
      if (req.method === 'GET' && assets[url.pathname]) {
        const [file, type] = assets[url.pathname]; res.writeHead(200, { 'Content-Type': type }); res.end(fs.readFileSync(path.join(root, 'public', file))); return;
      }
      json(404, { error: 'Not found.' });
    } catch (error) { activity.log('warning','api.failed','An application request failed validation or could not be completed.',{error}); json(400, { error: error.message }); }
  });
  try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); }); }
  catch (error) { unlock(); throw error; }
  origin = `http://127.0.0.1:${server.address().port}`;
  atomicJSON(path.join(home, 'connection.json'), { origin, token, pid: process.pid });
  const timer = timers ? setInterval(() => { void performanceDiagnostics.measure('scheduler.tick', () => engine.tick()).catch(error => engine.emit('scheduler-error', { error: error.message, at: new Date().toISOString() })); }, 1000) : null;
  const service = { desktopControl,workspaceProjects:preview, desktopPreview:desktopPreview?preview:null, performanceDiagnostics, notify, desktopAttention:()=>[...(service.browserAttention?.()||[]),...remote.documents.list().filter(item=>!item.approvedAt).map(item=>({id:'document:'+item.requestId,kind:'document',title:item.deviceName+' requests '+item.title,requestId:item.requestId,path:item.path,at:new Date(Date.parse(item.expiresAt)-600000).toISOString()})),...service.attention()], attention:()=>[...integrations.consumers().filter(item=>['needs-auth','failed'].includes(item.connection)).map(item=>({id:'integration:'+item.id,kind:'connection',title:(item.profile.label||item.server)+' needs attention',section:'integrations',at:item.checkedAt})),...activity.notifications().items.filter(item=>!item.readAt).map(item=>({id:'notification:'+item.id,notificationId:item.id,kind:'notification',title:item.title,body:item.body,chatId:item.chatId,...(item.browserIssue?{browserIssue:item.browserIssue,silent:true}:{}),at:item.createdAt}))], browserProfiles, integrations, engine, settings, context, standup, omi, life, account, activity, workspaceFiles, attachments, buildChatSchedule, usage, catalog, catalogs, origin, token, home, url: `${origin}/?token=${token}`, async close() {
    await service.updates?.close();await service.chatControl?.close();await desktopControl?.close();
    activity.log('info','app.stopping','Proteus is shutting down.');clearInterval(integrationTimer);await integrations.close(); if(activityTimer)clearInterval(activityTimer); if (timer) clearInterval(timer); if (catalogTimer) clearInterval(catalogTimer); await Promise.all(Object.values(catalogs).map(c => c.pending)); await providerAuth.close(); await remote.close(); let engineCloseError; try { await engine.close(); } catch (error) { engineCloseError=error; } await attachments.close(); await copilot.close(); await codex.close(); await claude.close(); await life.close?.(); await service.browserHistory?.close(); let activityCloseError; try { await activity.close(); } catch (error) { activityCloseError=error; }
    for (const client of eventClients) client.end(); eventClients.clear();
    await new Promise(resolve => {
      server.close(resolve);
      // Stop accepting first, then drain sockets: incomplete requests can prevent the close callback.
      server.closeAllConnections();
    });
    await performanceDiagnostics.close();
    fs.rmSync(path.join(home, 'connection.json'), { force: true }); unlock();
    if (engineCloseError) throw engineCloseError;
    if (activityCloseError) throw activityCloseError;
  } };
  service.browserHistory=new BrowserHistory(home,{hostId:()=>service.remote?.info().hostId});
  service.contentTabs=new ContentTabs(home,{history:service.browserHistory,profiles:()=>browserProfiles.list().items,onChange:result=>{const metadata={scope:result.scope,id:result.id,revision:result.revision};for(const client of eventClients)client.write('event: content-tabs\ndata: '+JSON.stringify(metadata)+'\n\n');notify();remote?.broadcast('tabs',metadata,result.scope==='chat'?result.id:undefined);}});
  service.projectFollow = new ProjectFollow({
    validationStamp: () => fileStamp([context.file,preview.file]),
    validate: value => { if(value.scope==='project')preview.projectFor({projectId:value.id},preview.snapshot());else context.scope(value.id); },
    lookup: (value,id) => service.contentTabs.member(value.scope,value.id,id),
    changed: value => {
      const packet='event: project-follow\ndata: '+JSON.stringify(value)+'\n\n';
      for(const client of eventClients)if(!client.destroyed){if(client.writableLength>262144)client.destroy();else client.write(packet);}
      remote?.broadcastFollow(value);
    }
  });
  await preview.reconcileContentTabs(service.contentTabs,engine);
  service.tabManagement=new TabManagement(service);
  service.mutateContentTabs=async value=>{
    const prior=service.contentTabs.get(value.scope,value.id),result=await service.contentTabs.mutateAsync(value);
    const closing=(value.operations||[]).filter(op=>op.action==='close').map(op=>prior.tabs.find(tab=>tab.id===op.id)).filter(Boolean);
    for(const tab of closing)if(!service.contentTabs.list().some(current=>current.id===tab.id))await service.tabRuntime?.({action:'close',tab,source:{scope:value.scope,id:value.id}});
    return result;
  };
  service.previews=new ChatPreviews(service);
  remote = service.remote = new RemoteHost(service); activity.attach(engine,()=>remote.info().hostId); activity.log('info','app.started','Proteus started.'); await remote.start();
  service.chatControl=new ChatControl(service);
  for(const adapter of Object.values(adapters))adapter.chatControl=service.chatControl;
  const integrationTimer=timers?setInterval(()=>void integrations.tick(),300000):null;
  const activityTimer = timers ? setInterval(()=>void activity.flush(),60000) : null;
  if(desktopPreview&&catalogs.codex)preview.initializeProviderDefaults(settings,await catalogs.codex.get());
  const refreshCatalog = () => Promise.allSettled(Object.values(catalogs).map(c => c.get())).then(() => { if(desktopPreview)preview.initializeProviderDefaults(settings,catalogs.codex?.value); notify(); remote.changed(); });
  const catalogTimer = timers ? setInterval(refreshCatalog, 60_000) : null;
  if (timers) { performanceDiagnostics.start(); void refreshCatalog(); }
  if (life.get().enabled && life.get().configured) void life.refresh().then(notify).catch(() => notify());
  return service;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = await startServer({ port: Number(process.env.PORT || 4317) });
  console.log(`Proteus: ${app.url}\nData: ${app.home}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
import {ChatPreviews} from './services/chats/chat-previews.js';
