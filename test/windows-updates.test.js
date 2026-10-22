import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import helper from '../desktop/update-helper.cjs';
import packages from '../desktop/update-package.cjs';
import windows from '../desktop/windows-installation.cjs';
import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import {initializeFreshRecovery} from '../src/recovery-inventory.js';

test('Windows installer recovery reuses one verified app and data remains outside replacement',async t=>{
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-windows-update-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const installation=path.join(root,'installed'),candidate=path.join(root,'candidate'),recovery=path.join(root,'recovery'),home=path.join(root,'data');
 for(const dir of [installation,candidate,recovery,home])fs.mkdirSync(dir);
 fs.writeFileSync(path.join(home,'receipt'),'SYNTHETIC RETRY RECEIPT');
 for(const [dir,version]of [[installation,'old'],[candidate,'new']]){fs.writeFileSync(path.join(dir,'identity'),version);fs.writeFileSync(path.join(dir,windows.setupName),version+' installer');}
 const inspect=bundle=>({bundle,version:fs.readFileSync(path.join(bundle,'identity'),'utf8'),...packages.tree(bundle,{excludeRoot:windows.installationFiles}),installationHash:packages.tree(bundle).hash,installer:{sha256:packages.fileDigest(path.join(bundle,windows.setupName))}});
 const job={installation,recovery,home,previous:inspect(installation),recoveryData:[{root:home,...packages.tree(home)}]},selected=inspect(candidate);
 let registered='old',calls=0,fail=true;
 const verifyRegistration=(_path,version)=>assert.equal(registered,version);
 const runInstaller=async(file,target)=>{
  calls++;assert.equal(target,installation);const source=path.dirname(file);fs.copyFileSync(path.join(source,'identity'),path.join(target,'identity'));
  if(fail){fail=false;throw Error('Synthetic interrupted installer');}
  fs.copyFileSync(file,path.join(target,windows.setupName));registered=fs.readFileSync(path.join(target,'identity'),'utf8');
 };
 await assert.rejects(helper.installWindows(job,selected,{inspect,verifyRegistration,runInstaller}),/interrupted installer/);
 const snapshot=inspect(path.join(recovery,'Proteus'));assert.equal(snapshot.installationHash,job.previous.installationHash);
 await helper.installWindows(job,selected,{inspect,verifyRegistration,runInstaller,rollback:true});assert.equal(registered,'old');assert.equal(inspect(installation).hash,job.previous.hash);
 await helper.installWindows(job,selected,{inspect,verifyRegistration,runInstaller});assert.equal(registered,'new');assert.equal(inspect(installation).hash,selected.hash);
 assert.equal(calls,3);assert.equal(inspect(path.join(recovery,'Proteus')).installationHash,snapshot.installationHash);
 assert.equal(fs.readFileSync(path.join(home,'receipt'),'utf8'),'SYNTHETIC RETRY RECEIPT');
 // Recovery must refuse a changed cached installer even if application files match.
 fs.writeFileSync(path.join(recovery,'Proteus',windows.setupName),'changed');
 await assert.rejects(helper.installWindows(job,selected,{inspect,verifyRegistration,runInstaller,rollback:true}),/snapshot changed/);assert.equal(calls,3);
});

test('installer metadata exclusions apply only at the bundle root',t=>{
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-windows-payload-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'nested'));fs.writeFileSync(path.join(root,windows.setupName),'installer');
 const before=packages.tree(root,{excludeRoot:windows.installationFiles}).hash;fs.writeFileSync(path.join(root,'nested',windows.setupName),'unexpected nested file');
 assert.notEqual(packages.tree(root,{excludeRoot:windows.installationFiles}).hash,before);
});

test('fresh recovery setup refuses existing or unrecorded generations instead of resetting retention',t=>{
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-recovery-inventory-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,'data'),installation=path.join(root,'app'),policy=path.join(root,'updates','one','recovery-policy.json');
 initializeFreshRecovery(policy,{home,installation});
 const before=fs.readFileSync(policy,'utf8');assert.deepEqual(JSON.parse(before).generations,[]);
 assert.throws(()=>initializeFreshRecovery(policy,{home,installation}),/Existing recovery/);assert.equal(fs.readFileSync(policy,'utf8'),before);
 const second=path.join(root,'updates','two','recovery-policy.json');fs.mkdirSync(path.dirname(second));fs.writeFileSync(path.join(path.dirname(second),'unrecorded'),'synthetic');
 assert.throws(()=>initializeFreshRecovery(path.join(root,'updates','three','recovery-policy.json'),{home:home+'other',installation:installation+'other'}),/unrecorded/);
 assert.equal(fs.existsSync(path.join(root,'updates','three')),false);
});
