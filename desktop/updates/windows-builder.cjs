// Fixed, installation-bound build operations for the explicitly designated
// first Windows machine. No model-supplied executable, shell or output path.
const fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process');
const {atomic,digest}=require('./update-package.cjs');
const {ensurePrivateHome,hasPrivatePermissions}=require('../../src/shared/private-paths.cjs');
const repository='https://github.com/mdpope/Proteus.git';
const alive=pid=>{try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw error;}};
function buildEnvironment(policy,environment=process.env,platform=process.platform){
 const windows=platform==='win32',paths=windows?path.win32:path,separator=windows?';':path.delimiter;
 const keys=Object.keys(environment).filter(key=>windows?key.toLowerCase()==='path':key==='PATH').sort();
 const entries=[paths.dirname(policy.node),paths.dirname(policy.git),...keys.flatMap(key=>String(environment[key]||'').split(separator))];
 const seen=new Set(),search=entries.filter(entry=>{if(!entry)return false;const key=windows?entry.toLowerCase():entry;if(seen.has(key))return false;seen.add(key);return true;});
 // npm lifecycle scripts resolve node (and Git) by name. Bind their child PATH
 // to the configured toolchain without changing the owner's or system's environment.
 // Windows treats Path/PATH alike, while Node otherwise forwards only one variant.
 return {...Object.fromEntries(Object.entries(environment).filter(([key])=>!keys.includes(key))),PATH:search.join(separator)};
}
function prepareBuildEnvironment(policy,directory,environment=process.env,platform=process.platform){
 const env=buildEnvironment(policy,environment,platform);
 if(platform!=='win32')return env;
 // Electron Builder discovers npm by command name even when our own calls use
 // the absolute CLI. Corepack's cached npm.cmd assumes a different installation
 // layout. Bind only this job's npm command to its configured Node/CLI instead.
 const quote=value=>{if(/["\r\n]/.test(value))throw Error('Configured tool paths cannot be represented by a Windows batch launcher.');return '"'+value.replace(/%/g,'%%')+'"';};
 const command='@echo off\r\nsetlocal DisableDelayedExpansion\r\n'+quote(policy.node)+' '+quote(policy.npmCli)+' %*\r\nexit /b %errorlevel%\r\n';
 const bin=path.join(directory,'toolchain');ensurePrivateHome(bin);
 fs.writeFileSync(path.join(bin,'npm.cmd'),command,{flag:'wx',mode:0o600});
 return {...env,PATH:bin+';'+env.PATH};
}
function readPolicy(root){
 const file=path.join(root,'windows-builder.json');
 if(!fs.existsSync(file))throw Error('This installation is a release consumer. Configure the designated Windows builder once before requesting a source build.');
 if(!hasPrivatePermissions(file)||fs.statSync(file).size>16384)throw Error('Windows builder policy needs inspection.');
 const value=JSON.parse(fs.readFileSync(file,'utf8'));
 if(![1,2].includes(value.schemaVersion)||value.root!==root||value.repository!==repository||!['source','node','npmCli','git'].every(key=>typeof value[key]==='string'&&path.isAbsolute(value[key])))throw Error('Windows builder policy does not match this installation.');
 const {publisherKey,...unsigned}=value;
 return {...unsigned,signingAuthority:'external'};
}
function configureBuilder(root,value){
 if(process.platform!=='win32')throw Error('Configure the designated builder on Windows.');
 const home=fs.realpathSync(value.home),installation=fs.realpathSync(value.installation),expected=path.join(path.dirname(home),'Proteus Updates',digest(home+'\0'+installation).slice(0,24));
 if(root!==expected)throw Error('Builder configuration must bind the installed owner.');
 const selected=Object.fromEntries(['source','node','npmCli','git'].map(key=>[key,fs.realpathSync(value[key])]));
 if(!fs.statSync(selected.source).isDirectory()||!['node','npmCli','git'].every(key=>fs.statSync(selected[key]).isFile()))throw Error('Builder prerequisites must already exist.');
 const origin=execFileSync(selected.git,['-C',selected.source,'remote','get-url','origin'],{encoding:'utf8',windowsHide:true}).trim();
 if(origin!==repository)throw Error('Use the authorized Proteus repository and its existing local authentication route.');
 ensurePrivateHome(root);const file=path.join(root,'windows-builder.json');
 const next={schemaVersion:2,root,home,installation,repository,signingAuthority:'external',...selected};
 if(fs.existsSync(file)){const prior=readPolicy(root);if(JSON.stringify(prior)!==JSON.stringify(next))throw Error('An existing builder policy differs. Inspect it before reconfiguration.');return {configured:true,alreadyConfigured:true};}
 atomic(file,next);return {configured:true,repository,source:selected.source,artifacts:path.join(root,'builds')};
}
function buildStatus(root){
 const configured=fs.existsSync(path.join(root,'windows-builder.json')),pointer=path.join(root,'build-current.json');
 if(!fs.existsSync(pointer))return {configured,job:null};
 const ref=JSON.parse(fs.readFileSync(pointer,'utf8'));
 if(!/^[a-f0-9-]{36}$/.test(ref.operationId||''))throw Error('Invalid Windows build reference.');
 const file=path.join(root,'builds',ref.operationId,'job.json'),job=JSON.parse(fs.readFileSync(file,'utf8'));
 if(job.root!==root||job.operationId!==ref.operationId)throw Error('Windows build journal does not match its owner.');
 let launcher;try{launcher=JSON.parse(fs.readFileSync(path.join(path.dirname(file),'launch.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const pid=job.pid||launcher?.pid,identified=Number.isSafeInteger(pid)&&pid>0,running=['starting','running','attention'].includes(job.phase)&&identified&&alive(pid);
 // A launcher can observe the PID before the worker writes its first journal.
 // Its later exit must be reconcilable even if the launching owner has exited.
 const interrupted=['starting','running'].includes(job.phase)&&identified&&!running;
 return {configured,job:{...job,...(pid?{pid}:{}),...(interrupted?{phase:'attention',error:'The build process stopped without a final receipt. Inspect its logs; it will not be replayed.'}:{}),running}};
}
function cancelBuild(root,value){
 const state=buildStatus(root),job=state.job;
 if(!job||job.operationId!==value.operationId||job.requestHash!==value.buildRequestHash)throw Error('Refresh the current build and its request hash before cancellation.');
 if(job.phase==='cancelled')return state;
 if(job.running||job.phase!=='attention'||!job.pid&&!job.launchFailure&&!job.observedExit)throw Error('Only a failed build with an observed process exit can be cancelled. Active work was preserved.');
 const file=path.join(root,'builds',job.operationId,'job.json'),saved=JSON.parse(fs.readFileSync(file,'utf8'));
 atomic(file,{...saved,phase:'cancelled',cancelledAt:new Date().toISOString(),priorFailure:job.error});return buildStatus(root);
}
function startBuild(root,value,{launch=spawn,platform=process.platform}={}){
 if(platform!=='win32')throw Error('Source distribution builds require the designated Windows machine.');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.operationId||'')||!/^[a-f0-9]{40,64}$/.test(value.sourceCommit||'')||!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(value.version||'')||!['stable','preview'].includes(value.channel||'stable'))throw Error('Specify a stable build operation ID, exact source commit, version and channel.');
 const policy=readPolicy(root),directory=path.join(root,'builds',value.operationId),file=path.join(directory,'job.json'),request={sourceCommit:value.sourceCommit,version:value.version,channel:value.channel||'stable'},requestHash=digest(JSON.stringify(request));
 if(fs.existsSync(file)){const prior=JSON.parse(fs.readFileSync(file,'utf8'));if(prior.requestHash!==requestHash)throw Error('This build operation already selected different source.');return {configured:true,job:prior,reconciled:true};}
 const existing=buildStatus(root);if(existing.job&&['running','attention','starting'].includes(existing.job.phase))throw Error('Finish or inspect the current Windows build before starting another.');
 fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const job={schemaVersion:1,operationId:value.operationId,root,requestHash,...request,phase:'starting',createdAt:new Date().toISOString(),log:path.join(directory,'worker.log')};
 atomic(file,job);atomic(path.join(root,'build-current.json'),{operationId:value.operationId});
 const fd=fs.openSync(job.log,'a',0o600);
 try{
  const child=launch(policy.node,[path.join(__dirname,'windows-build-worker.cjs'),file],{env:buildEnvironment(policy,process.env,platform),windowsHide:true,shell:false,stdio:['ignore',fd,fd]});
  if(child.pid)atomic(path.join(directory,'launch.json'),{pid:child.pid,at:new Date().toISOString()});
  child.on('error',error=>atomic(file,{...job,phase:'attention',launchFailure:true,error:error.message}));
  child.on('exit',code=>{const saved=JSON.parse(fs.readFileSync(file,'utf8'));if(['starting','running'].includes(saved.phase))atomic(file,{...saved,phase:'attention',observedExit:{pid:child.pid,code,at:new Date().toISOString()},error:'Build worker exited without a final receipt ('+code+'). Inspect before retrying.'});});child.unref();
 }finally{fs.closeSync(fd);}
 return buildStatus(root);
}
module.exports={configureBuilder,readPolicy,buildStatus,startBuild,cancelBuild,buildEnvironment,prepareBuildEnvironment,repository};
