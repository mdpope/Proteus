import test from 'node:test';
import assert from 'node:assert/strict';
import {updateObservation,updateStillRunning} from '../src/services/updates/update-observation.js';

test('update observation exposes only the coordinator receipt and distinguishes package health from model completion',()=>{
 const run={id:'own',schedule:{purpose:'update',updateSession:{releaseId:'release',version:'1.2.3',manifestDigest:'a'.repeat(64),operationId:'private'}}};
 const status={identity:{platform:'linux',arch:'x64',packaged:true,buildRevision:'new',installation:'/private/app',home:'/private/data'},job:{id:'job',runId:'other',phase:'complete',outcome:'updated',buildRevision:'new',health:{verified:true}}};
 const service={updates:{status:()=>status}};
 assert.equal(updateObservation(service,{...run,schedule:{purpose:'ordinary'}}),undefined);
 assert.equal(updateObservation(service,run).job,null,'another chat’s job is never returned');
 status.job.runId=run.id;status.job.phase='waiting-for-idle';
 let value=updateObservation(service,run);assert.equal(updateStillRunning(value),true);assert.equal(value.packageVerified,false);
 assert.equal(JSON.stringify(value).includes('/private'),false);assert.equal(value.selection.operationId,undefined);
 status.job.phase='complete';value=updateObservation(service,run);
 assert.equal(value.packageVerified,true);assert.equal(updateStillRunning(value),true,'keep watching until the local continuation is delivered');
 status.job.continuation={at:'synthetic'};value=updateObservation(service,run);assert.equal(updateStillRunning(value),false);
 status.identity.buildRevision='previous';assert.equal(updateObservation(service,run).packageVerified,false);
 status.job.outcome='rollback';assert.equal(updateObservation(service,run).packageVerified,false);
 status.job.phase='attention';assert.equal(updateStillRunning(updateObservation(service,run)),false);
 assert.deepEqual(updateObservation({},run),{available:false});
});
