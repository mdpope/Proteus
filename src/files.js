import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const defaultHome = () => process.env.PROTEUS_HOME || path.join(os.homedir(), 'Library', 'Application Support', 'Proteus');
export const readJSON = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; }
};
export function atomicJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomUUID()}.tmp`;
  let fd, created=false;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);created=true;
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp, file);
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
    if(created)try { fs.unlinkSync(temp); } catch {} // Cleanup must never mask the original save failure.
  }
}
export function jsonFiles(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return fs.readdirSync(dir).filter(file => file.endsWith('.json')).sort().map(file => path.join(dir, file));
}
export function isWithin(file, roots) {
  try {
    const target = fs.realpathSync(file);
    return roots.some(root => { const base = fs.realpathSync(root); const rel = path.relative(base, target); return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel)); });
  } catch { return false; }
}
