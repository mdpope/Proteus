// Old-client bootstrap adapter for the same bounded owner-maintenance service.
// No elevation, live-data writes, shell commands, installer or fake receipts.
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import packages from '../desktop/updates/update-package.cjs';
import maintenance from '../desktop/updates/update-maintenance.cjs';
import attention from '../desktop/updates/attention-reconciliation.cjs';
import ownerTransport from '../desktop/updates/owner-request.cjs';
export async function revalidateOwner(home,request=ownerTransport.ownerRequest){
 const status=await request({home},'/api/updates');
 const identity=status.identity,job=status.job;
 if(status.error||status.download||status.operation?.busy||identity?.packaged!==true||identity.identityPending||identity.barrier||!job||job.phase!=='complete'||job.outcome!=='updated'||job.health?.verified!==true)throw Error('Fresh owner verification requires an idle healthy completed installation.');
 const homeStatus=await request({home},'/api/home'),after=await request({home},'/api/updates');
 if(homeStatus.buildRevision!==identity.buildRevision||after.error||after.download||after.operation?.busy||JSON.stringify(after.identity)!==JSON.stringify(identity)||after.job?.id!==job.id||after.job?.revision!==job.revision||after.job?.phase!=='complete'||after.job?.health?.verified!==true)throw Error('The owner changed during fresh API verification.');
 // Never export the connection token or arbitrary owner response fields.
 return {identity:Object.fromEntries(['pid','sessionId','packaged','home','installation','sourceFingerprint','buildRevision','platform','arch'].map(key=>[key,identity[key]])),jobId:job.id,jobRevision:job.revision};
}
export function runMaintenance(argv,dependencies={}){
 const {values}=parseArgs({args:argv,options:{home:{type:'string'},installation:{type:'string'},'browser-home':{type:'string'},'recovery-root':{type:'string',multiple:true},apply:{type:'boolean'},'plan-digest':{type:'string'},'reconcile-job':{type:'string'},'expected-revision':{type:'string'},'revalidate-owner':{type:'boolean'}}});
 if(!values.home||!values.installation||!values['browser-home'])throw Error('Supply exact --home, --installation and --browser-home paths.');
 const options={home:fs.realpathSync(values.home),installation:fs.realpathSync(values.installation),browserHome:fs.realpathSync(values['browser-home']),recoveryRoots:values['recovery-root']||[],planDigest:values['plan-digest']};
 const root=path.join(path.dirname(options.home),'Proteus Updates',packages.digest(options.home+'\0'+options.installation).slice(0,24));
 if(values['revalidate-owner']&&(!values['reconcile-job']||!dependencies.revalidatedOwner))throw Error('Fresh owner verification is required for this explicit reconciliation mode.');
 if(values['reconcile-job'])return attention[values.apply?'reconcileAttention':'attentionPlan'](root,{...options,id:values['reconcile-job'],expectedRevision:Number(values['expected-revision'])},values['revalidate-owner']?dependencies:{});
 return values.apply?maintenance.applyMaintenance(root,options):maintenance.maintenancePlan(root,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{const argv=process.argv.slice(2),index=argv.indexOf('--home');const dependencies=argv.includes('--revalidate-owner')?{revalidatedOwner:await revalidateOwner(fs.realpathSync(argv[index+1]))}:{};console.log(JSON.stringify(runMaintenance(argv,dependencies),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
