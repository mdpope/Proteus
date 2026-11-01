import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),desktopRequire=createRequire(new URL('../desktop/browser/browser-extensions.cjs',import.meta.url));
const source=fs.readFileSync(new URL('../desktop/browser/browser-extensions.cjs',import.meta.url),'utf8');
function launch(home){
 const callbacks=new Map(),notices=[],module={exports:{}};
 let now=100000;
 class Clock extends Date{static now(){return now;}}
 vm.runInNewContext(source,{module,Date:Clock,URL,require(name){
  if(name==='electron')return {};
  if(name==='electron-chrome-extensions')return {ElectronChromeExtensions:class{}};
  if(name==='electron-chrome-web-store')return {};
  if(name==='./extension-window-context.cjs')return {installExtensionWindowContext(){}};
  if(name==='./extension-permissions.cjs')return {installExtensionPermissions(host,_save,notify){callbacks.set(host.profileId,notify);}};
  if(name.startsWith('.'))return desktopRequire(name);
  return require(name);
 }});
 const browser={actions:{send:value=>notices.push(value)}};
 const extensions=()=>new module.exports.BrowserExtensions(browser,home);
 const initialize=async(manager,id)=>manager.initialize(id,{storagePath:path.join(home,id),extensions:{}});
 return {extensions,initialize,notices,fail(profile,id='icloud'){callbacks.get(profile)({id,name:id==='icloud'?'iCloud Passwords':'Other extension'});},advance(){now+=60000;}};
}
test('native helper warning appears once per extension per launch across profiles and host recreation',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-extension-notices-'));
 try{
  const app=launch(home),manager=app.extensions();
  await app.initialize(manager,'default');await app.initialize(manager,'research');
  app.fail('default');app.advance();app.fail('default');app.fail('research');
  assert.equal(app.notices.length,1,'Background retries and other profiles must not revive the warning');
  const recreated=app.extensions();await app.initialize(recreated,'recreated');app.fail('recreated');
  assert.equal(app.notices.length,1,'Recreating a browser host is not a new application launch');
  app.fail('research','other');assert.equal(app.notices.length,2,'A different extension retains its first warning');
  const restarted=launch(home);await restarted.initialize(restarted.extensions(),'default');restarted.fail('default');
  assert.equal(restarted.notices.length,1,'A real application restart permits one new warning');
  assert.deepEqual(fs.readdirSync(home),[],'The warning limit must not persist across launches');
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
