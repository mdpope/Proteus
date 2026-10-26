import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {createDesktopSnapshot,desktopRuntimeRoots,desktopRuntimeFiles,fileDigest} from '../scripts/desktop-build.mjs';
import {prepareWindowsTerminal,windowsTerminalAsset} from '../scripts/prepare-windows-terminal.mjs';

function fixture(t){
  const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-terminal-build-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  for(const directory of [...desktopRuntimeRoots,'native/windows-terminal','desktop/terminal'])fs.mkdirSync(path.join(root,directory),{recursive:true});
  for(const name of desktopRuntimeFiles)fs.writeFileSync(path.join(root,name),'synthetic');
  fs.writeFileSync(path.join(root,'package.json'),'{}');
  const source=path.join(root,'native/windows-terminal/guardian.cs');
  fs.writeFileSync(source,'synthetic source');
  const build=({output,testOnlyJobFailureSeam})=>{
    assert.equal(testOnlyJobFailureSeam,false);
    assert.equal(fs.existsSync(output),false,'each compilation starts from a new output');
    fs.writeFileSync(output,'synthetic newly compiled executable');
    return {output,testOnlyJobFailureSeam,sourceSha256:fileDigest(source),helperSha256:fileDigest(output),compilerSha256:'c'.repeat(64)};
  };
  return {root,build,target:path.join(root,windowsTerminalAsset)};
}

test('Windows packaging freezes freshly compiled helper bytes and its source; later changes fail verification',t=>{
  const f=fixture(t);fs.writeFileSync(f.target,'old helper');
  const receipt=prepareWindowsTerminal(f.root,{build:f.build});
  assert.equal(receipt.output,windowsTerminalAsset);assert.equal(receipt.helperSha256,fileDigest(f.target));
  assert.equal(fs.readFileSync(f.target,'utf8'),'synthetic newly compiled executable');
  assert.deepEqual(fs.readdirSync(path.join(f.root,'.runtime')),[],'compiler scratch is retired');
  const snapshot=createDesktopSnapshot(f.root,['native/windows-terminal/guardian.cs']);
  assert.equal(snapshot.runtimeFiles[windowsTerminalAsset],receipt.helperSha256);
  fs.writeFileSync(f.target,'modified helper');assert.throws(()=>snapshot.verifySource(),/Source changed/);
});

test('Windows packaging refuses test seams, mismatched receipts and linked output without replacing accepted asset',t=>{
  const f=fixture(t);fs.writeFileSync(f.target,'accepted old asset');
  for(const override of [{testOnlyJobFailureSeam:true},{helperSha256:'0'.repeat(64)},{sourceSha256:'0'.repeat(64)},{compilerSha256:''}]){
    assert.throws(()=>prepareWindowsTerminal(f.root,{build:options=>({...f.build(options),...override})}));
    assert.equal(fs.readFileSync(f.target,'utf8'),'accepted old asset');
  }
  fs.unlinkSync(f.target);fs.symlinkSync('missing-target',f.target);
  assert.throws(()=>prepareWindowsTerminal(f.root,{build:()=>assert.fail('must not compile through link')}),/regular file/);
});
