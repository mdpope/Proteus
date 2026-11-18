import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {LifeAskPlacement,lifeProjectKinds} from '../src/services/life/life-ask-placement.js';
// A fake owner: only the context and project catalog surfaces the placement uses.
function fixture(t){
 const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'life-workspace-')));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const config={revision:1,workspaces:[],archivedWorkspaces:[]},catalog={projects:[],defaultProjectIds:{}};
 const service={home,notify(){},context:{config:()=>structuredClone(config),mutate(change){const next=structuredClone(config);change(next);Object.assign(config,next,{revision:config.revision+1});},scope:id=>config.workspaces.find(row=>row.id===id)},workspaceProjects:{read:()=>structuredClone(catalog),write:value=>{catalog.projects=value.projects;catalog.defaultProjectIds=value.defaultProjectIds;}}};
 return {home,config,catalog,placement:new LifeAskPlacement(service),binding:{accountID:'a'.repeat(64),hostID:'h1'}};
}
test('the Life workspace needs a chosen folder and then provides one project per Life feature',t=>{
 const f=fixture(t);
 assert.equal(f.placement.state(f.binding).needsFolder,true);
 assert.throws(()=>f.placement.ensureKind(f.binding,'home'),/Choose a folder/);
 const chosen=path.join(f.home,'My Life');f.placement.setFolder(f.binding,chosen);
 const home=f.placement.ensureKind(f.binding,'home'),again=f.placement.ensureKind(f.binding,'home'),nutrition=f.placement.ensureKind(f.binding,'nutrition'),ask=f.placement.ensureKind(f.binding,'ask');
 assert.equal(home.projectId,again.projectId);assert.notEqual(home.projectId,nutrition.projectId);assert.notEqual(ask.projectId,home.projectId);
 assert.equal(f.config.workspaces[0].cwd,fs.realpathSync(chosen));assert.equal(f.config.workspaces[0].name,'Life');
 assert.deepEqual(f.catalog.projects.map(row=>row.name).sort(),['Ask','Nutrition','Smart Home']);
 // Ask resolves to its own project even when other Life projects exist.
 assert.equal(f.placement.ensure(f.binding),ask.projectId);
 const state=f.placement.state(f.binding);assert.equal(state.needsFolder,false);assert.deepEqual(state.projects.map(row=>row.kind),Object.keys(lifeProjectKinds));
 assert.equal(state.projects.find(row=>row.kind==='garage').id,null);
});
test('choosing a new folder repoints the existing Life workspace without moving files or touching other accounts',t=>{
 const f=fixture(t);f.placement.setFolder(f.binding,path.join(f.home,'one'));f.placement.ensureKind(f.binding,'garage');
 const second=path.join(f.home,'two');f.placement.setFolder(f.binding,second);
 assert.equal(f.config.workspaces[0].cwd,fs.realpathSync(second));assert.equal(f.config.workspaces.length,1);
 assert.throws(()=>f.placement.setFolder(f.binding,'relative/path'),/absolute/);
 assert.throws(()=>f.placement.ensureKind({accountID:null,hostID:'h1'},'garage'),/Sign in/);
 assert.throws(()=>f.placement.ensureKind(f.binding,'unknown'),/Unknown/);
});
