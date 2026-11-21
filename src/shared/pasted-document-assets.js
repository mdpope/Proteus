import {createHash, randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import fs from 'node:fs/promises';

export const PASTED_ASSET_LIMIT = 4 * 1024 * 1024;
export const PASTED_ASSET_REQUEST_LIMIT = Math.ceil(PASTED_ASSET_LIMIT / 3) * 4 + 64 * 1024;

const types = {
  'image/png': ['png', bytes => bytes.subarray(0,8).toString('hex') === '89504e470d0a1a0a'],
  'image/jpeg': ['jpg', bytes => bytes.subarray(0,3).toString('hex') === 'ffd8ff'],
  'image/gif': ['gif', bytes => /^GIF8[79]a$/.test(bytes.toString('ascii',0,6))],
  'image/webp': ['webp', bytes => bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP'],
  'application/pdf': ['pdf', bytes => bytes.toString('ascii',0,5) === '%PDF-'],
};

export async function writePastedAsset({data, mediaType}, destination, {prefix='pasted'}={}) {
  const type = Object.hasOwn(types, mediaType) ? types[mediaType] : null;
  if (!type || typeof data !== 'string' || data.length > Math.ceil(PASTED_ASSET_LIMIT / 3) * 4) throw Error('Paste a PNG, JPEG, GIF, WebP or PDF up to 4 MiB.');
  const bytes = Buffer.from(data, 'base64');
  if (!bytes.length || bytes.length > PASTED_ASSET_LIMIT || !type[1](bytes) || bytes.toString('base64') !== data) throw Error('The pasted file does not match its declared format.');
  return writeAsset({bytes,mediaType},destination,prefix);
}

export async function writeAsset({bytes,mediaType},destination,prefix) {
  const type = Object.hasOwn(types,mediaType) ? types[mediaType] : null;
  if (!type || !Buffer.isBuffer(bytes) || !type[1](bytes)) throw Error('The image does not match its declared format.');
  const name = prefix + '-' + createHash('sha256').update(bytes).digest('hex') + '.' + type[0];
  const target = destination(name);
  const temporary = target + '.' + randomUUID() + '.paste';
  const handle = await fs.open(temporary,'wx',0o600);
  try {
    try { await handle.writeFile(bytes); await handle.sync(); }
    finally { await handle.close(); }
    try { await fs.link(temporary, target); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = await fs.open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const stat = await existing.stat();
        if (!stat.isFile() || stat.size !== bytes.length || !(await existing.readFile()).equals(bytes)) throw Error('An existing attachment has different contents.');
      } finally { await existing.close(); }
    }
  } finally { await fs.rm(temporary,{force:true}); }
  return {name, mediaType};
}
