import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import {cleanupStack} from './helpers/cleanup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { BrowserHistory } from '../src/browser-history.js';
import { ContentTabs } from '../src/content-tabs.js';
async function setup(t) {
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-canonical-tabs-')),history=new BrowserHistory(home,{hostId:'owner'});await history.ready;
 let changed=0;const tabs=new ContentTabs(home,{history,onChange:()=>changed++}),cleanup=cleanupStack(t);cleanup(()=>fs.rmSync(home,{recursive:true,force:true}));cleanup(()=>history.close());
 return {tabs,history,home,cleanup,changed:()=>changed};
}
const scope={scope:'chat',id:'synthetic'},browser={id:'browser-one',type:'browser',title:'Example',url:'https://example.test/a'};
const nav=(id,revision,extra={})=>({action:'browser-navigate',tabId:browser.id,operationId:id,entryId:id,baseRevision:revision,url:'https://example.test/'+id,visitedAt:'2026-10-12T12:00:00Z',...extra});

test('legacy descriptor migration is no-visit, polling emits nothing, and blank restored tabs do not dereference an index',async t=>{
 const {tabs,history,changed}=await setup(t);tabs.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:browser},{action:'open',tab:{...browser,id:'blank',url:''}}]});
 const saved=fs.readFileSync(tabs.file);let historyChanges=0;history.on('changed',()=>historyChanges++);
 for(let i=0;i<4;i++){const value=await tabs.getAsync(scope.scope,scope.id);assert.equal(value.tabs[0].history.index,0);assert.equal(value.tabs[1].url,'');}
 assert.equal(historyChanges,0);assert.equal(changed(),1);assert.equal((await history.query()).total,0);assert.deepEqual(fs.readFileSync(tabs.file),saved);
});

test('canonical operations persist through duplicate retry/restart, conflict preserves current, and Back retains Forward',async t=>{
 const {tabs,history,home,cleanup,changed}=await setup(t);await tabs.mutateAsync({...scope,expectedRevision:0,operations:[{action:'open',tab:browser}]});
 const operation=nav('b',0);let value=await tabs.mutateAsync({...scope,operations:[operation]});assert.equal(value.tabs[0].history.revision,1);const events=changed();
 await tabs.mutateAsync({...scope,operations:[operation]});assert.equal(changed(),events);assert.equal((await history.query()).total,1);
 const first=value.tabs[0].history.entries[0].id;value=await tabs.mutateAsync({...scope,operations:[nav('back',1,{action:'browser-traverse',entryId:first})]});assert.equal(value.tabs[0].history.index,0);assert.equal(value.tabs[0].history.entries.length,2);
 await assert.rejects(tabs.mutateAsync({...scope,operations:[nav('stale',1)]}),/Navigation changed/);assert.equal((await tabs.getAsync(scope.scope,scope.id)).tabs[0].history.index,0);
 await history.close();const restarted=new BrowserHistory(home,{hostId:'owner'});cleanup(()=>restarted.close());const restored=new ContentTabs(home,{history:restarted});assert.equal((await restored.getAsync(scope.scope,scope.id)).tabs[0].history.index,0);assert.equal((await restarted.query()).total,2);
});

test('metadata snapshots cannot clear or replace authoritative navigation and closed tabs reject pending navigation',async t=>{
 const {tabs,history}=await setup(t);await tabs.mutateAsync({...scope,expectedRevision:0,operations:[{action:'open',tab:browser}]});
 let value=await tabs.mutateAsync({...scope,operations:[nav('b',0)]});const metadata=fs.readFileSync(tabs.file,'utf8');
 value=await tabs.mutateAsync({...scope,expectedRevision:value.revision,operations:[{action:'open',tab:{...browser,url:'',title:'Renamed',customTitle:'Renamed',history:undefined}}]});
 assert.equal(value.tabs[0].url,'https://example.test/b');assert.equal(value.tabs[0].history.entries.length,2);assert.equal(value.tabs[0].title,'Renamed');assert.equal(JSON.parse(fs.readFileSync(tabs.file,'utf8')).scopes['chat:synthetic'].tabs[0].url,JSON.parse(metadata).scopes['chat:synthetic'].tabs[0].url);
 await tabs.mutateAsync({...scope,expectedRevision:value.revision,operations:[{action:'close',id:browser.id}]});await assert.rejects(tabs.mutateAsync({...scope,operations:[nav('late',1)]}),/no longer open/);assert.equal((await history.query()).total,1);
});

