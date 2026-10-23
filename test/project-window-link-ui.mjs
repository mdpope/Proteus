// Two real windows, one logical project, isolated browser profiles only.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app,first,second;const errors=[];
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
 const mirror=await until(async()=>(await session(second)).tabs.find(tab=>tab.parentId===fixture.parentId&&tab.type==='browser'&&(tab.contentTabId||tab.id)===source.id),'source mirrored to second window');
 await second.locator('[data-chat-subtab="'+mirror.id+'"]').click();await second.locator('#browser-url').fill('unfinished-address-draft.example');const secondActive=(await session(second)).active;
 const labels=['Open Link in New Tab','Open Link in Background Tab','Open Link in Unloaded Tab'],created=[];
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
 console.log(JSON.stringify({passed:true,sourceWindowForAllNativeLinkActions:true,sameProjectOrderedTabsConverge:true,otherWindowSelectionPreserved:true,addressDraftPreserved:true,hiddenLinkDoesNotLoad:true,filteredTabsPageUpdatesPassively:true}));
}catch(error){console.error(JSON.stringify({native:await native((main,projectId)=>({project:main.getService().contentTabs.get('project',projectId),tabs:[...main.getBrowser().tabs.values()].map(tab=>({id:tab.id,logical:tab.thumbnailId,windowId:tab.windowId,parentId:tab.parentId,url:tab.snapshot?.url||tab.view?.webContents.getURL()}))}),fixture.project.id),first:await session(first),second:second?await session(second):null,errors}));await first?.screenshot({path:process.cwd()+'/.runtime-tests/project-window-link-first-failure.png'}).catch(()=>{});await second?.screenshot({path:process.cwd()+'/.runtime-tests/project-window-link-second-failure.png'}).catch(()=>{});throw error;}finally{await app?.close();await fixture.cleanup();}
