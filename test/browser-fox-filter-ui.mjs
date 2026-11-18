// The real Electron request pipeline with synthetic HTTPS responses only.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const f=await sidebarFixture();let app;
const host=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
const until=async fn=>{for(let i=0;i<250;i++){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Synthetic Fox filtering did not settle');};
try{
 app=await electron.launch({args:['.','--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,CODEX_HOME:f.auth,PORT:'0'}});
 await (await app.firstWindow()).locator('#topbar-home').waitFor();
 await host(main=>{const b=main.getBrowser(),{ElectronBlocker}=process.mainModule.require(process.cwd()+'/node_modules/@ghostery/adblocker-electron');b.blocker.engine=ElectronBlocker.parse('');b.blocker.updatedAt=new Date().toISOString();b.sessionFor('default').protocol.handle('https',request=>{const u=new URL(request.url);if(u.hostname==='woodstockcustom.com')return new Response('window.syntheticAdmiral=true',{headers:{'Content-Type':'application/javascript'}});if(u.hostname==='succeedscene.com')return new Response('var admrlLoaded=true',{headers:{'Content-Type':'application/javascript'}});if(u.pathname==='/article.js')return new Response('window.articleReady=true',{headers:{'Content-Type':'application/javascript'}});return new Response('<!doctype html><h1>Synthetic article</h1><script src="https://woodstockcustom.com/assets/js/synthetic/ems.js"></script><script src="https://succeedscene.com/openads/img/admr.js"></script><script src="/article.js"></script>',{headers:{'Content-Type':'text/html'}});});});
 for(const enabled of [true,false]){
  const id=await host(async(main,enabled)=>{await main.getService().browserProfiles.handle({action:'settings',id:'default',settings:{blockingEnabled:enabled}});return (await main.getBrowser().create('https://www.foxnews.com/synthetic-article')).id;},enabled);
  const result=await until(()=>host(async(main,id)=>{const t=main.getBrowser().get(id);return t.view.webContents.executeJavaScript('window.articleReady?({article:document.querySelector("h1").textContent,bait:window.admrlLoaded,admiral:!!window.syntheticAdmiral}):null');},id));
  assert.equal(result.article,'Synthetic article');assert.equal(result.bait,true);assert.equal(result.admiral,!enabled);await host((main,id)=>main.getBrowser().close(id),id);
 }
 console.log('browser-fox-filter-ui: loader blocked, article and bait retained; profile blocking toggle respected');
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),15000);try{await app.close();}finally{clearTimeout(timer);}}await f.cleanup();}
