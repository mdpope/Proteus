import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {atomicRename} from './atomic-rename.cjs';

export function applicationHome({ platform = process.platform, home = os.homedir(), env = process.env } = {}) {
  if (env.PROTEUS_HOME) return env.PROTEUS_HOME;
  if (platform === 'win32') {
    const base = env.LOCALAPPDATA && path.win32.isAbsolute(env.LOCALAPPDATA) ? env.LOCALAPPDATA : path.win32.join(home, 'AppData', 'Local');
    return path.win32.join(base, 'Proteus');
  }
  if (platform === 'linux') {
    const base = env.XDG_DATA_HOME && path.posix.isAbsolute(env.XDG_DATA_HOME) ? env.XDG_DATA_HOME : path.posix.join(home, '.local', 'share');
    return path.posix.join(base, 'proteus');
  }
  return path.posix.join(home, 'Library', 'Application Support', 'Proteus');
}
export const defaultHome = () => applicationHome();
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
    const contents = JSON.stringify(value, null, 2) + '\n';
    fs.writeFileSync(fd, contents); fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    atomicRename(temp, file);
    return Buffer.byteLength(contents);
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
