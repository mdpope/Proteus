import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Compiler output is reproducible cache data, separate from per-run test evidence.
export function acquireAppleBuildCache(directory = path.join(os.homedir(), 'Library/Caches/Proteus/AppleSimulatorBuild')) {
  fs.mkdirSync(directory, {recursive: true});
  directory = fs.realpathSync(directory);
  const lock = directory + '.lock';
  let descriptor;
  try { descriptor = fs.openSync(lock, 'wx', 0o600); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const observed = fs.lstatSync(lock);
    if (!observed.isFile() || observed.isSymbolicLink()) throw Error('Inspect the simulator compiler-cache lock before retrying.');
    const owner = JSON.parse(fs.readFileSync(lock, 'utf8'));
    if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) throw Error('Inspect the simulator compiler-cache lock before retrying.');
    let running = true;
    try { process.kill(owner.pid, 0); } catch (failure) { if (failure.code === 'ESRCH') running = false; }
    if (running) throw Error('The simulator compiler cache is in use. Wait for that build; do not start a second copy.');
    const current = fs.lstatSync(lock);
    if (current.ino !== observed.ino || current.dev !== observed.dev) throw Error('Simulator compiler-cache ownership changed; retry after inspection.');
    fs.unlinkSync(lock);
    descriptor = fs.openSync(lock, 'wx', 0o600);
  }
  fs.writeFileSync(descriptor, JSON.stringify({pid: process.pid}));
  const identity = fs.fstatSync(descriptor);
  fs.closeSync(descriptor);
  let released = false;
  return {directory, release() {
    if (released) return;
    released = true;
    try {
      const current = fs.lstatSync(lock);
      if (current.ino === identity.ino && current.dev === identity.dev) fs.unlinkSync(lock);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }};
}
