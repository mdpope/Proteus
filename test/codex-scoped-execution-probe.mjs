import net from 'node:net';
// Real native sandbox acceptance with synthetic files; no model turn or credentials.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {CodexRPC,codexExecutable,verifyCodexSandbox} from '../src/providers/codex.js';
import {scopedExecutionSandbox} from '../src/services/scheduling/scoped-execution.js';
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-scoped-'))),cwd=path.join(root,'work'),nativeHome=path.join(root,'native');
fs.mkdirSync(cwd);fs.mkdirSync(nativeHome);fs.mkdirSync(path.join(cwd,'.git'));fs.mkdirSync(path.join(cwd,'readonly'));fs.writeFileSync(path.join(root,'outside.txt'),'synthetic');
const policy=scopedExecutionSandbox({provider:'codex',workspace:{cwd,additionalDirectories:[]},executionPermissions:{mode:'custom',sandboxedCommands:true,folders:[{path:cwd,access:'read-write'},{path:path.join(cwd,'readonly'),access:'read'}]}});
fs.symlinkSync(path.join(root,'outside.txt'),path.join(cwd,'escape'));
const listener=net.createServer(socket=>socket.end());await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));
const command=codexExecutable({}),client=new CodexRPC({command,cwd,env:{...process.env,CODEX_HOME:nativeHome}});
try{
 await client.request('initialize',{clientInfo:{name:'proteus-scoped-probe',version:'1'},capabilities:{experimentalApi:true}});
 const response=await client.request('thread/start',{cwd,runtimeWorkspaceRoots:policy.runtimeWorkspaceRoots,approvalPolicy:policy.approvalPolicy,approvalsReviewer:'user',config:{...policy.config,project_doc_max_bytes:0,mcp_servers:{},apps:{_default:{enabled:false}}}});
 try{verifyCodexSandbox(response,policy,cwd);}catch(error){console.log(JSON.stringify({cwd:response.cwd,approvalPolicy:response.approvalPolicy,approvalsReviewer:response.approvalsReviewer,profile:response.activePermissionProfile,roots:response.runtimeWorkspaceRoots,sandbox:response.sandbox}));throw error;}
 const profile=policy.config.permissions[policy.managedProfile],lines=[];
 for(const [key,value] of Object.entries(profile.filesystem).sort((a,b)=>Number(typeof a[1]==='object')-Number(typeof b[1]==='object'))){if(typeof value==='string')lines.push(JSON.stringify(key)+' = '+JSON.stringify(value));else lines.push('[permissions.'+policy.managedProfile+'.filesystem.'+JSON.stringify(key)+']',...Object.entries(value).map(([k,v])=>JSON.stringify(k)+' = '+JSON.stringify(v)));}
 fs.writeFileSync(path.join(nativeHome,'config.toml'),'default_permissions = "'+policy.managedProfile+'"\napproval_policy = "on-request"\n[permissions.'+policy.managedProfile+'.filesystem]\n'+lines.join('\n')+'\n[permissions.'+policy.managedProfile+'.network]\nenabled = false\n');
 const code='const fs=require("fs"),r={};for(const f of ["ordinary.txt","readonly/blocked.txt",".git/blocked.txt","../outside.txt","escape"]){try{fs.writeFileSync(f,"test");r[f]=true}catch{r[f]=false}}try{fs.readFileSync("../outside.txt");r.outsideRead=true}catch{r.outsideRead=false}const net=require("net"),s=net.connect(Number(process.argv[1]),"127.0.0.1");s.on("connect",()=>{r.networkConnected=true;s.destroy();console.log(JSON.stringify(r))});s.on("error",e=>{r.networkConnected=false;r.networkDenied=["EPERM","EACCES"].includes(e.code);console.log(JSON.stringify(r))});s.setTimeout(2000,()=>{s.destroy();process.exit(2)});';
 const result=spawnSync(command,['sandbox','-P',policy.managedProfile,'-C',cwd,'--',process.execPath,'-e',code,String(listener.address().port)],{env:{...process.env,CODEX_HOME:nativeHome},encoding:'utf8',timeout:20000});
 if(result.status!==0)throw Error(result.stderr||'Native sandbox execution failed');
 const actual=JSON.parse(result.stdout.trim());assert.deepEqual(actual,{'ordinary.txt':true,'readonly/blocked.txt':false,'.git/blocked.txt':false,'../outside.txt':false,escape:false,outsideRead:false,networkConnected:false,networkDenied:true});
 console.log(JSON.stringify({passed:true,approvalPolicy:response.approvalPolicy,modelTurnStarted:false,filesystem:actual,networkEnabled:response.sandbox?.networkAccess}));
}finally{await new Promise(resolve=>listener.close(resolve));await client.close();fs.rmSync(root,{recursive:true,force:true});}
