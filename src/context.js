import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { atomicJSON, readJSON, isWithin } from './files.js';
import { revision } from './schedules.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const modes = new Set(['universal', 'workspace', 'available', 'disabled']);
const skipped = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__', '.next', 'bin', 'obj', 'dist', 'build', '.obsidian', '.trash']);
const unique = values => [...new Set(values)];
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
  constructor(home, settings) {
    this.home = home; this.settings = settings; this.file = path.join(home, 'context.json'); this.catalogFile = path.join(home, 'context-catalog.json'); this.catalog = readJSON(this.catalogFile, { entries: [] });
    if (!fs.existsSync(this.file)) {
      const defaults = settings.get();
      atomicJSON(this.file, { schemaVersion: 1, defaultWorkspaceId: 'default', workspaces: [{ id: 'default', name: defaults.workspaceImport?.name || 'Default workspace', ...defaults.workspace }], libraryFolders: [], universalFolders: [], documents: [], modes: {}, workspaceFiles: defaults.workspaceImport?.source ? [defaults.workspaceImport.source] : [] });
    }
    this.refresh();
  }
  config() {
    const data = readJSON(this.file);
    if (data.schemaVersion !== 1 || !Array.isArray(data.workspaces) || !data.workspaces.length || !data.modes || !Array.isArray(data.libraryFolders) || !Array.isArray(data.documents) || !Array.isArray(data.workspaceFiles)) throw new Error('Invalid context.json.');
    return { ...data, universalFolders: data.universalFolders || [], file: this.file, revision: revision(data) };
  }
  roots(config = this.config()) { return unique([...config.workspaces.flatMap(w => [w.cwd, ...w.additionalDirectories]), ...config.libraryFolders, ...(config.universalFolders || [])]); }
  get() {
    const config = this.config();
    return { ...config, ...this.catalog, entries: this.catalog.entries.map(entry => ({ ...entry, mode: config.modes[entry.id] || entry.defaultMode })) };
  }
  save(value, expectedRevision) {
    if (this.config().revision !== expectedRevision) throw new Error('Workspace settings changed. Refresh before saving.');
    const config = structuredClone(value); delete config.file; delete config.revision;
    if (config.schemaVersion !== 1 || !Array.isArray(config.workspaces) || !config.workspaces.length || !config.workspaces.some(w => w.id === config.defaultWorkspaceId)) throw new Error('Choose a default workspace.');
    const ids = new Set();
    for (const workspace of config.workspaces) {
      if (!/^[\w-]+$/.test(workspace.id) || ids.has(workspace.id) || !workspace.name?.trim()) throw new Error('Workspaces need unique IDs and names.');
      ids.add(workspace.id); workspace.cwd = directory(workspace.cwd);
      workspace.additionalDirectories = unique(workspace.additionalDirectories.map(directory)).filter(p => p !== workspace.cwd);
    }
    config.libraryFolders = unique(config.libraryFolders.map(directory));
    config.universalFolders = unique((config.universalFolders || []).map(directory));
    for (const doc of config.documents) if (!path.isAbsolute(doc.path) || !['instruction', 'skill', 'agent'].includes(doc.kind) || !fs.statSync(doc.path).isFile()) throw new Error('Choose an existing instruction, skill, or agent file.');
    for (const file of config.workspaceFiles) if (!path.isAbsolute(file) || !file.endsWith('.code-workspace')) throw new Error('Choose a VS Code workspace file.');
    for (const mode of Object.values(config.modes)) if (!modes.has(mode)) throw new Error('Invalid context selection mode.');
    atomicJSON(this.file, config); this.refresh(); return this.get();
  }
  mutate(change, expectedRevision) {
    const config = this.config(); change(config); return this.save(config, expectedRevision);
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
      config.workspaces.push({ id, name: path.basename(file, '.code-workspace'), cwd: folders[0], additionalDirectories: unique(folders.slice(1)) });
      config.workspaceFiles = unique([...config.workspaceFiles, file]);
    }, expectedRevision);
  }
  refresh() {
    const config = this.config(); const roots = this.roots(config); const entries = new Map(); const errors = []; const visited = new Set(); let scanned = 0;
    const addDocument = (file, root, explicitKind) => {
      try {
        const canonical = fs.realpathSync(file); const id = hash(canonical); const existing = entries.get(id);
        if (existing) {
          existing.sources = unique([...existing.sources, file]); existing.roots = unique([...existing.roots, root]);
          if (explicitKind) { existing.kind = explicitKind; existing.unsupportedAgentFields = explicitKind === 'agent' ? existing.unsupportedAgentFields : []; }
          return;
        }
        const text = readDocument(canonical); const meta = markdownMetadata(text, canonical); const kind = explicitKind || kindFor(file);
        const scope = meta.applyTo || (['AGENTS.md', 'CLAUDE.md'].includes(path.basename(file)) ? path.dirname(file) : path.basename(file) === 'copilot-instructions.md' ? root : 'Selected task');
        const defaultMode = kind === 'instruction' && [path.join(root, 'AGENTS.md'), path.join(root, 'CLAUDE.md'), path.join(root, '.github/copilot-instructions.md')].includes(file) ? 'workspace' : 'available';
        entries.set(id, { id, kind, path: canonical, sources: [file], roots: [root], name: meta.name, description: meta.description, runtimeName: meta.fields.name || path.basename(path.dirname(file)), unsupportedAgentFields: kind === 'agent' ? ['tools', 'mcp-servers', 'hooks'].filter(key => key in meta.fields) : [], scope, hash: hash(text), defaultMode });
      } catch (error) { errors.push({ path: file, message: error.message }); }
    };
    const walk = (dir, root) => {
      if (++scanned > 60_000) throw new Error('Workspace scan exceeded 60,000 folders. Add narrower source folders.');
      let real;
      try { real = fs.realpathSync(dir); } catch (error) { errors.push({ path: dir, message: error.message }); return; }
      if (!isWithin(real, roots) || visited.has(real)) return;
      visited.add(real);
      let files;
      try { files = fs.readdirSync(dir, { withFileTypes: true }); } catch (error) { errors.push({ path: dir, message: error.message }); return; }
      for (const entry of files) {
        const file = path.join(dir, entry.name);
        if (skipped.has(entry.name)) continue;
        if (entry.isDirectory()) walk(file, root);
        else if (entry.isSymbolicLink()) {
          try { if (fs.statSync(file).isDirectory()) walk(file, root); else if (kindFor(file) && isWithin(file, roots)) addDocument(file, root); } catch { /* Broken aliases are not instruction sources. */ }
        } else if (entry.isFile() && kindFor(file)) addDocument(file, root);
      }
    };
    for (const root of roots) { try { walk(root, root); } catch (error) { errors.push({ path: root, message: error.message }); } }
    for (const doc of config.documents) addDocument(doc.path, path.dirname(doc.path), doc.kind);
    const mcpFiles = [...config.workspaceFiles.map(file => ({ file, root: path.dirname(file), workspace: true })), ...roots.flatMap(root => ['.vscode/mcp.json', '.mcp.json', '.copilot/mcp.json', '.copilot/mcp-config.json'].map(rel => ({ file: path.join(root, rel), root })))];
    for (const source of mcpFiles) {
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
    for (const previous of this.catalog?.entries || []) if (!entries.has(previous.id) && config.modes[previous.id]) entries.set(previous.id, { ...previous, missing: true });
    this.catalog = { refreshedAt: new Date().toISOString(), entries: [...entries.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)), errors };
    atomicJSON(this.catalogFile, this.catalog);
    return this.get();
  }
  capture({ workspaceId, workspace, selectedIds = [], agentId } = {}) {
    const catalog = this.get(); const profile = workspaceId ? catalog.workspaces.find(w => w.id === workspaceId) : workspace ? null : catalog.workspaces.find(w => w.id === catalog.defaultWorkspaceId);
    if (!profile && !workspace) throw new Error('Workspace no longer exists.');
    const original = workspace || { cwd: profile.cwd, additionalDirectories: profile.additionalDirectories };
    const cwd = directory(original.cwd); const roots = unique([cwd, ...original.additionalDirectories.map(directory), ...catalog.universalFolders.map(directory)]);
    if (!Array.isArray(selectedIds) || selectedIds.some(id => !catalog.entries.some(e => e.id === id))) throw new Error('Refresh the context list before selecting sources.');
    const chosen = catalog.entries.filter(entry => entry.mode !== 'disabled' && (entry.mode === 'universal' || selectedIds.includes(entry.id) || (entry.mode === 'workspace' && entry.roots.some(root => roots.includes(root)))));
    const records = []; let total = 0;
    for (const entry of chosen) {
      if (entry.missing) throw new Error('Selected source is missing: ' + entry.path);
      if (entry.kind === 'agent' && entry.unsupportedAgentFields?.length) throw new Error('Agent has editor-specific tool controls that need an adapter: ' + entry.name + ' (' + entry.unsupportedAgentFields.join(', ') + ')');
      const record = { ...entry }; delete record.defaultMode;
      if (entry.kind !== 'mcp') {
        const text = readDocument(entry.path);
        if (hash(text) !== entry.hash) throw new Error('Instructions changed. Refresh context before starting: ' + entry.name);
        total += Buffer.byteLength(text);
        if (total > 300_000) throw new Error('Selected context exceeds 300 KB. Select fewer sources for this chat.');
        record.content = text;
      } else this.resolveMcp(record, false);
      records.push(record);
      for (const root of entry.roots) if (fs.existsSync(root) && !roots.includes(root)) roots.push(directory(root));
    }
    if (agentId && !records.some(e => e.id === agentId && e.kind === 'agent')) throw new Error('Select the agent in this chat context first.');
    return { schemaVersion: 1, baseWorkspace: { cwd, additionalDirectories: original.additionalDirectories }, followsWorkspace: !!profile && revision({ cwd, additionalDirectories: original.additionalDirectories }) === revision({ cwd: profile.cwd, additionalDirectories: profile.additionalDirectories }), workspaceId: profile?.id || null, workspaceName: profile?.name || path.basename(cwd), selectedIds, agentId: agentId || null, capturedAt: new Date().toISOString(), workspace: { cwd, additionalDirectories: roots.filter(root => root !== cwd) }, entries: records };
  }
  resolveMcp(record, resolveEnvironment = true) {
    const data = parseJSONC(fs.readFileSync(record.path, 'utf8')); const cfg = record.workspaceFile ? data.mcp || data.settings?.mcp || {} : data;
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
  providerContext(snapshot) {
    const instructions = []; const customAgents = []; const mcpServers = {}; const fingerprints = new Map(); const mcpMappings = {};
    const catalog = this.get();
    for (const entry of snapshot.entries) {
      if (catalog.modes[entry.id] === 'disabled') throw new Error('A source was disabled. Refresh this chat context before continuing: ' + entry.name);
      if (entry.kind === 'mcp') {
        const name = entry.name.replace(/[^a-zA-Z0-9_-]/g, '-');
        const definition = this.resolveMcp(entry); const fingerprint = revision(definition);
        if (fingerprints.has(fingerprint)) { mcpMappings[entry.id] = fingerprints.get(fingerprint); continue; }
        if (mcpServers[name]) throw new Error('Two selected MCP sources have the same name. Disable an alternative: ' + entry.name);
        mcpServers[name] = definition; fingerprints.set(fingerprint, name); mcpMappings[entry.id] = name;
      } else if (entry.kind === 'agent') customAgents.push({ name: 'agent-' + entry.id.slice(0, 16), displayName: entry.name, description: entry.description || entry.name, prompt: `Source: ${entry.path}\nScope: ${entry.scope}\n\n${entry.content}`, infer: true });
      else instructions.push(`## ${entry.kind}: ${entry.name}\nSource: ${entry.path}\nApplies to: ${entry.mode === 'universal' ? 'Every chat; preserve task, domain, and file limits written in the source' : entry.scope}\nUse referenced relative paths from this source's directory. Preserve the source's domain and scope.\n\n${entry.content}`);
    }
    return { mcpServers, mcpMappings, customAgents, disabledSkills: catalog.entries.filter(e => e.kind === 'skill' && catalog.modes[e.id] === 'disabled').map(e => e.runtimeName), disabledLegacyMcp: catalog.entries.filter(e => e.kind === 'mcp' && catalog.modes[e.id] === 'disabled').map(e => e.name), agent: snapshot.agentId ? 'agent-' + snapshot.agentId.slice(0, 16) : undefined, instructionText: instructions.join('\n\n') };
  }
}
