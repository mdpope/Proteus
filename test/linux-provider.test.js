import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {codexExecutable} from '../src/providers/codex.js';

const desktop='/opt/codex-desktop/resources/codex';
const resolve=(options={})=>codexExecutable({platform:'linux',home:'/synthetic/user',env:{PATH:'/usr/bin:/bin'},executable:file=>file===desktop,...options});

test('Linux KDE launch discovers desktop Codex without a terminal PATH',()=>{
 assert.equal(resolve(),desktop);
});

test('Linux preserves explicit Codex selection, including an unavailable smoke executable',()=>{
 for(const command of ['/synthetic/work/codex','/synthetic/smoke/no-codex'])assert.equal(resolve({env:{PATH:'/usr/bin',PROTEUS_CODEX_PATH:command},executable:()=>{throw Error('Explicit selection must not fall back');}}),command);
});

test('Linux PATH selection precedes the optional desktop installation',()=>{
 const chosen='/synthetic/bin with spaces/codex';
 assert.equal(resolve({env:{PATH:'/synthetic/missing:/synthetic/bin with spaces:/usr/bin'},executable:file=>file===chosen||file===desktop}),chosen);
});

test('Linux lookup skips relative PATH directories and supports the user native bin',()=>{
 const visited=[];
 assert.equal(resolve({env:{PATH:':relative/bin:/usr/bin'},executable:file=>{visited.push(file);return file==='/synthetic/user/.local/bin/codex';}}),'/synthetic/user/.local/bin/codex');
 assert.ok(visited.every(file=>path.posix.isAbsolute(file)));
 assert.equal(resolve({executable:()=>false}),'codex');
});

test('Linux automatic lookup rejects non-executable files and directories but accepts executable symlinks',{skip:process.platform==='win32'},()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-linux-cli-'));
 try{
  const directory=path.join(root,'directory'),blocked=path.join(root,'blocked'),linked=path.join(root,'linked');
  for(const dir of [directory,blocked,linked])fs.mkdirSync(dir);
  fs.mkdirSync(path.join(directory,'codex'));fs.writeFileSync(path.join(blocked,'codex'),'not executable',{mode:0o600});
  fs.symlinkSync(process.execPath,path.join(linked,'codex'));
  assert.equal(codexExecutable({platform:'linux',home:root,env:{PATH:[directory,blocked,linked].join(':')}}),path.join(linked,'codex'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Linux update keeps the selected Codex executable and desktop context; smoke stays isolated',()=>{
 const {environment}=createRequire(import.meta.url)('../desktop/updates/update-helper.cjs');
 const source={PATH:'/usr/bin',PROTEUS_CODEX_PATH:desktop,XDG_CURRENT_DESKTOP:'KDE',XDG_SESSION_TYPE:'wayland'};
 const retained=environment('/synthetic/proteus',false,{},source);
 assert.equal(resolve({env:retained}),desktop);assert.equal(retained.XDG_CURRENT_DESKTOP,'KDE');assert.equal(retained.XDG_SESSION_TYPE,'wayland');
 const smoke=environment('/synthetic/smoke',true,{},source);
 assert.equal(resolve({env:smoke}),path.join('/synthetic/smoke','no-codex'));
});
