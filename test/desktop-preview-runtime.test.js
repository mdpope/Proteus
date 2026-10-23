import {assertPrivate} from './helpers/permissions.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {initializePreviewRoot,configureDesktopPreview,stageCodexAuthentication,preparePreviewFixtures}=require('../desktop/preview-runtime.cjs');
const {normalizeSession}=require('../desktop/windows/workspace-session.cjs');
const fixture=t=>{const root=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-preview-runtime-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;};

test('preview opt-in uses a distinct named profile and leaves ordinary launches alone',t=>{
  const root=fixture(t),calls=[],app={setName:v=>calls.push(['name',v]),setPath:(k,v)=>calls.push([k,v]),commandLine:{appendSwitch:v=>calls.push(['switch',v])}};
  assert.equal(configureDesktopPreview(app,{env:{},metadata:{}}),null);assert.equal(calls.length,0);
  const result=configureDesktopPreview(app,{userHome:path.join(root,'synthetic-user'),env:{PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:path.join(root,'preview')},metadata:{}});
  assert.equal(result.home,path.join(root,'preview/app-data'));
  assert.ok(calls.some(([k,v])=>k==='userData'&&v===path.join(root,'preview/electron')));
  assert.ok(calls.some(([k,v])=>k==='name'&&v==='Proteus Design Preview'));
  assert.ok(calls.some(([k,v])=>k==='switch'&&v==='use-mock-keychain'));
});
test('preview refuses production or unrecognized populated homes and symlink targets',t=>{
  const root=fixture(t),userHome=path.join(root,'user');fs.mkdirSync(userHome);
  const production=path.join(userHome,'Library/Application Support/Proteus');fs.mkdirSync(production,{recursive:true});fs.writeFileSync(path.join(production,'keep'),'untouched');
  assert.throws(()=>initializePreviewRoot(production,{userHome}),/separate/);
  assert.equal(fs.readFileSync(path.join(production,'keep'),'utf8'),'untouched');
  const populated=path.join(root,'populated');fs.mkdirSync(populated);fs.writeFileSync(path.join(populated,'keep'),'untouched');
  assert.throws(()=>initializePreviewRoot(populated,{userHome}),/not an initialized/);
  const link=path.join(root,'link');fs.symlinkSync(production,link);assert.throws(()=>initializePreviewRoot(link,{userHome}),/not a link/);
  const marked=path.join(root,'marked');fs.mkdirSync(marked);fs.symlinkSync(path.join(production,'keep'),path.join(marked,'.proteus-design-preview.json'));
  assert.throws(()=>initializePreviewRoot(marked,{userHome}),/marker must be a regular file/);assert.equal(fs.readFileSync(path.join(production,'keep'),'utf8'),'untouched');
  const valid=initializePreviewRoot(path.join(root,'valid'),{userHome}),marker=path.join(valid.root,'.proteus-design-preview.json'),before=fs.statSync(marker).mtimeMs;
  initializePreviewRoot(valid.root,{userHome});assert.equal(fs.statSync(marker).mtimeMs,before);
});
test('preview copies only authentication, preserving existing private preview auth and sample edits',t=>{
  const root=fixture(t),userHome=path.join(root,'user');fs.mkdirSync(path.join(userHome,'.codex'),{recursive:true});
  fs.writeFileSync(path.join(userHome,'.codex/auth.json'),'synthetic-credential-fixture');fs.writeFileSync(path.join(userHome,'.codex/config.toml'),'do not import');
  const locations=initializePreviewRoot(path.join(root,'preview'),{userHome});
  assert.equal(stageCodexAuthentication(locations,{env:{},userHome}).available,true);
  assert.deepEqual(fs.readdirSync(locations.codexHome),['auth.json']);assertPrivate(path.join(locations.codexHome,'auth.json'),0o600);
  fs.writeFileSync(path.join(locations.codexHome,'auth.json'),'changed-preview-auth');stageCodexAuthentication(locations,{env:{},userHome});
  assert.equal(fs.readFileSync(path.join(locations.codexHome,'auth.json'),'utf8'),'changed-preview-auth');assert.equal(fs.readFileSync(path.join(userHome,'.codex/auth.json'),'utf8'),'synthetic-credential-fixture');
  const folders=preparePreviewFixtures(locations);fs.writeFileSync(path.join(folders[0].path,'README.md'),'keep user experiment');preparePreviewFixtures(locations);
  assert.equal(fs.readFileSync(path.join(folders[0].path,'README.md'),'utf8'),'keep user experiment');
});
test('desktop session keeps project identity, flat child tabs and fixed workspace page through restart',()=>{
  const result=normalizeSession({tabs:[{id:'workspace:local:w',type:'workspace',workspaceId:'w',workspacePage:'projects'},{id:'project:local:p',type:'workspace',workspaceId:'w',projectId:'p',projectName:'Review',workspaceName:'Studio'},{id:'chat1',type:'run',runId:'run1',parentId:'project:local:p'}],active:'chat1',engineSection:'source-library'});
  assert.equal(result.tabs.find(t=>t.id==='workspace:local:w').workspacePage,'projects');
  assert.equal(result.tabs.find(t=>t.id==='project:local:p').projectId,'p');
  assert.equal(result.tabs.find(t=>t.id==='chat1').parentId,'project:local:p');assert.equal(result.active,'chat1');assert.equal(result.engineSection,'source-library');
});
