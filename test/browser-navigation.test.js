import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {browserDestination,browserDestinations} from '../src/browser-destinations.js';
const {restoreNavigation,commitNavigation,traverseNavigation}=createRequire(import.meta.url)('../desktop/browser-navigation.cjs');

test('logical traversal keeps Forward entries and a new address branches without mutating the old stack',()=>{
 const tab={};const first=commitNavigation(tab,'https://example.test/one','One');commitNavigation(tab,'https://example.test/two','Two');const third=commitNavigation(tab,'https://example.test/three','Three');
 const saved=structuredClone(tab.logicalHistory);traverseNavigation(tab,1);assert.equal(tab.logicalHistory.entries[2].id,third.id);assert.equal(tab.logicalHistory.currentEntryId,saved.entries[1].id);
 commitNavigation(tab,'https://example.test/branch','Branch');assert.equal(tab.logicalHistory.entries.length,3);assert.equal(tab.logicalHistory.entries[0].id,first.id);assert.equal(saved.entries[2].id,third.id);assert.notEqual(tab.logicalHistory.entries[2].id,third.id);
});

test('mirrors keep their selection while actual redirect callback URLs remain distinct history entries',()=>{
 const tab={};commitNavigation(tab,'https://example.test/home','Home');const before=structuredClone(tab.logicalHistory);tab.navigationPending=false;tab.applyingShared=true;
 assert.equal(commitNavigation(tab,'https://example.test/mirror','Mirror'),null);assert.deepEqual(tab.logicalHistory,before);assert.equal(tab.navigationPending,false);
 tab.applyingShared=false;const redirected=commitNavigation(tab,'https://example.test/oauth/callback?code=fixture','Callback',{redirect:true});assert.equal(redirected.url,'https://example.test/oauth/callback?code=fixture');assert.equal(tab.logicalHistory.entries[0].url,before.entries[0].url);assert.equal(tab.logicalHistory.entries.length,2);
});

test('portable history restore retains full list, stable identity and revision without engine page state',()=>{
 const entries=Array.from({length:90},(_,i)=>({id:'entry-'+i,url:'https://example.test/'+i,title:String(i),pageState:'private'}));const restored=restoreNavigation({entries,index:40,revision:17});assert.equal(restored.entries.length,90);assert.equal(restored.currentEntryId,'entry-40');assert.equal(restored.revision,17);assert.equal(restored.entries[0].pageState,undefined);assert.equal(restoreNavigation({entries,index:99}),null);
});

test('workspace agent destinations default from saved run context and explicit routes preserve ownership',()=>{
 const service={engine:{getRun:()=>({context:{workspaceId:'alpha'}})},context:{get:()=>({workspaces:[{id:'alpha',name:'Alpha'},{id:'beta',name:'Beta'}]})}};
 assert.deepEqual(browserDestinations(service,'chat').defaultDestination,{type:'workspace',id:'alpha'});assert.equal(browserDestination(service,'chat').parentId,'workspace:local:alpha');assert.equal(browserDestination(service,'chat',{type:'workspace',id:'beta'}).parentId,'workspace:local:beta');assert.equal(browserDestination(service,'chat',{type:'application'}).parentId,null);assert.equal(browserDestination(service,'chat',{type:'chat'}).parentId,'chat');assert.throws(()=>browserDestination(service,'chat',{type:'chat',id:'other'}),/Only this chat/);assert.throws(()=>browserDestination(service,'chat',{type:'workspace',id:'unknown'}),/not available/);
});

test('an explicit same-address navigation is a distinct visit while reload/title updates keep its entry identity',()=>{
 const tab={},first=commitNavigation(tab,'https://example.test/page','Initial');
 assert.equal(commitNavigation(tab,'https://example.test/page','Reloaded'),null);assert.equal(tab.logicalHistory.entries.length,1);assert.equal(tab.logicalHistory.currentEntryId,first.id);
 const second=commitNavigation(tab,'https://example.test/page','',{force:true});assert.notEqual(second.id,first.id);assert.equal(tab.logicalHistory.entries.length,2);
 assert.equal(commitNavigation(tab,'https://example.test/page','Final title'),null);assert.equal(tab.logicalHistory.currentEntryId,second.id);assert.equal(tab.logicalHistory.entries[1].title,'Final title');
 tab.applyingShared=true;assert.equal(commitNavigation(tab,'https://example.test/page','Mirror',{force:true}),null);assert.equal(tab.logicalHistory.entries.length,2);
});

test('redirect chains and replacement URLs append entries without overwriting the originally requested page',()=>{
 const tab={};const original=commitNavigation(tab,'https://example.test/document?id=7','Document');
 for(const url of ['https://example.test/login?returnUrl=%2Fdocument%3Fid%3D7','https://example.test/oauth/callback?code=fixture','https://example.test/document?id=7&view=results'])commitNavigation(tab,url,'',{redirect:true});
 assert.equal(tab.logicalHistory.entries.length,4);assert.equal(tab.logicalHistory.entries[0].id,original.id);assert.equal(tab.logicalHistory.entries[0].url,'https://example.test/document?id=7');
 traverseNavigation(tab,0);tab.applyingShared=true;commitNavigation(tab,'https://example.test/login?new=1','Login',{redirect:true});assert.equal(tab.logicalHistory.entries.length,2);assert.equal(tab.logicalHistory.entries[0].id,original.id);assert.equal(tab.logicalHistory.entries[1].url,'https://example.test/login?new=1');
});
