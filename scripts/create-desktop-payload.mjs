// Native builders export an unsigned description of immutable accepted artifacts.
// This file is not an installable release and conveys no publisher authority.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import packages from '../desktop/updates/update-package.cjs';
import {validateReleasePayload,windowsReleaseOrigin} from '../src/services/updates/desktop-releases.js';
import {desktopReleaseId} from './release-identity.mjs';
import {releaseSourceCommit} from './release-source.mjs';
export function desktopPayload({candidate,artifact,installer,sourceCommit,channel='stable',platform=process.platform,arch=process.arch,now=Date.now()}){
 if(!/^[a-f0-9]{40,64}$/.test(sourceCommit||''))throw Error('Pin the complete accepted source commit.');
 const id=desktopReleaseId(candidate,platform,arch),prefix='/downloads/proteus/releases/'+id+'/';
 const value={schemaVersion:1,product:'org.proteusapp.proteus.desktop',id,channel,platform,arch,version:candidate.version,buildRevision:candidate.buildRevision,sourceFingerprint:candidate.sourceFingerprint,packageHash:candidate.hash,sourceCommit,publishedAt:new Date(now).toISOString(),expiresAt:new Date(now+90*86400000).toISOString(),distribution:{kind:'static',origin:windowsReleaseOrigin},artifact:{format:'tar.gz',filename:artifact.filename,bytes:artifact.bytes,unpackedBytes:candidate.bytes,sha256:artifact.sha256,path:prefix+artifact.filename}};
 if(platform==='win32')value.installer={...installer,path:prefix+installer?.filename,authenticode:'unsigned'};
 return validateReleasePayload(value,{platform,arch,channel,now});
}
export function exportDesktopPayload({bundle,archive,installer,sourceCommit,channel='stable',output}){
 for(const file of [bundle,archive,output])if(!path.isAbsolute(file||''))throw Error('Use absolute package/archive/output paths.');
 const checkout=fs.realpathSync(fileURLToPath(new URL('..',import.meta.url))),candidate=packages.inspectPackage(bundle);
 const source=JSON.parse(fs.readFileSync(path.join(packages.packagePaths(candidate.bundle).root,'build-source.json'),'utf8'));
 const windowsProof=source.platform==='win32'&&process.platform==='win32'?{windowsTerminalBuild:JSON.parse(fs.readFileSync(path.join(path.dirname(candidate.bundle),'windows-terminal-build.json'),'utf8')),compilerHash:packages.fileDigest(path.join(process.env.SystemRoot||'C:/Windows','Microsoft.NET/Framework64/v4.0.30319/csc.exe'))}:{};
 const pin=releaseSourceCommit(source,{commit:sourceCommit,checkout,...windowsProof});
 const artifact={filename:path.basename(archive),bytes:fs.statSync(archive).size,sha256:packages.fileDigest(archive)};
 let setup;if(process.platform==='win32'){
  if(!path.isAbsolute(installer||'')||packages.fileDigest(installer)!==candidate.installer?.sha256)throw Error('Use the exact accepted installer.');
  setup={filename:path.basename(installer),bytes:fs.statSync(installer).size,sha256:candidate.installer.sha256};
 }
 const value=desktopPayload({candidate,artifact,installer:setup,sourceCommit:pin,channel}),bytes=Buffer.from(JSON.stringify(value));
 fs.writeFileSync(output,bytes,{flag:'wx',mode:0o600});return {id:value.id,payload:output,sha256:packages.digest(bytes),bytes:bytes.length,sourceCommit:pin,signed:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const {values}=parseArgs({options:Object.fromEntries(['bundle','archive','installer','source-commit','channel','out'].map(k=>[k,{type:'string'}]))});
 console.log(JSON.stringify(exportDesktopPayload({bundle:values.bundle,archive:values.archive,installer:values.installer,sourceCommit:values['source-commit'],channel:values.channel,output:values.out})));
}
