// Closing a workspace in a window unloads that window's loaded browser tabs in the workspace,
// including an audible page, while unrelated tabs stay loaded. Synthetic loopback page and real
// WebAudio in a disposable preview owner; no real browsing data.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const server=http.createServer((_,response)=>{response.setHeader('Content-Type','text/html');response.end('<!doctype html><title>Workspace video</title><p>Synthetic media page</p>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const until=async(fn,label)=>{for(let n=0;n<300;n++){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Timed out: '+label);};
const native=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_AUTH:'none',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});
 const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor();
 await page.route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.closeFixture={state,openTab,closeTopTab,get ready(){return workspaceReady&&!workspaceRestoring;}};'});});
 await page.reload();await until(()=>page.evaluate(()=>window.closeFixture?.ready),'renderer ready');
 await native(main=>main.getService().browserProfiles.handle({action:'settings',id:'default',settings:{blockingEnabled:false}}));
 const parentId=fixture.parentId,command=value=>page.evaluate(value=>window.desktop.browser(value),value);
 assert.ok(await page.evaluate(id=>closeFixture.state.tabs.some(tab=>tab.id===id&&tab.type==='workspace'),parentId),'fixture workspace tab is open');
 const media=await command({action:'create',url:origin+'/media',parentId}),other=await command({action:'create',url:origin+'/other'});
 await page.evaluate(({media,parentId})=>closeFixture.openTab({id:media.id,type:'browser',info:media,parentId,label:media.title}),{media,parentId});
 await until(()=>native((main,id)=>!!main.getBrowser().get(id)?.view&&!main.getBrowser().get(id).view.webContents.isLoading(),media.id),'workspace page loaded');
 await native(async(main,id)=>{await main.getBrowser().get(id).view.webContents.executeJavaScript('window.audio=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();g.gain.value=0.01;o.connect(g).connect(audio.destination);o.start();audio.resume();true',true);},media.id);
 await until(()=>native((main,id)=>main.getBrowser().get(id).view.webContents.isCurrentlyAudible(),media.id),'workspace page is audible');
 // The user selects another top-level tab, then closes the workspace from the navigation.
 await page.evaluate(()=>{closeFixture.state.tab='overview';});
 await page.evaluate(id=>closeFixture.closeTopTab(id),parentId);
 await until(()=>native((main,id)=>!main.getBrowser().get(id)?.view,media.id),'audible workspace page unloaded');
 const after=await native((main,{media,other})=>{const b=main.getBrowser();return {mediaExists:!!b.tabs.get(media),mediaLoaded:!!b.get(media).view,otherLoaded:!!b.get(other).view};},{media:media.id,other:other.id});
 assert.deepEqual(after,{mediaExists:true,mediaLoaded:false,otherLoaded:true},'the logical tab is kept, only its page is released; unrelated tabs stay loaded');
 assert.equal(await page.evaluate(id=>closeFixture.state.tabs.find(tab=>tab.id===id)?.navigationClosed,parentId),true);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,synthetic:true,unloadedAudible:true,unrelatedLoaded:true}));
}finally{await app?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));await fixture.cleanup();}
