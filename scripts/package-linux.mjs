// Linux packaging is independent of the Mac signing and iOS build pipelines.
import { packager } from '@electron/packager';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

if (process.platform !== 'linux') throw new Error('Build the Linux application on Linux.');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const bundles = await packager({
  dir: root, out, overwrite: true, name: 'Proteus', executableName: 'proteus',
  platform: 'linux', arch: process.arch, asar: false,
  icon: path.join(root, 'desktop/icon.png'),
  ignore: [/^\/(?:ios|test|docs|scripts|extensions|dist|coverage|\.runtime|\.git|\.github|\.agents|\.codex|\.aws)(?:\/|$)/, /^\/\.env/, /\.(?:log|xcresult)$/]
});
for (const bundle of bundles) {
  fs.copyFileSync(path.join(root, 'desktop/icon.png'), path.join(bundle, 'proteus.png'));
  fs.writeFileSync(path.join(bundle, 'proteus.desktop'), '[Desktop Entry]\nType=Application\nName=Proteus\nComment=Scheduled AI work and resumable conversations\nExec=proteus\nTryExec=proteus\nIcon=proteus\nTerminal=false\nCategories=Development;Utility;\nStartupWMClass=Proteus\n');
  const archive = bundle + '.tar.gz';
  execFileSync('tar', ['-czf', archive, '-C', out, path.basename(bundle)], { stdio: 'inherit' });
  console.log(`Executable: ${path.join(bundle, 'proteus')}\nArchive: ${archive}`);
}
