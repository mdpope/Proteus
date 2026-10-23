// Actual shell insertions from browser links, background tools and existing chat views.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const f=await sidebarFixture();let app;
const until=async(fn,label)=>{for(let n=0;n<160;n++){if(await fn())return;await new Promise(r=>setTimeout(r,75));}throw Error('Timed out: '+label);};
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+f.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,PROTEUS_HOME:f.locations.home,CODEX_HOME:f.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.locator('#topbar-home').waitFor();
 await page.route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.revealFixture={state,openTab,renderTabs,renderChatSubtabs,contentTabSync,get ready(){return workspaceReady&&!workspaceRestoring;}};'});});await page.reload();await until(()=>page.evaluate(()=>window.revealFixture?.ready),'workspace restoration');
 await page.evaluate(()=>{const state=window.revealFixture.state;let selected=state.tab;window.selectionTrace=[];Object.defineProperty(state,'tab',{get:()=>selected,set:value=>{if(value!==selected){window.selectionTrace.push({from:selected,to:value,stack:new Error().stack});window.selectionTrace=window.selectionTrace.slice(-15);}selected=value;}});});
 const selection=()=>page.evaluate(()=>window.revealFixture.state.tab);
 const create=options=>page.evaluate(({options,origin})=>window.desktop.browser({action:'create',url:origin+'/reveal?tab='+crypto.randomUUID(),...options}),{options,origin:f.origin});
 const whole=async(selector,strip)=>until(()=>page.locator(selector).evaluate((node,strip)=>{const box=node.closest('.tabitem,.chat-subtab,.team-tab')?.getBoundingClientRect(),bounds=document.querySelector(strip)?.getBoundingClientRect();return box&&bounds&&box.left>=bounds.left-1&&box.right<=bounds.right+1;},strip).catch(()=>false),'whole tab including close button: '+selector);
 for(let n=0;n<10;n++)await create({title:'Background root '+n});
 await until(()=>page.locator('#tabs .tabitem').count().then(n=>n>=11),'root inventory');
 const selected=await selection();await page.locator('#tabs .tab-list').evaluate(node=>node.scrollLeft=0);
 const background=await create({title:'Newest background root'});await whole('[data-tab-container="'+background.id+'"]','#tabs .tab-list');assert.equal(await selection(),selected,'Background creation must not select the tab');
 console.log('PASS background root reveal');
 await page.locator('#tabs .tab-list').evaluate(node=>{node.dispatchEvent(new WheelEvent('wheel'));node.scrollLeft=0;});await page.evaluate(()=>window.revealFixture.renderTabs());await page.waitForTimeout(100);assert.equal(await page.locator('#tabs .tab-list').evaluate(node=>node.scrollLeft),0,'Metadata renders retain manual scrolling');
 // A real embedded target=_blank open follows its opener and reveals its complete root chip.
 const link=await page.evaluate(async url=>{const info=await window.desktop.browser({action:'create',url});window.revealFixture.openTab({id:info.id,type:'browser',label:'Link opener',info});return info.id;},f.origin+'/opener');
 await app.evaluate(async({app},{id,url})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();await browser.get(id).view.webContents.executeJavaScript('window.open('+JSON.stringify(url)+',"_blank")',true);},{id:link,url:f.origin+'/opened-by-link'});
 await until(()=>page.evaluate(url=>{const fixture=window.revealFixture,tab=fixture.state.tabs.find(tab=>tab.info?.url===url);return tab&&fixture.state.tab===tab.id;},f.origin+'/opened-by-link'),'link opens its exact root');const linked=await selection();await whole('[data-tab-container="'+linked+'"]','#tabs .tab-list');
 console.log('PASS actual link reveal');
 const projectButton=page.locator('[data-preview-project="'+f.project.id+'"]').first();if(!await projectButton.isVisible())await page.locator('[data-preview-workspace-expand="'+f.studio.id+'"]').click();await projectButton.click();await page.locator('#chat-subtabs>.preview-project-root').waitFor();
 await page.evaluate(id=>window.revealFixture.contentTabSync.sync({scope:'project',id}),f.project.id);
 const childCount=await page.locator('#chat-subtabs .chat-subtab').count();
 console.log('Project baseline',await selection(),childCount);
 for(let n=0;n<10;n++)await create({title:'Background child '+n,parentId:f.parentId});
 console.log('Project after background insertions',await page.evaluate(id=>({selected:window.revealFixture.state.tab,children:window.revealFixture.state.tabs.filter(tab=>tab.parentId===id).map(tab=>tab.id),nativeParentIds:window.revealFixture.state.tabs.filter(tab=>tab.type==='browser').map(tab=>tab.parentId)}),f.parentId));
 await until(()=>page.locator('#chat-subtabs .chat-subtab').count().then(n=>n>=childCount+10),'child inventory');const childSelection=await selection();await page.locator('.chat-subtab-list').evaluate(node=>node.scrollLeft=0);
 const child=await create({title:'Newest background child',parentId:f.parentId});await whole('[data-chat-subtab="'+child.id+'"]','.chat-subtab-list');assert.equal(await selection(),childSelection);
 console.log('PASS background child reveal');
 const chat=f.user[1];await page.evaluate(({chat,parentId})=>window.revealFixture.openTab({id:'reveal-chat:'+chat.id,runId:chat.id,type:'run',label:chat.title,parentId}),{chat,parentId:f.parentId});await whole('[data-chat-subtab="reveal-chat:'+chat.id+'"]','.chat-subtab-list');
 console.log('PASS chat reveal');
 await page.locator('[data-page="team"]').click();await page.locator('.team-subtab-list').waitFor();
 const teamID=await page.evaluate(async origin=>{const scope={scope:'team',id:'team'},request=async value=>{const response=await fetch('/api/content-tabs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...scope,...value})});const result=await response.json();if(!response.ok)throw Error(result.error);return result;};await window.revealFixture.contentTabSync.sync(scope);const current=await request({action:'get'}),ids=Array.from({length:11},()=>crypto.randomUUID());await request({action:'mutate',expectedRevision:current.revision,requestId:crypto.randomUUID(),operations:ids.map((id,n)=>({action:'open',tab:{id,type:'browser',title:'Shared Team tab '+n,url:origin+'/team-'+n,profileId:'default'}}))});await window.revealFixture.contentTabSync.sync(scope);return (await import('/features/tools/team-tools.js')).teamState().tabs.find(tab=>tab.contentTabId===ids.at(-1))?.id;},f.origin);assert.ok(teamID);await whole('[data-team-tab="'+teamID+'"]','.team-subtab-list');
 console.log('PASS whole-tab reveal for real browser link, chat view and background root/project/Team opens; background selection and manual scrolling retained');
 }catch(error){
 if(app){const diagnostic=await app.windows()[0].evaluate(()=>({selected:window.revealFixture?.state.tab,selectionTrace:window.selectionTrace,strips:[...document.querySelectorAll('.tab-list,.chat-subtab-list,.team-subtab-list')].map(list=>({class:list.className,bounds:list.getBoundingClientRect().toJSON(),scroll:list.scrollLeft,width:list.scrollWidth,tabs:[...list.children].map(node=>({id:node.dataset.tabContainer||node.querySelector('[data-chat-subtab]')?.dataset.chatSubtab||node.querySelector('[data-team-tab]')?.dataset.teamTab,box:node.getBoundingClientRect().toJSON()})).slice(-3)}))}));console.error(JSON.stringify(diagnostic));}throw error;
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),8000);try{await app.close();}finally{clearTimeout(timer);}}await f.cleanup();}
