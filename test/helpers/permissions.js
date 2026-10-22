import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {hasPrivatePermissions} from '../../src/private-paths.cjs';

export function assertPrivate(file, mode=0o600) {
  if(process.platform==='win32')assert.equal(hasPrivatePermissions(file),true,'Private Windows ACL: '+file);
  else assert.equal(fs.statSync(file).mode & 0o777,mode);
}

export function makeReadableByOthers(file) {
  if(process.platform!=='win32')return fs.chmodSync(file,0o644);
  execFileSync(path.join(process.env.SystemRoot,'System32','icacls.exe'),[file,'/grant','*S-1-1-0:R'],{stdio:'ignore',windowsHide:true});
}
