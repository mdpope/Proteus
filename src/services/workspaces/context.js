import fs from 'node:fs';
import { contextPlan } from '../../../public/features/workspaces/context-plan.js';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { atomicJSON, readJSON, isWithin } from '../../shared/files.js';
import { revision } from '../scheduling/schedules.js';
import { agentMetadata } from '../chats/agent-tools.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const modes = new Set(['universal', 'workspace', 'available', 'disabled']);
export const discoveryExclusions = ['.git', 'node_modules', '.venv', 'venv', '__pycache__', '.next', 'bin', 'obj', 'dist', 'build', '.obsidian', '.trash', 'vendor', '.cache', '.build', 'DerivedData', '.swiftpm', 'Pods', 'Carthage'];
const scopedKeys = ['libraryFolders', 'universalFolders', 'documents', 'modes', 'workspaceFiles', 'defaults', 'discovery', 'approvals'];
// Compile this operation's current policy once, rather than constructing each
// expression again for every source path. No matcher survives a settings read.
const exclusionMatcher = (patterns, inclusions = []) => {
  const expressions = patterns.map(pattern => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replaceAll('**','\u0000').replaceAll('*','[^/]*').replaceAll('\u0000','.*');
    return { relative: pattern.includes('/'), expression: new RegExp('^'+escaped+'$') };
  });
  return (file, root) => {
    const relative = path.relative(root,file).split(path.sep).join('/');
    if(inclusions.some(item => relative===item || relative.startsWith(item+'/') || item.startsWith(relative+'/')))return false;
    const parts = relative.split('/');
    return expressions.some(rule => rule.relative ? rule.expression.test(relative) : parts.some(part => rule.expression.test(part)));
  };
};
const emptyScope = () => ({ libraryFolders: [], universalFolders: [], documents: [], modes: {}, favorites: [], workspaceFiles: [], defaults: {}, discovery: { exclusions: [...discoveryExclusions], inclusions: [], maxFolders: 60000 }, approvals: { mode: 'ask', folders: [], rules: [], readOnlyTools: false } });
const unique = values => [...new Set(values)];
const mcpBatchLimits = { catalogs: 128, sources: 128, sourceBytes: 4 * 1024 * 1024, paths: 512 };
export function parseJSONC(text) {
  // Remove comments and trailing commas without touching quoted strings/URLs.
  const stripped = text.replace(/"(?:\\.|[^"\\])*"|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g, token => token.startsWith('"') ? token : token.replace(/[^\r\n]/g, ' '));
  return JSON.parse(stripped.replace(/"(?:\\.|[^"\\])*"|,\s*(?=[}\]])/g, token => token.startsWith('"') ? token : ''));
}
export function markdownMetadata(text, file) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const fields = {};
  if (match) for (const line of match[1].split('\n')) {
    const field = line.match(/^([\w-]+):\s*(.*?)\s*$/);
    if (field) fields[field[1]] = field[2].replace(/^['"]|['"]$/g, '');
  }
  const content = match ? text.slice(match[0].length) : text;
  return { fields, name: fields.name || content.match(/^#\s+(.+)$/m)?.[1] || path.basename(file), description: fields.description || '', applyTo: fields.applyTo || fields.paths || '', content };
}
function kindFor(file) {
  if (path.basename(file) === 'SKILL.md') return 'skill';
  if (file.endsWith('.agent.md') || /[/\\](?:agents|agent)[/\\][^/\\]+\.md$/.test(file)) return 'agent';
  if (['AGENTS.md', 'CLAUDE.md', 'copilot-instructions.md'].includes(path.basename(file)) || file.endsWith('.instructions.md') || /[/\\]\.claude[/\\]rules[/\\].+\.md$/.test(file)) return 'instruction';
  return null;
}
function directory(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || !fs.statSync(value).isDirectory()) throw new Error('Choose an existing absolute folder path.');
  return fs.realpathSync(value);
}
function readDocument(file) {
  if (fs.statSync(file).size > 256_000) throw new Error('Instruction is larger than 256 KB.');
  return fs.readFileSync(file, 'utf8');
}
export class ContextStore {
  constructor(home, settings, { skipRefresh = false } = {}) {
    this.home = home; this.settings = settings; this.file = path.join(home, 'context.json'); this.catalogFile = path.join(home, 'context-catalog.json'); this.catalog = readJSON(this.catalogFile, { entries: [] });
    if (!fs.existsSync(this.file)) {
      const defaults = settings.get();
      atomicJSON(this.file, { schemaVersion: 1, defaultWorkspaceId: 'default', workspaces: [{ id: 'default', name: defaults.workspaceImport?.name || 'Default workspace', ...defaults.workspace }], libraryFolders: [], universalFolders: [], documents: [], modes: {}, workspaceFiles: defaults.workspaceImport?.source ? [defaults.workspaceImport.source] : [] });
    }
    const data = readJSON(this.file);
    if (!data.workspaceConfigurationVersion) {
      if (!fs.existsSync(this.file + '.before-workspaces')) atomicJSON(this.file + '.before-workspaces', data);
      for (const profile of data.workspaces) for (const key of scopedKeys) profile[key] ??= structuredClone(data[key] ?? emptyScope()[key]);
      data.workspaceConfigurationVersion = 1; atomicJSON(this.file, data);
    }
    // Merge legacy bookmarks once. Later removals must not be resurrected by
    // stale workspace copies; the root list is authoritative after migration.
    if (!data.favoritesConfigurationVersion) {
      const lists = [data.favorites ?? [], ...data.workspaces.map(w => w.favorites ?? [])];
      if (lists.some(list => !Array.isArray(list) || list.some(id => typeof id !== 'string'))) throw new Error('Favorites must be source IDs.');
      data.favorites = unique(lists.flat()); data.favoritesConfigurationVersion = 1;
      for (const profile of data.workspaces) profile.favorites = [...data.favorites];
      atomicJSON(this.file, data);
    }
    if (!skipRefresh) this.refresh();
  }
  config() {
    const data = readJSON(this.file), diskRevision = revision(data);
    if (data.schemaVersion !== 1 || !Array.isArray(data.workspaces) || !data.workspaces.length || !data.modes || !Array.isArray(data.libraryFolders) || !Array.isArray(data.documents) || !Array.isArray(data.workspaceFiles)) throw new Error('Invalid context.json.');
    if (data.favorites !== undefined && (!Array.isArray(data.favorites) || data.favorites.some(id => typeof id !== 'string'))) throw new Error('Favorites must be source IDs.');
    for (const workspace of data.workspaces) workspace.favorites = [...(data.favorites || [])];
    const profile = data.workspaces.find(w => w.id === data.defaultWorkspaceId);
    return { ...data, ...Object.fromEntries(scopedKeys.map(key => [key, structuredClone(profile?.[key] ?? data[key] ?? emptyScope()[key])])), file: this.file, revision: diskRevision };
  }
  roots(config = this.config()) { return unique(config.workspaces.flatMap(w => [w.cwd, ...(w.additionalDirectories || []), ...(w.libraryFolders || []), ...(w.universalFolders || [])])); }
  scope(workspaceId, config = this.config()) { const profile = config.workspaces.find(w => w.id === (workspaceId || config.defaultWorkspaceId)); if (!profile) throw new Error('Workspace not found.'); return profile; }
  executionScope(workspaceId,config=this.config()){return config.workspaces.find(w=>w.id===(workspaceId||config.defaultWorkspaceId))||(config.archivedWorkspaces||[]).find(w=>w.id===workspaceId)||this.scope(workspaceId,config);}
  scopedConfig(workspaceId,{execution=false}={}) { const config = this.config(), profile = execution?this.executionScope(workspaceId,config):this.scope(workspaceId, config); return { ...config, ...Object.fromEntries(scopedKeys.map(key => [key, structuredClone(profile[key] ?? emptyScope()[key])])), workspaceId: profile.id }; }
  get(workspaceId,options={}) {
    const config = this.scopedConfig(workspaceId,options);
    const profile = options.execution?this.executionScope(workspaceId,config):this.scope(workspaceId,config), roots = [profile.cwd,...profile.additionalDirectories,...profile.libraryFolders,...profile.universalFolders];
    const excluded = exclusionMatcher(profile.discovery.exclusions,profile.discovery.inclusions);
    const localSource = entry => config.documents.some(doc => doc.path === entry.path) || config.workspaceFiles.includes(entry.path) || entry.roots.some(root => roots.includes(root) && !excluded(entry.path,root));
    return { ...config, ...this.catalog, approvalProfiles: this.permissionStore?.get().workspaces.filter(item => item.workspaceId === profile.id) || [], entries: this.catalog.entries.filter(entry => config.documents.some(doc => doc.path === entry.path) || config.workspaceFiles.includes(entry.path) || entry.roots.some(root => roots.includes(root) && !excluded(entry.path,root)) || Object.hasOwn(config.modes,entry.id) || config.favorites.includes(entry.id) || (profile.defaults.selectedIds||[]).includes(entry.id)).map(entry => ({ ...entry, defaultMode: localSource(entry) ? entry.defaultMode : entry.kind === 'mcp' ? 'disabled' : 'available', mode: config.modes[entry.id] || (localSource(entry) ? entry.defaultMode : entry.kind === 'mcp' ? 'disabled' : 'available') })) };
  }
  save(value, expectedRevision) {
    if (this.config().revision !== expectedRevision) throw new Error('Workspace settings changed. Refresh before saving.');
    const previous = this.config();
    const config = structuredClone(value); delete config.file; delete config.revision;
    const existingRoots = new Set(this.roots(previous));
    const existingDocuments = new Set(previous.workspaces.flatMap(profile => profile.documents || []).map(doc => doc.path));
    const validateFolder = folder => { try { return directory(folder); } catch (error) { if (existingRoots.has(folder)) return folder; throw error; } };
    // Honor explicit legacy scoped edits, but never let a new workspace's empty
    // initialization or unchanged copies replace the shared list.
    const edits = config.workspaces.filter(w => previous.workspaces.some(old => old.id === w.id) && w.favorites !== undefined && revision(w.favorites) !== revision(previous.favorites)).map(w => w.favorites);
    if (revision(config.favorites) !== revision(previous.favorites)) edits.push(config.favorites);
    if (new Set(edits.map(value => revision(value))).size > 1) throw new Error('Conflicting shared favorites. Refresh before saving.');
    config.favorites = edits[0] ?? previous.favorites;
    const defaultProfile = config.workspaces.find(w => w.id === config.defaultWorkspaceId);
    // Legacy callers edit the top-level projection. Explicit scoped callers edit profiles.
    for (const key of scopedKeys) if (revision(config[key]) !== revision(previous[key])) defaultProfile[key] = structuredClone(config[key]);
    if (config.schemaVersion !== 1 || !Array.isArray(config.workspaces) || !config.workspaces.length || !config.workspaces.some(w => w.id === config.defaultWorkspaceId)) throw new Error('Choose a default workspace.');
    const ids = new Set();
    for (const workspace of config.workspaces) {
      if (!/^[\w-]+$/.test(workspace.id) || ids.has(workspace.id) || !workspace.name?.trim()) throw new Error('Workspaces need unique IDs and names.');
      ids.add(workspace.id); workspace.cwd = validateFolder(workspace.cwd);
      for (const key of scopedKeys) workspace[key] ??= structuredClone(emptyScope()[key]);
      workspace.libraryFolders = unique(workspace.libraryFolders.map(validateFolder));
      workspace.universalFolders = unique(workspace.universalFolders.map(validateFolder));
      for (const mode of Object.values(workspace.modes)) if (!modes.has(mode)) throw new Error('Invalid context selection mode.');
      if (!Array.isArray(workspace.discovery.exclusions) || workspace.discovery.exclusions.some(value => typeof value !== 'string' || !value.trim() || value.length > 300)) throw new Error('Exclusions must be folder names or relative path patterns.');
      if (!Array.isArray(workspace.discovery.inclusions || []) || (workspace.discovery.inclusions || []).some(item => typeof item !== 'string' || !item || path.isAbsolute(item) || item.split('/').includes('..'))) throw new Error('Inclusions must be relative paths inside the source folder.');
      if (!Number.isInteger(workspace.discovery.maxFolders) || workspace.discovery.maxFolders < 1 || workspace.discovery.maxFolders > 1000000) throw new Error('Invalid folder scan budget.');
      if (!['ask','custom','trusted','autopilot'].includes(workspace.approvals.mode) || !Array.isArray(workspace.approvals.folders) || !Array.isArray(workspace.approvals.rules)) throw new Error('Invalid workspace approvals.');
      for (const grant of workspace.approvals.folders) { grant.path = directory(grant.path); if (!['read','read-write'].includes(grant.access)) throw new Error('Invalid folder access.'); }
      workspace.favorites ??= [];
      if (!Array.isArray(workspace.favorites) || workspace.favorites.some(id => typeof id !== 'string')) throw new Error('Favorites must be source IDs.');
      if (workspace.defaults.includeDefaults !== undefined && typeof workspace.defaults.includeDefaults !== 'boolean' || workspace.defaults.selectedIds !== undefined && (!Array.isArray(workspace.defaults.selectedIds) || workspace.defaults.selectedIds.some(id => typeof id !== 'string'))) throw new Error('Invalid workspace chat defaults.');
      for (const rule of workspace.approvals.rules) if (!['shell','mcp','custom-tool','url'].includes(rule.kind)) throw new Error('Invalid saved approval rule.');
      for (const doc of workspace.documents) if (!path.isAbsolute(doc.path) || !['instruction', 'skill', 'agent'].includes(doc.kind) || !existingDocuments.has(doc.path) && !fs.statSync(doc.path).isFile()) throw new Error('Invalid source document.');
      workspace.additionalDirectories = unique(workspace.additionalDirectories.map(validateFolder)).filter(p => p !== workspace.cwd);
    }
    config.libraryFolders = unique(config.libraryFolders.map(validateFolder));
    config.universalFolders = unique((config.universalFolders || []).map(validateFolder));
    for (const doc of config.documents) if (!path.isAbsolute(doc.path) || !['instruction', 'skill', 'agent'].includes(doc.kind) || !existingDocuments.has(doc.path) && !fs.statSync(doc.path).isFile()) throw new Error('Choose an existing instruction, skill, or agent file.');
    for (const file of config.workspaceFiles) if (!path.isAbsolute(file) || !file.endsWith('.code-workspace')) throw new Error('Choose a VS Code workspace file.');
    for (const mode of Object.values(config.modes)) if (!modes.has(mode)) throw new Error('Invalid context selection mode.');
    if (!Array.isArray(config.favorites || []) || (config.favorites || []).some(id => typeof id !== 'string')) throw new Error('Favorites must be source IDs.');
    config.favorites = unique(config.favorites || []);
    config.favoritesConfigurationVersion = 1;
    for (const workspace of config.workspaces) workspace.favorites = [...config.favorites];
    for (const key of scopedKeys) config[key] = structuredClone(defaultProfile[key]);
    atomicJSON(this.file, config);
    const scanShape = value => value.workspaces.map(w => [w.cwd, w.additionalDirectories, w.libraryFolders, w.universalFolders, w.documents, w.workspaceFiles, w.discovery]);
    if (revision(scanShape(previous)) !== revision(scanShape(config))) { if (this.deferRefresh) this.scanPending = true; else this.refresh(); }
    return this.get();
  }
  deleteWorkspace(id,expectedRevision){
    const config=this.config();if(config.revision!==expectedRevision)throw new Error('Workspace settings changed. Refresh before deleting.');
    const profile=this.scope(id,config);
    return this.mutate(value=>{
      value.archivedWorkspaces??=[];
      if(!value.archivedWorkspaces.some(item=>item.id===id))value.archivedWorkspaces.push({...structuredClone(profile),deletedAt:new Date().toISOString()});
      value.workspaces=value.workspaces.filter(item=>item.id!==id);
      if(!value.workspaces.length)value.workspaces.push({id:randomUUID(),name:'Default workspace',cwd:this.settings.get().workspace.cwd,additionalDirectories:[],...emptyScope()});
      if(value.defaultWorkspaceId===id)value.defaultWorkspaceId=value.workspaces[0].id;
      const next=value.workspaces.find(item=>item.id===value.defaultWorkspaceId);
      for(const key of scopedKeys)value[key]=structuredClone(next[key]);
    },expectedRevision);
  }
  favorite(id, enabled, expectedRevision, workspaceId) {
    if (typeof enabled !== 'boolean' || !this.get(workspaceId).entries.some(e => e.id === id)) throw new Error('Choose an existing context source.');
    const config = this.config();
    if (config.revision !== expectedRevision) throw new Error('Workspace settings changed. Refresh before saving.');
    config.favorites = config.favorites.filter(value => value !== id);
    if (enabled) config.favorites.push(id);
    for (const profile of config.workspaces) profile.favorites = [...config.favorites];
    delete config.file; delete config.revision; atomicJSON(this.file, config); return this.get(workspaceId);
  }
  mutate(change, expectedRevision) {
    const config = this.config(); change(config); return this.save(config, expectedRevision);
  }
  reorderWorkspaces(ids,expectedRevision){
    return this.mutate(config=>{if(!Array.isArray(ids)||ids.length!==config.workspaces.length||new Set(ids).size!==ids.length||ids.some(id=>!config.workspaces.some(workspace=>workspace.id===id)))throw Error('Workspace order must include every current workspace exactly once.');const byId=new Map(config.workspaces.map(workspace=>[workspace.id,workspace]));config.workspaces=ids.map(id=>byId.get(id));},expectedRevision);
  }
  importWorkspace(file, expectedRevision) {
    if (!path.isAbsolute(file) || !file.endsWith('.code-workspace')) throw new Error('Choose a .code-workspace file.');
    const source = parseJSONC(fs.readFileSync(file, 'utf8'));
    if (!source.folders?.length) throw new Error('Workspace has no folders.');
    const folders = source.folders.map(folder => {
      if (typeof folder.path !== 'string' || folder.uri) throw new Error('Only local workspace folders are supported.');
      return directory(path.resolve(path.dirname(file), folder.path));
    });
    return this.mutate(config => {
      const id = 'workspace-' + hash(file).slice(0, 12);
      config.workspaces = config.workspaces.filter(w => w.id !== id);
      config.workspaces.push({ id, name: path.basename(file, '.code-workspace'), cwd: folders[0], additionalDirectories: unique(folders.slice(1)), workspaceFiles:[file] });
      config.workspaceFiles = unique([...config.workspaceFiles, file]);
    }, expectedRevision);
  }
  copyWorkspace(workspaceId, name, expectedRevision) {
    if (!name?.trim()) throw new Error('Name the copied workspace.');
    const id = 'workspace-' + randomUUID();
    this.mutate(config => { const source = this.scope(workspaceId, config); config.workspaces.push({ ...structuredClone(source), id, name: name.trim(), copiedFrom: source.id, createdAt: new Date().toISOString() }); }, expectedRevision);
    return { ...this.get(id), copiedWorkspaceId: id };
  }
  importConfiguration({ name, configuration, entries = [], pathMappings = [] }, expectedRevision) {
    if (!name?.trim() || !configuration || !Array.isArray(pathMappings) || !Array.isArray(entries)) throw new Error('Choose a workspace configuration and target folder mappings.');
    const mappings = pathMappings.map(item => { if (!path.isAbsolute(item.from || '')) throw new Error('Invalid source folder mapping.'); return { from: item.from, to: directory(item.to) }; }).sort((a,b) => b.from.length - a.from.length);
    const mapPath = file => { const match = mappings.find(item => file === item.from || file.startsWith(item.from + path.sep)); if (!match) throw new Error('Map every source folder to an existing folder on the target computer: ' + file); return path.resolve(match.to, path.relative(match.from,file)); };
    const id = 'workspace-' + randomUUID(), profile = { ...emptyScope(), id, name:name.trim(), cwd:mapPath(configuration.cwd), additionalDirectories:(configuration.additionalDirectories || []).map(mapPath) };
    for (const key of ['libraryFolders','universalFolders','workspaceFiles']) profile[key] = (configuration[key] || []).map(mapPath);
    profile.documents = (configuration.documents || []).map(doc => ({path:mapPath(doc.path),kind:doc.kind}));
    profile.discovery = structuredClone(configuration.discovery || profile.discovery);
    const ids = new Map(entries.map(entry => { const mapped = mapPath(entry.path); let canonical; try { canonical = fs.realpathSync(mapped); } catch { canonical = mapped; } return [entry.id,hash(canonical + (entry.kind === 'mcp' ? '#' + entry.key : ''))]; }));
    for (const [source,mode] of Object.entries(configuration.modes || {})) { if (!ids.has(source)) throw new Error('Refresh the source catalog before copying its selections.'); profile.modes[ids.get(source)] = mode; }
    profile.favorites = (configuration.favorites || []).map(source => ids.get(source)).filter(Boolean);
    const defaults = configuration.defaults || {};
    profile.defaults = { ...Object.fromEntries(['includeDefaults','provider','model','reasoningEffort','reasoningMode','contextTier','serviceTier'].filter(key => Object.hasOwn(defaults,key)).map(key => [key,defaults[key]])), selectedIds:(defaults.selectedIds || []).map(source => ids.get(source)).filter(Boolean), agentId:ids.get(defaults.agentId) || null };
    this.mutate(config => { config.favorites = unique([...config.favorites, ...profile.favorites]); config.workspaces.push(profile); }, expectedRevision);
    return { ...this.get(id), copiedWorkspaceId:id };
  }
  async refreshAsync(options = {}) {
    if (this.refreshing) { await this.refreshing; return this.refreshAsync(options); }
    this.refreshing = new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./context-worker.js', import.meta.url), { execArgv: [], workerData: { home: this.home, options } });
      worker.once('message', message => message.error ? reject(new Error(message.error)) : resolve(message.catalog));
      worker.once('error', reject); worker.once('exit', code => { if (code) reject(new Error('Folder discovery stopped unexpectedly.')); });
    });
    try { const catalog = await this.refreshing; this.catalog = catalog; return this.get(options.workspaceId); } finally { this.refreshing = null; }
  }
  refresh({ workspaceId, root: selectedRoot, nestedMcp = false } = {}) {
    const config = this.config();
    const allRoots = workspaceId ? this.roots({ workspaces: [this.scope(workspaceId, config)] }) : this.roots(config);
    if(selectedRoot)selectedRoot=directory(selectedRoot);
    if (selectedRoot && !allRoots.includes(selectedRoot)) throw new Error('Choose a configured source folder.');
    const roots = selectedRoot ? [selectedRoot] : allRoots;
    const discoveredMcp=[];
    const entries = new Map(); const errors = (this.catalog.errors || []).filter(error => !roots.some(root => error.path === root || error.path.startsWith(root + path.sep))); let visited = new Set(); let scanned = 0, policy, excluded;
    const rootStatus = { ...(this.catalog.rootStatus || {}) };
    for (const entry of this.catalog.entries || []) { const retained = (entry.roots || []).filter(root => !roots.includes(root)); if (retained.length) entries.set(entry.id, { ...entry, roots: retained }); }
    const addDocument = (file, root, explicitKind) => {
      try {
        const canonical = fs.realpathSync(file); const id = hash(canonical); const existing = entries.get(id);
        if (existing) {
          existing.sources = unique([...existing.sources, file]); existing.roots = unique([...existing.roots, root]);
          if (explicitKind) { existing.kind = explicitKind; existing.agent = explicitKind === 'agent' ? agentMetadata(readDocument(canonical)) : undefined; existing.unsupportedAgentFields = existing.agent?.issues || []; }
          return;
        }
        const text = readDocument(canonical); const meta = markdownMetadata(text, canonical); const kind = explicitKind || kindFor(file);
        const scope = meta.applyTo || (['AGENTS.md', 'CLAUDE.md'].includes(path.basename(file)) ? path.dirname(file) : path.basename(file) === 'copilot-instructions.md' ? root : 'Selected task');
        const agent = kind === 'agent' ? agentMetadata(text) : undefined;
        const defaultMode = kind === 'instruction' && [path.join(root, 'AGENTS.md'), path.join(root, 'CLAUDE.md'), path.join(root, '.github/copilot-instructions.md')].includes(file) ? 'workspace' : 'available';
        entries.set(id, { id, kind, path: canonical, sources: [file], roots: [root], name: meta.name, characters: text.length, description: meta.description, runtimeName: meta.fields.name || path.basename(path.dirname(file)), agent, unsupportedAgentFields: agent?.issues || [], scope, hash: hash(text), defaultMode });
      } catch (error) { errors.push({ path: file, message: error.message }); }
    };
    const walk = (dir, root) => {
      let real;
      try { real = fs.realpathSync(dir); } catch (error) { errors.push({ path: dir, message: error.message }); return; }
      if (!isWithin(real, roots) || visited.has(real)) return;
      visited.add(real);
      if (++scanned > policy.maxFolders) throw new Error(`Folder scan reached its ${policy.maxFolders.toLocaleString('en-US')}-folder limit. Results for this folder are incomplete; other folders were scanned independently.`);
      let files;
      try { files = fs.readdirSync(dir, { withFileTypes: true }); } catch (error) { errors.push({ path: dir, message: error.message }); return; }
      for (const entry of files) {
        const file = path.join(dir, entry.name);
        if (excluded(file,root)) continue;
        if (entry.isDirectory()) walk(file, root);
        else if (entry.isSymbolicLink()) {
          try { if (fs.statSync(file).isDirectory()) walk(file, root); else if (kindFor(file) && isWithin(file, roots)) addDocument(file, root); } catch { /* Broken aliases are not instruction sources. */ }
        } else if (entry.isFile()) {
          if(kindFor(file))addDocument(file, root);
          if(nestedMcp&&(entry.name==='.mcp.json'||['.vscode/mcp.json','.copilot/mcp.json','.copilot/mcp-config.json'].some(suffix=>file.endsWith(path.sep+suffix.split('/').join(path.sep)))))discoveredMcp.push({file,root});
        }
      }
    };
    for (const root of roots) {
      visited = new Set(); scanned = 0;
      const owners = config.workspaces.filter(w => [w.cwd, ...w.additionalDirectories, ...w.libraryFolders, ...w.universalFolders].includes(root));
      policy = owners.length ? { exclusions: owners[0].discovery.exclusions.filter(pattern => owners.every(owner => owner.discovery.exclusions.includes(pattern))), inclusions: unique(owners.flatMap(owner => owner.discovery.inclusions || [])), maxFolders: Math.max(...owners.map(owner => owner.discovery.maxFolders)) } : emptyScope().discovery;
      excluded = exclusionMatcher(policy.exclusions, policy.inclusions);
      const before = errors.length;
      try { walk(root, root); } catch (error) { errors.push({ path: root, message: error.message }); }
      rootStatus[root] = { refreshedAt: new Date().toISOString(), scannedFolders: Math.min(scanned, policy.maxFolders), partial: errors.length > before, exclusions: policy.exclusions, inclusions:policy.inclusions || [] };
    }
    for (const doc of config.workspaces.flatMap(w => w.documents)) addDocument(doc.path, path.dirname(doc.path), doc.kind);
    const mcpFiles = [...unique(config.workspaces.flatMap(w => w.workspaceFiles)).map(file => ({ file, root: path.dirname(file), workspace: true })), ...roots.flatMap(root => ['.vscode/mcp.json', '.mcp.json', '.copilot/mcp.json', '.copilot/mcp-config.json'].map(rel => ({ file: path.join(root, rel), root })))];
    for (const source of [...mcpFiles,...discoveredMcp].filter((source,index,all)=>all.findIndex(item=>item.file===source.file&&item.root===source.root)===index)) {
      if (!fs.existsSync(source.file)) continue;
      try {
        const data = parseJSONC(fs.readFileSync(source.file, 'utf8')); const cfg = source.workspace ? data.mcp || data.settings?.mcp || {} : data;
        for (const [name, definition] of Object.entries(cfg.servers || cfg.mcpServers || {})) {
          const fingerprint = revision(definition); const id = hash(fs.realpathSync(source.file) + '#' + name);
          entries.set(id, { id, kind: 'mcp', name, path: source.file, sources: [source.file], roots: [source.root], key: name, workspaceFile: source.workspace === true, hash: fingerprint, transport: definition.type || 'stdio', defaultMode: 'disabled', scope: source.root });
        }
      } catch (error) { errors.push({ path: source.file, message: error.message }); }
    }
    // Retain missing selected entries so disappearance cannot look like successful loading.
    for (const previous of this.catalog?.entries || []) if (!entries.has(previous.id) && (config.workspaces.some(w => w.modes[previous.id] || w.favorites.includes(previous.id)))) entries.set(previous.id, { ...previous, missing: true });
    this.catalog = { refreshedAt: new Date().toISOString(), rootStatus, entries: [...entries.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)), errors };
    atomicJSON(this.catalogFile, this.catalog);
    return this.get();
  }
  capture({ workspaceId, workspace, selectedIds, agentId, includeDefaults } = {}) {
    const configured = this.scope(workspaceId).defaults || {};
    const defaultOverrides = { selectedIds: selectedIds !== undefined && revision(Array.isArray(selectedIds) ? [...selectedIds].sort() : selectedIds) !== revision([...(configured.selectedIds || [])].sort()), agentId: agentId !== undefined && (agentId || null) !== (configured.agentId || null), includeDefaults: includeDefaults !== undefined && includeDefaults !== (configured.includeDefaults ?? true) };
    selectedIds ??= configured.selectedIds || []; if (agentId === undefined) agentId = configured.agentId; includeDefaults ??= configured.includeDefaults ?? true;
    if (typeof includeDefaults !== 'boolean') throw new Error('Choose whether to include default context.');
    if (agentId != null && typeof agentId !== 'string') throw new Error('Main agent must be a source ID.');
    const catalog = this.get(workspaceId); const profile = workspaceId ? catalog.workspaces.find(w => w.id === workspaceId) : workspace ? null : catalog.workspaces.find(w => w.id === catalog.defaultWorkspaceId);
    if (!profile && !workspace) throw new Error('Workspace no longer exists.');
    const original = workspace || { cwd: profile.cwd, additionalDirectories: profile.additionalDirectories };
    const cwd = directory(original.cwd), warnings = [], unavailableRoots = new Set();
    const availableDirectory = root => {
      try { return directory(root); }
      catch (error) {
        if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
        if (!unavailableRoots.has(root)) warnings.push({ path: root, code: error.code, message: `Folder unavailable; skipped its sources for this chat: ${root}` });
        unavailableRoots.add(root); return null;
      }
    };
    // Keep configured paths intact so a disconnected/restored folder remains configured.
    // Only the captured execution context omits unavailable supplemental roots.
    const roots = unique([cwd, ...original.additionalDirectories.map(availableDirectory), ...catalog.universalFolders.map(availableDirectory)].filter(Boolean));
    if (!Array.isArray(selectedIds) || selectedIds.some(id => !catalog.entries.some(e => e.id === id))) throw new Error('Refresh the context list before selecting sources.');
    if (!includeDefaults && selectedIds.some(id => catalog.entries.find(e => e.id === id)?.mode === 'disabled')) throw new Error('A selected source is disabled. Update this selection before running.');
    const chosen = contextPlan(catalog, { workspace: { cwd, additionalDirectories: original.additionalDirectories }, selectedIds, agentId, includeDefaults }).entries;
    const records = []; let total = 0;
    for (const entry of chosen) {
      const availableRoots = entry.roots.map(availableDirectory).filter(Boolean);
      const sourceFolderMissing = [...unavailableRoots].some(root => { const relative = path.relative(root, entry.path); return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)); });
      if (entry.roots.length && (!availableRoots.length || sourceFolderMissing)) {
        if (entry.id === agentId) throw new Error('The main agent folder is unavailable. Choose another main agent: ' + entry.name);
        continue;
      }
      if (entry.missing) throw new Error('Selected source is missing: ' + entry.path);
      if (entry.kind === 'agent' && entry.unsupportedAgentFields?.length) throw new Error('Agent is unavailable: ' + entry.name + '. ' + entry.unsupportedAgentFields.join('; '));
      const record = { ...entry }; delete record.defaultMode;
      if (entry.kind !== 'mcp') {
        const text = readDocument(entry.path);
        if (hash(text) !== entry.hash) throw new Error('Instructions changed. Refresh context before starting: ' + entry.name);
        total += Buffer.byteLength(text);
        if (total > 300_000) throw new Error('Selected context exceeds 300 KB. Select fewer sources for this chat.');
        record.content = text;
      } else { record.canonicalSource=fs.realpathSync(entry.path);record.canonicalRoot=fs.realpathSync(entry.roots[0]);this.resolveMcp(record, false); }
      records.push(record);
      for (const root of availableRoots) if (!roots.includes(root)) roots.push(root);
    }
    if (agentId && records.find(e => e.id === agentId)?.agent?.userInvocable === false) throw new Error('This agent cannot be selected as the main agent.');
    if (agentId && !records.some(e => e.id === agentId && e.kind === 'agent')) throw new Error('Select the agent in this chat context first.');
    return { schemaVersion: 1, baseWorkspace: { cwd, additionalDirectories: original.additionalDirectories }, followsWorkspace: !!profile && revision({ cwd, additionalDirectories: original.additionalDirectories }) === revision({ cwd: profile.cwd, additionalDirectories: profile.additionalDirectories }), workspaceId: profile?.id || null, workspaceName: profile?.name || path.basename(cwd), configurationRevision: profile ? revision(profile) : catalog.revision, defaultOverrides, includeDefaults, selectedIds, agentId: agentId || null, capturedAt: new Date().toISOString(), workspace: { cwd, additionalDirectories: roots.filter(root => root !== cwd) }, entries: records, warnings };
  }
  resolveMcp(record, resolveEnvironment = true) {
    if((record.canonicalSource&&this.mcpCanonicalPath(record.path)!==record.canonicalSource)||(record.canonicalRoot&&this.mcpCanonicalPath(record.roots[0])!==record.canonicalRoot))throw new Error('Selected MCP source or folder changed. Refresh this chat context: '+record.name);
    const data = this.mcpSourceDocument(record.path); const cfg = record.workspaceFile ? data.mcp || data.settings?.mcp || {} : data;
    const definition = (cfg.servers || cfg.mcpServers || {})[record.key];
    if (!definition || revision(definition) !== record.hash) throw new Error('MCP definition changed. Refresh this chat context: ' + record.name);
    const type = definition.type || 'stdio';
    const keys = ['http', 'sse'].includes(type) ? ['type', 'url', 'headers', 'tools', 'timeout'] : ['type', 'command', 'args', 'env', 'workingDirectory', 'tools', 'timeout'];
    const result = Object.fromEntries(Object.entries(definition).filter(([key]) => keys.includes(key))); result.type = type;
    if (!['http', 'sse', 'stdio', 'local'].includes(type)) throw new Error('Unsupported MCP transport: ' + type);
    if (!['http', 'sse'].includes(type)) result.workingDirectory = path.resolve(record.roots[0], result.workingDirectory || definition.cwd || '.');
    const resolve = value => typeof value === 'string' ? value.replace(/\$\{([^}]+)\}/g, (_match, variable) => {
      if (variable === 'workspaceFolder') return record.roots[0];
      if (variable.startsWith('env:')) {
        if (!resolveEnvironment) return '${' + variable + '}';
        if (process.env[variable.slice(4)] === undefined) throw new Error('Missing environment variable for ' + record.name + ': ' + variable.slice(4));
        return process.env[variable.slice(4)];
      }
      throw new Error('MCP needs an input adapter for ' + variable + ': ' + record.name);
    }) : Array.isArray(value) ? value.map(resolve) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v)])) : value;
    const resolved = resolve(result);
    if (['http', 'sse'].includes(type)) { if (!['http:', 'https:'].includes(new URL(resolved.url).protocol)) throw new Error('Invalid MCP URL.'); }
    else if (typeof resolved.command !== 'string' || !resolved.command.trim()) throw new Error('MCP command is missing.');
    return resolved;
  }
  mcpCanonicalPath(file) {
    const paths = this.mcpSelectionBatch?.paths;
    if (paths?.has(file)) return paths.get(file);
    const canonical = fs.realpathSync(file);
    if (paths && paths.size < mcpBatchLimits.paths) paths.set(file, canonical);
    return canonical;
  }
  mcpSourceDocument(file) {
    const batch = this.mcpSelectionBatch;
    if (batch?.sources.has(file)) return batch.sources.get(file);
    const text = fs.readFileSync(file, 'utf8'), data = parseJSONC(text);
    if (batch && batch.sources.size < mcpBatchLimits.sources) {
      const bytes = Buffer.byteLength(text);
      if (batch.sourceBytes + bytes <= mcpBatchLimits.sourceBytes) {
        batch.sources.set(file, data); batch.sourceBytes += bytes;
      }
    }
    return data;
  }
  // One synchronous health enumeration shares current source bytes, canonical
  // paths and scoped catalogs. Captured hashes/targets, workspace modes and
  // environment substitution are still checked for every record. Nothing is
  // retained for the next enumeration or a direct provider/action call.
  withMcpSelectionBatch(callback) {
    if (this.mcpSelectionBatch) return callback();
    this.mcpSelectionBatch = { catalogs: new Map(), sources: new Map(), sourceBytes: 0, paths: new Map() };
    try { return callback(); } finally { this.mcpSelectionBatch = null; }
  }
  providerMcpContext(snapshot) { return this.providerContext(snapshot, { mcpOnly: true }); }
  providerContext(snapshot, { mcpOnly = false } = {}) {
    const instructions = []; const customAgents = []; const mcpServers = {}; const fingerprints = new Map(); const mcpMappings = {};
    if (!mcpOnly && snapshot.warnings?.length) instructions.push('## Unavailable context folders\nThe following configured folders were unavailable when this chat context was prepared. Their sources were not loaded; do not assume their contents are available.\n' + snapshot.warnings.map(warning => '- ' + warning.path).join('\n'));
    const key = snapshot.workspaceId || '';
    const catalogs = this.mcpSelectionBatch?.catalogs;
    let catalog = catalogs?.get(key);
    if (!catalog) { catalog = this.get(snapshot.workspaceId,{execution:true}); if (catalogs && catalogs.size < mcpBatchLimits.catalogs) catalogs.set(key, catalog); }
    for (const entry of snapshot.entries) {
      if (catalog.modes[entry.id] === 'disabled') throw new Error('A source was disabled. Refresh this chat context before continuing: ' + entry.name);
      if (entry.kind === 'mcp') {
        const name = entry.name.replace(/[^a-zA-Z0-9_-]/g, '-');
        const definition = this.resolveMcp(entry); const fingerprint = revision(definition);
        if (fingerprints.has(fingerprint)) { mcpMappings[entry.id] = fingerprints.get(fingerprint); continue; }
        if (mcpServers[name]) throw new Error('Two selected MCP sources have the same name. Disable an alternative: ' + entry.name);
        mcpServers[name] = definition; fingerprints.set(fingerprint, name); mcpMappings[entry.id] = name;
      } else if (entry.kind === 'agent') {
        // Parse the captured version on resume too; do not trust stale catalog metadata.
        const agent = agentMetadata(entry.content);
        if (agent.issues.length) throw new Error('Agent is unavailable: ' + entry.name + '. ' + agent.issues.join('; '));
        if (!mcpOnly) customAgents.push({ name: 'agent-' + entry.id.slice(0, 16), displayName: entry.name, description: entry.description || entry.name, tools: agent.tools, prompt: `Source: ${entry.path}\nScope: ${entry.scope}\n\n${entry.content}`, infer: agent.infer });
      }
      else if (!mcpOnly) instructions.push(`## ${entry.kind}: ${entry.name}\nSource: ${entry.path}\nApplies to: ${entry.mode === 'universal' ? 'Every chat; preserve task, domain, and file limits written in the source' : entry.scope}\nUse referenced relative paths from this source's directory. Preserve the source's domain and scope.\n\n${entry.content}`);
    }
    if (mcpOnly) return { mcpServers, disabledLegacyMcp: catalog.entries.filter(e => e.kind === 'mcp' && catalog.modes[e.id] === 'disabled').map(e => e.name) };
    return { mcpServers, mcpMappings, customAgents, disabledSkills: catalog.entries.filter(e => e.kind === 'skill' && catalog.modes[e.id] === 'disabled').map(e => e.runtimeName), disabledLegacyMcp: catalog.entries.filter(e => e.kind === 'mcp' && catalog.modes[e.id] === 'disabled').map(e => e.name), agent: snapshot.agentId ? 'agent-' + snapshot.agentId.slice(0, 16) : undefined, instructionText: instructions.join('\n\n') };
  }
}
