import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import packages from '../desktop/updates/update-package.cjs';
import maintenance from '../desktop/updates/update-maintenance.cjs';
import helper from '../desktop/updates/update-helper.cjs';
const {atomic,digest,tree,fileDigest}=packages;
function fixture(t){
 const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-maintenance-')));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const home=path.join(temp,'data'),installation=path.join(temp,'app'),browserHome=path.join(temp,'browser');
 for(const root of [home,installation,browserHome])fs.mkdirSync(root);
 const root=path.join(temp,'Proteus Updates',digest(home+'\0'+installation).slice(0,24)),policyFile=path.join(root,'recovery-policy.json');
 const options={home,installation,browserHome,platform:'win32'},policy={schemaVersion:1,home,installation,auditedAt:'2026-10-20T00:00:00Z',generations:[]};atomic(policyFile,policy);
 const inspect=bundle=>({bundle,...tree(bundle),sourceFingerprint:'a'.repeat(64),signing:{kind:'synthetic'}}),dependencies={inspect,inUse:()=>false};
 const generation=(day,{registered=true}={})=>{
  const id=randomUUID(),directory=path.join(root,'recoveries',id),app=path.join(directory,'Proteus'),file=path.join(root,'jobs',id,'job.json');fs.mkdirSync(app,{recursive:true});fs.writeFileSync(path.join(app,'runtime'),'synthetic '+day);
  const previous={...inspect(app),bundle:installation},roots=[home,browserHome].map((source,index)=>{const target=path.join(directory,'data-'+index);fs.mkdirSync(target);fs.writeFileSync(path.join(target,'private'),'SYNTHETIC ONLY');return {root:source,...tree(target)};});
  const receiptFile=path.join(directory,'recovery.json');atomic(receiptFile,{schemaVersion:1,verified:true,at:`2026-10-${day}T00:00:00Z`,app:'Proteus',previous,roots});
  const row={id,directory,at:`2026-10-${day}T00:00:00Z`,receiptFile,receiptHash:fileDigest(receiptFile),verified:true,eligible:true};
  atomic(file,{schemaVersion:1,id,file,revision:1,phase:'complete',createdAt:row.at,home,installation,previous,candidate:{bundle:path.join(path.dirname(file),'candidate','Proteus'),hash:'b'.repeat(64)},recovery:directory,recoveryRoot:path.join(root,'recoveries'),recoveryPolicy:policyFile,secret:'synthetic',continuationId:'synthetic'});
  if(registered){policy.generations.push(row);atomic(policyFile,policy);}return {...row,file};
 };
 return {temp,root,options,policy,policyFile,generation,dependencies};
}
test('maintenance reconciles missing history and a fully verified unregistered generation without touching live data',t=>{
 const f=fixture(t),old=f.generation(21),survivor=f.generation(22,{registered:false});fs.rmSync(old.directory,{recursive:true});
 fs.writeFileSync(path.join(f.options.home,'today'),'KEEP CURRENT');const original=fs.readFileSync(f.policyFile),before=tree(f.options.home);
 const plan=maintenance.maintenancePlan(f.root,f.options,f.dependencies);assert.equal(plan.canApply,true,JSON.stringify(plan.issues));assert.equal(plan.missing.length,1);assert.deepEqual(plan.discovered,[survivor.id]);assert.equal(fs.readFileSync(f.policyFile).equals(original),true);
 const result=maintenance.applyMaintenance(f.root,{...f.options,planDigest:plan.planDigest},f.dependencies),policy=JSON.parse(fs.readFileSync(f.policyFile));
 assert.deepEqual(result.retained,[survivor.id]);assert.equal(typeof result.freeSpaceChange,'number');assert.equal(policy.unavailableGenerations[0].verified,false);assert.equal(policy.unavailableGenerations[0].receiptHash,old.receiptHash);assert.equal(policy.generations[0].receiptHash,survivor.receiptHash);assert.equal(tree(f.options.home).hash,before.hash);assert.equal(fs.existsSync(old.directory),false);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(path.dirname(result.receiptFile),'policy-before.json'))),JSON.parse(original));
 assert.deepEqual(helper.retainGeneration(packages.readJob(old.file)),{retained:false,unavailable:true,recordedByMaintenance:true});
 assert.throws(()=>maintenance.applyMaintenance(f.root,{...f.options,planDigest:plan.planDigest},f.dependencies),/changed/);
});
test('maintenance preserves changed receipts and incomplete or unowned recovery trees',t=>{
 const f=fixture(t),row=f.generation(21);fs.writeFileSync(path.join(row.directory,'data-1','private'),'CHANGED');
 const before=fs.readFileSync(f.policyFile),plan=maintenance.maintenancePlan(f.root,f.options,f.dependencies);assert.equal(plan.canApply,false);assert.match(plan.issues[0].error,/data differs/);
 assert.throws(()=>maintenance.applyMaintenance(f.root,{...f.options,planDigest:plan.planDigest},f.dependencies),/inspection/);assert.deepEqual(fs.readFileSync(f.policyFile),before);
});
test('lost recovery without a verified survivor cannot be normalized into success',t=>{
 const f=fixture(t),row=f.generation(21);fs.rmSync(row.directory,{recursive:true});const plan=maintenance.maintenancePlan(f.root,f.options,f.dependencies);assert.equal(plan.canApply,false);assert.ok(plan.issues.some(row=>row.kind==='missing-recovery'));
});
test('stale plans and active updates block writes; completed maintenance keeps the newest two generations',t=>{
 const f=fixture(t),old=f.generation(21),second=f.generation(22),newest=f.generation(23);let plan=maintenance.maintenancePlan(f.root,f.options,f.dependencies);assert.deepEqual(plan.retire,[old.id]);
 const job=packages.readJob(newest.file);packages.writeJob(newest.file,{phase:'prepared'});assert.throws(()=>maintenance.applyMaintenance(f.root,{...f.options,planDigest:plan.planDigest},f.dependencies),/changed/);plan=maintenance.maintenancePlan(f.root,f.options,f.dependencies);assert.equal(plan.canApply,false);
 packages.writeJob(newest.file,{phase:'complete'});plan=maintenance.maintenancePlan(f.root,f.options,f.dependencies);const applied=maintenance.applyMaintenance(f.root,{...f.options,planDigest:plan.planDigest},f.dependencies);assert.deepEqual(applied.retired,[old.id]);assert.deepEqual(applied.retained.sort(),[second.id,newest.id].sort());assert.equal(fs.existsSync(old.directory),false);assert.equal(packages.readJob(newest.file).id,job.id);
});
test('maintenance rejects live-folder overlaps, wrong owner roots and linked metadata',t=>{
 const f=fixture(t);assert.throws(()=>maintenance.maintenancePlan(f.temp,f.options,f.dependencies),/bound/);
 assert.throws(()=>maintenance.maintenancePlan(f.root,{...f.options,recoveryRoots:[f.options.home]},f.dependencies),/overlaps/);
 const row=f.generation(21);const policy=JSON.parse(fs.readFileSync(f.policyFile));policy.generations[0].directory=f.options.home;policy.generations[0].receiptFile=path.join(f.options.home,'recovery.json');atomic(f.policyFile,policy);
 const plan=maintenance.maintenancePlan(f.root,f.options,f.dependencies);assert.equal(plan.canApply,false);assert.ok(plan.issues.length);
 assert.equal(fs.existsSync(row.directory),true);
});
