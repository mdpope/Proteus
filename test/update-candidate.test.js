import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import packages from '../desktop/updates/update-package.cjs';
import candidates from '../desktop/updates/update-candidate.cjs';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';

function fixture(t){
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-candidate-integrity-')),id=randomUUID(),directory=path.join(root,'jobs',id),bundle=path.join(directory,'candidate','Proteus');
 fs.mkdirSync(bundle,{recursive:true});fs.writeFileSync(path.join(bundle,'payload'),'accepted bytes');fs.writeFileSync(path.join(bundle,'Proteus Setup.exe'),'accepted installer');
 const inspect=(target,options={})=>({...packages.tree(target,{excludeRoot:['Proteus Setup.exe']}),installationHash:packages.tree(target).hash,entries:options.entries?packages.tree(target,{entries:true}).entries:undefined});
 const file=path.join(directory,'job.json'),job={schemaVersion:1,platform:'win32',id,file,revision:1,phase:'waiting-for-idle',home:path.join(root,'data'),installation:path.join(root,'installed'),candidate:{bundle,...inspect(bundle)},recoveryRoot:path.join(root,'recoveries'),recoveryPolicy:path.join(root,'recovery-policy.json'),secret:'synthetic',continuationId:'synthetic'};
 packages.atomic(file,job);t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const evidence=()=>fs.readdirSync(directory).filter(name=>name.startsWith('candidate-integrity-')).map(name=>JSON.parse(fs.readFileSync(path.join(directory,name))));
 return {root,bundle,job,inspect,evidence};
}
test('candidate integrity evidence survives a post-readiness extra file without loosening hashes',t=>{
 const f=fixture(t),options={inspect:f.inspect};
 assert.equal(candidates.verifyCandidate(f.job,'readiness',options).hash,f.job.candidate.hash);
 fs.writeFileSync(path.join(f.bundle,'unexpected.log'),'x'.repeat(166));
 assert.throws(()=>candidates.verifyCandidate(f.job,'supervise',options),/accepted staged candidate changed/);
 const rows=f.evidence();assert.equal(rows.length,2);assert.equal(rows.find(row=>row.stage==='readiness').passed,true);
 const failed=rows.find(row=>row.stage==='supervise');assert.equal(failed.passed,false);assert.ok(failed.observed.entries.some(row=>row[0]==='unexpected.log'&&row[3]===166));
 fs.rmSync(path.dirname(f.bundle),{recursive:true});assert.equal(f.evidence().length,2,'old-owner staging retirement cannot erase evidence');
 assert.equal(packages.readJob(f.job.file).phase,'waiting-for-idle');
});
test('candidate validation includes cached installer identity and records inspection failures',t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.bundle,'Proteus Setup.exe'),'changed installer');
 assert.equal(f.inspect(f.bundle).hash,f.job.candidate.hash);
 assert.throws(()=>candidates.verifyCandidate(f.job,'readiness',{inspect:f.inspect}),/accepted staged candidate changed/);
 assert.throws(()=>candidates.verifyCandidate(f.job,'readiness',{inspect:()=>{throw Error('runtime bytes changed');}}),/runtime bytes changed/);
 assert.equal(f.evidence().filter(row=>row.error==='runtime bytes changed').length,1);
});
test('real legacy helper entry point refuses a changed candidate before readiness or owner shutdown',async t=>{
 const f=fixture(t),preload=path.join(f.root,'inspector.cjs');
 fs.writeFileSync(path.join(f.bundle,'unexpected'),'changed');
 fs.writeFileSync(preload,`const p=require(${JSON.stringify(fileURLToPath(new URL('../desktop/updates/update-package.cjs',import.meta.url)))});p.inspectPackage=bundle=>({...p.tree(bundle,{excludeRoot:['Proteus Setup.exe']}),installationHash:p.tree(bundle).hash,entries:p.tree(bundle,{entries:true}).entries});`);
 const child=spawn(process.execPath,['--require',preload,fileURLToPath(new URL('../desktop/update-helper.cjs',import.meta.url)),'arm',f.job.file],{stdio:['ignore','ignore','pipe','ipc']});
 t.after(()=>{try{child.kill();}catch{}});let ready=false,errors='';child.on('message',()=>{ready=true;});child.stderr.on('data',chunk=>errors+=chunk);
 const code=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('Helper did not reject changed candidate'));},5000);child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);resolve(code);});});
 assert.equal(code,1,errors);assert.equal(ready,false);assert.match(errors,/accepted staged candidate changed/);assert.equal(f.evidence()[0].passed,false);assert.equal(packages.readJob(f.job.file).phase,'waiting-for-idle');assert.equal(packages.readJob(f.job.file).helperPid,undefined);
});
