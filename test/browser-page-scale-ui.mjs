// Actual popup controls and native website scale; all browser data is disposable.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const until=async(fn)=>{for(let n=0;n<200;n++){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Native browser selection did not settle');};
try{
 app=await electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);await page.locator('body.window-design-preview').waitFor();
 await page.locator(`[data-preview-workspace-expand="${fixture.studio.id}"]`).click();await page.locator(`[data-preview-project="${fixture.project.id}"]`).first().click();
 const first=await page.evaluate(async()=>{const rows=await window.desktop.browser({action:'list'});return rows.find(tab=>tab.url.endsWith('/favicon-tab')).id;});
 await page.locator(`[data-chat-subtab="${first}"]`).click();await page.getByRole('button',{name:'Page menu',exact:true}).waitFor();
 const native=()=>app.evaluate(({app},id)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=browser.get(id);return {id:tab.id,active:browser.active,zoom:tab.view?.webContents.getZoomFactor(),shell:browser.window.webContents.getZoomFactor(),visible:tab.view?.getVisible()};},first);
 const initial=await until(async()=>{const value=await native();return value.visible&&value.active===first?value:null;});assert.equal(initial.zoom,1);
 const open=async()=>{await page.getByRole('button',{name:'Page menu',exact:true}).click();const menu=await until(()=>app.windows().find(window=>window.url().endsWith('/browser-page-menu.html')));await menu.locator('#choices [role="menuitem"]').first().waitFor();return menu;};
 const dismiss=async menu=>{try{await menu.keyboard.press('Escape');}catch(error){if(!menu.isClosed())throw error;}await until(()=>menu.isClosed());};
 let menu=await open();assert.equal(await menu.locator('#percent').textContent(),'100%');assert.equal((await native()).visible,true,'Native website stays visible under the menu');
 for(const [control,percent]of [['increase',110],['increase',120],['decrease',110],['percent',100],['decrease',90]]){
  await menu.locator('#'+control).click();await menu.waitForFunction(value=>document.querySelector('#percent').textContent===value+'%',percent);const actual=await native();assert.equal(Math.round(actual.zoom*100),percent);assert.equal(actual.id,initial.id);assert.equal(actual.shell,1,'Scale changes only website contents');assert.equal(actual.visible,true);
 }
 await menu.screenshot({path:'/private/tmp/proteus-page-scale.png'});await dismiss(menu);
 menu=await open();assert.equal(await menu.locator('#percent').textContent(),'90%');await menu.locator('#percent').click();await menu.waitForFunction(()=>document.querySelector('#percent').textContent==='100%');
 // Menu actions retain the captured owner even if state replaces its toolbar.
 await page.evaluate(()=>document.querySelector('[data-browser-extensions]').remove());await menu.getByRole('menuitem',{name:'Developer tools',exact:true}).click();
 await page.waitForFunction(async()=>{const tabs=await window.desktop.browser({action:'list'});return tabs.length>0;});
 await until(()=>app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.isDevToolsOpened(),initial.id));
 await app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.closeDevTools(),initial.id);
 await page.locator('[data-page="team"]').click();await page.locator('.team-tab-add summary').click();await page.locator('#team-browser-url').fill(fixture.origin+'/scale-team');await page.locator('#team-browser-url').press('Enter');
 await until(()=>app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return b.tabs.get(b.active)?.group==='team';}));
 menu=await open();await menu.locator('#percent').click();await menu.waitForFunction(()=>document.querySelector('#percent').textContent==='100%');await menu.locator('#increase').click();await menu.waitForFunction(()=>document.querySelector('#percent').textContent==='110%');
 const teamScale=await app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return b.get(b.active).view.webContents.getZoomFactor();});assert.equal(Math.round(teamScale*100),110);await dismiss(menu);
 // Root-domain memory reaches paths, newly created windows and the next process.
 const story=fixture.origin+'/Story/MixedCASE';const created=await page.evaluate(url=>window.desktop.browser({action:'create',url}),story);
 const scaleOf=id=>app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view?.webContents.getZoomFactor(),id);
 assert.equal(Math.round((await scaleOf(created.id))*100),110);
 const added=app.waitForEvent('window');await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').createWindow());const second=await added;await second.locator('body.window-design-preview').waitFor();const peer=await second.evaluate(url=>window.desktop.browser({action:'create',url}),fixture.origin+'/DifferentPath');assert.equal(Math.round((await scaleOf(peer.id))*100),110);
 await second.locator(`[data-tab="${peer.id}"]`).click();await second.getByRole('button',{name:'Page menu',exact:true}).click();menu=await until(()=>app.windows().find(window=>window.url().endsWith('/browser-page-menu.html')));await menu.locator('#increase').click();await menu.waitForFunction(()=>document.querySelector('#percent').textContent==='120%');assert.equal(Math.round((await scaleOf(created.id))*100),120);await dismiss(menu);
 // The independent visual-zoom baseline may open overview at 120% page scale.
 await app.evaluate(({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();b.withTabWindow(b.get(id),()=>b.requestOverview(b.get(id)));},peer.id);await second.locator('dialog.browser-overview').waitFor();const caption=second.locator(`[data-overview-select="${peer.id}"] .note`);assert.equal(await caption.evaluate(el=>getComputedStyle(el).textTransform),'none');await second.keyboard.press('Escape');
 await app.close();app=await electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});const restarted=await app.firstWindow();await restarted.locator('body.window-design-preview').waitFor();const again=await restarted.evaluate(url=>window.desktop.browser({action:'create',url}),story);assert.equal(Math.round((await scaleOf(again.id))*100),120);
 console.log('PASS domain scale across new paths/windows/restart, updates other live views, overview independent of page scale and URL casing; live main/Team − / current percent / +, reset, retained scale on reopen, native website visible, shell scale unchanged, Escape and captured Developer tools action');
}finally{await app?.close();await fixture.cleanup();}
