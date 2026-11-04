import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {AsyncLocalStorage} from 'node:async_hooks';
import {createRequire} from 'node:module';
import {placeTabAfter} from '../public/shared/navigation/tab-placement.js';
const {preserveBackgroundFocus}=createRequire(import.meta.url)('../desktop/browser/browser-background-focus.cjs');
const pagePreferences=createRequire(import.meta.url)('../desktop/browser/browser-page-preferences.cjs');

const copy=value=>JSON.parse(JSON.stringify(value));
test('a native link menu callback keeps its originating window after focus moves elsewhere',async()=>{
 const scope=new AsyncLocalStorage(),created=[],electron={app:{getApplicationNameForProtocol:()=> 'Browser'},Menu:{buildFromTemplate:items=>({items})}};
 const sandbox={module:{exports:{}},URL,process:{platform:'linux'},require:name=>name==='electron'?electron:name==='node:path'?path:name==='./browser-history.cjs'?{}:name==='./browser-downloads.cjs'?{}:name==='./browser-page-preferences.cjs'?pagePreferences:assert.fail(name)};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../desktop/browser/browser-actions.cjs',import.meta.url),'utf8'),sandbox);
 const source={id:'source',windowId:'first',profileId:'default',parentId:'project:local:one'},browser={options:{},partition:{on(){}},tabs:new Map([[source.id,source]]),appOrigin:'http://app.test',withTabWindow:(tab,fn)=>scope.run(tab.windowId,fn),create:async()=>{await Promise.resolve();created.push(scope.getStore()||'other-focused-window');return {id:'new'};},sendAction(){}};
 const menu=scope.run('first',()=>new sandbox.module.exports.BrowserActions(browser).menu(source,{linkURL:'https://example.test/'}));
 for(const action of menu.items.slice(0,3)){scope.run('other-focused-window',()=>action.click());await new Promise(resolve=>setImmediate(resolve));}
 assert.deepEqual(created,['first','first','first']);
});
test('native link menu keeps foreground/background/unloaded choices distinct and captures source ownership',async()=>{
  const created=[],sent=[],electron={app:{getApplicationNameForProtocol:()=> 'Browser'},Menu:{buildFromTemplate:items=>({items})}};
  const sandbox={module:{exports:{}},URL,process:{platform:'linux'},require:name=>name==='electron'?electron:name==='node:path'?path:name==='./browser-history.cjs'?{}:name==='./browser-downloads.cjs'?{}:name==='./browser-page-preferences.cjs'?pagePreferences:assert.fail(name)};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../desktop/browser/browser-actions.cjs',import.meta.url),'utf8'),sandbox);
  const source={id:'source',profileId:'profile-a',group:'team',parentId:'chat',destination:{type:'chat',id:'chat'},workspaceName:'Workspace',associationChatId:'chat'};
  const browser={options:{},partition:{on(){}},tabs:new Map([[source.id,source]]),appOrigin:'http://app.test',create:async(url,_owner,_history,descriptor)=>{created.push({url,descriptor:copy(descriptor)});return {id:'created',...descriptor};},sendAction:value=>sent.push(copy(value))};
  const actions=new sandbox.module.exports.BrowserActions(browser),menu=actions.menu(source,{linkURL:'https://example.test/page'});
  assert.deepEqual(copy(menu.items.slice(0,3).map(item=>item.label)),['Open Link in New Default Browser Tab','Open Link in Background Tab','Open Link in Unloaded Tab']);
  source.profileId='later-profile';source.parentId='later-chat';
  menu.items[1].click();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(created[0],{url:'https://example.test/page',descriptor:{profileId:'profile-a',group:'team',parentId:'chat',destination:{type:'chat',id:'chat'},workspaceName:'Workspace',associationChatId:'chat',hidden:false,unloaded:false,background:true}});
  assert.equal(sent[0].type,'background-tab');assert.equal(sent[0].afterId,'source');
  menu.items[0].click();menu.items[2].click();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(sent.map(value=>value.type),['background-tab','select-tab','unloaded-tab']);
  assert.equal(created[1].descriptor.unloaded,undefined);assert.equal(created[2].descriptor.unloaded,true);assert.equal(created[2].descriptor.hidden,true);
});

