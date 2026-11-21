import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';

const fixture=await sidebarFixture();
let app;
try{
 app=await electron.launch({executablePath:process.env.PROTEUS_TEST_EXECUTABLE,args:['.','--use-mock-keychain'],
  env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_AUTH:'none',PROTEUS_PREVIEW_HOME:fixture.locations.root,PORT:'0'}});
 const shell=await app.firstWindow();
 await shell.locator('[data-page=team]').click();
 const {tabId,browserId}=await shell.evaluate(async url=>{
  const {selectTeamBrowser,teamState,renderTeamTools}=await import('/features/tools/team-tools.js');
  const info=await window.desktop.browser({action:'create',group:'team',url});
  selectTeamBrowser(info);renderTeamTools();
  return {tabId:teamState().active,browserId:info.id};
 },fixture.origin+'/team-context-menu');
 const tab=shell.locator(`[data-team-tab="${tabId}"]`);
 const menuFor=async (name)=>{
  const opening=app.waitForEvent('window',{timeout:10000});
  await tab.click({button:'right'});
  const menu=await opening;
  await menu.getByRole('menuitem',{name,exact:true}).waitFor();
  assert.ok(menu.url().endsWith('browser-page-menu.html'));
  return menu;
 };
 const menu=await menuFor('Mute tab');
 assert.equal(await menu.getByRole('menuitem',{name:'Duplicate tab',exact:true}).isVisible(),true);
 await menu.getByRole('menuitem',{name:'Mute tab',exact:true}).click();
 await shell.waitForFunction(async id=>(await window.desktop.browser({action:'list'})).find(tab=>tab.id===id)?.audioMuted,browserId);
 const muted=await menuFor('Unmute tab');
 await muted.getByRole('menuitem',{name:'Unload browser tab',exact:true}).click();
 await shell.waitForFunction(async id=>(await window.desktop.browser({action:'list'})).find(tab=>tab.id===id)?.loaded===false,browserId);
 const unloaded=await menuFor('Duplicate tab');
 await unloaded.keyboard.press('Escape').catch(error=>{if(!unloaded.isClosed())throw error;});
 console.log(JSON.stringify({passed:true,synthetic:true,teamBrowserTabRightClick:true,mute:true,unmuteMenu:true,unloadedTabMenu:true}));
}finally{await app?.close().catch(()=>{});await fixture.cleanup();}
