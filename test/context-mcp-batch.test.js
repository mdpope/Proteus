import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ContextStore } from '../src/context.js';
import { revision } from '../src/schedules.js';

function fixture(t) {
  const root = fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-mcp-batch-rehearsal-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const context = Object.create(ContextStore.prototype);
  context.get = () => ({ modes: {}, entries: [] });
  const definition = { command: 'node', args: ['first.js'] };
  const file = path.join(root, '.mcp.json');
  fs.writeFileSync(file, JSON.stringify({ mcpServers: { example: definition } }));
  const record = { id: 'example', kind: 'mcp', name: 'example', key: 'example', path: file, roots: [root], canonicalSource: file, canonicalRoot: root, hash: revision(definition) };
  return { root, file, context, definition, record };
}
function sameMetadataWrite(file, text) {
  const before = fs.statSync(file); fs.writeFileSync(file, text); fs.utimesSync(file, before.atime, before.mtime);
}

test('MCP health batch reads a shared source once while retaining each captured hash and target check', t => {
  const f = fixture(t), read = fs.readFileSync, realpath = fs.realpathSync;
  let reads = 0, paths = 0;
  t.mock.method(fs, 'readFileSync', function(file, ...args) { if (file === f.file) reads++; return read.call(this, file, ...args); });
  t.mock.method(fs, 'realpathSync', function(file, ...args) { if (file === f.file || file === f.root) paths++; return realpath.call(this, file, ...args); });
  const expected = { ...f.definition, type: 'stdio', workingDirectory: f.root };
  f.context.withMcpSelectionBatch(() => {
    for (let i = 0; i < 248; i++) assert.deepEqual(f.context.resolveMcp(f.record), expected);
    f.context.withMcpSelectionBatch(() => assert.deepEqual(f.context.resolveMcp(f.record), expected));
    assert.throws(() => f.context.resolveMcp({ ...f.record, hash: revision({ command: 'different' }) }), /definition changed/);
    assert.throws(() => f.context.resolveMcp({ ...f.record, canonicalSource: f.root }), /source or folder changed/);
    assert.throws(() => f.context.resolveMcp({ ...f.record, canonicalRoot: f.file }), /source or folder changed/);
  });
  assert.equal(reads, 1); assert.equal(paths, 2); assert.equal(f.context.mcpSelectionBatch, null);
  f.context.resolveMcp(f.record); f.context.resolveMcp(f.record);
  assert.equal(reads, 3); assert.equal(paths, 6);
});

test('next MCP batch and direct provider selection detect same-size edits and deletion without relying on mtime', t => {
  const f = fixture(t), snapshot = { entries: [f.record] };
  const select = () => f.context.providerMcpContext(snapshot);
  f.context.withMcpSelectionBatch(select);
  const original = fs.readFileSync(f.file, 'utf8'), changed = original.replace('first.js', 'other.js');
  assert.equal(original.length, changed.length); sameMetadataWrite(f.file, changed);
  assert.throws(() => f.context.withMcpSelectionBatch(select), /definition changed/);
  assert.throws(select, /definition changed/);
  snapshot.entries = [{ ...f.record, hash: revision({ ...f.definition, args: ['other.js'] }) }];
  assert.deepEqual(f.context.withMcpSelectionBatch(select).mcpServers.example.args, ['other.js']);
  fs.unlinkSync(f.file);
  assert.throws(() => f.context.withMcpSelectionBatch(select), /ENOENT/);
  assert.throws(select, /ENOENT/);
  fs.writeFileSync(f.file, original); snapshot.entries = [f.record];
  assert.deepEqual(f.context.withMcpSelectionBatch(select).mcpServers.example.args, ['first.js']);
});

test('next MCP batch detects retargeted source and workspace symlinks even with identical file bytes', t => {
  const f = fixture(t), other = path.join(f.root, 'other.json'), link = path.join(f.root, 'source-link.json');
  fs.copyFileSync(f.file, other); fs.symlinkSync(f.file, link);
  const record = { ...f.record, path: link };
  f.context.withMcpSelectionBatch(() => f.context.resolveMcp(record));
  fs.unlinkSync(link); fs.symlinkSync(other, link);
  assert.throws(() => f.context.withMcpSelectionBatch(() => f.context.resolveMcp(record)), /source or folder changed/);
  assert.equal(f.context.withMcpSelectionBatch(() => f.context.resolveMcp({ ...record, canonicalSource: other })).command, 'node');
  const one = path.join(f.root, 'one'), two = path.join(f.root, 'two'), rootLink = path.join(f.root, 'root-link');
  fs.mkdirSync(one); fs.mkdirSync(two); fs.symlinkSync(one, rootLink);
  const rooted = { ...f.record, roots: [rootLink], canonicalRoot: one };
  assert.equal(f.context.withMcpSelectionBatch(() => f.context.resolveMcp(rooted)).workingDirectory, rootLink);
  fs.unlinkSync(rootLink); fs.symlinkSync(two, rootLink);
  assert.throws(() => f.context.withMcpSelectionBatch(() => f.context.resolveMcp(rooted)), /source or folder changed/);
});

