import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {atomicRename} from '../src/shared/atomic-rename.cjs';
import {atomicJSON} from '../src/shared/files.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';

test('Windows atomic replacement retries sharing violations without removing the durable file',t=>{
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-atomic-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const current=path.join(root,'state.json'),staged=current+'.tmp';fs.writeFileSync(current,'old');fs.writeFileSync(staged,'new');let attempts=0;const waits=[];
 atomicRename(staged,current,{platform:'win32',wait:ms=>waits.push(ms),rename:(from,to)=>{
  assert.equal(fs.readFileSync(current,'utf8'),'old');if(++attempts<3)throw Object.assign(Error('Synthetic sharing violation'),{code:'EPERM'});fs.renameSync(from,to);
 }});
 assert.equal(fs.readFileSync(current,'utf8'),'new');assert.equal(fs.existsSync(staged),false);assert.deepEqual(waits,[10,20]);
 fs.writeFileSync(staged,'later');attempts=0;
 assert.throws(()=>atomicRename(staged,current,{platform:'win32',wait:()=>{},rename:()=>{attempts++;throw Object.assign(Error('Persistent denial'),{code:'EACCES'});}}),/Persistent denial/);
 assert.equal(attempts,11);assert.equal(fs.readFileSync(current,'utf8'),'new');assert.equal(fs.readFileSync(staged,'utf8'),'later');
});
test('non-Windows and non-sharing failures remain immediate',()=>{
 for(const [platform,code]of [['linux','EPERM'],['win32','ENOENT']]){
  let attempts=0;assert.throws(()=>atomicRename('unused','unused',{platform,rename:()=>{attempts++;throw Object.assign(Error(code),{code});},wait:()=>assert.fail('Do not retry')}),{code});assert.equal(attempts,1);
 }
});
test('Windows chat-state replacement survives a real temporary reader lock',{skip:process.platform!=='win32'},async t=>{
 const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-atomic-lock-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const file=path.join(root,'state.json');atomicJSON(file,{value:'before',extension:{retained:true}});
 const script="$f=[IO.File]::Open($env:PROTEUS_LOCK_TEST,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read);try{[Console]::Out.WriteLine('LOCKED');[Console]::Out.Flush();[Threading.Thread]::Sleep(300)}finally{$f.Dispose()}";
 const child=spawn(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,env:{...process.env,PROTEUS_LOCK_TEST:file},stdio:['ignore','pipe','pipe']});
 t.after(()=>{if(child.exitCode===null)child.kill();});
 const exited=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Reader failed: '+code)));});
 await new Promise((resolve,reject)=>{child.stdout.once('data',chunk=>chunk.toString().includes('LOCKED')?resolve():reject(Error('Reader not ready')));child.once('error',reject);child.once('exit',code=>reject(Error('Reader exited before lock: '+code)));});
 atomicJSON(file,{value:'after',extension:{retained:true}});await exited;
 assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),{value:'after',extension:{retained:true}});assert.deepEqual(fs.readdirSync(root),['state.json']);
});
