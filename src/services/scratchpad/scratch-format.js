import {randomUUID} from 'node:crypto';
import {parseDocument, Document} from 'yaml';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const scratchFormats = ['markdown', 'text', 'code'];

// Association is supplied by the owner's registered directory mapping, never trusted from
// a manually edited frontmatter field. Unknown properties and document text survive sync.
export function normalizeScratch(text, {title, workspaceId = null, projectId = null, now = new Date().toISOString(), id, changes = {}} = {}) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 2 * 1024 * 1024) throw Error('Scratch exceeds the 2 MiB text limit.');
  const source = text.replace(/^\uFEFF/, '');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (/^---\r?\n/.test(source) && !match) throw Error('Unclosed scratch frontmatter.');
  const document = match ? parseDocument(match[1], {uniqueKeys: true, strict: true}) : new Document({});
  if (document.errors.length) throw Error('Invalid scratch frontmatter: ' + document.errors[0].message);
  const fields = document.toJS({maxAliasCount: 20});
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw Error('Scratch frontmatter must be a mapping.');
  const savedId = id ?? fields.scratch_id ?? randomUUID();
  if (!uuid.test(savedId)) throw Error('Invalid scratch ID.');
  if (id && fields.scratch_id && id !== fields.scratch_id) throw Error('Scratch identity changed; reconcile before saving.');
  for (const key of Object.keys(changes)) if (!['title','format','category','updated'].includes(key)) throw Error('Unsupported scratch property change.');
  const name = changes.title ?? fields.title ?? title ?? 'Untitled';
  if (typeof name !== 'string') throw Error('Scratch title must be text.');
  if (!name.trim() || name.length > 500) throw Error('Scratch title must contain 1–500 characters.');
  const format = changes.format ?? fields.format ?? 'markdown';
  if (!scratchFormats.includes(format)) throw Error('Choose Markdown, text or code.');
  const category = changes.category ?? fields.category ?? '';
  if (typeof category !== 'string' || category.length > 200) throw Error('Scratch category must be text of at most 200 characters.');
  const timestamp = value => { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw Error('Scratch dates must be valid date strings.'); return value; };
  const properties = {scratch_id: savedId, title: name.trim(), workspace_id: workspaceId, project_id: projectId,
    format, category, created: timestamp(fields.created ?? now), updated: timestamp(changes.updated ?? fields.updated ?? now)};
  for (const [key, value] of Object.entries(properties)) document.set(key, value);
  const body = match ? source.slice(match[0].length) : source;
  return {id: savedId, title: properties.title, workspaceId, projectId, format, category, created: properties.created, updated: properties.updated,
    body, text: '---\n' + document.toString() + '---\n' + body};
}

export function scratchAccess({capturedProjectId, targetProjectId, grants = [], action}) {
  if (!['list', 'read', 'create', 'update', 'rename', 'delete', 'move', 'sync'].includes(action)) throw Error('Unsupported scratch action.');
  const ownProject = Boolean(capturedProjectId && targetProjectId && capturedProjectId === targetProjectId);
  const grant = grants.some(value => value.projectId === targetProjectId && value.actions?.includes(action));
  return {allowed: ownProject || grant, requiresPermission: !ownProject && !grant};
}
