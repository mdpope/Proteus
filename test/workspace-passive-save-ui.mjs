// Rehearsal only: passive sidebar painting must not schedule descriptor traffic.
import {_electron as electron} from 'playwright';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-passive-save-'));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{},appearance:{showProviderUsage:false}}));
let app,page;const release=[];
try{
 const executablePath=process.env.PROTEUS_TEST_EXECUTABLE;
 app=await electron.launch({...(executablePath?{executablePath}:{}),args:[...(executablePath?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 await page.route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nwindow.passiveSaveFixture={state,render,saveWorkspace,refresh,contentTabSync};'});});
 await page.reload();await page.locator('#topbar-home').waitFor();
 await page.evaluate(async()=>{await passiveSaveFixture.refresh(true);await passiveSaveFixture.saveWorkspace();await passiveSaveFixture.contentTabSync.all();});
 await page.waitForTimeout(500);
 // Hold unrelated periodic/SSE state refreshes during this focused observation.
 // The normal two-desktop test independently keeps those refreshes enabled.
 await page.route('**/api/state?*',async route=>{await new Promise(resolve=>release.push(resolve));await route.continue().catch(()=>{});});
 const requests=[];page.on('request',request=>{if(new URL(request.url()).pathname==='/api/content-tabs')requests.push(request.postDataJSON());});
 await page.evaluate(()=>{for(let i=0;i<20;i++)passiveSaveFixture.render({sidebarOnly:true,preserveTeamBrowser:true});});
 await page.waitForTimeout(400);
 assert.equal(requests.length,0,'Unchanged sidebar rendering must not schedule descriptor reads');
 await page.evaluate(async()=>{const f=passiveSaveFixture;f.state.page=f.state.page==='home'?'context':'home';await f.saveWorkspace();for(let i=0;i<20;i++)f.render({sidebarOnly:true,preserveTeamBrowser:true});});
 await page.waitForTimeout(400);
 assert.equal(requests.filter(value=>value.action==='get').length,1,'A changed workspace still schedules one coalesced descriptor pass');
 const saved=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 assert.equal(saved.page,await page.evaluate(()=>passiveSaveFixture.state.page),'Actual changed workspace remains durable');
 console.log('PASS unchanged sidebar repaints cause no descriptor reads; changed workspace coalesces one sync and persists');
}finally{await page?.unroute('**/api/state?*');for(const resolve of release)resolve();await app?.close();fs.rmSync(home,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
