// Two real windows, one logical project, isolated browser profiles only.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
import {createRequire} from 'node:module';
const fixture=await sidebarFixture();let app,first,second;const errors=[];
const {WindowLayouts}=createRequire(import.meta.url)('../desktop/windows/window-layouts.cjs');
const recoveredId='synthetic-recovered-browser',savedHistory={entries:[{id:'saved-a',url:fixture.origin+'/saved-a',title:'Saved A'},{id:'saved-b',url:fixture.origin+'/saved-b',title:'Saved B'}],index:0,currentEntryId:'saved-a',revision:2};
new WindowLayouts(fixture.locations.home).capture({windowId:'88888888-8888-4888-8888-888888888888',kind:'closed',session:{tabs:[{id:fixture.parentId,type:'workspace',workspaceId:fixture.studio.id,projectId:fixture.project.id},{id:recoveredId,type:'browser',label:'Synthetic saved-window tab',parentId:fixture.parentId,url:savedHistory.entries[0].url,history:savedHistory}],active:fixture.parentId,page:'context'}});
const until=async(fn,label)=>{for(let i=0;i<250;i++){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Timed out: '+label);};
const native=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
const session=page=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
async function openProject(page){await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').waitFor();if(await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').getAttribute('aria-expanded')!=='true')await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();}
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});first=await app.firstWindow();first.setDefaultTimeout(15000);first.on('pageerror',error=>errors.push(error.message));await openProject(first);
 const firstID=await first.evaluate(()=>window.desktop.windowId),source=await first.evaluate(async({url,parentId})=>window.desktop.browser({action:'create',url,parentId}),{url:fixture.origin+'/source-window',parentId:fixture.parentId});
 await native((main,info)=>main.getBrowser().actions.send({type:'select-tab',info}),source);await until(async()=>(await session(first)).active===source.id,'source selected');
 const opened=app.waitForEvent('window');await native(main=>main.createWindow());second=await opened;second.setDefaultTimeout(15000);second.on('pageerror',error=>errors.push(error.message));await openProject(second);
 const secondID=await second.evaluate(()=>window.desktop.windowId);assert.notEqual(firstID,secondID);
 const mirror=await until(async()=>(await session(second))?.tabs.find(tab=>tab.parentId===fixture.parentId&&tab.type==='browser'&&(tab.contentTabId||tab.id)===source.id),'source mirrored to second window');
 assert.equal(await native((main,id)=>!!main.getBrowser().get(id).view,mirror.id),false,'a dormant mirror must not allocate a website renderer');
 await second.locator('[data-chat-subtab="'+mirror.id+'"]').click();
 await second.locator('#browser-url').fill('unfinished-address-draft.example');const secondActive=(await session(second)).active;
 const labels=['Open Link in New Default Browser Tab','Open Link in Background Tab','Open Link in Unloaded Tab'],created=[];
 for(const [index,label] of labels.entries()){
  const url=fixture.origin+'/window-link-'+index;
  await native((main,{sourceID,url,label})=>{const browser=main.getBrowser(),menu=browser.actions.menu(browser.get(sourceID),{linkURL:url,linkText:'Provisional window link'});menu.items.find(item=>item.label===label).click();},{sourceID:source.id,url,label});
  const tab=await until(()=>native(async(main,{url,projectId})=>(await main.getService().contentTabs.getAsync('project',projectId)).tabs.find(tab=>tab.url===url),{url,projectId:fixture.project.id}),'canonical linked tab');
  const owner=await native((main,id)=>main.getBrowser().get(id).windowId,tab.id);assert.equal(owner,firstID);created.push(tab.id);
 }
 for(const id of created)await until(async()=>(await session(second)).tabs.some(tab=>tab.type==='browser'&&(tab.contentTabId||tab.id)===id),'project list converges while address input is focused');
 assert.equal((await session(second)).active,secondActive);assert.equal(await second.locator('#browser-url').inputValue(),'unfinished-address-draft.example');
 const values=await Promise.all([first,second].map(async page=>(await session(page)).tabs.filter(tab=>tab.parentId===fixture.parentId&&tab.type==='browser').map(tab=>tab.contentTabId||tab.id)));assert.deepEqual(values[0],values[1]);
 const nativeTabs=await native((main,ids)=>ids.map(id=>{const tab=main.getBrowser().get(id);return {id,windowId:tab.windowId,hidden:tab.hidden,loaded:!!tab.view};}),created);assert.equal(nativeTabs[2].loaded,false);assert.equal(nativeTabs[2].hidden,true);assert.deepEqual(errors,[]);
 await second.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();await second.locator('[data-preview-project-page="tabs"]').click();await second.getByRole('searchbox',{name:'Filter tabs'}).fill('window-link');
 await native((main,{sourceID,url})=>main.getBrowser().actions.menu(main.getBrowser().get(sourceID),{linkURL:url}).items.find(item=>item.label==='Open Link in Background Tab').click(),{sourceID:source.id,url:fixture.origin+'/window-link-filtered'});
 await second.locator('[data-managed-tab]').filter({hasText:'window-link-filtered'}).waitFor();assert.equal(await second.getByRole('searchbox',{name:'Filter tabs'}).inputValue(),'window-link');assert.equal(await second.getByRole('searchbox',{name:'Filter tabs'}).evaluate(input=>document.activeElement===input),true);
 // A project stays subscribed while another project occupies this local window.
 const otherProject=fixture.projects.find(row=>row.workspaceId===fixture.personal.id&&row.name==='Research');
 const expand=second.locator('[data-preview-workspace-expand="'+fixture.personal.id+'"]');if(await expand.getAttribute('aria-expanded')!=='true')await expand.click();
 await second.locator('[data-preview-project="'+otherProject.id+'"]').first().click();const independent=(await session(second)).active;
 const inactiveURL=fixture.origin+'/inactive-project-link';
 await native((main,{sourceID,url})=>main.getBrowser().actions.menu(main.getBrowser().get(sourceID),{linkURL:url}).items.find(item=>item.label==='Open Link in Background Tab').click(),{sourceID:source.id,url:inactiveURL});
 const passive=await until(async()=>(await session(second)).tabs.find(tab=>tab.parentId===fixture.parentId&&tab.type==='browser'&&tab.url===inactiveURL),'inactive project receives new shared member');
 assert.equal((await session(second)).active,independent,'inactive membership cannot select the project or its child');
 assert.equal(await native((main,id)=>!!main.getBrowser().get(id).view,passive.id),false);
 await first.evaluate(value=>window.desktop.browser({action:'navigate',...value}),{id:source.id,url:fixture.origin+'/shared-navigation'});
 await until(async()=>(await session(second)).tabs.find(tab=>tab.id===mirror.id)?.url===fixture.origin+'/shared-navigation','inactive project receives canonical URL and history');
 const stack=history=>JSON.stringify(history?.entries?.map(({id,url})=>({id,url})));
 await until(async()=>{const canonical=await native((main,id)=>main.getService().contentTabs.getAsync('project',id),fixture.project.id),mirrored=(await session(second)).tabs.find(tab=>tab.id===mirror.id);return stack(mirrored.history)===stack(canonical.tabs.find(tab=>tab.id===source.id).history);},'complete canonical history reaches inactive mirror');
 assert.equal((await session(second)).active,independent);
 const persisted=await first.evaluate(({url,parentId})=>window.desktop.browser({action:'create',url,parentId,persist:true}),{url:fixture.origin+'/persisted-source',parentId:fixture.parentId});
 const dormantPersist=await until(async()=>(await session(second)).tabs.find(tab=>tab.contentTabId===persisted.id),'Persist metadata reaches inactive sibling');
 assert.equal(await native((main,id)=>!!main.getBrowser().get(id).view,dormantPersist.id),false,'Persist mirrors do not load until touched');
 await first.evaluate(id=>window.desktop.browser({action:'activate',id}),source.id);await second.evaluate(id=>window.desktop.browser({action:'activate',id}),mirror.id);
 await first.locator('[data-chat-subtab="'+source.id+'"]').click();await openProject(second);await second.locator('[data-chat-subtab="'+mirror.id+'"]').click();
 await until(()=>native((main,ids)=>ids.every(id=>!!main.getBrowser().get(id).view),[source.id,mirror.id]),'both selected views loaded');
 for(const [id,top] of [[source.id,120],[mirror.id,620]])await native((main,{id,top})=>main.getBrowser().get(id).view.webContents.executeJavaScript('document.body.style.height="6000px";window.scrollTo(0,'+top+');null'),{id,top});
 const positions=await native((main,ids)=>Promise.all(ids.map(id=>main.getBrowser().get(id).view.webContents.executeJavaScript('window.scrollY'))),[source.id,mirror.id]);assert.deepEqual(positions,[120,620],'local windows keep independent browser reading positions');
 const recoveryPlan=await first.evaluate(()=>window.desktop.windowLayouts({action:'audit-content'}));
 assert.ok(recoveryPlan.items.some(item=>item.tab.id===recoveredId),JSON.stringify({recoveryPlan}));
 await first.locator('[data-page="engine"]').click();await first.locator('[data-engine-section="windows"]').click();await first.locator('[data-window-audit]').click();
 await first.locator('#dialog').getByText('Synthetic saved-window tab',{exact:false}).waitFor();await first.locator('#dialog-submit').click();
 const restored=await until(()=>native(async(main,{projectId,id})=>(await main.getService().contentTabs.getAsync('project',projectId)).tabs.find(tab=>tab.id===id),{projectId:fixture.project.id,id:recoveredId}),'saved-window tab restored to owner');
 assert.deepEqual(restored.history.entries.map(entry=>entry.id),['saved-a','saved-b']);assert.equal(restored.history.index,0,'recovery retains Forward and the original selected entry');
 await until(async()=>(await session(second)).tabs.some(tab=>tab.contentTabId===recoveredId),'recovered tab reaches sibling project');
 assert.equal(await native((main,id)=>[...main.getBrowser().tabs.values()].filter(tab=>tab.thumbnailId===id).every(tab=>!tab.view),recoveredId),true,'recovery registers metadata without fetching the websites');
 const repeated=await first.evaluate(()=>window.desktop.windowLayouts({action:'audit-content'}));assert.ok(!repeated.items.some(item=>item.tab.id===recoveredId),'a repeated scan does not duplicate recovered tabs');
 console.log(JSON.stringify({passed:true,sourceWindowForAllNativeLinkActions:true,sameProjectOrderedTabsConverge:true,otherWindowSelectionPreserved:true,addressDraftPreserved:true,hiddenLinkDoesNotLoad:true,filteredTabsPageUpdatesPassively:true,inactiveProjectMembershipAndHistory:true,dormantPersistMirrorDoesNotLoad:true,independentBrowserScroll:true,windowRecoveryUIWithForwardHistoryAndNoPageLoad:true}));
}catch(error){if(!app)throw error;console.error(JSON.stringify({native:await native((main,projectId)=>({project:main.getService().contentTabs.get('project',projectId),tabs:[...main.getBrowser().tabs.values()].map(tab=>({id:tab.id,logical:tab.thumbnailId,windowId:tab.windowId,parentId:tab.parentId,url:tab.snapshot?.url||tab.view?.webContents.getURL()}))}),fixture.project.id),first:await session(first),second:second?await session(second):null,errors}));await first?.screenshot({path:process.cwd()+'/.runtime-tests/project-window-link-first-failure.png'}).catch(()=>{});await second?.screenshot({path:process.cwd()+'/.runtime-tests/project-window-link-second-failure.png'}).catch(()=>{});throw error;}finally{await app?.close();await fixture.cleanup();}
