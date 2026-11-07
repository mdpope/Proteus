import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// An old package may carry only a short Git revision. Publication can bind its
// full immutable commit only after every recorded runtime/build input matches it.
export function releaseSourceCommit(source,{commit,checkout,git=execFileSync,windowsTerminalBuild,compilerHash}={}){
 if(!commit)return source.sourceCommit;
 const windows=source.platform==='win32'&&source.arch==='x64';
 const fullWindowsPin=windows&&source.sourceCommit===commit;
 const shortPin=typeof source.gitHead==='string'&&/^[a-f0-9]{7,64}$/.test(source.gitHead)&&commit.startsWith(source.gitHead);
 const matchingRevision=source.gitHead===undefined?fullWindowsPin:shortPin;
 if(!/^[a-f0-9]{40,64}$/.test(commit)||source.dirty||source.sourceCommit&&source.sourceCommit!==commit||!matchingRevision)throw Error('The source pin does not match the clean packaged revision.');
 const resolved=git('git',['rev-parse','--verify',commit+'^{commit}'],{cwd:checkout,encoding:'utf8'}).trim();
 if(resolved!==commit)throw Error('Use the complete immutable source commit.');
 for(const group of ['runtimeFiles','buildInputs']){
  const entries=Object.entries(source[group]||{});if(!entries.length)throw Error('The package has no recorded '+group+'.');
  for(const [name,expected] of entries){
   if(!/^[a-f0-9]{64}$/.test(expected)||name.startsWith('/')||name.split('/').includes('..'))throw Error('Invalid packaged source entry.');
   if(windows&&group==='runtimeFiles'&&name==='desktop/terminal/windows-terminal-guardian.exe'){
    const receipt=windowsTerminalBuild;
    if(!receipt||receipt.output!==name||receipt.testOnlyJobFailureSeam!==false||receipt.helperSha256!==expected||!/^[a-f0-9]{64}$/.test(compilerHash||'')||receipt.compilerSha256!==compilerHash||!/^[a-f0-9]{64}$/.test(receipt.sourceSha256||'')||receipt.sourceSha256!==source.buildInputs?.['native/windows-terminal/guardian.cs']||!['scripts/package-windows.mjs','scripts/build-windows-terminal-guardian.mjs','scripts/prepare-windows-terminal.mjs'].every(file=>source.buildInputs?.[file]))throw Error('The generated Windows helper requires its verified compiler/source/output receipt.');
    continue;
   }
   const bytes=git('git',['show',commit+':'+name],{cwd:checkout,maxBuffer:64*1024*1024});
   if(!sourceBytesMatch(bytes,expected,{windows}))throw Error('The source pin differs from packaged input: '+name);
  }
 }
 return commit;
}

// Windows Git checkouts and copied terminal licenses can differ solely in line endings.
// Prove either exact byte representation; never normalize arbitrary binary data.
export function sourceBytesMatch(bytes,expected,{windows=false}={}){
 const hash=value=>createHash('sha256').update(value).digest('hex');
 if(hash(bytes)===expected)return true;
 if(!windows||bytes.includes(0))return false;
 let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{return false;}
 const lf=text.replace(/\r\n/g,'\n');
 return hash(Buffer.from(lf))===expected||hash(Buffer.from(lf.replace(/\n/g,'\r\n')))===expected;
}