test('initial background loading preserves latest source, address bar or selected tab focus and cleans listeners',()=>{
  let focused,windowFocused=true;
  const wc=()=>Object.assign(new EventEmitter(),{isDestroyed:()=>false,isFocused(){return focused===this;},focus(){focused=this;this.emit('focus');}});
  const source=wc(),other=wc(),background=wc(),renderer=wc(),window=Object.assign(new EventEmitter(),{webContents:renderer,isDestroyed:()=>false,isFocused:()=>windowFocused});
  const tab=(id,contents)=>({id,view:{webContents:contents,getVisible:()=>browser.active===id}});
  const browser={active:'source',tabs:new Map(),windowTabs(){return [...this.tabs.values()];}};
  for(const [id,contents] of [['source',source],['other',other],['background',background]])browser.tabs.set(id,tab(id,contents));
  source.focus();const guard=preserveBackgroundFocus(browser,browser.tabs.get('background'),window,source);
  background.focus();assert.equal(focused,source,'initial hidden-view focus returns immediately');
  renderer.focus();background.focus();assert.equal(focused,renderer,'later address-bar input wins');
  browser.active='other';other.focus();background.focus();assert.equal(focused,other,'later visible tab wins');
  guard.stop();guard.stop();
  for(const emitter of [window,source,other,background,renderer])assert.equal(emitter.eventNames().length,0,'temporary listeners removed');
  const selectedGuard=preserveBackgroundFocus(browser,browser.tabs.get('background'),window,other);
  browser.active='background';background.focus();assert.equal(focused,background,'intentional new-tab selection stays focused');selectedGuard.stop();
  browser.active='source';source.focus();const blurredGuard=preserveBackgroundFocus(browser,browser.tabs.get('background'),window,source);
  windowFocused=false;window.emit('blur');background.focus();assert.equal(focused,background,'guard does not focus an inactive window');blurredGuard.stop();
  for(const emitter of [window,source,other,background,renderer])assert.equal(emitter.eventNames().length,0);
});

test('background loading falls back to a newer selected view or renderer after its remembered target becomes stale',()=>{
  let focused;
  const wc=()=>Object.assign(new EventEmitter(),{destroyed:false,isDestroyed(){return this.destroyed;},isFocused(){return focused===this;},focus(){focused=this;this.emit('focus');}});
  const source=wc(),background=wc(),renderer=wc(),window=Object.assign(new EventEmitter(),{webContents:renderer,isDestroyed:()=>false,isFocused:()=>true});
  const browser={active:'source',tabs:new Map(),windowTabs(){return [...this.tabs.values()];}};
  const tab=(id,contents)=>({id,view:{webContents:contents,getVisible:()=>browser.active===id}});
  browser.tabs.set('source',tab('source',source));browser.tabs.set('background',tab('background',background));
  source.focus();const guard=preserveBackgroundFocus(browser,browser.tabs.get('background'),window,source);
  const newer=wc();browser.tabs.set('newer',tab('newer',newer));browser.active='newer';newer.focus();
  assert.equal(newer.listenerCount('focus'),0,'new foreground view was created after guard listeners');
  background.focus();assert.equal(focused,newer,'current selected view wins over stale source');
  source.destroyed=true;background.focus();assert.equal(focused,newer,'destroyed remembered target cannot block current visible view');
  browser.active=null;background.focus();assert.equal(focused,renderer,'renderer receives focus when remembered target is destroyed and no native view is visible');
  browser.active='newer';
  renderer.focus();background.focus();assert.equal(focused,renderer,'explicit address input wins even with another native view selected');
  guard.stop();for(const emitter of [window,source,newer,background,renderer])assert.equal(emitter.eventNames().length,0);
});

test('remembered renderer focus does not override a newer native selection but newer address focus still wins',()=>{
  let focused;
  const wc=()=>Object.assign(new EventEmitter(),{isDestroyed:()=>false,isFocused(){return focused===this;},focus(){focused=this;this.emit('focus');}});
  const source=wc(),background=wc(),renderer=wc(),window=Object.assign(new EventEmitter(),{webContents:renderer,isDestroyed:()=>false,isFocused:()=>true});
  const browser={active:'source',tabs:new Map(),windowTabs(){return [...this.tabs.values()];}};
  const tab=(id,contents)=>({id,view:{webContents:contents,getVisible:()=>browser.active===id}});
  browser.tabs.set('source',tab('source',source));browser.tabs.set('background',tab('background',background));
  renderer.focus();const guard=preserveBackgroundFocus(browser,browser.tabs.get('background'),window,renderer);
  const newer=wc();browser.tabs.set('newer',tab('newer',newer));browser.active='newer';newer.focus();
  background.focus();assert.equal(focused,newer,'old renderer focus predates this new native selection');
  renderer.focus();background.focus();assert.equal(focused,renderer,'address input focused after selection is the latest target');
  guard.stop();for(const emitter of [window,source,newer,background,renderer])assert.equal(emitter.eventNames().length,0);
});

test('background focus snapshots and later focus callbacks use the tab owner window context',()=>{
  let focused,context='other';const ownerFocus=Object.assign(new EventEmitter(),{isDestroyed:()=>false,focus(){focused=this;this.emit('focus');}}),renderer=Object.assign(new EventEmitter(),{isDestroyed:()=>false,focus(){focused=this;this.emit('focus');}});
  const background=Object.assign(new EventEmitter(),{isDestroyed:()=>false,isFocused(){return focused===this;},focus(){focused=this;this.emit('focus');}});
  const window=Object.assign(new EventEmitter(),{webContents:renderer,isDestroyed:()=>false,isFocused:()=>true});
  const source={id:'owner-source',view:{webContents:ownerFocus,getVisible:()=>true}},tab={id:'background',view:{webContents:background,getVisible:()=>false}};
  const browser={get active(){return context==='owner'?'owner-source':'unrelated';},tabs:new Map([[source.id,source],[tab.id,tab]]),withTabWindow(_tab,action){const previous=context;context='owner';try{return action();}finally{context=previous;}},windowTabs(){assert.equal(context,'owner');return [source,tab];}};
  renderer.focus();const guard=preserveBackgroundFocus(browser,tab,window,renderer);
  background.focus();assert.equal(focused,renderer,'initial renderer snapshot belongs to owner window');
  ownerFocus.focus();renderer.focus();background.focus();assert.equal(focused,renderer,'focus events outside the broker context still belong to owner window');
  assert.equal(context,'other');guard.stop();
  for(const emitter of [window,ownerFocus,background,renderer])assert.equal(emitter.eventNames().length,0);
});

