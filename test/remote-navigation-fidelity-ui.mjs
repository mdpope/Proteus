// A paired client navigates a project tab through the real owner API with the exact
// operation fields iOS sends. The desktop window must show that URL, in the same history
// entry, without publishing anything of its own over it. Synthetic local pages only.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';import {createServer} from 'node:http';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const f=await sidebarFixture(),home=f.locations.home,mainFile=path.join(home,'desktop-workspace.json');
const requests=[];const pages=createServer((request,response)=>{
 const url=new URL(request.url,'http://local');requests.push(url.pathname);
 if(url.pathname.startsWith('/server-redirect')){response.writeHead(302,{Location:'/landed-server'+url.search});response.end();return;}
 const script=url.pathname.startsWith('/script-redirect')?"<script>setTimeout(()=>location.replace('/landed-script'),150)</script>":url.pathname.startsWith('/spa')?"<script>setTimeout(()=>history.replaceState({}, '', location.pathname+'/route'),150)</script>":'';
 response.writeHead(200,{'Content-Type':'text/html'});response.end('<!doctype html><title>'+url.pathname+'</title><h1>'+url.pathname+'</h1>'+script);
});
await new Promise(resolve=>pages.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+pages.address().port,parent=f.parentId;
const browser=name=>({id:'view-'+name,contentTabId:'browser:'+randomUUID(),type:'browser',label:name,url:origin+'/start-'+name,parentId:parent,unloaded:true,openedAt:new Date().toISOString(),history:{entries:[{id:name+'-1',url:origin+'/start-'+name,title:name}],index:0,currentEntryId:name+'-1',revision:0}});
const loaded=browser('loaded'),background=browser('background'),redirected=browser('redirected'),scripted=browser('scripted'),spa=browser('spa');
const seed=JSON.parse(fs.readFileSync(mainFile,'utf8'));seed.tabs=[...seed.tabs.filter(tab=>tab.type!=='browser'),loaded,background,redirected,scripted,spa];seed.active=loaded.id;seed.page='context';fs.writeFileSync(mainFile,JSON.stringify(seed));
const until=async(fn,label,tries=120)=>{let last;for(let i=0;i<tries;i++){try{const value=await fn();if(value)return value;}catch(error){last=error;}await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label+(last?' ('+last.message+')':''));};
const settle=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let app;
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+f.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,PROTEUS_HOME:f.locations.home,CODEX_HOME:f.auth,PORT:'0'}});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);await page.locator('#topbar-home').waitFor();
 const scope={scope:'project',id:f.project.id};
 const api=body=>page.evaluate(async body=>{const response=await fetch('/api/content-tabs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error),{code:value.code});return value;},body);
 const owner=async id=>(await api({action:'get',...scope,historyLimit:200})).tabs.find(tab=>tab.id===id);
 const native=async id=>(await page.evaluate(()=>window.desktop.browser({action:'list'}))).find(row=>row.restoreIdentity===id);
 // Same fields as SharedAppStore.queueBrowserOperation.
 const navigate=async(tab,url,title='Remote')=>{
  const current=await owner(tab.contentTabId),operationId=randomUUID(),entryId=randomUUID();
  await api({action:'mutate',...scope,expectedRevision:(await api({action:'get',...scope})).revision,operations:[{visitedAt:new Date().toISOString(),eventId:operationId,profileId:'default',sourceHostId:'',action:'browser-navigate',tabId:tab.contentTabId,operationId,baseRevision:current.history.revision,entryId,url,title}]});
  return entryId;
 };
 await until(async()=>(await owner(loaded.contentTabId))?.url===loaded.url,'owner knows the seeded tab');
 await until(async()=>(await native(loaded.contentTabId))?.loaded===true,'selected tab loaded');
 const nativeFull=tab=>native(tab.contentTabId);
 const observe=async(tab)=>{const row=await native(tab.contentTabId),own=await owner(tab.contentTabId);return {nativeURL:row?.url,loaded:row?.loaded,nativeEntry:row?.history?.currentEntryId,pending:row?.navigationPending,ownerURL:own?.url,ownerEntry:own?.history?.currentEntryId,ownerEntries:own?.history?.entries?.length,ownerRevision:own?.history?.revision};};
 const select=async tab=>{const id=(await native(tab.contentTabId)).id;await page.locator(`[data-chat-subtab="${id}"]`).click();await until(async()=>(await native(tab.contentTabId))?.loaded===true,'selected '+tab.label);await settle(500);};
 const hits=path=>requests.filter(url=>url.startsWith(path)).length;
 // Whatever the page did on this device, the owner keeps the navigated URL and entry.
 const assertShared=async(tab,entry,url,message)=>{const row=await observe(tab);assert.equal(row.ownerEntry,entry,message+': owner keeps the navigated entry');assert.equal(row.ownerURL,url,message+': owner keeps the navigated URL');assert.equal(row.pending,false,message+': nothing queued to publish');return row;};
 const loadedEntry=await navigate(loaded,origin+'/remote-loaded');await settle(2500);
 let row=await assertShared(loaded,loadedEntry,origin+'/remote-loaded','loaded tab');assert.equal(row.nativeURL,origin+'/remote-loaded');assert.equal(row.nativeEntry,loadedEntry);
 const backgroundEntry=await navigate(background,origin+'/remote-background');await settle(2000);
 row=await assertShared(background,backgroundEntry,origin+'/remote-background','background tab');assert.equal(row.nativeURL,origin+'/remote-background');assert.equal(row.loaded,false,'a background mirror stays unloaded');
 // Several navigations in a row while page titles settle never conflict.
 for(let index=0;index<4;index++){await navigate(loaded,origin+'/burst-'+index);await settle(250);}
 await until(async()=>(await observe(loaded)).nativeURL===origin+'/burst-3','desktop follows the last burst navigation');
 assert.equal((await owner(loaded.contentTabId)).url,origin+'/burst-3');
 // Device-private landings stay local, with no reload loop.
 await select(redirected);
 const serverEntry=await navigate(redirected,origin+'/server-redirect-1');await settle(3000);
 row=await assertShared(redirected,serverEntry,origin+'/server-redirect-1','server redirect');assert.equal(row.nativeURL,origin+'/landed-server','the desktop page shows where it really landed');assert.equal(row.ownerEntries,2,'no extra history entry');assert.equal(hits('/server-redirect-1'),1,'no reload loop');
 assert.equal((await nativeFull(redirected)).sharedURL,origin+'/server-redirect-1');
 await select(scripted);
 const scriptEntry=await navigate(scripted,origin+'/script-redirect-1');await settle(3000);
 row=await assertShared(scripted,scriptEntry,origin+'/script-redirect-1','script redirect');assert.equal(row.nativeURL,origin+'/landed-script');assert.equal(row.ownerEntries,2);assert.equal(hits('/script-redirect-1'),1,'no reload loop');
 await select(spa);
 const spaEntry=await navigate(spa,origin+'/spa-1');await settle(3000);
 row=await assertShared(spa,spaEntry,origin+'/spa-1','same-document change');assert.equal(row.nativeURL,origin+'/spa-1/route');assert.equal(row.ownerEntries,2);assert.equal(hits('/spa-1'),1,'no reload loop');
 // The title reported by this device did not move the shared revision.
 const revision=(await observe(spa)).ownerRevision;await settle(2500);assert.equal((await observe(spa)).ownerRevision,revision,'mirror publishes nothing');
 // Unloading and activating a tab loads its saved page again. That is not a new visit.
 const restored=await nativeFull(redirected),beforeReload=await observe(redirected);
 await page.evaluate(id=>window.desktop.browser({action:'unload',id}),restored.id);
 await page.evaluate(id=>window.desktop.browser({action:'activate',id}),restored.id);
 await until(async()=>(await nativeFull(redirected))?.loaded===true,'reloaded tab');await settle(2500);
 row=await assertShared(redirected,serverEntry,origin+'/server-redirect-1','reloaded saved page');assert.equal(row.ownerEntries,beforeReload.ownerEntries,'reloading a saved page adds no history');assert.equal(row.ownerRevision,beforeReload.ownerRevision);
 // Trusted input ends the mirror: what the human then does here is shared.
 await select(redirected);
 const area=await page.evaluate(()=>{const rect=document.querySelector('#browser-area').getBoundingClientRect();return {x:rect.x+40,y:rect.y+40};});
 await page.mouse.click(area.x,area.y);
 await app.evaluate(async({webContents},{origin})=>{const wc=webContents.getAllWebContents().find(item=>item.getURL().startsWith(origin+'/landed-server'));await wc.executeJavaScript("(()=>{document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));})()",true);wc.sendInputEvent({type:'mouseDown',x:30,y:30,button:'left',clickCount:1});wc.sendInputEvent({type:'mouseUp',x:30,y:30,button:'left',clickCount:1});await wc.executeJavaScript("location.assign('/human-next')",true);},{origin});
 await until(async()=>(await owner(redirected.contentTabId)).url===origin+'/human-next','a human navigation after trusted input reaches the owner');
 assert.equal((await nativeFull(redirected)).sharedURL,undefined);
 console.log('PASS remote navigation reaches the desktop project: selected and background tabs follow it, bursts do not conflict, device-private redirects and page changes stay local without reloading or moving the shared URL, and trusted desktop input still publishes');
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),10000);try{await app.close();}finally{clearTimeout(timer);}}pages.close();await f.cleanup();}
