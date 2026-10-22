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
 const overlay=await invoke('overlay');assert.equal(overlay.visible,true,'Shell navigation and dialogs do not hide the pop-out');assert.deepEqual(overlay.popup,popped.popup);
 const controls=await until(()=>app.context().pages().find(p=>p.url().endsWith('/browser-video-controls.html')));
 await controls.getByRole('button',{name:'Close pop-out and return to tab'}).waitFor();
 await controls.waitForFunction(()=>getComputedStyle(document.body).opacity==='0');
 assert.equal(await controls.locator('body').evaluate(e=>getComputedStyle(e).opacity),'0');
 await controls.getByRole('button').click();await until(async()=>{const r=await invoke('inspect');return !r.popup&&!r.fullscreen;});
 const restored=await invoke('restore');assert.equal(restored.wcId,started.wcId);assert.equal(restored.sameVideo,true);assert.equal(restored.paused,false);assert.deepEqual(restored.history.entries.map(({id,url})=>({id,url})),popped.history.entries.map(({id,url})=>({id,url})));assert.equal(restored.history.index,popped.history.index);
 await invoke('start');await until(async()=>(await invoke('inspect')).popup);await invoke('exit');
 await page.evaluate(id=>window.desktop.browser({action:'close',id}),info.id);
 console.log('PASS: video fullscreen, exact bounds, fade, shell navigation, same-player return and cleanup');
}finally{await app?.close();await fixture.cleanup();}
