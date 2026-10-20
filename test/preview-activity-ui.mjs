// Disposable desktop preview rehearsal. No retained profile, provider run or live website.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app,page;const errors=[];
const native=async(action,args={})=>app.evaluate(async({app},{action,args})=>{
 const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
 if(action==='list')return browser.list(true);
 if(action==='read'){const tab=browser.get(args.id);return {state:browser.state(tab,true),title:tab.view?.webContents.getTitle(),profileId:tab.profileId};}
 if(action==='configure'){browser.blocker.ensure=async()=>{};return;}
 return browser.command({action,...args});
},{action,args});
const info=async id=>(await native('list')).find(tab=>tab.id===id);
const until=async(predicate,label)=>{const deadline=Date.now()+15000;while(Date.now()<deadline){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
async function launch(){
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(fixture.temporary,'electron')],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'},timeout:60000});
 page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
 await page.locator('[data-preview-workspace]').first().waitFor();await native('configure');
}
async function close(){if(!app)return;const current=app;app=null;const timer=setTimeout(()=>current.process().kill('SIGKILL'),10000);try{await current.close();}finally{clearTimeout(timer);}}
try{
 await launch();
 await until(async()=>(await native('list')).some(tab=>tab.url===fixture.origin+'/favicon-tab'),'saved browser descriptors');
 const first=(await native('list')).find(tab=>tab.url===fixture.origin+'/favicon-tab'),id=first.id;
 assert.ok(first.lastActivityAt);assert.equal(first.loaded,false);
 await page.locator('[data-preview-open-project]').filter({hasText:'Design review'}).click();
 await page.locator(`[data-chat-subtab="${id}"]`).click();await page.locator('#browser-url').waitFor();await until(async()=>(await info(id)).loaded,'selected browser loads');
 const selected=await info(id);assert.equal(selected.lastActivityAt,first.lastActivityAt,'Selection must not change activity');
 await native('read',{id});await native('list');
 await page.locator('#browser-url').focus();await page.locator('#chat-subtabs>.preview-project-root').click();await page.locator(`[data-chat-subtab="${id}"]`).click();
 assert.equal((await info(id)).lastActivityAt,first.lastActivityAt,'Read, focus and reselect retain activity');
 await page.locator('#browser-reload').click();await until(async()=>(await info(id)).lastActivityAt>selected.lastActivityAt,'explicit reload advances activity');const refreshed=await info(id);
 await page.locator('#browser-url').fill(fixture.origin+'/explicit-navigation');await page.locator('#browser-url').press('Enter');await until(async()=>(await info(id)).url===fixture.origin+'/explicit-navigation'&&(await info(id)).lastActivityAt>refreshed.lastActivityAt&&!(await info(id)).loading,'address navigation advances activity');
 const navigated=await info(id),history=JSON.stringify(navigated.history);
 await native('persist',{id,enabled:true});await native('share',{id,shared:true});
 await page.locator('#chat-subtabs>.preview-project-root').click();await page.locator('[data-preview-project-page=tabs]').click();
 const row=()=>page.locator(`[data-managed-tab="${id}"]`);
 await row().locator('[data-action=hide]').click();await until(async()=>{const value=await info(id);return value.hidden===true&&value.loaded===false;},'UI Hide unloads browser');
 assert.equal(await page.locator(`[data-chat-subtab="${id}"]`).count(),0);assert.equal((await info(id)).persist,true);assert.equal((await info(id)).lastActivityAt,navigated.lastActivityAt);
 await row().locator('[data-action=restore]').click();await until(async()=>(await info(id)).hidden===false,'UI Restore releases hidden state');
 assert.equal((await info(id)).loaded,false,'Restore must leave browser unloaded');assert.equal(JSON.stringify((await info(id)).history),history);assert.equal((await info(id)).lastActivityAt,navigated.lastActivityAt);
 await page.locator(`[data-chat-subtab="${id}"]`).click();await until(async()=>(await info(id)).loaded,'Selecting restored browser loads it');assert.equal((await info(id)).lastActivityAt,navigated.lastActivityAt);assert.equal((await info(id)).profileId,navigated.profileId);
 // Hide a Persist browser, wait for the normal owner save, then restart only this
 // temporary app. Persist must not override hidden/unloaded restoration.
 await page.locator('#chat-subtabs>.preview-project-root').click();await page.locator('[data-preview-project-page=tabs]').click();await row().locator('[data-action=hide]').click();await until(async()=>(await info(id)).loaded===false&&(await info(id)).hidden,'second Hide');
 await until(async()=>{const saved=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));const tab=saved.tabs.find(tab=>tab.id===id);return tab?.hidden&&tab.unloaded&&tab.lastActivityAt===navigated.lastActivityAt;},'durable hidden browser descriptor');
 const beforeRestartRequests=fixture.requests.filter(url=>url==='/explicit-navigation').length;
 await close();await launch();await until(async()=>(await native('list')).some(tab=>tab.url===fixture.origin+'/explicit-navigation'),'restored browser snapshot');
 const restarted=(await native('list')).find(tab=>tab.url===fixture.origin+'/explicit-navigation');assert.equal(restarted.hidden,true);assert.equal(restarted.loaded,false);assert.equal(restarted.persist,true);assert.equal(restarted.lastActivityAt,navigated.lastActivityAt);assert.equal(restarted.profileId,navigated.profileId);assert.equal(JSON.stringify(restarted.history),history);
 assert.equal(fixture.requests.filter(url=>url==='/explicit-navigation').length,beforeRestartRequests,'Hidden Persist restore must not fetch its page');
 assert.deepEqual(errors,[]);
 console.log('PASS synthetic desktop preview browser activity, selection/read stability, UI hide/unload/restore/select, identity/history/profile retention and hidden Persist restart without loading.');
}catch(error){await page?.screenshot({path:'/private/tmp/proteus-preview-activity-failure.png'}).catch(()=>{});throw error;}finally{await close();await fixture.cleanup();}
