import test from 'node:test';import assert from 'node:assert/strict';
import {planWindowContentRecovery} from '../src/services/workspaces/window-content-recovery.js';
import {openContentScopes} from '../public/features/workspaces/content-scopes.js';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {WindowContentRecovery} from '../desktop/windows/content-recovery.js';
import {ContentTabs} from '../src/services/workspaces/content-tabs.js';
const entry=id=>({id,url:'https://example.test/'+id,title:id});
const browser=(id,ids)=>({id,type:'browser',title:id,url:entry(ids.at(-1)).url,history:{entries:ids.map(entry),index:ids.length-1}});
const source=(id,tabs,at='2026-10-29T00:00:00Z',projectId='p')=>({id,at,sha256:id,session:{tabs:[{id:'root',type:'workspace',workspaceId:'w',projectId},...tabs.map(tab=>({...tab,parentId:'root'}))]}});
const plan=(sources,scopes=[],available=()=>true)=>planWindowContentRecovery({sources,scopes,available});
test('recovery unions missing logical tabs across retained windows without URL deduplication or exposing drafts',()=>{
 const a=source('a',[browser('a',['one'])]),b=source('b',[browser('b',['one'])]);a.session.chatDrafts={private:'unsent'};
 const result=plan([a,b]);assert.deepEqual(result.items.map(row=>row.tab.id),['a','b']);assert.doesNotMatch(JSON.stringify(result),/unsent|chatDrafts/);
 assert.equal(plan([b,a]).id,result.id,'source enumeration order cannot change the reviewed plan');
});
test('recovery preserves divergent branches separately and never replaces current navigation',()=>{
 const current=browser('one',['a','new']),saved=source('old',[browser('one',['a','old'])]);
 const result=plan([saved],[{scope:'project',id:'p',revision:8,tabs:[current]}]);
 assert.equal(result.items.length,1);assert.equal(result.items[0].kind,'history-branch');assert.match(result.items[0].tab.id,/^recovered:/);assert.equal(result.items[0].tab.persist,undefined);
 assert.deepEqual(result.items[0].tab.history.entries.map(row=>row.id),['a','old']);assert.equal(current.url,entry('new').url);
 assert.equal(plan([saved],[{scope:'project',id:'p',revision:9,tabs:[current,result.items[0].tab]}]).items.length,0,'repeated scans do not create another branch copy');
});
test('recovery skips moved identities and unavailable projects and keeps old records ambiguous',()=>{
 const result=plan([source('a',[browser('moved',['a'])]),source('b',[browser('missing',['b'])],undefined,'deleted')],[{scope:'project',id:'other',revision:2,tabs:[browser('moved',['a'])]}],row=>row.id!=='deleted');
 assert.equal(result.items.length,0);assert.equal(result.moved.length,1);assert.equal(result.unavailable.length,1);assert.match(result.qualification,/intentional tab close/);
});
test('a newer missing identity wins and older conflicting history remains a separate copy',()=>{
 const result=plan([source('old',[browser('one',['a','old'])],'2026-10-28T00:00:00Z'),source('new',[browser('one',['a','new'])])]);
 assert.equal(result.items.length,2);assert.equal(result.items.find(row=>row.kind==='missing').tab.url,entry('new').url);
});
test('missing descriptors reuse retained worker navigation and preserve a divergent saved stack separately',()=>{
 const retained=browser('one',['a','worker']),scope={scope:'project',id:'p',revision:3,tabs:[],retainedNavigation:{one:retained.history}};
 const result=plan([source('saved',[browser('one',['a','saved'])])],[scope]);
 assert.equal(result.items.find(row=>row.kind==='missing').tab.url,entry('worker').url);
 assert.equal(result.items.find(row=>row.kind==='history-branch').tab.url,entry('saved').url);
});
test('all open project views subscribe to membership while closed roots stay private saved layouts',()=>{
 const visible=[{scope:'project',id:'first'}],tabs=[{type:'workspace',workspaceId:'w',projectId:'first'},{type:'workspace',workspaceId:'w',projectId:'second'},{type:'workspace',workspaceId:'w',projectId:'first',hostId:'peer'},{type:'workspace',workspaceId:'w',projectId:'closed',navigationClosed:true},{type:'workspace',workspaceId:'w',projectId:'paused',connectionPaused:true}];
 assert.deepEqual(openContentScopes(tabs,visible),[{scope:'project',id:'first'},{scope:'project',id:'second'},{scope:'project',id:'first',hostId:'peer'}]);assert.deepEqual(visible,[{scope:'project',id:'first'}],'membership subscription cannot change presentation following');
});
test('owner recovery scans retained files in a worker, rejects stale review, and restores through canonical mutations',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-window-recovery-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const saved=source('legacy',[browser('one',['a','old']),browser('lost',['lost'])]);
 fs.writeFileSync(path.join(home,'desktop-workspace.json'),JSON.stringify(saved.session));
 const contentTabs=new ContentTabs(home);contentTabs.mutate({scope:'project',id:'p',expectedRevision:0,operations:[{action:'open',tab:browser('one',['a','new'])},{action:'close',id:'lost'}]});
 const service={home,contentTabs,engine:{},context:{get:()=>({workspaces:[{id:'w'}]}),scope:()=>{}},workspaceProjects:{remapSession:value=>value,get:()=>({projects:[{id:'p'}]}),projectFor:()=>{}},mutateContentTabs:value=>contentTabs.mutateAsync(value)};
 const recovery=new WindowContentRecovery(service),first=await recovery.audit();assert.equal(first.items.length,2);assert.deepEqual(first.gaps,[]);
 contentTabs.mutate({scope:'project',id:'p',expectedRevision:1,operations:[{action:'rename',id:'one',title:'Fresh'}]});
 await assert.rejects(recovery.restore({planId:first.id,ids:first.items.map(row=>row.tab.id)}),/changed/);
 const current=await recovery.audit();const result=await recovery.restore({planId:current.id,ids:current.items.map(row=>row.tab.id)});assert.equal(result.restored.length,2);
 const after=contentTabs.get('project','p');assert.equal(after.tabs.find(tab=>tab.id==='one').url,entry('new').url);assert.equal((await recovery.audit()).items.length,0);
 const receipt=JSON.parse(fs.readFileSync(path.join(home,'window-recovery',current.id+'.json')));assert.equal(receipt.phase,'complete');assert.equal(receipt.restored.length,2);assert.ok(receipt.sources[0].sha256);
 assert.equal(JSON.parse(fs.readFileSync(path.join(home,'desktop-workspace.json'))).tabs.length,3,'source evidence remains intact');
});
