// Actual WebAudio and page notifications in a disposable owner; no real Slack traffic.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const server=http.createServer((_,response)=>response.end('<!doctype html><title>Audio rehearsal</title><p>Synthetic audio and notification source</p>'));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const until=async(fn,label)=>{for(let n=0;n<200;n++){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Timed out: '+label);};
const native=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 const id=await native(async(main,origin)=>{await main.getService().browserProfiles.handle({action:'settings',id:'default',settings:{blockingEnabled:false,notifications:[{origin,permission:'allow'}]}});return (await main.getBrowser().create(origin)).id;},origin);
 const node=page.locator('[data-tab-container="'+id+'"]');await node.waitFor();
 await native(async(main,id)=>{const wc=main.getBrowser().get(id).view.webContents;await wc.executeJavaScript('window.audio=new AudioContext();window.oscillator=audio.createOscillator();window.gain=audio.createGain();gain.gain.value=0.01;oscillator.connect(gain).connect(audio.destination);oscillator.start();audio.resume();true',true);},id);
 await until(()=>native((main,id)=>main.getBrowser().state(main.getBrowser().get(id)).audioPlaying,id),'Chromium detects WebAudio');
 await node.locator('[aria-label="Audio playing"]').waitFor();assert.equal(await node.locator('.tab-audio').evaluate(el=>el.nextElementSibling?.classList.contains('tabclose')),true);
 // Exercise the actual renderer's right-click menu and selected command.
 const menuChoice=async label=>{await node.click({button:'right'});const menu=await until(()=>app.windows().find(window=>window.url().endsWith('/browser-page-menu.html')),'tab context menu');await menu.getByRole('menuitem',{name:label,exact:true}).click();};
 await menuChoice('Mute tab');await until(()=>native((main,id)=>main.getBrowser().get(id).view.webContents.isAudioMuted(),id),'context menu mutes native page');
 await node.locator('[aria-label="Tab muted"]').waitFor();
 const alert=async title=>native(async(main,{id,title})=>{const b=main.getBrowser(),wc=b.get(id).view.webContents;await wc.executeJavaScript('new Notification('+JSON.stringify(title)+',{body:"Actual fixture page event"});true');for(let n=0;n<100;n++){const item=main.getService().activity.data.notifications.find(item=>item.title.endsWith(title));if(item)return {title:item.title,sound:item.sound,silent:item.silent};await new Promise(r=>setTimeout(r,30));}throw Error('Notification not bridged');},{id,title});
 assert.equal((await alert('Muted fixture')).sound,false);
 await menuChoice('Unmute tab');await until(()=>native((main,id)=>!main.getBrowser().get(id).view.webContents.isAudioMuted(),id),'menu unmutes');
 assert.equal((await alert('Audible fixture')).sound,true);
 await native(async(main,id)=>{const b=main.getBrowser();await b.get(id).view.webContents.executeJavaScript('oscillator.stop();audio.close();true');},id);
 await until(()=>native((main,id)=>!main.getBrowser().state(main.getBrowser().get(id)).audioPlaying,id),'audio stops');
 await until(async()=>await node.locator('.tab-audio').count()===0,'speaker disappears when silent');
 await native(async(main,id)=>{const b=main.getBrowser();await b.command({action:'mute',id,muted:true});await b.unload(id);},id);
 const sleeping=await native(async(main,id)=>{const b=main.getBrowser();await b.command({action:'mute',id,muted:false});return {loaded:b.state(b.get(id)).loaded,muted:b.get(id).audioMuted};},id);assert.deepEqual(sleeping,{loaded:false,muted:false});
 await native(async(main,id)=>{const b=main.getBrowser();await b.command({action:'mute',id,muted:true});await b.reload(id);},id);
 assert.equal(await native((main,id)=>main.getBrowser().get(id).view.webContents.isAudioMuted(),id),true);
 const saved=await until(async()=>{const session=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));return session.tabs.find(tab=>tab.id===id&&tab.audioMuted);},'mute saved in window session');assert.equal(saved.audioMuted,true);
 console.log(JSON.stringify({passed:true,webAudio:true,speakerBeforeClose:true,actualContextMenuMute:true,visualNotificationsWhileMuted:true,notificationSoundIntent:true,unloadDoesNotLoad:true,muteSurvivesReloadAndWindowSession:true}));
}finally{await app?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));await fixture.cleanup();}
