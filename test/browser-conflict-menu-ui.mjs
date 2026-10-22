// Disposable real-renderer/native-view acceptance. Only the conflict notification is injected.
import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const until=async(fn,label)=>{for(let n=0;n<150;n++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+label);};
try{
 app=await _electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);await page.locator('#topbar-home').waitFor();
 await page.route('**/app.js',async route=>{const response=await route.fetch();let code=await response.text();code=code.replace('onError:(error,scope,initialized,pending=[])=>{','onError:window.fixtureConflict=(error,scope,initialized,pending=[])=>{');await route.fulfill({response,body:code+'\nwindow.conflictFixture={state,openTab,contentTabSync};\n'});});
 await page.reload();await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').waitFor();await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();
 const first=await page.evaluate(async()=>{const rows=await window.desktop.browser({action:'list'});return rows.find(tab=>tab.url.endsWith('/favicon-tab')).id;});
 await page.locator('[data-chat-subtab="'+first+'"]').click();
 await until(()=>app.evaluate(({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),t=b.get(id);return t.view?.getVisible()&&!t.view.webContents.isLoading();},first),'first page visible');
 const second=await page.evaluate(async({url,parentId})=>{const info=await window.desktop.browser({action:'create',url,parentId,group:'main'});window.conflictFixture.openTab({id:info.id,type:'browser',parentId,label:'Healthy second page',info});return info.id;},{url:fixture.origin+'/healthy-second',parentId:fixture.parentId});
 await page.evaluate(projectId=>window.fixtureConflict(Object.assign(Error('Synthetic background owner conflict'),{code:'NAVIGATION_CONFLICT'}),{scope:'project',id:projectId},true,[{action:'browser-navigate',tabId:'background-view',url:'https://example.test/pending'}]),fixture.projects.find(p=>p.id!==fixture.project.id).id);
 const notifications=()=>page.evaluate(()=>fetch('/api/notifications').then(r=>r.json()).then(v=>v.items));
 await until(async()=>(await notifications()).some(item=>item.browserIssue?.kind==='history-conflict'),'history issue recorded in Notifications');
 assert.equal(await page.locator('#navigation-conflicts').count(),0);
 assert.equal(app.windows().filter(page=>page.url().includes('notice-window')).length,0);
 for(const id of [first,second]){await page.locator('[data-chat-subtab="'+id+'"]').click();await until(()=>app.evaluate(({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return b.active===id&&b.get(id).view?.getVisible()&&!b.overlays.has('navigation-conflicts');},id),'healthy selection under background conflict');}
 // The captured page-menu dispatch survives removal of the toolbar node while open.
 await page.getByRole('button',{name:'Page menu',exact:true}).click();let menu;await until(()=>{menu=app.windows().find(window=>window.url().endsWith('/browser-page-menu.html'));return !!menu;},'page menu');
 await menu.getByRole('menuitem',{name:'Developer tools',exact:true}).waitFor();
 await page.evaluate(()=>document.querySelector('[data-browser-extensions]').remove());
 await menu.getByRole('menuitem',{name:'Developer tools',exact:true}).click();
 await until(()=>app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.isDevToolsOpened(),second),'detached DevTools opens after control replacement');
 await app.evaluate(({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();b.get(id).view.webContents.closeDevTools();const labels=b.actions.menu(b.get(id),{linkURL:'https://example.test/link',x:3,y:3}).items.map(item=>item.label);if(labels.at(-1)!=='Inspect Element')throw Error('Inspect is not last');},second);
 await page.locator('[data-page="engine"]').click();await page.locator('[data-engine-section="notifications"]').click();
 const issue=(await notifications()).find(item=>item.browserIssue?.kind==='history-conflict');
 const card=page.locator('[data-browser-notification="'+issue.id+'"]');await card.getByRole('button',{name:'Keep saved history',exact:true}).click();
 await until(async()=>(await notifications()).find(item=>item.id===issue.id)?.body.includes('no active history conflict'),'stale recovery action remains explicitly unresolved');
 assert.equal((await notifications()).find(item=>item.id===issue.id).readAt,undefined);
 // A real failed native navigation uses the same inbox, without a notice window or page overlay.
 await page.evaluate(id=>window.conflictFixture.openTab(window.conflictFixture.state.tabs.find(tab=>tab.id===id)),second);
 await page.evaluate(id=>window.desktop.browser({action:'navigate',id,url:'http://127.0.0.1:1/blocked-fixture'}),second);
 await until(async()=>(await notifications()).some(item=>item.browserIssue?.kind==='load-error'),'real native load failure recorded');
 const failed=(await notifications()).find(item=>item.browserIssue?.kind==='load-error');assert.equal(failed.browserIssue.tabId,second);assert.ok(failed.browserIssue.logId);
 assert.equal(await page.locator('#navigation-conflicts').count(),0);assert.equal(await page.locator('.toast').count(),0);
 assert.equal(app.windows().filter(page=>page.url().includes('notice')).length,0);
 await page.locator('[data-page="engine"]').click();await page.locator('[data-engine-section="notifications"]').click();
 await page.locator('[data-browser-notification="'+failed.id+'"]').getByRole('button',{name:'View logs',exact:true}).click();await page.locator('[data-log-id="'+failed.browserIssue.logId+'"]').waitFor();
 console.log(JSON.stringify({passed:true,checks:['history conflict stays in Notifications; healthy native pages remain usable','stale resolution stays unread and preserves recovery','real load failure has notification and bounded log with no page popup','notification action opens matching Logs','page-menu DevTools survives toolbar replacement','Inspect Element last in link menu']}));
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),5000);await app.close().catch(()=>{});clearTimeout(timer);}await fixture.cleanup();}
