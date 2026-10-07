import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { atomicJSON, readJSON } from './files.js';
import { revision } from './schedules.js';

export const permissionModes = ['ask', 'custom', 'trusted', 'autopilot'];
export const effectivePermissionMode = profile => profile?.mode === 'trusted' && profile.readOnlyTools !== true ? 'custom' : profile?.mode || 'ask';
const browserReads = new Set(['list', 'open', 'navigate', 'snapshot', 'scroll', 'close']);
const knownKinds = new Set(['read', 'write', 'shell', 'mcp', 'url', 'custom-tool']);
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
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
export function permissionContext(schedule) {
  const cwd = canonicalPath(schedule.workspace.cwd, schedule.workspace.cwd) || schedule.workspace.cwd;
  const roots = [...new Set([cwd, ...schedule.workspace.additionalDirectories.map(dir => canonicalPath(dir, cwd) || dir)])].sort();
  const context = { provider: schedule.provider, cwd, roots, integrations: hash({ mcp: schedule.mcpServers || {}, selectedTools: (schedule.context?.entries || []).filter(entry => ['mcp', 'skill', 'agent'].includes(entry.kind)).map(entry => ({ id: entry.id, hash: entry.hash })), skills: (schedule.skillDirectories || []).map(dir => canonicalPath(dir, cwd) || dir).sort() }) };
  return { ...context, id: hash(context), label: schedule.name || path.basename(cwd) };
}
const protectedRequest = request => request.managedApprovalRequired === true || request.requestSandboxBypass === true;
const requestedPath = (request, context) => canonicalPath(request.resolvedPath || (request.kind === 'read' ? request.path : request.fileName), context.cwd);

export function operationRule(request) {
  if (request.kind === 'shell' && typeof request.fullCommandText === 'string') return { kind: 'shell', command: request.fullCommandText };
  if (request.kind === 'mcp' && request.serverName && request.toolName) return { kind: 'mcp', server: request.serverName, tool: request.toolName, ...(typeof request.args?.action === 'string' ? { action: request.args.action } : {}) };
  if (request.kind === 'custom-tool' && request.toolName) return { kind: 'custom-tool', tool: request.toolName, ...(typeof request.args?.action === 'string' ? { action: request.args.action } : {}) };
  if (request.kind === 'url') { try { const url = new URL(request.url); if (['https:', 'http:'].includes(url.protocol)) return { kind: 'url', origin: url.origin }; } catch { /* No repeatable rule. */ } }
  return null;
}
export const ruleLabel = rule => rule.kind === 'shell' ? `Exact command: ${rule.command}` : rule.kind === 'url' ? rule.origin : `${rule.server ? `${rule.server} / ` : ''}${rule.tool}${rule.action ? ` / ${rule.action}` : ''}`;

export class PermissionStore {
  constructor(home) {
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
        if (!['shell','mcp','custom-tool','url'].includes(rule.kind) || (rule.kind === 'shell' && typeof rule.command !== 'string') || (rule.kind === 'url' && typeof rule.origin !== 'string') || (['mcp','custom-tool'].includes(rule.kind) && typeof rule.tool !== 'string') || (rule.kind === 'mcp' && typeof rule.server !== 'string')) throw new Error('Invalid saved tool rule.');
      }
    }
    return { ...value, file: this.file, revision: revision(value) };
  }
  describe(schedule) {
    const context = permissionContext(schedule); const saved = this.get().workspaces.find(value => value.id === context.id);
    return { ...context, mode: effectivePermissionMode(saved), readOnlyTools: saved?.readOnlyTools === true, folders: saved?.folders || [], rules: saved?.rules || [] };
  }
  describeRun(run) {
    const workspace = this.describe(run.schedule);
    const valid = run.chatPermission?.contextId === workspace.id && run.chatPermission?.mode === 'autopilot';
    return { ...workspace, workspaceMode: workspace.mode, mode: valid ? 'autopilot' : workspace.mode,
      source: valid ? 'chat' : 'workspace', chatMode: valid ? 'autopilot' : null,
      chatRevision: run.chatPermissionRevision || null };
  }
  mutate(schedule, change, expectedRevision) {
    const value = this.get();
    if (expectedRevision !== undefined && expectedRevision !== value.revision) throw new Error('Permissions changed outside the app. Reload before saving.');
    const context = permissionContext(schedule);
    let profile = value.workspaces.find(item => item.id === context.id);
    if (!profile) { profile = { ...context, mode: 'ask', readOnlyTools: false, folders: [], rules: [] }; value.workspaces.push(profile); }
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
    const choices = [];
    const folder = this.folderOffer(schedule, request);
    if (folder) choices.push({ value: 'trust-folder', label: `Always allow ${folder.access === 'read' ? 'reads' : 'reads and writes'} in ${folder.path}` });
    if (operationRule(request)) choices.push({ value: 'always-tool', label: `Always allow ${ruleLabel(operationRule(request))}` });
    // Whole-workspace modes must not silently approve a one-off outside path.
    if (!['read','write'].includes(request.kind) || (requestedPath(request, permissionContext(schedule)) && permissionContext(schedule).roots.some(root => within(requestedPath(request, permissionContext(schedule)), root)))) {
      choices.push({ value: 'trust-workspace', label: 'Approve and save workspace trust' });
      choices.push({ value: 'autopilot-workspace', label: 'Save auto-approval for this workspace' });
    }
    return choices;
  }
  remember(schedule, request, answer) {
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
    if (protectedRequest(request)) return { allowed: false, reason: 'Enterprise policy or sandbox escape requires a direct response.' };
    if (profile.mode === 'ask') return { allowed: false, reason: 'Ask for approval' };
    if (['read','write'].includes(request.kind)) {
      const target = requestedPath(request, profile);
      const matched = target && profile.folders.find(folder => {
        const current = canonicalPath(folder.path, profile.cwd);
        return current === folder.path && within(target, folder.path) && (request.kind === 'read' || folder.access === 'read-write');
      });
      return { allowed: !!matched, reason: matched ? 'Trusted folder' : 'Outside trusted folders', mode: profile.mode,...(matched?{resolvedTarget:target,matchedRoot:matched.path}:{}) };
    }
    const rule = operationRule(request);
    if (rule && profile.rules.some(value => hash(value) === hash(rule))) return { allowed: true, reason: 'Saved operation approval', mode: profile.mode };
    if (profile.mode === 'autopilot' && knownKinds.has(request.kind)) return { allowed: true, reason: profile.source === 'chat' ? 'Chat-only auto-approval' : 'Workspace auto-approval', mode: profile.mode };
    if (profile.readOnlyTools && ((request.kind === 'mcp' && request.readOnly === true) || (request.kind === 'custom-tool' && request.toolName === 'proteus_browser' && browserReads.has(request.args?.action)))) return { allowed: true, reason: 'Trusted workspace read-only tool', mode: profile.mode };
    return { allowed: false, reason: 'No saved approval', mode: profile.mode };
  }
}
