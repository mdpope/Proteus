// Synthetic desktop rehearsal: registration, discovery and one-time folder loading.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture(),folder=path.join(fixture.temporary,'shared-sources-with-wrapped-folder-details-for-narrow-windows');let app,page;const errors=[];
const write=(relative,text)=>{const file=path.join(folder,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
write('AGENTS.md','# Unique bulk target\nSynthetic instructions.');write('plugins/example/skills/check/SKILL.md','# Shared skill\nSynthetic skill.');write('nested/.mcp.json',JSON.stringify({mcpServers:{nestedTool:{command:'synthetic'}}}));
const inspect=()=>app.evaluate(({app},folder)=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService(),catalog=service.context.get();return {entries:catalog.entries.filter(entry=>entry.roots.includes(folder)),workspaces:catalog.workspaces,source:service.desktopPreview?.get?.().sourceLibrary.find(source=>source.path===folder)};},folder);
const until=async(predicate,label)=>{const deadline=Date.now()+15000;while(Date.now()<deadline){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
async function sources(){await page.locator('[data-page=engine]').click();await page.locator('#sidebar [data-engine-section=source-library]').click();await page.locator('[data-preview-source-add]').waitFor();}
async function configure(workspace){await page.locator(`[data-preview-workspace="${workspace.id}"]`).click();await page.locator('[data-preview-page=configuration]').click();await page.locator('[data-source-search]').waitFor();}
try{
 app=await electron.launch({args:['.','--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'},timeout:60000});page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));await page.locator('[data-preview-workspace]').first().waitFor();
 await sources();await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},folder);await page.locator('[data-preview-source-add]').click();
 const card=()=>page.locator('article.card').filter({has:page.locator('strong.filepath',{hasText:folder})});
 await until(async()=>/Scan complete.*3 sources/.test(await card().innerText().catch(()=>'')),'source registration scan feedback');
 assert.match(await page.locator('#main').innerText(),/Configured in lists saved source choices or existing folder references/);
 assert.match(await card().innerText(),/Configured in:/);assert.doesNotMatch(await page.locator('#main').innerText(),/Used by:/);
 const windowHandle=await app.browserWindow(page);
 console.log('Source Library windows',JSON.stringify({selected:await windowHandle.evaluate(win=>({id:win.id,url:win.webContents.getURL(),webContentsId:win.webContents.id})),all:await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(win=>({id:win.id,url:win.webContents.getURL(),webContentsId:win.webContents.id,bounds:win.getBounds()}))),emulatedViewport:page.viewportSize()}));
 // Measure the populated list at both widths, including long wrapped folder paths.
 for(const width of [1440,850]){
  const windowSize=await windowHandle.evaluate((win,width)=>{win.setMinimumSize(600,500);win.setSize(width,1000);return{id:win.id,content:win.getContentSize(),outer:win.getSize(),minimum:win.getMinimumSize()};},width);console.log('Source Library resize',JSON.stringify({requested:width,...windowSize,renderer:await page.evaluate(()=>({width:innerWidth,devicePixelRatio,visualWidth:visualViewport.width})),emulatedViewport:page.viewportSize()}));
  await until(async()=>await page.evaluate(()=>innerWidth)===width,'resized Source library');
  const layout=await page.locator('[data-source-library-entries]').evaluate(list=>{const cards=[...list.querySelectorAll(':scope > article')],boxes=cards.map(card=>card.getBoundingClientRect());return{count:cards.length,gaps:boxes.slice(1).map((box,index)=>box.top-boxes[index].bottom),fits:cards.every(card=>card.scrollWidth<=card.clientWidth),wraps:cards.some(card=>{const path=card.querySelector('.filepath');const range=document.createRange();range.selectNodeContents(path);return range.getClientRects().length>1;})};});
  assert.ok(layout.count>=2);assert.ok(layout.gaps.every(gap=>Math.abs(gap-18)<.5),JSON.stringify(layout));assert.equal(layout.fits,true);
  if(width===850)assert.equal(layout.wraps,true,'Long folder details wrap at narrow width');
  await page.screenshot({path:`/private/tmp/proteus-source-library-${width}.png`});
 }
 await windowHandle.evaluate(win=>win.setContentSize(1440,1000));
 let observed=await inspect();assert.equal(observed.entries.length,3);assert.equal(observed.entries.find(entry=>entry.kind==='mcp').mode,'disabled');
 write('nested/new/SKILL.md','# Rescanned skill');await card().locator('[data-preview-source-refresh]').click();await until(async()=>/Scan complete.*4 sources/.test(await card().innerText().catch(()=>'')),'explicit Rescan feedback');
 for(const workspace of [fixture.studio,fixture.personal]){await configure(workspace);const group=page.locator(`[data-source-folder="${folder}"]`);await group.waitFor();assert.equal(await group.locator('[data-context-mode]').count(),4,'Shared sources visible in '+workspace.name);assert.match(await page.locator('[data-config-section=library]').textContent(),/available to every workspace on this computer.*No folder attachment is needed here/s);assert.match(await page.locator('[data-config-section=sources]').innerText(),/when workspace defaults are included/);assert.match(await group.innerText(),/future discoveries keep their own defaults/);}
 const group=()=>page.locator(`[data-source-folder="${folder}"]`);await page.locator('[data-source-search]').fill('Unique bulk target');assert.equal(await group().locator('[data-context-mode]').count(),1);assert.match(await group().locator('[data-folder-apply]').innerText(),/4/);
 await group().locator('[data-folder-load]').selectOption('universal');await group().locator('[data-folder-apply]').click();
 await until(async()=>{const current=await inspect(),workspace=current.workspaces.find(item=>item.id===fixture.personal.id);return current.entries.length===4&&current.entries.every(entry=>workspace.modes[entry.id]==='universal');},'bulk applies to every item despite filter');
 observed=await inspect();assert.ok(observed.entries.every(entry=>!observed.workspaces.find(item=>item.id===fixture.studio.id).modes[entry.id]),'Other workspace modes untouched');
 await group().locator('[data-context-mode]').selectOption('disabled');await until(async()=>{const current=await inspect(),instruction=current.entries.find(entry=>entry.name==='Unique bulk target');return current.workspaces.find(item=>item.id===fixture.personal.id).modes[instruction.id]==='disabled';},'individual override after bulk');
 await page.locator('[data-source-search]').fill('');assert.equal(await group().locator('[data-context-mode]').count(),4);
 // New discoveries remain per-item defaults: the folder action is not inherited.
 write('future/SKILL.md','# Future source');await group().locator('[data-refresh-root]').click();await until(async()=>(await inspect()).entries.length===5,'registered folder refresh in Configuration');
 const future=await inspect(),futureEntry=future.entries.find(entry=>entry.name==='Future source');assert.equal(future.workspaces.find(item=>item.id===fixture.personal.id).modes[futureEntry.id],undefined);
 assert.deepEqual(errors,[]);console.log('PASS disposable preview UI Source library card spacing/wrapping, shared-source wording, registration + scan feedback/rescan, all-workspace discovery, filtered folder Apply to all, individual override and no inherited future-source setting.');
}catch(error){await page?.screenshot({path:'/private/tmp/proteus-preview-source-controls-failure.png'}).catch(()=>{});throw error;}finally{if(app){const timer=setTimeout(()=>{void app.evaluate(({app})=>app.exit(0)).catch(()=>app.process().kill('SIGKILL'));},10000);await app.close().catch(()=>{});clearTimeout(timer);}await fixture.cleanup();}
