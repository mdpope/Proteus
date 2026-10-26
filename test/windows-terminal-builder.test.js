import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {buildWindowsTerminalGuardian} from '../scripts/build-windows-terminal-guardian.mjs';

test('guardian builder import is inert and exports a build function', () => {
  assert.equal(typeof buildWindowsTerminalGuardian, 'function');
  const url = new URL('../scripts/build-windows-terminal-guardian.mjs', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', 'await import(' + JSON.stringify(url) + ')'], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});

test('guardian builder refuses an existing output and never changes its bytes', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-guardian-builder-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const output = path.join(dir, 'existing.exe');
  fs.writeFileSync(output, 'DO_NOT_REPLACE');
  const expected = process.platform === 'win32' && process.arch === 'x64' ? /overwrite/ : /Windows x64/;
  assert.throws(() => buildWindowsTerminalGuardian({output}), expected);
  assert.equal(fs.readFileSync(output, 'utf8'), 'DO_NOT_REPLACE');
  const linkedOutput=path.join(dir,'linked.exe'),missing=path.join(dir,'missing.exe');
  fs.symlinkSync(missing,linkedOutput);
  assert.throws(()=>buildWindowsTerminalGuardian({output:linkedOutput}),expected);
  assert.equal(fs.existsSync(missing),false,'compiler cannot create output through a dangling link');
});

for (const mutated of ['source', 'compiler']) {
  test('Windows guardian receipt rejects a concurrent ' + mutated + ' edit', {
    skip: process.platform !== 'win32' || process.arch !== 'x64'
  }, t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-builder-race-'));
    t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
    const scripts = path.join(dir, 'scripts');
    const native = path.join(dir, 'native', 'windows-terminal');
    const system = path.join(dir, 'owned-system-fixture');
    const compilerDir = path.join(system, 'Microsoft.NET', 'Framework64', 'v4.0.30319');
    for (const folder of [scripts, native, compilerDir]) fs.mkdirSync(folder, {recursive: true});
    fs.copyFileSync(new URL('../scripts/build-windows-terminal-guardian.mjs', import.meta.url), path.join(scripts, 'build-windows-terminal-guardian.mjs'));
    const source = path.join(native, 'guardian.cs');
    const compiler = path.join(compilerDir, 'csc.exe');
    const output = path.join(dir, 'unverified-output.exe');
    const copiedBuilder = path.join(scripts, 'build-windows-terminal-guardian.mjs');
    const discovery = "path.join(process.env.SystemRoot || 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe')";
    const copiedSource = fs.readFileSync(copiedBuilder, 'utf8');
    assert.ok(copiedSource.includes(discovery));
    fs.writeFileSync(copiedBuilder, copiedSource.replace(discovery, JSON.stringify(compiler)));
    fs.writeFileSync(source, 'ORIGINAL_SOURCE');
    fs.writeFileSync(compiler, 'ORIGINAL_COMPILER');
    const runner = path.join(dir, 'run.mjs');
    const change = mutated === 'source' ? source : compiler;
    // The copied builder still uses its real hash/receipt logic. Only the compiler
    // invocation is mocked; all paths, mutations and bytes belong to this fixture.
    const fakeCompiler = `import fs from 'node:fs';export function spawnSync(){fs.writeFileSync(${JSON.stringify(output)},'UNVERIFIED_ARTIFACT');fs.appendFileSync(${JSON.stringify(change)},'CHANGED_DURING_COMPILE');return {status:0};}`;
    fs.writeFileSync(runner, `import {registerHooks} from 'node:module';import assert from 'node:assert/strict';registerHooks({load(url,context,next){if(url==='node:child_process')return {format:'module',source:${JSON.stringify(fakeCompiler)},shortCircuit:true};return next(url,context);}});const {buildWindowsTerminalGuardian}=await import('./scripts/build-windows-terminal-guardian.mjs');assert.throws(()=>buildWindowsTerminalGuardian({output:${JSON.stringify(output)}}),/${mutated} changed during compilation/);`);
    const result = spawnSync(process.execPath, [runner], {
      env: process.env, encoding: 'utf8', windowsHide: true
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.readFileSync(output, 'utf8'), 'UNVERIFIED_ARTIFACT');
  });
}
