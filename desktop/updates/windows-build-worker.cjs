const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {atomic}=require('./update-package.cjs'),{readPolicy,prepareBuildEnvironment,repository}=require('./windows-builder.cjs');
const file=process.argv[2];let job;
try{
 if(process.platform!=='win32'||!path.isAbsolute(file||''))throw Error('Windows builder requires its bound journal.');
 job=JSON.parse(fs.readFileSync(file,'utf8'));const directory=path.join(job.root,'builds',job.operationId);
 if(file!==path.join(directory,'job.json'))throw Error('Invalid build journal path.');
 job={...job,phase:'running',pid:process.pid};atomic(file,job);
 const policy=readPolicy(job.root),source=path.join(directory,'source'),output=path.join(directory,'artifacts'),env=prepareBuildEnvironment(policy,directory);
 const run=(executable,args)=>{const result=spawnSync(executable,args,{env,encoding:'utf8',windowsHide:true,shell:false,maxBuffer:16*1024*1024});if(result.error)throw result.error;if(result.status!==0)throw Error('Build prerequisite failed: '+(result.stderr||result.stdout).slice(-4000));return result.stdout.trim();};
 if(run(policy.git,['-C',policy.source,'remote','get-url','origin'])!==repository)throw Error('The configured source repository route changed.');
 const found=spawnSync(policy.git,['-C',policy.source,'cat-file','-e',job.sourceCommit+'^{commit}'],{env,windowsHide:true,stdio:'ignore'});
 if(found.status!==0)run(policy.git,['-C',policy.source,'fetch','--no-tags','origin',job.sourceCommit]);
 run(policy.git,['clone','--shared','--no-checkout',policy.source,source]);run(policy.git,['-C',source,'checkout','--detach',job.sourceCommit]);
 if(JSON.parse(fs.readFileSync(path.join(source,'package.json'),'utf8')).version!==job.version)throw Error('Requested version differs from the exact source commit.');
 run(policy.node,[policy.npmCli,'ci','--prefix',source]);
 const result=run(policy.node,[path.join(source,'scripts','windows-distribution.mjs'),'--source-commit',job.sourceCommit,'--output',output,'--channel',job.channel,'--build-if-missing','--npm-cli',policy.npmCli,'--key',policy.publisherKey,'--dependencies-ready']);
 const receipt=JSON.parse(result);atomic(file,{...job,phase:'complete',completedAt:new Date().toISOString(),result:receipt,published:receipt.resolution==='published',installed:false});
}catch(error){if(job)atomic(file,{...job,phase:'attention',error:error.message});console.error(error.message);process.exitCode=1;}
