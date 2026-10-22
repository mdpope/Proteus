// Synthetic local player; no account, provider, live profile or external video.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const until=async fn=>{for(let n=0;n<100;n++){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,100));}throw Error('Video pop-out did not settle');};
try{
 app=await electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:[]}:{args:['.']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();await page.locator('body.window-design-preview').waitFor();
 const info=await page.evaluate(url=>window.desktop.browser({action:'create',url}),fixture.origin+'/video');
 await page.locator(`[data-tab="${info.id}"]`).click();
 const invoke=(operation)=>app.evaluate(async({app},{id,operation})=>{
  const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=b.get(id),wc=tab.view.webContents;
  if(operation==='start'){
   b.window.setBounds({x:140,y:100,width:960,height:640});
   const error=await wc.executeJavaScript(`(async()=>{document.body.innerHTML='<div id="player"><video controls muted></video></div>';const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');ctx.fillStyle='green';ctx.fillRect(0,0,320,180);const v=document.querySelector('video');v.srcObject=canvas.captureStream(5);await v.play();window.originalVideo=v;await document.querySelector('#player').requestFullscreen();})().catch(e=>({error:e.message}))`,true);if(error?.error)throw Error(error.error);
  }
  if(operation==='overlay'){b.show(null);b.setOverlay('test',true);}
  if(operation==='restore'){b.setOverlay('test',false);b.show(id,{x:0,y:100,width:960,height:540});}
  if(operation==='exit')b.videoPopout.close(tab);
  return {active:b.active,websiteFullscreen:!!tab.websiteFullscreen,fullscreen:await wc.executeJavaScript('!!document.fullscreenElement'),bounds:b.window.getBounds(),popup:tab.videoPopout?.window.getBounds(),visible:tab.view.getVisible(),wcId:wc.id,popCount:[...b.tabs.values()].filter(t=>t.videoPopout).length,sameVideo:await wc.executeJavaScript('window.originalVideo===document.querySelector("video")'),paused:await wc.executeJavaScript('document.querySelector("video").paused'),history:b.state(tab,true).history};
 },{id:info.id,operation});
 const started=await invoke('start');const popped=await until(async()=>{const r=await invoke('inspect');return r.popup?r:null;});
 assert.deepEqual(popped.popup,popped.bounds,'Exact originating window position and dimensions');assert.equal(popped.wcId,started.wcId);assert.equal(popped.sameVideo,true);assert.equal(popped.paused,false);
 // Exercise trusted mouse/trackpad input against the actual retained native player.
 await app.evaluate(async({app,ipcMain},id)=>{global.videoInputs=[];ipcMain.on('proteus:video-window-gesture',(_event,value)=>global.videoInputs.push(value));const wc=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents;await wc.executeJavaScript(`window.videoEvents=[];for(const type of ['pointerdown','pointermove','pointerup','wheel'])window.addEventListener(type,event=>videoEvents.push({type,buttons:event.buttons,button:event.button,screenX:event.screenX,screenY:event.screenY,target:event.target.tagName,fs:!!document.fullscreenElement,trusted:event.isTrusted}),true)`);},info.id);
 const gesture=async(type,extra={})=>app.evaluate(async({app},{id,type,extra})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=b.get(id),wc=tab.view.webContents;tab.videoPopout.window.focus();wc.focus();await new Promise(resolve=>setTimeout(resolve,80));const point={x:300,y:200,...extra},bounds=tab.videoPopout.window.getBounds();wc.sendInputEvent({type,...point,globalX:bounds.x+point.x,globalY:bounds.y+point.y});await new Promise(resolve=>setTimeout(resolve,120));return {bounds:tab.videoPopout.window.getBounds(),zoom:wc.getZoomFactor(),visual:await wc.executeJavaScript('visualViewport.scale'),area:process.mainModule.require('electron').screen.getDisplayMatching(tab.videoPopout.window.getBounds()).workArea};},{id:info.id,type,extra});
 await gesture('mouseDown',{button:'left'});await gesture('mouseMove',{x:380,y:260,modifiers:['leftButtonDown']});await gesture('mouseUp',{x:380,y:260,button:'left'});
 const dragged=await invoke('inspect');if(JSON.stringify(dragged.popup)===JSON.stringify(popped.popup))console.log(await app.evaluate(async({app},id)=>({ipc:global.videoInputs,dom:await process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).view.webContents.executeJavaScript('videoEvents')}),info.id));assert.notDeepEqual(dragged.popup,popped.popup,'Dragging the video surface moves its window');assert.equal(dragged.sameVideo,true);assert.equal(dragged.paused,false);
 const shrunk=await gesture('mouseWheel',{deltaY:-80,deltaX:0,modifiers:['control'],canScroll:true});assert.ok(shrunk.bounds.width<dragged.popup.width,'Pinch inward shrinks the window');assert.equal(shrunk.zoom,1);assert.equal(shrunk.visual,1);
 const grown=await gesture('mouseWheel',{deltaY:160,deltaX:0,modifiers:['control'],canScroll:true});assert.ok(grown.bounds.width>shrunk.bounds.width);assert.ok(grown.bounds.width<=grown.area.width);assert.ok(grown.bounds.y>=grown.area.y);assert.ok(grown.bounds.y+grown.bounds.height<=grown.area.y+grown.area.height);
 const forged=await app.evaluate(async({app},id)=>{const tab=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id),before=tab.videoPopout.window.getBounds();await tab.view.webContents.executeJavaScript('window.dispatchEvent(new WheelEvent("wheel",{ctrlKey:true,deltaY:500,bubbles:true}))');await new Promise(resolve=>setTimeout(resolve,120));return {before,after:tab.videoPopout.window.getBounds()};},info.id);assert.deepEqual(forged.after,forged.before);
 const overlay=await invoke('overlay');assert.equal(overlay.visible,true,'Shell navigation and dialogs do not hide the pop-out');assert.deepEqual(overlay.popup,grown.bounds);
 const controls=await until(()=>app.context().pages().find(p=>p.url().endsWith('/browser-video-controls.html')));
 await controls.getByRole('button',{name:'Close pop-out and return to tab'}).waitFor();
 await controls.waitForFunction(()=>getComputedStyle(document.body).opacity==='0');
 assert.equal(await controls.locator('body').evaluate(e=>getComputedStyle(e).opacity),'0');
 await controls.getByRole('button').click();await until(async()=>{const r=await invoke('inspect');return !r.popup&&!r.fullscreen;});
 const restored=await invoke('restore');assert.equal(restored.wcId,started.wcId);assert.equal(restored.sameVideo,true);assert.equal(restored.paused,false);assert.deepEqual(restored.history.entries.map(({id,url})=>({id,url})),popped.history.entries.map(({id,url})=>({id,url})));assert.equal(restored.history.index,popped.history.index);
 await invoke('start');await until(async()=>(await invoke('inspect')).popup);await invoke('exit');
 await page.evaluate(id=>window.desktop.browser({action:'close',id}),info.id);
 console.log('PASS: video fullscreen, exact bounds, drag, proportional pinch/work-area limits, forged-input rejection, fade, shell navigation, same-player return and cleanup');
}finally{await app?.close();await fixture.cleanup();}
