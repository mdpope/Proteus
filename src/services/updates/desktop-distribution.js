import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {stageDesktopRelease} from './desktop-release-staging.js';

/** Assemble one upload allowlist from already signed platform packages. Nothing
 * is published here, and private source, keys and build receipts never enter it. */
export function stageDesktopDistribution(inputs,output,verification={},metadata={}){
 if(!Array.isArray(inputs)||!inputs.length||inputs.length>12||!path.isAbsolute(output||''))throw Error('Supply signed release folders and a new absolute distribution folder.');
 if(fs.existsSync(output))throw Error('Distribution staging already exists. Inspect it before replacing anything.');
 const temporary=fs.mkdtempSync(path.join(path.dirname(output),'.proteus-distribution-'));
 const combined=path.join(temporary,'public');fs.mkdirSync(combined);
 const targets=new Set(),paths=new Set(),releases=[],files=[];let version,origin;
 try{
  for(const [index,input] of inputs.entries()){
   const directory=path.join(temporary,String(index)),staged=stageDesktopRelease(input,directory,verification);
   const envelope=JSON.parse(fs.readFileSync(path.join(input,'release.json'),'utf8'));
   const release=JSON.parse(Buffer.from(envelope.payload,'base64url').toString('utf8'));
   const target=release.platform+'-'+release.arch;
   if(targets.has(target))throw Error('Only one release per platform/architecture may be staged.');
   if(version&&version!==release.version)throw Error('A distribution set must contain one release version.');
   targets.add(target);version=release.version;origin=staged.origin;
   releases.push({platform:release.platform,arch:release.arch,version:release.version,buildRevision:release.buildRevision,
    updateRelease:{channel:release.channel,releaseId:release.id,manifestDigest:createHash('sha256').update(JSON.stringify(envelope)).digest('hex')}});
   for(const row of staged.files){
    if(paths.has(row.path))throw Error('Distribution releases contain conflicting public paths.');
    paths.add(row.path);const destination=path.join(combined,row.path);fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.copyFileSync(path.join(directory,row.path),destination,fs.constants.COPYFILE_EXCL);files.push(row);
   }
  }
  if(metadata.version&&metadata.version!==version)throw Error('The named release and signed package versions differ.');
  // Missing native packages deliberately have empty catalogs. An old platform
  // package must not remain advertised after a new named version is published.
  const base=path.join(combined,'downloads/proteus');
  for(const platform of ['darwin','linux','win32'])for(const arch of ['arm64','x64'])for(const channel of ['stable','preview']){
   const relative='downloads/proteus/'+channel+'/'+platform+'-'+arch+'.json';
   if(paths.has(relative))continue;
   const file=path.join(combined,relative),bytes=Buffer.from(JSON.stringify({schemaVersion:1,releases:[]},null,2)+'\n');
   fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});
   files.push({path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  const current={schemaVersion:1,product:'org.proteusapp.proteus.desktop',name:metadata.name||'Proteus '+version,version,
   targets:releases.map(release=>({platform:release.platform,arch:release.arch,...release.updateRelease}))};
  const currentBytes=Buffer.from(JSON.stringify(current,null,2)+'\n');fs.writeFileSync(path.join(base,'current.json'),currentBytes,{flag:'wx'});
  files.push({path:'downloads/proteus/current.json',bytes:currentBytes.length,sha256:createHash('sha256').update(currentBytes).digest('hex')});
  for(const [platform,label,folder] of [['darwin','macOS','mac'],['linux','Linux','linux'],['win32','Windows','windows']]){
   for(const arch of ['arm64','x64']){
    const relative='downloads/proteus/'+folder+'/'+arch+'/index.html';if(paths.has(relative))continue;
    const file=path.join(combined,relative),bytes=Buffer.from('<!doctype html><html lang="en"><meta charset="utf-8"><title>Proteus '+version+' for '+label+'</title><h1>Proteus '+version+' for '+label+' '+arch+'</h1><p>The current release package for this target is not published yet. Consumer machines wait for the verified native package.</p><a href="/downloads/proteus/current.json">Current release</a></html>');
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});files.push({path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
   }
   const relative='downloads/proteus/'+folder+'/index.html',bytes=Buffer.from('<!doctype html><html lang="en"><meta charset="utf-8"><title>Proteus for '+label+'</title><h1>Proteus '+version+' for '+label+'</h1><p><a href="./arm64/">ARM64</a> · <a href="./x64/">x64</a></p></html>');
   fs.writeFileSync(path.join(combined,relative),bytes,{flag:'wx'});files.push({path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  if(fs.existsSync(output))throw Error('Distribution staging already exists. Inspect it before replacing anything.');
  fs.renameSync(combined,output);
  return {schemaVersion:1,origin,version,releases,files:files.sort((a,b)=>a.path.localeCompare(b.path)),
   publicationOrder:['immutable release files','platform catalogs and current.json','download pages','verify then retire superseded release directories'],published:false};
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
