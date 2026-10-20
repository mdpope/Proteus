import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),desktopRequire=createRequire(new URL('../desktop/browser.cjs',import.meta.url));

// Run the native broker against synthetic webContents, without a browser profile
// or Electron process. The real history and navigation implementations are used.
function fixture(preview=true){
 let now=Date.parse('2026-10-17T12:00:00Z'),views=0;
 class Clock extends Date {static now(){return now;}}
 class Contents extends EventEmitter {
  constructor(){super();this.url='';this.title='Synthetic';this.mainFrame={};this.entries=[];this.index=-1;this.navigationHistory={getAllEntries:()=>this.entries,getActiveIndex:()=>this.index,canGoBack:()=>this.index>0,canGoForward:()=>this.index<this.entries.length-1,goBack:()=>this.index--,goForward:()=>this.index++,restore:async history=>{this.entries=history.entries;this.index=history.index;this.url=this.entries[this.index].url;}};}
  setZoomMode(){} setVisualZoomLevelLimits(){return Promise.resolve();} setWindowOpenHandler(){} send(){} isDestroyed(){return !!this.destroyed;} getURL(){return this.url;} getTitle(){return this.title;} isLoading(){return false;} getOSProcessId(){return 123;} isCurrentlyAudible(){return !!this.audible;}
  loadURL(url){this.url=url;this.entries.push({url,title:this.title});this.index=this.entries.length-1;return Promise.resolve();} reload(){this.reloads=(this.reloads||0)+1;} stop(){}
  getBackgroundThrottling(){return true;} setBackgroundThrottling(){}
  close(){if(this.unsaved){this.emit('will-prevent-unload');return;}this.destroyed=true;this.emit('destroyed');}
 }
 class View {constructor(){views++;this.webContents=new Contents();}setBounds(value){this.bounds=value;}getBounds(){return this.bounds;}setVisible(value){this.visible=value;}getVisible(){return this.visible;}}
 const module={exports:{}},source=fs.readFileSync(new URL('../desktop/browser.cjs',import.meta.url),'utf8');
 const dependency=name=>name==='electron'?{WebContentsView:View}:name.startsWith('node:')||['./browser-history.cjs','./browser-navigation.cjs','./navigation.cjs'].includes(name)?desktopRequire(name):{};
 vm.runInNewContext(source,{module,exports:module.exports,require:dependency,__dirname:new URL('../desktop/',import.meta.url).pathname,Date:Clock,URL,Buffer,structuredClone,setTimeout,clearTimeout,setInterval,clearInterval});
 const browser=Object.create(module.exports.BrowserTabs.prototype),partition={};
 Object.assign(browser,{options:{projects:preview},appOrigin:'http://app.test',tabs:new Map(),reloading:new Map(),cookieStores:new Map(),overlays:new Set(),window:{contentView:{addChildView(){},removeChildView(){}},getContentBounds:()=>({width:800,height:600}),isDestroyed:()=>false,webContents:{send(){}}},actions:{send(){}},profile:()=>({settings:{blockingEnabled:false}}),sessionFor:()=>partition,profileAvailable:()=>true,changed(){},disconnect:async()=>{}});
 return {browser,tick(){now+=1000;},views:()=>views};
}

test('preview browser selection, reading and restore do not advance meaningful activity; navigation and refresh do',async()=>{
 const f=fixture(),b=f.browser,info=await b.create('https://example.test/first'),id=info.id,created=info.lastActivityAt;
 assert.ok(created);f.tick();b.show(id,{x:0,y:0,width:800,height:600});b.touch(b.get(id));await b.command({action:'activate',id});b.list(true);
 assert.equal(b.state(b.get(id)).lastActivityAt,created);
 assert.notEqual(b.state(b.get(id)).lastTouchedAt,created);
 f.tick();const navigated=await b.command({action:'navigate',id,url:'https://example.test/next'});assert.ok(navigated.lastActivityAt>created);
 f.tick();const refreshed=await b.command({action:'reload',id});assert.ok(refreshed.lastActivityAt>navigated.lastActivityAt);
 f.tick();await b.unload(id);await b.command({action:'activate',id});assert.equal(b.state(b.get(id)).lastActivityAt,refreshed.lastActivityAt);
 f.tick();await b.command({action:'back',id});assert.ok(b.state(b.get(id)).lastActivityAt>refreshed.lastActivityAt);
});

