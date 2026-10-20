import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {BrowserProfiles,validateBrowserSettings} from '../src/browser-profiles.js';

test('profile definitions require opt-in and current account isolation; partitions remain stable',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-profiles-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 let identity={origin:'https://account.example',accountId:'synthetic-a'},offline=false;
 const profile={id:'87b334da-2fb8-49c9-8917-5728c7ee2668',name:'Research',revision:1,settings:{blockingEnabled:true}};
 const account={life:{api:{identity:()=>identity}},request:async()=>{if(offline)throw new Error('Offline');return {items:[profile]};}};
 const store=new BrowserProfiles(home,account);assert.deepEqual(store.list().items.map(p=>p.name),['Default']);
 await store.handle({action:'enable',enabled:true});const partition=store.partition(profile.id);assert.match(partition,/^persist:proteus-profile-/);assert.equal(store.partition(),'persist:proteus-browser');
 const restarted=new BrowserProfiles(home,account);assert.equal(restarted.get(profile.id).name,'Research');assert.equal(restarted.list().cached,true);await restarted.refresh();assert.equal(restarted.partition(profile.id),partition);
 identity={...identity,accountId:'synthetic-b'};assert.equal(restarted.available(),false);assert.throws(()=>restarted.get(profile.id),/unavailable/);
 await restarted.refresh();assert.notEqual(restarted.partition(profile.id),partition);
 offline=true;await assert.rejects(restarted.refresh(),/Offline/);assert.equal(restarted.available(),true);assert.equal(restarted.list().cached,true);
 identity=null;await restarted.refresh();assert.equal(restarted.list().items.length,1);
});

test('profile settings accept origins and metadata, never website secrets',()=>{
 assert.deepEqual(validateBrowserSettings({allowExtensionAgents:true}),{allowExtensionAgents:true});
 assert.throws(()=>validateBrowserSettings({allowExtensionAgents:'yes'}));
 assert.deepEqual(validateBrowserSettings({notifications:[{origin:'https://example.com',permission:'allow'}]}),{notifications:[{origin:'https://example.com',permission:'allow'}]});
 for(const settings of [{cookies:[]},{exceptions:['https://example.com/path']},{notifications:[{origin:'https://user:secret@example.com',permission:'allow'}]},{extensions:[{id:'bad',enabled:true}]}])assert.throws(()=>validateBrowserSettings(settings));
});

test('legacy PHP empty settings are normalized on refresh without admitting nonempty arrays',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-profiles-json-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 let settings=[];const identity={origin:'https://account.example',accountId:'synthetic-a'},account={life:{api:{identity:()=>identity}},request:async()=>({items:[{id:'87b334da-2fb8-49c9-8917-5728c7ee2668',name:'Research',settings}]})};
 const store=new BrowserProfiles(home,account);await store.handle({action:'enable',enabled:true});assert.deepEqual(store.get('87b334da-2fb8-49c9-8917-5728c7ee2668').settings,{});settings=['unexpected'];await assert.rejects(store.refresh(),/Invalid browser settings/);assert.equal(store.list().items.length,2);
});
