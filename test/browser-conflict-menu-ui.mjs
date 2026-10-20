// Disposable real-renderer/native-view acceptance. Only conflict notification and popup choice are injected.
import {_electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const until=async(fn,label)=>{for(let n=0;n<150;n++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+label);};
try{
 app=await _electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);await page.locator('#topbar-home').waitFor();
 await page.route('**/app.js',async route=>{const response=await route.fetch();let code=await response.text();code=code.replace('onError:(error,scope,initialized,pending=[])=>{','onError:window.fixtureConflict=(error,scope,initialized,pending=[])=>{');await route.fulfill({response,body:code+'\nwindow.conflictFixture={state,openTab,contentTabSync};\n'});});
 await page.reload();await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').waitFor();await page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]').click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();
 const first=await page.evaluate(async()=>{const rows=await window.desktop.browser({action:'list'});return rows.find(tab=>tab.url.endsWith('/favicon-tab')).id;});
 await page.locator('[data-chat-subtab="'+first+'"]').click();
 await until(()=>app.evaluate(({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),t=b.get(id);return t.view?.getVisible()&&!t.view.webContents.isLoading();},first),'first page visible');
 const second=await page.evaluate(async({url,parentId})=>{const info=await window.desktop.browser({action:'create',url,parentId,group:'main'});window.conflictFixture.openTab({id:info.id,type:'browser',parentId,label:'Healthy second page',info});return info.id;},{url:fixture.origin+'/healthy-second',parentId:fixture.parentId});
 await page.evaluate(projectId=>window.fixtureConflict(Object.assign(Error('Synthetic background owner conflict'),{code:'NAVIGATION_CONFLICT'}),{scope:'project',id:projectId},true,[{action:'browser-navigate',tabId:'background-view',url:'https://example.test/pending'}]),fixture.projects.find(p=>p.id!==fixture.project.id).id);
 await page.locator('#navigation-conflicts').waitFor();
 for(const id of [first,second]){await page.locator('[data-chat-subtab="'+id+'"]').click();await until(()=>app.evaluate(({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return b.active===id&&b.get(id).view?.getVisible()&&!b.overlays.has('navigation-conflicts');},id),'healthy selection under background conflict');}
 // The actual page-menu dispatch must survive removal of the toolbar node while its native menu is open.
 await app.evaluate(({Menu})=>{const original=Menu.prototype.popup;process.__fixtureRestorePopup=()=>Menu.prototype.popup=original;Menu.prototype.popup=function(){process.__fixtureMenu=this;};});
 await page.getByRole('button',{name:'Page menu',exact:true}).click();await until(()=>app.evaluate(()=>!!process.__fixtureMenu),'native page menu');
 await page.evaluate(()=>document.querySelector('[data-browser-extensions]').remove());
 await app.evaluate(()=>process.__fixtureMenu.items.find(item=>item.label==='Developer tools').click());
 await until(()=>app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.isDevToolsOpened(),second),'detached DevTools opens after control replacement');
 await app.evaluate(({app},id)=>{process.__fixtureRestorePopup();const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();b.get(id).view.webContents.closeDevTools();const labels=b.actions.menu(b.get(id),{linkURL:'https://example.test/link',x:3,y:3}).items.map(item=>item.label);if(labels.at(-1)!=='Inspect Element')throw Error('Inspect is not last');},second);
 await page.getByRole('button',{name:'Keep saved history',exact:true}).click();await page.locator('#navigation-conflicts').waitFor({state:'detached'});
 await until(()=>app.evaluate(({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return b.active===id&&b.get(id).view.getVisible();},second),'latest selection retained after resolution');
 console.log(JSON.stringify({passed:true,checks:['background-scope conflict keeps healthy native pages usable','latest tab selection retained during and after resolution','page-menu DevTools opens after toolbar replacement','Inspect Element last in link menu']}));
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),5000);await app.close().catch(()=>{});clearTimeout(timer);}await fixture.cleanup();}
