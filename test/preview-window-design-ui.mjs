// Isolated source/package UI acceptance; synthetic profiles only.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const f=await sidebarFixture();let app;const errors=[];
const until=async(fn,label)=>{for(let n=0;n<180;n++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
const owner=(fn,value)=>app.evaluate(async({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
try{
 app=await electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,PROTEUS_HOME:f.locations.home,CODEX_HOME:f.auth,PORT:'0'}});
 const first=await app.firstWindow();const navigations=[];first.on('framenavigated',frame=>{if(frame===first.mainFrame())navigations.push(frame.url());});first.on('pageerror',error=>errors.push(error.message));await first.locator('body.window-design-preview').waitFor();await first.locator('#chat-subtabs .universal-tab-overview').waitFor();navigations.length=0;
 const bounds=await first.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {title:rect('#tabs'),sidebar:rect('#sidebar'),workspace:rect('#workspace'),child:rect('#chat-subtabs'),brand:getComputedStyle(document.querySelector('#sidebar>.brand')).display,top:getComputedStyle(document.querySelector('.tabitem')).borderTopWidth};});
 assert.equal(bounds.title.height,52);assert.equal(bounds.child.height,40);assert.equal(bounds.sidebar.top,bounds.title.bottom);assert.equal(bounds.workspace.top,bounds.title.bottom);assert.equal(bounds.brand,'flex');assert.equal(bounds.top,'1px');assert.equal(await first.locator('#tabs .tabitem').first().evaluate(node=>getComputedStyle(node).borderLeftWidth),'1px');
 const topOverview=first.locator('#all-tabs-overview');assert.equal(await topOverview.isVisible(),true);
 const topActions=await first.evaluate(()=>{const overview=document.querySelector('#all-tabs-overview').getBoundingClientRect(),add=document.querySelector('#tab-add-menu summary').getBoundingClientRect();return {before:overview.right<=add.left,aligned:Math.abs((overview.top+overview.bottom)-(add.top+add.bottom))<2,sameIcon:document.querySelector('#all-tabs-overview').innerHTML===document.querySelector('#chat-subtabs .universal-tab-overview').innerHTML};});assert.deepEqual(topActions,{before:true,aligned:true,sameIcon:true});
 const topIDs=await first.locator('#tabs [data-tab]').evaluateAll(nodes=>nodes.map(node=>node.dataset.tab));
 await topOverview.click();await first.getByRole('dialog',{name:'App tab overview',exact:true}).waitFor();assert.deepEqual(await first.locator('[data-overview-group]').evaluateAll(nodes=>nodes.map(node=>node.dataset.overviewGroup)),['main']);assert.deepEqual(await first.locator('[data-overview-select]').evaluateAll(nodes=>nodes.map(node=>node.dataset.overviewSelect)),topIDs);await first.keyboard.press('Escape');
 await first.screenshot({path:'/private/tmp/proteus-window-chrome-ui.png'});await first.locator('#chat-subtabs .universal-tab-overview').click();await first.locator('dialog.browser-overview').waitFor({state:'visible'});await first.keyboard.press('Escape');
 const added=app.waitForEvent('window');await owner(main=>main.createWindow());const second=await added;second.on('pageerror',error=>errors.push(error.message));await second.locator('body.window-design-preview').waitFor();
 const secondId=await second.evaluate(()=>window.desktop.windowId);
 await first.locator('[data-page="team"]').click();await second.locator('[data-page="team"]').click();
 await first.locator('.team-tab-add summary').click();
 await first.locator('#team-browser-url').fill(f.origin+'/shared-team');await first.locator('#team-browser-url').press('Enter');
 await until(()=>second.locator('.team-tab').count().then(count=>count===1),'shared Team tab appears once');
 const logical=await first.evaluate(()=>window.desktop.workspaceSession({action:'get'}).then(row=>row.team.tabs[0].contentTabId));
 await second.locator('.team-tab [data-team-tab]').click();await second.locator('#team-browser-url').waitFor();
 const secondBrowser=await second.evaluate(async()=>{const tabs=await window.desktop.browser({action:'list'});return tabs.find(tab=>tab.group==='team').id;});
 await until(()=>second.evaluate(async()=>(await import('/team-tools.js')).canPreserveTeamBrowser()),'mirrored Team surface finishes mounting');
 await second.evaluate(id=>window.desktop.browser({action:'unload',id}),secondBrowser);await second.locator('#team-load-tab').waitFor();
 await first.locator('#team-browser-url').fill(f.origin+'/shared-next');await first.locator('#team-browser-url').press('Enter');
 await until(()=>second.locator('#team-browser-url').inputValue().then(value=>value===f.origin+'/shared-next'),'same Team URL synchronizes');
 assert.equal((await second.evaluate(()=>window.desktop.browser({action:'list'}))).find(tab=>tab.id===secondBrowser).loaded,false,'Shared URL update keeps the mirrored browser unloaded');
 assert.equal(f.requests.filter(url=>url==='/shared-next').length,1,'Only the initiating window fetches the page');
 assert.deepEqual(navigations,[],'Early address Enter does not reload the application shell');
 assert.equal(await first.locator('.team-tab').count(),1);assert.equal(await second.locator('.team-tab').count(),1);
 assert.equal(await second.evaluate(()=>window.desktop.workspaceSession({action:'get'}).then(row=>row.team.tabs[0].contentTabId)),logical);
 await owner((main,id)=>main.getWindows().contexts.get(id).window.setBounds({x:150,y:130,width:1040,height:740}),secondId);
 await second.evaluate(()=>window.desktop.viewPositions({action:'set',key:'document:window-recovery',position:[['root',{top:321,left:0}]]}));
 let snapshot=await second.evaluate(()=>window.desktop.windowLayouts({action:'list'}));await second.evaluate(args=>window.desktop.windowLayouts(args),{action:'rename',id:secondId,name:'Review desk',expectedRevision:snapshot.revision});
 snapshot=await second.evaluate(()=>window.desktop.windowLayouts({action:'list'}));await second.evaluate(args=>window.desktop.windowLayouts(args),{action:'save',id:secondId,name:'Review desk',expectedRevision:snapshot.revision});
 await first.locator('.team-tab [data-team-close]').click();await until(()=>second.locator('.team-tab').count().then(count=>count===0),'shared Close reaches second window');
 await owner((main,id)=>main.getWindows().contexts.get(id).window.close(),secondId);await until(()=>owner(main=>main.getWindows().contexts.size).then(count=>count===1),'second closes and snapshots');
 snapshot=await first.evaluate(()=>window.desktop.windowLayouts({action:'list'}));const saved=snapshot.layouts.find(row=>row.kind==='named'&&row.name==='Review desk');assert.ok(saved);
 const restoredEvent=app.waitForEvent('window');await first.evaluate(args=>window.desktop.windowLayouts(args),{action:'restore',id:saved.id,expectedRevision:snapshot.revision});const restored=await restoredEvent;await restored.locator('body.window-design-preview').waitFor();await restored.locator('#team-subtabs').waitFor();
 assert.equal(await restored.locator('.team-tab').count(),0,'Restoration does not resurrect a closed shared tab');
 assert.equal((await restored.evaluate(()=>window.desktop.viewPositions({action:'get'}))).find(([key])=>key==='document:window-recovery')[1][0][1].top,321);
 assert.equal((await owner((main,id)=>main.getWindows().contexts.get(id).window.getNormalBounds(),secondId)).width,1040);
 snapshot=await first.evaluate(()=>window.desktop.windowLayouts({action:'list'}));await first.evaluate(args=>window.desktop.windowLayouts(args),{action:'restore',id:saved.id,expectedRevision:snapshot.revision});assert.equal(await owner(main=>main.getWindows().contexts.size),2);
 await first.locator('[data-page="engine"]').click();await first.locator('[data-engine-section="windows"]').click();await first.locator('[data-window-new]').waitFor();await first.screenshot({path:'/private/tmp/proteus-window-design-ui.png'});
 assert.deepEqual(errors,[]);console.log('PASS isolated integrated title bar, universal overview, shared Team identity/URL/Close, named snapshot/restore/current-owner protection and window manager UI');
}catch(error){
 console.error(error);
 for(const page of app?.windows()||[])try{
  const diagnostic=await page.evaluate(async()=>({
   owner:await fetch('/api/content-tabs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'get',scope:'team',id:'team'})}).then(r=>r.json()),
   tabs:(await import('/team-tools.js')).teamState().tabs,
   browsers:await window.desktop.browser({action:'list'}),
   outbox:Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.includes('navigation.pending')))
  }));console.error('Synthetic diagnostic',JSON.stringify(diagnostic));
 }catch{}
 console.error('Synthetic requests',f.requests);throw error;
}finally{await app?.close();await f.cleanup();}
