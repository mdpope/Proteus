import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
import {reconcileWindowSession} from '../public/shared/navigation/window-session-reconcile.js';
import {ContentTabs,workspaceContentScopes} from '../src/services/workspaces/content-tabs.js';
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
