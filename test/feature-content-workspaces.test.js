import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureContentWorkspaces} from '../public/shared/navigation/feature-content-workspaces.js';
import {addTabMenuEntries} from '../public/shared/navigation/add-tab-menu.js';

test('feature sidebar return restores its tab, respects master selection and excludes private persistence',()=>{
 const saved=new Map(),before={storage:globalThis.localStorage,document:globalThis.document};
 globalThis.localStorage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
 globalThis.document={querySelector:()=>null};
 try {
  let selected='overview',page='home',account='first';const tabs=[{id:'scratch',type:'scratch'},{id:'reminder',type:'reminder'},{id:'private',type:'browser',info:{incognito:true}}];
  const ui={windowId:'test',account:()=>account,tabs:()=>tabs,selected:()=>selected,page:()=>page,epoch:()=>0,title:tab=>tab.id,error:()=>{},initialize:()=>{},select:(id,feature)=>{selected=id;page=feature;},master:feature=>{selected='overview';page=feature;}};
  const nav=createFeatureContentWorkspaces(ui);
  nav.adopt('scratchpad',tabs[0]);nav.adopt('reminders',tabs[1]);
  for(const [feature,id] of [['scratchpad','scratch'],['reminders','reminder']]){
   selected=id;page=feature;nav.render();selected='overview';page='home';nav.activate(feature);assert.equal(selected,id);
   selected='overview';page=feature;nav.render();page='home';nav.activate(feature);assert.equal(selected,'overview');
  }
  selected='reminder';page='reminders';nav.render();account='other';nav.activate('reminders');assert.equal(selected,'overview');account='first';
  selected='reminder';page='reminders';nav.render();tabs[1].hidden=true;nav.activate('reminders');assert.equal(selected,'overview');tabs[1].hidden=false;
  nav.adopt('scratchpad',tabs[2]);selected='private';page='scratchpad';nav.render();assert.doesNotMatch([...saved.values()].join(''),/private/);
  const restored=createFeatureContentWorkspaces(ui);restored.activate('reminders');assert.equal(selected,'reminder');
 }finally{globalThis.localStorage=before.storage;globalThis.document=before.document;}
});
test('shared tab selector offers Workspace files in every supported container',()=>{
 for(const scope of ['main','workspace','chat','team'])assert.ok(addTabMenuEntries(scope).some(row=>row.id==='files'));
});
