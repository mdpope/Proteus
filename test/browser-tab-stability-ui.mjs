// Rehearsal: activating restored tabs must not publish loading placeholders or move tabs.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-tab-stability-')));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
let resolveLateLoad;const server=http.createServer((req,res)=>{if(req.url==='/late-load')resolveLateLoad?.();setTimeout(()=>res.end(`<title>Synthetic ${req.url.slice(1)}</title><h1>Stable page</h1>`),700);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const names=['alpha','beta','gamma'],canonicalIds=names.map(name=>'stability-'+name);
// Restore one authoritative saved session. Incrementally creating restore:true
// views after the owner is seeded makes them uncommitted views to reconcile away.
const savedTabs=names.map((name,index)=>({id:canonicalIds[index],contentTabId:canonicalIds[index],type:'browser',label:'Synthetic '+name,url:origin+'/'+name,unloaded:true,history:{entries:[{id:name+'-entry',url:origin+'/'+name,title:'Synthetic '+name}],index:0,currentEntryId:name+'-entry',revision:0}}));
fs.writeFileSync(path.join(home,'desktop-workspace.json'),JSON.stringify({schemaVersion:1,active:'overview',page:'home',tabs:[{id:'overview',type:'overview',label:'Home'},...savedTabs]}));
let app;
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('#home-screen').waitFor();
 await page.route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('windowRestore.start().then(','window.stabilityReady=windowRestore.start().then(')+'\nwindow.stabilityFixture={contentTabSync,state,refresh,renderTabs,reorderVisibleTabs};\n'});});
 await page.reload();await page.evaluate(()=>window.stabilityReady);
 await app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();b.blocker.ensure=async()=>{};});
 const restored=await page.evaluate(canonicalIds=>canonicalIds.map(contentTabId=>{const tab=window.stabilityFixture.state.tabs.find(tab=>tab.contentTabId===contentTabId);return tab?{id:tab.id,contentTabId:tab.contentTabId,loaded:tab.info?.loaded}:null;}),canonicalIds);
 assert.ok(restored.every(Boolean),'Every saved canonical descriptor restores a native browser view');
 assert.deepEqual(restored.map(tab=>tab.contentTabId),canonicalIds);
 assert.ok(restored.every(tab=>tab.loaded===false),'Restored siblings start unloaded');
 const ids=restored.map(tab=>tab.id);
 await page.evaluate(()=>window.stabilityFixture.contentTabSync.all());
 const before=await page.locator('#tabs [data-tab]').allTextContents();
 await page.evaluate(()=>{window.stabilityEvidence=[];const sample=()=>window.stabilityEvidence.push([...document.querySelectorAll('#tabs [data-tab]')].map(n=>({id:n.dataset.tab,title:n.textContent.trim()})));new MutationObserver(sample).observe(document.querySelector('#tabs'),{childList:true,subtree:true,characterData:true});sample();});
 await page.locator(`[data-tab="${ids[1]}"]`).click();await page.waitForTimeout(2200);
 const evidence=await page.evaluate(()=>window.stabilityEvidence);
 assert.ok(evidence.every(rows=>rows.map(n=>n.id).join()===ids.join()),'Activation retains tab order: '+JSON.stringify(evidence));
 assert.ok(evidence.every(rows=>rows.every((n,i)=>n.title===before[i].trim())),'Loading retains saved titles: '+JSON.stringify(evidence));
 const handle=await page.locator(`[data-tab="${ids[1]}"]`).elementHandle();await page.evaluate(async()=>{for(let i=0;i<3;i++){await window.stabilityFixture.contentTabSync.all();await window.stabilityFixture.refresh();}});
 assert.equal(await handle.evaluate(n=>n.isConnected),true,'No-op polling retains tab nodes');
 // A second client updates an unloaded sibling's canonical page title. Native
 // state broadcasts must not restore its stale snapshot title on the next poll.
 await app.evaluate(async({app},id)=>{const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();const row=await s.contentTabs.getAsync('main','main'),tab=row.tabs.find(t=>t.id===id),entry=tab.history.entries[tab.history.index];await s.contentTabs.mutateAsync({scope:'main',id:'main',expectedRevision:row.revision,operations:[{action:'browser-redirect',tabId:id,entryId:entry.id,url:entry.url,title:'Updated by second client',operationId:process.mainModule.require('node:crypto').randomUUID(),baseRevision:tab.history.revision}]});},canonicalIds[2]);
 await page.evaluate(()=>window.stabilityFixture.contentTabSync.all());
 await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().changed());
 await page.waitForTimeout(200);await page.evaluate(()=>window.stabilityFixture.contentTabSync.all());
 assert.match(await page.locator(`[data-tab="${ids[2]}"]`).textContent(),/Updated by second client/);
 const unloaded=await page.evaluate(id=>window.desktop.browser({action:'list'}).then(tabs=>tabs.find(t=>t.id===id)),ids[2]);assert.equal(unloaded.title,'Updated by second client');
 // A deliberate reorder remains stable after owner synchronization and activation of a sibling.
 await page.evaluate(({ids})=>window.stabilityFixture.reorderVisibleTabs(ids[2],ids[0],false),{ids});await page.evaluate(()=>window.stabilityFixture.contentTabSync.all());
 await page.locator(`[data-tab="${ids[0]}"]`).click();await page.waitForTimeout(1800);
 assert.deepEqual(await page.locator('#tabs [data-tab]').evaluateAll(nodes=>nodes.map(n=>n.dataset.tab)),[ids[2],ids[0],ids[1]]);
 // A user drag during the native load awaited by reconciliation must win over
 // the order captured before that await, then publish on the next pass.
 await app.evaluate(async({app},{ids,origin})=>{const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();let row=await s.contentTabs.getAsync('main','main'),tab=row.tabs.find(t=>t.id===ids[0]);await s.contentTabs.mutateAsync({scope:'main',id:'main',expectedRevision:row.revision,operations:[{action:'browser-navigate',tabId:tab.id,entryId:'late-entry',url:origin+'/late-load',title:'Late load',operationId:'late-entry',visitedAt:new Date().toISOString(),baseRevision:tab.history.revision}]});row=await s.contentTabs.getAsync('main','main');await s.contentTabs.mutateAsync({scope:'main',id:'main',expectedRevision:row.revision,operations:[{action:'reorder',ids:[ids[2],ids[1],ids[0]]}]});},{ids:canonicalIds,origin});
 const loading=new Promise(r=>resolveLateLoad=r);await page.evaluate(()=>{window.syncDuringLoad=window.stabilityFixture.contentTabSync.all();});await loading;
 await page.evaluate(ids=>window.stabilityFixture.reorderVisibleTabs(ids[1],ids[2],false),ids);await page.evaluate(()=>window.syncDuringLoad);await page.waitForTimeout(1000);
 assert.deepEqual(await page.locator('#tabs [data-tab]').evaluateAll(nodes=>nodes.map(n=>n.dataset.tab)),[ids[1],ids[2],ids[0]],'A reorder during an awaited native load is retained');
 await page.evaluate(()=>window.stabilityFixture.contentTabSync.all());
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,synthetic:true,restoredActivationStable:true,pollingPreservesNodes:true,explicitReorderRetained:true}));
}finally{if(app){const t=setTimeout(()=>app.process().kill('SIGKILL'),5000);await app.close().catch(()=>{});clearTimeout(t);}server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(home,{recursive:true,force:true});}