test('navigation pages identify current position without rewriting descriptor metadata and stale page cursors reject',async t=>{
 const {tabs,history}=await setup(t);tabs.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:browser}]});await tabs.getAsync(scope.scope,scope.id);
 for(let i=0;i<6;i++)await tabs.mutateAsync({...scope,operations:[nav('page-'+i,i)]});
 const page=await tabs.history({...scope,tabId:browser.id,start:true,limit:2});assert.equal(page.offset,0);assert.equal(page.total,7);assert.equal(page.hasMore,true);assert.equal(page.history.index,-1);
 const next=await tabs.history({...scope,tabId:browser.id,cursor:page.nextCursor,limit:2});assert.equal(next.offset,2);assert.notEqual(page.entries[0].id,next.entries[0].id);
 await tabs.mutateAsync({...scope,operations:[nav('changed',6)]});await assert.rejects(tabs.history({...scope,tabId:browser.id,cursor:page.nextCursor,limit:2}),/changed while paging/);
});

test('main scope is host-local, preserves workspace separation, and accepts shared chat placement',async t=>{
 const {tabs,history}=await setup(t);tabs.seedWorkspace({tabs:[{...browser,type:'browser',label:'Main'},{...browser,id:'workspace-child',type:'browser',parentId:'workspace-parent',label:'Workspace'},{id:'workspace-parent',type:'workspace',workspaceId:'separate'}]});
 assert.equal((await tabs.getAsync('main','main')).tabs[0].id,browser.id);assert.equal((await tabs.getAsync('workspace','separate')).tabs[0].id,'workspace-child');
 const value=await tabs.mutateAsync({scope:'main',id:'main',operations:[nav('standalone',0)]});assert.equal(value.tabs[0].url,'https://example.test/standalone');assert.equal((await tabs.getAsync('workspace','separate')).tabs[0].url,browser.url);
 assert.equal((await history.query()).items[0].tabId,browser.id);
 const placed=await tabs.mutateAsync({scope:'main',id:'main',expectedRevision:value.revision,operations:[{action:'open',tab:{id:'chat:x',type:'chat',chatId:'x',title:'Main chat'}}]});assert.equal(placed.tabs.find(tab=>tab.id==='chat:x').chatId,'x');assert.equal((await tabs.getAsync('workspace','separate')).tabs.length,1);
 assert.throws(()=>tabs.get('main','another'),/explicit/);
});

test('native raw-tab outbox and owner-namespaced navigation deduplicate in either arrival order',async t=>{
 const {tabs,history}=await setup(t);const second={...browser,id:'browser-two'};await tabs.mutateAsync({...scope,expectedRevision:0,operations:[{action:'open',tab:browser},{action:'open',tab:second}]});
 for(const [tab,index] of [browser,second].map((tab,index)=>[tab,index])){
   const operation={...nav('native-'+index,0),tabId:tab.id,sourceHostId:'owner'},outbox={eventId:operation.operationId,url:operation.url,title:'Native title',visitedAt:operation.visitedAt,sourceHostId:'owner',profileId:'default',tabId:tab.id,entryId:operation.entryId};
   if(index===0)await history.record({events:[outbox]});await tabs.mutateAsync({...scope,operations:[operation]});await history.record({events:[outbox]});
   const row=(await history.query()).items.find(item=>item.eventId===outbox.eventId);assert.equal(row.tabId,tab.id);assert.equal(row.entryId,operation.entryId);
 }
 assert.equal((await history.query()).total,2);
});

test('selected navigation title replaces stale descriptor title while an explicit custom title remains stable',async t=>{
 const {tabs}=await setup(t);await tabs.mutateAsync({...scope,expectedRevision:0,operations:[{action:'open',tab:browser}]});
 let result=await tabs.mutateAsync({...scope,operations:[nav('new-title',0,{title:'New page title'})]});assert.equal(result.tabs[0].title,'New page title');
 result=await tabs.mutateAsync({...scope,expectedRevision:result.revision,operations:[{action:'rename',id:browser.id,title:'Custom label'}]});
 result=await tabs.mutateAsync({...scope,operations:[nav('later',1,{title:'Later page title'})]});assert.equal(result.tabs[0].title,'Custom label');assert.equal(result.tabs[0].history.entries[result.tabs[0].history.index].title,'Later page title');
});

