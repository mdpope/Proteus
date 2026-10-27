// Local corresponding-source companion. Never collect runtime homes or ignored files.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as tar from 'tar';
const root=path.resolve(import.meta.dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
const output=path.join(root,'dist','combined-update-source');fs.mkdirSync(output,{recursive:true});
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-source-'));
const name='Proteus-'+version+'-source',destination=path.join(temporary,name);
const roots=['.github/','desktop/','public/','src/','schemas/','templates/','relay/','scripts/','ios/','web/','test/','docs/'];
const top=new Set(['package.json','package-lock.json','README.md','AGENTS.md','CHANGELOG.md','.gitignore']);
const candidates=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const files=[...new Set(candidates)].filter(file=>top.has(file)||roots.some(prefix=>file.startsWith(prefix))).sort();
try{
 const manifest={version,files:{}};
 for(const file of files){
  if(/(^|\/)\.env(?!\.example$)/.test(file)||/(^|\/)(vendor|node_modules|storage|DerivedData|xcuserdata)(\/|$)/.test(file))continue;
  const source=path.join(root,file);if(!fs.existsSync(source))continue;if(!fs.lstatSync(source).isFile())throw new Error('Unsupported source entry: '+file);
  const target=path.join(destination,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);manifest.files[file]=createHash('sha256').update(fs.readFileSync(source)).digest('hex');
 }
 fs.writeFileSync(path.join(destination,'SOURCE-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 // Portable tar entries exclude host filesystem metadata/AppleDouble sidecars.
 const archive=path.join(output,name+'.tar.gz');await tar.c({gzip:true,portable:true,cwd:temporary,file:archive},[name]);
 const sha256=createHash('sha256').update(fs.readFileSync(archive)).digest('hex');fs.writeFileSync(archive+'.sha256',sha256+'  '+path.basename(archive)+'\n');console.log(JSON.stringify({archive,sha256,files:Object.keys(manifest.files).length}));
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
