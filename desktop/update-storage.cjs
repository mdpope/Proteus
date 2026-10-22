const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {atomicRename}=require('../src/atomic-rename.cjs');
const {atomic,tree,fileDigest,readJob,writeJob,recoveryPolicy,excluded}=require('./update-package.cjs');
const processAlive=pid=>{if(!Number.isSafeInteger(pid)||pid<1)return false;try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
function ordinaryDirectory(directory,boundary){
 const resolved=path.resolve(directory);let current=boundary?path.resolve(boundary):resolved;
 if(resolved!==current&&!resolved.startsWith(current+path.sep))throw Error('Recovery/staging path escaped its owner.');
 if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Recovery/staging paths must not traverse symbolic links.');
 for(const part of path.relative(current,resolved).split(path.sep).filter(Boolean)){current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Recovery/staging paths must not traverse symbolic links.');}
 return resolved;
}
function allocation(directory){
 let logicalBytes=0,allocatedBytes=0,files=0;
 const walk=file=>{const info=fs.lstatSync(file);if(info.isDirectory())for(const name of fs.readdirSync(file))walk(path.join(file,name));else{files++;logicalBytes+=info.size;allocatedBytes+=Number.isFinite(info.blocks)?info.blocks*512:info.size;}};
 try{walk(directory);}catch(error){if(error.code!=='ENOENT')throw error;}
 return {logicalBytes,allocatedBytes,files};
}
function copyRecovery(source,destination,{manifestFile,expectedHash,recoveryCaches=false,cachePrefix='',afterFile}={}){
 if(![source,destination,manifestFile].every(value=>typeof value==='string'&&path.isAbsolute(value)))throw Error('Recovery copy requires absolute source, destination and manifest paths.');
 source=fs.realpathSync(source);destination=path.resolve(destination);manifestFile=path.resolve(manifestFile);
 if(source===destination||source.startsWith(destination+path.sep)||destination.startsWith(source+path.sep)||[source,destination].some(root=>manifestFile===root||manifestFile.startsWith(root+path.sep)))throw Error('Recovery source, destination and progress manifest must be separate.');
 ordinaryDirectory(destination);ordinaryDirectory(path.dirname(manifestFile));
 const options={exclude:excluded,recoveryCaches,cachePrefix},snapshot=tree(source,{...options,entries:true});
 if(expectedHash&&snapshot.hash!==expectedHash)throw Error('Recovery source changed before the resumable copy.');
 fs.mkdirSync(destination,{recursive:true,mode:0o700});
 let previous;
 try{previous=JSON.parse(fs.readFileSync(manifestFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(previous&&(previous.source!==source||previous.destination!==destination||previous.sourceHash!==snapshot.hash||previous.recoveryCachePolicy!==(recoveryCaches?1:0)||(previous.cachePrefix||'')!==cachePrefix))throw Error('Partial recovery belongs to a different source generation. It was preserved.');
 const manifest={schemaVersion:1,source,destination,sourceHash:snapshot.hash,recoveryCachePolicy:recoveryCaches?1:0,cachePrefix,files:snapshot.files,verified:0,complete:false};
 atomic(manifestFile,manifest);
 let copied=0,reused=0;
 for(const row of snapshot.entries){
  const [relative,mode,hash]=row,target=path.join(destination,relative),original=path.join(source,relative);
  ordinaryDirectory(path.dirname(target),destination);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
  let matches=false;try{const info=fs.lstatSync(target);matches=mode==='link'?info.isSymbolicLink()&&fs.readlinkSync(target)===hash:info.isFile()&&!info.isSymbolicLink()&&(info.mode&0o777)===mode&&fileDigest(target)===hash;}catch(error){if(error.code!=='ENOENT')throw error;}
  if(matches)reused++;
  else {
   const temporary=target+'.'+crypto.randomUUID()+'.copy';
   try{
    if(mode==='link')fs.symlinkSync(hash,temporary);
    else {fs.copyFileSync(original,temporary);fs.chmodSync(temporary,mode);const fd=fs.openSync(temporary,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(fileDigest(temporary)!==hash)throw Error('A source file changed during recovery copying.');const info=fs.statSync(original);fs.utimesSync(temporary,info.atime,info.mtime);}
    atomicRename(temporary,target);copied++;
   }finally{try{fs.unlinkSync(temporary);}catch(error){if(error.code!=='ENOENT')throw error;}}
  }
  manifest.verified++;manifest.lastVerified=relative;
  if(manifest.verified%64===0)atomic(manifestFile,manifest);
  afterFile?.({relative,copied,reused});
 }
 if(tree(destination,options).hash!==snapshot.hash||tree(source,options).hash!==snapshot.hash)throw Error('Recovery verification failed; source and partial snapshot were preserved.');
 manifest.complete=true;manifest.completedAt=new Date().toISOString();atomic(manifestFile,manifest);
 return {hash:snapshot.hash,bytes:snapshot.bytes,files:snapshot.files,copied,reused};
}
function stagingStatus(job,{alive=processAlive}={}){
 const directory=path.join(path.dirname(job.file),'candidate');ordinaryDirectory(path.dirname(job.file));ordinaryDirectory(directory,path.dirname(job.file));
 let helper=job.helperPid;
 try{const value=Number(fs.readFileSync(job.file+'.helper-lock','utf8'));if(!Number.isSafeInteger(value)||value<1)return {directory,eligible:false,reason:'Unresolved helper lock'};if(alive(value))return {directory,eligible:false,reason:'Helper is running'};}catch(error){if(error.code!=='ENOENT')throw error;}
 if(alive(helper))return {directory,eligible:false,reason:'Helper is running'};
 if(!['cancelled','complete'].includes(job.phase))return {directory,eligible:false,reason:'Update or recovery is unresolved'};
 if(job.phase==='complete'&&job.recovery){
  const inventory=recoveryPolicy(job.recoveryPolicy,job),row=inventory.generations.find(row=>row.directory===job.recovery);
  if(!row||!row.verified)return {directory,eligible:false,reason:'Recovery generation is not registered'};
  if(fileDigest(row.receiptFile)!==row.receiptHash)throw Error('Recovery receipt changed; staging was preserved.');
 }
 return {directory,eligible:true,reason:job.phase==='cancelled'?'Cancelled before replacement':'Verified completed update'};
}
function retireStaging(file,options={}){
 const job=readJob(file),status=stagingStatus(job,options);
 if(!status.eligible||!fs.existsSync(status.directory))return {...status,retired:false};
 const sizes=allocation(status.directory),before=fs.statfsSync(path.dirname(file));
 fs.rmSync(status.directory,{recursive:true,force:true});
 const after=fs.statfsSync(path.dirname(file)),receipt={at:new Date().toISOString(),...sizes,freeSpaceChange:Number(after.bavail)*Number(after.bsize)-Number(before.bavail)*Number(before.bsize)};
 writeJob(file,{stagingRetirement:receipt});return {...status,retired:true,...receipt};
}
function inventoryStorage(root,{home,installation,retire=false,artifactRoots=[]}={}){
 if(!Array.isArray(artifactRoots)||artifactRoots.length>32||artifactRoots.some(value=>typeof value!=='string'||!path.isAbsolute(value)))throw Error('Specify at most 32 absolute artifact roots for dry-run accounting.');
 ordinaryDirectory(root);const jobs=[],errors=[],retired=[];
 const directory=path.join(root,'jobs');ordinaryDirectory(directory,root);let names=[];
 try{names=fs.readdirSync(directory);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(names.length>1000)throw Error('Update storage inventory exceeds 1,000 jobs; inspect the retained journals.');
 for(const name of names){
  const file=path.join(directory,name,'job.json');
  try{ordinaryDirectory(path.dirname(file),directory);if(fs.lstatSync(file).isSymbolicLink())throw Error('Update journals must not be symbolic links.');const job=readJob(file);if(job.home!==home||job.installation!==installation)throw Error('Update storage belongs to a different installation.');const status=stagingStatus(job);jobs.push({id:job.id,phase:job.phase,...status,...allocation(status.directory),packageHash:job.candidate.hash,sourceFingerprint:job.candidate.sourceFingerprint});if(retire&&status.eligible)retired.push(retireStaging(file));}
  catch(error){errors.push({job:name,error:error.message});}
 }
 let recoveries=[];try{const policy=recoveryPolicy(path.join(root,'recovery-policy.json'),{home,installation});recoveries=policy.generations.map(row=>({id:row.id,directory:row.directory,verified:row.verified,eligible:row.eligible,...allocation(row.directory)}));}catch(error){if(error.code!=='ENOENT')errors.push({error:error.message});}
 const artifacts=[...new Set(artifactRoots.map(value=>path.resolve(value)))].map(directory=>({directory,role:'operator-specified artifact root',...allocation(directory)}));
 const sum=rows=>rows.reduce((total,row)=>({logicalBytes:total.logicalBytes+row.logicalBytes,allocatedBytes:total.allocatedBytes+row.allocatedBytes,files:total.files+row.files}),{logicalBytes:0,allocatedBytes:0,files:0});
 const duplicateCandidates=Object.entries(Object.groupBy(jobs.filter(row=>row.files>0&&row.packageHash),row=>row.packageHash)).filter(([,rows])=>rows.length>1).map(([packageHash,rows])=>({packageHash,jobs:rows.map(row=>row.id),logicalBytes:sum(rows).logicalBytes}));
 return {schemaVersion:1,at:new Date().toISOString(),dryRun:!retire,jobs,recoveries,artifacts,duplicateCandidates,totals:{candidateStaging:sum(jobs),recoveryGenerations:sum(recoveries),artifactRoots:sum(artifacts)},retired,errors,note:'Listed allocation may overlap roots or share filesystem extents; totals describe the pre-retirement inventory. Only bound completed/cancelled candidate staging can retire. Recovery generations and supplied external artifact roots are read-only; unregistered roots are not discovered automatically.'};
}
module.exports={copyRecovery,allocation,stagingStatus,retireStaging,inventoryStorage};
