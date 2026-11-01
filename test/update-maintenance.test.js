import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import packages from '../desktop/updates/update-package.cjs';
import maintenance from '../desktop/updates/update-maintenance.cjs';
import helper from '../desktop/updates/update-helper.cjs';
import attention from '../desktop/updates/attention-reconciliation.cjs';
import {Updates} from '../src/services/updates/updates.js';
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
function attentionFixture(t){
 const f=fixture(t),old=f.generation(21),middle=f.generation(22),latest=f.generation(23),pid=424242;
 const previous=packages.readJob(latest.file),preservation=path.join(path.dirname(latest.file),'preservation.json');
 atomic(preservation,{schemaVersion:1,runs:[]});
 const candidate={...f.dependencies.inspect(f.options.installation),bundle:previous.candidate.bundle,buildRevision:'synthetic-candidate'};
 packages.writeJob(latest.file,{phase:'attention',outcome:'updated',error:'Recovery data differs from its receipt.',ordinaryWorkResumedAt:'2026-10-23T01:00:00Z',candidate,preservationHash:fileDigest(preservation),health:{at:'2026-10-23T00:00:00Z',preservation:{runs:0,events:0},identity:{packaged:true,pid,home:f.options.home,installation:f.options.installation,sourceFingerprint:candidate.sourceFingerprint,buildRevision:candidate.buildRevision}}});
 atomic(path.join(f.options.home,'connection.json'),{pid});fs.writeFileSync(path.join(f.options.home,'runner.lock'),String(pid));
 f.dependencies.alive=value=>value===pid;
 const options={...f.options,id:latest.id,expectedRevision:packages.readJob(latest.file).revision};
 return {...f,old,middle,latest,options,preservation,pid};
}
test('post-install reconciliation preserves the original journal, policy and recoveries, then permits verified two-generation maintenance',t=>{
 const f=attentionFixture(t),jobBefore=fs.readFileSync(f.latest.file),policyBefore=fs.readFileSync(f.policyFile),dataBefore=tree(f.options.home);
 const staging=path.join(path.dirname(f.latest.file),'candidate');fs.mkdirSync(staging);fs.writeFileSync(path.join(staging,'synthetic-unused-candidate'),'SYNTHETIC ONLY');
 assert.equal(maintenance.maintenancePlan(f.root,f.options,f.dependencies).canApply,false);
 const plan=attention.attentionPlan(f.root,f.options,f.dependencies);
 assert.equal(plan.canApply,true);assert.equal(plan.uiResponsivenessVerified,false);
 const receipt=attention.reconcileAttention(f.root,{...f.options,planDigest:plan.planDigest},f.dependencies);
 assert.equal(receipt.continuationReplayed,false);assert.equal(receipt.originalError,'Recovery data differs from its receipt.');
 assert.deepEqual(fs.readFileSync(f.latest.file),jobBefore);assert.deepEqual(fs.readFileSync(f.policyFile),policyBefore);assert.equal(tree(f.options.home).hash,dataBefore.hash);
 assert.ok([f.old,f.middle,f.latest].every(row=>fs.existsSync(row.directory)));
 assert.equal(attention.reconcileAttention(f.root,{...f.options,planDigest:plan.planDigest},f.dependencies).alreadyApplied,true);
 assert.throws(()=>attention.reconcileAttention(f.root,{...f.options,expectedRevision:0,planDigest:plan.planDigest},f.dependencies),/changed/);
 const maintenancePlan=maintenance.maintenancePlan(f.root,f.options,f.dependencies);
 assert.equal(maintenancePlan.canApply,true,JSON.stringify(maintenancePlan.issues));assert.deepEqual(maintenancePlan.retire,[f.old.id]);
 const result=maintenance.applyMaintenance(f.root,{...f.options,planDigest:maintenancePlan.planDigest},f.dependencies);
 assert.deepEqual(result.retired,[f.old.id]);assert.deepEqual(new Set(result.retained),new Set([f.middle.id,f.latest.id]));
 assert.equal(fs.existsSync(staging),false);const stagingReceipt=JSON.parse(fs.readFileSync(path.join(path.dirname(f.latest.file),'attention-staging-retirement.json')));assert.equal(stagingReceipt.jobHash,digest(jobBefore));
 assert.deepEqual(fs.readFileSync(f.latest.file),jobBefore);assert.equal(tree(f.options.home).hash,dataBefore.hash);
});
test('reconciliation cannot bless pre-install failure, unreviewed attention, stale health, changed app, active helper or missing owner',t=>{
 const cases=[
  f=>packages.writeJob(f.latest.file,{failedBeforeReplacement:true}),
  f=>packages.writeJob(f.latest.file,{health:null}),
  f=>packages.writeJob(f.latest.file,{ordinaryWorkResumedAt:null}),
  f=>packages.writeJob(f.latest.file,{outcome:'rollback'}),
  f=>packages.writeJob(f.latest.file,{phase:'prepared'}),
  f=>packages.writeJob(f.latest.file,{error:'Ambiguous provider continuation'}),
  f=>packages.writeJob(f.latest.file,{helperPid:f.pid}),
  f=>fs.writeFileSync(f.latest.file+'.helper-lock','123'),
  f=>fs.writeFileSync(path.join(f.options.installation,'changed-runtime'),'changed'),
  f=>atomic(path.join(f.options.home,'connection.json'),{pid:f.pid+1}),
  f=>fs.writeFileSync(path.join(f.options.home,'runner.lock'),String(f.pid+1)),
  f=>{f.dependencies.alive=()=>false;},
  f=>fs.writeFileSync(f.preservation,'changed'),
  f=>fs.writeFileSync(path.join(f.old.directory,'data-0','new-sidecar'),'changed'),
  f=>packages.writeJob(f.middle.file,{phase:'prepared'})
 ];
 for(const change of cases){const f=attentionFixture(t);change(f);const before=fs.readFileSync(f.latest.file),policy=fs.readFileSync(f.policyFile);const options={...f.options,expectedRevision:packages.readJob(f.latest.file).revision};assert.throws(()=>attention.attentionPlan(f.root,options,f.dependencies));assert.equal(fs.existsSync(path.join(path.dirname(f.latest.file),'attention-resolution.json')),false);assert.deepEqual(fs.readFileSync(f.latest.file),before);assert.deepEqual(fs.readFileSync(f.policyFile),policy);}
});
test('reconciliation API retains original-chat authorization and rejects stale revisions before worker dispatch',async t=>{
 const f=attentionFixture(t),job=packages.readJob(f.latest.file);packages.writeJob(f.latest.file,{runId:'original-update'});
 const calls=[],owner={root:f.root,ownerHome:f.options.home,installation:f.options.installation,browserHome:f.options.browserHome,platform:'win32',packaged:true,owns:Updates.prototype.owns,packageWork:async(...args)=>{calls.push(args);return {canApply:true};}};
 const request={action:'reconciliation',id:job.id,expectedRevision:packages.readJob(f.latest.file).revision};
 await assert.rejects(Updates.prototype.handle.call(owner,request,'another-chat'),/original chat/);assert.equal(calls.length,0);
 await assert.rejects(Updates.prototype.handle.call(owner,{...request,expectedRevision:0},'original-update'),/changed/);assert.equal(calls.length,0);
 await assert.rejects(Updates.prototype.handle.call(owner,{...request,id:'../../escape'},'original-update'),/exact attention/);assert.equal(calls.length,0);
 await Updates.prototype.handle.call(owner,request,'original-update');assert.equal(calls[0][0],'attentionPlan');assert.equal(calls[0][1],f.root);assert.equal(calls[0][2].home,f.options.home);assert.equal(owner.busy,false);
});
test('changed reconciliation inputs and linked receipts stop before an effect, while a corrupt receipt keeps maintenance blocked',t=>{
 const f=attentionFixture(t),plan=attention.attentionPlan(f.root,f.options,f.dependencies);
 fs.writeFileSync(path.join(f.latest.directory,'data-1','changed'),'changed');
 assert.throws(()=>attention.reconcileAttention(f.root,{...f.options,planDigest:plan.planDigest},f.dependencies));
 assert.equal(fs.existsSync(path.join(path.dirname(f.latest.file),'attention-resolution.json')),false);
 const g=attentionFixture(t),target=path.join(path.dirname(g.latest.file),'attention-resolution.json');
 fs.symlinkSync(path.join(g.temp,'missing'),target);
 assert.throws(()=>attention.attentionPlan(g.root,g.options,g.dependencies),/symbolic/);
 fs.unlinkSync(target);atomic(target,{schemaVersion:1,kind:'forged'});
 assert.equal(maintenance.maintenancePlan(g.root,g.options,g.dependencies).canApply,false);
});
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
test('maintenance archives complete retired receipts and a bound intent before removing a generation',t=>{
 const f=fixture(t),old=f.generation(21),second=f.generation(22),newest=f.generation(23),originalPolicy=fs.readFileSync(f.policyFile,'utf8'),originalReceipt=fs.readFileSync(old.receiptFile,'utf8');
 const plan=maintenance.maintenancePlan(f.root,f.options,f.dependencies),result=maintenance.applyMaintenance(f.root,{...f.options,planDigest:plan.planDigest},f.dependencies);
 const operation=path.dirname(result.receiptFile),intentFile=path.join(operation,'recovery-retirement-intent.json'),intent=JSON.parse(fs.readFileSync(intentFile,'utf8'));
 assert.deepEqual(intent.policyBefore,JSON.parse(originalPolicy));assert.equal(intent.planDigest,plan.planDigest);
 assert.equal(intent.retiredReceipts[0].raw,originalReceipt);assert.deepEqual(intent.retiredReceipts[0].receipt,JSON.parse(originalReceipt));assert.equal(intent.retiredReceipts[0].receiptHash,digest(originalReceipt));
 const completion=JSON.parse(fs.readFileSync(path.join(operation,'recovery-retirement.json'),'utf8'));assert.equal(completion.intentHash,fileDigest(intentFile));assert.deepEqual(completion.retired,[old.id]);assert.deepEqual(completion.retained.sort(),[second.id,newest.id].sort());
 assert.equal(fs.existsSync(old.directory),false);assert.equal(maintenance.maintenancePlan(f.root,f.options,f.dependencies).canApply,true);
});
test('interruption after recovery deletion cannot become absent history or silently replay',t=>{
 const f=fixture(t),old=f.generation(21),second=f.generation(22),newest=f.generation(23),originalReceipt=fs.readFileSync(old.receiptFile,'utf8');
 const survivors=[second,newest].map(row=>({directory:row.directory,hash:tree(row.directory).hash}));
 const remove=fs.rmSync;t.mock.method(fs,'rmSync',(directory,...args)=>{const result=remove(directory,...args);if(directory===old.directory)throw Error('synthetic interruption after removal, before policy save');return result;});
 const plan=maintenance.maintenancePlan(f.root,f.options,f.dependencies);
 assert.throws(()=>maintenance.applyMaintenance(f.root,{...f.options,planDigest:plan.planDigest},f.dependencies),/synthetic interruption/);
 assert.equal(fs.existsSync(old.directory),false);const interruptedPolicy=fs.readFileSync(f.policyFile);assert.ok(JSON.parse(interruptedPolicy).generations.some(row=>row.id===old.id));
 const next=maintenance.maintenancePlan(f.root,f.options,f.dependencies);assert.equal(next.canApply,false);assert.ok(next.issues.some(row=>row.kind==='interrupted-retirement'));assert.equal(next.missing.some(row=>row.id===old.id),false);
 const intentFile=path.join(f.root,'maintenance',plan.planDigest,'recovery-retirement-intent.json'),intent=JSON.parse(fs.readFileSync(intentFile,'utf8'));assert.equal(intent.retiredReceipts[0].raw,originalReceipt);
 assert.equal(fs.existsSync(path.join(path.dirname(intentFile),'recovery-retirement.json')),false);
 assert.throws(()=>maintenance.applyMaintenance(f.root,{...f.options,planDigest:next.planDigest},f.dependencies),/inspection/);
 assert.deepEqual(fs.readFileSync(f.policyFile),interruptedPolicy);assert.deepEqual(JSON.parse(interruptedPolicy).unavailableGenerations,[]);
 for(const survivor of survivors)assert.equal(tree(survivor.directory).hash,survivor.hash);
});
test('an interrupted retirement remains explicit after policy commit but before completion receipt',t=>{
 const f=fixture(t),old=f.generation(21);f.generation(22);f.generation(23);
 const rename=fs.renameSync;t.mock.method(fs,'renameSync',(source,target,...args)=>{if(path.basename(target)==='recovery-retirement.json')throw Error('synthetic completion receipt failure');return rename(source,target,...args);});
 const plan=maintenance.maintenancePlan(f.root,f.options,f.dependencies);
 assert.throws(()=>maintenance.applyMaintenance(f.root,{...f.options,planDigest:plan.planDigest},f.dependencies),/synthetic completion/);
 const policy=fs.readFileSync(f.policyFile);assert.equal(JSON.parse(policy).generations.some(row=>row.id===old.id),false);
 const next=maintenance.maintenancePlan(f.root,f.options,f.dependencies);assert.equal(next.canApply,false);assert.equal(next.missing.length,0);assert.ok(next.issues.some(row=>row.kind==='interrupted-retirement'));
 assert.throws(()=>maintenance.applyMaintenance(f.root,{...f.options,planDigest:next.planDigest},f.dependencies),/inspection/);assert.deepEqual(fs.readFileSync(f.policyFile),policy);
});
test('maintenance rejects live-folder overlaps, wrong owner roots and linked metadata',t=>{
 const f=fixture(t);assert.throws(()=>maintenance.maintenancePlan(f.temp,f.options,f.dependencies),/bound/);
 assert.throws(()=>maintenance.maintenancePlan(f.root,{...f.options,recoveryRoots:[f.options.home]},f.dependencies),/overlaps/);
 const row=f.generation(21);const policy=JSON.parse(fs.readFileSync(f.policyFile));policy.generations[0].directory=f.options.home;policy.generations[0].receiptFile=path.join(f.options.home,'recovery.json');atomic(f.policyFile,policy);
 const plan=maintenance.maintenancePlan(f.root,f.options,f.dependencies);assert.equal(plan.canApply,false);assert.ok(plan.issues.length);
 assert.equal(fs.existsSync(row.directory),true);
});
