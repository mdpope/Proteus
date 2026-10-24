const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {atomicRename}=require('../../src/shared/atomic-rename.cjs');
const {validateProvenance}=require('./build-provenance.cjs');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
function fileDigest(file){const hash=crypto.createHash('sha256'),buffer=Buffer.allocUnsafe(1024*1024),fd=fs.openSync(file,'r');try{for(let size;(size=fs.readSync(fd,buffer,0,buffer.length,null))>0;)hash.update(buffer.subarray(0,size));return hash.digest('hex');}finally{fs.closeSync(fd);}}
function atomic(file,value){fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});const tmp=file+'.'+crypto.randomUUID()+'.tmp';const fd=fs.openSync(tmp,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}try{atomicRename(tmp,file);}finally{try{fs.unlinkSync(tmp);}catch{}}}
function recoveryCachePath(relative,prefix=''){
 // Only Chromium's ordinary reproducible caches at known profile roots. In
 // particular, Service Worker/CacheStorage and website storage are retained.
 if(prefix){if(!relative.startsWith(prefix+'/'))return false;relative=relative.slice(prefix.length+1);}
 return /^(?:(?:Partitions\/[^/]+|Default)\/)?(?:Cache|Code Cache|GPUCache|DawnCache|DawnGraphiteCache|DawnWebGPUCache)(?:\/|$)/.test(relative);
}
function treeRows(directory,{exclude=[],excludeRoot=[],recoveryCaches=false,cachePrefix='',runtimePrefix=null}={}){
 // A managed tmux server survives the app so terminals can reconnect. Its Unix
 // socket is a live endpoint, never recoverable data. Apply this exception only
 // to that exact home-relative socket during recovery, retaining ordinary files
 // at the same path and rejecting every other unsupported filesystem entry.
 const socket=typeof runtimePrefix==='string'?(runtimePrefix?runtimePrefix+'/':'')+'terminal-tmux/socket':null;
 const rows=[],walk=relative=>{for(const name of fs.readdirSync(path.join(directory,relative)).sort()){const key=path.posix.join(relative,name);if(exclude.includes(name)||!relative&&excludeRoot.includes(name)||recoveryCaches&&recoveryCachePath(key,cachePrefix))continue;const file=path.join(directory,key),stat=fs.lstatSync(file);if(key===socket&&stat.isSocket())continue;if(stat.isSymbolicLink())rows.push([key,'link',fs.readlinkSync(file)]);else if(stat.isDirectory())walk(key);else if(stat.isFile())rows.push([key,stat.mode&0o777,fileDigest(file),stat.size]);else throw Error('Unsupported recovery filesystem entry: '+key+'. Update snapshots support ordinary files, directories and symbolic links only.');}};walk('');return rows;
}
const summarize=rows=>({hash:digest(JSON.stringify(rows)),bytes:rows.reduce((sum,row)=>sum+(row[3]||0),0),files:rows.length});
function tree(directory,options={}){const rows=treeRows(directory,options);return {...summarize(rows),...(options.entries?{entries:rows}:{})};}
function packagePaths(bundle,platform=process.platform){const mac=platform==='darwin',root=path.join(bundle,mac?'Contents/Resources/app':'resources/app'),metadata=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));return {root,metadata,executable:path.join(bundle,mac?'Contents/MacOS/Proteus':platform==='win32'?'Proteus.exe':'proteus')};}
function inspectPackage(bundle,{platform=process.platform,requireProtocol=true}={}){
 bundle=fs.realpathSync(bundle);const {root,metadata,executable}=packagePaths(bundle,platform);
 if(metadata.name!=='proteus'||metadata.desktopPreview||!fs.statSync(executable).isFile())throw Error('Choose a packaged production Proteus application.');
 if(requireProtocol&&(metadata.updatesProtocol!==1||metadata.dataCompatibility!==1))throw Error('This package does not support compatible supervised update recovery. Install the helper-capable baseline first.');
 const provenance=JSON.parse(fs.readFileSync(path.join(root,'build-source.json'),'utf8'));
 if(!/^[a-f0-9]{64}$/.test(provenance.sourceFingerprint||'')||provenance.buildRevision!==metadata.buildRevision)throw Error('The candidate has no valid source identity.');
 validateProvenance(provenance);
 for(const [relative,hash]of Object.entries(provenance.runtimeFiles||{})){if(path.isAbsolute(relative)||relative.split('/').includes('..')||fileDigest(path.join(root,relative))!==hash)throw Error('The packaged source changed: '+relative);}
 let signing={kind:'sha256',identifier:'proteus'};
 if(platform==='darwin'){
  execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',bundle],{stdio:'pipe'});
  // codesign writes its display data to stderr; use spawnSync to retain it.
  const result=require('node:child_process').spawnSync('/usr/bin/codesign',['-d','--verbose=4',bundle],{encoding:'utf8'});
  if(result.error)throw result.error;if(result.status!==0)throw Error('The application signing identity could not be read.');
  const details=result.stderr||result.stdout;
  const identifier=details.match(/^Identifier=(.+)$/m)?.[1],team=details.match(/^TeamIdentifier=(.+)$/m)?.[1];
  if(!/^[a-zA-Z0-9][a-zA-Z0-9.-]{1,199}$/.test(identifier||'')||!team||team==='not set'||provenance.appBundleId&&provenance.appBundleId!==identifier)throw Error('Supervised Mac updates require a verified, matching non-ad-hoc application identity.');
  signing={kind:'apple',identifier,team};
 }
 let installer;
 if(platform==='win32'){
  if(provenance.platform!=='win32'||provenance.arch!==process.arch)throw Error('The Windows package targets a different platform or architecture.');
  const {setupName}=require('./windows-installation.cjs'),file=path.join(bundle,setupName);
  if(fs.existsSync(file)){if(!fs.lstatSync(file).isFile())throw Error('The Windows installer must be a regular file.');installer={name:setupName,sha256:fileDigest(file)};}
 }
 // Hash the payload once; both identities must describe the same observation.
 const rows=treeRows(bundle),full=summarize(rows),excludedRoot=platform==='win32'?require('./windows-installation.cjs').installationFiles:[];
 const manifest=platform==='win32'?summarize(rows.filter(([name])=>name.includes('/')||!excludedRoot.includes(name))):full;
 return {bundle,executable,version:metadata.version,buildRevision:metadata.buildRevision,sourceFingerprint:provenance.sourceFingerprint,signing,...manifest,bytes:full.bytes,installationHash:full.hash,...(installer?{installer}:{}),...(provenance.platform?{platform:provenance.platform,arch:provenance.arch}:{})};
}
function compatible(current,candidate){if(JSON.stringify(current.signing)!==JSON.stringify(candidate.signing))throw Error('The update must preserve this installation’s signing identity.');if(current.sourceFingerprint===candidate.sourceFingerprint)throw Error('This source is already installed.');}
const excluded=['runner.lock','connection.json','SingletonLock','SingletonCookie','SingletonSocket'];
function copyTree(source,target){fs.cpSync(source,target,{recursive:true,dereference:false,verbatimSymlinks:true,preserveTimestamps:true,filter:file=>!excluded.includes(path.basename(file))});}
function spaceBudget(requests,{stat=fs.statSync,statfs=fs.statfsSync,exists=fs.existsSync,reserve=256*1024*1024}={}){
 const volumes=new Map();
 for(const {directory,bytes}of requests){
  if(!path.isAbsolute(directory)||!Number.isSafeInteger(bytes)||bytes<0)throw Error('Invalid update space budget.');
  let existing=directory;while(!exists(existing)){const parent=path.dirname(existing);if(parent===existing)throw Error('The update volume is unavailable.');existing=parent;}
  const device=String(stat(existing).dev);let volume=volumes.get(device);
  if(!volume){const info=statfs(existing);volume={directory:existing,device,available:Number(info.bavail)*Number(info.bsize),needed:reserve};volumes.set(device,volume);}
  volume.needed+=bytes;
 }
 const result=[...volumes.values()];
 if(result.some(volume=>volume.available<volume.needed))throw Error('There is not enough space on an update or recovery volume for the verified copies and reserve.');
 return result;
}
function readJob(file){if(fs.statSync(file).size>256*1024)throw Error('Update journal exceeds its supported size.');const job=JSON.parse(fs.readFileSync(file,'utf8'));if(job.schemaVersion!==1||!/^[-a-f0-9]{36}$/.test(job.id)||job.file!==file||!path.isAbsolute(job.home)||!path.isAbsolute(job.installation)||job.recoveryRoot!==path.resolve(path.dirname(file),'../../recoveries')||job.recoveryPolicy!==path.resolve(path.dirname(file),'../../recovery-policy.json')||!job.candidate?.bundle?.startsWith(path.join(path.dirname(file),'candidate')+path.sep)||!job.continuationId||!job.secret)throw Error('Invalid update journal; it was preserved.');return job;}
function writeJob(file,changes){const job=readJob(file),next={...job,...changes,revision:job.revision+1,updatedAt:new Date().toISOString()};atomic(file,next);return next;}
function recoveryPolicy(file,{home,installation}){
 const value=JSON.parse(fs.readFileSync(file,'utf8'));
 if(value.schemaVersion!==1||value.home!==home||value.installation!==installation||!value.auditedAt||!Array.isArray(value.generations)||value.generations.length>100)throw Error('The recovery inventory does not match this installation. Preserve it for inspection.');
 for(const row of value.generations)if(!path.isAbsolute(row.directory||'')||!path.isAbsolute(row.receiptFile||'')||!Number.isFinite(Date.parse(row.at))||!row.verified||!/^[a-f0-9]{64}$/.test(row.receiptHash||'')||[home,installation,path.dirname(file)].some(root=>root===row.directory||root.startsWith(row.directory+path.sep)))throw Error('A recovery inventory entry needs inspection before retention can run.');
 return value;
}
module.exports={atomic,digest,fileDigest,tree,packagePaths,inspectPackage,compatible,copyTree,spaceBudget,readJob,writeJob,recoveryPolicy,excluded,recoveryCachePath};
