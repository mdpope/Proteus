// Corresponding source comes from a checkout, never a runtime home. Native
// generated inputs require an explicit, verified accepted-package provenance.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {validateProvenance} from '../desktop/updates/build-provenance.cjs';
const roots=['.github/','desktop/','public/','src/','schemas/','templates/','relay/','scripts/','native/','ios/','web/','test/','docs/'];
const top=new Set(['package.json','package-lock.json','README.md','AGENTS.md','CHANGELOG.md','.gitignore']);
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const allowed=file=>typeof file==='string'&&!path.posix.isAbsolute(file)&&!file.includes('\\')&&!file.split('/').some(part=>!part||part==='..'||part==='.')&&(top.has(file)||roots.some(prefix=>file.startsWith(prefix)))&&!/(^|\/)\.env(?!\.example$)/.test(file)&&!/(^|\/)(vendor|node_modules|storage|DerivedData|xcuserdata)(\/|$)/.test(file);
function sourceFile(root,file){
 if(!allowed(file))throw Error('Unsupported source entry: '+file);
 const source=path.join(root,file);
 if(!fs.lstatSync(source).isFile()||path.relative(fs.realpathSync(source),source)!=='')throw Error('Unsupported source entry: '+file);
 return source;
}
export function sourceFiles(root,{provenance}={}){
 root=fs.realpathSync(root);
 const candidates=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).split('\0').filter(allowed);
 const files=new Set(candidates.filter(file=>fs.existsSync(path.join(root,file)))),generated=[];
 if(provenance){
  validateProvenance(provenance);
  const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  if(provenance.sourceCommit&&provenance.sourceCommit!==head||provenance.gitHead&&!head.startsWith(provenance.gitHead)||provenance.dirty===true)throw Error('Accepted provenance differs from the source checkout.');
  for(const [file,expected] of Object.entries({...provenance.runtimeFiles,...provenance.buildInputs})){
   if(digest(sourceFile(root,file))!==expected)throw Error('Accepted input differs: '+file);
   if(!files.has(file))generated.push(file);
   files.add(file);
  }
 }
 for(const file of files)sourceFile(root,file);
 return {files:[...files].sort(),generated:generated.sort()};
}
export async function packageSource({root=path.resolve(import.meta.dirname,'..'),output,provenance}={}){
 root=fs.realpathSync(root);
 const tar=createRequire(path.join(root,'package.json'))('tar');
 const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
 const selection=sourceFiles(root,{provenance});
 output=output||path.join(root,'dist','combined-update-source');
 if(!path.isAbsolute(output))throw Error('Use an absolute source output directory.');
 fs.mkdirSync(output,{recursive:true});
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-source-'));
 const name='Proteus-'+version+'-source',destination=path.join(temporary,name);
 try{
  const manifest={version,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),...(provenance?{nativeSourceFingerprint:provenance.sourceFingerprint,generatedRuntimeFiles:selection.generated}:{}),files:{}};
  for(const file of selection.files){
   const source=sourceFile(root,file),target=path.join(destination,file);
   fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);manifest.files[file]=digest(target);
  }
  // Bind archived native inputs without normalizing line endings or changing
  // the accepted application, including its recorded generated runtime.
  if(provenance)for(const [file,expected] of Object.entries({...provenance.runtimeFiles,...provenance.buildInputs}))if(manifest.files[file]!==expected||digest(sourceFile(root,file))!==expected)throw Error('Accepted input changed during source export: '+file);
  fs.writeFileSync(path.join(destination,'SOURCE-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
  const archive=path.join(output,name+'.tar.gz');if(fs.existsSync(archive))throw Error('Source archive already exists; reconcile before retry.');
  await tar.c({gzip:true,portable:true,cwd:temporary,file:archive},[name]);
  const sha256=digest(archive);fs.writeFileSync(archive+'.sha256',sha256+'  '+path.basename(archive)+'\n');
  return {archive,sha256,files:Object.keys(manifest.files).length,sourceCommit:manifest.sourceCommit,...(provenance?{nativeSourceFingerprint:provenance.sourceFingerprint,generatedRuntimeFiles:selection.generated}:{})};
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const {values}=parseArgs({options:{root:{type:'string'},output:{type:'string'},provenance:{type:'string'}}});
 const provenance=values.provenance?JSON.parse(fs.readFileSync(values.provenance,'utf8')):undefined;
 console.log(JSON.stringify(await packageSource({root:values.root,output:values.output,provenance})));
}
