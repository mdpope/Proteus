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
if (action === 'test') {
  if (process.env.PROTEUS_IOS_TEST_TIMEOUTS === '1') {
    buildArgs.push('-test-timeouts-enabled', 'YES', '-default-test-execution-time-allowance', '300', '-maximum-test-execution-time-allowance', '600');
  }
}
for (const target of options['--only'] || []) buildArgs.push(`-only-testing:${target}`);
buildArgs.push(action === 'test' ? 'build-for-testing' : action);
console.log(`${action}: ${device.name}; logs and results: ${output}`);
let fixture, child;
const stop = async childProcess => {
  if (!childProcess?.pid || childProcess.exitCode !== null || childProcess.signalCode !== null) return;
  await new Promise(resolve => {
    const timeout = setTimeout(() => childProcess.kill('SIGKILL'), 8_000);
    childProcess.once('exit', () => { clearTimeout(timeout); resolve(); });
    childProcess.kill('SIGTERM');
  });
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
    const freePort=()=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
    const relayPort=await freePort(),httpPort=await freePort();
    env.PROTEUS_TEST_RELAY_PORT=String(relayPort);env.PROTEUS_TEST_HTTP_PORT=String(httpPort);
    env.TEST_RUNNER_PROTEUS_TEST_HTTP_ORIGIN='http://127.0.0.1:'+httpPort;
    env.TEST_RUNNER_PROTEUS_TEST_RELAY_ORIGIN='ws://127.0.0.1:'+relayPort;
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
  const runBuild = async (arguments_, name) => {
    const log = fs.createWriteStream(path.join(output, name));
    child = spawn('xcodebuild', arguments_, {cwd:root, env, stdio:['ignore','pipe','pipe']});
    child.stdout.pipe(log); child.stderr.pipe(log);
    child.stdout.on('data', data => {for (const line of String(data).split('\n')) if (/Test (Suite|Case)|Executed |\*\* (TEST|BUILD)|error:|warning:/.test(line)) console.log(line);});
    child.stderr.on('data', data => process.stderr.write(data));
    const code = await new Promise((resolve, reject) => {child.once('error', reject); child.once('exit', resolve);});
    if (code !== 0) throw new Error(`xcodebuild failed (${code}). Inspect ${path.join(output, name)}`);
  };
  await runBuild(buildArgs, 'xcodebuild.log');
  if (action === 'test') {
    // xcodebuild does not reliably forward arbitrary TEST_RUNNER_ variables to
    // UI runners. Bind each generated test target to this run's actual ports.
    const products=path.join(output,'DerivedData/Build/Products');
    const runs=fs.readdirSync(products).filter(name=>name.endsWith('.xctestrun'));
    if(runs.length!==1)throw Error('Expected one generated native test run.');
    const file=path.join(products,runs[0]);
    const configuration=JSON.parse(exec('/usr/bin/plutil',['-convert','json','-o','-',file]));
    let targets=0;
    const bind=value=>{
      if(!value||typeof value!=='object')return;
      if(value.TestBundlePath){targets++;value.EnvironmentVariables={...value.EnvironmentVariables,PROTEUS_TEST_HTTP_ORIGIN:env.TEST_RUNNER_PROTEUS_TEST_HTTP_ORIGIN,PROTEUS_TEST_RELAY_ORIGIN:env.TEST_RUNNER_PROTEUS_TEST_RELAY_ORIGIN};}
      for(const item of Object.values(value))if(item&&typeof item==='object')bind(item);
    };
    bind(configuration);if(!targets)throw Error('No native test targets were found.');
    fs.writeFileSync(file,JSON.stringify(configuration));exec('/usr/bin/plutil',['-convert','xml1',file]);
    const testing=['test-without-building','-xctestrun',file,'-destination',`platform=iOS Simulator,id=${device.udid}`,'-parallel-testing-enabled','NO','-resultBundlePath',resultPath];
    for(const target of options['--only']||[])testing.push('-only-testing:'+target);
    if(process.env.PROTEUS_IOS_TEST_TIMEOUTS==='1')testing.push('-test-timeouts-enabled','YES','-default-test-execution-time-allowance','300','-maximum-test-execution-time-allowance','600');
    await runBuild(testing,'test-without-building.log');
  }
  console.log(`Verified ${action} on ${device.name}. Artifacts: ${output}`);
} finally { await stop(fixture); }
