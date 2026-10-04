import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const MAX_BYTES = 1_000_000;
const PAGE_SIZE = 200;
const SCAN_LIMIT = 10_000;
const within = (file, root) => { const relative = path.relative(root, file); return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)); };
const rootId = (workspaceId, root, canonicalRoot) => createHash('sha256').update(JSON.stringify([workspaceId, root, canonicalRoot])).digest('hex').slice(0, 32);
function relativePath(value, allowEmpty = true) {
  if (typeof value !== 'string' || value.length > 4096 || /[\\\x00-\x1f\x7f]/.test(value) || path.isAbsolute(value)) throw new Error('Choose a relative workspace location.');
  if (value === '' && allowEmpty) return '';
  if (!value || value.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Choose a folder or file within this workspace root.');
  return value;
}
function leafName(value) {
  if (typeof value !== 'string' || value !== value.trim() || !value || value.length > 200 || /[\\/\x00-\x1f\x7f]/.test(value) || ['.', '..'].includes(value)) throw new Error('Enter one name without slashes, traversal or surrounding whitespace.');
  return value;
}
function contentText(content) {
  if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > MAX_BYTES || content.includes('\0')) throw new Error('Markdown content must be text no larger than 1 MB.');
  return content;
}

// Root membership is resolved again for every operation, so removed workspaces lose access.
export class WorkspaceFiles {
  constructor(getWorkspaces) { if (typeof getWorkspaces !== 'function') throw new Error('Configured workspaces are required.'); this.getWorkspaces = getWorkspaces; }
  roots() {
    const roots = [];
    const configuration = this.getWorkspaces();
    const workspaces = Array.isArray(configuration) ? configuration : (configuration?.workspaces || []);
    const configured = new Set(workspaces.flatMap(workspace=>[workspace.cwd,...(workspace.additionalDirectories||[])]).filter(value=>typeof value==='string').map(value=>path.resolve(value)));
    const extra = [];
    for(const [scope,label,folders] of [['library','Shared repositories',configuration?.libraryFolders],['universal','Every-chat folders',configuration?.universalFolders]]) {
      for(const folder of folders||[]) { if(typeof folder!=='string'||!path.isAbsolute(folder)||configured.has(path.resolve(folder)))continue; configured.add(path.resolve(folder));extra.push({id:'context-'+scope,name:label,cwd:folder,scope,additionalDirectories:[]}); }
    }
    for (const workspace of [...workspaces,...extra]) {
      if (typeof workspace.id !== 'string' || !workspace.id) continue;
      const seen = new Set();
      for (const [index, configured] of [workspace.cwd, ...(workspace.additionalDirectories || [])].entries()) {
        if (typeof configured !== 'string' || !path.isAbsolute(configured)) continue;
        const root = path.resolve(configured); if (seen.has(root)) continue; seen.add(root);
        let available = false, canonicalRoot = null; try { available = fs.statSync(root).isDirectory(); if (available) canonicalRoot = fs.realpathSync(root); } catch { /* An unavailable root remains visible for explanation. */ }
        roots.push({ id: rootId(workspace.id, root, canonicalRoot), workspaceId: workspace.id, workspaceName: workspace.name || workspace.id, name: path.basename(root) || root, path: root, primary: index === 0 && !workspace.scope, scope: workspace.scope || 'workspace', available });
      }
    }
    return { roots };
  }
  resolve(rootIdValue, relative = '', directory = false) {
    const root = this.roots().roots.find(item => item.id === rootIdValue);
    if (!root || !root.available) throw new Error('This configured workspace root is unavailable. Refresh the folder picker.');
    const normalized = relativePath(relative);
    const canonicalRoot = fs.realpathSync(root.path), resolved = fs.realpathSync(path.join(canonicalRoot, normalized));
    if (!within(resolved, canonicalRoot)) throw new Error('This link leaves the selected workspace root.');
    if (directory && !fs.statSync(resolved).isDirectory()) throw new Error('Choose a workspace folder.');
    return { root, canonicalRoot, resolved, relative: normalized };
  }
  list({ rootId: id, directory = '', offset = 0 } = {}) {
    if (!Number.isInteger(offset) || offset < 0 || offset > SCAN_LIMIT) throw new Error('Invalid folder page.');
    const { root, canonicalRoot, resolved, relative } = this.resolve(id, directory, true);
    const entries = [], handle = fs.opendirSync(resolved); let scanned = 0, scanLimited = false;
    try {
      let entry;
      while ((entry = handle.readSync())) {
        if (++scanned > SCAN_LIMIT) { scanLimited = true; break; }
        if (entry.name === '.git') continue;
        const file = path.join(resolved, entry.name);
        try {
          const actual = fs.realpathSync(file); if (!within(actual, canonicalRoot)) continue;
          const stat = fs.statSync(actual);
          if (!stat.isDirectory() && !(stat.isFile() && /\.md$/i.test(entry.name))) continue;
          entries.push({ name: entry.name, kind: stat.isDirectory() ? 'folder' : 'markdown', path: relative ? relative + '/' + entry.name : entry.name, ...(stat.isFile() ? { size: stat.size } : {}), symlink: entry.isSymbolicLink() });
        } catch { /* Broken, unreadable or changing entries are not selectable. */ }
      }
    } finally { handle.closeSync(); }
    entries.sort((a,b) => (a.kind === b.kind ? 0 : a.kind === 'folder' ? -1 : 1) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) || a.name.localeCompare(b.name));
    return { root, directory: relative, parent: relative.includes('/') ? relative.slice(0, relative.lastIndexOf('/')) : relative ? '' : null, entries: entries.slice(offset, offset + PAGE_SIZE), offset, nextOffset: offset + PAGE_SIZE < entries.length ? offset + PAGE_SIZE : null, scanLimited, pageSize: PAGE_SIZE };
  }
  createFolder({ rootId: id, directory = '', name } = {}) {
    const leaf = leafName(name), parent = this.resolve(id, directory, true);
    const destination = path.join(parent.resolved, leaf);
    try { fs.mkdirSync(destination, { mode: 0o700 }); } catch (error) { if (error.code === 'EEXIST') throw new Error('A file or folder with that name already exists.'); throw error; }
    return { rootId: id, directory: parent.relative ? parent.relative + '/' + leaf : leaf, name: leaf };
  }
  read({ rootId: id, file } = {}) {
    relativePath(file, false); if (!/\.md$/i.test(file)) throw new Error('Choose a Markdown (.md) file.');
    const target = this.resolve(id, file), fd = fs.openSync(target.resolved, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    try {
      const stat = fs.fstatSync(fd); if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('Choose a Markdown file no larger than 1 MB.');
      // Bounded fd read also limits a file that grows after the initial stat.
      const buffer = Buffer.alloc(MAX_BYTES + 1); let total = 0, read;
      while (total < buffer.length && (read = fs.readSync(fd, buffer, total, buffer.length - total, null))) total += read;
      if (total > MAX_BYTES) throw new Error('Markdown file is larger than 1 MB.');
      const content = contentText(buffer.subarray(0,total).toString('utf8'));
      return { file: target.resolved, content, rootId: id, relativePath: file };
    } finally { fs.closeSync(fd); }
  }
  createMarkdown({ rootId: id, directory = '', name, content = '' } = {}) {
    let leaf = leafName(name); if (!/\.md$/i.test(leaf)) { if (path.extname(leaf)) throw new Error('Use a Markdown filename ending in .md.'); leaf += '.md'; }
    contentText(content);
    const parent = this.resolve(id, directory, true), destination = path.join(parent.resolved, leaf);
    let fd;
    try { fd = fs.openSync(destination, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0), 0o600); }
    catch (error) { if (error.code === 'EEXIST') throw new Error('That file already exists. Choose another name or open the existing file.'); throw error; }
    try { fs.writeFileSync(fd, content, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    return { file: destination, content, rootId: id, relativePath: parent.relative ? parent.relative + '/' + leaf : leaf };
  }
}
