import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {privateTemporaryDirectory} from '../../shared/private-paths.cjs';
import {scopedExecutionSandbox} from './scoped-execution.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const safePath='/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin';
const macRuntimeRoots=['/System','/usr/bin','/usr/lib','/usr/share','/bin','/sbin','/usr/sbin','/Library/Apple','/Library/Developer/CommandLineTools','/Library/Frameworks','/usr/local/bin','/usr/local/lib','/usr/local/Cellar','/opt/homebrew/Cellar','/opt/homebrew/opt','/private/var/db/dyld'];
const ownerRuntimeRoot=process.versions.electron?path.dirname(path.dirname(process.execPath)):null;
const within=(file,root)=>{const relative=path.relative(root,file);return relative===''||relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};

export const scopedCommandEnvironment=home=>({PATH:process.platform==='win32'?path.join(process.env.SystemRoot||'C:\\Windows','System32'):safePath,HOME:home,USERPROFILE:home,CODEX_HOME:home,LANG:'en_US.UTF-8',...(process.platform==='win32'?{SystemRoot:process.env.SystemRoot||'C:\\Windows'}:{})});
export function commandIdentity(schedule,argv,inputs=[]){
 scopedExecutionSandbox(schedule);
 if(!Array.isArray(argv)||!argv.length||argv.length>128||argv.some(value=>typeof value!=='string'||value.length>16000||value.includes('\0')))throw Error('Use a bounded argv array; shell expansion is not performed.');
 const cwd=fs.realpathSync(schedule.workspace.cwd),command=argv[0];
 const executable=fs.realpathSync(path.isAbsolute(command)?command:command.includes('/')||command.includes('\\')?path.resolve(cwd,command):[...safePath.split(':'),...(process.platform==='win32'?[process.env.SystemRoot+'\\System32']:[])].map(root=>path.join(root,command)).find(file=>{try{return fs.statSync(file).isFile();}catch{return false;}})||command);
 const roots=schedule.executionPermissions?.folders||[];
 const publicRoots=process.platform==='darwin'?[...macRuntimeRoots,...(ownerRuntimeRoot?[ownerRuntimeRoot]:[])]:process.platform==='win32'?[path.join(process.env.SystemRoot||'C:/Windows','System32'),...(ownerRuntimeRoot?[ownerRuntimeRoot]:[])]:['/usr','/bin','/sbin','/lib','/lib64',...(ownerRuntimeRoot?[ownerRuntimeRoot]:[])];
 if(!roots.some(folder=>within(executable,folder.path))&&!publicRoots.some(root=>within(executable,root)&&!(root==='/System'&&within(executable,'/System/Volumes/Data'))))throw Error('Executable identity is outside the approved folders and public runtime paths.');
 if(!fs.statSync(executable).isFile()||process.platform!=='win32'&&(fs.statSync(executable).mode&0o111)===0)throw Error('Choose an executable command.');
 const sourceFiles=[];let visited=0;
 const visit=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){if(++visited>20000)throw Error('Command source identity exceeds the bounded tree; choose a narrower workflow directory.');if(['.git','node_modules','vendor','.venv','venv','__pycache__','release-artifacts'].includes(entry.name))continue;const file=path.join(directory,entry.name);if(entry.isDirectory())visit(file);else if(entry.isFile()&&(/\.(?:py|js|mjs|cjs|sh|ps1|rb)$/.test(entry.name)||['package.json','package-lock.json','pyproject.toml','requirements.txt','uv.lock'].includes(entry.name)))sourceFiles.push(file);}};visit(cwd);
 const files=[...new Set([...sourceFiles,...inputs,...argv.slice(1).filter(value=>/\.(?:py|js|mjs|cjs|sh|ps1|rb)$/.test(value))].map(file=>fs.realpathSync(path.resolve(cwd,file))))].sort();
 for(const file of files)if(!roots.some(folder=>{const relative=path.relative(folder.path,file);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));}))throw Error('Command input identity is outside approved folders.');
 if(files.reduce((sum,file)=>sum+fs.statSync(file).size,0)>32*1024*1024||fs.statSync(executable).size>256*1024*1024)throw Error('Command identity input size exceeds its bound; choose a narrower workflow.');
 const identity={version:1,cwd,scopeHash:hash(JSON.stringify({policy:process.platform==='darwin'?macScopedProfile(schedule):scopedExecutionSandbox(schedule).config,implementation:'proteus-host-scoped-v1',platform:process.platform,credentialIPC:process.platform==='darwin'?'denied':'native',timeoutLimit:60000})),commandHash:hash(JSON.stringify(argv)),executable,executableSha256:hash(fs.readFileSync(executable)),inputs:files.map(file=>({path:file,sha256:hash(fs.readFileSync(file))}))};
 return {...identity,sourceHash:hash(JSON.stringify(identity.inputs)),digest:hash(JSON.stringify(identity))};
}
export function sandboxConfiguration(policy){
 const profile=policy.config.permissions[policy.managedProfile],lines=[];
 for(const [key,value] of Object.entries(profile.filesystem).sort((a,b)=>Number(typeof a[1]==='object')-Number(typeof b[1]==='object'))){if(typeof value==='string')lines.push(JSON.stringify(key)+' = '+JSON.stringify(value));else lines.push('[permissions.'+policy.managedProfile+'.filesystem.'+JSON.stringify(key)+']',...Object.entries(value).map(([name,permission])=>JSON.stringify(name)+' = '+JSON.stringify(permission)));}
 return 'default_permissions = "'+policy.managedProfile+'"\napproval_policy = "on-request"\n[permissions.'+policy.managedProfile+'.filesystem]\n'+lines.join('\n')+'\n[permissions.'+policy.managedProfile+'.network]\nenabled = false\n';
}
function execute(command,args,{cwd,env,signal,timeoutMs=60000}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(Error('Cancelled'));
  const child=spawn(command,args,{cwd,env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32',windowsHide:true});let stdout='',stderr='',truncated=false,timedOut=false;
  const collect=key=>chunk=>{const value=chunk.toString('utf8');if(key==='stdout'){if(Buffer.byteLength(stdout)+chunk.length<=65536)stdout+=value;else truncated=true;}else if(Buffer.byteLength(stderr)+chunk.length<=65536)stderr+=value;else truncated=true;};
  child.stdout.on('data',collect('stdout'));child.stderr.on('data',collect('stderr'));
  const stop=()=>{try{if(process.platform!=='win32')process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{}};
  const timer=setTimeout(()=>{timedOut=true;stop();},Math.min(60000,Math.max(100,timeoutMs)));signal?.addEventListener('abort',stop,{once:true});
  child.once('error',error=>{clearTimeout(timer);signal?.removeEventListener('abort',stop);reject(error);});
  child.once('close',(exitCode,terminationSignal)=>{clearTimeout(timer);signal?.removeEventListener('abort',stop);resolve({exitCode,terminationSignal,stdout,stderr,truncated,timedOut,cancelled:!!signal?.aborted});});
 });
}
export async function runScopedCommand(schedule,argv,{signal,timeoutMs=60000,nodeRuntime=false}={}){
 const policy=scopedExecutionSandbox(schedule);if(!policy)throw Error('Enable explicit scoped commands and folder grants before execution.');
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-executor-'));
 try{
  fs.mkdirSync(path.join(home,'empty'));fs.writeFileSync(path.join(home,'config.toml'),sandboxConfiguration(policy),{mode:0o600});
  if(process.platform==='darwin'){
   return await execute('/usr/bin/sandbox-exec',['-p',macScopedProfile(schedule),...argv],{cwd:policy.cwd,env:{...scopedCommandEnvironment(home),...(nodeRuntime&&process.versions.electron?{ELECTRON_RUN_AS_NODE:'1'}:{})},signal,timeoutMs});
  }
  const {codexExecutable}=await import('../../providers/codex.js');
  return await execute(codexExecutable({}),['sandbox','-P',policy.managedProfile,'-C',policy.cwd,'--',...argv],{cwd:policy.cwd,env:{...scopedCommandEnvironment(home),...(nodeRuntime&&process.versions.electron?{ELECTRON_RUN_AS_NODE:'1'}:{})},signal,timeoutMs});
 }finally{fs.rmSync(home,{recursive:true,force:true});}
}
export function macScopedProfile(schedule){
 const readRoots=[...macRuntimeRoots,...(ownerRuntimeRoot?[ownerRuntimeRoot]:[])];
   const profile=['(version 1)','(deny default)','(allow process-fork process-exec)','(allow process-info* (target self))','(allow sysctl-read (sysctl-name-regex #"^hw[.]") (sysctl-name "kern.hostname") (sysctl-name "kern.ostype") (sysctl-name "kern.osrelease") (sysctl-name "kern.osversion") (sysctl-name "kern.version") (sysctl-name "kern.argmax"))','(allow signal (target self))','(allow file-read-metadata)','(allow file-read* (literal "/"))','(allow file-read* (literal "/dev/null") (literal "/dev/random") (literal "/dev/urandom"))','(allow file-write* (literal "/dev/null"))',...readRoots.map(root=>'(allow file-read* file-map-executable '+(root==='/System'?'(require-all (subpath "/System") (require-not (subpath "/System/Volumes/Data")))':'(subpath '+JSON.stringify(root)+')')+')')];
   for(const folder of schedule.executionPermissions.folders){
    profile.push('(allow file-read* file-map-executable (subpath '+JSON.stringify(folder.path)+'))');
    if(folder.access==='read-write'){
     const moreSpecific=schedule.executionPermissions.folders.filter(other=>other.path!==folder.path&&other.path.startsWith(folder.path+path.sep));
     const sameRead=schedule.executionPermissions.folders.some(other=>other.path===folder.path&&other.access==='read');
     if(!sameRead)profile.push('(allow file-write* (require-all (subpath '+JSON.stringify(folder.path)+') '+moreSpecific.map(other=>'(require-not (subpath '+JSON.stringify(other.path)+'))').join(' ')+'))');
    }
    for(const name of ['.git','.agents','.codex','.aws'])profile.push('(deny file-write* (subpath '+JSON.stringify(path.join(folder.path,name))+'))');
   }
 return profile.join('\n');
}
let qualification;
export function qualifyScopedCommandRuntime({refresh=false}={}){
 if(refresh)qualification=null;
 if(!qualification)qualification=(async()=>{
  const root=fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-executor-probe-'))),cwd=path.join(root,'work');fs.mkdirSync(cwd);fs.mkdirSync(path.join(cwd,'readonly'));fs.mkdirSync(path.join(cwd,'.git'));fs.writeFileSync(path.join(root,'outside'),'synthetic');fs.symlinkSync(path.join(root,'outside'),path.join(cwd,'escape'));
  const listener=net.createServer(socket=>socket.end());
  try{
   await new Promise((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});
   const schedule={provider:'codex',workspace:{cwd,additionalDirectories:[]},executionPermissions:{mode:'custom',sandboxedCommands:true,folders:[{path:cwd,access:'read-write'},{path:path.join(cwd,'readonly'),access:'read'}]}};
   const code='const fs=require("fs"),r={};for(const [key,file] of Object.entries({write:"ok",readonly:"readonly/no",metadata:".git/no",escape:"escape",outside:"../outside"})){try{fs.writeFileSync(file,"synthetic");r[key]=true}catch{r[key]=false}}try{fs.readFileSync("../outside");r.readOutside=true}catch{r.readOutside=false}r.secret=process.env.PROTEUS_EXECUTOR_SECRET!==undefined;const socket=require("net").connect(Number(process.argv[1]),"127.0.0.1");socket.on("connect",()=>{r.network=true;socket.destroy();console.log(JSON.stringify(r))});socket.on("error",()=>{r.network=false;console.log(JSON.stringify(r))});socket.setTimeout(2000,()=>{socket.destroy();process.exit(2)});';
   const result=await runScopedCommand(schedule,[process.execPath,'-e',code,String(listener.address().port)],{timeoutMs:10000,nodeRuntime:true});
   if(result.exitCode!==0)throw Error('Native scoped executor did not start ('+result.exitCode+'/'+result.terminationSignal+'): '+result.stderr.slice(0,300));
   const actual=JSON.parse(result.stdout.trim()),expected={write:true,readonly:false,metadata:false,escape:false,outside:false,readOutside:false,secret:false,network:false};
   if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Native scoped executor boundary verification failed.');
   return {version:1,implementation:'proteus-host-scoped-v1',platform:process.platform,verified:true,credentialEnvironment:'empty',credentialIPC:process.platform==='darwin'?'denied':'native-sandbox',modelTurnStarted:false};
  }finally{await new Promise(resolve=>listener.close(()=>resolve()));fs.rmSync(root,{recursive:true,force:true});}
 })().catch(error=>{qualification=null;error.code='SCHEDULE_EXECUTOR_UNAVAILABLE';throw error;});
 return qualification;
}
