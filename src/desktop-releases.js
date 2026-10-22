import {atomicRename} from './atomic-rename.cjs';
import fs from 'node:fs';
import path from 'node:path';
import {createPublicKey,createHash,randomUUID,verify} from 'node:crypto';
import {x as extractTar,t as listTar} from 'tar';
import packages from '../desktop/update-package.cjs';

const trust=JSON.parse(fs.readFileSync(new URL('../desktop/release-keys.json',import.meta.url),'utf8'));
export const releaseLimits={archiveBytes:2*1024**3,unpackedBytes:8*1024**3,entries:200000};
export function verifyRelease(envelope,{platform=process.platform,arch=process.arch,channel='stable',now=Date.now(),keys=trust.keys}={}){
 if(!envelope||envelope.schemaVersion!==1||typeof envelope.payload!=='string'||envelope.payload.length>65536||typeof envelope.signature!=='string'||envelope.signature.length>256)throw Error('The release manifest is invalid.');
 const key=keys.find(key=>key.id===envelope.keyId);if(!key)throw Error('This release publisher key is not trusted by the installed app.');
 const bytes=Buffer.from(envelope.payload,'base64url');
 if(!verify(null,bytes,createPublicKey(key.publicKey),Buffer.from(envelope.signature,'base64url')))throw Error('The release signature is invalid.');
 const value=JSON.parse(bytes.toString('utf8'));
 if(value.schemaVersion!==1||value.product!=='org.proteusapp.proteus.desktop'||value.platform!==platform||value.arch!==arch||value.channel!==channel||!['stable','preview'].includes(channel))throw Error('This release targets a different product, platform, architecture or channel.');
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(value.id||'')||!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(value.version||'')||!value.buildRevision||!/^[a-f0-9]{64}$/.test(value.sourceFingerprint||'')||!/^[a-f0-9]{64}$/.test(value.packageHash||''))throw Error('The signed release identity is incomplete.');
 const published=Date.parse(value.publishedAt),expires=Date.parse(value.expiresAt);
 if(!Number.isFinite(published)||!Number.isFinite(expires)||published>now+300000||expires<=now||expires<=published||expires-published>366*86400000)throw Error('The release manifest is expired or has invalid publication dates.');
 const a=value.artifact;
 if(!a||a.format!=='tar.gz'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}\.tar\.gz$/.test(a.filename||'')||!Number.isSafeInteger(a.bytes)||a.bytes<1||a.bytes>releaseLimits.archiveBytes||!Number.isSafeInteger(a.unpackedBytes)||a.unpackedBytes<1||a.unpackedBytes>releaseLimits.unpackedBytes||!/^[a-f0-9]{64}$/.test(a.sha256||'')||a.path!=='/api/v1/app/releases/'+value.id+'/artifact')throw Error('The signed release artifact is invalid.');
 const installer=value.installer;
 if(platform==='win32'&&(!installer||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}\.exe$/.test(installer.filename||'')||!Number.isSafeInteger(installer.bytes)||installer.bytes<1||installer.bytes>releaseLimits.archiveBytes||!/^[a-f0-9]{64}$/.test(installer.sha256||'')||installer.path!=='/api/v1/app/releases/'+value.id+'/installer'))throw Error('The signed Windows installer is invalid.');
 return {...value,verification:{keyId:key.id,signatureVerified:true}};
}

export async function extractRelease(file,destination,release){
 const info=fs.lstatSync(file);
 if(!info.isFile()||info.size!==release.artifact.bytes||packages.fileDigest(file)!==release.artifact.sha256)throw Error('The downloaded release is incomplete or its checksum differs from the signed manifest.');
 if(fs.existsSync(destination))throw Error('Use a new private release staging directory.');
 fs.mkdirSync(destination,{mode:0o700});let size=0,count=0;const names=new Set();
 try{
  // Validate the complete archive before any files or links are written. tar invokes
  // filters from stream callbacks, so abort through its error event instead of throwing.
  await listTar({file,strict:true,
   filter:function(name,entry){
    try{
    const parts=name.replace(/^\.\//,'').split('/');
    if(path.posix.isAbsolute(name)||name.includes('\\')||name.includes('\0')||parts.some(part=>part==='..'||part.includes(':'))||!['File','OldFile','Directory','SymbolicLink','Link'].includes(entry.type))throw Error('The release contains an unsafe archive entry.');
    if(release.platform==='win32'&&parts.some(part=>part!=='.'&&(/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)||/[. ]$/.test(part))))throw Error('The release contains an unsafe Windows filename.');
    const canonical=path.posix.normalize(name).replace(/\/$/,''),key=release.platform==='win32'?canonical.toLowerCase():canonical;
    if(names.has(key))throw Error('The release contains duplicate archive entries.');names.add(key);
    if(++count>releaseLimits.entries||(size+=entry.size||0)>release.artifact.unpackedBytes)throw Error('The release exceeds its signed extraction limit.');
    if(['SymbolicLink','Link'].includes(entry.type)){
     if(release.platform==='win32')throw Error('Windows releases cannot contain filesystem links.');
     const target=entry.linkpath||'',base=entry.type==='Link'?'.':path.posix.dirname(canonical),resolved=path.posix.normalize(path.posix.join(base,target));
     if(path.posix.isAbsolute(target)||target.includes('\\')||resolved==='..'||resolved.startsWith('../'))throw Error('The release link escapes its staged application.');
    }
    return true;
    }catch(error){this.abort(error);return false;}
   }});
  await extractTar({file,cwd:destination,strict:true,preservePaths:false,preserveOwner:false});
  const candidate=packages.inspectPackage(destination,{platform:release.platform});
  if(candidate.hash!==release.packageHash||candidate.version!==release.version||candidate.buildRevision!==release.buildRevision||candidate.sourceFingerprint!==release.sourceFingerprint)throw Error('The extracted application differs from its signed release identity.');
  if(release.platform==='win32'&&!candidate.installer)throw Error('The Windows release omits its registered installer.');
  if(release.platform==='win32'&&(candidate.installer.sha256!==release.installer.sha256||fs.statSync(path.join(destination,candidate.installer.name)).size!==release.installer.bytes))throw Error('The cached Windows installer differs from its signed release identity.');
  return candidate;
 }catch(error){fs.rmSync(destination,{recursive:true,force:true});throw error;}
}

export async function saveReleaseResponse(response,file,release){
 if(!response.ok||!response.body)throw Error('The release download failed.');
 if(fs.existsSync(file))throw Error('The release download destination already exists.');
 const expected=release.artifact,declared=response.headers.get('content-length');
 if(declared!==null&&Number(declared)!==expected.bytes)throw Error('The release download size differs from the signed manifest.');
 const temporary=file+'.'+randomUUID()+'.partial';let fd,size=0;
 try{
  fd=fs.openSync(temporary,'wx',0o600);const hash=createHash('sha256');
  for await(const chunk of response.body){size+=chunk.length;if(size>expected.bytes)throw Error('The release download exceeds its signed size.');hash.update(chunk);fs.writeFileSync(fd,chunk);}
  if(size!==expected.bytes||hash.digest('hex')!==expected.sha256)throw Error('The release download is incomplete or its checksum differs from the signed manifest.');
  fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;atomicRename(temporary,file);return {bytes:size};
 }finally{if(fd!==undefined)fs.closeSync(fd);fs.rmSync(temporary,{force:true});}
}

export const releaseOrigin=trust.origin;
