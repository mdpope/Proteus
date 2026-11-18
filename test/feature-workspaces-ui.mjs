import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {crc32,deflateSync} from 'node:zlib';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
import {demoReminders} from '../scripts/fixtures/demo-reminders.mjs';

const fixture=await sidebarFixture();let app,page;const errors=[];
const chunk=(type,body)=>{const name=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(body.length);crc.writeUInt32BE(crc32(Buffer.concat([name,body])));return Buffer.concat([size,name,body,crc]);};const header=Buffer.alloc(13);header.writeUInt32BE(32);header.writeUInt32BE(32,4);header[8]=8;header[9]=6;const icon=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.concat(Array.from({length:32},()=>Buffer.concat([Buffer.from([0]),Buffer.from(Array.from({length:128},(_,i)=>[50,130,70,255][i%4]))]))))),chunk('IEND',Buffer.alloc(0))]);
const site=http.createServer((request,response)=>{if(request.url==='/icon.png'){response.setHeader('Content-Type','image/png');response.end(icon);}else{response.setHeader('Content-Type','text/html');response.end('<title>Feature favicon fixture</title><link rel="icon" href="/icon.png"><h1>Synthetic browser page</h1>');}});
await new Promise(resolve=>site.listen(0,'127.0.0.1',resolve));const siteURL='http://127.0.0.1:'+site.address().port;
try {
 app=await electron.launch({args:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.locator('[data-page=scratchpad]').waitFor();
 const reminders=demoReminders(path.join(fixture.locations.root,'demo-reminders.json'));
 await page.route('**/api/state?*',async route=>{const response=await route.fetch(),data=await response.json();if(!data.settings){await route.fulfill({response});return;}data.life={enabled:true,configured:true,ready:true,identity:reminders.identity,capabilities:[]};await route.fulfill({json:data});});
 await page.route('**/api/life/data',route=>route.fulfill({json:reminders.read(route.request().postDataJSON().query)}));
 await page.route('**/api/life/action',route=>{const value=route.request().postDataJSON();return route.fulfill({json:reminders.write(value.action.slice(10),value.input,value.idempotencyKey)});});
 await page.reload();await page.locator('[data-page=reminders]').click();
 const bar=page.getByRole('navigation',{name:'Reminder tabs',exact:true});await page.locator('.reminder-overview [data-open]').filter({hasText:'Review the new navigation'}).first().waitFor();
 assert.equal(await page.locator('.reminder-overview').isVisible(),true);
 const geometry=await page.evaluate(()=>({bar:document.querySelector('#feature-content-navigation').getBoundingClientRect().toJSON(),main:document.querySelector('#main').getBoundingClientRect().toJSON(),tabs:document.querySelector('#tabs').getBoundingClientRect().toJSON()}));
 assert.equal(Math.round(geometry.bar.x),Math.round(geometry.main.x),'Feature navigation is flush with the content edge');assert.equal(Math.round(geometry.bar.y),Math.round(geometry.tabs.bottom),'No buffer between the root and feature navigation');
 await page.locator('.reminder-overview [data-open]').filter({hasText:'Review the new navigation'}).first().click();await page.getByLabel('Title',{exact:true}).waitFor();
 await page.locator('.reminder-card[aria-current=true]').filter({hasText:'Review the new navigation'}).waitFor();
 await page.locator('[data-page=home]').click();await page.locator('[data-page=reminders]').click();
 await page.getByLabel('Title',{exact:true}).waitFor();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Review the new navigation','Sidebar return restores the selected reminder tab');
 await bar.getByRole('button',{name:'Close Review the new navigation',exact:true}).click();assert.equal(reminders.read({completed:'all'}).items.find(row=>row.title==='Review the new navigation').completedAt,null,'Opening and closing never completes a reminder');

 // A root-strip double-click never adopts the selected feature's membership.
 const featureCount=await bar.locator('.feature-content-tab').count();
 await page.locator('#tabs .tab-list').dispatchEvent('dblclick',{button:0});
 await page.locator('#tabs [data-tab-container]').filter({hasText:/New Tab/i}).last().waitFor();
 assert.equal(await page.locator('#feature-content-navigation').count(),0);
 const rootBlank=page.locator('#tabs .tabitem').filter({hasText:/New Tab/i}).last();const titleButton=rootBlank.locator('button[data-tab]'),closeButton=rootBlank.locator('.tabclose');const idleClose=await closeButton.evaluate(node=>getComputedStyle(node).backgroundColor);const idleTitle=await titleButton.evaluate(node=>getComputedStyle(node).backgroundColor);await titleButton.hover();await page.getByRole('tooltip').waitFor();
 const metrics=await rootBlank.evaluate(node=>({tab:node.getBoundingClientRect().height,title:node.querySelector('[data-tab]').getBoundingClientRect().height,close:node.querySelector('.tabclose').getBoundingClientRect().height,divider:getComputedStyle(node.querySelector('.tabclose'),'::before').height}));assert.ok(metrics.tab-metrics.title<=4);assert.equal(metrics.title,metrics.close,'Both hover regions fill the tab content height');
 const background=await titleButton.evaluate(node=>getComputedStyle(node).backgroundColor);assert.notEqual(background,idleTitle);assert.equal(await closeButton.evaluate(node=>getComputedStyle(node).backgroundColor),idleClose,'Title hover never highlights Close');await closeButton.hover();assert.notEqual(await closeButton.evaluate(node=>getComputedStyle(node).backgroundColor),idleClose);
 await rootBlank.locator('.tabclose').click();
 await page.locator('[data-page=reminders]').click();assert.equal(await bar.locator('.feature-content-tab').count(),featureCount);
 await bar.getByLabel('Add Reminders tab',{exact:true}).click();
 await page.locator('#browser-home-url').waitFor();assert.equal(await page.locator('#main [data-new-tab-action]').filter({hasText:'New chat'}).count(),0,'Feature New Tab uses Team Tools choices without chats');
 assert.equal(await page.locator('#tabs [data-tab-container]').filter({hasText:/New Tab/i}).count(),0);
 await page.locator('#browser-home-url').fill(siteURL);await page.locator('#browser-home-address').getByRole('button',{name:'Open address',exact:true}).click();
 const siteTab=bar.locator('.feature-content-tab').filter({hasText:'Feature favicon fixture'});await siteTab.locator('img.browser-tab-icon').waitFor();
 const insets=await page.evaluate(()=>({root:getComputedStyle(document.querySelector('#tabs .tabitem>button[data-tab]')).paddingLeft,feature:getComputedStyle(document.querySelector('.feature-workspace-tabs .feature-content-tab>button')).paddingLeft,icon:getComputedStyle(document.querySelector('.feature-workspace-tabs img.browser-tab-icon')).marginLeft}));
 assert.equal(insets.feature,insets.root,'Feature and root titles share the same left inset');assert.equal(insets.icon,'0px','Website favicons add no extra left margin');
 await siteTab.locator('.tabclose').click();await bar.getByLabel('Add Reminders tab',{exact:true}).click();await page.locator('#browser-home-url').waitFor();

 await page.locator('#main [data-new-tab-action]').filter({hasText:'Terminal'}).click();await page.locator('#terminal-profile').waitFor();await page.locator('#dialog-submit').click();await page.locator('.terminal-page').waitFor();
 assert.equal(await bar.locator('.feature-content-tab').count(),2,'Converting the blank keeps the terminal inside this feature');await bar.locator('.tabclose').last().click();await page.locator('.reminder-overview').waitFor();
 await bar.getByLabel('Add Reminders tab',{exact:true}).click();await page.locator('#browser-home-url').waitFor();

 await bar.getByRole('button',{name:'Reminders',exact:true}).click();
 const beforeOrder=await bar.locator('.feature-content-tab').evaluateAll(nodes=>nodes.map(node=>node.dataset.featureTab));
 await bar.getByLabel('Add Reminders tab',{exact:true}).click();await page.locator('#browser-home-url').waitFor();
 const afterOrder=await bar.locator('.feature-content-tab').evaluateAll(nodes=>nodes.map(node=>node.dataset.featureTab));assert.deepEqual(afterOrder.slice(0,-1),beforeOrder,'New tabs append after all existing feature tabs');
 await page.locator('[data-new-tab-action]').filter({hasText:/^Workspace files$/}).click();await page.locator('.workspace-file-browser').waitFor();
 await page.locator('[data-page=home]').click();await page.locator('[data-page=reminders]').click();await page.locator('.workspace-file-browser').waitFor();
 assert.equal(await page.locator('#tabs .tabitem').filter({hasText:/Files ·/}).count(),0,'Feature Files does not appear in the root strip');
 await page.waitForTimeout(6000); // Allow the bounded thumbnail cadence to capture this resource.
 await bar.getByRole('button',{name:'Reminders tab overview',exact:true}).click();
 const fileCard=page.getByRole('dialog').locator('[data-overview-select]').filter({hasText:/Files ·/});await fileCard.locator('img').waitFor();
 await fileCard.click();await page.locator('.workspace-file-browser').waitFor();
 await bar.locator('.tabclose').last().click();await bar.getByRole('button',{name:'Reminders',exact:true}).click();await bar.getByRole('button',{name:'Reminders tab overview',exact:true}).click();await page.getByRole('dialog').locator('[data-overview-select]').filter({hasText:'New Tab'}).first().click();await page.locator('#browser-home-url').waitFor();
 await bar.getByRole('button',{name:'Close New Tab',exact:true}).click();await page.locator('.reminder-overview').waitFor();
 await page.screenshot({path:process.cwd()+'/.runtime-tests/reminders-refined-desktop.png'});
 await page.locator('[data-page=scratchpad]').click();const settings=page.getByRole('combobox',{name:'Configured memory or library folder'});await settings.waitFor();
 const added=path.join(fixture.locations.root,'fresh-source');fs.mkdirSync(added);await page.evaluate(async folder=>{const catalog=await(await fetch('/api/workspace-projects')).json();const result=await fetch('/api/workspace-projects/sources',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add',path:folder,expectedRevision:catalog.revision})});if(!result.ok)throw Error(await result.text());},added);
 await page.waitForFunction(folder=>[...document.querySelector('[aria-label="Configured memory or library folder"]').options].some(row=>row.value===folder),added);
 await settings.selectOption(added);await page.getByRole('button',{name:'Use this folder',exact:true}).click();await page.getByRole('button',{name:'New scratch',exact:true}).click();await page.getByRole('textbox',{name:'Scratch title',exact:true}).fill('Retained scratch');await page.getByRole('button',{name:'Source',exact:true}).click();await page.locator('.cm-content').fill('Original data survives a storage change.');await page.getByRole('textbox',{name:'Scratch category',exact:true}).fill('Old list');await page.locator('.scratchpad-editor .note').filter({hasText:/^Saved$/}).waitFor();
 const scratchBar=page.getByRole('navigation',{name:'Scratchpad tabs',exact:true});await scratchBar.getByRole('button',{name:'Scratchpad',exact:true}).click();await page.getByRole('button',{name:'Scratchpad settings',exact:true}).click();await page.getByRole('heading',{name:'Scratchpad settings',exact:true}).waitFor();
 assert.match(await page.locator('.scratchpad-content').innerText(),/background worker/);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await scratchBar.getByRole('button',{name:'Retained scratch',exact:true}).click();assert.equal(await page.locator('.cm-content').innerText(),'Original data survives a storage change.');
 // A root-created scratch stays root even with Scratchpad selected in the sidebar.
 await page.locator('#tabs .tab-list').dispatchEvent('dblclick',{button:0});await page.locator('#browser-home-url').waitFor();await page.locator('[data-new-tab-action]').filter({hasText:/^Scratch( note)?$/}).click();await page.getByLabel('Scratch title',{exact:true}).waitFor();
 assert.equal(await page.locator('#feature-content-navigation').count(),0);const rootScratch=page.locator('#tabs .tabitem').filter({hasText:'Untitled'}).last();await rootScratch.waitFor();
 await page.reload();await page.getByLabel('Scratch title',{exact:true}).waitFor();assert.equal(await page.locator('#feature-content-navigation').count(),0,'Root scratch placement survives reload');
 await page.locator('[data-page=scratchpad]').click();await scratchBar.getByRole('button',{name:'Scratchpad',exact:true}).click();
 await scratchBar.getByRole('button',{name:'Retained scratch',exact:true}).click();
 const scratchTop=await page.locator('.scratchpad-tree').evaluate(node=>({bottom:node.getBoundingClientRect().bottom,window:innerHeight}));assert.ok(Math.abs(scratchTop.bottom-scratchTop.window)<3,'Scratch divider reaches the viewport bottom');
 const fileNames=()=>page.locator('.scratchpad-tree tbody tr').evaluateAll(nodes=>nodes.map(node=>node.textContent.trim()));const ascending=await fileNames();await page.locator('.scratchpad-tree [data-sort=name]').click();await page.waitForTimeout(150);assert.notDeepEqual(await fileNames(),ascending,'Name toggles actual order');
 await scratchBar.getByRole('button',{name:'Scratchpad',exact:true}).click();
 const replacement=path.join(fixture.locations.root,'replacement-source');fs.mkdirSync(path.join(replacement,'Scratchpad'),{recursive:true});fs.writeFileSync(path.join(replacement,'Scratchpad','Imported.md'),'# Imported from new location');
 await scratchBar.getByRole('button',{name:'Scratchpad',exact:true}).click();await page.getByRole('combobox',{name:'Scratch category',exact:true}).selectOption('Old list');await page.getByRole('button',{name:'Scratchpad settings',exact:true}).click();await page.getByRole('textbox',{name:'Scratchpad storage folder',exact:true}).fill(replacement);
 page.once('dialog',dialog=>{assert.match(dialog.message(),/index will be rebuilt.*background/i);void dialog.accept();});await page.getByRole('button',{name:'Use this folder',exact:true}).click();await page.locator('.scratchpad-row').filter({hasText:'Imported'}).waitFor();
 assert.ok(fs.readdirSync(path.join(added,'Scratchpad')).filter(name=>name.endsWith('.md')).some(name=>fs.readFileSync(path.join(added,'Scratchpad',name),'utf8').includes('Original data survives a storage change.')));
 await scratchBar.getByLabel('Add Scratchpad tab',{exact:true}).click();await page.locator('#browser-home-url').waitFor();
 await page.reload();await page.getByRole('navigation',{name:'Scratchpad tabs',exact:true}).waitFor();await page.locator('#browser-home-url').waitFor();await page.getByRole('navigation',{name:'Scratchpad tabs',exact:true}).getByRole('button',{name:'Scratchpad',exact:true}).click();await page.locator('.scratchpad-row').filter({hasText:'Imported'}).waitFor();
 await page.reload();await page.locator('.scratchpad-row').filter({hasText:'Imported'}).waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,synthetic:true,flushNavigation:true,recordCloseDoesNotComplete:true,folderRefresh:true,settingsGear:true,mixedTabs:true,restore:true}));
}catch(error){console.error(error);await page?.screenshot({path:process.cwd()+'/.runtime-tests/feature-workspaces-failure.png'}).catch(()=>{});throw error;}finally{
 await app?.context().request.dispose();
 if(app){const child=app.process();let timeout;const closed=await Promise.race([app.close().then(()=>true,()=>false),new Promise(resolve=>{timeout=setTimeout(()=>resolve(false),10000);})]);clearTimeout(timeout);if(!closed&&child.exitCode===null&&child.signalCode===null){const exit=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGKILL');await exit;}}
 await new Promise(resolve=>site.close(resolve));await fixture.cleanup();
}
// Playwright may retain its inspector transport after Electron exits. All
// assertions, the child process and the synthetic HTTP fixture are settled.
process.exit(0);
