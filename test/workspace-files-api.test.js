import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../src/server.js';

async function fixture(t) {
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-workspace-api-'));
  const workspace=path.join(home,'workspace'),additional=path.join(home,'additional'),outside=path.join(home,'outside');
  for(const dir of [workspace,additional,outside])fs.mkdirSync(dir);
  fs.mkdirSync(path.join(workspace,'Nested'));fs.writeFileSync(path.join(workspace,'Nested','Existing.md'),'# Keep this note');
  fs.writeFileSync(path.join(outside,'Private.md'),'PRIVATE FIXTURE ONLY');
  const fake={status:async()=>({available:true,models:[]}),run:async()=>{throw new Error('No provider should run.');},close:async()=>{}};
  const app=await startServer({home:path.join(home,'app'),port:0,timers:false,withSeed:false,providers:{copilot:fake,codex:fake,claude:fake}});
  t.after(async()=>{await app.close();fs.rmSync(home,{recursive:true,force:true});});
  const config=app.context.config();
  app.context.mutate(value=>{value.workspaces[0].cwd=workspace;value.workspaces[0].additionalDirectories=[additional];value.workspaces=value.workspaces.slice(0,1);},config.revision);
  const request=async(route,data,options={})=>{
    const response=await fetch(app.origin+'/api/workspace-files/'+route,{method:data===undefined?'GET':'POST',headers:{...(options.auth===false?{}:{Authorization:`Bearer ${app.token}`}),...(data===undefined?{}:{'Content-Type':'application/json'}),...options.headers},...(data===undefined?{}:{body:JSON.stringify(data)})});
    return {code:response.status,value:await response.json()};
  };
  const roots=await request('roots');assert.equal(roots.code,200);
  const rootId=roots.value.roots.find(root=>root.primary).id;
  return {home,workspace,additional,outside,app,request,rootId};
}

test('workspace API authenticates reads and protects writes from cross-origin and non-JSON requests',async t=>{
  const f=await fixture(t);
  for(const [route,data] of [['roots',undefined],['list',{rootId:f.rootId}],['read',{rootId:f.rootId,file:'Nested/Existing.md'}],['folder',{rootId:f.rootId,name:'Unauthorized'}],['create',{rootId:f.rootId,name:'Unauthorized'}]])assert.equal((await f.request(route,data,{auth:false})).code,401,route);
  for(const route of ['folder','create']) {
    const data={rootId:f.rootId,name:'Denied'};
    assert.equal((await f.request(route,data,{headers:{Origin:'https://untrusted.example'}})).code,403);
    assert.equal((await f.request(route,data,{headers:{'Content-Type':'text/plain'}})).code,415);
  }
  assert.deepEqual(fs.readdirSync(f.workspace),['Nested']);
});

test('workspace API lists scoped roots and creates nested Markdown without overwriting existing files',async t=>{
  const f=await fixture(t);const roots=(await f.request('roots')).value.roots;
  assert.equal(roots.length,2);assert.ok(roots.every(root=>root.available));
  const listing=await f.request('list',{rootId:f.rootId,directory:'Nested'});assert.equal(listing.code,200);assert.equal(listing.value.entries[0].path,'Nested/Existing.md');
  const folder=await f.request('folder',{rootId:f.rootId,directory:'Nested',name:'New child'});assert.equal(folder.code,200);assert.equal(folder.value.directory,'Nested/New child');
  const created=await f.request('create',{rootId:f.rootId,directory:folder.value.directory,name:'New note',content:'# Fixture'});assert.equal(created.code,200);assert.equal(created.value.relativePath,'Nested/New child/New note.md');
  const opened=await f.request('read',{rootId:f.rootId,file:created.value.relativePath});assert.equal(opened.code,200);assert.equal(opened.value.content,'# Fixture');
  const overwrite=await f.request('create',{rootId:f.rootId,directory:'Nested',name:'Existing.md',content:'DO NOT OVERWRITE'});assert.equal(overwrite.code,400);assert.match(overwrite.value.error,/already exists/);
  assert.equal(fs.readFileSync(path.join(f.workspace,'Nested','Existing.md'),'utf8'),'# Keep this note');
  assert.equal((await f.request('folder',{rootId:f.rootId,directory:'Nested',name:'New child'})).code,400);
});

test('workspace API rejects arbitrary roots, traversal and links escaping the selected root',async t=>{
  const f=await fixture(t);fs.symlinkSync(f.outside,path.join(f.workspace,'Escape'),'dir');
  const listing=await f.request('list',{rootId:f.rootId});assert.equal(listing.code,200);assert.ok(!listing.value.entries.some(entry=>entry.name==='Escape'));
  for(const request of [
    ['list',{rootId:f.outside}],['list',{rootId:f.rootId,directory:'../outside'}],['list',{rootId:f.rootId,directory:'Escape'}],
    ['read',{rootId:f.rootId,file:'Escape/Private.md'}],['read',{rootId:f.rootId,file:path.join(f.outside,'Private.md')}],
    ['folder',{rootId:f.rootId,directory:'Escape',name:'Denied'}],['folder',{rootId:f.rootId,name:'../Denied'}],
    ['create',{rootId:f.rootId,directory:'Escape',name:'Denied'}],['create',{rootId:f.rootId,directory:'../outside',name:'Denied'}],
    ['create',{rootId:f.rootId,name:'../Denied.md'}]
  ])assert.equal((await f.request(...request)).code,400,JSON.stringify(request));
  assert.deepEqual(fs.readdirSync(f.outside),['Private.md']);
});

test('workspace API rejects stale root IDs after workspace revocation or configured link retargeting',async t=>{
  const f=await fixture(t);const initial=f.app.context.config();
  f.app.context.mutate(value=>{value.workspaces[0].cwd=f.additional;value.workspaces[0].additionalDirectories=[];},initial.revision);
  for(const [route,data] of [['list',{}],['read',{file:'Nested/Existing.md'}],['folder',{name:'Revoked'}],['create',{name:'Revoked'}]])assert.equal((await f.request(route,{rootId:f.rootId,...data})).code,400,route);
  assert.deepEqual(fs.readdirSync(f.workspace),['Nested']);
  const link=path.join(f.home,'root-link');fs.symlinkSync(f.workspace,link,'dir');
  // Normal saves canonicalize roots; external edits can retain a link path.
  const external=JSON.parse(fs.readFileSync(f.app.context.file,'utf8'));external.workspaces[0].cwd=link;
  fs.writeFileSync(f.app.context.file,JSON.stringify(external));
  const rootId=(await f.request('roots')).value.roots[0].id;
  fs.unlinkSync(link);fs.symlinkSync(f.outside,link,'dir');
  for(const [route,data] of [['list',{}],['read',{file:'Private.md'}],['folder',{name:'Retargeted'}],['create',{name:'Retargeted'}]])assert.equal((await f.request(route,{rootId,...data})).code,400,route);
  assert.deepEqual(fs.readdirSync(f.outside),['Private.md']);
});
