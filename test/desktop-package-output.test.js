import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {beginDesktopPackage, desktopPackageCacheRoot} from '../scripts/desktop-package-output.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-packages-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  let time = 0;
  return {root, options: {cacheRoot: path.join(root, 'cache'), output: '', processes: () => [], now: () => ++time}};
}
function verify(output, revision = 'synthetic') {
  fs.writeFileSync(path.join(output.directory, 'app'), revision);
  output.complete({sourceFingerprint: 'a'.repeat(64), buildRevision: revision});
  output.release();
}

test('all worktrees and flavors share one current development package without extra recovery versions', t => {
  const {options} = fixture(t);
  const dirs = [];
  for (let n = 0; n < 7; n++) {
    const output = beginDesktopPackage({...options, flavor: n % 2 ? 'preview' : 'standard'});
    dirs.push(output.directory); verify(output, `build-${n}`);
    assert.ok(fs.readdirSync(options.cacheRoot).length <= 1);
  }
  assert.deepEqual(dirs.map(dir => fs.existsSync(dir)), [false, false, false, false, false, false, true]);
  assert.equal(fs.readFileSync(path.join(dirs[6], 'app'), 'utf8'), 'build-6');
});

test('failed builds release scratch without retiring successful outputs; overlap is refused', t => {
  const {options} = fixture(t);
  const first = beginDesktopPackage(options); verify(first);
  const failed = beginDesktopPackage(options);
  fs.writeFileSync(path.join(failed.directory, 'partial'), 'large unfinished artifact');
  assert.throws(() => beginDesktopPackage(options), /in use/);
  failed.release(); failed.release();
  assert.equal(fs.existsSync(failed.directory), false);
  assert.equal(fs.existsSync(first.directory), true);
});

test('a killed packager leaves one recognizable partial output, reclaimed on the next build', t => {
  const {options} = fixture(t);
  const code = `import {beginDesktopPackage} from ${JSON.stringify(new URL('../scripts/desktop-package-output.mjs', import.meta.url).href)}; const p=beginDesktopPackage({cacheRoot:process.argv[1],output:'',processes:()=>[]}); process.stdout.write(p.directory);`;
  const partial = execFileSync(process.execPath, ['--input-type=module', '-e', code, options.cacheRoot], {encoding: 'utf8'});
  const next = beginDesktopPackage(options);
  assert.equal(fs.existsSync(partial), false);
  next.release();
});

test('running apps block retirement before another full package is allocated', t => {
  const {options} = fixture(t); const dirs = [];
  const current = beginDesktopPackage(options); dirs.push(current.directory); verify(current);
  assert.throws(() => beginDesktopPackage({...options, processes: () => [path.join(dirs[0], 'Proteus.app/Contents/MacOS/Proteus')]}), /running/);
  assert.equal(fs.readdirSync(options.cacheRoot).length, 1);
  assert.ok(dirs.every(dir => fs.existsSync(dir)));
  const next = beginDesktopPackage(options); verify(next);
  assert.equal(fs.existsSync(dirs[0]), false);
});

test('unknown files, altered receipts and symlinked generations are never treated as cache', t => {
  const {root, options} = fixture(t);
  const existing = beginDesktopPackage(options); verify(existing);
  fs.writeFileSync(path.join(options.cacheRoot, 'unrelated'), 'preserve');
  assert.throws(() => beginDesktopPackage(options), /Unrecognized/);
  fs.unlinkSync(path.join(options.cacheRoot, 'unrelated'));
  const marker = path.join(existing.directory, '.proteus-package-cache.json');
  const receipt = fs.readFileSync(marker, 'utf8'); fs.writeFileSync(marker, '{}');
  assert.throws(() => beginDesktopPackage(options), /invalid/);
  fs.writeFileSync(marker, receipt);
  const outside = path.join(root, 'outside'); fs.mkdirSync(outside); fs.writeFileSync(path.join(outside, 'keep'), 'safe');
  fs.symlinkSync(outside, path.join(options.cacheRoot, '12345678-1234-1234-1234-123456789abc'));
  assert.throws(() => beginDesktopPackage(options), /Unrecognized/);
  assert.equal(fs.readFileSync(path.join(outside, 'keep'), 'utf8'), 'safe');
});

test('explicit release destinations are locked but never pruned, including failures', t => {
  const {root, options} = fixture(t); const output = path.join(root, 'frozen-artifact');
  fs.mkdirSync(output); fs.writeFileSync(path.join(output, 'old-accepted.app'), 'immutable');
  for (let n = 0; n < 5; n++) {
    const build = beginDesktopPackage({...options, output});
    assert.equal(build.managed, false);
    assert.throws(() => beginDesktopPackage({...options, output}), /in use/);
    if (n % 2) build.complete({sourceFingerprint: 'a'.repeat(64), buildRevision: 'explicit'});
    build.release();
  }
  assert.equal(fs.readFileSync(path.join(output, 'old-accepted.app'), 'utf8'), 'immutable');
  assert.equal(fs.existsSync(options.cacheRoot), false);
});

test('OS defaults are machine caches rather than checkout-relative build directories', () => {
  const home = '/synthetic-home';
  assert.equal(desktopPackageCacheRoot({platform: 'darwin', home}), path.join(home, 'Library/Caches/Proteus/DesktopPackages'));
  assert.equal(desktopPackageCacheRoot({platform: 'linux', home, env: {XDG_CACHE_HOME: '/cache'}}), process.platform === 'win32' ? '\\cache\\Proteus\\DesktopPackages' : '/cache/Proteus/DesktopPackages');
  assert.equal(desktopPackageCacheRoot({platform: 'win32', home, env: {LOCALAPPDATA: '/local'}}), process.platform === 'win32' ? '\\local\\Proteus\\DesktopPackages' : '/local/Proteus/DesktopPackages');
});
