import test from 'node:test';
import assert from 'node:assert/strict';
import {desktopPayload} from '../scripts/create-desktop-payload.mjs';
import {validateReleasePayload,verifyRelease} from '../src/services/updates/desktop-releases.js';
test('native payload has exact target and source but cannot be consumed as a signed release',()=>{
 const candidate={version:'0.2.43',buildRevision:'synthetic',sourceFingerprint:'a'.repeat(64),hash:'b'.repeat(64),bytes:100},artifact={filename:'Proteus-test.tar.gz',bytes:40,sha256:'c'.repeat(64)},sourceCommit='d'.repeat(40);
 for(const [platform,arch]of [['darwin','arm64'],['linux','x64'],['win32','x64']]){
  const value=desktopPayload({candidate,artifact,sourceCommit,platform,arch,installer:{filename:'Proteus-test.exe',bytes:20,sha256:'e'.repeat(64)}});
  assert.equal(value.platform,platform);assert.equal(value.arch,arch);assert.equal(value.sourceCommit,sourceCommit);assert.equal(value.artifact.sha256,artifact.sha256);
  assert.equal(validateReleasePayload(value,{platform,arch}).version,'0.2.43');assert.throws(()=>verifyRelease(value,{platform,arch}),/manifest/);
  assert.throws(()=>validateReleasePayload({...value,sourceCommit:'short'},{platform,arch}),/source commit/);
 }
});
