import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {ContentTabs} from '../src/services/workspaces/content-tabs.js';import {TabManagement} from '../src/services/workspaces/tab-management.js';import {Engine} from '../src/engine.js';import {ContextStore} from '../src/services/workspaces/context.js';import {SettingsStore} from '../src/services/settings/settings.js';import {chatMembership} from '../public/features/chats/chat-membership.js';
function fixture(t){const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-manager-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));const settings=new SettingsStore(home,home),context=new ContextStore(home,settings),engine=new Engine(home),contentTabs=new ContentTabs(home);t.after(()=>engine.close());return {home,settings,context,engine,contentTabs};}
test('moving browser, terminal and viewer descriptors preserves identity, history, dates and source authority',async t=>{
 const service=fixture(t),manager=new TabManagement(service),source='default',created=service.context.copyWorkspace(source,'Target',service.context.get().revision),target=created.copiedWorkspaceId;
 const document=path.join(service.home,'fixture.md');fs.writeFileSync(document,'Synthetic viewer');service.contentTabs.rememberSources({tabs:[{id:'workspace',type:'workspace',workspaceId:source},{id:'view',type:'markdown',parentId:'workspace',file:document}]});
 const tabs=[{id:'browser',type:'browser',title:'Browser',url:'https://example.test',openedAt:'2026-10-13T12:00:00Z',lastTouchedAt:'2026-10-13T13:00:00Z',persist:true,history:{entries:[{id:'first',url:'https://example.test',title:'Browser'}],index:0}},{id:'terminal',type:'terminal',terminalId:'terminal',title:'Terminal'}];
 const {createHash}=await import('node:crypto');const documentId=createHash('sha256').update('workspace:'+source+'\0'+document).digest('hex');tabs.push({id:'document:'+documentId,type:'document',documentId,title:'Viewer'});
 service.contentTabs.mutate({scope:'workspace',id:source,expectedRevision:0,operations:tabs.map(tab=>({action:'open',tab}))});
 const calls=[];service.tabRuntime=async action=>calls.push(action);
 for(const tab of service.contentTabs.get('workspace',source).tabs){const from=service.contentTabs.get('workspace',source),to=service.contentTabs.get('workspace',target);await manager.handle({action:'move',scope:'workspace',id:source,tabId:tab.id,expectedRevision:from.revision,destination:{scope:'workspace',id:target,expectedRevision:to.revision}});}
 assert.equal(service.contentTabs.get('workspace',source).tabs.length,0);assert.equal(service.contentTabs.get('workspace',target).tabs.length,3);
 const browser=service.contentTabs.get('workspace',target).tabs[0];assert.equal(browser.persist,true);assert.equal(Date.parse(browser.openedAt),Date.parse(tabs[0].openedAt));assert.equal(browser.history.entries[0].id,'first');assert.equal(calls.filter(call=>call.action==='move').length,3);
 assert.equal(service.contentTabs.documentSource(target,documentId,'workspace'),document);
 const newScope=service.contentTabs.get('main','main');service.contentTabs.mutate({scope:'main',id:'main',expectedRevision:newScope.revision,operations:[{action:'open',tab:tabs[2]}]});assert.throws(()=>service.contentTabs.documentSource('main',documentId,'main'),/another chat/);
 const row=service.contentTabs.get('workspace',target);await assert.rejects(manager.handle({action:'close',scope:'workspace',id:target,tabId:browser.id,expectedRevision:row.revision-1}),/changed/);
});
test('workspace deletion preserves archived and active chats, closes hidden/persisted tabs and remains retryable after resource failure',async t=>{
 const service=fixture(t),manager=new TabManagement(service);const before=service.context.get(),source=before.defaultWorkspaceId,target=service.context.copyWorkspace(source,'Destination',before.revision).copiedWorkspaceId;
 const schedule={schemaVersion:1,id:'fixture',name:'Fixture',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:service.home,additionalDirectories:[]},misfire:'skip',prompt:'Fixture',context:service.context.capture({workspaceId:source})};
 const active=service.engine.createRun(schedule,'chat',null,{deferStart:true}),archived=service.engine.createRun({...schedule,id:'fixture-archived'},'chat',null,{deferStart:true});active.status='awaiting_input';active.pending={id:'pending',type:'question',question:'Synthetic question'};active.providerSessionId='session';service.engine.persist(active);archived.status='completed';archived.deferredStart=false;service.engine.persist(archived);service.engine.lifecycle(archived.id,'archive');
 service.contentTabs.mutate({scope:'workspace',id:source,expectedRevision:0,operations:[{action:'open',tab:{id:'browser',type:'browser',url:'https://example.test',title:'Pinned hidden',hidden:true,persist:true}},{action:'open',tab:{id:'terminal',type:'terminal',terminalId:'pty',title:'Terminal'}}]});
 let fail=true;const closed=new Set();service.tabRuntime=async value=>{if(value.action==='close'){if(fail){fail=false;throw new Error('Synthetic resource interruption');}closed.add(value.tab.id);}};
 const args={action:'delete-workspace',workspaceId:source,moveToWorkspaceId:target,expectedRevision:service.context.get().revision};
 await assert.rejects(manager.handle(args),/interruption/);assert.ok(service.context.scope(source));assert.equal(chatMembership(active).workspaceId,target);
 const result=await manager.handle(args);assert.equal(result.deleted,true);assert.deepEqual([...closed].sort(),['browser','terminal:pty']);assert.throws(()=>service.context.scope(source),/not found/);assert.ok(service.context.executionScope(source).deletedAt);
 assert.equal(active.status,'awaiting_input');assert.equal(active.pending.id,'pending');assert.equal(active.providerSessionId,'session');assert.equal(chatMembership(archived).workspaceId,target);assert.ok(archived.archivedAt);assert.equal(service.contentTabs.get('workspace',source).tabs.length,0);
 assert.doesNotThrow(()=>service.context.providerContext(active.schedule.context));
});
test('deleting the last workspace creates a fresh empty default and leaves its chats unhoused',async t=>{
 const service=fixture(t),manager=new TabManagement(service),config=service.context.get();await manager.handle({action:'delete-workspace',workspaceId:config.defaultWorkspaceId,moveToWorkspaceId:null,expectedRevision:config.revision});
 assert.equal(service.context.get().workspaces.length,1);assert.notEqual(service.context.get().defaultWorkspaceId,config.defaultWorkspaceId);assert.equal(service.context.get().workspaces[0].approvals.mode,'ask');
});


