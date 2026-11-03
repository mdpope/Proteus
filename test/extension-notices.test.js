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
 const callbacks=new Map(),notices=[],adapters=new Map(),module={exports:{}};
 let now=100000;
 class Clock extends Date{static now(){return now;}}
 vm.runInNewContext(source,{module,Date:Clock,URL,require(name){
  if(name==='electron')return {};
  if(name==='electron-chrome-extensions')return {ElectronChromeExtensions:class{constructor(options){this.options=options;options.selections=[];adapters.set(options.session.storagePath,options);}selectTab(wc){this.options.selections.push(wc.id);this.options.selectTab(wc);}}};
  if(name==='electron-chrome-web-store')return {};
  if(name==='./extension-window-context.cjs')return {installExtensionWindowContext(){}};
  if(name==='./extension-contexts.cjs')return {installExtensionContexts(){}};
  if(name==='./extension-permissions.cjs')return {installExtensionPermissions(host,_save,notify){callbacks.set(host.profileId,notify);}};
  if(name.startsWith('.'))return desktopRequire(name);
  return require(name);
 }});
 const browser={actions:{send:value=>notices.push(value)}};
 const extensions=()=>new module.exports.BrowserExtensions(browser,home);
 const initialize=async(manager,id)=>manager.initialize(id,{storagePath:path.join(home,id),extensions:{}});
 return {extensions,initialize,notices,adapters,browser,fail(profile,id='icloud'){callbacks.get(profile)({id,name:id==='icloud'?'iCloud Passwords':'Other extension'});},advance(){now+=60000;}};
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


test('extension creation declares new intent for active and background tabs; later activation does not',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-extension-create-'));
 try{
  const app=launch(home),manager=app.extensions(),tabs=new Map(),creations=[];let sequence=0;
  app.browser.window={id:1};app.browser.tabs=tabs;
  app.browser.create=async(url,owner,history,descriptor)=>{creations.push({url,descriptor});const id='new-'+(++sequence),tab={id,profileId:'default',view:{webContents:{id:sequence,isDestroyed:()=>false}}};tabs.set(id,tab);return {id,title:'New tab',loaded:true};};
  app.browser.get=id=>tabs.get(id);app.browser.state=tab=>({id:tab.id});
  await app.initialize(manager,'default');const api=app.adapters.get(path.join(home,'default'));
  await api.createTab({active:true});app.browser.active='new-1';await api.createTab({active:false});
  assert.deepEqual(api.selections,[1],'adapter selection follows the currently selected view without a renderer activation echo');
  assert.equal(creations[0].descriptor.background,undefined);assert.equal(creations[1].descriptor.background,true,'inactive extension creation uses the background focus guard');
  assert.deepEqual(app.notices.map(value=>({type:value.type,id:value.info.id,created:value.created})),[{type:'select-tab',id:'new-1',created:true},{type:'background-tab',id:'new-2',created:true}]);
  api.selectTab(tabs.get('new-1').view.webContents);assert.equal(app.notices.at(-1).type,'select-tab');assert.equal(app.notices.at(-1).created,undefined,'activation cannot manufacture creation intent');
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});

test('inactive creation retains an unchanged blank-page adapter selection but never restores it over newer input',async()=>{
 for(const newerInput of [false,true]){
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-extension-blank-selection-'));
  try{
   const app=launch(home),manager=app.extensions(),previous={id:'saved-blank',isDestroyed:()=>false},fresh={id:'new-blank',profileId:'default',view:{webContents:{id:2,isDestroyed:()=>false}}};
   app.browser.window={id:1};app.browser.tabs=new Map([[fresh.id,fresh]]);app.browser.active=null;app.browser.selectionRevision=1;
   app.browser.create=async()=>{if(newerInput)app.browser.selectionRevision++;return {id:fresh.id,title:'New tab',loaded:true};};app.browser.get=()=>fresh;
   await app.initialize(manager,'default');manager.profiles.get('default').adapter.ctx={store:{getActiveTabFromWindow:()=>previous}};
   const api=app.adapters.get(path.join(home,'default'));await api.createTab({active:false});
   assert.deepEqual(api.selections,newerInput?[]:['saved-blank']);assert.equal(app.notices.length,1);assert.equal(app.notices[0].type,'background-tab');
  }finally{fs.rmSync(home,{recursive:true,force:true});}
 }
});

test('first inactive extension tab does not become the adapter selection while Overview is selected',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-extension-overview-selection-'));
 try{
  const app=launch(home),manager=app.extensions(),window={id:1},contents={id:2,isDestroyed:()=>false},fresh={id:'new-blank',profileId:'default',view:{webContents:contents}},active=new Map(),cache=new Map();
  app.browser.window=window;app.browser.tabs=new Map([[fresh.id,fresh]]);app.browser.active=null;app.browser.selectionRevision=1;
  app.browser.create=async()=>{active.set(window,contents);cache.set(contents.id,{active:true});return {id:fresh.id,title:'New tab',loaded:true};};app.browser.get=()=>fresh;
  await app.initialize(manager,'default');manager.profiles.get('default').adapter.ctx={store:{getActiveTabFromWindow:window=>active.get(window),windowToActiveTab:active,tabDetailsCache:cache}};
  const api=app.adapters.get(path.join(home,'default'));await api.createTab({active:false});
  assert.equal(active.has(window),false);assert.equal(cache.get(contents.id).active,false);assert.deepEqual(api.selections,[]);assert.equal(app.notices.length,1);assert.equal(app.notices[0].type,'background-tab');
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
