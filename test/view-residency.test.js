import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ViewResidency} from '../public/models/view-residency.js';
import {RunHistoryCache} from '../src/services/chats/run-history-cache.js';
import {SettingsStore} from '../src/services/settings/settings.js';

test('local and peer histories share one LRU budget, paired data and DOM evict together',async()=>{
 let now=0,selected='local';const dropped=[],cache=new ViewResidency({now:()=>now,preferences:{chatViewLimit:2}});
 const retain=(key,slot='history')=>cache.retain(key,'chat',slot,{active:()=>selected===key,dispose:()=>dropped.push(key+':'+slot)});
 retain('local');retain('local','DOM');now++;retain('peer:a');now++;retain('peer:b');await Promise.resolve();
 assert.deepEqual([...cache.entries.keys()],['local','peer:b']);assert.deepEqual(dropped,['peer:a:history']);
 selected='peer:b';cache.configure({chatViewLimit:1});assert.deepEqual(dropped,['peer:a:history','local:history','local:DOM']);
});
test('idle eviction protects selected views and leaves lightweight tab/session state outside the cache',()=>{
 let now=0,active=true;const cache=new ViewResidency({now:()=>now,preferences:{inactiveMinutes:1}}),tab={id:'document',draft:'unsent',session:'terminal-owned-elsewhere',content:'large'};
 cache.retain(tab.id,'document','bytes',{active:()=>active,dispose:()=>delete tab.content});now=120000;cache.sweep();assert.equal(tab.content,'large');active=false;now+=59999;cache.sweep();assert.equal(tab.content,'large');now++;cache.sweep();assert.equal(tab.content,undefined);assert.equal(tab.draft,'unsent');assert.equal(tab.session,'terminal-owned-elsewhere');
});
test('owner expires inactive transcripts and reloads exact durable events while active execution stays pinned',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-history-cache-'));let now=0;const cache=new RunHistoryCache(id=>path.join(home,id+'.json'),2,{idleMs:60000,now:()=>now});
 try{const events=[{role:'user',text:'Preserved disk history'}],run={id:'inactive',status:'completed',events:structuredClone(events)},active={id:'active',status:'awaiting_input',events:[]};fs.writeFileSync(path.join(home,'inactive.json'),JSON.stringify(run));cache.attach(run);cache.attach(active);now=60001;cache.trim();assert.equal(cache.resident.has(run.id),false);assert.equal(cache.resident.has(active.id),true);assert.deepEqual(run.events,events);assert.equal(cache.resident.has(run.id),true);}finally{cache.close();fs.rmSync(home,{recursive:true,force:true});}
});
test('memory preferences persist through settings restart and validate bounds without altering other settings',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-resource-settings-'));
 try{const store=new SettingsStore(home,home),initial=store.get(),resources={chatViewLimit:2,documentViewLimit:3,inactiveMinutes:5},saved=store.save({...initial,resources,extension:{keep:true}},initial.revision);assert.deepEqual(new SettingsStore(home,home).get().resources,resources);assert.deepEqual(store.get().extension,{keep:true});for(const invalid of [{chatViewLimit:0},{documentViewLimit:33},{inactiveMinutes:121},{inactiveMinutes:'5'},{unknown:1}])assert.throws(()=>store.save({...saved,resources:invalid},saved.revision));}finally{fs.rmSync(home,{recursive:true,force:true});}
});
