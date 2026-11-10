import {isOwnerScopedCommandRequest} from '../scheduling/scoped-command-request.js';
import {scheduleAccessScope,scheduleAccessRule,matchesScheduleAccess} from './schedule-access-rule.js';
import fs from 'node:fs';
import {chatAccessScope,matchesChatAccess} from './chat-access-rule.js';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { atomicJSON, readJSON } from '../../shared/files.js';
import { revision } from '../scheduling/schedules.js';

export const permissionModes = ['ask', 'custom', 'trusted', 'autopilot'];
export const effectivePermissionMode = profile => profile?.mode === 'trusted' && profile.readOnlyTools !== true ? 'custom' : profile?.mode || 'ask';
const previewBrowserReads = new Set(['list', 'snapshot']);
const browserReads = new Set(['list', 'open', 'navigate', 'snapshot', 'scroll', 'close']);
const knownKinds = new Set(['read', 'write', 'shell', 'mcp', 'url', 'custom-tool']);
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export const permissionRuleId = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const hash = permissionRuleId;
const within = (target, root) => { const rel = path.relative(root, target); return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)); };

// Resolve existing ancestors too: a new file beneath a symlink must not inherit
// the trust of the symlink's apparent parent. Dangling links fail closed.
export function canonicalPath(value, cwd) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let current = path.resolve(cwd, value); const tail = [];
  while (true) {
    try { fs.lstatSync(current); return path.join(fs.realpathSync(current), ...tail); }
    catch (error) {
      if (error.code !== 'ENOENT' || current === path.dirname(current)) return null;
      try { if (fs.lstatSync(current).isSymbolicLink()) return null; } catch { /* Missing ancestor. */ }
      tail.unshift(path.basename(current)); current = path.dirname(current);
    }
  }
}
function buildPermissionContext(schedule, resolvePath) {
  const cwd = resolvePath(schedule.workspace.cwd, schedule.workspace.cwd) || schedule.workspace.cwd;
  const roots = [...new Set([cwd, ...schedule.workspace.additionalDirectories.map(dir => resolvePath(dir, cwd) || dir)])].sort();
  const context = { ...(schedule.permissionScope?.kind==='schedule'?{scheduleId:schedule.permissionScope.id}:{}),...(schedule.executionPermissions?{schedulePermissions:hash(schedule.executionPermissions)}:{}),...(schedule.context?.workspaceId ? { workspaceId: schedule.context.workspaceId } : {}), provider: schedule.provider, cwd, roots, integrations: hash({ ...(schedule.managedConnectionBindings?.length?{managedConnections:schedule.managedConnectionBindings}:{}),mcp: schedule.mcpServers || {}, selectedTools: (schedule.context?.entries || []).filter(entry => ['mcp', 'skill', 'agent'].includes(entry.kind)).map(entry => ({ id: entry.id, hash: entry.hash })), skills: (schedule.skillDirectories || []).map(dir => resolvePath(dir, cwd) || dir).sort() }) };
  return { ...context, id: hash(context), label: schedule.name || path.basename(cwd) };
}
export function permissionContext(schedule) { return buildPermissionContext(schedule, canonicalPath); }

// Only display projections share these resolutions. A snapshot retained across an
// await loses its path memo. Calls without an explicit projection snapshot and
// direct authorization helpers always resolve paths freshly.
const projectionPaths = new WeakMap();
const maxProjectionPaths = 1024;
function projectionPath(value, cwd, snapshot) {
  const memo = projectionPaths.get(snapshot);
  if (!memo?.active || typeof value !== 'string' || typeof cwd !== 'string') return canonicalPath(value, cwd);
  const key = JSON.stringify([cwd, value]);
  if (memo.paths.has(key)) return memo.paths.get(key);
  const resolved = canonicalPath(value, cwd);
  if (memo.paths.size < maxProjectionPaths) memo.paths.set(key, resolved);
  return resolved;
}
function projectionContext(schedule, snapshot) {
  return buildPermissionContext(schedule, (value, cwd) => projectionPath(value, cwd, snapshot));
}
const protectedRequest = request => request.managedApprovalRequired === true || request.requestSandboxBypass === true;
const requestedPath = (request, context) => canonicalPath(request.resolvedPath || (request.kind === 'read' ? request.path : request.fileName), context.cwd);

