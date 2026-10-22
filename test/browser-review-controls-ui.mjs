// Isolated current desktop UI: tab lifecycle, toolbar/menu icons, saved extension order.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const until=async fn=>{for(let i=0;i<150;i++){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,80));}throw Error('Browser review controls did not settle');};
const launch=()=>electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
try{
 app=await launch();let shell=await app.firstWindow();await shell.locator('body.window-design-preview').waitFor();
 const command=value=>shell.evaluate(value=>window.desktop.browser(value),value);
 await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().window.setBounds({x:80,y:70,width:1400,height:900}));
 const blankDouble=async selector=>{const strip=shell.locator(selector),box=await strip.boundingBox();assert.ok(box);await strip.dblclick({position:{x:box.width-6,y:box.height-8}});};
 let count=(await command({action:'list'})).length;await blankDouble('#tabs .tab-list');await until(async()=>(await command({action:'list'})).length===count+1);
 const rootId=await shell.locator('#tabs .tabitem.selected').getAttribute('data-tab-container');assert.ok(rootId);
 await shell.locator(`[data-tab="${rootId}"]`).dblclick();await shell.waitForTimeout(150);assert.equal((await command({action:'list'})).length,count+1,'Double-clicking an existing tab does not create another');
 await shell.locator(`[data-preview-workspace-expand="${fixture.studio.id}"]`).click();await shell.locator(`[data-preview-project="${fixture.project.id}"]`).first().click();
 count=(await command({action:'list'})).length;await blankDouble('#chat-subtabs .chat-subtab-list');await until(async()=>(await command({action:'list'})).length===count+1);
 const id=await shell.locator('.chat-subtab.selected [data-chat-subtab]').getAttribute('data-chat-subtab');await command({action:'navigate',id,url:fixture.origin+'/review-controls'});
 await until(async()=>shell.locator('[data-browser-downloads]').isVisible());
 const order=await shell.locator('.browserbar').evaluate(bar=>{const list=[...bar.querySelectorAll('button')];return {downloads:list.indexOf(bar.querySelector('[data-browser-downloads]')),menu:list.indexOf(bar.querySelector('[data-browser-extensions]'))};});assert.ok(order.downloads<order.menu);
 const before=(await command({action:'list',includeHistory:true})).find(tab=>tab.id===id);
 await shell.locator(`[data-chat-subtab="${id}"]`).click({button:'right'});let menu=await until(()=>app.windows().find(page=>page.url().endsWith('/browser-page-menu.html')));
 await menu.getByRole('menuitem',{name:'Hide browser tab',exact:true}).waitFor();assert.equal(await menu.getByRole('menuitem',{name:'Duplicate tab',exact:true}).locator('svg').count(),1);assert.ok(await menu.locator('.menu-icon').first().evaluate(node=>node.getBoundingClientRect().width<=16));
 const labels=await menu.getByRole('menuitem').allTextContents();assert.equal(labels.indexOf('Hide browser tab'),labels.indexOf('Unload browser tab')+1);
 await menu.screenshot({path:'/private/tmp/proteus-tab-menu-review.png'});await menu.getByRole('menuitem',{name:'Hide browser tab',exact:true}).click();
 await until(async()=>{const tab=(await command({action:'list',includeHistory:true})).find(tab=>tab.id===id);return tab?.hidden&&!tab.loaded;});assert.equal(await shell.locator(`[data-chat-subtab="${id}"]`).count(),0);
 const hidden=(await command({action:'list',includeHistory:true})).find(tab=>tab.id===id);assert.deepEqual(hidden.history.entries.map(({id,url})=>({id,url})),before.history.entries.map(({id,url})=>({id,url})));assert.equal(hidden.history.currentEntryId,before.history.currentEntryId);assert.equal(hidden.history.index,before.history.index);assert.equal(hidden.parentId,before.parentId);
 // Restore via existing native visibility operation and select, without recreating its identity.
 await command({action:'visibility',id,hidden:false});await until(()=>shell.locator(`[data-chat-subtab="${id}"]`).count());await shell.locator(`[data-chat-subtab="${id}"]`).click();
 const sources=[];for(const name of ['Alpha','Beta']){const folder=path.join(fixture.temporary,name);fs.cpSync(path.resolve('test/fixtures/tab-extension'),folder,{recursive:true});const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json')));manifest.name=name+' review extension';manifest.icons={16:'icon.png'};fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest));fs.copyFileSync(path.resolve('desktop/icon.png'),path.join(folder,'icon.png'));sources.push(folder);}
 const rows=await app.evaluate(async({app,dialog},sources)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),oldOpen=dialog.showOpenDialog,oldMessage=dialog.showMessageBox;try{dialog.showMessageBox=async()=>({response:1});for(const source of sources){dialog.showOpenDialog=async()=>({canceled:false,filePaths:[source]});await browser.command({action:'extensions-install',profileId:'default'});}return browser.command({action:'extensions-list'});}finally{dialog.showOpenDialog=oldOpen;dialog.showMessageBox=oldMessage;}},sources);
 assert.equal(rows.length,2);assert.ok(rows.every(row=>row.icon.startsWith('data:image/png;base64,')));assert.ok(rows.every(row=>!row.toolbar));
 for(const row of rows)await command({action:'extensions-toolbar',extensionId:row.id,pinned:true});
 await until(async()=>await shell.locator('[data-browser-extension-pins] button').count()===2);
 const ids=rows.map(row=>row.id).reverse();await command({action:'extensions-order',ids});await until(async()=>JSON.stringify(await shell.locator('[data-extension-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.extensionId)))===JSON.stringify(ids));
 await shell.getByRole('button',{name:'Page menu',exact:true}).click();menu=await until(()=>app.windows().find(page=>page.url().endsWith('/browser-page-menu.html')));await menu.getByRole('menuitem',{name:rows[0].name,exact:true}).waitFor();assert.equal(await menu.getByRole('menuitem',{name:rows[0].name,exact:true}).locator('img').count(),1);await menu.screenshot({path:'/private/tmp/proteus-page-menu-review.png'});await menu.keyboard.press('Escape').catch(()=>{});
 await shell.locator(`[data-extension-id="${ids[0]}"]`).click();const popup=await until(()=>app.windows().find(page=>page.url().startsWith('chrome-extension:')));await popup.getByText(/Extension API ready/).waitFor();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(window=>window.webContents.getURL().startsWith('chrome-extension:')).forEach(window=>window.close()));
 await command({action:'media-settings',blockVideoAutoplay:true});await shell.screenshot({path:'/private/tmp/proteus-browser-toolbar-review.png'});
 // Preferences use the same persisted records, including ordering and opt-in controls.
 await shell.evaluate(()=>document.dispatchEvent(new CustomEvent('proteus-browser-preferences')));await shell.getByRole('checkbox',{name:'Show '+rows[0].name+' in toolbar',exact:true}).waitFor();assert.equal(await shell.getByRole('checkbox',{name:'Show '+rows[0].name+' in toolbar',exact:true}).isChecked(),true);await shell.getByRole('checkbox',{name:'Show '+rows[0].name+' in toolbar',exact:true}).scrollIntoViewIfNeeded();await shell.screenshot({path:'/private/tmp/proteus-extension-preferences-review.png'});
 await app.close();app=await launch();shell=await app.firstWindow();await shell.locator('body.window-design-preview').waitFor();const restored=await command({action:'extensions-list'});assert.deepEqual(restored.map(row=>row.id),ids);assert.ok(restored.every(row=>row.toolbar));await assert.rejects(command({action:'extensions-order',ids:[ids[0],ids[0]]}),/Refresh/);await assert.rejects(command({action:'extensions-toolbar',extensionId:ids[0],pinned:'yes'}),/Choose/);assert.deepEqual((await command({action:'extensions-list'})).map(row=>row.id),ids);assert.equal((await command({action:'media-settings'})).blockVideoAutoplay,true);
 console.log('PASS: scoped empty-strip double-click, hide/unload/history, compact icons, toolbar order and popup, saved pins/order and autoplay across restart');
}finally{await app?.close();await fixture.cleanup();}
