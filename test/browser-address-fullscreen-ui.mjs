// Real macOS fullscreen/Spaces, synthetic history and three disposable app windows.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
if(process.platform!=='darwin')throw Error('Run the native fullscreen regression on macOS.');
const fixture=await sidebarFixture();let app,first;const errors=[];
const native=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
const until=async(fn,label)=>{for(let n=0;n<200;n++){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
const popup=()=>app.windows().find(page=>page.url().endsWith('/browser-address-popup.html')&&!page.isClosed());
async function fullscreen(enabled){
 await native((main,enabled)=>new Promise(resolve=>{const window=main.getWindows().contexts.get('main').window;if(window.isFullScreen()===enabled)return resolve();window.once(enabled?'enter-full-screen':'leave-full-screen',resolve);window.setFullScreen(enabled);}),enabled);
}
async function suggestions(){
 await first.locator('#browser-url').fill('fullscreen-fixture');
 const page=await until(popup,'address suggestions');
 await page.getByRole('option').filter({hasText:'Fullscreen regression fixture'}).waitFor();
 const state=await app.evaluate(({BrowserWindow},url)=>{const window=BrowserWindow.getAllWindows().find(row=>row.webContents.getURL()===url);return {bounds:window.getBounds(),fullscreen:window.isFullScreen(),fullscreenable:window.isFullScreenable(),parent:window.getParentWindow()?.id};},page.url());
 assert.equal(state.fullscreenable,false);assert.equal(state.fullscreen,false);assert.ok(state.bounds.height<=360);assert.ok(state.bounds.width<=Math.ceil((await first.locator('#browser-url').boundingBox()).width));
 return page;
}
try{
 const executablePath=process.env.PROTEUS_TEST_EXECUTABLE;
 app=await electron.launch({...(executablePath?{executablePath}:{}),args:[...(executablePath?[]:['.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 first=await app.firstWindow();first.setDefaultTimeout(15000);first.on('pageerror',error=>errors.push(error.message));await first.locator('#topbar-home').waitFor();
 for(let n=0;n<2;n++){const ready=app.waitForEvent('window');await native(main=>main.createWindow());await (await ready).locator('#topbar-home').waitFor();}
 const ids=await native(main=>[...main.getWindows().contexts.keys()]);assert.equal(ids.length,3);
 await native(async(main,url)=>{const service=main.getService();await service.browserHistory.record({events:[{eventId:crypto.randomUUID(),url:url+'/fullscreen-fixture',title:'Fullscreen regression fixture',profileId:'default',visitedAt:new Date().toISOString()}]});return main.getWindows().run('main',async()=>{const info=await main.getBrowser().create(url+'/start');main.getBrowser().actions.send({type:'select-tab',info});});},fixture.origin);
 await first.locator('#browser-url').waitFor();await first.bringToFront();
 await suggestions();await first.locator('#browser-url').press('Escape');await until(()=>!popup(),'normal suggestions dismissed');
 await fullscreen(true);await first.bringToFront();await suggestions();
 assert.equal(await native(main=>main.getWindows().contexts.get('main').window.isFullScreen()),true);
 await first.locator('#browser-url').press('Escape');await until(()=>!popup(),'fullscreen Escape dismissal');
 await suggestions();await fullscreen(false);await until(()=>!popup(),'popup closed across fullscreen exit');
 for(const id of ids){
  const row=await native((main,id)=>{const ctx=main.getWindows().contexts.get(id);ctx.window.show();ctx.window.focus();return {destroyed:ctx.window.isDestroyed(),visible:ctx.window.isVisible(),fullscreen:ctx.window.isFullScreen(),tabs:ctx.session.get().tabs.map(tab=>tab.id)};},id);
  assert.equal(row.destroyed,false);assert.equal(row.visible,true);assert.equal(row.fullscreen,false);assert.ok(row.tabs.length);
 }
 assert.deepEqual(await native(main=>[...main.getWindows().contexts.keys()]),ids);
 await first.bringToFront();await suggestions();await first.locator('#browser-url').press('ArrowDown');await first.locator('#browser-url').press('Enter');
 await until(async()=>await first.locator('#browser-url').inputValue()===fixture.origin+'/fullscreen-fixture','address selection still navigates');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,nativeMacFullscreen:true,popupCannotFullscreen:true,popupBounded:true,escapeDismissal:true,transitionDismissal:true,threeWindowsRemainUsable:true,historySelectionNavigates:true}));
}finally{
 if(app){await fullscreen(false).catch(()=>{});await app.close();}await fixture.cleanup();
}
