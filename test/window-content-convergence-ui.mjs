// Synthetic owner data and loopback pages only; never opens an installed data home.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
import {ContentTabs} from '../src/services/workspaces/content-tabs.js';
const require=createRequire(import.meta.url),{WorkspaceSession}=require('../desktop/windows/workspace-session.cjs');
const fixture=await sidebarFixture(),owner=new ContentTabs(fixture.locations.home),store=new WorkspaceSession(fixture.locations.home);
owner.seedWorkspace(store.get());
const scope={scope:'project',id:fixture.project.id},history={entries:['back','selected','forward'].map(id=>({id,url:fixture.origin+'/'+id,title:id})),index:1,currentEntryId:'selected',revision:3};
const pagedHistory={entries:Array.from({length:451},(_,i)=>({id:'paged-'+i,url:fixture.origin+'/paged/'+i,title:'Page '+i})),index:440,currentEntryId:'paged-440',revision:1};
let current=owner.get(scope.scope,scope.id);
owner.mutate({...scope,expectedRevision:current.revision,operations:[{action:'open',tab:{id:'owner-only-browser',type:'browser',title:'Owner browser',url:history.entries[1].url,history}},{action:'open',tab:{id:'paged-owner-browser',type:'browser',title:'Paged owner history',url:pagedHistory.entries[440].url,history:pagedHistory}},{action:'open',tab:{id:'chat:'+fixture.user[1].id,type:'chat',chatId:fixture.user[1].id,title:'Owner chat'}},{action:'open',tab:{id:'document:'+'a'.repeat(64),type:'document',documentId:'a'.repeat(64),title:'Unavailable worktree document',mediaType:'text/markdown'}}]});
current=owner.get(scope.scope,scope.id);owner.mutate({...scope,expectedRevision:current.revision,operations:[{action:'reorder',ids:current.tabs.map(tab=>tab.id).reverse()}]});
let app;const errors=[];
const until=async(fn,label)=>{for(let i=0;i<200;i++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
const session=page=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
const native=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
const logical=tab=>tab.contentTabId||(['run','remote-run'].includes(tab.type)?'chat:'+(tab.runId||tab.id):tab.type==='terminal'?'terminal:'+tab.terminal.id:tab.id);
const childIds=async(page,parent=fixture.parentId)=>(await session(page))?.tabs.filter(tab=>tab.parentId===parent).map(logical)||[];
const ready=async page=>{page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor();await until(async()=>!!await session(page),'initial window checkpoint');return page;};
async function openProject(page){const expand=page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]');await expand.waitFor();if(await expand.getAttribute('aria-expanded')!=='true')await expand.click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();}
const launch=async()=>{app=await electron.launch({...(process.env.PROTEUS_UI_EXECUTABLE?{executablePath:process.env.PROTEUS_UI_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_UI_EXECUTABLE?[]:['.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});};
const snapshot=(scope= {scope:'project',id:fixture.project.id})=>native((main,scope)=>main.getService().contentTabs.getAsync(scope.scope,scope.id),scope);
const mutate=(scope,operations)=>native(async(main,{scope,operations})=>{
 const service=main.getService();
 for(let attempt=0;attempt<8;attempt++)try{return await service.mutateContentTabs({...scope,expectedRevision:service.contentTabs.get(scope.scope,scope.id).revision,operations});}
 catch(error){if(!/Content tabs changed/.test(error.message)||attempt===7)throw error;await new Promise(resolve=>setTimeout(resolve,25));}
},{scope,operations});
const converge=async(pages,scope,parent)=>{
 try{await until(async()=>{const expected=(await snapshot(scope)).tabs.map(tab=>tab.id);const lists=await Promise.all(pages.map(page=>childIds(page,parent)));return lists.every(ids=>JSON.stringify([...new Set(ids)])===JSON.stringify(expected));},scope.scope+' canonical membership/order');}
 catch(error){console.error(JSON.stringify({scope,owner:await snapshot(scope),windows:await Promise.all(pages.map(async page=>({order:await childIds(page,parent),active:(await session(page))?.active,pending:await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/navigation\.(pending|request)/.test(k)).map(k=>[k,localStorage.getItem(k)])))})))}));throw error;}
};
const selected=async(page,chatId,draft)=>{
 await openProject(page);const tab=(await session(page)).tabs.find(tab=>tab.parentId===fixture.parentId&&(tab.runId||tab.id)===chatId);
 await page.locator('[data-chat-subtab="'+tab.id+'"]').click();await page.locator('#followup').fill(draft);
 await until(async()=>(await session(page)).chatDrafts?.[chatId]===draft,'window-private chat draft');return tab.id;
};
try{
 await launch();
 const first=await ready(await app.firstWindow()),expected=()=>native(async(main,scope)=>(await main.getService().contentTabs.getAsync(scope.scope,scope.id)).tabs.map(tab=>tab.id),scope);
 await until(async()=>(await childIds(first)).includes('owner-only-browser'),'owner addition reaches inactive project');
 const canonical=await expected();
 // Observe multiple completed reads, not merely a stale saved session after launch.
 await first.waitForTimeout(1800);
 const initial=await childIds(first);
 assert.deepEqual([...new Set(initial)],canonical,'live inactive project must use canonical order despite a saved chat alias');
 assert.ok((await session(first)).tabs.some(tab=>tab.id==='synthetic-duplicate-chat-view'),'historical view aliases are retained, not deleted');
 const opened=app.waitForEvent('window');await native(main=>main.createWindow());const second=await ready(await opened);await openProject(second);
 await until(async()=>JSON.stringify([...new Set(await childIds(second))])===JSON.stringify(canonical),'second window membership/order');
 assert.deepEqual([...new Set(await childIds(first))],[...new Set(await childIds(second))]);
 await openProject(first);
 const visibleIds=async page=>{const ids=await page.locator('[data-chat-subtab]').evaluateAll(nodes=>nodes.map(node=>node.dataset.chatSubtab));return (await session(page)).tabs.filter(tab=>ids.includes(tab.id)&&tab.parentId===fixture.parentId).map(logical);};
 assert.deepEqual(await visibleIds(first),await visibleIds(second),'each strip shows the same owner tabs, without duplicate alias buttons');
 assert.equal((await session(first)).tabs.find(tab=>logical(tab)==='document:'+'a'.repeat(64)).type,'unavailable','a missing source cannot prevent baseline or later browser mirrors');
 console.log('PASS initial inactive project, missing document placeholder and two-window convergence');
 // Real simultaneous native opens exercise the renderer outboxes and revision rebase.
 const openedTabs=await Promise.all([first,second].map((page,i)=>page.evaluate(value=>window.desktop.browser({action:'create',...value}),{parentId:fixture.parentId,url:fixture.origin+'/concurrent-'+i,unloaded:true})));
 await until(async()=>openedTabs.every(tab=>(owner.get(scope.scope,scope.id).tabs.some(row=>row.id===tab.id))),'both concurrent opens committed');
 await converge([first,second],scope,fixture.parentId);
 const firstView=await selected(first,fixture.user[0].id,'Draft for the first window'),secondView=await selected(second,fixture.user[1].id,'Draft for the second window');
 // An actual keyboard reorder in the second window must publish, rather than
 // being mistaken for a passive owner ordering update in the first window.
 await openProject(second);await second.locator('[data-preview-project-page="tabs"]').click();
 const beforeReorder=(await snapshot()).tabs.map(tab=>tab.id);
 await second.locator('[data-managed-tab] .workspace-tab-title').first().focus();await second.keyboard.press('Alt+Shift+ArrowDown');
 await until(async()=>JSON.stringify((await snapshot()).tabs.map(tab=>tab.id))!==JSON.stringify(beforeReorder),'keyboard reorder published');
 await converge([first,second],scope,fixture.parentId);assert.equal((await session(first)).active,firstView);
 console.log('PASS concurrent opens, private drafts and keyboard reorder');
 // Both views retain independent browser positions through a passive order change.
 const browserViews=[];
 for(const page of [first,second]){await openProject(page);const tab=(await session(page)).tabs.find(tab=>logical(tab)==='owner-only-browser');await page.locator('[data-chat-subtab="'+tab.id+'"]').click();browserViews.push(tab.id);}
 await until(()=>native((main,ids)=>ids.every(id=>!!main.getBrowser().get(id).view),browserViews),'both native views loaded');
 await native(async(main,ids)=>{for(const [i,id]of ids.entries())await main.getBrowser().get(id).view.webContents.executeJavaScript('document.body.style.height="6000px";window.scrollTo(0,'+(120+i*500)+');null');},browserViews);
 await mutate(scope,[{action:'reorder',ids:(await snapshot()).tabs.map(tab=>tab.id).reverse()}]);await converge([first,second],scope,fixture.parentId);
 assert.deepEqual(await native((main,ids)=>Promise.all(ids.map(id=>main.getBrowser().get(id).view.webContents.executeJavaScript('window.scrollY'))),browserViews),[120,620]);
 // Change the browser surface without resizing #workspace. Observing only the
 // outer workspace misses this and leaves stale native view dimensions.
 const geometry=async(page,id)=>({area:await page.locator('#browser-area').evaluate(node=>{const r=node.getBoundingClientRect();return Object.fromEntries(['x','y','width','height'].map(key=>[key,Math.round(r[key])]))}),view:await native((main,id)=>main.getBrowser().get(id).view.getBounds(),id)});
 for(const [i,page]of [first,second].entries()){
   await page.locator('#browser-form').evaluate(node=>{node.style.minHeight='130px';});
   await until(async()=>{const g=await geometry(page,browserViews[i]);return JSON.stringify(g.area)===JSON.stringify(g.view);},'native browser fills resized content area without switching tabs');
   await page.locator('#browser-form').evaluate(node=>{node.style.minHeight='';});
   await until(async()=>{const g=await geometry(page,browserViews[i]);return JSON.stringify(g.area)===JSON.stringify(g.view);},'native browser reclaims full space after toolbar contracts');
 }
 console.log('PASS browser surface geometry changes without tab switching');
 // Human Close goes through the real UI with an established unavailable source.
 const closeView=(await session(first)).tabs.find(tab=>logical(tab)===openedTabs[0].id);
 await first.locator('[data-chat-child-close="'+closeView.id+'"]').click();
 await converge([first,second],scope,fixture.parentId);
 assert.ok((await snapshot()).closed[openedTabs[0].id],'explicit UI Close commits a durable owner tombstone');

 for(const [i,page]of [first,second].entries())await page.evaluate(i=>window.desktop.viewPositions({action:'set',key:'synthetic-reading',position:[['root',{top:120+i*500,left:0}]]}),i);
 await selected(first,fixture.user[0].id,'Draft for the first window');await selected(second,fixture.user[1].id,'Draft for the second window');
 // Inactive workspace roots receive additions, moves, closes and ordering too.
 const workspace={scope:'workspace',id:fixture.studio.id};
 await mutate(workspace,[{action:'open',tab:{id:'workspace-browser',type:'browser',title:'Workspace tab',url:fixture.origin+'/workspace'}}]);
 await converge([first,second],workspace,fixture.workspaceId);
 await native(async(main,{scope,destination})=>{const service=main.getService();return service.tabManagement.handle({action:'move',...scope,tabId:'owner-only-browser',expectedRevision:service.contentTabs.get(scope.scope,scope.id).revision,destination:{...destination,expectedRevision:service.contentTabs.get(destination.scope,destination.id).revision}});},{scope,destination:workspace});
 await converge([first,second],scope,fixture.parentId);await converge([first,second],workspace,fixture.workspaceId);
 const moved=(await snapshot(workspace)).tabs.find(tab=>tab.id==='owner-only-browser');assert.deepEqual(moved.history.entries.map(entry=>entry.id),history.entries.map(entry=>entry.id));assert.equal(moved.history.currentEntryId,'selected');
 await mutate(scope,[{action:'close',id:openedTabs[0].id}]);await converge([first,second],scope,fixture.parentId);
 await mutate(workspace,[{action:'reorder',ids:(await snapshot(workspace)).tabs.map(tab=>tab.id).reverse()}]);await converge([first,second],workspace,fixture.workspaceId);
 assert.equal((await session(first)).active,firstView);assert.equal((await session(second)).active,secondView);
 // Restore an older named layout after owner membership/order changed while closed.
 const secondID=await second.evaluate(()=>window.desktop.windowId),windows=await first.evaluate(()=>window.desktop.windowLayouts({action:'list'}));
 const saved=await first.evaluate(value=>window.desktop.windowLayouts(value),{action:'save',id:secondID,name:'Synthetic convergence',expectedRevision:windows.revision}),layout=saved.layouts.find(row=>row.windowId===secondID&&row.kind==='named');
 await native((main,id)=>main.getWindows().contexts.get(id).window.close(),secondID);await until(()=>native(main=>main.getWindows().contexts.size===1),'second window closed');
 await mutate(scope,[{action:'close',id:openedTabs[1].id},{action:'open',tab:{id:'restored-owner-addition',type:'browser',title:'Owner addition while closed',url:fixture.origin+'/restored'}}]);
 await mutate(scope,[{action:'reorder',ids:(await snapshot()).tabs.map(tab=>tab.id).reverse()}]);await converge([first],scope,fixture.parentId);
 // Capture the owner's first saved projection before renderer hydration can heal it.
 await app.evaluate(({app},id)=>{const {WorkspaceSession}=process.mainModule.require(app.getAppPath()+'/desktop/windows/workspace-session.cjs'),save=WorkspaceSession.prototype.save;process.__restoreProjection=null;process.__restoreSave=save;WorkspaceSession.prototype.save=function(value){if(value.windowId===id&&!process.__restoreProjection)process.__restoreProjection=structuredClone(value);return save.call(this,value);};},secondID);
 const freshWindows=await first.evaluate(()=>window.desktop.windowLayouts({action:'list'})),restoredPage=app.waitForEvent('window');
 await first.evaluate(value=>window.desktop.windowLayouts(value),{action:'restore',id:layout.id,expectedRevision:freshWindows.revision});
 const restored=await ready(await restoredPage),projection=await app.evaluate(()=>process.__restoreProjection);
 await app.evaluate(({app})=>{const Session=process.mainModule.require(app.getAppPath()+'/desktop/windows/workspace-session.cjs').WorkspaceSession;Session.prototype.save=process.__restoreSave;});
 assert.deepEqual([...new Set(projection.tabs.filter(tab=>tab.parentId===fixture.parentId).map(logical))],(await snapshot()).tabs.map(tab=>tab.id),'owner order and missing descriptors are materialized before the renderer starts');
 assert.ok(!projection.tabs.some(tab=>logical(tab)===openedTabs[1].id),'closed owner descriptor is not revived by the old layout');
 await converge([first,restored],scope,fixture.parentId);await converge([first,restored],workspace,fixture.workspaceId);
 assert.equal((await session(restored)).active,secondView);assert.equal((await session(restored)).chatDrafts[fixture.user[1].id],'Draft for the second window');
 // Real Quit/relaunch keeps both windows, their private selection/drafts/reading
 // records, canonical order, and the moved browser's complete Back/Forward stack.
 const beforeRestart=await Promise.all([first,restored].map(async page=>({id:await page.evaluate(()=>window.desktop.windowId),session:await session(page)})));
 await app.close();app=null;await launch();await until(()=>app.windows().filter(page=>page.url().startsWith('http')).length===2,'two windows after restart');
 const pages=app.windows().filter(page=>page.url().startsWith('http'));for(const page of pages)await ready(page);
 await converge(pages,scope,fixture.parentId);await converge(pages,workspace,fixture.workspaceId);
 for(const page of pages){const id=await page.evaluate(()=>window.desktop.windowId),before=beforeRestart.find(row=>row.id===id).session,after=await session(page);assert.equal(after.active,before.active);assert.deepEqual(after.chatDrafts,before.chatDrafts);assert.deepEqual(after.selectedChildren,before.selectedChildren);const positions=await page.evaluate(()=>window.desktop.viewPositions({action:'get'}));assert.equal(positions.find(([key])=>key==='synthetic-reading')[1][0][1].top,id==='main'?120:620);}
 const afterHistory=(await snapshot(workspace)).tabs.find(tab=>tab.id==='owner-only-browser').history;assert.deepEqual(afterHistory.entries.map(entry=>entry.id),history.entries.map(entry=>entry.id));assert.equal(afterHistory.currentEntryId,'selected');
 const paged=await native(async(main,scope)=>{
  const entries=[];let cursor,currentEntryId;
  do{const page=await main.getService().contentTabs.history({...scope,tabId:'paged-owner-browser',limit:200,...(cursor?{cursor}:{start:true})});entries.push(...page.entries);currentEntryId=page.currentEntryId;cursor=page.hasMore?page.nextCursor:null;}while(cursor);
  return {entries,currentEntryId};
 },scope);
 assert.deepEqual(paged.entries.map(({id,url,title})=>({id,url,title})),pagedHistory.entries);assert.ok(paged.entries.every(entry=>entry.entryId===entry.id&&entry.profileId==='default'));assert.equal(paged.currentEntryId,'paged-440','restart and named restore retain every Back/Forward entry beyond the saved-session window');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,synthetic:true,initialInactiveOwnerMembershipAndOrder:true,chatAliasesNormalized:true,twoWindowsConverge:true,concurrentOpens:true,keyboardReorder:true,inactiveWorkspaceAddMoveCloseReorder:true,independentSelectionScrollAndDrafts:true,namedRestoreBeforeHydration:true,restartAndFullForwardHistory:true,missingDocumentIsolation:true,explicitCloseTombstone:true,surfaceBoundsWithoutTabSwitch:true}));
}finally{
 if(app){const child=app.process(),timer=setTimeout(()=>child.kill('SIGKILL'),15000);try{await app.close()}finally{clearTimeout(timer)}}
 await fixture.cleanup();
}
