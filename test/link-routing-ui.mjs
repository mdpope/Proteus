import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const wait=async fn=>{for(let index=0;index<200;index++){const result=await fn();if(result)return result;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Isolated link-routing condition timed out.');};
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:process.env.PROTEUS_TEST_EXECUTABLE?[]:['.'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_DESIGN_DEMO:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const shell=await app.firstWindow();await shell.locator('body.window-design-preview').waitFor();await wait(()=>app.evaluate(({app})=>[...process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getWindows().contexts.values()].every(ctx=>ctx.externalURLReady)));
 const errors=[];shell.on('pageerror',error=>errors.push(error.message));
 const inventory=()=>app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().list(true));
 const open=url=>app.evaluate(({app},url)=>app.emit('open-url',{preventDefault(){}},url),url);
 const popup=()=>wait(()=>app.windows().find(page=>page.url().endsWith('/link-routing/picker.html')));
 const activationPolicy=()=>Number(execFileSync('/usr/bin/osascript',['-l','JavaScript','-e',
  `ObjC.import('AppKit'); Number($.NSRunningApplication.runningApplicationWithProcessIdentifier(${app.process().pid}).activationPolicy);`
 ],{encoding:'utf8'}).trim());
 const url=fixture.origin+'/link-picker';
 await app.evaluate(({app,nativeImage},url)=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
  const favicon=nativeImage.createFromBitmap(Buffer.from([200,137,46,255]),{width:1,height:1}).resize({width:16,height:16}).toDataURL();
  browser.siteSettings.remember(browser.partitionName('default'),url,{favicon});
 },url);
 if(process.platform==='darwin')assert.equal(activationPolicy(),0,'the launched window belongs to a regular Mac app');
 await open(url);
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
 assert.equal(activationPolicy(),0,'presenting the link picker must preserve the app menu');
 await picker.waitForFunction(()=>document.querySelector('#site-icon').naturalWidth===16);
 assert.equal(await picker.locator('#site-icon-fallback').isVisible(),false);
 // OS activation and unrelated windows can steal focus before a human chooses.
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().endsWith('/link-routing/picker.html')).emit('blur'));
 await new Promise(resolve=>setTimeout(resolve,150));assert.equal(picker.isClosed(),false,'focus loss must not pick an arbitrary destination');assert.equal((await inventory()).some(tab=>tab.url===url),false);
 await picker.keyboard.type('Design review');await wait(async()=>await picker.getByRole('option').count()===2);assert.equal(await picker.getByRole('option').first().locator('.name').innerText(),fixture.project.name);assert.equal(await picker.getByRole('option').first().locator('.digit').innerText(),'1');assert.equal(await picker.locator('.computer-heading').first().innerText(),'This computer');await picker.keyboard.press('Enter').catch(error=>{if(!picker.isClosed())throw error;});
 const tab=await wait(async()=>(await inventory()).find(tab=>tab.url===url&&tab.loaded));assert.equal(tab.parentId,fixture.parentId);assert.equal(tab.owner,null);assert.equal(tab.agentPaused,true);await shell.locator('[data-chat-subtab="'+tab.id+'"]').waitFor();await wait(async()=>(await shell.evaluate(()=>window.desktop.workspaceSession({action:'get'}))).active===tab.id);
 const configuration=await shell.evaluate(()=>window.desktop.linkRouting({action:'get'}));assert.equal(configuration.registration.available,false);
 assert.deepEqual(configuration.targets.filter(target=>target.feature).map(target=>target.feature).sort(),['reminders','scratchpad','team']);
 for(const [feature,title] of [['team','Team Tools'],['reminders','Reminders'],['scratchpad','Scratchpad']]){
  const featureURL=fixture.origin+'/feature-'+feature;await open(featureURL);const choice=await popup();await choice.getByRole('searchbox').waitFor();
  await choice.locator('.project').filter({has:choice.locator('.name',{hasText:new RegExp('^'+title+'$')})}).click().catch(error=>{if(!choice.isClosed())throw error;});
  const created=await wait(async()=>(await inventory()).find(tab=>tab.url===featureURL&&tab.loaded));assert.equal(created.parentId,null);
  if(feature==='team'){assert.equal(created.group,'team');await shell.locator('#team-browser-url').waitFor();}
  else {await shell.locator('#feature-content-navigation').waitFor();const session=await wait(async()=>{const value=await shell.evaluate(()=>window.desktop.workspaceSession({action:'get'}));return value.page===feature&&value.active===created.id?value:null;});assert.equal(session.page,feature);assert.equal(session.active,created.id);}
 }
 const target=configuration.targets.find(target=>target.projectId===fixture.project.id),rules=[{id:'synthetic',enabled:true,pattern:'127.0.0.1/link-rule',destination:{hostId:'local',workspaceId:target.workspaceId,projectId:target.projectId}}];
 await shell.evaluate(({rules,expectedRevision})=>window.desktop.linkRouting({action:'save',rules,expectedRevision}),{rules,expectedRevision:configuration.configuration.revision});
 const automatic=fixture.origin+'/link-rule/next';await open(automatic);const routed=await wait(async()=>(await inventory()).find(tab=>tab.url===automatic&&tab.loaded));assert.equal(routed.parentId,fixture.parentId);assert.equal(app.windows().some(page=>page.url().endsWith('/picker.html')),false);
 await open(url);const cancel=await popup();await cancel.getByRole('searchbox').waitFor();await cancel.keyboard.type('no matching project');await cancel.keyboard.press('Escape');assert.ok(await cancel.getByRole('option').count()>0);await cancel.keyboard.press('Escape').catch(error=>{if(!cancel.isClosed())throw error;});await wait(()=>cancel.isClosed());assert.equal((await inventory()).filter(tab=>tab.url===url).length,1);
 await shell.evaluate(id=>window.desktop.browser({action:'persist',id,enabled:true}),tab.id);await shell.evaluate(id=>window.desktop.browser({action:'visibility',id,hidden:true}),tab.id);const persisted=(await inventory()).find(row=>row.id===tab.id);assert.equal(persisted.loaded,true);assert.equal(persisted.hidden,true);
 await assert.rejects(shell.evaluate(id=>window.desktop.browser({action:'unload',id}),tab.id),/Persisted/);
 await shell.locator('#sidebar [data-page=engine]').click();
 await shell.locator('[data-engine-section=connections]').click();
 const order=shell.locator('.desktop-peer-list .device-row');
 assert.equal(await order.first().locator('strong').innerText(),'Design Mac');
 await shell.getByRole('button',{name:'Move up Studio PC'}).click();
 await shell.waitForFunction(()=>document.querySelector('.desktop-peer-list .device-row strong')?.textContent==='Studio PC');
 await shell.locator('[data-engine-section=preferences]').click();
 await shell.getByRole('tab',{name:'Link Picker',exact:true}).click();
 await shell.getByRole('button',{name:'Preview link picker',exact:true}).click();
 const sample=await popup();
 await sample.locator('#countdown').waitFor({state:'visible'});
 assert.match(await sample.locator('#countdown').innerText(),/ in \d+s/);
 assert.deepEqual(await sample.locator('.computer-heading').allTextContents(),['This computer','Studio PC','Design Mac','Another browser']);
 await sample.locator('#site-icon').waitFor({state:'visible'});
 assert.equal(await sample.locator('#site-icon').evaluate(node=>node.naturalWidth),16);
 await sample.screenshot({path:process.cwd()+'/.runtime-tests/nov17-clicked-link-picker.png'});
 await sample.keyboard.press('ArrowDown');
 assert.equal(await sample.locator('#countdown').isVisible(),false);
 await sample.keyboard.press('Escape').catch(error=>{if(!sample.isClosed())throw error;});
 await wait(()=>sample.isClosed());
 assert.equal(activationPolicy(),0,'closing repeated pickers must preserve the app menu');
 await shell.screenshot({path:process.cwd()+'/.runtime-tests/link-routing-ui.png'});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,synthetic:true,pickerFilterKeyboard:true,projectPlacement:true,automaticRule:true,escapeCancel:true,persistedHiddenResident:true,previewCannotRegister:true,computerOrder:true,siteIcon:true,defaultCountdown:true}));
 }
}catch(error){console.error('Synthetic picker state',app?.windows().map(page=>page.url()),await app?.windows().find(page=>page.url().startsWith('http:'))?.locator('body').innerText().catch(()=>''));throw error;}finally{await app?.close();await fixture.cleanup();}
