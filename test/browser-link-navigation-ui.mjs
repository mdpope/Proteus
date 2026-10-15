// Rehearsal: normal page clicks must survive descriptor polling while loading.
import {_electron as electron} from 'playwright';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-link-rehearsal-')));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const server=http.createServer((req,res)=>{
  const html=`<title>Rehearsal ${req.url}</title><h1>Rehearsal ${req.url}</h1><a id="next" href="/slow">Next page</a><a id="popup" target="_blank" href="/popup">New page</a><a id="redirect" href="/redirect">Redirect</a><a id="hash" href="#section">Section</a><div id="section">Rehearsal section</div>`;
  if(req.url==='/redirect'){res.writeHead(302,{Location:'/destination'});res.end();return;}
  const respond=()=>{res.setHeader('Content-Type','text/html');res.end(html);};
  if(req.url==='/slow')setTimeout(respond,1600);else respond();
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let app; const errors=[];
const wait=async fn=>{for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Rehearsal navigation did not settle.');};
try{
  app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.locator('#home-screen').waitFor();console.log('Rehearsal shell ready');
  await app.evaluate(({app})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();b.blocker.ensure=async()=>{};});
  const command=value=>page.evaluate(value=>window.desktop.browser(value),value);
  const click=(id,selector)=>app.evaluate(async({app},{id,selector})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();await b.get(id).view.webContents.executeJavaScript(`document.querySelector(${JSON.stringify(selector)}).click()`);},{id,selector});
  const snapshot=id=>app.evaluate(({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),t=b.get(id);return {url:t.view.webContents.getURL(),body:t.view.webContents.isLoading(),history:b.state(t,true).history};},id);
  const tab=await command({action:'create',url:origin+'/one'});console.log('Rehearsal tab created');await page.locator(`[data-tab="${tab.id}"]`).click();
  const surface=await app.evaluate(({app},id)=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return {active:b.active,visible:b.get(id).view.getVisible(),epoch:b.rendererEpoch,revision:b.selectionRevision,overlays:[...b.overlays]};},tab.id);
  assert.equal(surface.active,tab.id,'Selected browser owns the visible surface: '+JSON.stringify(surface));assert.equal(surface.visible,true);
  await wait(async()=>await app.evaluate(async({app},id)=>{const s=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();return (await s.contentTabs.getAsync('main','main')).tabs.some(t=>t.id===id&&t.history?.revision>=1);},tab.id));
  console.log('Rehearsal shared history ready');await click(tab.id,'#next');await wait(async()=>{const v=await snapshot(tab.id);return v.url===origin+'/slow'&&!v.body;});
  await new Promise(r=>setTimeout(r,1700));assert.equal((await snapshot(tab.id)).url,origin+'/slow','Polling cannot return a clicked link to its old address');
  await click(tab.id,'#hash');await wait(async()=> (await snapshot(tab.id)).url===origin+'/slow#section');
  await click(tab.id,'#redirect');await wait(async()=> (await snapshot(tab.id)).url===origin+'/destination');
  await click(tab.id,'#popup');await wait(async()=> (await command({action:'list'})).some(t=>t.url===origin+'/popup'));
  assert.deepEqual(errors,[]);const logs=await app.evaluate(async({app})=>await process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().activity.logs());assert.equal(logs.items.filter(x=>x.event==='browser.load-failed').length,0);
  console.log('PASS rehearsal: slow ordinary click, hash link, redirect and target=_blank survive live history synchronization without error popups');
}catch(error){console.error(error);throw error;}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),5000);await app.close().catch(()=>{});clearTimeout(timer);}server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(home,{recursive:true,force:true});}
