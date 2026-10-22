import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {applicationHome} from '../src/files.js';
import {defaultTerminalShell,terminalShellArgs} from '../src/terminal-shell.js';
import {windowsProviderExecutable} from '../src/windows-provider.js';
import {hasPrivatePermissions,privateTemporaryDirectory,ensurePrivateHome} from '../src/private-paths.cjs';
import {makeReadableByOthers} from './helpers/permissions.js';

test('Windows data belongs to LocalAppData and explicit homes retain precedence',()=>{
  const options={platform:'win32',home:'C:\\Users\\synthetic',env:{}};
  assert.equal(applicationHome(options),'C:\\Users\\synthetic\\AppData\\Local\\Proteus');
  assert.equal(applicationHome({...options,env:{LOCALAPPDATA:'D:\\Private'}}),'D:\\Private\\Proteus');
  assert.equal(applicationHome({...options,env:{LOCALAPPDATA:'relative'}}),applicationHome(options));
  assert.equal(applicationHome({...options,env:{PROTEUS_HOME:'D:\\Explicit'}}),'D:\\Explicit');
});

test('Windows shell commands preserve quoting and Unicode; resume omits startup command',()=>{
  const shell=defaultTerminalShell('win32',{SystemRoot:'C:\\Windows'}),command='Write-Output "🧪 $value; & text"';
  const args=terminalShellArgs(shell,command,false,'win32');
  assert.deepEqual(args.slice(0,2),['-NoLogo','-EncodedCommand']);
  assert.equal(Buffer.from(args[2],'base64').toString('utf16le'),command);
  assert.deepEqual(terminalShellArgs(shell,command,true,'win32'),['-NoLogo']);
  assert.deepEqual(terminalShellArgs('cmd.exe','echo hello',false,'win32'),['/d','/s','/c','echo hello']);
  assert.throws(()=>terminalShellArgs('unrecognized.exe','',false,'win32'),/supported/);
});

test('provider discovery works without developer PATH and keeps providers optional',t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-windows-provider-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const env={LOCALAPPDATA:path.join(home,'local')},file=path.join(env.LOCALAPPDATA,'OpenAI','Codex','bin','installed-build','codex.exe');
  assert.equal(windowsProviderExecutable('codex',{home,env}),'codex.exe');
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'synthetic, not executable');
  assert.equal(windowsProviderExecutable('codex',{home,env}),file);
  assert.equal(windowsProviderExecutable('claude',{home,env}),'claude.exe');
});

test('private storage accepts inherited restricted ACLs and rejects shared inputs without repairing them',t=>{
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-private-storage-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const home=path.join(root,'data');ensurePrivateHome(home);const file=path.join(home,'credentials.json');fs.writeFileSync(file,'{"synthetic":true}',{mode:0o600});
  assert.equal(hasPrivatePermissions(file),true);ensurePrivateHome(home);
  makeReadableByOthers(file);assert.equal(hasPrivatePermissions(file),false);
  makeReadableByOthers(home);assert.throws(()=>ensurePrivateHome(home),/private application-data/);
  assert.equal(hasPrivatePermissions(home),false,'Existing permissions are left for the operator to resolve');
});
