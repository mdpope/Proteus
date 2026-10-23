import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {prepareExtensions} from '../scripts/prepare-extensions.mjs';

test('extension preparation patches fresh copies and migrates an existing pre-organization patch', t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-extension-patch-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const base=path.join(root,'node_modules/electron-chrome-extensions');
 fs.mkdirSync(path.join(base,'dist/cjs'),{recursive:true});
 fs.writeFileSync(path.join(base,'package.json'),JSON.stringify({version:'4.9.0'}));
 const file=path.join(base,'dist/cjs/index.js');
 for(const original of [
  'before\nvar NativeMessagingHost = class {};\n// src/browser/api/runtime.ts\nafter',
  "before\n// Proteus native messaging lifecycle v1\nvar NativeMessagingHost = require('../../../../desktop/native-messaging-host.cjs').createNativeMessagingHost({readConfig:readNativeMessagingHostConfig,spawn:import_node_child_process.spawn});\n// src/browser/api/runtime.ts\nafter"
 ]){
  fs.writeFileSync(file,original);prepareExtensions(root);
  const patched=fs.readFileSync(file,'utf8');
  assert.match(patched,/desktop\/services\/native-messaging-host\.cjs/);
  assert.doesNotMatch(patched,/desktop\/native-messaging-host\.cjs/);
  assert.ok(patched.startsWith('before\n')&&patched.endsWith('after'));
  prepareExtensions(root);assert.equal(fs.readFileSync(file,'utf8'),patched);
 }
 fs.writeFileSync(file,'// Proteus native messaging lifecycle v1\nunknown patch');
 assert.throws(()=>prepareExtensions(root),/host path changed/);
 assert.equal(fs.readFileSync(file,'utf8'),'// Proteus native messaging lifecycle v1\nunknown patch');
});
