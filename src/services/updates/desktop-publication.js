import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import packages from '../../../desktop/updates/update-package.cjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

/** Run beside the deployment workflow, after upload and recovery verification.
 * The dry-run digest binds the new public bytes and every superseded directory.
 * Only desktop release payloads are eligible; website/data backups are separate. */
export function desktopPublicationPlan(publicRoot,receipt){
 if(!path.isAbsolute(publicRoot||'')||receipt?.schemaVersion!==1||!Array.isArray(receipt.files)||!Array.isArray(receipt.releases)||!receipt.releases.length)throw Error('Supply the public root and exact distribution receipt.');
 const root=fs.realpathSync(publicRoot),base=path.join(root,'downloads/proteus'),directory=path.join(base,'releases');
 for(const folder of [path.join(root,'downloads'),base,directory])if(!fs.lstatSync(folder).isDirectory()||fs.lstatSync(folder).isSymbolicLink())throw Error('Publication folders must be ordinary directories.');
 for(const row of receipt.files){
  if(typeof row.path!=='string'||!row.path.startsWith('downloads/proteus/')||row.path.includes('\\')||row.path.split('/').includes('..'))throw Error('Distribution paths must stay inside public desktop downloads.');
  const file=path.join(root,row.path),stat=fs.lstatSync(file);
  const canonical=fs.realpathSync(file);
  if(!canonical.startsWith(root+path.sep)||!stat.isFile()||stat.isSymbolicLink()||stat.size!==row.bytes||packages.fileDigest(file)!==row.sha256)throw Error('Verify every new public file before retiring any older release.');
 }
 const current=JSON.parse(fs.readFileSync(path.join(base,'current.json'),'utf8'));
 const active=receipt.releases.map(row=>row.updateRelease.releaseId).sort(),pending=(receipt.retainedReleases||[]).map(row=>row.updateRelease.releaseId).sort();
 const retained=[...active,...pending].sort();
 if(current.version!==receipt.version||JSON.stringify(current.targets.map(row=>row.releaseId).sort())!==JSON.stringify(active)||JSON.stringify((current.pendingTargets||[]).map(row=>row.releaseId).sort())!==JSON.stringify(pending))throw Error('The current public release differs from this distribution receipt.');
 const retired=[];
 const inventory=folder=>fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(row=>{
  const file=path.join(folder,row.name);if(row.isSymbolicLink())throw Error('A release contains a link; inspect it before cleanup.');
  if(!row.isDirectory()&&!row.isFile())throw Error('An unknown release payload needs review before cleanup.');
  return row.isDirectory()?inventory(file):[{path:path.relative(directory,file).split(path.sep).join('/'),bytes:fs.statSync(file).size,sha256:packages.fileDigest(file)}];
 });
 for(const row of fs.readdirSync(directory,{withFileTypes:true})){
  if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(row.name)||!row.isDirectory()||row.isSymbolicLink())throw Error('An unknown release entry needs review before cleanup.');
  if(!retained.includes(row.name))retired.push({id:row.name,files:inventory(path.join(directory,row.name))});
 }
 retired.sort((a,b)=>a.id.localeCompare(b.id));
 const plan={schemaVersion:1,root,version:receipt.version,retained,retired};
 return {...plan,planDigest:digest(JSON.stringify({plan,currentFiles:receipt.files}))};
}

export function retireDesktopPublications(publicRoot,receipt,planDigest){
 const plan=desktopPublicationPlan(publicRoot,receipt);
 if(plan.planDigest!==planDigest)throw Error('Publication cleanup changed. Inspect a fresh plan before applying it.');
 for(const row of plan.retired)fs.rmSync(path.join(plan.root,'downloads/proteus/releases',row.id),{recursive:true});
 return {version:plan.version,retained:plan.retained,retired:plan.retired.map(row=>row.id)};
}