test('preview Hide unloads Persist and shared tabs; Restore retains identity/history and stays unloaded until selected',async()=>{
 const f=fixture(),b=f.browser,info=await b.create('https://example.test/first'),id=info.id;
 await b.navigate(id,'https://example.test/second');const history=JSON.stringify(b.state(b.get(id),true).history),activity=b.state(b.get(id)).lastActivityAt;
 b.get(id).persist=true;b.get(id).shared=true;b.show(id,{x:0,y:0,width:800,height:600});
 const hidden=await b.command({action:'visibility',id,hidden:true});assert.equal(hidden.loaded,false);assert.equal(hidden.hidden,true);assert.equal(hidden.persist,true);assert.equal(hidden.id,id);
 const views=f.views();b.show(id);assert.equal(f.views(),views);await assert.rejects(b.command({action:'activate',id}),/Restore this hidden browser/);
 const restored=await b.command({action:'visibility',id,hidden:false});assert.equal(restored.loaded,false);assert.equal(f.views(),views);assert.equal(restored.lastActivityAt,activity);assert.equal(JSON.stringify(restored.history),history);
 f.tick();const selected=await b.command({action:'activate',id});assert.equal(selected.loaded,true);assert.equal(selected.id,id);assert.equal(selected.profileId,info.profileId);assert.equal(selected.lastActivityAt,activity);assert.equal(JSON.stringify(b.state(b.get(id),true).history),history);
});

test('preview Hide refuses active work and restores native visibility on failure',async()=>{
 for(const blocker of ['agentActions','downloads','audible','unsaved']){
  const f=fixture(),b=f.browser,{id}=await b.create('https://example.test/first'),tab=b.get(id),wc=tab.view.webContents;
  if(blocker==='agentActions')tab.agentActions=1;else if(blocker==='downloads')tab.downloads=new Set(['download']);else wc[blocker]=true;
  await assert.rejects(b.command({action:'visibility',id,hidden:true}),/active browser|Agent access|audio|unsaved work/);
  assert.equal(b.get(id).hidden,false);assert.equal(b.get(id).view.webContents,wc);assert.equal(wc.isDestroyed(),false);
 }
});

test('preview restore keeps saved activity or opened time, never old selection recency; hidden Persist restores without a view',async()=>{
 const f=fixture(),b=f.browser,openedAt='2026-10-10T12:00:00.000Z',lastTouchedAt='2026-10-16T12:00:00.000Z';
 const restored=await b.command({action:'create',restore:true,unloaded:true,hidden:true,persist:true,url:'https://example.test/',openedAt,lastTouchedAt});
 assert.equal(restored.lastActivityAt,openedAt);assert.equal(restored.loaded,false);assert.equal(f.views(),0);
 const saved='2026-10-11T12:00:00.000Z';await b.command({action:'sync-metadata',id:restored.id,lastActivityAt:saved,lastTouchedAt});assert.equal(b.state(b.get(restored.id)).lastActivityAt,saved);
 const unknown=await b.command({action:'create',restore:true,unloaded:true,url:'https://example.test/',lastTouchedAt});assert.equal(unknown.lastActivityAt,null);
 const visiblePersist=await b.command({action:'create',restore:true,unloaded:true,persist:true,url:'https://example.test/',lastActivityAt:saved});assert.equal(visiblePersist.loaded,false);assert.equal(visiblePersist.lastActivityAt,saved);
});

test('legacy broker without project capability does not expose activity/visibility and keeps Persist restore loading',async()=>{
 const f=fixture(false),b=f.browser,info=await b.command({action:'create',restore:true,unloaded:true,persist:true,url:'https://example.test/'});
 assert.equal(info.loaded,true);assert.equal(Object.hasOwn(info,'lastActivityAt'),false);assert.equal(Object.hasOwn(info,'hidden'),false);
 await assert.rejects(b.command({action:'visibility',id:info.id,hidden:true}),/visibility control is unavailable/);
 b.get(info.id).shared=true;assert.equal((await b.unload(info.id)).loaded,false);
});