export function operationRule(request) {
  if(request.kind==='schedule-access')return request.toolName==='proteus_schedules'?scheduleAccessRule(request.args?.scope):null;
  if(request.kind==='chat-access'){const scope=request.toolName==='proteus_chats'&&chatAccessScope(request.args?.scope);return scope?{kind:'chat-access',tool:'proteus_chats',scope}:null;}
  if (request.kind === 'shell' && typeof request.fullCommandText === 'string') return { kind: 'shell', command: request.fullCommandText };
  if (request.kind === 'mcp' && request.serverName && request.toolName) return { kind: 'mcp', server: request.serverName, tool: request.toolName, ...(typeof request.args?.action === 'string' ? { action: request.args.action } : {}) };
  if (request.kind === 'custom-tool' && request.toolName) return { kind: 'custom-tool', tool: request.toolName, ...(typeof request.args?.action === 'string' ? { action: request.args.action } : {}) };
  if (request.kind === 'url') { try { const url = new URL(request.url); if (['https:', 'http:'].includes(url.protocol)) return { kind: 'url', origin: url.origin }; } catch { /* No repeatable rule. */ } }
  return null;
}
export const ruleLabel = rule => rule.kind==='custom-tool'&&rule.tool==='proteus_schedules'&&scheduleAccessScope(rule.scheduleScope)&&scheduleAccessRule(rule.scheduleScope).action===rule.action?`Schedules ${rule.scheduleScope.scheduleIds.join(', ')}: ${rule.scheduleScope.actions.join(', ')}`: rule.kind==='chat-access'?`Proteus conversations: ${rule.scope.actions.join(', ')} on ${rule.scope.hostId}`:rule.kind === 'shell' ? `Exact command: ${rule.command}` : rule.kind === 'url' ? rule.origin : `${rule.server ? `${rule.server} / ` : ''}${rule.tool}${rule.action ? ` / ${rule.action}` : ''}`;

