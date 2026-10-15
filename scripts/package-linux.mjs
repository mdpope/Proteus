// Linux build of the accepted source; Mac signing and iOS packaging stay independent.
import { packager } from '@electron/packager';
import { rebuild } from '@electron/rebuild';
import { preparePty } from './prepare-pty.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

if (process.platform !== 'linux') throw new Error('Build the Linux application on Linux.');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import('./build-terminal.mjs');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const roots = ['desktop', 'public', 'src', 'schemas', 'templates', 'relay'];
const walk = base => fs.readdirSync(path.join(root, base), { withFileTypes: true }).flatMap(entry => {
  if (entry.name === '.DS_Store' || entry.name.startsWith('._')) return [];
  const name = path.posix.join(base, entry.name);
  if (entry.isDirectory()) return walk(name);
  if (!entry.isFile()) throw new Error('Unexpected runtime source: ' + name);
  return [name];
});
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const runtimeFiles = Object.fromEntries([...roots.flatMap(walk), 'AGENTS.md', 'README.md', 'CHANGELOG.md', '.gitignore'].sort().map(name => [name, digest(path.join(root, name))]));
const buildInputs = Object.fromEntries(['package.json', 'package-lock.json', 'scripts/package-linux.mjs', 'scripts/build-terminal.mjs', 'scripts/prepare-pty.mjs', 'docs/linux-upstream-source.json'].map(name => [name, digest(path.join(root, name))]));
const sourceFingerprint = createHash('sha256').update(JSON.stringify({ runtimeFiles, buildInputs })).digest('hex');
const buildRevision = `linux.${sourceFingerprint.slice(0, 12)}`;
const upstream = JSON.parse(fs.readFileSync(path.join(root, 'docs/linux-upstream-source.json'), 'utf8'));
const provenance = { schemaVersion: 1, version: metadata.version, buildRevision, sourceFingerprint, upstream, runtimeFiles, buildInputs };
const verifySource = () => {
  for (const [name, hash] of Object.entries({ ...runtimeFiles, ...buildInputs })) if (digest(path.join(root, name)) !== hash) throw new Error('Source changed during Linux packaging: ' + name);
};
const verifyCopied = base => {
  for (const [name, hash] of Object.entries(runtimeFiles)) if (digest(path.join(base, name)) !== hash) throw new Error('Packaged runtime differs: ' + name);
};
const out = process.env.PROTEUS_PACKAGE_OUTPUT || path.join(root, 'dist');
const bundles = await packager({
  dir: root, out, overwrite: true, name: 'Proteus', executableName: 'proteus',
  platform: 'linux', arch: process.arch, asar: false, icon: path.join(root, 'desktop/icon.png'),
  afterCopy: [async ({ buildPath, electronVersion, arch }) => {
    verifySource(); verifyCopied(buildPath);
    const file = path.join(buildPath, 'package.json');
    const copied = JSON.parse(fs.readFileSync(file, 'utf8')); copied.buildRevision = buildRevision;
    fs.writeFileSync(file, JSON.stringify(copied, null, 2) + '\n');
    fs.writeFileSync(path.join(buildPath, 'build-source.json'), JSON.stringify(provenance, null, 2) + '\n');
    // Rebuild the copied PTY only, retaining the source checkout's Node ABI.
    await rebuild({ buildPath, electronVersion, arch, onlyModules: ['node-pty'], force: true });
    preparePty(buildPath);
  }],
  ignore: [/(?:^|\/)\.DS_Store$/, /(?:^|\/)\._[^/]*$/, /^\/(?:web|ios|test|docs|scripts|extensions|dist|coverage|\.runtime|\.git|\.github|\.agents|\.codex|\.aws)(?:\/|$)/, /^\/\.env/, /\.(?:log|xcresult)$/]
});
for (const bundle of bundles) {
  verifySource(); verifyCopied(path.join(bundle, 'resources', 'app'));
  fs.copyFileSync(path.join(root, 'desktop/icon.png'), path.join(bundle, 'proteus.png'));
  fs.writeFileSync(path.join(bundle, 'proteus.desktop'), '[Desktop Entry]\nType=Application\nName=Proteus\nComment=Scheduled AI work and resumable conversations\nExec=proteus\nTryExec=proteus\nIcon=proteus\nTerminal=false\nCategories=Development;Utility;\nStartupWMClass=Proteus\n');
  const archive = path.join(out, `Proteus-${metadata.version}-linux-${process.arch}.tar.gz`);
  execFileSync('tar', ['-czf', archive, '-C', out, path.basename(bundle)], { stdio: 'inherit' });
  fs.writeFileSync(archive + '.sha256', digest(archive) + '  ' + path.basename(archive) + '\n');
  console.log(JSON.stringify({ executable: path.join(bundle, 'proteus'), archive, version: metadata.version, buildRevision, sourceFingerprint, runtimeFiles: Object.keys(runtimeFiles).length, upstream }));
}
