import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SettingsStore} from '../src/settings.js';
test('usage visibility and collapse are independent persisted boolean preferences',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-appearance-'));
 try{
  const store=new SettingsStore(home,home),initial=store.get();
  assert.deepEqual(initial.appearance,{showProviderUsage:true,providerUsageCollapsed:false});
  const collapsed=store.save({...initial,appearance:{showProviderUsage:false,providerUsageCollapsed:true}},initial.revision);
  assert.deepEqual(new SettingsStore(home,home).get().appearance,{showProviderUsage:false,providerUsageCollapsed:true});
  for(const key of ['showProviderUsage','providerUsageCollapsed'])assert.throws(()=>store.save({...collapsed,appearance:{...collapsed.appearance,[key]:'false'}},collapsed.revision),/boolean/);
  assert.deepEqual(store.get().appearance,collapsed.appearance);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