test('chat Move relocates canonical main placement without renderer sync, converges duplicate views and retains other metadata',async t=>{
 const service=fixture(t),manager=new TabManagement(service),target=service.context.copyWorkspace('default','Target',service.context.get().revision).copiedWorkspaceId;
 const run=service.engine.createRun({schemaVersion:1,id:'chat-placement',name:'Rehearsal',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:service.home,additionalDirectories:[]},misfire:'skip',prompt:'Rehearsal',context:service.context.capture({workspaceId:'default'})},'chat',null,{deferStart:true});run.status='completed';run.deferredStart=false;service.engine.persist(run);
 const chat={id:'chat:'+run.id,type:'chat',chatId:run.id,title:'Chat',customTitle:'Retained title',openedAt:'2026-10-14T12:00:00Z',hidden:true},browser={id:'paused-browser',type:'browser',title:'Paused',url:'https://example.test/paused'};
 service.contentTabs.mutate({scope:'main',id:'main',expectedRevision:0,operations:[{action:'open',tab:chat},{action:'open',tab:browser}]});
 const mainBrowser=service.contentTabs.get('main','main').tabs[1];service.tabRuntime=async()=>{};
 await manager.handle({action:'move-chat',chatId:run.id,workspaceId:target});assert.equal(service.contentTabs.get('main','main').tabs.length,1);assert.deepEqual(service.contentTabs.get('main','main').tabs[0],mainBrowser);const moved=service.contentTabs.get('workspace',target).tabs[0];assert.equal(moved.chatId,run.id);assert.equal(moved.customTitle,chat.customTitle);assert.equal(moved.openedAt,new Date(chat.openedAt).toISOString());assert.equal(moved.hidden,true);
 service.contentTabs.mutate({scope:'main',id:'main',expectedRevision:service.contentTabs.get('main','main').revision,operations:[{action:'open',tab:chat}]});await manager.handle({action:'move-chat',chatId:run.id,workspaceId:target});assert.equal(service.contentTabs.list({type:'chat'}).filter(tab=>tab.chatId===run.id).length,1);const revision=service.contentTabs.get('workspace',target).revision;await manager.handle({action:'move-chat',chatId:run.id,workspaceId:target});assert.equal(service.contentTabs.get('workspace',target).revision,revision);
 await manager.handle({action:'move-chat',chatId:run.id,workspaceId:null});assert.equal(service.contentTabs.get('workspace',target).tabs.length,0);assert.ok(service.contentTabs.get('main','main').tabs.some(tab=>tab.chatId===run.id));
});

