// Old-client bootstrap adapter for the same bounded owner-maintenance service.
// No elevation, live-data writes, shell commands, installer or fake receipts.
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import packages from '../desktop/updates/update-package.cjs';
import maintenance from '../desktop/updates/update-maintenance.cjs';
import attention from '../desktop/updates/attention-reconciliation.cjs';
export function runMaintenance(argv){
 const {values}=parseArgs({args:argv,options:{home:{type:'string'},installation:{type:'string'},'browser-home':{type:'string'},'recovery-root':{type:'string',multiple:true},apply:{type:'boolean'},'plan-digest':{type:'string'},'reconcile-job':{type:'string'},'expected-revision':{type:'string'}}});
 if(!values.home||!values.installation||!values['browser-home'])throw Error('Supply exact --home, --installation and --browser-home paths.');
 const options={home:fs.realpathSync(values.home),installation:fs.realpathSync(values.installation),browserHome:fs.realpathSync(values['browser-home']),recoveryRoots:values['recovery-root']||[],planDigest:values['plan-digest']};
 const root=path.join(path.dirname(options.home),'Proteus Updates',packages.digest(options.home+'\0'+options.installation).slice(0,24));
 if(values['reconcile-job'])return attention[values.apply?'reconcileAttention':'attentionPlan'](root,{...options,id:values['reconcile-job'],expectedRevision:Number(values['expected-revision'])});
 return values.apply?maintenance.applyMaintenance(root,options):maintenance.maintenancePlan(root,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{console.log(JSON.stringify(runMaintenance(process.argv.slice(2)),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