// Read-only display logic shared with the state worker. It has no file writer,
// approval methods or provider sessions; the owner retains those capabilities.
export class PermissionProjection {
  constructor({ preserveInheritedDefaults = false } = {}) {
    this.preserveInheritedDefaults = preserveInheritedDefaults;
  }
  // UI projections may share this fresh, request-local read. Authorization and
  // mutations omit the snapshot and continue to load current disk state.
  snapshot({ value = this.get(), workspaceDefaults = this.workspaceDefaults } = {}) {
    const profiles = new Map();
    for (const profile of value.workspaces) if (!profiles.has(profile.id)) profiles.set(profile.id, profile);
    const snapshot = { value, profiles, workspaceDefaults, defaults: new Map() };
    const memo = { active: true, paths: new Map() };
    projectionPaths.set(snapshot, memo);
    queueMicrotask(() => { memo.active = false; memo.paths.clear(); });
    return snapshot;
  }
  describeContext(context, snapshot) {
    let saved = snapshot.profiles.get(context.id);
    if (snapshot.workspaceDefaults) {
      if (!snapshot.defaults.has(context.workspaceId)) snapshot.defaults.set(context.workspaceId, snapshot.workspaceDefaults(context.workspaceId));
      saved ||= snapshot.defaults.get(context.workspaceId);
    }
    const defaults=snapshot.defaults.get(context.workspaceId),workingFolders=[];
    if(this.preserveInheritedDefaults&&defaults?.workingRoots){
      for(const root of context.roots){
        if(!defaults.workingRoots.some(base=>{const resolved=projectionPath(base,context.cwd,snapshot);return resolved&&within(root,resolved);}))continue;
        const configured=[...(defaults.folders||[]),...(saved?.folders||[])].map(folder=>({...folder,path:projectionPath(folder.path,context.cwd,snapshot)})).filter(folder=>folder.path&&within(root,folder.path)).sort((a,b)=>b.path.length-a.path.length||Number(a.access==='read-write')-Number(b.access==='read-write'))[0];
        workingFolders.push({path:root,access:configured?.access||'read-write'});
      }
    }
    // Explicit read-only folders stay authoritative even where a broader mode allows access.
    const readOnlyFolders=this.preserveInheritedDefaults?[...(defaults?.folders||[]),...(saved?.folders||[])].filter(folder=>folder.access==='read').map(folder=>projectionPath(folder.path,context.cwd,snapshot)).filter(Boolean):[];
    return { ...context, workingFolders, readOnlyFolders, mode: effectivePermissionMode(saved), readOnlyTools: saved?.readOnlyTools === true, folders: saved?.folders || [], rules: saved?.rules || [] };
  }
  describe(schedule, snapshot) {
    const context = snapshot ? projectionContext(schedule, snapshot) : permissionContext(schedule);
    const current=snapshot||this.snapshot();
    const own=this.describeContext(context,current);
    const inherited=schedule.permissionScope?.kind==='schedule'&&!current.profiles.has(context.id)?this.describeContext(snapshot?projectionContext({...schedule,permissionScope:undefined},snapshot):permissionContext({...schedule,permissionScope:undefined}),current):own;
    const profile={...inherited,...context,workingFolders:this.chatWorkingFolders(schedule,context,inherited,snapshot)},explicit=schedule.executionPermissions;
    const grants=(schedule.accessOverlay?.grants||[]).filter(grant=>!grant.revokedAt);
    if(grants.some(grant=>grant.rule||grant.folder)){profile.scheduleRules=grants.flatMap(grant=>grant.rule?[grant.rule]:[]);profile.scheduleFolders=grants.flatMap(grant=>grant.folder?[grant.folder]:[]);}
    if(!explicit)return profile;
    const folders=(explicit.folders||[]).map(folder=>({...folder,path:projectionPath(folder.path,context.cwd,snapshot)}));
    if(folders.some(folder=>!folder.path))throw Error('A schedule folder is unavailable. Review schedule access.');
    return {...profile,source:'schedule',mode:explicit.mode||profile.mode,readOnlyTools:explicit.readOnlyTools??profile.readOnlyTools,workingFolders:[...profile.workingFolders,...folders],folders:[...profile.folders,...folders],rules:[...profile.rules,...(explicit.rules||[])]};
  }
  /** Folders chosen as a chat's own working folders (its captured base workspace)
   * are working folders exactly like the workspace's, even when that workspace's
   * list differs. Roots contributed only by selected instruction/skill sources stay
   * source-only and gated. Explicit read-only folders remain read-only. */
  chatWorkingFolders(schedule,context,profile,snapshot){
    const existing=profile.workingFolders||[],base=schedule.context?.baseWorkspace;
    if(!this.preserveInheritedDefaults||!base?.cwd)return existing;
    const known=new Set(existing.map(folder=>folder.path)),added=[];
    for(const value of [base.cwd,...(base.additionalDirectories||[])]){
      const root=projectionPath(value,context.cwd,snapshot);
      if(!root||known.has(root)||!context.roots.includes(root))continue;
      known.add(root);
      const override=(profile.readOnlyFolders||[]).some(folder=>root===folder||within(root,folder));
      added.push({path:root,access:override?'read':'read-write',source:'chat'});
    }
    return added.length?[...existing,...added]:existing;
  }
  describeMany(schedules, snapshot = this.snapshot()) {
    // Keep the last label/ref for duplicate identities, matching the existing UI.
    const contexts = new Map();
    for (const schedule of schedules) {
      const context = projectionContext(schedule, snapshot);
      contexts.set(context.id, { context, ref: schedule.ref });
    }
    return [...contexts.values()].map(({ context, ref }) => ({ ...this.describeContext(context, snapshot), ref }));
  }
  describeRun(run,snapshot) {
    const profile=this.describeRunProfile(run,snapshot),automaticFolders=this.automaticProviderFolders?.(run,(value,cwd)=>projectionPath(value,cwd,snapshot))||[];
    return automaticFolders.length?{...profile,automaticFolders,folders:[...profile.folders,...automaticFolders]}:profile;
  }
  describeRunProfile(run, snapshot) {
    const workspace = this.describe(run.schedule, snapshot);
    const chat = run.chatPermission?.contextId === workspace.id ? run.chatPermission : null;
    if (this.preserveInheritedDefaults) {
      const chatMode = ['ask','custom','autopilot'].includes(chat?.mode) ? chat.mode : 'inherit';
      const chatFolders = chat?.folders || [], chatRules = chat?.rules || [];
      const chatReadOnlyTools = typeof chat?.readOnlyTools === 'boolean' ? chat.readOnlyTools : null;
      const hasChatGrants = chatFolders.length || chatRules.length || chatReadOnlyTools === true;
      const mode = chatMode !== 'inherit' ? chatMode : workspace.mode === 'ask' && hasChatGrants ? 'custom' : workspace.mode;
      const inheritedActive = chatMode !== 'inherit' || workspace.mode !== 'ask';
      return { ...workspace, mode, source: chatMode !== 'inherit' ? 'chat' : 'workspace', chatMode,
        folders: mode === 'ask' ? [] : [...(inheritedActive ? workspace.folders : []), ...chatFolders],
        rules: mode === 'ask' ? [] : [...(inheritedActive ? workspace.rules : []), ...chatRules],
        readOnlyTools: mode !== 'ask' && (chatReadOnlyTools ?? (inheritedActive && workspace.readOnlyTools)),
        chatFolders, chatRules, chatRuleIds:chatRules.map(permissionRuleId), chatReadOnlyTools, workspaceFolders: workspace.folders, workspaceRules: workspace.rules,
        workspaceReadOnlyTools: workspace.readOnlyTools, workspaceMode: workspace.mode,
        chatRevision: run.chatPermissionRevision || null };
    }
    const valid = chat?.mode === 'autopilot';
    const chatFolders = chat?.folders || [];
    return { ...workspace, ...(workspace.mode === 'ask' && !valid && chatFolders.length ? { rules: [], readOnlyTools: false } : {}), folders: [...(workspace.mode === 'ask' && !valid ? [] : workspace.folders), ...chatFolders], chatFolders, workspaceFolders: workspace.folders, workspaceMode: workspace.mode, mode: valid ? 'autopilot' : chatFolders.length && workspace.mode === 'ask' ? 'custom' : workspace.mode,
      source: valid ? 'chat' : 'workspace', chatMode: valid ? 'autopilot' : null,
      chatRevision: run.chatPermissionRevision || null };
  }
}

