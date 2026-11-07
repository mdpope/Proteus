import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPrivateKey,createPublicKey,createHash,sign} from 'node:crypto';
import packages from '../desktop/updates/update-package.cjs';
import {hasPrivatePermissions} from '../src/shared/private-paths.cjs';
import {verifyRelease,windowsReleaseOrigin} from '../src/services/updates/desktop-releases.js';
import {desktopReleaseId} from './release-identity.mjs';
import {releaseSourceCommit} from './release-source.mjs';

if(process.platform!=='darwin')throw Error('Publisher signing belongs to Build Mac. Native builders export unsigned payloads.');
const args=process.argv.slice(2),options={};
for(let index=0;index<args.length;index+=2){if(!['--bundle','--archive','--installer','--key','--channel','--out','--source-commit'].includes(args[index])||!args[index+1])throw Error('Use --bundle, --archive, --installer (Windows), --key, --channel, --out and optional --source-commit.');options[args[index].slice(2)]=args[index+1];}
for(const name of ['bundle','archive','key','out'])if(!path.isAbsolute(options[name]||''))throw Error('Use absolute paths for release inputs and output.');
const checkout=fs.realpathSync(fileURLToPath(new URL('..',import.meta.url))),keyRelative=path.relative(checkout,fs.realpathSync(options.key));
const stat=fs.lstatSync(options.key);if(!keyRelative.startsWith('..'+path.sep)&&!path.isAbsolute(keyRelative)||!stat.isFile()||!hasPrivatePermissions(options.key,stat)||stat.size>16384)throw Error('Use a private publisher key outside the source checkout.');
const key=createPrivateKey(fs.readFileSync(options.key));if(key.asymmetricKeyType!=='ed25519')throw Error('Use the existing Ed25519 publisher key.');
const publicKey=createPublicKey(key),keyId=createHash('sha256').update(publicKey.export({type:'spki',format:'der'})).digest('hex').slice(0,24);
const candidate=packages.inspectPackage(options.bundle),archiveInfo=fs.statSync(options.archive),now=Date.now(),id=desktopReleaseId(candidate,process.platform,process.arch);
const release={schemaVersion:1,product:'org.proteusapp.proteus.desktop',id,channel:options.channel||'stable',platform:process.platform,arch:process.arch,version:candidate.version,buildRevision:candidate.buildRevision,sourceFingerprint:candidate.sourceFingerprint,packageHash:candidate.hash,publishedAt:new Date(now).toISOString(),expiresAt:new Date(now+90*86400000).toISOString(),artifact:{format:'tar.gz',filename:path.basename(options.archive),bytes:archiveInfo.size,unpackedBytes:candidate.bytes,sha256:packages.fileDigest(options.archive),path:'/api/v1/app/releases/'+id+'/artifact'}};
const source=JSON.parse(fs.readFileSync(path.join(packages.packagePaths(candidate.bundle).root,'build-source.json'),'utf8'));
const sourceCommit=releaseSourceCommit(source,{commit:options['source-commit'],checkout});
if(sourceCommit){if(!/^[a-f0-9]{40,64}$/.test(sourceCommit))throw Error('Invalid release source commit.');release.sourceCommit=sourceCommit;}
release.distribution={kind:'static',origin:windowsReleaseOrigin};
release.artifact.path='/downloads/proteus/releases/'+id+'/'+release.artifact.filename;
if(process.platform==='win32'){
 if(!path.isAbsolute(options.installer||'')||packages.fileDigest(options.installer)!==candidate.installer?.sha256)throw Error('Supply the exact tested installer cached in this Windows application.');
 release.installer={filename:path.basename(options.installer),bytes:fs.statSync(options.installer).size,sha256:candidate.installer.sha256,path:'/api/v1/app/releases/'+id+'/installer',authenticode:'unsigned'};
 release.distribution={kind:'static',origin:windowsReleaseOrigin};
 release.artifact.path='/downloads/proteus/releases/'+id+'/'+release.artifact.filename;
 release.installer.path='/downloads/proteus/releases/'+id+'/'+release.installer.filename;
}
const payload=Buffer.from(JSON.stringify(release)),envelope={schemaVersion:1,keyId,payload:payload.toString('base64url'),signature:sign(null,payload,key).toString('base64url')};
verifyRelease(envelope,{channel:release.channel});fs.writeFileSync(options.out,JSON.stringify(envelope,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({id,keyId,manifest:options.out,artifactSha256:release.artifact.sha256}));
