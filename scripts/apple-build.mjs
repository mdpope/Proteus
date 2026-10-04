#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const action = args.shift() || 'doctor';
const options = {};
while (args.length) {
  const flag = args.shift();
  if (!['--device', '--only'].includes(flag) || !args[0] || args[0].startsWith('--')) throw new Error('Usage: apple-build.mjs doctor|build|test [--device SIMULATOR_UUID] [--only TARGET/CLASS/TEST]');
  if (flag === '--only') (options[flag] ||= []).push(args.shift());
  else {
    if (options[flag]) throw new Error(`Duplicate option: ${flag}`);
    options[flag] = args.shift();
  }
}
if (!['doctor', 'build', 'test'].includes(action)) throw new Error('Choose doctor, build or test.');
if (options['--only'] && action !== 'test') throw new Error('--only applies to test.');
const fallback = '/Applications/Xcode.app/Contents/Developer';
const selected = process.env.DEVELOPER_DIR || execFileSync('xcode-select', ['-p'], {encoding:'utf8'}).trim();
const developer = fs.existsSync(path.join(selected, 'usr/bin/xcodebuild')) ? selected : fallback;
if (!fs.existsSync(path.join(developer, 'usr/bin/xcodebuild'))) throw new Error('Install full Xcode or set DEVELOPER_DIR to its Contents/Developer folder.');
const env = {...process.env, DEVELOPER_DIR: developer};
const exec = (command, argv) => execFileSync(command, argv, {cwd:root, env, encoding:'utf8'});
console.log(exec('xcodebuild', ['-version']).trim());
const devices = Object.entries(JSON.parse(exec('xcrun', ['simctl', 'list', 'devices', 'available', '--json'])).devices)
  .filter(([runtime]) => runtime.includes('.iOS-')).flatMap(([runtime, list]) => list.map(device => ({...device, runtime})));
if (action === 'doctor') {
  console.log(`Developer tools: ${developer}`);
  for (const device of devices) console.log(`${device.udid}  ${device.name}  ${device.runtime.split('.').at(-1)}  ${device.state}`);
  console.log('Existing project: ios/Proteus.xcodeproj. Simulator checks do not verify physical-device signing or installation.');
  process.exit(0);
}
const device = options['--device'] ? devices.find(item => item.udid === options['--device']) : devices.find(item => item.name.startsWith('iPhone'));
if (!device) throw new Error('No matching available iOS simulator. Use doctor to list simulator identifiers.');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-apple-'));
const resultPath = path.join(output, 'Tests.xcresult');
const buildArgs = ['-project', path.join(root, 'ios/Proteus.xcodeproj'), '-scheme', 'Proteus', '-destination', `platform=iOS Simulator,id=${device.udid}`, '-derivedDataPath', path.join(output, 'DerivedData'), '-parallel-testing-enabled', 'NO'];
if (process.env.PROTEUS_CLANG_PROBE_WORKAROUND === '1') {
  const compiler = exec('xcrun', ['--find', 'clang']).trim();
  const wrapper = path.join(output, 'clang-probe.py');
  fs.writeFileSync(wrapper, `#!/usr/bin/python3
import os, subprocess, sys
compiler = ${JSON.stringify(compiler)}
args = sys.argv[1:]
if all(value in args for value in ['-v', '-E', '-dM', '/dev/null']):
    result = subprocess.run([compiler, *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    sys.stdout.buffer.write(result.stdout)
    sys.stdout.buffer.flush()
    os.close(1)
    sys.stderr.buffer.write(result.stderr)
    sys.stderr.buffer.flush()
    os._exit(result.returncode)
else:
    os.execv(compiler, [compiler, *args])
`, {mode:0o700});
  buildArgs.push(`CC=${wrapper}`);
  console.log('Temporary clang probe pipe workaround enabled; normal compilation uses the original compiler.');
}
if (action === 'test') buildArgs.push('-resultBundlePath', resultPath);
for (const target of options['--only'] || []) buildArgs.push(`-only-testing:${target}`);
buildArgs.push(action);
console.log(`${action}: ${device.name}; logs and results: ${output}`);
let fixture, child;
const stop = async process => {
  if (!process?.pid || process.exitCode !== null || process.signalCode !== null) return;
  await new Promise(resolve => { process.once('exit', resolve); process.kill('SIGTERM'); });
};
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await stop(child); await stop(fixture); process.exit(130); });
async function requireFreePort(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Port ${port} is occupied. Stop only your own mobile fixture before testing.`)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}
try {
  if (action === 'test') {
    await requireFreePort(4328); await requireFreePort(4329);
    child = spawn('xcrun', ['simctl', 'bootstatus', device.udid, '-b'], {cwd:root, env, stdio:'inherit'});
    const bootCode = await new Promise((resolve, reject) => {child.once('error', reject); child.once('exit', resolve);});
    if (bootCode !== 0) throw new Error('Simulator did not finish booting. No fixture or test was started.');
    fixture = spawn(process.execPath, ['test/mobile-host.mjs'], {cwd:root, env:{...env, PROTEUS_TEST_CONTAINER:'0'}, stdio:['ignore','pipe','pipe']});
    const fixtureLog = fs.createWriteStream(path.join(output, 'fixture.log'));
    fixture.stdout.pipe(fixtureLog); fixture.stderr.pipe(fixtureLog);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Synthetic mobile fixture did not become ready; inspect fixture.log.')), 30_000);
      const finish = callback => {clearTimeout(timeout); fixture.off('exit', onExit); fixture.stdout.off('data', onData); callback();};
      const onExit = code => finish(() => reject(new Error(`Synthetic fixture exited (${code}); inspect fixture.log.`)));
      let output = '';
      const onData = data => {output += data; if (output.includes('Synthetic mobile test host ready.')) finish(resolve);};
      fixture.once('error', error => finish(() => reject(error)));
      fixture.once('exit', onExit); fixture.stdout.on('data', onData);
    });
  }
  const log = fs.createWriteStream(path.join(output, 'xcodebuild.log'));
  child = spawn('xcodebuild', buildArgs, {cwd:root, env, stdio:['ignore','pipe','pipe']});
  child.stdout.pipe(log); child.stderr.pipe(log);
  child.stdout.on('data', data => {for (const line of String(data).split('\n')) if (/Test (Suite|Case)|Executed |\*\* (TEST|BUILD)|error:|warning:/.test(line)) console.log(line);});
  child.stderr.on('data', data => process.stderr.write(data));
  const code = await new Promise((resolve, reject) => {child.once('error', reject); child.once('exit', resolve);});
  if (code !== 0) throw new Error(`xcodebuild failed (${code}). Inspect ${path.join(output, 'xcodebuild.log')}`);
  console.log(`Verified ${action} on ${device.name}. Artifacts: ${output}`);
} finally { await stop(fixture); }
