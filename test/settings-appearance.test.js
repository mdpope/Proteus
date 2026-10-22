import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SettingsStore} from '../src/settings.js';
test('usage visibility and collapse are independent persisted boolean preferences',()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-appearance-'));
 try{
  const store=new SettingsStore(home,home),initial=store.get();
  assert.deepEqual(initial.appearance,{showProviderUsage:true,providerUsageCollapsed:false});
  const collapsed=store.save({...initial,appearance:{showProviderUsage:false,providerUsageCollapsed:true}},initial.revision);
  assert.deepEqual(new SettingsStore(home,home).get().appearance,{showProviderUsage:false,providerUsageCollapsed:true});
  for(const key of ['showProviderUsage','providerUsageCollapsed'])assert.throws(()=>store.save({...collapsed,appearance:{...collapsed.appearance,[key]:'false'}},collapsed.revision),/boolean/);
  assert.deepEqual(store.get().appearance,collapsed.appearance);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});

test('sidebar width is optional, revision-protected application state preserved across store restart',()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-sidebar-width-'));
 try{
  const store=new SettingsStore(home,home),initial=store.get();
  assert.equal(initial.appearance.sidebarWidth,undefined);
  const saved=store.save({...initial,extension:{retained:true},appearance:{...initial.appearance,sidebarWidth:327}},initial.revision);
  const restarted=new SettingsStore(home,home).get();
  assert.equal(restarted.appearance.sidebarWidth,327);assert.deepEqual(restarted.extension,{retained:true});assert.equal(restarted.revision,saved.revision);
  for(const invalid of [219,521,300.5,'327',null,NaN,Infinity])assert.throws(()=>store.save({...saved,appearance:{...saved.appearance,sidebarWidth:invalid}},saved.revision),/Sidebar width/);
  assert.throws(()=>store.save({...saved,appearance:{...saved.appearance,sidebarWidth:400}},initial.revision),/changed outside/);
  assert.equal(store.get().appearance.sidebarWidth,327);
  const latest=store.get();store.save({...latest,appearance:{...latest.appearance,showProviderUsage:false}},latest.revision);
  assert.equal(new SettingsStore(home,home).get().appearance.sidebarWidth,327);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
