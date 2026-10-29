import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import packages from '../desktop/updates/update-package.cjs';
import failures from '../desktop/updates/update-failure.cjs';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';

test('failure receipt storage errors retain the original cause without blocking recovery',t=>{
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-failure-')),id=randomUUID(),directory=path.join(root,'jobs',id),file=path.join(directory,'job.json');
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 packages.atomic(file,{schemaVersion:1,id,file,revision:1,phase:'verifying',home:path.join(root,'data'),installation:path.join(root,'installed'),recoveryRoot:path.join(root,'recoveries'),recoveryPolicy:path.join(root,'recovery-policy.json'),secret:'synthetic',continuationId:'synthetic',checkpoint:'Original continuity checkpoint',candidate:{bundle:path.join(directory,'candidate','Proteus'),hash:'accepted',buildRevision:'candidate'}});
 const saved=failures.recordFailure(file,'verifying',Error('Candidate health failed'),{save:()=>{throw Object.assign(Error('Receipt volume is full'),{code:'ENOSPC'});}});
 assert.equal(saved.phase,'verifying');assert.equal(saved.failureHistory[0].error,'Candidate health failed');assert.equal(saved.failureHistory[0].captureError,'Receipt volume is full');
 assert.match(saved.checkpoint,/^Original continuity checkpoint/);assert.match(saved.checkpoint,/Candidate health failed/);
 packages.writeJob(file,{phase:'complete',outcome:'rollback',error:null});
 const completed=packages.readJob(file);assert.equal(completed.failureHistory[0].error,'Candidate health failed');assert.equal(completed.failureHistory[0].receiptFile,undefined);
});