test('hydrating 100 browser tabs bounds worker concurrency instead of exhausting its 64-request transport',async t=>{
 const {tabs,history}=await setup(t);tabs.mutate({...scope,expectedRevision:0,operations:Array.from({length:100},(_,i)=>({action:'open',tab:{...browser,id:'bounded-'+i,url:'https://example.test/'+i}}))});
 let peak=0;const dispatch=history.client.dispatch.bind(history.client);history.client.dispatch=(...args)=>{const result=dispatch(...args);peak=Math.max(peak,history.client.requests.size);return result;};
 const result=await tabs.getAsync(scope.scope,scope.id);assert.equal(result.tabs.length,100);assert.ok(peak<=16,'Hydration must bound concurrent worker requests.');assert.ok(result.tabs.every(tab=>tab.history.entries[tab.history.index].url===tab.url));
});


test('moving browser placement retains its full Back/Forward stack and returning does not revive an older destination stack',async t=>{
 const {tabs,history}=await setup(t);await tabs.mutateAsync({...scope,expectedRevision:0,operations:[{action:'open',tab:browser}]});
 await tabs.mutateAsync({...scope,operations:[nav('b',0)]});let row=await tabs.mutateAsync({...scope,operations:[nav('c',1)]});
 row=await tabs.mutateAsync({...scope,operations:[nav('back',2,{action:'browser-traverse',entryId:'b'})]});
 const visits=(await history.query()).total;
 const move=async(from,to)=>{const source=tabs.get(from.scope,from.id),target=tabs.get(to.scope,to.id);return tabs.moveAsync({...from,tabId:browser.id,expectedRevision:source.revision,destination:{...to,expectedRevision:target.revision}});};
 const main={scope:'main',id:'main'};await move(scope,main);let moved=(await tabs.getAsync('main','main')).tabs[0];assert.deepEqual(moved.history.entries.map(entry=>entry.id),row.tabs[0].history.entries.map(entry=>entry.id));assert.equal(moved.history.currentEntryId,'b');assert.equal((await history.query()).total,visits);
 await tabs.mutateAsync({...main,operations:[nav('forward',moved.history.revision,{action:'browser-traverse',entryId:'c'})]});await move(main,scope);moved=(await tabs.getAsync(scope.scope,scope.id)).tabs[0];assert.equal(moved.history.currentEntryId,'c');
 await move(scope,main);moved=(await tabs.getAsync('main','main')).tabs[0];assert.equal(moved.history.currentEntryId,'c');assert.equal(moved.history.entries.length,3);assert.equal((await history.query()).total,visits+1,'Only explicit Forward records a visit; three moves do not');
 await assert.rejects(tabs.mutateAsync({...main,operations:[nav('b',0,{url:'https://example.test/different'})]}),error=>error.code==='NAVIGATION_OPERATION_CONFLICT');
});

test('an empty relocated stack retains its authoritative revision for the first pending navigation',async t=>{
 const {tabs}=await setup(t),source={scope:'workspace',id:'empty-source'},destination={scope:'project',id:'empty-target'};
 await tabs.mutateAsync({...source,expectedRevision:0,operations:[{action:'open',tab:{...browser,url:''}}]});
 await tabs.moveAsync({...source,tabId:browser.id,expectedRevision:tabs.get(source.scope,source.id).revision,destination:{...destination,expectedRevision:0}});
 const owner=await tabs.getAsync(destination.scope,destination.id),before=owner.tabs[0];
 assert.equal(before.history.revision,1);assert.deepEqual(before.history.entries,[]);assert.equal(before.history.index,-1);
 const {tabChanges}=await import('../public/content-tab-sync.js'),entry={id:'first-after-move',url:'https://example.test/first',title:'First'};
 const operations=tabChanges(owner.tabs,[{...before,url:entry.url,navigationPending:true,history:{...before.history,entries:[entry],index:0,currentEntryId:entry.id}}],{navigation:true});
 const op=operations.find(item=>item.action==='browser-navigate');assert.equal(op.baseRevision,1);
 const committed=await tabs.mutateAsync({...destination,operations:[op]});assert.equal(committed.tabs[0].history.revision,2);assert.equal(committed.tabs[0].url,entry.url);
 const replay=await tabs.mutateAsync({...destination,operations:[op]});assert.deepEqual(replay.tabs[0].history,committed.tabs[0].history);
});

test('an empty stale relocation cannot overwrite an existing populated destination history',async t=>{
 const {history}=await setup(t);
 await history.navigation({action:'seed',tabId:'empty-copy',url:''});await history.navigation({action:'seed',tabId:'full-copy',url:'https://example.test/preserved'});
 await assert.rejects(history.relocateNavigation({source:'empty-copy',target:'full-copy'}),/Destination retains browser history/);
 assert.equal((await history.navigationGet({tabId:'full-copy'})).url,'https://example.test/preserved');
});
