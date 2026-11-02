import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {sourceFiles} from '../scripts/package-source.mjs';
import {createProvenance} from '../desktop/updates/build-provenance.cjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-source-test-')));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true,maxRetries:10}));
 fs.mkdirSync(path.join(root,'native/windows-terminal'),{recursive:true});fs.mkdirSync(path.join(root,'desktop/terminal'),{recursive:true});
 fs.writeFileSync(path.join(root,'.gitignore'),'*.exe\n.env\n');
 fs.writeFileSync(path.join(root,'native/windows-terminal/guardian.cs'),'// Synthetic C# source\r\n');
 fs.writeFileSync(path.join(root,'desktop/terminal/windows-terminal-guardian.exe'),'Synthetic generated binary');
 fs.writeFileSync(path.join(root,'desktop/.env'),'Synthetic secret that must remain excluded');
 execFileSync('git',['init','-q'],{cwd:root});execFileSync('git',['add','.gitignore','native/windows-terminal/guardian.cs'],{cwd:root});
 const runtime='desktop/terminal/windows-terminal-guardian.exe',input='native/windows-terminal/guardian.cs';
 const provenance=createProvenance({runtimeFiles:{[runtime]:sha(fs.readFileSync(path.join(root,runtime)))},buildInputs:{[input]:sha(fs.readFileSync(path.join(root,input)))}});
 const commit=()=>execFileSync('git',['-c','user.name=Synthetic','-c','user.email=synthetic@example.invalid','commit','-qm','Synthetic source fixture'],{cwd:root});
 return {root,runtime,input,provenance,commit};
}
test('source export includes native source while ignored binaries require accepted provenance',t=>{
 const f=fixture(t),plain=sourceFiles(f.root);
 assert.ok(plain.files.includes(f.input));assert.ok(!plain.files.includes(f.runtime));assert.ok(!plain.files.includes('desktop/.env'));
 f.commit();const selected=sourceFiles(f.root,{provenance:f.provenance});
 assert.ok(selected.files.includes(f.input));assert.ok(selected.files.includes(f.runtime));assert.deepEqual(selected.generated,[f.runtime]);assert.ok(!selected.files.includes('desktop/.env'));
});
test('source export refuses a generated input changed after package acceptance',t=>{
 const f=fixture(t);f.commit();fs.writeFileSync(path.join(f.root,f.runtime),'Changed synthetic binary');
 assert.throws(()=>sourceFiles(f.root,{provenance:f.provenance}),/Accepted input differs/);
});
test('accepted provenance cannot pull ignored secrets into a source archive',t=>{
 const f=fixture(t);f.commit();
 const provenance=createProvenance({runtimeFiles:{'desktop/.env':sha(fs.readFileSync(path.join(f.root,'desktop/.env')))},buildInputs:f.provenance.buildInputs});
 assert.throws(()=>sourceFiles(f.root,{provenance}),/Unsupported source entry/);
});
