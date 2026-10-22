import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const desktopRuntimeRoots = ['desktop', 'public', 'src', 'schemas', 'templates', 'relay'];
export const desktopRuntimeFiles = ['.gitignore', 'AGENTS.md', 'CHANGELOG.md', 'README.md'];
export const desktopPackageIgnore = [/(?:^|\/)\.DS_Store$/, /(?:^|\/)\._[^/]*$/, /^\/(?:web|ios|test|docs|scripts|extensions|dist|coverage|local-records|\.runtime|\.git|\.github|\.agents|\.codex|\.aws)(?:\/|$)/, /^\/\.env/, /\.(?:log|xcresult)$/];
export const fileDigest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function collect(root, relative) {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '.DS_Store' || entry.name.startsWith('._')) return [];
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) return collect(root, name);
    if (!entry.isFile()) throw new Error('Runtime source contains a non-file: ' + name);
    return [name];
  });
}

// Both platforms freeze the same runtime surface; signing remains in the Mac entry point.
export function createDesktopSnapshot(root, buildInputPaths, identity = {}) {
  const runtimeFiles = Object.fromEntries([...desktopRuntimeRoots.flatMap(name => collect(root, name)), ...desktopRuntimeFiles].sort().map(name => [name, fileDigest(path.join(root, name))]));
  const buildInputs = Object.fromEntries(buildInputPaths.map(name => [name, fileDigest(path.join(root, name))]));
  const sourceFingerprint = createHash('sha256').update(JSON.stringify({ runtimeFiles, buildInputs, ...identity })).digest('hex');
  const verifySource = () => {
    const current = [...desktopRuntimeRoots.flatMap(name => collect(root, name)), ...desktopRuntimeFiles].sort();
    if (JSON.stringify(current) !== JSON.stringify(Object.keys(runtimeFiles).sort())) throw new Error('Runtime source file-name set changed during packaging.');
    for (const [name, hash] of Object.entries({ ...runtimeFiles, ...buildInputs })) if (fileDigest(path.join(root, name)) !== hash) throw new Error('Source changed during packaging: ' + name);
  };
  const verifyCopied = base => {
    const entries = fs.readdirSync(base, { withFileTypes: true });
    for (const entry of entries) if (!entry.isFile() && !entry.isDirectory()) throw new Error('Packaged runtime root contains a non-file/non-directory entry: ' + entry.name);
    const directories = entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    if (JSON.stringify(directories) !== JSON.stringify([...desktopRuntimeRoots, 'node_modules'].sort())) throw new Error('Packaged runtime directory set differs from source snapshot.');
    const copied = [...desktopRuntimeRoots.flatMap(name => collect(base, name)), ...entries.filter(entry => entry.isFile() && !['package.json', 'build-source.json'].includes(entry.name)).map(entry => entry.name)].sort();
    if (JSON.stringify(copied) !== JSON.stringify(Object.keys(runtimeFiles).sort())) throw new Error('Packaged runtime file-name set differs from source snapshot.');
    for (const [name, hash] of Object.entries(runtimeFiles)) if (fileDigest(path.join(base, name)) !== hash) throw new Error('Packaged runtime differs from source: ' + name);
  };
  return { runtimeFiles, buildInputs, sourceFingerprint, verifySource, verifyCopied };
}

export function verifyDesktopMetadata(base, sourceMetadata, provenance) {
  const embedded = JSON.parse(fs.readFileSync(path.join(base, 'build-source.json'), 'utf8'));
  if (JSON.stringify(embedded) !== JSON.stringify(provenance)) throw new Error('Packaged source provenance differs from build snapshot.');
  const metadata = JSON.parse(fs.readFileSync(path.join(base, 'package.json'), 'utf8'));
  const expected = Object.fromEntries(Object.entries(sourceMetadata).filter(([key]) => !['private', 'scripts', 'devDependencies', 'overrides'].includes(key)));
  expected.buildRevision = provenance.buildRevision;
  if (JSON.stringify(metadata) !== JSON.stringify(expected)) throw new Error('Packaged version or build metadata differs from source snapshot.');
}
