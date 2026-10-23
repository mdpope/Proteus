// Real Electron acceptance in a disposable synthetic profile. No retained preview mutation.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const require=createRequire(import.meta.url),{WorkspaceSession}=require('../desktop/windows/workspace-session.cjs');
const fixture=await sidebarFixture(),errors=[];let app,page;
const store=new WorkspaceSession(fixture.locations.home),session=store.get();
const otherProject=fixture.projects.find(project=>project.workspaceId===fixture.personal.id),otherRoot='project:local:'+otherProject.id;
session.tabs.push({id:'workspace:local:'+fixture.personal.id,type:'workspace',workspaceId:fixture.personal.id,label:'Personal',workspacePage:'projects'},
 {id:otherRoot,type:'workspace',workspaceId:fixture.personal.id,projectId:otherProject.id,label:otherProject.name,workspacePage:'chats'},
 {id:'personal-only-browser',type:'browser',parentId:otherRoot,label:'Synthetic personal-only resource',url:fixture.origin+'/personal-only',unloaded:true},
 {id:'studio-direct-browser',type:'browser',parentId:fixture.workspaceId,label:'Synthetic workspace-only resource',url:fixture.origin+'/studio-only',unloaded:true});
store.save(session);
const launch=async()=>{app=await electron.launch({args:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));await page.locator('[data-preview-workspace]').first().waitFor();};
const close=async()=>{if(!app)return;const process=app.process(),timer=setTimeout(()=>process.kill('SIGKILL'),15000);try{await app.close();}finally{clearTimeout(timer);app=null;}};
const api=route=>page.evaluate(async route=>(await fetch(route)).json(),route);
const projects=()=>page.locator('[data-preview-project-row]');
const projectOrder=()=>projects().evaluateAll(nodes=>nodes.map(node=>node.dataset.previewProjectRow));
const waitOrder=async expected=>page.waitForFunction(expected=>JSON.stringify([...document.querySelectorAll('[data-preview-project-row]')].map(node=>node.dataset.previewProjectRow))===JSON.stringify(expected),expected);
const showProjects=async()=>{await page.locator(`[data-preview-workspace="${fixture.studio.id}"]`).click();await projects().first().waitFor();};
const drag=async(source,target,{after=true,cancel=false}={})=>{const a=await page.locator(`[data-preview-open-project="${source}"]`).boundingBox(),b=await page.locator(`[data-preview-project-row="${target}"]`).boundingBox();await page.mouse.move(a.x+40,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+55,a.y+a.height/2,{steps:3});await page.mouse.move(a.x+55,b.y+b.height*(after?.8:.2),{steps:12});if(cancel)await page.keyboard.press('Escape');await page.mouse.up();};
const tabRows=()=>page.locator('[data-managed-tab]');
const tabIds=()=>tabRows().evaluateAll(nodes=>nodes.map(node=>node.dataset.managedTab));
const showProjectTabs=async()=>{await showProjects();await page.locator(`[data-preview-open-project="${fixture.project.id}"]`).click();await page.locator('[data-preview-project-page=tabs]').click();await tabRows().first().waitFor();};
try{
 await launch();await showProjects();const initial=await api('/api/state'),original=await projectOrder(),originalDefaults=initial.desktopPreview.defaultProjectIds,originalMemberships=initial.desktopPreview.memberships;
 assert.equal(original.length,10);
 const expander=page.locator(`[data-preview-workspace-expand="${fixture.studio.id}"]`);if(await expander.getAttribute('aria-expanded')!=='true')await expander.click();
 const sidebarOrder=()=>page.locator(`[data-preview-workspace-group="${fixture.studio.id}"] [data-preview-project]`).evaluateAll(nodes=>nodes.map(node=>node.dataset.previewProject));
 assert.deepEqual(await sidebarOrder(),original.slice(0,7));
 // Projects can be moved only here; no sidebar row exposes reorder controls.
 assert.equal(await page.locator('#sidebar [aria-keyshortcuts*="ArrowDown"]').count(),0);
 await page.locator(`[data-preview-open-project="${original[0]}"]`).focus();await page.keyboard.press('Alt+Shift+ArrowDown');
 const keyboard=[original[1],original[0],...original.slice(2)];await waitOrder(keyboard);assert.deepEqual(await sidebarOrder(),keyboard.slice(0,7));
 assert.equal(await page.locator(`[data-preview-open-project="${original[0]}"]`).evaluate(node=>node===document.activeElement),true);
 await drag(original[0],original[2]);const manual=[original[1],original[2],original[0],...original.slice(3)];await waitOrder(manual);assert.deepEqual(await sidebarOrder(),manual.slice(0,7));
 await drag(manual[0],manual[2],{cancel:true});assert.deepEqual(await projectOrder(),manual,'Escape must cancel project reordering.');
 const reordered=await api('/api/state');assert.deepEqual(reordered.desktopPreview.defaultProjectIds,originalDefaults);assert.deepEqual(reordered.desktopPreview.memberships,originalMemberships);
 assert.deepEqual(reordered.desktopPreview.projects.filter(project=>project.workspaceId===fixture.personal.id).map(project=>project.id),initial.desktopPreview.projects.filter(project=>project.workspaceId===fixture.personal.id).map(project=>project.id));
 // Selecting another project cannot change the chosen catalog/sidebar order.
 await page.locator(`[data-preview-open-project="${manual[2]}"]`).click();await showProjects();await waitOrder(manual);assert.deepEqual(await sidebarOrder(),manual.slice(0,7));
 await showProjectTabs();const scoped=await tabIds();assert.ok(scoped.length>=4);assert.equal(await page.locator('[data-managed-tab]').filter({hasText:'personal-only'}).count(),0);assert.equal(await page.locator('[data-managed-tab]').filter({hasText:'workspace-only'}).count(),0);
 assert.equal(await page.locator('.workspace-tab-reorder').count(),1,'Project own Tabs retains reorder.');
 assert.ok(await page.locator('.workspace-tab-title[aria-keyshortcuts]').count());
 await showProjects();await page.locator('[data-preview-page=tabs]').click();const aggregate=await tabIds();assert.equal(aggregate.length,scoped.length+1);assert.equal(await page.locator('[data-managed-tab]').filter({hasText:'personal-only'}).count(),0);
 assert.equal(await page.locator('.workspace-tab-reorder,[data-managed-tab] [data-action=up],[data-managed-tab] [data-action=down],[data-managed-tab] [aria-keyshortcuts]').count(),0,'Workspace aggregate exposes no ordering controls.');
 await tabRows().first().locator('.workspace-tab-title').focus();await page.keyboard.press('Alt+Shift+ArrowDown');assert.deepEqual(await tabIds(),aggregate);
 const a=await tabRows().first().locator('.workspace-tab-title').boundingBox(),b=await tabRows().last().boundingBox();await page.mouse.move(a.x+35,a.y+10);await page.mouse.down();await page.mouse.move(a.x+50,b.y+b.height*.8,{steps:12});await page.mouse.up();assert.deepEqual(await tabIds(),aggregate);
 // Close while a project chat is active; repeated passive reconciliation must not reopen it.
 await showProjects();await page.locator(`[data-preview-open-project="${fixture.project.id}"]`).click();await page.locator('.chat-index-row').first().click();await page.locator('#followup').waitFor();await page.locator('#followup').fill('Synthetic project order draft retained');
 await page.locator(`[data-close="${fixture.workspaceId}"]`).click();await page.waitForFunction(id=>!document.querySelector(`[data-tab="${id}"]`),fixture.workspaceId);
 await page.evaluate(async()=>{const preview=await import('/shared/navigation/desktop-preview.js');for(let i=0;i<4;i++)preview.reconcilePreviewChatPlacement();});
 await page.locator('[data-page=runs]').click();assert.equal(await page.locator(`[data-tab="${fixture.workspaceId}"]`).count(),0);
 const closed=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));assert.equal(closed.tabs.find(tab=>tab.id===fixture.workspaceId).navigationClosed,true);
 // Explicit project navigation restores the same workspace, project, chat and draft.
 await page.locator(`[data-preview-project="${fixture.project.id}"]`).click();await page.locator('.chat-index-row').first().click();await page.locator('#followup').waitFor();assert.equal(await page.locator('#followup').inputValue(),'Synthetic project order draft retained');assert.equal(await page.locator(`[data-tab="${fixture.workspaceId}"]`).count(),1);
 await showProjects();await waitOrder(manual);await page.screenshot({path:'/private/tmp/proteus-preview-project-order.png'});
 await page.reload();await page.locator('[data-preview-workspace]').first().waitFor();await showProjects();await waitOrder(manual);
 await close();await launch();await showProjects();await waitOrder(manual);const restarted=await api('/api/state');assert.deepEqual(restarted.desktopPreview.defaultProjectIds,originalDefaults);assert.deepEqual(restarted.desktopPreview.memberships,originalMemberships);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,synthetic:true,checks:['Projects keyboard reorder and focus','pointer drag and Escape cancellation','sidebar order follows catalog','default and membership preservation','selection leaves project order unchanged','strict project and workspace tab scopes','aggregate has no reorder affordance or behavior','passive reconciliation preserves workspace closure','explicit navigation preserves chat and draft','reload and full restart persistence'],screenshot:'/private/tmp/proteus-preview-project-order.png'}));
}catch(error){await page?.screenshot({path:'/private/tmp/proteus-preview-project-order-failure.png'}).catch(()=>{});throw error;}finally{await close();await fixture.cleanup();}
