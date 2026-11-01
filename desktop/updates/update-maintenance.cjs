// The owner supplies these roots. Coordinators never supply deletion paths or a
// privileged shell. The same plan/apply boundary supports a one-time old-client
// bootstrap from the reviewed source CLI.
const fs=require('node:fs'),path=require('node:path');
const {atomic,digest,fileDigest,tree,inspectPackage,recoveryPolicy,readJob,excluded}=require('./update-package.cjs');
const {inventoryStorage,retireStaging}=require('./update-storage.cjs');

function directory(file){
 const resolved=path.resolve(file),info=fs.lstatSync(resolved);
 if(!info.isDirectory()||info.isSymbolicLink()||fs.realpathSync(resolved)!==resolved)throw Error('Maintenance requires canonical ordinary directories.');
 return resolved;
}
function ordinaryPath(file){
 let current=path.resolve(file);
 for(;;){if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Maintenance paths must not traverse symbolic links.');const parent=path.dirname(current);if(parent===current)break;current=parent;}
 return path.resolve(file);
}
function json(file){
 ordinaryPath(file);const info=fs.lstatSync(file);
 if(!info.isFile()||info.size>1024*1024)throw Error('Maintenance metadata must be a bounded ordinary file.');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function binding(root,{home,installation,browserHome,platform=process.platform}){
 home=directory(home);installation=directory(installation);if(browserHome)browserHome=directory(browserHome);
 const expected=path.join(path.dirname(home),'Proteus Updates',digest(home+'\0'+installation).slice(0,24));
 if(path.resolve(root)!==expected)throw Error('Maintenance is bound to this installation and data home.');
 ordinaryPath(root);return {home,installation,browserHome,platform,updates:root};
}
function verifyGeneration(row,owner,{inspect=inspectPackage}={}){
 const base=directory(row.directory),receiptFile=path.join(base,'recovery.json');
 if([owner.home,owner.browserHome,owner.installation].filter(Boolean).some(live=>base===live||base.startsWith(live+path.sep)||live.startsWith(base+path.sep)))throw Error('Recovery generation overlaps live application data.');
 if(owner.updates&&base.startsWith(owner.updates+path.sep)&&!base.startsWith(path.join(owner.updates,'recoveries')+path.sep))throw Error('Recovery generation overlaps updater state.');
 if(row.receiptFile&&row.receiptFile!==receiptFile)throw Error('Recovery receipt escaped its generation.');
 const receipt=json(receiptFile),receiptHash=fileDigest(receiptFile);
 if(row.receiptHash&&row.receiptHash!==receiptHash)throw Error('A retained recovery receipt changed.');
 if(receipt.schemaVersion!==1||receipt.verified!==true||receipt.previous?.bundle!==owner.installation||!['Proteus','Proteus.app'].includes(receipt.app)||!Array.isArray(receipt.roots)||!receipt.roots.length)throw Error('Recovery receipt does not bind this installation and its data.');
 const expected=[...new Set([owner.home,owner.browserHome].filter(Boolean))].filter(root=>![owner.home,owner.browserHome].some(parent=>parent&&parent!==root&&root.startsWith(parent+path.sep)));
 if(JSON.stringify(receipt.roots.map(row=>row.root).sort())!==JSON.stringify(expected.sort()))throw Error('Recovery receipt does not cover the current data and browser homes.');
 const app=directory(path.join(base,receipt.app)),actual=inspect(app,{platform:owner.platform});
 if(actual.hash!==receipt.previous.hash||receipt.previous.installationHash&&actual.installationHash!==receipt.previous.installationHash||actual.sourceFingerprint!==receipt.previous.sourceFingerprint||JSON.stringify(actual.signing)!==JSON.stringify(receipt.previous.signing)||receipt.previous.installer&&actual.installer?.sha256!==receipt.previous.installer.sha256)throw Error('Recovery application differs from its receipt.');
 for(const [index,snapshot]of receipt.roots.entries()){
  const source=directory(path.join(base,'data-'+index));
  if(!/^[a-f0-9]{64}$/.test(snapshot.hash||'')||tree(source,{exclude:excluded,recoveryCaches:snapshot.recoveryCachePolicy===1,cachePrefix:snapshot.cachePrefix||'',runtimePrefix:snapshot.runtimePrefix??null}).hash!==snapshot.hash)throw Error('Recovery data differs from its receipt.');
 }
 if(!Number.isFinite(Date.parse(row.at||receipt.at)))throw Error('Recovery receipt has no valid capture date.');
 return {...row,directory:base,receiptFile,receiptHash,at:row.at||receipt.at,verified:true,applicationHash:actual.hash};
}
function maintenanceRetirements(root,owner,issues){
 const base=ordinaryPath(path.join(root,'maintenance')),result=[];
 if(!fs.existsSync(base))return result;
 const entries=fs.readdirSync(directory(base));if(entries.length>1000)throw Error('Maintenance history exceeds 1,000 operations.');
 for(const name of entries){
  const operation=path.join(base,name),intentFile=path.join(operation,'recovery-retirement-intent.json');
  try{
   directory(operation);if(!fs.existsSync(intentFile))continue;
   const intent=json(intentFile),intentHash=fileDigest(intentFile),inventory=intent.inventory;
   if(!/^[a-f0-9]{64}$/.test(name)||intent.schemaVersion!==1||intent.planDigest!==name||intent.policyBefore?.home!==owner.home||intent.policyBefore?.installation!==owner.installation||inventory?.home!==owner.home||inventory?.installation!==owner.installation||!Array.isArray(inventory.generations)||!Array.isArray(intent.retiredReceipts)||!intent.retiredReceipts.length||intent.retiredReceipts.length>100)throw Error('Maintenance retirement intent does not bind this installation.');
   const targets=intent.retiredReceipts.map(archived=>{
    const row=inventory.generations.find(row=>row.id===archived.id&&row.directory===archived.directory);
    if(!row||row.receiptHash!==archived.receiptHash||typeof archived.raw!=='string'||digest(archived.raw)!==row.receiptHash||JSON.stringify(JSON.parse(archived.raw))!==JSON.stringify(archived.receipt))throw Error('Archived recovery receipt differs from its retirement intent.');
    return {id:row.id,directory:row.directory};
   });
   if(new Set(targets.map(row=>row.id)).size!==targets.length)throw Error('Retirement intent has duplicate generation identities.');
   const receiptFile=path.join(operation,'recovery-retirement.json'),complete=fs.existsSync(receiptFile);
   let receiptHash=null;
   if(complete){
    const receipt=json(receiptFile),expected=targets.map(row=>row.id).sort();
    if(receipt.schemaVersion!==1||receipt.planDigest!==name||receipt.intentHash!==intentHash||JSON.stringify(receipt.retired?.slice().sort())!==JSON.stringify(expected)||JSON.stringify(receipt.retained?.slice().sort())!==JSON.stringify(inventory.generations.filter(row=>!expected.includes(row.id)).map(row=>row.id).sort()))throw Error('Maintenance retirement completion differs from its intent.');
    receiptHash=fileDigest(receiptFile);
   }else issues.push({kind:'interrupted-retirement',planDigest:name,intentFile,error:'A prior recovery retirement needs receipt-based reconciliation before further maintenance.'});
   result.push({planDigest:name,intentFile,intentHash,receiptHash,complete,targets});
  }catch(error){issues.push({kind:'maintenance-history',directory:operation,error:error.message});}
 }
 return result;
}
function maintenancePlan(root,options={},dependencies={}){
 const owner=binding(root,options),policyFile=ordinaryPath(path.join(root,'recovery-policy.json')),policyHash=fs.existsSync(policyFile)?fileDigest(policyFile):null;
 const issues=[],missing=[],verified=[],discovered=[],jobs=[];
 let policy;
 try{policy=recoveryPolicy(policyFile,owner);}catch(error){issues.push({kind:'policy',error:error.message});}
 const retirements=maintenanceRetirements(root,owner,issues),retiredBy=new Map(retirements.flatMap(operation=>operation.targets.map(row=>[row.directory,operation])));
 // Only previously inventoried roots and this installation's managed root are
 // scanned. External legacy roots enter through the explicit bootstrap CLI.
 if(!Array.isArray(policy?.audit?.recoveryRoots||[])||!Array.isArray(options.recoveryRoots||[]))throw Error('Recovery roots must be a list.');
 const roots=[...new Set([path.join(root,'recoveries'),...(policy?.generations||[]).map(row=>path.dirname(row.directory)),...(policy?.audit?.recoveryRoots||[]),...(options.recoveryRoots||[])])].map(ordinaryPath);
 if(roots.length>32)throw Error('Maintenance supports at most 32 recorded recovery roots.');
 for(const scan of roots)if([owner.home,owner.browserHome,owner.installation,root].filter(Boolean).some(protectedRoot=>scan===protectedRoot||protectedRoot.startsWith(scan+path.sep)||scan.startsWith(protectedRoot+path.sep)&&scan!==path.join(root,'recoveries')))throw Error('A recovery scan overlaps live application data or maintenance state.');
 const known=new Map((policy?.generations||[]).map(row=>[row.directory,row]));
 for(const row of known.values()){
  try{
   const retirement=retiredBy.get(row.directory);
   if(retirement){if(retirement.complete)issues.push({kind:'retirement-policy',directory:row.directory,error:'A completed retirement is still listed in the recovery policy; preserve it for reconciliation.'});continue;}
   ordinaryPath(row.directory);
   if(!fs.existsSync(row.directory)){missing.push({...row,available:false});continue;}
   verified.push(verifyGeneration(row,owner,dependencies));
  }catch(error){issues.push({kind:'recovery',directory:row.directory,error:error.message});}
 }
 const jobsRoot=path.join(root,'jobs');
 if(fs.existsSync(jobsRoot))for(const name of fs.readdirSync(directory(jobsRoot))){
  try{
   const file=path.join(jobsRoot,name,'job.json');ordinaryPath(file);const job=readJob(file);
   if(job.home!==owner.home||job.installation!==owner.installation)throw Error('Update journal belongs to another installation.');
   const resolution=job.phase==='attention'?require('./attention-reconciliation.cjs').readAttentionResolution(job,owner):null;
   jobs.push({...job,attentionResolutionHash:resolution?.receiptHash||null});
   if(!['complete','cancelled'].includes(job.phase)&&!resolution)issues.push({kind:'active-update',id:job.id,phase:job.phase,error:'Finish or reconcile the current update before maintenance.'});
  }catch(error){issues.push({kind:'journal',id:name,error:error.message});}
 }
 for(const scan of roots){
  if(!fs.existsSync(scan))continue;
  const entries=fs.readdirSync(directory(scan),{withFileTypes:true});if(entries.length>1000)throw Error('Recovery scan exceeds 1,000 entries.');
  for(const entry of entries){
   const location=path.join(scan,entry.name);if(known.has(location))continue;
   try{
    if(!entry.isDirectory()||entry.isSymbolicLink())throw Error('Unrecognized recovery entry was preserved.');
    const job=jobs.find(job=>job.recovery===location);
    if(!job||job.phase!=='complete'||job.failedBeforeReplacement)throw Error('Unregistered recovery has no completed owning update journal.');
    const row=verifyGeneration({id:job.id,directory:location,eligible:true},owner,dependencies);
    verified.push(row);discovered.push(row.id);
   }catch(error){issues.push({kind:'unregistered-recovery',directory:location,error:error.message});}
  }
 }
 if(missing.length&&!verified.length)issues.push({kind:'missing-recovery',error:'No complete recovery generation survives. Preserve the inventory and establish recovery protection before reconciliation.'});
 let storage;
 try{storage=inventoryStorage(root,owner);}catch(error){issues.push({kind:'storage',error:error.message});}
 // Preserve the newest two complete generations. Unresolved generations never
 // become eligible merely because maintenance found their files.
 const ordered=verified.slice().sort((a,b)=>b.at.localeCompare(a.at)),retire=ordered.slice(2).filter(row=>row.eligible===true).map(row=>row.id);
 const state={owner,policyHash,roots,missing,verified,discovered,retire,retirements,issues,jobs:jobs.map(job=>({id:job.id,revision:job.revision,phase:job.phase,...(job.phase==='attention'?{attentionResolution:job.attentionResolutionHash}:{})})),staging:storage?.jobs||[]};
 const planDigest=digest(JSON.stringify(state));
 return {schemaVersion:1,...state,planDigest,paths:{installation:owner.installation,home:owner.home,browserHome:owner.browserHome||null,updates:root,recoveries:path.join(root,'recoveries')},storage,canApply:!!policy&&!issues.length};
}
function applyMaintenance(root,options={},dependencies={}){
 if(!/^[a-f0-9]{64}$/.test(options.planDigest||''))throw Error('Inspect maintenance and supply its current plan digest.');
 const plan=maintenancePlan(root,options,dependencies);
 if(plan.planDigest!==options.planDigest)throw Error('Maintenance state changed. Inspect a fresh plan before applying it.');
 if(!plan.canApply)throw Error('Maintenance needs inspection: '+plan.issues.map(row=>row.error).join('; '));
 const policyFile=path.join(root,'recovery-policy.json'),policy=recoveryPolicy(policyFile,plan.owner);
 const operation=path.join(root,'maintenance',plan.planDigest),receiptFile=path.join(operation,'receipt.json');ordinaryPath(operation);
 // No arbitrary restore and no deletion of live data. Keep the complete former
 // inventory, including lost receipt hashes, as compact immutable evidence.
 const before=fs.statfsSync(root),available=info=>Number(info.bavail)*Number(info.bsize);
 if(!fs.existsSync(path.join(operation,'policy-before.json')))atomic(path.join(operation,'policy-before.json'),policy);
 const clean=row=>Object.fromEntries(Object.entries(row).filter(([key])=>key!=='applicationHash'));
 const missing=plan.missing.map(row=>({...row,verified:false,eligible:false,reason:'directory absent during verified maintenance',observedAt:new Date().toISOString()}));
 const next={...policy,auditedAt:new Date().toISOString(),audit:{...policy.audit,kind:'owner-maintenance',recoveryRoots:plan.roots},generations:plan.verified.map(clean),unavailableGenerations:[...(policy.unavailableGenerations||[]),...missing]};
 const inUse=dependencies.inUse||(plan.owner.platform==='win32'?require('./windows-installation.cjs').inUse:location=>require('node:child_process').execFileSync('/bin/ps',['-ax','-o','command='],{encoding:'utf8'}).split('\n').some(command=>command.includes(location+path.sep)));
 const intentFile=path.join(operation,'recovery-retirement-intent.json'),retirementFile=path.join(operation,'recovery-retirement.json');
 if(plan.retire.length){
  const retiredReceipts=plan.retire.map(id=>{
   const row=plan.verified.find(item=>item.id===id);verifyGeneration(row,plan.owner,dependencies);
   if(inUse(row.directory))throw Error('A recovery application may be in use; its files were preserved.');
   const raw=fs.readFileSync(row.receiptFile,'utf8');if(digest(raw)!==row.receiptHash)throw Error('A recovery receipt changed before retirement intent.');
   return {id:row.id,directory:row.directory,receiptHash:row.receiptHash,receipt:JSON.parse(raw),raw};
  });
  if(retiredReceipts.some(row=>typeof row.id!=='string'||!row.id)||new Set(retiredReceipts.map(row=>row.id)).size!==retiredReceipts.length)throw Error('Recovery retirement requires distinct generation identities.');
  const intent={schemaVersion:1,planDigest:plan.planDigest,at:new Date().toISOString(),policyBefore:policy,inventory:next,retiredReceipts,survivors:plan.verified.filter(row=>!plan.retire.includes(row.id)).map(row=>({id:row.id,receiptHash:row.receiptHash}))};
  if(Buffer.byteLength(JSON.stringify(intent,null,2)+'\n')>1024*1024)throw Error('Maintenance retirement intent exceeds its supported size; no recovery was removed.');
  if(fs.existsSync(intentFile)||fs.existsSync(retirementFile))throw Error('A prior recovery retirement needs receipt-based reconciliation before retry.');
  // Archive every complete receipt and the precise deletion intent before the
  // policy or a generation changes. Reads recognize unresolved intents instead
  // of relabelling our interrupted deletion as pre-existing absent history.
  atomic(intentFile,intent);
 }
 atomic(policyFile,next);
 const retired=[];
 for(const id of plan.retire){
  const row=plan.verified.find(item=>item.id===id);verifyGeneration(row,plan.owner,dependencies);
  if(inUse(row.directory))throw Error('A recovery application may be in use; its files were preserved.');
  fs.rmSync(row.directory,{recursive:true});next.generations=next.generations.filter(item=>item.directory!==row.directory);atomic(policyFile,next);retired.push(id);
 }
 if(plan.retire.length)atomic(retirementFile,{schemaVersion:1,planDigest:plan.planDigest,intentHash:fileDigest(intentFile),at:new Date().toISOString(),retired,retained:next.generations.map(row=>row.id),freeSpaceChange:available(fs.statfsSync(root))-available(before)});
 const staging=[];
 for(const row of plan.staging.filter(row=>row.eligible))staging.push(retireStaging(path.join(root,'jobs',row.id,'job.json')));
 const receipt={schemaVersion:1,planDigest:plan.planDigest,at:new Date().toISOString(),registered:plan.discovered,unavailable:plan.missing.map(row=>row.id),retired,staging,retained:next.generations.map(row=>row.id),freeSpaceChange:available(fs.statfsSync(root))-available(before)};
 atomic(receiptFile,receipt);return {...receipt,receiptFile};
}
module.exports={maintenancePlan,applyMaintenance,verifyGeneration};
