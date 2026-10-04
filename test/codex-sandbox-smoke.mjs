// Opt-in native sandbox smoke test. No model turn, account auth, or production data.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {CodexRPC,codexSandbox,verifyCodexSandbox} from '../src/codex.js';
if(process.platform!=='darwin')throw new Error('This smoke test validates the installed macOS Codex sandbox.');
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-codex-sandbox-'))),cwd=path.join(home,'allowed'),other=path.join(home,'second'),outside=path.join(home,'outside');for(const p of [cwd,other,outside,path.join(home,'codex')])fs.mkdirSync(p);fs.symlinkSync(outside,path.join(cwd,'escape'));
const schedule={workspace:{cwd,additionalDirectories:[other]}},policy=codexSandbox(schedule,{mode:'trusted',readOnlyTools:true,folders:[cwd,other].map(path=>({path,access:'read-write'}))});
const rpc=new CodexRPC({cwd,env:{...process.env,CODEX_HOME:path.join(home,'codex')}});
try {
 await rpc.initialize();
 const params={cwd:policy.cwd,runtimeWorkspaceRoots:policy.runtimeWorkspaceRoots,approvalPolicy:'untrusted',approvalsReviewer:'user',sandbox:policy.sandbox,config:{...policy.config,project_doc_max_bytes:0,features:{skip_host_skill_discovery:true,skill_mcp_dependency_install:false}}};
 const thread=await rpc.request('thread/start',params,12000);verifyCodexSandbox(thread,policy,cwd);
 const paths=[path.join(cwd,'allowed.txt'),path.join(other,'second.txt'),path.join(outside,'denied.txt'),path.join(cwd,'escape','denied.txt')];
 const script=`import pathlib,json,socket\npaths=${JSON.stringify(paths)}\nresults=[]\nfor p in paths:\n try: pathlib.Path(p).write_text('synthetic');results.append('wrote')\n except OSError: results.append('denied')\ntry:\n s=socket.socket();s.bind(('127.0.0.1',0));results.append('network-open');s.close()\nexcept OSError: results.append('network-denied')\nprint(json.dumps(results))`;
 const result=await rpc.request('command/exec',{command:['/usr/bin/python3','-c',script],cwd,sandboxPolicy:policy.policy,timeoutMs:8000},12000);
 assert.equal(result.exitCode,0);assert.deepEqual(JSON.parse(result.stdout),['wrote','wrote','denied','denied','network-denied']);assert.equal(fs.existsSync(paths[2]),false);
 console.log(JSON.stringify({passed:true,checks:['native thread start resolves exact trusted-root sandbox','two authorized roots writable','outside root denied','symlink escape denied','network denied','no model turn or real workflow']}));
} finally {await rpc.close();fs.rmSync(home,{recursive:true,force:true});}
