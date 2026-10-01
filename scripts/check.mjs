import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
for (const directory of ['src', 'desktop', 'public']) for (const file of fs.readdirSync(directory)) {
  if (!/\.(?:js|cjs|mjs)$/.test(file)) continue;
  const result = spawnSync(process.execPath, ['--check', path.join(directory, file)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
