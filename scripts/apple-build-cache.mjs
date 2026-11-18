import os from 'node:os';
import path from 'node:path';
import {acquireBuildCache} from './build-cache-lock.mjs';

// Compiler output is reproducible cache data, separate from per-run test evidence.
export function acquireAppleBuildCache(directory = path.join(os.homedir(), 'Library/Caches/Proteus/AppleSimulatorBuild')) {
  return acquireBuildCache(directory, 'simulator compiler cache');
}