export class PermissionStore extends PermissionProjection {
  constructor(home, { preserveInheritedDefaults = false } = {}) {
    super({ preserveInheritedDefaults });
    this.file = path.join(home, 'permissions.json');
    if (!fs.existsSync(this.file)) atomicJSON(this.file, { schemaVersion: 1, workspaces: [] });
  }
  get() {
    const value = readJSON(this.file);
    if (value.schemaVersion !== 1 || !Array.isArray(value.workspaces)) throw new Error('Invalid permissions.json; restore or correct it before running tools.');
    for (const profile of value.workspaces) {
      if (!profile?.id || !permissionModes.includes(profile.mode) || !Array.isArray(profile.folders) || !Array.isArray(profile.rules)) throw new Error('Invalid workspace permission profile.');
      for (const folder of profile.folders) if (!path.isAbsolute(folder.path || '') || !['read', 'read-write'].includes(folder.access)) throw new Error('Invalid trusted folder.');
      for (const rule of profile.rules) {
        if (!['shell','mcp','custom-tool','url','chat-access'].includes(rule.kind) || (rule.kind==='chat-access'&&(!chatAccessScope(rule.scope)||rule.tool!=='proteus_chats')) || (rule.kind === 'shell' && typeof rule.command !== 'string') || (rule.kind === 'url' && typeof rule.origin !== 'string') || (['mcp','custom-tool'].includes(rule.kind) && typeof rule.tool !== 'string') || (rule.kind === 'mcp' && typeof rule.server !== 'string')) throw new Error('Invalid saved tool rule.');
      }
    }
    return { ...value, file: this.file, revision: revision(value) };
  }
  mutate(schedule, change, expectedRevision) {
    const value = this.get();
    if (expectedRevision !== undefined && expectedRevision !== value.revision) throw new Error('Permissions changed outside the app. Reload before saving.');
    const context = permissionContext(schedule);
    let profile = value.workspaces.find(item => item.id === context.id);
    if (!profile) {
      const inherited=this.preserveInheritedDefaults?this.describe(schedule):null;
      profile = { ...context, mode: inherited?.mode || 'ask', readOnlyTools: inherited?.readOnlyTools === true, folders: structuredClone(inherited?.folders || []), rules: structuredClone(inherited?.rules || []) }; value.workspaces.push(profile);
    }
    change(profile); profile.updatedAt = new Date().toISOString();
    delete value.file; delete value.revision; atomicJSON(this.file, value); return this.describe(schedule);
  }
  setMode(schedule, mode, expectedRevision) {
    if (!permissionModes.includes(mode)) throw new Error('Choose Ask, Saved rules only, Trusted workspace, or Auto-approve tools.');
    return this.mutate(schedule, profile => {
      profile.mode = mode;
      profile.readOnlyTools = ['trusted', 'autopilot'].includes(mode);
      if (profile.readOnlyTools) for (const root of permissionContext(schedule).roots) {
        if (!fs.statSync(root).isDirectory()) throw new Error(`Workspace directory unavailable: ${root}`);
        const old = profile.folders.find(folder => folder.path === root);
        if (old) old.access = 'read-write'; else profile.folders.push({ path: root, access: 'read-write' });
      }
    }, expectedRevision);
  }
  migrateWorkspaces(config) {
    const value = this.get(); if (value.workspaceIdentityMigration) return;
    const legacy = value.workspaces.filter(profile => !profile.workspaceId);
    for (const workspace of config.workspaces) for (const source of legacy) {
      if (![workspace.cwd, ...workspace.additionalDirectories].includes(source.cwd)) continue;
      const context = { workspaceId: workspace.id, provider: source.provider, cwd: source.cwd, roots: source.roots, integrations: source.integrations };
      value.workspaces.push({ ...structuredClone(source), ...context, id: hash(context), migratedFrom: source.id });
    }
    value.workspaceIdentityMigration = 1; delete value.file; delete value.revision; atomicJSON(this.file, value);
  }
  configureWorkspace(workspaceId, configuration, { replaceFolders = false, replaceRules = false, removedFolders = [] } = {}) {
    const value = this.get();
    for (const profile of value.workspaces.filter(item => item.workspaceId === workspaceId)) {
      profile.mode = configuration.mode;
      profile.readOnlyTools = this.preserveInheritedDefaults ? configuration.readOnlyTools === true : ['trusted','autopilot'].includes(configuration.mode);
      const folders = replaceFolders ? [] : profile.folders.filter(folder => !this.preserveInheritedDefaults || !removedFolders.includes(folder.path));
      for (const folder of configuration.folders || []) {
        const existing = folders.find(item => item.path === folder.path);
        if (existing) { if (this.preserveInheritedDefaults || folder.access === 'read-write') existing.access = folder.access; }
        else folders.push(structuredClone(folder));
      }
      profile.folders = folders;
      profile.rules = replaceRules ? [] : profile.rules;
      for (const rule of configuration.rules || []) if (!profile.rules.some(item => hash(item) === hash(rule))) profile.rules.push(structuredClone(rule));
      profile.updatedAt = new Date().toISOString();
    }
    delete value.file; delete value.revision; atomicJSON(this.file, value);
  }
  copyWorkspace(sourceId, targetId) {
    const value = this.get();
    for (const source of value.workspaces.filter(profile => profile.workspaceId === sourceId)) {
      const context = { workspaceId: targetId, provider: source.provider, cwd: source.cwd, roots: source.roots, integrations: source.integrations };
      value.workspaces.push({ ...structuredClone(source), ...context, id: hash(context), updatedAt: new Date().toISOString() });
    }
    delete value.file; delete value.revision; atomicJSON(this.file, value);
  }
  revoke(id, expectedRevision) {
    const value = this.get();
    if (value.revision !== expectedRevision) throw new Error('Permissions changed outside the app. Reload before saving.');
    value.workspaces = value.workspaces.filter(item => item.id !== id);
    delete value.file; delete value.revision; atomicJSON(this.file, value);
  }
  folderOffer(schedule, request) {
    if (!['read', 'write'].includes(request.kind) || protectedRequest(request)) return null;
    const context = permissionContext(schedule); const target = requestedPath(request, context); if (!target) return null;
    let folder = context.roots.filter(root => within(target, root)).sort((a,b) => b.length - a.length)[0];
    if (!folder) { try { folder = fs.statSync(target).isDirectory() ? target : path.dirname(target); } catch { folder = path.dirname(target); } }
    try { if (!fs.statSync(folder).isDirectory()) return null; } catch { return null; }
    return { path: folder, access: request.kind === 'write' ? 'read-write' : 'read' };
  }
  choices(schedule, request) {
    if (protectedRequest(request)) return [];
    if(request.kind==='schedule-access')return operationRule(request)?[...(this.preserveInheritedDefaults?[{value:'always-tool-chat',label:'Remember this exact schedule scope for this chat'}]:[]),{value:'always-tool',label:'Remember this exact schedule scope for this workspace or schedule'}]:[];
    if(request.kind==='chat-access')return operationRule(request)?[...(this.preserveInheritedDefaults?[{value:'always-tool-chat',label:'Remember this conversation access scope for this chat'}]:[]),{value:'always-tool',label:'Remember this conversation access scope for this workspace or schedule'}]:[];
    const choices = [];
    if(schedule.permissionScope?.kind==='schedule'&&request.kind==='scoped-command'&&isOwnerScopedCommandRequest(request)&&request.commandIdentity?.digest)choices.push({value:'allow-schedule',label:'Allow this exact scoped command for this schedule (saved automatically)'},{value:'allow-schedule-scoped',label:'Allow command variations inside these exact sandbox folders for this schedule (saved automatically)'});
    if(schedule.permissionScope?.kind==='schedule'&&!protectedRequest(request)&&request.kind!=='shell'&&(this.folderOffer(schedule,request)||operationRule(request)&&!['chat-access','schedule-access'].includes(request.kind)))choices.push({value:'allow-schedule',label:`Allow ${this.folderOffer(schedule,request)?this.folderOffer(schedule,request).path:ruleLabel(operationRule(request))} for this schedule (saved automatically)`});
    const folder = this.folderOffer(schedule, request);
    if (folder) choices.push({ value: 'trust-folder-chat', label: `Allow ${folder.access === 'read' ? 'reads' : 'reads and writes'} in ${folder.path} for this chat` });
    if (folder) choices.push({ value: 'trust-folder', label: `Always allow ${folder.access === 'read' ? 'reads' : 'reads and writes'} in ${folder.path}${schedule.permissionScope?.kind==='schedule'?' for this schedule':''}` });
    if (this.preserveInheritedDefaults && operationRule(request)) choices.push({ value: 'always-tool-chat', label: `Allow ${ruleLabel(operationRule(request))} for this chat` });
    if (operationRule(request)) choices.push({ value: 'always-tool', label: `Always allow ${ruleLabel(operationRule(request))}${schedule.permissionScope?.kind==='schedule'?' for this schedule':''}` });
    // Whole-workspace modes must not silently approve a one-off outside path.
    if (!['read','write'].includes(request.kind) || (requestedPath(request, permissionContext(schedule)) && permissionContext(schedule).roots.some(root => within(requestedPath(request, permissionContext(schedule)), root)))) {
      choices.push({ value: 'trust-workspace', label: schedule.permissionScope?.kind==='schedule'?'Approve and save schedule trust':'Approve and save workspace trust' });
      choices.push({ value: 'autopilot-workspace', label: schedule.permissionScope?.kind==='schedule'?'Save auto-approval for this schedule':'Save auto-approval for this workspace' });
    }
    return choices;
  }
  remember(schedule, request, answer) {
    if (['always-tool-chat','trust-folder-chat'].includes(answer)) throw new Error('Chat approvals must be saved on the requesting chat.');
    if (!this.choices(schedule, request).some(choice => choice.value === answer)) throw new Error('That persistent approval is not available for this request.');
    if (answer === 'trust-workspace' || answer === 'autopilot-workspace') return this.setMode(schedule, answer === 'trust-workspace' ? 'trusted' : 'autopilot');
    return this.mutate(schedule, profile => {
      if (profile.mode === 'ask') profile.mode = 'custom';
      if (answer === 'trust-folder') {
        const folder = this.folderOffer(schedule, request); const old = profile.folders.find(value => value.path === folder.path);
        if (old && folder.access === 'read-write') old.access = folder.access; else if (!old) profile.folders.push(folder);
      } else { const rule = operationRule(request); if (!profile.rules.some(value => hash(value) === hash(rule))) profile.rules.push(rule); }
    });
  }
  decide(schedule, request, profile = this.describe(schedule)) {
    if (protectedRequest(request)) return { allowed: false, reason: request.kind==='folder-access'?'Adding folder access requires your approval.':'Enterprise policy or sandbox escape requires a direct response.' };
    // Connecting the selected server is a prerequisite for a specifically granted
    // tool, not permission to invoke its other tools. Each invocation still gates.
    if(request.kind==='mcp-connect'){
      const allowed=(profile.scheduleRules||[]).some(rule=>rule.kind==='mcp'&&rule.server===request.serverName)||profile.mode!=='ask'&&(profile.mode==='autopilot'||profile.readOnlyTools===true||profile.rules.some(rule=>rule.kind==='mcp'&&rule.server===request.serverName&&rule.tool&&rule.tool!=='*'));
      return {allowed,reason:allowed?'Connect server for explicitly granted tools':'Server connection requires approval',mode:profile.mode};
    }
    // The owner creates this request for an exact durable chat scope. A generic
    // saved tool invocation must never turn into permission to grant new scopes.
    if(request.kind==='schedule-access'){const valid=!!operationRule(request),remembered=valid&&profile.mode!=='ask'&&profile.rules.some(rule=>matchesScheduleAccess(rule,request.args.scope));return {allowed:valid&&(profile.mode==='autopilot'||remembered),reason:remembered?'Saved exact schedule scope':'Schedule scope requires approval',mode:profile.mode};}
    if (request.kind === 'chat-access') {
      const scope=request.toolName==='proteus_chats'&&chatAccessScope(request.args?.scope);
      const automatic=!!scope&&profile.mode==='autopilot',remembered=!!scope&&profile.mode!=='ask'&&profile.rules.some(rule=>matchesChatAccess(rule,scope));
      return {allowed:automatic||remembered,reason:remembered?'Saved conversation scope approval':automatic?(profile.source==='chat'?'Chat-only auto-approval':'Workspace auto-approval'):'Chat access scope requires approval',mode:profile.mode};
    }
    if(['read','write'].includes(request.kind)){
      const target=requestedPath(request,profile),folder=(profile.automaticFolders||[]).find(folder=>folder.source==='provider'&&canonicalPath(folder.path,profile.cwd)===folder.path&&target&&within(target,folder.path));
      if(folder)return {allowed:true,reason:'Automatic provider working folder',mode:profile.mode,resolvedTarget:target,matchedRoot:folder.path,source:'provider'};
    }
    if(this.preserveInheritedDefaults&&['read','write'].includes(request.kind)){
      const target=requestedPath(request,profile);
      const folders=[...(profile.workingFolders||[]),...(profile.folders||[]),...(profile.readOnlyFolders||[]).map(path=>({path,access:'read'}))].filter(folder=>canonicalPath(folder.path,profile.cwd)===folder.path&&target&&within(target,folder.path)).sort((a,b)=>b.path.length-a.path.length||Number(a.access==='read-write')-Number(b.access==='read-write'));
      const matched=folders[0];
      if(matched)return {allowed:request.kind==='read'||matched.access==='read-write',reason:matched.access==='read'?'Read-only working folder':'Workspace folder access',mode:profile.mode,resolvedTarget:target,matchedRoot:matched.path,source:'workspace'};
    }
    const scheduledRule=operationRule(request);
    if(scheduledRule&&(profile.scheduleRules||[]).some(rule=>hash(rule)===hash(scheduledRule)))return {allowed:true,reason:'Explicit saved schedule operation',mode:profile.mode,source:'schedule'};
    if(['read','write'].includes(request.kind)){const target=requestedPath(request,profile),folder=(profile.scheduleFolders||[]).find(folder=>canonicalPath(folder.path,profile.cwd)===folder.path&&target&&within(target,folder.path)&&(request.kind==='read'||folder.access==='read-write'));if(folder)return {allowed:true,reason:'Explicit saved schedule folder',mode:profile.mode,source:'schedule'};}
    if (profile.mode === 'ask') return { allowed: false, reason: 'Ask for approval' };
    if (['read','write'].includes(request.kind)) {
      const target = requestedPath(request, profile);
      const matched = target && profile.folders.find(folder => {
        const current = canonicalPath(folder.path, profile.cwd);
        return current === folder.path && within(target, folder.path) && (request.kind === 'read' || folder.access === 'read-write');
      });
      return { allowed: !!matched, reason: matched ? 'Trusted folder' : 'Outside trusted folders', mode: profile.mode,...(matched?{resolvedTarget:target,matchedRoot:matched.path,...(this.preserveInheritedDefaults?{source:(profile.chatFolders || []).some(folder=>hash(folder)===hash(matched))?'chat':'workspace'}:{})}:{}) };
    }
    const rule = operationRule(request);
    if (rule && profile.rules.some(value => hash(value) === hash(rule))) return { allowed: true, reason: 'Saved operation approval', mode: profile.mode, ...(this.preserveInheritedDefaults ? {source:(profile.chatRules || []).some(value=>hash(value)===hash(rule))?'chat':'workspace'} : {}) };
    if (profile.mode === 'autopilot' && knownKinds.has(request.kind)) return { allowed: true, reason: profile.source === 'chat' ? 'Chat-only auto-approval' : 'Workspace auto-approval', mode: profile.mode };
    if (profile.readOnlyTools && ((request.kind === 'mcp' && request.readOnly === true) || (request.kind === 'custom-tool' && request.toolName === 'proteus_browser' && (this.preserveInheritedDefaults ? previewBrowserReads : browserReads).has(request.args?.action)))) return { allowed: true, reason: 'Trusted workspace read-only tool', mode: profile.mode, ...(this.preserveInheritedDefaults ? {source:profile.chatReadOnlyTools === true ? 'chat' : 'workspace'} : {}) };
    return { allowed: false, reason: 'No saved approval', mode: profile.mode };
  }
}
