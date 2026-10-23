// Real Electron interaction acceptance, using only a disposable synthetic preview.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const temporary=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-polish-ui-'))),previewRoot=path.join(temporary,'preview'),auth=path.join(temporary,'empty-codex');fs.mkdirSync(auth);
let app,page,projectId,studioId;const errors=[];
const fixtureServer=createServer((request,response)=>{const title='Synthetic browser '+request.url.slice(1);response.writeHead(200,{'Content-Type':'text/html'});response.end('<!doctype html><title>'+title+'</title><h1>'+title+'</h1><p>Disposable local UI fixture.</p>');});
const rows=()=>page.locator('[data-managed-tab]');
const order=()=>rows().evaluateAll(nodes=>nodes.map(node=>node.dataset.managedTab));
const api=route=>page.evaluate(async route=>(await fetch(route)).json(),route);
const launch=async()=>{app=await electron.launch({args:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:previewRoot,CODEX_HOME:auth,PORT:'0'}});page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));await page.locator('[data-preview-workspace]').first().waitFor();};
const close=async()=>{if(!app)return;const child=app.process(),timer=setTimeout(()=>child.kill('SIGKILL'),15000);try{await app.close();}finally{clearTimeout(timer);app=null;}};
const projectRoot=()=>page.locator('#chat-subtabs>.preview-project-root');
const showTabs=async()=>{await projectRoot().click();await page.locator('[data-preview-project-page=tabs]').click();await rows().first().waitFor();};
const waitOrder=async expected=>{await page.waitForFunction(expected=>JSON.stringify([...document.querySelectorAll('[data-managed-tab]')].map(node=>node.dataset.managedTab))===JSON.stringify(expected),expected);};
const drag=async(source,target,{from='title',after=true}={})=>{
 const sourceRow=page.locator(`[data-managed-tab="${source}"]`),targetRow=page.locator(`[data-managed-tab="${target}"]`);
 const origin=from==='title'?sourceRow.locator('.workspace-tab-title'):from==='empty'?sourceRow.locator('time').first():sourceRow.locator(from);
 await origin.scrollIntoViewIfNeeded();const a=await origin.boundingBox(),b=await targetRow.boundingBox();
 await page.mouse.move(a.x+Math.min(a.width/2,80),a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+Math.min(a.width/2,80)+10,a.y+a.height/2,{steps:3});await page.mouse.move(a.x+Math.min(a.width/2,80),b.y+b.height*(after?.8:.2),{steps:12});await page.mouse.up();
};
try{
 await new Promise(resolve=>fixtureServer.listen(0,'127.0.0.1',resolve));
 await launch();const initial=await api('/api/state');studioId=initial.context.workspaces.find(row=>row.name==='Studio').id;projectId=initial.desktopPreview.projects.find(row=>row.workspaceId===studioId&&row.name==='Design review').id;
 assert.equal(fs.existsSync(path.join(previewRoot,'codex','auth.json')),false);
 assert.deepEqual(await page.locator('[data-preview-tab-icon]').evaluateAll(nodes=>nodes.map(node=>node.dataset.previewTabIcon)),['projects','chats','tabs','configuration']);
 assert.equal(await page.locator('[data-preview-tab-icon=projects] svg').count(),1);assert.equal(await page.locator('[data-preview-tab-icon=chats] svg').count(),1);assert.match(await page.locator('[data-preview-tab-icon=configuration]').innerText(),/⚙/);
 const accent='rgb(190, 220, 147)';
 assert.equal(await page.locator('[data-preview-page].selected [data-preview-tab-icon]').evaluate(node=>getComputedStyle(node).color),accent);
 assert.equal(await page.locator('#tabs .selected>[data-tab]>.preview-tab-icon').evaluate(node=>getComputedStyle(node).color),accent);
 await page.locator('[data-page=team]').click();await page.locator('[data-team-tab=overview]').waitFor();assert.equal(await page.locator('[data-team-tab=overview]>.preview-tab-icon').evaluate(node=>getComputedStyle(node).color),accent);assert.equal(await page.locator('[data-team-tab=overview]>span:last-child').evaluate(node=>getComputedStyle(node).color),'rgb(255, 255, 255)');
 await page.locator(`[data-preview-workspace="${studioId}"]`).click();
 await page.locator(`[data-preview-workspace-expand="${studioId}"]`).click();await page.locator(`[data-preview-project="${projectId}"]`).click();
 const projectStyle=await page.locator(`[data-preview-expand="${projectId}"]`).evaluate(node=>({active:node.parentElement.classList.contains('active'),background:getComputedStyle(node.parentElement).backgroundColor,button:getComputedStyle(node).backgroundColor,label:getComputedStyle(node.parentElement.querySelector('.preview-project-link')).color,accent:getComputedStyle(node).getPropertyValue('--preview-sidebar-project-title').trim()}));assert.equal(projectStyle.active,true);assert.equal(projectStyle.background,'rgba(0, 0, 0, 0)');assert.equal(projectStyle.button,'rgba(0, 0, 0, 0)');assert.equal(projectStyle.label,await page.evaluate(color=>{const el=document.createElement('i');el.style.color=color;document.body.append(el);const result=getComputedStyle(el).color;el.remove();return result;},projectStyle.accent));
 await page.locator('.chat-index-row').first().click();await page.locator('#followup').waitFor();assert.equal(await page.locator('#preview-composer-permissions').count(),0);assert.equal(await page.locator('[data-preview-permissions]').isVisible(),true);
 await page.locator('#followup').fill('Synthetic polish draft survives details controls');
 for(const [button,field] of [['[data-preview-permission-help]',null],['[data-preview-add-folder]','#preview-folder-path']]){await page.locator(button).click();assert.equal(await page.locator('#dialog').evaluate(node=>node.open),true);if(field)assert.equal(await page.locator(field).isVisible(),true);await page.locator('#close-dialog').click();}
 assert.equal(await page.locator('[data-preview-chat-mode]').count(),4);assert.equal(await page.locator('[data-preview-change-mode]').count(),0);
 for(const mode of ['ask','custom','inherit']){await page.locator(`[data-preview-chat-mode="${mode}"]`).click();await page.waitForFunction(mode=>document.querySelector(`[data-preview-chat-mode="${mode}"]`)?.getAttribute('aria-pressed')==='true',mode);assert.equal(await page.locator('#dialog').evaluate(node=>node.open),false);assert.equal(await page.locator('#followup').inputValue(),'Synthetic polish draft survives details controls');if(mode==='ask')assert.equal(await page.locator('[data-preview-read-only]').isDisabled(),true);}
 assert.equal(await page.locator('#followup').inputValue(),'Synthetic polish draft survives details controls');
 for(let i=0;i<3;i++){await projectRoot().click();await page.locator('.chat-tab-add summary').click();await page.locator('[data-chat-add=browser]').click();await page.locator('#browser-url').waitFor();await page.locator('#browser-url').fill('http://127.0.0.1:'+fixtureServer.address().port+'/tab-'+(i+1));await page.locator('#browser-url').press('Enter');await page.waitForFunction(()=>document.querySelector('.chat-subtab.selected')?.textContent.includes('Synthetic browser'));}
 const colors=await page.locator('.chat-subtab').evaluateAll(nodes=>nodes.map(node=>({selected:node.classList.contains('selected')||node.classList.contains('active'),color:getComputedStyle(node.querySelector('[data-chat-subtab]')).color})));assert.ok(colors.some(row=>row.selected&&row.color==='rgb(255, 255, 255)'),JSON.stringify(colors));
 assert.equal(await page.locator('.chat-subtab.selected .preview-tab-icon').evaluate(node=>getComputedStyle(node).color),accent);
 await showTabs();assert.equal(await rows().count(),4);assert.equal(await page.locator('[data-managed-tab] [data-action=up],[data-managed-tab] [data-action=down]').count(),0);
 const original=await order();const chatId=original.find(id=>id.includes(':chat:'));assert.ok(chatId);assert.equal(await page.locator(`[data-managed-tab="${chatId}"] .workspace-tab-icon svg`).count(),1);
 // Below threshold, the title remains an ordinary Open action.
 const title=page.locator(`[data-managed-tab="${chatId}"] .workspace-tab-title`),point=await title.boundingBox();await page.mouse.move(point.x+30,point.y+point.height/2);await page.mouse.down();await page.mouse.move(point.x+32,point.y+point.height/2+1);await page.mouse.up();await page.locator('#followup').waitFor();assert.equal(await page.locator('#followup').inputValue(),'Synthetic polish draft survives details controls');await showTabs();assert.deepEqual(await order(),original);
 await drag(original[0],original[3]);const moved=[...original.slice(1),original[0]];await waitOrder(moved);
 await drag(moved[3],moved[0],{from:'empty',after:false});await waitOrder(original);
 // Escape cancels an in-progress drag without swallowing the next protected-control click.
 const cancelTitle=await page.locator(`[data-managed-tab="${original[0]}"] .workspace-tab-title`).boundingBox();await page.mouse.move(cancelTitle.x+30,cancelTitle.y+15);await page.mouse.down();await page.mouse.move(cancelTitle.x+45,cancelTitle.y+30,{steps:3});await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual(await order(),original);
 // Protected action buttons still perform their action, without starting a drag.
 await drag(original[1],original[3],{from:'[data-action=hide]'});assert.deepEqual(await order(),original);
 await page.locator(`[data-managed-tab="${original[1]}"] [data-action=hide]`).click();await page.locator(`[data-managed-tab="${original[1]}"] [data-action=restore]`).waitFor();assert.deepEqual(await order(),original);await page.locator(`[data-managed-tab="${original[1]}"] [data-action=restore]`).click();await page.locator(`[data-managed-tab="${original[1]}"] [data-action=hide]`).waitFor();
 const resizer=page.locator('[data-resize-column="1"]'),beforeWidth=await resizer.getAttribute('aria-valuenow');await resizer.focus();await page.keyboard.press('ArrowRight');assert.notEqual(await resizer.getAttribute('aria-valuenow'),beforeWidth);assert.deepEqual(await order(),original);
 // Pointer movement from a resize handle changes only the column, never tab order.
 const handle=await resizer.boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+45,handle.y+120,{steps:10});await page.mouse.up();assert.deepEqual(await order(),original);
 // Reordering has a discoverable keyboard equivalent on each row.
 const first=page.locator(`[data-managed-tab="${original[0]}"]`);assert.match(await first.getAttribute('aria-keyshortcuts'),/ArrowDown/);await first.locator('.workspace-tab-title').focus();await page.keyboard.press('Alt+Shift+ArrowDown');const keyboard=[original[1],original[0],...original.slice(2)];await waitOrder(keyboard);
 assert.equal(await page.locator(`[data-managed-tab="${original[0]}"] .workspace-tab-title`).evaluate(node=>node===document.activeElement),true);
 // Filtering reorders visible same-owner rows in the full sibling list.
 await page.locator('[data-preview-type]').selectOption('browser');const filtered=await order();assert.equal(filtered.length,3);await drag(filtered[0],filtered[2]);await waitOrder([...filtered.slice(1),filtered[0]]);
 const finalOrder=keyboard.filter(id=>id!==filtered[0]);finalOrder.splice(finalOrder.indexOf(filtered[2])+1,0,filtered[0]);await page.locator('[data-preview-type]').selectOption('');await waitOrder(finalOrder);
 // The workspace aggregate includes different owners; dragging across owners cannot move a tab.
 await page.locator(`[data-preview-workspace="${studioId}"]`).click();await page.locator('.chat-tab-add summary').click();await page.locator('[data-chat-add=browser]').click();await page.locator('#browser-url').waitFor();await page.locator('[data-preview-page=tabs]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-managed-tab]').length===5);
 const mixed=await order(),direct=mixed.find(id=>!finalOrder.includes(id));assert.ok(direct);await drag(finalOrder[0],direct);assert.deepEqual(await order(),mixed,'Cross-owner dragging preserves membership and order.');
 await page.locator(`[data-preview-workspace="${studioId}"]`).click();await page.locator(`[data-preview-open-project="${projectId}"]`).click();await showTabs();await waitOrder(finalOrder);
 await page.screenshot({path:'/private/tmp/proteus-preview-polish-tabs.png'});
 const saved=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));assert.deepEqual(saved.tabs.filter(tab=>tab.parentId==='project:local:'+projectId).map(tab=>tab.id),finalOrder);
 await page.reload();await page.locator('[data-preview-workspace]').first().waitFor();await page.locator(`[data-preview-workspace="${studioId}"]`).click();await page.locator(`[data-preview-open-project="${projectId}"]`).click();await showTabs();await waitOrder(finalOrder);
 await close();await launch();await page.locator(`[data-preview-workspace="${studioId}"]`).click();await page.locator(`[data-preview-open-project="${projectId}"]`).click();await showTabs();
 // Browser runtime IDs change on restart; distinct synthetic URLs and the real chat ID preserve identity.
 const restored=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));const restoredRows=restored.tabs.filter(tab=>tab.parentId==='project:local:'+projectId);assert.deepEqual(restoredRows.map(tab=>tab.runId||tab.url||tab.label),saved.tabs.filter(tab=>tab.parentId==='project:local:'+projectId).map(tab=>tab.runId||tab.url||tab.label));
 // Exercise the reusable table's ordinary-mode compatibility and anchor guard in a disposable rendered fixture.
 await page.evaluate(async()=>{
  const {mountWorkspaceTabs}=await import('/features/workspaces/workspace-tabs.js');
  const dialog=document.createElement('dialog');dialog.id='polish-table-fixture';dialog.style.width='1200px';dialog.innerHTML='<section></section>';document.body.append(dialog);dialog.showModal();
  const tabs=[{id:'fixture-a',parentId:'fixture-owner',type:'browser',title:'Synthetic A',url:'https://example.invalid/a'},{id:'fixture-b',parentId:'fixture-owner',type:'browser',title:'Synthetic B',url:'https://example.invalid/b'}];
  window.polishFixture={tabs,actions:[],moves:[],links:0,mount:preview=>mountWorkspaceTabs(dialog.firstElementChild,{tabs,preview,act:async action=>window.polishFixture.actions.push(action),refresh:()=>tabs,...(preview?{reorder:async(...args)=>window.polishFixture.moves.push(args)}:{})})};window.polishFixture.mount(false);
 });
 assert.equal(await page.locator('#polish-table-fixture [data-action=up],#polish-table-fixture [data-action=down]').count(),4,'Ordinary tables retain the existing arrow controls.');
 await page.evaluate(()=>{window.polishFixture.mount(true);const cell=document.querySelector('#polish-table-fixture .workspace-tab-url');cell.innerHTML='<a href="#synthetic-anchor">Synthetic link</a>';cell.firstElementChild.onclick=event=>{event.preventDefault();window.polishFixture.links++;};});
 assert.equal(await page.locator('#polish-table-fixture [data-action=up],#polish-table-fixture [data-action=down]').count(),0);
 await drag('fixture-a','fixture-b',{from:'a'});assert.equal(await page.evaluate(()=>window.polishFixture.moves.length),0,'Anchor dragging does not reorder rows.');
 await page.locator('#polish-table-fixture a').click();assert.equal(await page.evaluate(()=>window.polishFixture.links),1,'The protected link still activates normally.');
 // A rerender/navigation that detaches the source must cancel the pending pointer gesture.
 const detached=await page.locator('#polish-table-fixture [data-managed-tab="fixture-a"] .workspace-tab-title').boundingBox(),destination=await page.locator('#polish-table-fixture [data-managed-tab="fixture-b"]').boundingBox();
 await page.mouse.move(detached.x+25,detached.y+15);await page.mouse.down();await page.mouse.move(detached.x+40,detached.y+25,{steps:3});
 await page.locator('#polish-table-fixture [data-managed-tab="fixture-a"]').evaluate(node=>node.remove());await page.mouse.move(detached.x+40,destination.y+destination.height*.8,{steps:3});await page.mouse.up();
 assert.equal(await page.evaluate(()=>window.polishFixture.moves.length),0,'Detached source rows cannot commit a stale reorder.');
 await page.evaluate(()=>{document.querySelector('#polish-table-fixture').remove();delete window.polishFixture;});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,synthetic:true,checks:['fixed feature icons','strong project label and continuous panel header','single permissions sidebar','permission dialogs and inline modes preserve draft','selected tab white titles and green icons across all navigation bars','paired chat table icon','title click threshold','title and empty-row drag','Escape and detached-source cancellation','protected controls and links','ordinary tables retain arrows','keyboard reorder','filtered order and cross-owner guard','durable order reload and restart'],screenshot:'/private/tmp/proteus-preview-polish-tabs.png'}));
}catch(error){console.error(error);await page?.screenshot({path:'/private/tmp/proteus-preview-polish-failure.png'}).catch(()=>{});throw error;}finally{await close();await new Promise(resolve=>fixtureServer.close(resolve));fs.rmSync(temporary,{recursive:true,force:true});}