test('preview browser hide applies native guard before persistence and rolls back failed persistence',async t=>{
 const service=fixture(t);service.desktopPreview={};const manager=new TabManagement(service),scope={scope:'main',id:'main'};
 service.contentTabs.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:{id:'guarded',type:'browser',title:'Synthetic',url:'https://example.test'}}]});
 const initial=service.contentTabs.get(scope.scope,scope.id),calls=[];let nativeFailure=true;
 service.tabRuntime=async value=>{calls.push({action:value.action,nativeOnly:value.nativeOnly,notifyOnly:value.notifyOnly,hidden:service.contentTabs.get(scope.scope,scope.id).tabs[0]?.hidden===true});if(nativeFailure)throw new Error('Synthetic unsaved form');};
 const args={...scope,action:'hide',tabId:'guarded',expectedRevision:initial.revision};
 await assert.rejects(manager.handle(args),/unsaved form/);assert.equal(service.contentTabs.get(scope.scope,scope.id).revision,initial.revision);assert.equal(calls[0].nativeOnly,true);
 nativeFailure=false;calls.length=0;const mutate=service.contentTabs.mutateAsync.bind(service.contentTabs);service.contentTabs.mutateAsync=async()=>{throw new Error('Synthetic save failure');};
 await assert.rejects(manager.handle(args),/save failure/);assert.deepEqual(calls.map(call=>[call.action,call.nativeOnly,call.hidden]),[['hide',true,false],['restore',true,false]]);
 service.contentTabs.mutateAsync=mutate;calls.length=0;await manager.handle(args);assert.deepEqual(calls.map(call=>[call.action,call.nativeOnly,call.hidden]),[['hide',true,false],['hide',undefined,true]]);
 assert.equal(calls[1].notifyOnly,true);const hidden=service.contentTabs.get(scope.scope,scope.id);assert.equal(hidden.tabs[0].hidden,true);
 calls.length=0;await assert.rejects(manager.handle({...args,expectedRevision:initial.revision}),/changed/);assert.equal(calls.length,0);
});

test('preview visibility keeps optimistic revision protection across native work',async t=>{
 const service=fixture(t);service.desktopPreview={};const manager=new TabManagement(service),scope={scope:'main',id:'main'};
 service.contentTabs.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:{id:'race',type:'browser',title:'Synthetic',url:'https://example.test',hidden:true}}]});
 const initial=service.contentTabs.get(scope.scope,scope.id),calls=[];
 service.tabRuntime=async value=>{calls.push(value.action);if(calls.length===1)service.contentTabs.mutate({...scope,expectedRevision:initial.revision,operations:[{action:'open',tab:{id:'other',type:'browser',title:'Concurrent',url:'https://example.test/other'}}]});};
 await assert.rejects(manager.handle({...scope,action:'restore',tabId:'race',expectedRevision:initial.revision}),/changed/);
 assert.deepEqual(calls,['restore','hide']);const after=service.contentTabs.get(scope.scope,scope.id);assert.equal(after.tabs.find(tab=>tab.id==='race').hidden,true);assert.ok(after.tabs.find(tab=>tab.id==='other'));
});

test('browser load/unload uses current owner identity and leaves placement, visibility and history intact',async t=>{
 const service=fixture(t),manager=new TabManagement(service),scope={scope:'main',id:'main'};
 service.contentTabs.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:{id:'sleeping',type:'browser',title:'Hidden fixture',url:'https://example.test/',hidden:true}},{action:'open',tab:{id:'terminal',type:'terminal',terminalId:'terminal',title:'Keep running'}}]});
 const before=service.contentTabs.get(scope.scope,scope.id),calls=[];
 service.tabRuntime=async value=>{calls.push(value);return {id:value.tab.id,loaded:value.action==='load',hidden:true};};
 for(const action of ['load','unload']){const result=await manager.handle({...scope,action,tabId:'sleeping',expectedRevision:before.revision});assert.equal(result.browser.loaded,action==='load');assert.equal(result.browser.hidden,true);assert.deepEqual(service.contentTabs.get(scope.scope,scope.id),before);}
 await assert.rejects(manager.handle({...scope,action:'load',tabId:'sleeping',expectedRevision:before.revision-1}),/changed/);
 await assert.rejects(manager.handle({...scope,action:'unload',tabId:before.tabs.find(tab=>tab.type==='terminal').id,expectedRevision:before.revision}),/browser pages/);assert.equal(calls.length,2);
 delete service.tabRuntime;await assert.rejects(manager.handle({...scope,action:'load',tabId:'sleeping',expectedRevision:before.revision}),/unavailable/);
});

test('multiwindow runtime aliases enrich one logical tab while shell inventory retains distinct views',async t=>{const service=fixture(t),manager=new TabManagement(service);service.contentTabs.mutate({scope:'main',id:'main',expectedRevision:0,operations:[{action:'open',tab:{id:'shared',type:'browser',url:'https://example.test',title:'Shared'}}]});service.tabInventory=()=>['one','two'].map(windowId=>({id:'view:'+windowId+':native',logicalId:'shared',windowId,runtimeId:'native',scope:'shell',scopeId:'shell',type:'browser'}));const list=await manager.handle({action:'list'});assert.equal(list.tabs.length,1);assert.equal(list.tabs[0].id,'shared');assert.equal(list.tabs[0].views.length,2);assert.equal((await manager.handle({action:'list',scope:'shell'})).tabs.length,2);});
