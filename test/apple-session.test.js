import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';

test('Mac signing preflight distinguishes a locked console from an unavailable reading', t => {
  const python = ['python3', 'python'].find(command => spawnSync(command, ['--version']).status === 0);
  if (!python) { t.skip('Python is required by the native Apple build scripts'); return; }
  const result = execFileSync(python, ['-B', '-c',
    'import importlib.util,json; spec=importlib.util.spec_from_file_location("session","scripts/apple-session.py"); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); print(json.dumps([m.classify_session(s) for s in [{},{"available":True},{"available":True,"CGSSessionScreenIsLocked":True},{"available":True,"kCGSSessionOnConsoleKey":True},{"available":True,"kCGSSessionOnConsoleKey":False}]]))'], {encoding: 'utf8'});
  assert.deepEqual(JSON.parse(result), ['unavailable', 'unavailable', 'locked', 'unlocked', 'unavailable']);
});
