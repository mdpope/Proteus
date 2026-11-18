import {_electron as electron} from 'playwright';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
// Workspace/project association: the editor offers both selectors and a scoped page hard-filters its reads.
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-reminder-scope-')));let app;
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'}});
 const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();page.on('pageerror',e=>{throw e;});
 await page.evaluate(async()=>{
  const {mountReminderWorkbench}=await import('/features/tools/life-reminders.js');
  const root=document.createElement('div');root.id='reminder-test';root.style.cssText='position:fixed;inset:0;z-index:999;background:#18251c;overflow:auto';document.body.append(root);
  const lists=[{id:'inbox',name:'Inbox',inbox:true,revision:1}],store=[{id:'r1',title:'In project',notes:'',listId:'inbox',workspaceId:'w1',projectId:'p1',revision:1,dueKind:'none'},{id:'r2',title:'Elsewhere',notes:'',listId:'inbox',workspaceId:'w2',projectId:null,revision:1,dueKind:'none'}];
  window.reads=[];window.writes=[];
  const scopes=()=>({workspaces:[{id:'w1',name:'Personal'},{id:'w2',name:'Mint'}],projects:[{id:'p1',name:'Smart Home',workspaceId:'w1'},{id:'p2',name:'Garage',workspaceId:'w1'}]});
  window.controller=mountReminderWorkbench(root,{detailOnly:false,scope:{workspaceId:'w1',projectId:'p1'},scopes,
   read:async query=>{window.reads.push(query);const items=store.filter(r=>(!query.projectId||r.projectId===query.projectId)&&(!query.workspaceId||r.workspaceId===query.workspaceId));return {inboxId:'inbox',timeZone:'America/Denver',lists,items,total:items.length,page:1,record:store.find(r=>r.id===query.id)};},
   write:async(action,input)=>{window.writes.push({action,input});const record={...input,id:'new1',revision:1,dueKind:'none'};store.push(record);return {record};}});
 });
 await page.getByText('In project',{exact:true}).waitFor();assert.equal(await page.getByText('Elsewhere',{exact:true}).count(),0,'items outside the scope never appear');
 assert.ok((await page.evaluate(()=>window.reads)).every(q=>q.projectId==='p1'),'every list read carries the hard project scope');
 await page.locator('[data-new]').click();
 assert.equal(await page.locator('select[name=workspaceId]').inputValue(),'w1');assert.equal(await page.locator('select[name=projectId]').inputValue(),'p1');
 await page.locator('select[name=projectId] option').allTextContents().then(rows=>assert.deepEqual(rows,['No project','Smart Home','Garage']));
 await page.locator('input[name=title]').fill('Fix opener');await page.locator('select[name=projectId]').selectOption('p2');await page.getByRole('button',{name:'Save'}).click();
 await page.waitForFunction(()=>window.writes.length===1);
 const write=(await page.evaluate(()=>window.writes))[0];assert.equal(write.action,'create');assert.equal(write.input.workspaceId,'w1');assert.equal(write.input.projectId,'p2');
 await page.locator('select[name=workspaceId]').selectOption('w2').catch(()=>{});
 assert.equal(await page.getByText('Fix opener',{exact:true}).count(),0,'a reminder saved outside the scope does not show in this scoped list');
 console.log('Passed reminder workspace/project selectors, defaults, saving and hard scope filtering.');
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