test('preview workspace persistence retains validated logical history identities and revision without Chromium state',async()=>{
 const {normalizeSession}=require('../desktop/workspace-session.cjs');
 const history={entries:[{id:'entry-one',url:'https://example.test/one',title:'One',pageState:'private'},{id:'entry-two',url:'https://example.test/two',title:'Two'}],index:1,currentEntryId:'entry-two',revision:7,secret:'private'};
 const session={tabs:[{id:'browser',type:'browser',history}]},saved=normalizeSession(session,{preview:true}).tabs.find(tab=>tab.id==='browser').history;
 assert.deepEqual(saved,{entries:[{url:'https://example.test/one',title:'One',id:'entry-one'},{url:'https://example.test/two',title:'Two',id:'entry-two'}],index:1,currentEntryId:'entry-two',revision:7});
 assert.equal(normalizeSession(session).tabs.find(tab=>tab.id==='browser').history.entries[0].id,undefined,'Production normalization stays unchanged');
 for(const invalid of [{...history,currentEntryId:'wrong'},{...history,entries:history.entries.map(entry=>({...entry,id:'duplicate'}))},{...history,entries:[{...history.entries[0],id:'bad id'},history.entries[1]]}]){
  const value=normalizeSession({tabs:[{id:'browser',type:'browser',history:invalid}]},{preview:true}).tabs.find(tab=>tab.id==='browser').history;
  assert.equal(value.entries[0].id,undefined);assert.equal(value.entries.length,2,'Invalid metadata must not discard safe navigation');
 }
 const long={entries:Array.from({length:75},(_,index)=>({id:'entry-'+index,url:'https://example.test/'+index,title:'Page '+index})),index:40,currentEntryId:'entry-40',revision:99};
 const trimmed=normalizeSession({tabs:[{id:'browser',type:'browser',history:long}]},{preview:true}).tabs.find(tab=>tab.id==='browser').history;
 assert.equal(trimmed.entries.length,50);assert.equal(trimmed.entries[trimmed.index].id,'entry-40');assert.equal(trimmed.currentEntryId,'entry-40');assert.equal(trimmed.revision,99);
});

test('preview project deletion reparents loaded and hidden unloaded browsers without changing resource authority or activity',()=>{
 const b=fixture().browser,oldParent='project:local:deleted',newParent='workspace:local:workspace',destination={type:'project',id:'deleted',workspaceId:'workspace'},nextDestination={type:'workspace',id:'workspace'};
 const view={webContents:{identity:'same-live-page'}},history={entries:[{id:'entry',url:'https://example.test/',title:'Example'}],index:0},connection={identity:'same-automation'},snapshot={url:'https://example.test/',history,destination};
 const tabs=[{id:'live',parentId:oldParent,destination,view,logicalHistory:history,shared:true,developerShared:true,owner:'running-chat',resumeOwner:'prior-chat',profileId:'private-profile',agentActions:2,connection,lastActivityAt:123,lastTouchedAt:456,hidden:false,persist:true},{id:'hidden',parentId:oldParent,destination,view:null,snapshot,shared:false,owner:null,resumeOwner:'paused-chat',profileId:'default',agentActions:0,lastActivityAt:789,lastTouchedAt:987,hidden:true,persist:true},{id:'unrelated',parentId:'project:local:kept',destination:{type:'project',id:'kept'},view:null}];
 tabs.forEach(tab=>b.tabs.set(tab.id,tab));let broadcasts=0;b.changed=()=>broadcasts++;b.disconnect=()=>{throw Error('Must not disconnect');};b.command=()=>{throw Error('Must not transfer');};
 const originals=tabs.map(tab=>({...tab})),resolve=placement=>placement.parentId===oldParent?{parentId:newParent,destination:nextDestination}:placement;
 assert.deepEqual([...b.reparentPreviewProjects(resolve)],['live','hidden']);assert.equal(broadcasts,1);
 for(let index=0;index<2;index++){assert.equal(tabs[index].parentId,newParent);assert.deepEqual({...tabs[index].destination},nextDestination);for(const [key,value] of Object.entries(originals[index]))if(!['parentId','destination'].includes(key))assert.equal(tabs[index][key],value,key+' identity/state retained');}
 assert.deepEqual(tabs[2],originals[2]);assert.equal(b.state(tabs[1],true).destination.type,'workspace','Unloaded state must not publish obsolete snapshot placement');
 assert.deepEqual([...b.reparentPreviewProjects(resolve)],[]);assert.equal(broadcasts,1,'No-op reconciliation should not publish another state');
});

