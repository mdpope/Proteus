import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
import {reconcileWindowSession} from '../public/shared/navigation/window-session-reconcile.js';
import {ContentTabs,workspaceContentScopes} from '../src/services/workspaces/content-tabs.js';
import {restoreWindowContent} from '../desktop/windows/restore-content.js';
import {contentTabViews,windowContentTabId} from '../public/models/content-tab-descriptor.js';
const {WindowLayouts}=createRequire(import.meta.url)('../desktop/windows/window-layouts.cjs');
const setup=t=>{const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-window-layouts-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return {home,store:new WindowLayouts(home)};};
const sample={tabs:[{id:'overview',type:'overview'},{id:'project',type:'workspace',workspaceId:'workspace',projectId:'project'},{id:'view',contentTabId:'logical',type:'browser',parentId:'project',url:'https://example.test/old'}],active:'view',page:'context',chatDrafts:{chat:'Unsent draft'}};
test('window layouts preserve names, position, geometry, drafts and unknown metadata with conflict protection',t=>{
 const {store}=setup(t);store.rename('main','Review desk',0);const row=store.capture({windowId:'main',session:sample,positions:[['document:one',[['root',{top:105,left:0}]]]],bounds:{x:40,y:50,width:1000,height:700},kind:'closed'},1);
 assert.equal(row.name,'Review desk');const saved=store.snapshot(row.id);assert.equal(saved.session.chatDrafts.chat,'Unsent draft');assert.equal(saved.positions[0][1][0][1].top,105);
 const data=store.read();data.future={keep:true};fs.writeFileSync(store.file,JSON.stringify(data));store.renameLayout(row.id,'Later',data.revision);assert.deepEqual(store.read().future,{keep:true});assert.throws(()=>store.remove(row.id,data.revision),/changed/);assert.equal(store.read().layouts[0].name,'Later');
 store.remove(row.id,store.read().revision);assert.equal(store.read().layouts.length,0);assert.throws(()=>store.snapshot(row.id),/ENOENT/);
});
test('automatic snapshots retain twenty records without evicting named sessions; invalid storage is preserved',t=>{
 const {store}=setup(t),named=store.capture({windowId:'main',session:sample,kind:'named',name:'Retained'});
 for(let n=0;n<24;n++)store.capture({windowId:'main',session:sample,kind:'previous'});
 assert.equal(store.read().layouts.length,21);assert.ok(store.read().layouts.some(row=>row.id===named.id));assert.equal(fs.readdirSync(store.directory).length,21);
 fs.writeFileSync(store.file,'invalid');assert.throws(()=>store.read(),/preserved/);assert.equal(fs.readFileSync(store.file,'utf8'),'invalid');
});
test('window restore uses current shared tabs/history and falls back locally without changing independent main tabs',()=>{
 const current={revision:4,tabs:[{id:'logical',type:'browser',title:'Current',url:'https://example.test/current',history:{entries:[],index:-1,revision:8}}]};
 const input={...structuredClone(sample),tabs:[...sample.tabs,{id:'removed',contentTabId:'closed',type:'browser',parentId:'project'},{id:'standalone',type:'browser',url:'https://example.test/independent'}],active:'removed',team:{active:'team-old',tabs:[{id:'team-old',contentTabId:'closed',type:'browser'}]}};
 const result=reconcileWindowSession(input,()=>current);assert.equal(result.active,'project');assert.equal(result.tabs.find(tab=>tab.id==='view').url,current.tabs[0].url);assert.equal(result.tabs.find(tab=>tab.id==='standalone').url,'https://example.test/independent');assert.ok(!result.tabs.some(tab=>tab.id==='removed'));assert.equal(result.team.active,'overview');assert.equal(input.tabs.find(tab=>tab.id==='view').url,'https://example.test/old');
});
test('preview Team migration unions identities once, preserves matching-URL distinct tabs and leaves main window scopes independent',t=>{
 const {home}=setup(t),tabs=new ContentTabs(home),id='22222222-2222-4222-8222-222222222222',browser=id=>({id,type:'browser',title:'Same title',url:'https://example.test'});
 tabs.mutate({scope:'team',id:'team',expectedRevision:0,operations:[{action:'open',tab:browser('one')}]});tabs.mutate({scope:'team',id:'window:'+id,expectedRevision:0,operations:[{action:'open',tab:browser('two')}]});
 tabs.migrateWindowTeams();assert.deepEqual(tabs.get('team','team').tabs.map(tab=>tab.id),['one','two']);tabs.mutate({scope:'team',id:'team',expectedRevision:tabs.get('team','team').revision,operations:[{action:'close',id:'two'}]});tabs.migrateWindowTeams();assert.deepEqual(tabs.get('team','team').tabs.map(tab=>tab.id),['one']);
 const scopes=workspaceContentScopes({windowId:id,sharedTeam:true,tabs:[],team:{tabs:[]}});assert.equal(scopes.find(row=>row.scope==='team').id,'team');assert.equal(scopes.find(row=>row.scope==='main').id,'window:'+id);
});
test('saved-window projection materializes owner membership/order and keeps selected view IDs, drafts and complete Forward history',()=>{
 const history={entries:['a','b','c'].map(id=>({id,url:'https://example.test/'+id,title:id})),index:1,currentEntryId:'b',revision:7};
 const input={...structuredClone(sample),selectedChildren:{project:'view'},chatDrafts:{chat:'Unsent',other:'Retained'},tabs:[...sample.tabs,{id:'legacy-chat-view',type:'run',runId:'known',contentTabId:'stale-alias',parentId:'project'},{id:'closed',type:'browser',parentId:'project'},{id:'closed-child',type:'browser',parentId:'legacy-chat-view',url:'https://example.test/closed-child'}]};
 const current={revision:8,tabs:[{id:'chat:known',type:'chat',chatId:'known',title:'Known'},{id:'terminal:pty',type:'terminal',terminalId:'pty',title:'Existing PTY'},{id:'new',type:'browser',title:'New',url:history.entries[1].url,history},{id:'logical',type:'browser',title:'Current',url:history.entries[1].url,history,persist:true}]};
 const before=JSON.stringify(input),result=reconcileWindowSession(input,(scope,id)=>scope==='project'?current:{revision:1,tabs:[]});
 assert.deepEqual(result.tabs.filter(tab=>tab.parentId==='project').map(windowContentTabId),current.tabs.map(tab=>tab.id));
 assert.equal(result.active,'view');assert.deepEqual(result.selectedChildren,{project:'view'});assert.deepEqual(result.chatDrafts,input.chatDrafts);
 assert.equal(result.tabs.find(tab=>tab.contentTabId==='chat:known').id,'legacy-chat-view');assert.ok(!result.tabs.some(tab=>tab.id==='closed'||tab.id==='closed-child'));
 const browser=result.tabs.find(tab=>tab.contentTabId==='new');assert.deepEqual(browser.history,history);assert.equal(browser.unloaded,true);assert.equal(browser.loaded,false);
 assert.deepEqual(result.tabs.find(tab=>tab.contentTabId==='terminal:pty').terminal,{id:'pty'});assert.equal(JSON.stringify(input),before);
});
test('window projection leaves unknown, remote and intentionally closed scopes untouched without reading their owners',()=>{
 const closed={id:'closed-root',type:'workspace',projectId:'closed',workspaceId:'w',navigationClosed:true},remote={id:'remote-root',type:'workspace',workspaceId:'foreign',hostId:'peer'},uninitialized={id:'unknown-root',type:'workspace',workspaceId:'uninitialized'};
 const input={tabs:[{id:'overview',type:'overview'},closed,{id:'closed-chat',type:'run',runId:'private',parentId:closed.id},{id:'nested',type:'browser',parentId:'closed-chat'},remote,{id:'remote-chat',type:'run',runId:'foreign',parentId:remote.id},uninitialized,{id:'saved',type:'browser',parentId:uninitialized.id}],active:'saved'};
 const reads=[],result=reconcileWindowSession(input,(scope,id)=>{reads.push([scope,id]);return {revision:0,tabs:[]};});
 assert.deepEqual(reads,[['workspace','uninitialized']]);assert.deepEqual(result,input);
});
test('document restoration keeps source authorization identity and pending browser branches',()=>{
 const source='/synthetic/authorized/doc.md',history={entries:[{id:'pending',url:'https://example.test/pending'}],index:0,currentEntryId:'pending',revision:1};
 const input={tabs:[{id:'overview',type:'overview'},{id:'root',type:'workspace',workspaceId:'w'},{id:'legacy-doc',type:'markdown',file:source,parentId:'root'},{id:'browser-view',contentTabId:'browser',type:'browser',parentId:'root',navigationPending:true,url:history.entries[0].url,history}],active:'browser-view'};
 const owner={revision:1,tabs:[{id:'new-doc',type:'document',documentId:'new',title:'New document'},{id:'doc',type:'document',documentId:'existing',title:'Existing document'},{id:'browser',type:'browser',title:'Owner',url:'https://example.test/owner'}]};
 const result=reconcileWindowSession(input,()=>owner,{documentFile:(scope,id,tab)=>{assert.equal(scope,'workspace');assert.equal(id,'w');return tab.documentId==='existing'?source:'/synthetic/authorized/new.md';}});
 assert.equal(result.tabs.find(tab=>tab.contentTabId==='doc').id,'legacy-doc');assert.equal(result.tabs.find(tab=>tab.contentTabId==='new-doc').file,'/synthetic/authorized/new.md');
 assert.deepEqual(result.tabs.find(tab=>tab.id==='browser-view').history,history);assert.equal(result.tabs.find(tab=>tab.id==='browser-view').navigationPending,true);
 const unavailable=reconcileWindowSession(input,()=>owner);assert.equal(unavailable.tabs.find(tab=>tab.contentTabId==='new-doc').type,'unavailable');assert.equal(unavailable.tabs.find(tab=>tab.contentTabId==='browser').id,'browser-view');
});
test('tab strips expose one logical tab but preserve the selected window-local alias and original data',()=>{
 const tabs=[{id:'a',type:'run',runId:'chat',contentTabId:'old-alias'},{id:'browser-a',type:'browser',contentTabId:'browser',history:{entries:['old']}},{id:'b',type:'run',runId:'chat'},{id:'browser-b',type:'browser',contentTabId:'browser',history:{entries:['new']}}],before=structuredClone(tabs);
 assert.deepEqual(contentTabViews(tabs,'b').map(tab=>tab.id),['b','browser-a']);assert.deepEqual(contentTabViews(tabs,'browser-b').map(tab=>tab.id),['a','browser-b']);assert.deepEqual(tabs,before);
});
test('owner restore retrieves all paginated history even when the first response is its final window',async()=>{
 const entries=Array.from({length:451},(_,i)=>({id:'entry-'+i,url:'https://example.test/'+i})),initial={entries:entries.slice(400),index:40,currentEntryId:'entry-440',revision:7,offset:400,total:451,hasMore:false};
 const input={tabs:[{id:'overview',type:'overview'},{id:'project',type:'workspace',projectId:'p',workspaceId:'w'}],active:'project'},calls=[];
 const service={contentTabs:{get:()=>({revision:5}),getAsync:async()=>({revision:5,tabs:[{id:'browser',type:'browser',title:'Browser',url:entries[440].url,history:initial}]}),history:async value=>{calls.push(value);const offset=Number(value.cursor||0),part=entries.slice(offset,offset+200);return {entries:part,offset,total:451,revision:7,currentEntryId:'entry-440',hasMore:offset+part.length<451,nextCursor:String(offset+part.length)};}}};
 const result=await restoreWindowContent(input,service),browser=result.tabs.find(tab=>tab.type==='browser');assert.equal(calls.length,3);assert.deepEqual(browser.history.entries,entries);assert.equal(browser.history.index,440);assert.equal(browser.history.currentEntryId,'entry-440');assert.equal(browser.unloaded,true);
 service.contentTabs.history=async()=>({entries:[],offset:0,total:451,revision:8,currentEntryId:'entry-440',hasMore:true,nextCursor:'0'});
 const before=JSON.stringify(input);await assert.rejects(restoreWindowContent(input,service),/history changed/);assert.equal(JSON.stringify(input),before);
});
test('restore skips remote and closed descendants and rechecks every owner scope before producing a session',async()=>{
 const input={tabs:[{id:'project',type:'workspace',projectId:'p',workspaceId:'w'},{id:'workspace',type:'workspace',workspaceId:'w'},
  {id:'closed',type:'workspace',projectId:'closed',navigationClosed:true},{id:'closed-chat',type:'run',runId:'closed-chat',parentId:'closed'},
  {id:'remote',type:'workspace',hostId:'peer',projectId:'remote'},{id:'remote-chat',type:'run',runId:'remote-chat',parentId:'remote'}],active:'project'};
 const calls=[],before=structuredClone(input);let changed=false;
 const service={contentTabs:{getAsync:async(scope,id)=>{calls.push([scope,id]);if(id==='w')changed=true;return {revision:1,tabs:[]};},get:(scope,id)=>({revision:id==='p'&&changed?2:1})}};
 await assert.rejects(restoreWindowContent(input,service),/Shared tabs changed/);assert.deepEqual(calls,[['project','p'],['workspace','w']]);assert.deepEqual(input,before);
});
