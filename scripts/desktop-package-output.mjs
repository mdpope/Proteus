import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {acquireBuildCache} from './build-cache-lock.mjs';

const marker = '.proteus-package-cache.json';
const kind = 'proteus-development-package';
const idPattern = /^[a-f0-9-]{36}$/;

export function desktopPackageCacheRoot({platform = process.platform, env = process.env, home = os.homedir()} = {}) {
  const base = platform === 'darwin' ? path.join(home, 'Library/Caches')
    : platform === 'win32' ? env.LOCALAPPDATA || path.join(home, 'AppData/Local')
      : env.XDG_CACHE_HOME || path.join(home, '.cache');
  return path.join(base, 'Proteus', 'DesktopPackages');
}

function runningCommands() {
  // Values stay in memory and are never logged. A failed inventory refuses retirement.
  if (process.platform === 'win32') return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    'Get-CimInstance Win32_Process -ErrorAction Stop | ForEach-Object { $_.ExecutablePath }'], {encoding: 'utf8'}).split(/\r?\n/);
  return execFileSync('ps', ['-axo', 'command='], {encoding: 'utf8'}).split('\n');
}

function readReceipt(directory) {
  const file = path.join(directory, marker);
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink()) throw Error('Package cache receipt is not a regular file; inspect before cleanup.');
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (receipt.schema !== 1 || receipt.kind !== kind || receipt.id !== path.basename(directory)
    || !['building', 'verified'].includes(receipt.state) || !Number.isFinite(receipt.createdAt)
    || (receipt.state === 'verified' && (!Number.isFinite(receipt.completedAt) || !/^[a-f0-9]{64}$/.test(receipt.sourceFingerprint)))) {
    throw Error('Package cache receipt is invalid; inspect before cleanup.');
  }
  return receipt;
}

function inventory(root) {
  return fs.readdirSync(root).map(name => {
    const directory = path.join(root, name);
    if (!idPattern.test(name) || !fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink()) {
      throw Error('Unrecognized package cache entry; inspect before cleanup.');
    }
    return {directory, receipt: readReceipt(directory)};
  });
}

function retire(entries, processes) {
  const commands = processes();
  // Check the entire plan before removing any generation. Never unlink a running development app.
  for (const {directory} of entries) {
    if (commands.some(command => command.toLowerCase().includes((directory + path.sep).toLowerCase()))) {
      throw Error('A package selected for retirement is running. Close that development app before packaging again.');
    }
  }
  for (const {directory, receipt} of entries) {
    if (JSON.stringify(readReceipt(directory)) !== JSON.stringify(receipt)) throw Error('Package cache ownership changed during cleanup.');
    fs.rmSync(directory, {recursive: true});
  }
}

// Explicit destinations are frozen release/updater artifacts, never cache-retention candidates.
// Defaults share one current package across worktrees and flavors. Older recovery versions
// belong to the updater, not this cache.
export function beginDesktopPackage({output = process.env.PROTEUS_PACKAGE_OUTPUT, cacheRoot = desktopPackageCacheRoot(),
  processes = runningCommands, now = Date.now, flavor = 'standard'} = {}) {
  if (output) {
    const lock = acquireBuildCache(path.resolve(output), 'package output');
    return {directory: lock.directory, managed: false, complete() {}, release: lock.release};
  }
  if (fs.existsSync(cacheRoot) && fs.lstatSync(cacheRoot).isSymbolicLink()) throw Error('Package cache must not be a symbolic link.');
  const lock = acquireBuildCache(cacheRoot, 'desktop package cache');
  const root = lock.directory;
  let directory, completed = false, released = false, receipt;
  try {
    const entries = inventory(root);
    retire(entries.filter(entry => entry.receipt.state === 'building'), processes);
    // Refuse a new large copy when known active outputs would block the subsequent rotation.
    const verified = entries.filter(entry => entry.receipt.state === 'verified').sort((a, b) => b.receipt.completedAt - a.receipt.completedAt);
    const prospective = verified;
    if (prospective.length) {
      const commands = processes();
      if (prospective.some(entry => commands.some(command => command.toLowerCase().includes((entry.directory + path.sep).toLowerCase())))) {
        throw Error('An older development package is running and blocks retention. Close it before packaging again.');
      }
    }
    const id = randomUUID();
    directory = path.join(root, id);
    fs.mkdirSync(directory);
    receipt = {schema: 1, kind, id, state: 'building', createdAt: now(), platform: process.platform, arch: process.arch, flavor};
    fs.writeFileSync(path.join(directory, marker), JSON.stringify(receipt) + '\n', {flag: 'wx', mode: 0o600});
    return {directory, managed: true, complete({sourceFingerprint, buildRevision}) {
      if (completed) throw Error('Package generation is already complete.');
      if (!/^[a-f0-9]{64}$/.test(sourceFingerprint) || !buildRevision) throw Error('Verified package identity is required.');
      receipt = {...receipt, state: 'verified', completedAt: now(), sourceFingerprint, buildRevision};
      // Publish only after the caller verifies package bytes/signing. Atomic replacement
      // leaves a recognizable incomplete build if the process crashes before publication.
      const nextReceipt = path.join(directory, marker + '.next');
      fs.writeFileSync(nextReceipt, JSON.stringify(receipt) + '\n', {flag: 'wx', mode: 0o600});
      fs.renameSync(nextReceipt, path.join(directory, marker));
      completed = true;
      const old = inventory(root).filter(entry => entry.directory !== directory && entry.receipt.state === 'verified')
        .sort((a, b) => b.receipt.completedAt - a.receipt.completedAt);
      retire(old, processes);
    }, release() {
      if (released) return;
      released = true;
      try {
        if (!completed && directory) retire([{directory, receipt: readReceipt(directory)}], processes);
      } finally { lock.release(); }
    }};
  } catch (error) {
    lock.release();
    throw error;
  }
}
