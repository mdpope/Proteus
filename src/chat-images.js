import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isWithin } from './files.js';
import { imageSources, linkKind } from './markdown-parser.js';

export function readChatImage(run, source) {
  return readImage({ source, texts: [...run.events.map(e => e.text), ...Object.values(run.liveMessages || {})], cwd: run.schedule.workspace.cwd, roots: [run.schedule.workspace.cwd, ...run.schedule.workspace.additionalDirectories] });
}
export function readImage({ source, texts, cwd, roots }) {
  if (linkKind(source) !== 'file' || !texts.some(text => imageSources(text).includes(source))) throw new Error('Image is not referenced in this conversation.');
  const file = /^file:/i.test(source) ? fileURLToPath(source) : path.resolve(cwd, decodeURIComponent(source));
  if (!isWithin(file, roots)) throw new Error('Image is outside this workspace.');
  const real = fs.realpathSync(file); const size = fs.statSync(real).size;
  if (size > 4_000_000 || !fs.statSync(real).isFile()) throw new Error('Choose a raster image smaller than 4 MB.');
  const bytes = fs.readFileSync(real);
  const mime = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg'
    : /^GIF8[79]a/.test(bytes.subarray(0, 6).toString()) ? 'image/gif'
    : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : null;
  if (!mime) throw new Error('Supported images: PNG, JPEG, GIF, and WebP.');
  return { dataURL: `data:${mime};base64,${bytes.toString('base64')}` };
}
