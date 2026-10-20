import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.js';

// Synthetic pre-0.2.2 workspace: neither remembered browser child is active.
// Real process restarts recreate private view IDs, unlike a renderer reload.
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-child-selection-')));
const fixture=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Current page</title><p>Isolated restart fixture</p>');});
await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+fixture.address().port;
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const engine=new Engine(home),parents=[];
for(const name of ['First fixture chat','Second fixture chat']){
 const run=engine.createRun({schemaVersion:1,id:'fixture-'+parents.length,name,enabled:false,cron:'0 9 * * 1-5',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic fixture'},'chat',null,{deferStart:true});
 run.status='completed';run.deferredStart=false;run.nextPrompt=null;run.title=name;run.titleKind='manual';engine.persist(run);parents.push(run.id);
}
await engine.close();
const histories=['a','b'].map(name=>({entries:[{url:origin+'/'+name+'-first',title:'First page'},{url:origin+'/'+name+'-current',title:'Current page'}],index:1}));
const children=parents.map((parentId,index)=>({id:'legacy-browser-'+index,type:'browser',label:'Remembered child '+index,customTitle:'Remembered child '+index,parentId,url:histories[index].entries[1].url,history:histories[index],unloaded:true}));
const team={active:'overview',tabs:[0,1].map(index=>({id:'team-fixture-'+index,type:'browser',browserId:'legacy-team-view-'+index,title:'Team fixture '+index,url:origin+'/team-'+index,customTitle:'Team fixture '+index})),listId:'',dock:false,orders:{}};
fs.writeFileSync(path.join(home,'desktop-workspace.json'),JSON.stringify({schemaVersion:1,active:'overview',page:'home',tabs:[{id:'overview',type:'overview',label:'Schedules'},...parents.map((id,index)=>({id,type:'run',label:'Fixture chat '+index})),...children],selectedChildren:Object.fromEntries(parents.map((id,index)=>[id,children[index].id])),team}));
let app;const errors=[],checks=[];let previousIds;
async function until(page,predicate,arg){const deadline=Date.now()+20000;do{const value=await page.evaluate(predicate,arg);if(value)return value;await new Promise(resolve=>setTimeout(resolve,50));}while(Date.now()<deadline);throw new Error('Synthetic startup/reconciliation condition timed out');}
async function closeApp(){if(!app)return;const child=app.process();child.kill('SIGTERM');await new Promise((resolve,reject)=>{if(child.exitCode!==null)return resolve();const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Fixture app failed graceful shutdown'));},10000);child.once('exit',()=>{clearTimeout(timer);resolve();});});app=null;}
try{
 for(let cycle=0;cycle<3;cycle++){
  app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,COPILOT_HOME:path.join(home,'copilot'),PORT:'0'},timeout:60000});
  const page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));await page.locator('#tab-add-menu summary').waitFor();
  // Wait for actual restoration/persistence, not just the first overview render.
  await until(page,async previous=>{const session=await window.desktop.workspaceSession({action:'get'}),views=await window.desktop.browser({action:'list'});return session.tabs.filter(tab=>tab.type==='browser').length===2&&session.tabs.filter(tab=>tab.type==='browser').every(tab=>tab.contentTabId&&views.some(view=>view.id===tab.id)&&!previous.includes(tab.id));},previousIds||children.map(tab=>tab.id));
  const session=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
  assert.equal(Object.keys(session.selectedChildren).length,2,'Both inactive remembered browser selections survive startup');
  const restored=parents.map((parent,index)=>{
   const child=session.tabs.find(tab=>tab.id===session.selectedChildren[parent]);assert.ok(child,'Selected child still exists');assert.equal(child.parentId,parent,'Selection remains owned by the same chat');assert.equal(child.contentTabId,children[index].id,'Descriptor adopts legacy source ID once, independent of private view ID');assert.equal(child.customTitle,children[index].customTitle);assert.equal(child.url,children[index].url);assert.deepEqual(child.history.entries.map(({url,title})=>({url,title})),histories[index].entries);assert.equal(child.history.index,histories[index].index);assert.ok(child.history.entries.every(entry=>entry.id));assert.equal(child.history.currentEntryId,child.history.entries[child.history.index].id);return child;
  });
  assert.deepEqual(session.tabs.map(tab=>tab.type==='browser'?tab.contentTabId:tab.id),['overview',...parents,...children.map(tab=>tab.id)],'Tab order survives remapping and descriptor reconciliation');
  assert.deepEqual(session.team.tabs.map(tab=>({id:tab.id,title:tab.title,url:tab.url})),team.tabs.map(tab=>({id:tab.id,title:tab.title,url:tab.url})),'Unrelated Team entries are unchanged');
  if(previousIds)assert.ok(restored.every((tab,index)=>tab.id!==previousIds[index]),'A real restart creates new private browser IDs: '+JSON.stringify({cycle,previousIds,current:restored.map(tab=>tab.id)}));
  if(cycle>0){assert.equal(session.active,restored[1].id,'Previously active browser child remaps too');await page.locator('[data-chat-subtab="'+restored[1].id+'"]').waitFor();assert.equal(await page.locator('[data-chat-subtab="'+restored[1].id+'"]').locator('..').getAttribute('class'),'chat-subtab selected');}
  for(let index=0;index<parents.length;index++){
   await page.locator('[data-tab-container="'+parents[index]+'"]').click();await page.locator('[data-chat-subtab="'+restored[index].id+'"]').waitFor();assert.equal(await page.locator('[data-chat-subtab="'+restored[index].id+'"]').locator('..').getAttribute('class'),'chat-subtab selected','Opening chat returns to its remembered browser child');
  }
  await until(page,async ({parent,child})=>(await window.desktop.workspaceSession({action:'get'})).active===child,{parent:parents[1],child:restored[1].id});
  // Descriptor polling must leave local selection alone.
  await until(page,async parents=>{for(const id of parents){const value=await fetch('/api/content-tabs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'get',scope:'chat',id})}).then(r=>r.json());if(value.tabs.length!==1)return false;}return true;},parents);
  assert.equal((await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}))).selectedChildren[parents[1]],restored[1].id);
  previousIds=restored.map(tab=>tab.id);checks.push(cycle===0?'Legacy inactive remembered children remapped and reopened':'Full app restart '+cycle+' retains selection, stable descriptor IDs, order, history and Team entries');
  await closeApp();assert.equal(fs.existsSync(path.join(home,'runner.lock')),false,'Runner lock cleans up between restarts');
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks}));
}finally{await closeApp();fixture.closeAllConnections();await new Promise(resolve=>fixture.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
