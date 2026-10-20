import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {ContextStore} from '../src/context.js';
import {SettingsStore} from '../src/settings.js';
const require=createRequire(import.meta.url),{ViewPositions}=require('../desktop/view-positions.cjs'),{ThumbnailCache}=require('../desktop/thumbnail-cache.cjs');
function home(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-release-state-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
test('reading positions survive a fresh store, retain unrelated documents and unknown fields, and reject invalid replacements',t=>{
 const root=home(t),store=new ViewPositions(root),position=[['root',{top:420,left:0,anchor:{index:3,offset:-12,text:'Synthetic heading',key:null}}]];
 store.set('window-one:document-a',position);store.set('window-two:document-a',[['root',{top:900,left:0}]]);
 const fresh=new ViewPositions(root);assert.equal(fresh.get()[0][1][0][1].top,420);assert.equal(fresh.get()[1][1][0][1].top,900);
 const data=JSON.parse(fs.readFileSync(store.file));data.extension={preserve:true};fs.writeFileSync(store.file,JSON.stringify(data));fresh.set('document-b',position);assert.deepEqual(JSON.parse(fs.readFileSync(store.file)).extension,{preserve:true});
 const before=fs.readFileSync(store.file);assert.throws(()=>fresh.set('document-b',[['root',{top:Infinity,left:0}]]),/Invalid/);assert.deepEqual(fs.readFileSync(store.file),before);
});
test('thumbnail cache survives restart, bounds retained entries and preserves a good image after failed capture',t=>{
 const root=home(t),cache=new ThumbnailCache(root,{maxEntries:2}),image=Buffer.concat([Buffer.from([255,216]),Buffer.alloc(30,1)]);
 assert.equal(cache.set('profile-a:tab-one',image),true);assert.equal(cache.set('profile-a:tab-one',Buffer.alloc(30)),false);assert.equal(new ThumbnailCache(root).get('profile-a:tab-one').thumbnail,'data:image/jpeg;base64,'+image.toString('base64'));assert.equal(cache.get('profile-b:tab-one'),null);
 cache.set('profile-a:tab-two',image);cache.set('profile-a:tab-three',image);assert.equal(fs.readdirSync(cache.directory).length,2);cache.delete('profile-a:tab-three');assert.equal(cache.get('profile-a:tab-three'),null);
});
test('workspace reordering persists one owner order without changing defaults, fields or revision protection',t=>{
 const root=home(t),settings=new SettingsStore(root,root),context=new ContextStore(root,settings,{skipRefresh:true});
 context.mutate(config=>{config.extension='retained';config.workspaces.push({...structuredClone(config.workspaces[0]),id:'second',name:'Second'});},context.config().revision);
 const before=context.config(),ids=before.workspaces.map(row=>row.id).reverse();context.reorderWorkspaces(ids,before.revision);
 const current=new ContextStore(root,settings,{skipRefresh:true}).config();assert.deepEqual(current.workspaces.map(row=>row.id),ids);assert.equal(current.defaultWorkspaceId,before.defaultWorkspaceId);assert.equal(current.extension,'retained');
 assert.throws(()=>context.reorderWorkspaces(ids,before.revision),/changed/);assert.throws(()=>context.reorderWorkspaces([ids[0],ids[0]],current.revision),/every current workspace/);
});