test('background browser registration orders the new tab without changing current selection or mounting a surface',()=>{
  const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),start=source.indexOf('function addBackgroundBrowserTab('),end=source.indexOf('\nfunction selectBrowserTab',start);
  const parent={id:'project',type:'workspace'},state={tab:'selected-later',selected:'selected-later',page:'context',tabs:[parent,{id:'source',parentId:'project'},{id:'selected-later',parentId:'project'}]},calls=[];
  const sandbox={state,placeTabAfter,ensureBrowserParent:()=>parent,saveWorkspace:()=>calls.push('save'),renderTabs:()=>calls.push('tabs'),renderChatSubtabs:()=>calls.push('children'),selectTeamBrowser:(...args)=>calls.push(args)};
  vm.createContext(sandbox);vm.runInContext(source.slice(start,end)+'\nglobalThis.add=addBackgroundBrowserTab;',sandbox);
  sandbox.add({id:'new',title:'Loaded',group:'main',profileId:'profile-a',loaded:true},'source');
  assert.deepEqual(state.tabs.map(tab=>tab.id),['project','source','new','selected-later']);assert.equal(state.tab,'selected-later');assert.equal(state.selected,'selected-later');assert.equal(state.page,'context');
  assert.deepEqual(calls,['save','tabs','children']);assert.equal(state.tabs[2].info.profileId,'profile-a');
  assert.equal(state.tabs[2].pendingOpen,undefined);sandbox.add({id:'fresh-blank',group:'main'},null,{created:true});assert.equal(state.tabs.find(tab=>tab.id==='fresh-blank').pendingOpen,true);
  sandbox.add({id:'fresh-blank',group:'main'});assert.equal(state.tabs.find(tab=>tab.id==='fresh-blank').pendingOpen,true,'selection refresh retains unsettled creation');
  sandbox.add({id:'team-new',group:'team'},'team-source');
  assert.deepEqual(copy(calls.at(-1)),[{id:'team-new',group:'team'},'team-source',{select:false,created:false}]);
});

test('Team background registration preserves its selected tab and existing default foreground behavior',()=>{
  const source=fs.readFileSync(new URL('../public/features/tools/team-tools.js',import.meta.url),'utf8'),start=source.indexOf('export function selectTeamBrowser('),end=source.indexOf('\nexport function forgetTeamBrowser',start);
  const state={active:'selected',tabs:[{id:'source',browserId:'source-native'},{id:'selected',browserId:'selected-native'}]},calls=[];
  const sandbox={state,crypto:webcrypto,placeTabAfter,revealActive:false,save:()=>calls.push('save'),paintTabs:()=>calls.push('paint')};
  vm.createContext(sandbox);vm.runInContext(source.slice(start,end).replace('export ','')+'\nglobalThis.select=selectTeamBrowser;',sandbox);
  sandbox.select({id:'background',title:'Background',profileId:'profile-a',loaded:true},'source-native',{select:false});
  assert.equal(state.active,'selected');assert.deepEqual(state.tabs.map(tab=>tab.browserId),['source-native','background','selected-native']);assert.deepEqual(calls,['save','paint']);
  sandbox.select({id:'foreground',title:'Foreground',loaded:true},'source-native');
  assert.equal(state.tabs.find(tab=>tab.id===state.active).browserId,'foreground');assert.deepEqual(calls,['save','paint','save']);
});

test('only explicit native creation marks a selected browser pending; delayed ordinary selection does not clear it',()=>{
 const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),start=source.indexOf('function selectBrowserTab('),end=source.indexOf('\nwindow.desktop?.onNewTab',start),state={tabs:[]},calls=[];
 const sandbox={state,ensureBrowserParent:()=>({id:'project',type:'workspace'}),openTab:value=>{calls.push(value);let prior=state.tabs.find(tab=>tab.id===value.id);if(prior)Object.assign(prior,value);else state.tabs.push(value);},previewEnabled:()=>true};
 vm.createContext(sandbox);vm.runInContext(source.slice(start,end)+'\nglobalThis.select=selectBrowserTab;',sandbox);
 sandbox.select({id:'fresh',loaded:true,group:'main'},null,{created:true});assert.equal(state.tabs[0].pendingOpen,true);
 sandbox.select({id:'fresh',loaded:true,group:'main'});assert.equal(Object.hasOwn(calls.at(-1),'pendingOpen'),false);assert.equal(state.tabs[0].pendingOpen,true);
 sandbox.select({id:'restored',loaded:true,group:'main'});assert.equal(state.tabs[1].pendingOpen,undefined,'an unknown selected or restored ID is not creation intent');
});