test('shared parsed MCP bytes do not share environment expansion, record roots, workspace-file interpretation or returned objects', t => {
  const f = fixture(t), variable = 'PROTEUS_MCP_BATCH_REHEARSAL_VALUE', previous = process.env[variable];
  t.after(() => { if (previous === undefined) delete process.env[variable]; else process.env[variable] = previous; });
  const definition = { command: 'node', args: ['${workspaceFolder}', '${env:' + variable + '}'], env: { VALUE: '${env:' + variable + '}' } };
  const nested = { command: 'nested' };
  fs.writeFileSync(f.file, JSON.stringify({ mcpServers: { example: definition }, settings: { mcp: { servers: { example: nested } } } }));
  const record = { ...f.record, hash: revision(definition) }, otherRoot = path.join(f.root, 'other'); fs.mkdirSync(otherRoot);
  f.context.withMcpSelectionBatch(() => {
    process.env[variable] = 'first'; const first = f.context.resolveMcp(record);
    assert.deepEqual(first.args, [f.root, 'first']); first.args[0] = 'mutated'; first.env.VALUE = 'mutated';
    process.env[variable] = 'second';
    const second = f.context.resolveMcp({ ...record, roots: [otherRoot], canonicalRoot: otherRoot });
    assert.deepEqual(second.args, [otherRoot, 'second']); assert.equal(second.env.VALUE, 'second'); assert.equal(second.workingDirectory, otherRoot);
    assert.equal(f.context.resolveMcp(record, false).env.VALUE, '${env:' + variable + '}');
    assert.equal(f.context.resolveMcp({ ...record, workspaceFile: true, hash: revision(nested) }).command, 'nested');
    delete process.env[variable]; assert.throws(() => f.context.resolveMcp(record), /Missing environment variable/);
  });
});

test('MCP batch catalog reuse respects workspace modes and reloads them before direct execution', t => {
  const f = fixture(t); let allowed = true, gets = 0;
  f.context.get = workspace => { gets++; return { entries: [f.record], modes: { example: workspace === 'blocked' || !allowed ? 'disabled' : 'available' } }; };
  const select = workspaceId => f.context.providerMcpContext({ workspaceId, entries: [f.record] });
  f.context.withMcpSelectionBatch(() => {
    select('allowed'); select('allowed');
    assert.throws(() => select('blocked'), /source was disabled/);
  });
  assert.equal(gets, 2); allowed = false;
  assert.throws(() => select('allowed'), /source was disabled/);
  assert.throws(() => f.context.withMcpSelectionBatch(() => select('allowed')), /source was disabled/);
  assert.equal(gets, 4);
});

test('MCP batch discards all memoized state after parse/callback failure and before asynchronous continuations', async t => {
  const f = fixture(t), original = fs.readFileSync(f.file, 'utf8');
  assert.throws(() => f.context.withMcpSelectionBatch(() => { f.context.resolveMcp(f.record); throw new Error('synthetic failure'); }), /synthetic failure/);
  assert.equal(f.context.mcpSelectionBatch, null);
  fs.writeFileSync(f.file, '{bad json');
  assert.throws(() => f.context.withMcpSelectionBatch(() => f.context.resolveMcp(f.record)), SyntaxError);
  assert.equal(f.context.mcpSelectionBatch, null);
  fs.writeFileSync(f.file, original);
  await f.context.withMcpSelectionBatch(async () => {
    f.context.resolveMcp(f.record); await Promise.resolve();
    assert.equal(f.context.mcpSelectionBatch, null);
    sameMetadataWrite(f.file, original.replace('first.js', 'other.js'));
    assert.throws(() => f.context.resolveMcp(f.record), /definition changed/);
  });
});

test('MCP batch bounds retained source count and bytes while still resolving overflow sources', t => {
  const f = fixture(t), text = fs.readFileSync(f.file, 'utf8'), read = fs.readFileSync;
  const files = Array.from({ length: 129 }, (_, i) => path.join(f.root, i + '.json'));
  for (const file of files) fs.writeFileSync(file, text);
  const records = files.map(file => ({ ...f.record, path: file, canonicalSource: file }));
  let overflowReads = 0;
  t.mock.method(fs, 'readFileSync', function(file, ...args) { if (file === files.at(-1)) overflowReads++; return read.call(this, file, ...args); });
  f.context.withMcpSelectionBatch(() => {
    for (const record of records) assert.equal(f.context.resolveMcp(record).command, 'node');
    f.context.resolveMcp(records.at(-1)); assert.equal(overflowReads, 2);
  });
  const padded = JSON.stringify({ mcpServers: { example: f.definition }, extension: 'x'.repeat(3 * 1024 * 1024) });
  fs.writeFileSync(files[0], padded); fs.writeFileSync(files.at(-1), padded); overflowReads = 0;
  f.context.withMcpSelectionBatch(() => {
    f.context.resolveMcp(records[0]); f.context.resolveMcp(records.at(-1)); f.context.resolveMcp(records.at(-1));
    assert.equal(overflowReads, 2);
  });
  assert.equal(f.context.mcpSelectionBatch, null);
});

test('MCP batch bounds canonical paths without skipping validation of overflow roots', t => {
  const f = fixture(t), roots = Array.from({ length: 513 }, (_, i) => path.join(f.root, 'root-' + i));
  for (const root of roots) fs.mkdirSync(root);
  const realpath = fs.realpathSync; let overflowReads = 0;
  t.mock.method(fs, 'realpathSync', function(file, ...args) { if (file === roots.at(-1)) overflowReads++; return realpath.call(this, file, ...args); });
  f.context.withMcpSelectionBatch(() => {
    for (const root of roots) assert.equal(f.context.resolveMcp({ ...f.record, roots: [root], canonicalRoot: root }).workingDirectory, root);
    const overflow = { ...f.record, roots: [roots.at(-1)], canonicalRoot: roots.at(-1) };
    f.context.resolveMcp(overflow); assert.equal(overflowReads, 2);
    fs.rmdirSync(roots.at(-1));
    assert.throws(() => f.context.resolveMcp(overflow), /ENOENT/);
  });
});
