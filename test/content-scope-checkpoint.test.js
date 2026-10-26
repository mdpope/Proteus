import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {createTabSynchronizer} from '../public/models/content-tab-sync.js';
import {acceptsProjectPresentation} from '../public/features/workspaces/project-follow.js';

const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const section=(start,end)=>{const from=source.indexOf(start),to=source.indexOf(end,from);assert.ok(from>=0&&to>from);return source.slice(from,to);};
const copy=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
const oldProject={id:'project-a',type:'workspace',projectId:'a'},newProject={id:'project-b',type:'workspace',projectId:'b'};
const chat={id:'chat-a',type:'run',runId:'chat',parentId:oldProject.id};
const firstEntry={id:'first',url:'https://example.test/first',title:'First'};
const nextEntry={id:'next',url:'https://example.test/next',title:'Next'};
const firstHistory={entries:[firstEntry],index:0,currentEntryId:'first',revision:1};
const pendingHistory={entries:[firstEntry,nextEntry],index:1,currentEntryId:'next',revision:1};

function appFixture({checkpoint=async()=>false,sync=async()=>{},save=async()=>{},team={tabs:[]}}={}){
  const calls=[],errors=[],browser={id:'browser',type:'browser',parentId:chat.id,label:'Next',info:{url:nextEntry.url,history:pendingHistory,navigationPending:true,profileId:'default'}};
  const state={tab:browser.id,page:'context',tabs:copy([oldProject,newProject,chat,browser])};
  let follower;
  const sandbox={crypto:webcrypto,state,workspaceReady:true,workspaceRestoring:false,workspaceClosing:false,lastWorkspace:'',workspaceSaving:undefined,
    window:{desktop:{workspaceSession:async value=>{calls.push({kind:'save',session:copy(value.session)});return save(value);}}},
    document:{hidden:false},chatSetupTabs:{capture(){}},reconcilePreviewProjects(){},selectedChildren:new Map(),desktopWindowId:'main',windowScopeId:value=>value,
    teamState:()=>team,contentTabMetadata:()=>({}),setTimeout:()=>1,clearTimeout(){},toast:error=>errors.push(error),
    contentTabSync:{all:async()=>assert.fail('Inactive scopes must not be polled.'),checkpoint:async scope=>{calls.push({kind:'checkpoint',scope:copy(scope)});return checkpoint(scope);},sync:async scope=>{calls.push({kind:'sync',scope:copy(scope)});return sync(scope);}},
    acceptsProjectPresentation,createProjectFollower:options=>{follower=options;return {changed(){}};},
  };
  vm.createContext(sandbox);
  vm.runInContext(section('let applyingContentTabs=0','\nfunction openFeatureTab')+'\n'+section('function scopeParent(scope){','\nfunction sharedBrowserDescriptor')+'\n'+section('let savedContentScopes=[];',"\nfor(const type of ['pointerdown','wheel','touchstart','keydown'])")+'\nglobalThis.fixture={saveWorkspace,visibleContentScopes,checkpointDepartedContentScopes};',sandbox);
  return {...sandbox.fixture,state,calls,errors,follower,document:sandbox.document};
}

test('leaving a nested browser checkpoints each departed owner scope once after saving its pending history',async()=>{
  const ui=appFixture();
  await ui.saveWorkspace();ui.calls.length=0;
  ui.state.tab=newProject.id;
  await ui.saveWorkspace();
  assert.deepEqual(ui.calls.map(call=>call.kind),['save','checkpoint','checkpoint']);
  assert.deepEqual(ui.calls.filter(call=>call.kind==='checkpoint').map(call=>call.scope),[{scope:'chat',id:'chat'},{scope:'project',id:'a'}]);
  assert.equal(ui.calls[0].session.tabs.find(tab=>tab.id==='browser').navigationPending,true);
  assert.deepEqual(ui.calls[0].session.tabs.find(tab=>tab.id==='browser').history,pendingHistory);
  await ui.saveWorkspace();await ui.follower.sync({scope:'project',id:'a'});
  assert.equal(ui.calls.length,3,'leaving does not load or repeatedly synchronize an inactive project');
});

test('switching chat scopes retains their shared project and hiding checkpoints remaining visible scopes only',async()=>{
  const ui=appFixture();await ui.saveWorkspace();ui.calls.length=0;
  const second={id:'second-chat',type:'run',runId:'second',parentId:oldProject.id};ui.state.tabs.push(second);ui.state.tab=second.id;
  await ui.saveWorkspace();
  assert.deepEqual(ui.calls.filter(call=>call.kind==='checkpoint').map(call=>call.scope),[{scope:'chat',id:'chat'}]);
  ui.calls.length=0;ui.document.hidden=true;await ui.saveWorkspace();await ui.saveWorkspace();
  assert.deepEqual(ui.calls.filter(call=>call.kind==='checkpoint').map(call=>call.scope),[{scope:'chat',id:'second'},{scope:'project',id:'a'}]);
  assert.equal(ui.calls.some(call=>call.kind==='sync'),false);
});

