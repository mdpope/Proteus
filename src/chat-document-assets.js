import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parser } from './markdown-parser.js';

const markdown = parser();
export const MAX_RASTER_BYTES = 512 * 1024;
export const MAX_RASTER_TOTAL = 2 * 1024 * 1024;
export const MAX_RASTER_COUNT = 8;
const types = new Map([['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.gif', 'image/gif'], ['.webp', 'image/webp']]);
const within = (file, root) => { const relative = path.relative(root, file); return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)); };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function safeReference(value) {
  if (typeof value !== 'string' || !value || value.length > 1024 || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//') || value.startsWith('/') || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  let source;
  try { source = decodeURIComponent(value.split(/[?#]/, 1)[0]); } catch { return null; }
  if (!source || source.startsWith('/') || source.startsWith('\\') || source.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('~'))) return null;
  return source;
}

function htmlReferences(content) {
  const found = { images: [], documents: [] };
  let cursor = 0;
  while (cursor < content.length) {
    const start = content.indexOf('<', cursor);
    if (start < 0) break;
    if (content.startsWith('<!--', start)) { const end = content.indexOf('-->', start + 4); cursor = end < 0 ? content.length : end + 3; continue; }
    const name = content.slice(start + 1).match(/^\/?([a-z][a-z0-9-]*)\b/i);
    if (!name) { cursor = start + 1; continue; }
    let end = start + 1, quote = null;
    while (end < content.length) {
      const character = content[end++];
      if (quote) { if (character === quote) quote = null; }
      else if (character === '"' || character === "'") quote = character;
      else if (character === '>') break;
    }
    if (end > content.length || content[end - 1] !== '>') break;
    const tag = name[1].toLowerCase(), closing = content[start + 1] === '/';
    if (!closing && ['script', 'style'].includes(tag)) {
      const tail = content.slice(end).search(new RegExp('<\\/' + tag + '\\s*>', 'i'));
      cursor = tail < 0 ? content.length : end + tail + tag.length + 3;
      continue;
    }
    cursor = end;
    if (closing || !['img', 'a'].includes(tag)) continue;
    const attribute = tag === 'img' ? 'src' : 'href';
    const attributes = content.slice(start + 1 + name[0].length, end - 1);
    const value = attributes.match(new RegExp('(?:^|\\s)' + attribute + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
    if (value) (attribute === 'src' ? found.images : found.documents).push(value[1] ?? value[2] ?? value[3]);
  }
  return found;
}

export function documentReferences(content, mediaType) {
  const found = mediaType === 'text/html' ? htmlReferences(content) : { images: [], documents: [] };
  if (mediaType === 'text/markdown') {
    const visit = tokens => { for (const token of tokens) {
      if (token.type === 'image') found.images.push(token.attrGet('src'));
      if (token.type === 'link_open') found.documents.push(token.attrGet('href'));
      if (token.children) visit(token.children);
    } };
    visit(markdown.parse(content, {}));
  }
  const unique = list => [...new Set(list.filter(Boolean))];
  return { images: unique(found.images), documents: unique(found.documents.filter(value => /(?:\.md|\.html?)(?:[?#]|$)/i.test(value))) };
}

export function resolveDocumentReference(parentFile, reference, roots) {
  const relative = safeReference(reference);
  if (!relative) throw new Error('Only safe relative document assets are available.');
  const parent = path.dirname(parentFile);
  const requested = path.resolve(parent, relative);
  const file = fs.realpathSync(requested);
  if (!within(file, parent) || !roots.some(root => within(file, root))) throw new Error('Relative document asset leaves its approved folder.');
  return file;
}

export function readRaster(parentFile, source, roots) {
  const file = resolveDocumentReference(parentFile, source, roots);
  const mediaType = types.get(path.extname(file).toLowerCase());
  if (!mediaType) throw new Error('Only PNG, JPEG, GIF and WebP document images are supported.');
  const handle = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const stat = fs.fstatSync(handle), current = fs.statSync(file);
    if (!stat.isFile() || stat.size < 8 || stat.size > MAX_RASTER_BYTES || stat.dev !== current.dev || stat.ino !== current.ino || fs.realpathSync(file) !== file) throw new Error('Document image changed or exceeds 512 KiB.');
    const bytes = Buffer.alloc(stat.size); let offset = 0;
    while (offset < bytes.length) { const count = fs.readSync(handle, bytes, offset, bytes.length - offset, offset); if (!count) break; offset += count; }
    if (offset !== stat.size) throw new Error('Document image changed while reading.');
    const valid = mediaType === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) :
      mediaType === 'image/jpeg' ? bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')) :
      mediaType === 'image/gif' ? ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6)) :
      bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) throw new Error('Document image content does not match its safe raster type.');
    return { file, source, mediaType, size: bytes.length, version: sha256(bytes), bytes };
  } finally { fs.closeSync(handle); }
}
