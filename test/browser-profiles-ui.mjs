import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-profile-rehearsal-'));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const server=http.createServer((req,res)=>res.end('<title>Synthetic profile</title><h1>Profile rehearsal</h1>'));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
let app;
const start=async()=>{app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});await (await app.firstWindow()).locator('#topbar-home').waitFor();await app.evaluate(async({app})=>{
 const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),profiles=main.getService().browserProfiles;
 profiles.account={life:{api:{identity:()=>({origin:'https://synthetic.example',accountId:'synthetic-profile-owner'})}},request:async()=>({items:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',name:'Synthetic Research',revision:1,settings:{}}]})};
 await profiles.handle({action:'enable',enabled:true});
});};
try{
 console.log('Profile rehearsal: starting isolated app');
 await start();
 console.log('Profile rehearsal: app ready');
 const first=await app.evaluate(async({app},url)=>{
  const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),browser=main.getBrowser(),service=main.getService();
  const a=await browser.create(url),b=await browser.create(url,null,null,{profileId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
  const wa=browser.get(a.id).view.webContents,wb=browser.get(b.id).view.webContents;
  await wa.session.cookies.set({url,name:'session',value:'synthetic-default',httpOnly:true});await wb.session.cookies.set({url,name:'session',value:'synthetic-research',httpOnly:true});
  await wa.executeJavaScript("localStorage.setItem('profile','default')");await wb.executeJavaScript("localStorage.setItem('profile','research')");
  const privateStores=wa.session!==wb.session;
  await browser.unload(b.id);await browser.reload(b.id);
  const restored=await browser.get(b.id).view.webContents.executeJavaScript("localStorage.getItem('profile')");
  browser.get(b.id).view.webContents.executeJavaScript("window.open('/popup')");await new Promise(resolve=>setTimeout(resolve,500));
  const popup=browser.list().find(row=>row.url.endsWith('/popup'));const popupProfile=popup?.profileId;
  await service.browserProfiles.handle({action:'enable',enabled:false});browser.reconcileProfiles();const locked=browser.state(browser.get(b.id)).profileLocked;const hidden=!browser.get(b.id).view.getVisible();
  await service.browserProfiles.handle({action:'enable',enabled:true});browser.reconcileProfiles();
  const host=browser.extensions.profiles.get(b.profileId);host.rows.push({id:'a'.repeat(32),name:'Synthetic credential extension',enabled:true});
  let protectedShare=false;try{await browser.command({action:'share',id:b.id,shared:true});}catch{protectedShare=true;}host.rows.pop();
  return {privateStores,restored,popupProfile,locked,hidden,protectedShare};
 },url);
 console.log('Profile rehearsal: first-session checks complete');
 assert.deepEqual(first,{privateStores:true,restored:'research',popupProfile:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',locked:true,hidden:true,protectedShare:true});
 console.log('Profile rehearsal: closing before restart');
 await app.close();app=null;
 console.log('Profile rehearsal: closed');
 const snapshots=fs.readdirSync(path.join(home,'browser-sessions')).map(file=>fs.readFileSync(path.join(home,'browser-sessions',file)));
 assert.ok(snapshots.length>=2);assert.ok(snapshots.every(bytes=>!bytes.includes(Buffer.from('synthetic-default'))&&!bytes.includes(Buffer.from('synthetic-research'))));
 console.log('Profile rehearsal: starting isolated app');
 await start();
 console.log('Profile rehearsal: app ready');
 const restarted=await app.evaluate(async({app},url)=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();
  const result=[];for(const profileId of ['default','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']){const info=await browser.create(url,null,null,{profileId}),wc=browser.get(info.id).view.webContents;result.push({cookie:(await wc.session.cookies.get({url,name:'session'}))[0]?.value,storage:await wc.executeJavaScript("localStorage.getItem('profile')")});}return result;
 },url);
 assert.deepEqual(restarted,[{cookie:'synthetic-default',storage:'default'},{cookie:'synthetic-research',storage:'research'}]);
 console.log(JSON.stringify({passed:true,isolatedProfiles:true,restartCookies:true,restartLocalStorage:true,profileRevocation:true,extensionPrivacy:true}));
}finally{await app?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
