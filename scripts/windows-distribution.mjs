// Run on the designated Windows builder. Consumers use the signed owner updater.
// Resolve first; network/signature errors stop rather than starting a build.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {spawn,execFileSync} from 'node:child_process';
import {DesktopReleaseFeed} from '../src/services/updates/desktop-release-feed.js';
import {verifyRelease,extractRelease} from '../src/services/updates/desktop-releases.js';
import packages from '../desktop/updates/update-package.cjs';
import {ensurePrivateHome} from '../src/shared/private-paths.cjs';

export async function findPublishedWindows({version,sourceCommit,channel='stable',feed=new DesktopReleaseFeed(),verify=verifyRelease}){
 if(!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(version||'')||!/^[a-f0-9]{40,64}$/.test(sourceCommit||''))throw Error('Specify the exact version and source commit.');
 const envelopes=await feed.releases({platform:'win32',arch:'x64',channel});
 const releases=envelopes.map(envelope=>({...verify(envelope,{platform:'win32',arch:'x64',channel}),manifestDigest:packages.digest(JSON.stringify(envelope))}));
 const matches=releases.filter(row=>row.version===version&&row.sourceCommit===sourceCommit);
 if(matches.length>1)throw Error('Multiple builds match this source; choose an exact signed release before proceeding.');
 return matches[0]||null;
}
export async function buildWindowsDistribution(argv){
 const {values}=parseArgs({args:argv,options:{'source-commit':{type:'string'},output:{type:'string'},channel:{type:'string',default:'stable'},'build-if-missing':{type:'boolean'},key:{type:'string'},'npm-cli':{type:'string'},'dependencies-ready':{type:'boolean'}}});
 if(values.key)throw Error('Builders cannot sign. Return accepted unsigned payloads to Build Mac.');
 if(process.platform!=='win32'||process.arch!=='x64')throw Error('Run native distribution on the designated Windows x64 build machine.');
 const root=fs.realpathSync(fileURLToPath(new URL('..',import.meta.url))),metadata=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 const sourceCommit=values['source-commit'];
 if(git('rev-parse','HEAD')!==sourceCommit)throw Error('Checkout differs from the requested source commit.');
 const published=await findPublishedWindows({version:metadata.version,sourceCommit,channel:values.channel});
 if(published)return {resolution:'published',release:published,buildStarted:false};
 if(!values['build-if-missing'])return {resolution:'build-required',version:metadata.version,sourceCommit,buildStarted:false};
 if(git('status','--porcelain','--untracked-files=normal'))throw Error('Use a clean source checkout before creating a new Windows release.');
 if(!path.isAbsolute(values.output||''))throw Error('Supply a new absolute private --output directory outside the checkout.');
 const output=path.resolve(values.output);if(output===root||output.startsWith(root+path.sep)||root.startsWith(output+path.sep))throw Error('Release output must be separate from source.');
 if(fs.existsSync(output)&&fs.readdirSync(output).length)throw Error('Output already contains an operation. Inspect its receipt before retrying.');
 ensurePrivateHome(output);
 const receiptFile=path.join(output,'distribution.json'),receipt={schemaVersion:1,sourceCommit,version:metadata.version,channel:values.channel,startedAt:new Date().toISOString(),resolution:'build-required',buildStarted:true,checks:[]};
 const record=(phase,extra={})=>{Object.assign(receipt,{phase,...extra});packages.atomic(receiptFile,receipt);};
 const env={...process.env,PROTEUS_PACKAGE_OUTPUT:path.join(output,'package'),PROTEUS_RELEASE_SOURCE_COMMIT:sourceCommit};
 const run=async(label,file,args)=>{
  record(label);const log=path.join(output,label+'.log'),fd=fs.openSync(log,'wx',0o600);
  try{await new Promise((resolve,reject)=>{const child=spawn(file,args,{cwd:root,env,windowsHide:true,shell:false,stdio:['ignore',fd,fd]});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(label+' failed with exit '+code+'; see '+log)));});receipt.checks.push({name:label,passed:true,log});}
  finally{fs.closeSync(fd);}
 };
 try{
  const npmCmd=values['npm-cli']||path.join(path.dirname(execFileSync(path.join(process.env.SystemRoot,'System32','where.exe'),['npm.cmd'],{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/)[0]),'node_modules','npm','bin','npm-cli.js');
  if(!path.isAbsolute(npmCmd)||!fs.statSync(npmCmd).isFile())throw Error('A local Node/npm build toolchain is required on the designated builder.');
  if(!values['dependencies-ready'])await run('dependencies',process.execPath,[npmCmd,'ci']);
  await run('electron-runtime',process.execPath,['scripts/prepare-electron.mjs']);
  await run('source-tests',process.execPath,['--test','--test-timeout=120000','--test-concurrency=4',...fs.readdirSync(path.join(root,'test')).filter(name=>name.endsWith('.test.js')).sort().map(name=>'test/'+name)]);
  await run('static-checks',process.execPath,[npmCmd,'run','check']);
  await run('package',process.execPath,[npmCmd,'run','package:windows']);
  const bundle=path.join(output,'package','win-unpacked'),candidate=packages.inspectPackage(bundle),names=fs.readdirSync(path.dirname(bundle));
  const installer=names.filter(name=>name.endsWith('-setup.exe')),archives=names.filter(name=>name.endsWith('-update.tar.gz'));
  if(installer.length!==1||archives.length!==1)throw Error('Build did not produce one exact installer and archive.');
  const archive=path.join(output,'package',archives[0]),setup=path.join(output,'package',installer[0]);
  if(packages.fileDigest(setup)!==candidate.installer?.sha256)throw Error('Cached installer differs from the release installer.');
  // Test an official extraction, keeping the original release bytes immutable.
  const extracted=path.join(output,'acceptance'),artifact={bytes:fs.statSync(archive).size,unpackedBytes:candidate.bytes,sha256:packages.fileDigest(archive)};
  await extractRelease(archive,extracted,{platform:'win32',version:candidate.version,buildRevision:candidate.buildRevision,sourceFingerprint:candidate.sourceFingerprint,packageHash:candidate.hash,artifact,installer:{sha256:candidate.installer.sha256,bytes:fs.statSync(setup).size}});
  receipt.checks.push({name:'official-extractor',passed:true});
  await run('packaged-acceptance',process.execPath,['test/windows-current.mjs',path.join(extracted,'Proteus.exe')]);
  if(packages.inspectPackage(extracted).installationHash!==candidate.installationHash)throw Error('The tested application changed during startup or packaged acceptance; preserve the extraction for inspection.');
  receipt.checks.push({name:'package-unchanged-after-startup',passed:true});
  if(packages.inspectPackage(bundle).installationHash!==candidate.installationHash)throw Error('Frozen application changed during acceptance.');
  receipt.artifacts={bundle,archive,installer:setup,sourceFingerprint:candidate.sourceFingerprint,packageHash:candidate.hash,archiveSha256:artifact.sha256,installerSha256:candidate.installer.sha256};
  receipt.qualification='Source suite and exact extracted package acceptance. Installer/update/rollback behavior requires separate release qualification when its recipe or transition behavior changes; no live registration was touched.';
  // A native builder exports exact accepted bytes; only Build Mac signs them.
  const payload=path.join(output,'package','publisher-payload.json');
  await run('publisher-payload',process.execPath,['scripts/create-desktop-payload.mjs','--bundle',bundle,'--archive',archive,'--installer',setup,'--source-commit',sourceCommit,'--channel',values.channel,'--out',payload]);
  const companion=path.join(output,'package','Proteus-'+metadata.version+'-source.tar.gz');
  await run('source-companion','git',['archive','--format=tar.gz','--output',companion,sourceCommit]);
  receipt.publisher={state:'unsigned-awaiting-authority',payload,payloadSHA256:packages.fileDigest(payload),sourceCommit};
  receipt.artifacts.sourceCompanion={file:companion,sha256:packages.fileDigest(companion),bytes:fs.statSync(companion).size};
  fs.rmSync(extracted,{recursive:true});record('complete',{completedAt:new Date().toISOString(),published:false,installed:false});return receipt;
 }catch(error){record('failed',{error:error.message});throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{console.log(JSON.stringify(await buildWindowsDistribution(process.argv.slice(2)),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
