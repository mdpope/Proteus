import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.js';
import {SessionProvider} from '../src/providers/session-provider.js';
import {linkDestination} from '../public/shared/ui/link-preview.js';

test('Copilot owns automatic working-root read/write without workspace changes or sibling grants',async t=>{
 const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-copilot-root-'))),root=path.join(home,'custom-copilot');fs.mkdirSync(root);
 const engine=new Engine(home,{copilot:{dataDirectory:()=>root}},undefined,{permissionControls:true});t.after(async()=>{await engine.close();fs.rmSync(home,{recursive:true,force:true});});
 const run={schedule:{provider:'copilot',workspace:{cwd:home,additionalDirectories:[]}},providerHome:root};
 const before=JSON.stringify(engine.permissions.get()),profile=engine.describePermissions(run);
 assert.equal(profile.mode,'ask');assert.equal(profile.automaticFolders[0].path,root);
 for(const kind of ['read','write'])assert.equal(engine.permissions.decide(run.schedule,{kind,resolvedPath:path.join(root,'session-state','id','checkpoints','new.json')},profile).allowed,true);
 assert.equal(engine.permissions.decide(run.schedule,{kind:'write',fileName:path.join(root+'-other','data')},profile).allowed,false);
 const outside=path.join(home,'outside');fs.mkdirSync(outside);fs.symlinkSync(outside,path.join(root,'escape'));
 assert.equal(engine.permissions.decide(run.schedule,{kind:'write',fileName:path.join(root,'escape','new')},profile).allowed,false);
 assert.equal(engine.permissions.decide(run.schedule,{kind:'read',path:root,managedApprovalRequired:true},profile).allowed,false);
 assert.equal(JSON.stringify(engine.permissions.get()),before);
 assert.equal(engine.describePermissions({...run,schedule:{...run.schedule,provider:'codex'}}).automaticFolders,undefined);
 const resumed=path.join(home,'resumed-copilot');assert.equal(engine.describePermissions({...run,providerHome:resumed}).automaticFolders[0].path,resumed);
});

test('link destination resolution displays web, absolute and relative file targets without executing links',()=>{
 assert.equal(linkDestination('https://example.test/a?b=1'),'https://example.test/a?b=1');
 assert.equal(linkDestination('../Notes/a.md#part',{file:'/work/docs/index.md'}),'file:///work/Notes/a.md#part');
 assert.equal(linkDestination('result.md',{cwd:'/work'}),'file:///work/result.md');
 assert.equal(linkDestination('result.md',{cwd:'C:\\work'}),'file:///C:/work/result.md');
 assert.equal(linkDestination('javascript:alert(1)'),'');assert.equal(linkDestination('data:text/html,x'),'');
});


test('Claude working roots apply automatically on new and resumed chats without trusting adjacent or symlink targets',async t=>{
 const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-claude-root-'))),root=path.join(home,'claude-config');fs.mkdirSync(root);
 const adapter=new SessionProvider(()=>({options:{env:{CLAUDE_CONFIG_DIR:root}},dataDirectory:()=>root}));assert.equal(adapter.options.env.CLAUDE_CONFIG_DIR,root);
 const engine=new Engine(home,{claude:adapter},undefined,{permissionControls:true});t.after(async()=>{await engine.close();fs.rmSync(home,{recursive:true,force:true});});
 const run={schedule:{provider:'claude',workspace:{cwd:home,additionalDirectories:[]}}},before=JSON.stringify(engine.permissions.get());
 for(const candidate of [run,{...run,providerHome:root}]){
  const profile=engine.describePermissions(candidate);assert.equal(profile.automaticFolders[0].path,root);
  for(const kind of ['read','write'])assert.equal(engine.permissions.decide(run.schedule,{kind,resolvedPath:path.join(root,'projects','workspace','session','tool-results','result.txt')},profile).allowed,true);
  assert.equal(engine.permissions.decide(run.schedule,{kind:'write',path:root+'-other/result.txt'},profile).allowed,false);
  assert.equal(engine.permissions.decide(run.schedule,{kind:'read',path:root,managedApprovalRequired:true},profile).allowed,false);
 }
 const outside=path.join(home,'outside');fs.mkdirSync(outside);fs.symlinkSync(outside,path.join(root,'escape'));
 assert.equal(engine.permissions.decide(run.schedule,{kind:'read',path:path.join(root,'escape','result')},engine.describePermissions(run)).allowed,false);
 assert.equal(JSON.stringify(engine.permissions.get()),before);
});
