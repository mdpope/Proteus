// Rehearsal-only regression for a saved chat view absent from an existing owner scope.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {ContentTabs} from '../src/services/workspaces/content-tabs.js';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const require=createRequire(import.meta.url),{WorkspaceSession}=require('../desktop/windows/workspace-session.cjs');
const fixture=await sidebarFixture(),target=fixture.user[4],known=fixture.user[0],draft='Synthetic preserved migration draft';
const store=new WorkspaceSession(fixture.locations.home),saved=store.get();
saved.tabs=saved.tabs.filter(tab=>['overview',fixture.workspaceId,fixture.parentId].includes(tab.id));
saved.tabs.push({id:target.id,type:'run',label:target.title});
saved.active=target.id;saved.chatDrafts={[target.id]:draft};saved.selectedChildren={};store.save(saved);
const owner=new ContentTabs(fixture.locations.home),scope={scope:'project',id:fixture.project.id};
const previous=owner.get(scope.scope,scope.id);
owner.mutate({...scope,expectedRevision:previous.revision,operations:[{action:'open',tab:{id:'chat:'+known.id,type:'chat',chatId:known.id,title:known.title}}]});
assert.ok(owner.get(scope.scope,scope.id).revision>0);
assert.ok(!owner.get(scope.scope,scope.id).tabs.some(tab=>tab.chatId===target.id));
let app,page,gets=0;const errors=[];
const until=async(check,label)=>{for(let i=0;i<180;i++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
const session=()=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
async function settled(previousGets=0){
 await until(()=>gets>=previousGets+2,'project descriptor synchronization');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function assertPreserved(){
 const value=await session(),view=value.tabs.find(tab=>tab.id===target.id);
 assert.ok(view,'The restored selected local chat view must survive first project synchronization');
 assert.equal(view.parentId,fixture.parentId);assert.equal(value.active,target.id);
 assert.equal(value.selectedChildren[fixture.parentId],target.id);
 assert.equal(value.chatDrafts[target.id],draft);
 assert.ok(!owner.get(scope.scope,scope.id).tabs.some(tab=>tab.chatId===target.id),'A legacy view does not reopen an owner descriptor');
}
try{
 app=await electron.launch({...(process.argv[2]?{executablePath:process.argv[2],args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(!response.url().includes('/api/content-tabs'))return;let body;try{body=response.request().postDataJSON()}catch{}if(body?.action==='get'&&body.scope==='project'&&body.id===fixture.project.id)gets++;});
 await page.locator('[data-preview-workspace]').first().waitFor();await settled();await assertPreserved();
 const before=gets;await page.reload();await page.locator('[data-preview-workspace]').first().waitFor();await settled(before);await assertPreserved();
 // Once this identity participates in the owner registry, an actual owner close
 // remains authoritative even across another renderer restart.
 await page.evaluate(async ({scope,target})=>{
  const post=async value=>{const r=await fetch('/api/content-tabs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)});if(!r.ok)throw Error(await r.text());return r.json();};
  const current=await post({action:'get',...scope});
  await post({action:'mutate',...scope,expectedRevision:current.revision,operations:[{action:'open',tab:{id:'chat:'+target.id,type:'chat',chatId:target.id,title:target.title}}]});
 },{scope,target:{id:target.id,title:target.title}});
 await until(()=>page.evaluate(id=>Object.keys(localStorage).filter(k=>k.startsWith('proteus.navigation.observed:')).some(k=>JSON.parse(localStorage.getItem(k)||'[]').includes('chat:'+id)),target.id),'owner participation recorded');
 await page.evaluate(async ({scope,id})=>{
  const post=async value=>{const r=await fetch('/api/content-tabs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)});if(!r.ok)throw Error(await r.text());return r.json();};
  const current=await post({action:'get',...scope});await post({action:'mutate',...scope,expectedRevision:current.revision,operations:[{action:'close',id:'chat:'+id}]});
 },{scope,id:target.id});
 await until(async()=>!(await session()).tabs.some(tab=>(tab.runId||tab.id)===target.id),'registered owner closure applied');
 await page.reload();await page.locator('[data-preview-workspace]').first().waitFor();
 assert.ok(!(await session()).tabs.some(tab=>(tab.runId||tab.id)===target.id),'Closed view must not be resurrected');
 assert.equal((await session()).chatDrafts[target.id],draft);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,synthetic:true,checks:['selected saved local chat survives existing project reconciliation','view ID, project selection and draft survive reload','untracked alias does not reopen owner tab','owner-observed close survives reload']}));
}finally{
 if(app){const process=app.process(),timer=setTimeout(()=>process.kill('SIGKILL'),15000);try{await app.close()}finally{clearTimeout(timer)}}
 await fixture.cleanup();
}
