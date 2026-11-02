import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// An old package may carry only a short Git revision. Publication can bind its
// full immutable commit only after every recorded runtime/build input matches it.
export function releaseSourceCommit(source,{commit,checkout,git=execFileSync}={}){
 if(!commit)return source.sourceCommit;
 if(!/^[a-f0-9]{40,64}$/.test(commit)||source.dirty||source.sourceCommit&&source.sourceCommit!==commit||!source.gitHead||!commit.startsWith(source.gitHead))throw Error('The source pin does not match the clean packaged revision.');
 const resolved=git('git',['rev-parse','--verify',commit+'^{commit}'],{cwd:checkout,encoding:'utf8'}).trim();
 if(resolved!==commit)throw Error('Use the complete immutable source commit.');
 for(const group of ['runtimeFiles','buildInputs']){
  const entries=Object.entries(source[group]||{});if(!entries.length)throw Error('The package has no recorded '+group+'.');
  for(const [name,expected] of entries){
   if(!/^[a-f0-9]{64}$/.test(expected)||name.startsWith('/')||name.split('/').includes('..'))throw Error('Invalid packaged source entry.');
   const bytes=git('git',['show',commit+':'+name],{cwd:checkout,maxBuffer:64*1024*1024});
   if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('The source pin differs from packaged input: '+name);
  }
 }
 return commit;
}
