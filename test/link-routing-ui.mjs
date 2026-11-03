import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const wait=async fn=>{for(let index=0;index<200;index++){const result=await fn();if(result)return result;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Isolated link-routing condition timed out.');};
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:process.env.PROTEUS_TEST_EXECUTABLE?[]:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const shell=await app.firstWindow();await shell.locator('body.window-design-preview').waitFor();await wait(()=>app.evaluate(({app})=>[...process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getWindows().contexts.values()].every(ctx=>ctx.externalURLReady)));
 const errors=[];shell.on('pageerror',error=>errors.push(error.message));
 const inventory=()=>app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().list(true));
 const open=url=>app.evaluate(({app},url)=>app.emit('open-url',{preventDefault(){}},url),url);
 const popup=()=>wait(()=>app.windows().find(page=>page.url().endsWith('/link-routing/picker.html')));
 const url=fixture.origin+'/link-picker';await open(url);
 if(process.platform!=='darwin'){
  // Only macOS instantiates the project picker. Other platforms use the direct
  // external-link path, which must retain ordinary unshared browser access.
  const tab=await wait(async()=>(await inventory()).find(tab=>tab.url===url&&tab.loaded));
  assert.equal(tab.url,url);assert.equal(tab.loaded,true);assert.equal(tab.owner,null);
  assert.equal(tab.agentPaused,true);assert.equal(tab.shared,false);
  assert.equal(tab.profileId,'default');assert.equal(tab.parentId,null);
  assert.equal(app.windows().some(page=>page.url().endsWith('/link-routing/picker.html')),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,synthetic:true,directExternalLinkFallback:true,loaded:true,unowned:true,unshared:true,agentPaused:true,picker:'not applicable on this platform'}));
 }else{
 const picker=await popup();await picker.getByRole('searchbox').waitFor();
 // OS activation and unrelated windows can steal focus before a human chooses.
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().endsWith('/link-routing/picker.html')).emit('blur'));
 await new Promise(resolve=>setTimeout(resolve,150));assert.equal(picker.isClosed(),false,'focus loss must not pick an arbitrary destination');assert.equal((await inventory()).some(tab=>tab.url===url),false);
 await picker.keyboard.type('Design review');await wait(async()=>await picker.getByRole('option').count()===(process.platform==='darwin'?2:1));if(process.platform==='darwin'){assert.equal(await picker.getByRole('option').first().locator('.name').innerText(),'Open in SafariSelector');assert.equal(await picker.getByRole('option').first().locator('.digit').innerText(),'1');await picker.keyboard.press('ArrowDown');}await picker.keyboard.press('Enter').catch(error=>{if(!picker.isClosed())throw error;});
 const tab=await wait(async()=>(await inventory()).find(tab=>tab.url===url&&tab.loaded));assert.equal(tab.parentId,fixture.parentId);assert.equal(tab.owner,null);assert.equal(tab.agentPaused,true);await shell.locator('[data-chat-subtab="'+tab.id+'"]').waitFor();await wait(async()=>(await shell.evaluate(()=>window.desktop.workspaceSession({action:'get'}))).active===tab.id);
 const configuration=await shell.evaluate(()=>window.desktop.linkRouting({action:'get'}));assert.equal(configuration.registration.available,false);
 const target=configuration.targets.find(target=>target.projectId===fixture.project.id),rules=[{id:'synthetic',enabled:true,pattern:'127.0.0.1/link-rule',destination:{hostId:'local',workspaceId:target.workspaceId,projectId:target.projectId}}];
 await shell.evaluate(({rules,expectedRevision})=>window.desktop.linkRouting({action:'save',rules,expectedRevision}),{rules,expectedRevision:configuration.configuration.revision});
 const automatic=fixture.origin+'/link-rule/next';await open(automatic);const routed=await wait(async()=>(await inventory()).find(tab=>tab.url===automatic&&tab.loaded));assert.equal(routed.parentId,fixture.parentId);assert.equal(app.windows().some(page=>page.url().endsWith('/picker.html')),false);
 await open(url);const cancel=await popup();await cancel.getByRole('searchbox').waitFor();await cancel.keyboard.type('no matching project');await cancel.keyboard.press('Escape');assert.ok(await cancel.getByRole('option').count()>0);await cancel.keyboard.press('Escape').catch(error=>{if(!cancel.isClosed())throw error;});await wait(()=>cancel.isClosed());assert.equal((await inventory()).filter(tab=>tab.url===url).length,1);
 await shell.evaluate(id=>window.desktop.browser({action:'persist',id,enabled:true}),tab.id);await shell.evaluate(id=>window.desktop.browser({action:'visibility',id,hidden:true}),tab.id);const persisted=(await inventory()).find(row=>row.id===tab.id);assert.equal(persisted.loaded,true);assert.equal(persisted.hidden,true);
 await assert.rejects(shell.evaluate(id=>window.desktop.browser({action:'unload',id}),tab.id),/Persisted/);
 await shell.screenshot({path:process.cwd()+'/.runtime-tests/link-routing-ui.png'});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,synthetic:true,pickerFilterKeyboard:true,projectPlacement:true,automaticRule:true,escapeCancel:true,persistedHiddenResident:true,previewCannotRegister:true}));
 }
}catch(error){console.error('Synthetic picker state',app?.windows().map(page=>page.url()),await app?.windows().find(page=>page.url().startsWith('http:'))?.locator('body').innerText().catch(()=>''));throw error;}finally{await app?.close();await fixture.cleanup();}
