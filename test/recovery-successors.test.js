import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{retainGeneration}=require('../desktop/updates/update-helper.cjs'),{atomic,digest}=require('../desktop/updates/update-package.cjs');
test('a rotated completed recovery is recognized only from two newer verified successor receipts',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-recovery-successors-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const job={id:'old-job',phase:'complete',createdAt:'2026-10-20T00:00:00Z',home:path.join(root,'home'),installation:path.join(root,'app'),recovery:path.join(root,'old'),recoveryPolicy:path.join(root,'updates','recovery-policy.json')};
 const policy={schemaVersion:1,home:job.home,installation:job.installation,auditedAt:'2026-10-19T00:00:00Z',generations:[]};atomic(job.recoveryPolicy,policy);
 assert.throws(()=>retainGeneration(job),/receipt is missing/);
 for(let i=0;i<2;i++){const directory=path.join(root,'new-'+i),receiptFile=path.join(directory,'recovery.json');atomic(receiptFile,{verified:true,index:i});policy.generations.push({id:'new-'+i,directory,receiptFile,receiptHash:digest(fs.readFileSync(receiptFile)),at:`2026-10-${21+i}T00:00:00Z`,verified:true,eligible:true});}
 atomic(job.recoveryPolicy,policy);const before=fs.readFileSync(job.recoveryPolicy);assert.deepEqual(retainGeneration(job),{retained:false,superseded:true,verifiedSuccessors:['new-0','new-1']});assert.deepEqual(fs.readFileSync(job.recoveryPolicy),before);assert.equal(fs.existsSync(job.recovery),false);
 fs.mkdirSync(job.recovery);assert.throws(()=>retainGeneration(job),/receipt is missing/,'An existing unverified directory is not silently classified as rotated');fs.rmdirSync(job.recovery);
 fs.writeFileSync(policy.generations[0].receiptFile,'Changed');assert.throws(()=>retainGeneration(job),/receipt is missing/,'A missing old copy cannot hide invalid successors');
 assert.throws(()=>retainGeneration({...job,recovery:policy.generations[0].directory}),/missing or changed/);
});
