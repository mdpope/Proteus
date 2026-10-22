import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDesktopSnapshot, createProvenance, verifyDesktopMetadata, desktopRuntimeRoots, desktopRuntimeFiles, desktopPackageIgnore } from '../scripts/desktop-build.mjs';

test('Mac and Linux snapshots freeze runtime bytes and reject changed source or package extras', t => {
  const root = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-build-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const name of desktopRuntimeRoots) { fs.mkdirSync(path.join(root, name)); fs.writeFileSync(path.join(root, name, 'fixture.js'), '// synthetic'); }
  for (const name of desktopRuntimeFiles) fs.writeFileSync(path.join(root, name), 'synthetic');
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  const snapshot = createDesktopSnapshot(root, ['package.json'], { gitHead: 'synthetic', dirty: false });
  const copy = path.join(root, 'copy'); fs.mkdirSync(copy);
  for (const name of [...desktopRuntimeRoots, ...desktopRuntimeFiles, 'package.json']) fs.cpSync(path.join(root, name), path.join(copy, name), { recursive: true });
  fs.mkdirSync(path.join(copy, 'node_modules'));
  assert.doesNotThrow(() => snapshot.verifySource()); assert.doesNotThrow(() => snapshot.verifyCopied(copy));
  fs.writeFileSync(path.join(root, 'src/new-runtime.js'), '// new'); assert.throws(() => snapshot.verifySource(), /file-name set changed/); fs.unlinkSync(path.join(root, 'src/new-runtime.js'));
  fs.writeFileSync(path.join(copy, 'src/fixture.js'), 'tampered'); assert.throws(() => snapshot.verifyCopied(copy), /differs from source/);
  fs.writeFileSync(path.join(copy, 'src/fixture.js'), '// synthetic');
  fs.mkdirSync(path.join(copy, '.aws')); assert.throws(() => snapshot.verifyCopied(copy), /directory set/); fs.rmdirSync(path.join(copy, '.aws'));
  for (const target of ['src/fixture.js', 'src', 'missing-target']) {
    const link = path.join(copy, 'unlisted-link'); fs.symlinkSync(target, link);
    assert.throws(() => snapshot.verifyCopied(copy), /non-file\/non-directory entry/, 'Reject file, directory and broken symbolic links at package root');
    fs.unlinkSync(link);
  }
  assert.doesNotThrow(() => snapshot.verifyCopied(copy));
  fs.writeFileSync(path.join(copy, 'unexpected.txt'), 'extra'); assert.throws(() => snapshot.verifyCopied(copy), /file-name set/);
  fs.writeFileSync(path.join(root, 'package.json'), '{"changed":true}'); assert.throws(() => snapshot.verifySource(), /Source changed/);
});

test('both desktop packages exclude private configuration, web source, test state and metadata sidecars', () => {
  for (const file of ['/local-records', '/local-records/apple-browser-review/README.md', '/.env', '/.aws', '/.codex', '/.agents', '/.runtime', '/.git', '/web', '/test', '/public/._app.js', '/desktop/.DS_Store']) assert.ok(desktopPackageIgnore.some(pattern => pattern.test(file)), file);
  for (const file of ['/public/host-platform.js', '/src/credential-storage.js', '/desktop/platform.cjs']) assert.equal(desktopPackageIgnore.some(pattern => pattern.test(file)), false, file);
});

test('both desktop builds verify final version metadata and complete embedded provenance', t => {
  const base = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-metadata-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const source = { name: 'synthetic', version: '1.2.3', buildRevision: 'source', private: true, scripts: { test: 'false' }, dependencies: { dependency: '1.0.0' } };
  const provenance = createProvenance({ buildRevision: 'synthetic.123', runtimeFiles: { 'src/a.js': 'b'.repeat(64) }, buildInputs: {} });
  const metadata = { name: source.name, version: source.version, buildRevision: provenance.buildRevision, dependencies: source.dependencies };
  fs.writeFileSync(path.join(base, 'package.json'), JSON.stringify(metadata));
  fs.writeFileSync(path.join(base, 'build-source.json'), JSON.stringify(provenance));
  assert.doesNotThrow(() => verifyDesktopMetadata(base, source, provenance));
  fs.writeFileSync(path.join(base, 'package.json'), JSON.stringify({ ...metadata, version: 'old' }));
  assert.throws(() => verifyDesktopMetadata(base, source, provenance), /version or build metadata/);
  fs.writeFileSync(path.join(base, 'package.json'), JSON.stringify(metadata));
  fs.writeFileSync(path.join(base, 'build-source.json'), JSON.stringify({ ...provenance, runtimeFiles: {} }));
  assert.throws(() => verifyDesktopMetadata(base, source, provenance), /source provenance/);
});

test('contributor and security documentation stay in the repository, outside app runtime',()=>{for(const file of ['/CONTRIBUTING.md','/SECURITY.md'])assert.ok(desktopPackageIgnore.some(pattern=>pattern.test(file)));});