test('preview project reparent validates all replacements before mutation and a legacy broker never invokes the resolver',()=>{
 const b=fixture().browser,first={id:'first',parentId:'project:local:old'},second={id:'second',parentId:'project:local:old'};b.tabs.set(first.id,first);b.tabs.set(second.id,second);let calls=0;
 assert.throws(()=>b.reparentPreviewProjects(()=>++calls===1?{parentId:'workspace:local:one'}:{parentId:123}),/valid browser parent/);assert.equal(first.parentId,'project:local:old');assert.equal(second.parentId,first.parentId);
 assert.throws(()=>b.reparentPreviewProjects(async placement=>placement),/synchronously/);
 const production=fixture(false).browser;production.tabs.set(first.id,first);assert.deepEqual([...production.reparentPreviewProjects(()=>{throw Error('Not for legacy broker');})],[]);
});

test('preview create resolves deleted project placement after asynchronous initialization and load completion',async()=>{
 for(const unloaded of [false,true]){
  const b=fixture().browser,oldParent='project:local:removed',newParent='workspace:local:owner';let removed=false,release;
  const ready=new Promise(resolve=>release=resolve);b.cookieStores.set('default',{ready});
  b.options.resolvePreviewPlacement=placement=>removed&&placement.parentId===oldParent?{parentId:newParent,destination:{type:'workspace',id:'owner'}}:placement;
  const pending=b.create('https://example.test/',null,null,{parentId:oldParent,destination:{type:'project',id:'removed'},unloaded});removed=true;release();const created=await pending;
  assert.equal(created.parentId,newParent);assert.equal(created.destination.type,'workspace');assert.equal(created.loaded,!unloaded);
 }
 const b=fixture().browser,oldParent='project:local:late',newParent='workspace:local:owner';let removed=false,release,entered;
 const loading=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);b.options.resolvePreviewPlacement=placement=>removed?{parentId:newParent,destination:{type:'workspace',id:'owner'}}:placement;
 b.navigate=async id=>{entered();await loading;return b.state(b.get(id));};
 const pending=b.create('https://example.test/', 'agent-chat',null,{parentId:oldParent,destination:{type:'project',id:'late'}});await started;const tab=[...b.tabs.values()][0],view=tab.view;
 assert.equal(tab.parentId,oldParent);removed=true;release();const created=await pending;
 assert.equal(created.parentId,newParent);assert.equal(created.destination.type,'workspace');assert.equal(tab.view,view);assert.equal(tab.owner,'agent-chat');assert.equal(tab.associationChatId,'agent-chat');
});

test('preview agent open returns the current full route after a project is deleted during loading',async()=>{
 const b=fixture().browser,route={group:'main',parentId:'project:local:deleted',projectId:'deleted',projectName:'Deleted',workspaceId:'workspace',workspaceName:'Workspace',destination:{type:'project',id:'deleted',workspaceId:'workspace'},explicitParent:true,extra:'preserved'};
 let removed=false,release,entered;const loading=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);
 b.options.agentDestination=async()=>route;b.options.resolvePreviewPlacement=descriptor=>{
  if(!removed)return descriptor;
  const {projectId,projectName,...rest}=descriptor;
  return {...rest,parentId:'workspace:local:workspace',destination:{type:'workspace',id:'workspace'}};
 };
 b.navigate=async id=>{entered();await loading;return b.state(b.get(id));};
 const pending=b.performAgent({action:'open',url:'https://example.test/'},'running-chat');await started;removed=true;release();const result=await pending;
 assert.equal(result.parentId,'workspace:local:workspace');assert.equal(result.destination.parentId,result.parentId);assert.equal(result.destination.destination.type,'workspace');assert.equal(result.destination.workspaceId,'workspace');assert.equal(result.destination.projectId,undefined);assert.equal(result.destination.projectName,undefined);assert.equal(result.destination.extra,'preserved');assert.equal(result.destination.explicitParent,true);assert.equal(result.owner,'running-chat');assert.equal(route.projectId,'deleted','Do not mutate the captured route object');
});

