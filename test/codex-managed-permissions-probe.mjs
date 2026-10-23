// Local app-server configuration probe only. Never starts a model turn.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {CodexRPC,codexSandbox,verifyCodexSandbox} from '../src/providers/codex.js';
import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-permission-probe-'));
const cwd=path.join(root,'work'),home=path.join(root,'codex');fs.mkdirSync(cwd);fs.mkdirSync(home);
const readonly=path.join(cwd,'readonly');fs.mkdirSync(readonly);fs.mkdirSync(path.join(cwd,'.git'));
const policy=codexSandbox({workspace:{cwd,additionalDirectories:[readonly]}},{mode:'ask',workingFolders:[{path:cwd,access:'read-write'},{path:readonly,access:'read'}]},{permissionControls:true});
const client=new CodexRPC({command:'codex',cwd,env:{...process.env,CODEX_HOME:home}});
try{
 await client.request('initialize',{clientInfo:{name:'proteus-permission-probe',version:'1'},capabilities:{experimentalApi:true}});
 const thread=await client.request('thread/start',{cwd,runtimeWorkspaceRoots:policy.runtimeWorkspaceRoots,approvalPolicy:'untrusted',approvalsReviewer:'user',config:{...policy.config,project_doc_max_bytes:0,apps:{_default:{enabled:false}},mcp_servers:{}}});
 verifyCodexSandbox(thread,policy,cwd);
 const entries=Object.entries(policy.config.permissions['proteus-workspace'].filesystem).map(([key,value])=>typeof value==='string'?`${JSON.stringify(key)} = ${JSON.stringify(value)}`:`[permissions.proteus-workspace.filesystem.${JSON.stringify(key)}]\n${Object.entries(value).map(([key,value])=>`${JSON.stringify(key)} = ${JSON.stringify(value)}`).join('\n')}`);
 // Direct path entries precede nested tables in TOML.
 entries.sort((a,b)=>Number(a.startsWith('['))-Number(b.startsWith('[')));
 fs.writeFileSync(path.join(home,'config.toml'),'default_permissions = "proteus-workspace"\n[permissions.proteus-workspace]\nextends = ":workspace"\n[permissions.proteus-workspace.filesystem]\n'+entries.join('\n')+'\n[permissions.proteus-workspace.network]\nenabled = false\n');
 const script='const fs=require("fs");const result={};for(const name of ["ordinary.txt","readonly/blocked.txt",".git/blocked.txt"]){try{fs.writeFileSync(name,"synthetic");result[name]=true;}catch{result[name]=false;}}console.log(JSON.stringify(result));';
 const probe=spawnSync('codex',['sandbox','-P','proteus-workspace','-C',cwd,'--',process.execPath,'-e',script],{env:{...process.env,CODEX_HOME:home},encoding:'utf8',timeout:15000});
 if(probe.status!==0)throw Error(probe.stderr||'Native permission probe failed.');
 const result=JSON.parse(probe.stdout.trim());assert.deepEqual(result,{'ordinary.txt':true,'readonly/blocked.txt':false,'.git/blocked.txt':false});
 console.log(JSON.stringify({activePermissionProfile:thread.activePermissionProfile,filesystem:result,modelTurnStarted:false}));
}finally{await client.close();fs.rmSync(root,{recursive:true,force:true});}
