import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {acquireAppleBuildCache} from '../scripts/apple-build-cache.mjs';

test('successive builds reuse compiler products and refuse overlapping owners', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-compiler-cache-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const directory = path.join(root, 'cache');
  const first = acquireAppleBuildCache(directory);
  fs.writeFileSync(path.join(first.directory, 'compiled-product'), 'retained');
  assert.throws(() => acquireAppleBuildCache(directory), /in use/);
  first.release(); first.release();
  const second = acquireAppleBuildCache(directory);
  assert.equal(fs.readFileSync(path.join(second.directory, 'compiled-product'), 'utf8'), 'retained');
  second.release();
});

test('a malformed or linked cache lock is preserved for inspection', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-compiler-cache-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const directory = path.join(root, 'cache'); fs.mkdirSync(directory);
  fs.writeFileSync(directory + '.lock', JSON.stringify({pid: -1}));
  assert.throws(() => acquireAppleBuildCache(directory), /Inspect/);
  fs.unlinkSync(directory + '.lock');
  const protectedFile = path.join(root, 'protected'); fs.writeFileSync(protectedFile, 'unchanged');
  fs.symlinkSync(protectedFile, directory + '.lock');
  assert.throws(() => acquireAppleBuildCache(directory), /Inspect/);
  assert.equal(fs.readFileSync(protectedFile, 'utf8'), 'unchanged');
});

test('a build whose process exited does not strand the shared compiler cache', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-compiler-cache-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const directory = path.join(root, 'cache');
  execFileSync(process.execPath, ['--input-type=module', '-e',
    `import {acquireAppleBuildCache} from ${JSON.stringify(new URL('../scripts/apple-build-cache.mjs', import.meta.url).href)}; acquireAppleBuildCache(process.argv[1]);`, directory]);
  const next = acquireAppleBuildCache(directory);
  next.release();
  assert.equal(fs.existsSync(next.directory + '.lock'), false);
});