test('closed or revoked scopes are not checkpointed as a new all-tabs-close operation',async()=>{
  const ui=appFixture();await ui.saveWorkspace();ui.calls.length=0;
  ui.state.tabs=ui.state.tabs.filter(tab=>tab.id===newProject.id);ui.state.tab=newProject.id;
  await ui.saveWorkspace();
  assert.equal(ui.calls.some(call=>call.kind==='checkpoint'),false);
});

test('visible child synchronization stops before its parent when the user changes scope during the await',async()=>{
  const entered=deferred(),finish=deferred();
  const ui=appFixture({sync:async()=>{entered.resolve();await finish.promise;}});
  const pending=ui.follower.sync({scope:'project',id:'a'});await entered.promise;
  ui.state.tab=newProject.id;finish.resolve();await pending;
  assert.deepEqual(ui.calls,[{kind:'sync',scope:{scope:'chat',id:'chat'}}]);
});

test('window saves await local checkpoint completion and surface storage failures without waiting for a host',async()=>{
  const finish=deferred();let fail=false;
  const ui=appFixture({checkpoint:async()=>{await finish.promise;if(fail)throw Error('Synthetic storage full');return true;}});
  await ui.saveWorkspace();ui.state.tab=newProject.id;
  let saved=false;const saving=ui.saveWorkspace().then(value=>{saved=true;return value;});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(saved,false);
  fail=true;finish.resolve();assert.deepEqual(copy(await saving),{failed:true,error:'Synthetic storage full'});
  assert.deepEqual(ui.errors,['Synthetic storage full']);
});

test('saved browser and Team history preserve pending flags until their current native state acknowledges them',async()=>{
  const team={tabs:[{id:'team-view',type:'browser',browserId:'team-browser',history:pendingHistory,navigationPending:true,url:nextEntry.url}]};
  const ui=appFixture({team});
  const browser=ui.state.tabs.find(tab=>tab.id==='browser');browser.navigationPending=true;
  await ui.saveWorkspace();
  const saved=ui.calls[0].session;
  assert.deepEqual(saved.team.tabs[0].history,pendingHistory);assert.equal(saved.team.tabs[0].navigationPending,true);
  browser.info.navigationPending=false;team.tabs[0].navigationPending=false;await ui.saveWorkspace();
  const acknowledged=ui.calls.filter(call=>call.kind==='save').at(-1).session;
  assert.equal(acknowledged.tabs.find(tab=>tab.id==='browser').navigationPending,false,'a stale saved tab flag cannot override the native acknowledgement');
  assert.equal(acknowledged.team.tabs[0].navigationPending,false);
});

test('a scope-exit checkpoint survives restart and sends the unsaved navigation without hydrating the inactive view',async()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const scope={scope:'chat',id:'chat'},original={id:'browser',type:'browser',title:'First',url:firstEntry.url,history:firstHistory};
  let local=[copy(original)],remote={revision:1,tabs:[copy(original)]},gets=0,mutations=0,applies=0;
  const options={navigation:true,pendingStorage:storage,scopes:()=>[scope],readLocal:async()=>local,
    request:async(_scope,action,args)=>{if(action==='get'){gets++;return copy(remote);}assert.equal(action,'mutate');mutations++;assert.equal(args.operations.length,1);assert.equal(args.operations[0].action,'browser-navigate');assert.equal(args.operations[0].url,nextEntry.url);remote={revision:2,tabs:[{...original,url:nextEntry.url,history:{...pendingHistory,revision:2}}]};return copy(remote);},
    apply:async(_scope,tabs)=>{applies++;local=copy(tabs);},
  };
  const tabs=createTabSynchronizer(options);await tabs.all();
  const ui=appFixture({checkpoint:value=>value.scope==='chat'?tabs.checkpoint(value):false});await ui.saveWorkspace();
  local=[{...original,url:nextEntry.url,history:pendingHistory,navigationPending:true}];ui.state.tab=newProject.id;
  await ui.saveWorkspace();
  assert.equal(gets,1);assert.equal(mutations,0);assert.equal(applies,1,'departing only writes a local outbox');
  assert.ok([...values.keys()].some(key=>key.startsWith('proteus.navigation.pending:')));
  // A fresh renderer must recover the stable operation even before native state
  // has been recreated; the separate saved pending marker protects newer edits.
  local=[{...original,url:nextEntry.url,history:pendingHistory}];
  await createTabSynchronizer(options).all();
  assert.equal(local[0].url,nextEntry.url);assert.equal(mutations,1);
  assert.deepEqual(local[0].history.entries,[firstEntry,nextEntry]);
  assert.equal([...values.keys()].some(key=>key.startsWith('proteus.navigation.pending:')),false);
});
