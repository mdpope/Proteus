import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const script = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(script), '..');
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// Build-host only. Never called by the desktop or an end-user postinstall.
export function buildWindowsTerminalGuardian({output, testOnlyJobFailureSeam = false}) {
  if (process.platform !== 'win32' || process.arch !== 'x64' || !output || !path.isAbsolute(output)) {
    throw Error('Provide a new absolute helper output path on Windows x64.');
  }
  // A dangling link still occupies the output path; never let the compiler
  // follow it to another destination under the guise of a fresh build.
  if (fs.lstatSync(output, {throwIfNoEntry: false})) throw Error('Refuse to overwrite an existing helper.');
  const source = path.join(root, 'native/windows-terminal/guardian.cs');
  const compiler = path.join(process.env.SystemRoot || 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
  if (!fs.existsSync(compiler)) {
    throw Error('Existing Windows .NET Framework compiler is required on the build host.');
  }
  const sourceSha256 = sha256(source);
  const compilerSha256 = sha256(compiler);
  fs.mkdirSync(path.dirname(output), {recursive: true});
  const args = [
    '/nologo', '/target:exe', '/platform:x64', '/optimize+',
    '/reference:System.Web.Extensions.dll',
    ...(testOnlyJobFailureSeam ? ['/define:TEST_JOB_FAILURE'] : []),
    '/out:' + output, source
  ];
  const result = spawnSync(compiler, args, {stdio: 'inherit', windowsHide: true});
  if (result.status !== 0) throw Error('Guardian compiler failed.');
  if (sha256(source) !== sourceSha256) {
    throw Error('Guardian source changed during compilation; output is unverified.');
  }
  if (sha256(compiler) !== compilerSha256) {
    throw Error('Guardian compiler changed during compilation; output is unverified.');
  }
  return {
    sourceSha256,
    helperSha256: sha256(output),
    compilerSha256,
    testOnlyJobFailureSeam,
    output
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  console.log(JSON.stringify(buildWindowsTerminalGuardian({
    output: process.argv[2],
    testOnlyJobFailureSeam: process.argv.includes('--test-job-failure')
  })));
}
