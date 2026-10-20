import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';

// Keep braces and declarations, masking Swift comments and string contents so
// fixture HTML, commented examples and nested helpers cannot become test names.
function declarationsOnly(source) {
  let output = '', offset = 0;
  const masked = (start, end) => source.slice(start, end).replace(/[^\r\n]/g, ' ');
  while (offset < source.length) {
    const start = offset;
    if (source.startsWith('//', offset)) {
      offset = source.indexOf('\n', offset); if (offset < 0) offset = source.length;
    } else if (source.startsWith('/*', offset)) {
      offset += 2; let depth = 1;
      while (offset < source.length && depth) {
        if (source.startsWith('/*', offset)) { depth++; offset += 2; }
        else if (source.startsWith('*/', offset)) { depth--; offset += 2; }
        else offset++;
      }
      if (depth) throw new Error('Unterminated Swift comment in UI test inventory.');
    } else {
      const literal = /^(#*)("""|")/.exec(source.slice(offset));
      if (!literal) { output += source[offset++]; continue; }
      const hashes = literal[1], delimiter = literal[2] + hashes, escape = '\\' + hashes;
      offset += literal[0].length; let closed = false;
      while (offset < source.length) {
        if (source.startsWith(escape, offset)) { offset += escape.length + 1; }
        else if (source.startsWith(delimiter, offset)) { offset += delimiter.length; closed = true; break; }
        else offset++;
      }
      if (!closed) throw new Error('Unterminated Swift string in UI test inventory.');
    }
    output += masked(start, offset);
  }
  return output;
}

export function discoverAppleUIInventory(source) {
  const declarations = declarationsOnly(source);
  const classes = [...declarations.matchAll(/\bclass\s+(\w+)\s*:\s*XCTestCase\b/g)].map(match => match[1]);
  if (!classes.includes('RemoteUITests') || classes.some(name=>! /^(?:RemoteUITests|NativeReleaseFollowupUITests|(?:Phone|Tablet)(?:Design|Feature|Sidebar|Composer)PreviewUITests)$/.test(name))) throw new Error('UI test classes changed; update shard discovery before running a partial suite.');
  const names = [], owners = new Map();
  for (const container of declarations.matchAll(/\b(?:class|extension)\s+(\w+)\b[^{}]*\{/g)) {
    if(!classes.includes(container[1]))continue;
    let depth = 1, offset = container.index + container[0].length;
    while (offset < declarations.length && depth) {
      if (depth === 1 && /^func\s/.test(declarations.slice(offset, offset + 5)) && !/\w/.test(declarations[offset - 1])) {
        const method = /^func\s+(test\w*)\s*\(/.exec(declarations.slice(offset));
        if (method) { names.push(method[1]); owners.set(method[1],container[1]); }
      }
      if (declarations[offset] === '{') depth++;
      else if (declarations[offset] === '}') depth--;
      offset++;
    }
    if (depth) throw new Error('Unbalanced RemoteUITests declaration.');
  }
  if (!names.length || new Set(names).size !== names.length) throw new Error('UI test inventory must be nonempty and contain unique method names.');
  return names.sort().map(name=>({name,owner:owners.get(name)}));
}
export const discoverRemoteUITests=source=>discoverAppleUIInventory(source).map(item=>item.name);

export function selectAppleUIShard(names, shard, total) {
  if (!Number.isSafeInteger(shard) || !Number.isSafeInteger(total) || total < 1 || shard < 1 || shard > total || total > names.length) throw new Error('Choose a nonempty, one-based UI shard within the test inventory.');
  if (new Set(names).size !== names.length) throw new Error('UI test names must be unique.');
  return [...names].sort().filter((_name, index) => index % total === shard - 1);
}

export function appleUITestFamilies(names) {
  return {
    phone: names.filter(name => !/^test(?:IPad|Tablet)/.test(name)),
    tablet: names.filter(name => /^test(?:IPad|Tablet)/.test(name))
  };
}

export function selectAppleUISimulator(inventory, family) {
  if (!['phone', 'tablet'].includes(family)) throw new Error('Choose phone or tablet for the UI test device family.');
  const prefix = family === 'tablet' ? 'iPad' : 'iPhone';
  const candidates = Object.entries(inventory.devices || {}).filter(([runtime]) => runtime.includes('.iOS-')).flatMap(([runtime, devices]) => devices.map(device => ({ ...device, runtime }))).filter(device => {
    const model = device.deviceTypeIdentifier?.split('.').at(-1) || device.name || '';
    return device.isAvailable !== false && model.startsWith(prefix) && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(device.udid || '');
  }).sort((a, b) => Number(b.state === 'Booted') - Number(a.state === 'Booted') || a.name.localeCompare(b.name) || a.udid.localeCompare(b.udid));
  if (!candidates.length) throw new Error('No available ' + prefix + ' simulator. UI tests cannot fall back to a different device family.');
  return candidates[0];
}

async function main() {
  const arguments_ = process.argv.slice(2), options = {};
  while (arguments_.length) {
    const flag = arguments_.shift();
    if (flag === '--list' && !options.list) { options.list = true; continue; }
    if (flag === '--device-family' && !options.family && ['phone', 'tablet'].includes(arguments_[0])) { options.family = arguments_.shift(); continue; }
    if (!['--shard', '--shards'].includes(flag) || options[flag] !== undefined || !/^\d+$/.test(arguments_[0] || '')) throw new Error('Usage: node test/apple-ui-shard.mjs --device-family phone|tablet --shard 1 --shards 3 [--list]');
    options[flag] = Number(arguments_.shift());
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const folder = path.join(root, 'ios/ProteusUITests');
  const source = fs.readdirSync(folder).filter(name => name.endsWith('.swift')).sort().map(name => fs.readFileSync(path.join(folder, name), 'utf8')).join('\n');
  if (!options.family) throw new Error('An explicit --device-family phone|tablet is required.');
  const inventory=discoverAppleUIInventory(source), names=inventory.map(item=>item.name), familyNames = appleUITestFamilies(names)[options.family], selected = selectAppleUIShard(familyNames, options['--shard'], options['--shards']);
  const selectors = selected.map(name => 'ProteusUITests/'+inventory.find(item=>item.name===name).owner+'/' + name);
  console.log(JSON.stringify({ suite: 'ProteusUITests/RemoteUITests', deviceFamily: options.family, shard: options['--shard'], shards: options['--shards'], selected: selectors.length, familyTests: familyNames.length, total: names.length, selectors }));
  if (options.list) return;
  // Reuse the existing isolated simulator/fixture lifecycle unchanged. Each CI
  // shard is a separate runner; it owns its own app homes and loopback ports.
  const simulator = selectAppleUISimulator(JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], { encoding: 'utf8' })), options.family);
  console.log(JSON.stringify({ deviceFamily: options.family, simulator: simulator.name, device: simulator.udid }));
  const child = spawn(process.execPath, [path.join(root, 'scripts/apple-build.mjs'), 'test', '--device', simulator.udid, ...selectors.flatMap(selector => ['--only', selector])], { cwd: root, env: process.env, stdio: 'inherit' });
  const interrupt = signal => child.kill(signal);
  const term = () => interrupt('SIGTERM'), int = () => interrupt('SIGINT');
  process.once('SIGTERM', term); process.once('SIGINT', int);
  try { process.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code) => resolve(code ?? 1)); }); }
  finally { process.off('SIGTERM', term); process.off('SIGINT', int); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
