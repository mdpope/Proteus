// N11-12: Playwright attaches to an authorized tab owned by another app window. Actual
// Electron windows; synthetic chat and a loopback page only.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import http from 'node:http';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const server=http.createServer((_,response)=>{response.writeHead(200,{'Content-Type':'text/html'});response.end('<!doctype html><title>Owning window fixture</title><h1>Cross-window Playwright fixture</h1>');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const native=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_AUTH:'none',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});
 const first=await app.firstWindow();await first.locator('#topbar-home').waitFor();const firstID=await first.evaluate(()=>window.desktop.windowId),runId=fixture.user[0].id;
 const opened=app.waitForEvent('window');await native(main=>main.createWindow());const second=await opened;await second.locator('#topbar-home').waitFor();const secondID=await second.evaluate(()=>window.desktop.windowId);
 assert.notEqual(firstID,secondID);
 // The turn was submitted from the first window.
 await native((main,{runId,firstID})=>{const run=main.getService().engine.getRun(runId);run.turnOrigin={client:'desktop',deviceId:'local-desktop',windowId:firstID};},{runId,firstID});
 // A top-level tab exists only in the second window (project tabs gain lazy mirrors elsewhere).
 const tab=await native((main,{secondID,url})=>{const b=main.getBrowser();return main.getWindows().run(secondID,()=>b.create(url));},{secondID,url:'http://127.0.0.1:'+server.address().port+'/'});
 await native((main,id)=>{const b=main.getBrowser(),row=b.tabs.get(id);if(b.agentAccess)b.agentAccess.set(b.agentIdentity(row),false,b.agentAccess.revision||0);else row.agentPaused=false;},tab.id);
 assert.equal(await native((main,id)=>main.getBrowser().tabs.get(id)?.windowId,tab.id),secondID,'the fixture tab belongs to the second window');
 for(let attempt=0;attempt<100;attempt++){const loading=await native((main,id)=>{const row=main.getBrowser().tabs.get(id);return !row?.view||row.view.webContents.isLoading();},tab.id);if(!loading)break;await new Promise(resolve=>setTimeout(resolve,100));}
 const logicalRows=()=>native((main,id)=>{const b=main.getBrowser(),row=b.tabs.get(id),logical=row.thumbnailId||row.contentTabId||row.id;return [...b.tabs.values()].filter(item=>(item.thumbnailId||item.contentTabId||item.id)===logical).map(item=>({id:item.id,windowId:item.windowId,loaded:!!item.view,mirror:item.mirror===true}));},tab.id);
 await new Promise(resolve=>setTimeout(resolve,1500));const beforeCalls=await logicalRows();
 const catalog=await native((main,{runId,id})=>main.getBrowser().agent({action:'mcp-list',backend:'playwright',tabId:id},runId),{runId,id:tab.id});
 assert.equal(catalog.windowId,secondID,'routing reports the owning window');
 const tools=JSON.stringify(catalog);assert.match(tools,/browser_snapshot/);
 const snapshot=await native((main,{runId,id})=>main.getBrowser().agent({action:'mcp-call',backend:'playwright',tabId:id,tool:'browser_snapshot',arguments:{}},runId),{runId,id:tab.id});
 assert.match(JSON.stringify(snapshot),/Cross-window Playwright fixture/);
 assert.deepEqual(await logicalRows(),beforeCalls.map(row=>({...row,loaded:row.loaded})),'attachment neither moves nor duplicates the tab');
 // Identity, placement and sharing are unchanged; no tab was duplicated into the first window.
 const after=await native((main,id)=>{const b=main.getBrowser(),row=b.tabs.get(id);return {windowId:row.windowId,count:[...b.tabs.values()].filter(item=>(item.thumbnailId||item.contentTabId||item.id)===(row.thumbnailId||row.contentTabId||row.id)).length,paused:b.agentStatus(row).agentPaused};},tab.id);
 assert.deepEqual(after,{windowId:secondID,count:beforeCalls.length,paused:false});
 // An explicit window selection is never overridden.
 await assert.rejects(native((main,{runId,id,firstID})=>main.getBrowser().agent({action:'mcp-list',backend:'playwright',tabId:id,windowId:firstID},runId),{runId,id:tab.id,firstID}),/not open in the submitting window|explicitly choose/);
 console.log(JSON.stringify({passed:true,synthetic:true,ownerWindow:'second',snapshot:true}));
}finally{await app?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));await fixture.cleanup();}
