// Synthetic Team Tools close/open against the actual host and a stale client.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-team-close-'));
const server=http.createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<title>Synthetic standup</title><p>Local fixture</p>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const links=Array.from({length:4},(_,i)=>({id:'link-'+i,title:'Standup '+i,url:origin+'/standup/'+i}));
let app;
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_APP_PATH?{executablePath:process.env.PROTEUS_TEST_APP_PATH}:{}),args:[...(!process.env.PROTEUS_TEST_APP_PATH?['.']:[]),'--use-mock-keychain','--user-data-dir='+path.join(home,'browser')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);
 await page.route('**/api/team/lists',route=>route.fulfill({json:{identity:{accountId:'synthetic-team'},teamLists:[{id:'synthetic-list',name:'Synthetic standup',revision:1,timezone:'UTC',members:[],links}]}}));
 await page.route('**/api/state?*',async route=>{const response=await route.fetch(),data=await response.json();data.life={...data.life,identity:{accountId:'synthetic-team'}};await route.fulfill({response,json:data});});
 await page.route('**/app.js',async route=>{const response=await route.fetch(),body=(await response.text()).replace('refresh().then(restoreWorkspace)','window.teamCloseReady=refresh().then(restoreWorkspace)');await route.fulfill({response,body:body+'\nwindow.teamCloseFixture={api,navigate,selectTeamBrowser,teamState,contentTabSync,closeTeamTabById};clearInterval(refreshInterval);\n'});});
 await page.reload();await page.evaluate(()=>window.teamCloseReady);
 await page.evaluate(async origin=>{
  const f=window.teamCloseFixture;
  for(let i=0;i<15;i++){const info=await window.desktop.browser({action:'create',group:'team',unloaded:true,url:origin+'/old/'+i});f.selectTeamBrowser(info,null,{select:false});}
  f.navigate('team');await f.contentTabSync.all();
 },origin);
 await page.locator('#team-load-links').waitFor();
 await page.evaluate(async()=>{
  const f=window.teamCloseFixture,{createTabSynchronizer}=await import('./models/content-tab-sync.js');
  let local=(await f.api('/api/content-tabs',{action:'get',scope:'team',id:'team'})).tabs;
  window.teamStaleMirror=createTabSynchronizer({scopes:()=>[{scope:'team',id:'team'}],readLocal:async()=>structuredClone(local),apply:async(_scope,tabs)=>{local=structuredClone(tabs);},request:async(_scope,action,args)=>f.api('/api/content-tabs',{action,scope:'team',id:'team',...args}),onError:error=>{throw error;}});
  await window.teamStaleMirror.all();local=local.map(tab=>({...tab,title:'Delayed metadata '+tab.title}));
  for(const tab of f.teamState().tabs.slice())await f.closeTeamTabById(tab.id);
  await f.contentTabSync.all();
 });
 await page.waitForFunction(()=>window.teamCloseFixture.teamState().tabs.length===0);
 await page.locator('#team-load-links').click();
 await page.waitForFunction(()=>window.teamCloseFixture.teamState().tabs.length===4);
 await page.evaluate(async()=>{await window.teamCloseFixture.contentTabSync.all();await window.teamStaleMirror.all();for(let i=0;i<4;i++)await window.teamCloseFixture.contentTabSync.all();});
 const result=await page.evaluate(async()=>{
  const f=window.teamCloseFixture,owner=await f.api('/api/content-tabs',{action:'get',scope:'team',id:'team'}),native=(await window.desktop.browser({action:'list'})).filter(tab=>tab.group==='team');
  return {renderer:f.teamState().tabs.map(tab=>tab.contentTabId||tab.id),owner:owner.tabs.map(tab=>tab.id),native:native.map(tab=>tab.contentTabId||tab.id),urls:owner.tabs.map(tab=>tab.url)};
 });
 assert.equal(result.renderer.length,4);assert.equal(new Set(result.renderer).size,4);assert.equal(result.owner.length,4);assert.equal(result.native.length,4);
 assert.deepEqual([...result.renderer].sort(),[...result.owner].sort());assert.deepEqual([...result.urls].sort(),links.map(link=>link.url).sort());
 console.log(JSON.stringify({passed:true,synthetic:true,closed:15,standupLinks:4,staleMetadataCannotReopen:true,...result}));
}finally{
 if(app){const timeout=setTimeout(()=>app.process().kill('SIGKILL'),10000);await app.close().catch(()=>{});clearTimeout(timeout);}
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});
}