test('explicit empty-history resolution acknowledges authority without unloading the live page and next navigation uses its revision',async()=>{
 const {browser:b}=fixture(),{id}=await b.create('https://example.test/pending'),tab=b.get(id),page=tab.view.webContents;
 const original=JSON.stringify(tab.logicalHistory);assert.equal(tab.navigationPending,true);
 const result=await b.command({action:'apply-history',id,url:'',history:{entries:[],index:-1,currentEntryId:null,revision:7},discardPending:true});
 assert.equal(result.navigationPending,false);assert.equal(page.getURL(),'https://example.test/pending');assert.equal(page.isDestroyed(),false);
 assert.equal(result.history.revision,7);assert.equal(result.history.entries.length,0);assert.equal(JSON.stringify(tab.recoveredNavigation),original);
 await b.navigate(id,'https://example.test/next');assert.equal(tab.logicalHistory.revision,7);assert.equal(tab.logicalHistory.entries.length,1);
});

test('overlay retains latest desired selection and bounds and reconciles before resurfacing',async()=>{
 const {browser:b}=fixture(),a=await b.create('https://example.test/old'),c=await b.create('https://example.test/new');
 b.window.webContents.focus=()=>{};b.show(a.id,{x:0,y:0,width:700,height:500});b.setOverlay('synthetic-modal',true);
 b.show(c.id,{x:20,y:30,width:600,height:400});assert.equal(b.active,c.id);assert.equal(b.bounds.x,20);
 assert.equal(b.get(a.id).view.getVisible(),false);assert.equal(b.get(c.id).view.getVisible(),false);
 b.setOverlay('synthetic-modal',false);assert.equal(b.get(a.id).view.getVisible(),false);assert.equal(b.get(c.id).view.getVisible(),true);assert.equal(b.get(c.id).view.getBounds().width,600);
});

test('hiding a browser returns keyboard focus only once in the foreground window',async()=>{
 const {browser:b}=fixture(),tab=await b.create('https://example.test/focus');let focused=true,calls=0;
 b.window.isFocused=()=>focused;b.window.webContents.focus=()=>calls++;
 b.show(tab.id,{x:0,y:0,width:700,height:500});b.show(null);assert.equal(calls,1);
 b.show(null);assert.equal(calls,1,'repeated layout does not move focus');
 focused=false;b.show(tab.id);b.show(null);assert.equal(calls,1,'background window does not steal focus');
});

test('one browser owner isolates simultaneous window selection, overlays and close without recreating the other page',async()=>{
 const {AsyncLocalStorage}=require('node:async_hooks'),scope=new AsyncLocalStorage(),f=fixture(),b=f.browser,first=b.window,second={...first,contentView:{addChildView(){},removeChildView(){}}};
 const registry={contexts:new Map([['main',{id:'main',window:first}],['22222222-2222-4222-8222-222222222222',{id:'22222222-2222-4222-8222-222222222222',window:second}]]),current(){return this.contexts.get(scope.getStore()||'main');},run(id,callback){return scope.run(id,callback);},bind(id,callback){return (...args)=>this.run(id,()=>callback(...args));}};
 first.webContents.focus=()=>{};b.installWindowContexts(registry,first);b.addWindow(second,'22222222-2222-4222-8222-222222222222');
 const firstInfo=await registry.run('main',()=>b.create('https://example.test/first'));
 const secondInfo=await registry.run('22222222-2222-4222-8222-222222222222',()=>b.create('https://example.test/second'));
 const one=b.get(firstInfo.id),two=b.get(secondInfo.id),original=two.view.webContents;
 registry.run('main',()=>b.show(one.id,{x:1,y:2,width:700,height:500}));
 registry.run('22222222-2222-4222-8222-222222222222',()=>b.show(two.id,{x:30,y:40,width:600,height:400}));
 assert.equal(one.view.getVisible(),true);assert.equal(two.view.getVisible(),true);
 registry.run('main',()=>b.setOverlay('dialog',true));assert.equal(one.view.getVisible(),false);assert.equal(two.view.getVisible(),true);
 await assert.rejects(registry.run('main',()=>b.command({action:'show',id:two.id})),/another app window/);
 const firstList=await registry.run('main',()=>b.command({action:'list'}));assert.deepEqual(Array.from(firstList,row=>row.id),[one.id]);
 await b.closeWindow('main');assert.equal(b.tabs.has(one.id),false);assert.equal(b.get(two.id).view.webContents,original);assert.equal(original.isDestroyed(),false);
});
