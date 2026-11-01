import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {ContentTabs} from '../src/services/workspaces/content-tabs.js';
import {createTabSynchronizer} from '../public/models/content-tab-sync.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {logicalBrowserCloser} from '../desktop/browser/logical-close.js';
const scope={scope:'project',id:'synthetic-project'},tab={id:'synthetic-tab',type:'browser',title:'Synthetic',url:'https://example.test/'};
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
function fixture(t){const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-tombstones-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));const owner=new ContentTabs(home);const mutate=operations=>owner.mutate({...scope,expectedRevision:owner.get(scope.scope,scope.id).revision,operations});mutate([{action:'open',tab}]);return {home,owner,mutate};}

test('Close survives plain opens, delayed snapshots, restart and stale explicit reopen',t=>{
 const {home,owner,mutate}=fixture(t);let current=mutate([{action:'close',id:tab.id}]);const closedRevision=current.closed[tab.id];
 current=mutate([{action:'open',tab},{action:'reorder',ids:[tab.id]}]);assert.equal(current.tabs.length,0);
 assert.equal(new ContentTabs(home).get(scope.scope,scope.id).closed[tab.id],closedRevision);
 const retained=JSON.parse(fs.readFileSync(owner.file));retained.scopes['project:'+scope.id].tabs.push(tab);retained.scopes['project:'+scope.id].revision++;
 fs.writeFileSync(owner.file,JSON.stringify(retained));assert.equal(new ContentTabs(home).get(scope.scope,scope.id).tabs.length,0,'a downlevel writer cannot override a retained Close on upgrade');

 current=mutate([{action:'reopen',tab,closedRevision}]);assert.equal(current.tabs.length,1);
 current=mutate([{action:'close',id:tab.id}]);assert.ok(current.closed[tab.id]>closedRevision);
 current=mutate([{action:'reopen',tab,closedRevision}]);assert.equal(current.tabs.length,0,'old explicit reopen cannot override a later Close');
});

test('native Close resolves logical membership and does not cross remote owner boundaries',async t=>{
 const {owner}=fixture(t),close=logicalBrowserCloser({contentTabs:owner});
 await close({id:'window-private-view',thumbnailId:tab.id,parentId:'project:foreign:'+scope.id});assert.equal(owner.get(scope.scope,scope.id).tabs.length,1);
 await close({id:'window-private-view',thumbnailId:tab.id,parentId:'project:local:'+scope.id});assert.equal(owner.get(scope.scope,scope.id).tabs.length,0);assert.ok(owner.get(scope.scope,scope.id).closed[tab.id]);
 await close({id:'window-private-view',thumbnailId:tab.id,parentId:'project:local:'+scope.id});assert.equal(owner.get(scope.scope,scope.id).revision,2,'repeated native cleanup is a no-op');
});

test('explicit close publishes before first baseline despite unavailable document hydration',async t=>{
 const {owner}=fixture(t);let local=[structuredClone(tab)],clock=0,fail=true;const saved=storage();
 const sync=createTabSynchronizer({pendingStorage:saved,now:()=>clock,scopes:()=>[scope],readLocal:async()=>structuredClone(local),apply:async(_scope,tabs,_captured,options={})=>{if(options.membershipOnly){local=local.filter(tab=>!options.removedIds.includes(tab.id));return;}if(fail)throw Error('Synthetic unavailable source');local=structuredClone(tabs);},request:async(_scope,action,args)=>action==='get'?owner.get(scope.scope,scope.id):owner.mutate({...scope,...args})});
 await sync.sync(scope);sync.close(scope,tab.id);local=[];clock=61000;await sync.sync(scope);
 assert.equal(owner.get(scope.scope,scope.id).tabs.length,0);assert.ok(owner.get(scope.scope,scope.id).closed[tab.id]);
 fail=false;clock+=61000;await sync.sync(scope);assert.equal(local.length,0);
});

test('native child Close resolves a window chat alias before parsing project prefixes',async t=>{
 const {owner}=fixture(t),alias='project:local:synthetic-project:chat:synthetic-chat';
 owner.mutate({scope:'chat',id:'synthetic-chat',expectedRevision:0,operations:[{action:'open',tab}]});
 const sessions=[{id:'main',session:{tabs:[{id:alias,type:'remote-run',runId:'foreign-chat',hostId:'foreign'}]}},{id:'second',session:{tabs:[{id:alias,type:'run',runId:'synthetic-chat'}]}}];
 const close=logicalBrowserCloser({contentTabs:owner,navigationSessions:()=>sessions});
 await close({id:'view',thumbnailId:tab.id,parentId:alias,windowId:'main'});
 assert.equal(owner.get('chat','synthetic-chat').tabs.length,1,'a remote parent never mutates local membership');
 await close({id:'view',thumbnailId:tab.id,parentId:alias,windowId:'second'});
 assert.equal(owner.get('chat','synthetic-chat').tabs.length,0);
 assert.ok(owner.get('chat','synthetic-chat').closed[tab.id]);
 assert.equal(owner.get(scope.scope,scope.id).tabs.length,1,'same logical ID in another scope is preserved');
});

test('navigation quarantine does not quarantine human Close or later project additions',async t=>{
 const {owner,mutate}=fixture(t);let local=[structuredClone(tab)],reject=true;const saved=storage();
 const sync=createTabSynchronizer({pendingStorage:saved,scopes:()=>[scope],readLocal:async()=>structuredClone(local),apply:async(_scope,tabs,_captured,options={})=>{local=options.membershipOnly?local.filter(tab=>!options.removedIds.includes(tab.id)):structuredClone(tabs);},request:async(_scope,action,args)=>{if(action==='get')return owner.get(scope.scope,scope.id);if(reject&&args.operations.some(op=>op.action!=='close'))throw Object.assign(Error('Synthetic navigation conflict'),{code:'NAVIGATION_CONFLICT'});return owner.mutate({...scope,...args});}});
 await sync.sync(scope);local[0].title='Changed';await sync.sync(scope);assert.equal(sync.hasConflict(scope),true);
 sync.close(scope,tab.id);local=[];await sync.sync(scope);assert.equal(owner.get(scope.scope,scope.id).tabs.length,0);
 reject=false;mutate([{action:'open',tab:{...tab,id:'new-tab'}}]);await sync.sync(scope);assert.deepEqual(local.map(tab=>tab.id),['new-tab']);
});

test('Close before owner registration prevents a delayed first open from reviving the tab',async t=>{
 const {owner}=fixture(t),unregistered={...tab,id:'not-yet-registered'};
 const sync=createTabSynchronizer({pendingStorage:storage(),scopes:()=>[scope],readLocal:async()=>[],apply:async()=>{},request:async(_scope,action,args)=>action==='get'?owner.get(scope.scope,scope.id):owner.mutate({...scope,...args})});
 sync.close(scope,unregistered.id);await sync.sync(scope);
 let current=owner.get(scope.scope,scope.id);assert.ok(current.closed[unregistered.id]);
 current=owner.mutate({...scope,expectedRevision:current.revision,operations:[{action:'open',tab:unregistered}]});
 assert.ok(!current.tabs.some(row=>row.id===unregistered.id));
 const close=logicalBrowserCloser({contentTabs:owner});
 await close({id:'another-not-yet-registered',parentId:'project:local:'+scope.id});
 assert.ok(owner.get(scope.scope,scope.id).closed['another-not-yet-registered']);
});
