// Real sidebar/workspace modules with synthetic owners; no pairing or user data.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..');
const html='<!doctype html><link rel="stylesheet" href="/public/style.css"><aside id="sidebar"></aside><main id="main"></main><p id="error"></p>';
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://fixture'),file=url.pathname==='/desktop-preview.css'?'/public/desktop-preview.css':url.pathname;if(file.startsWith('/public/')&&!file.includes('..')){const target=path.join(root,file.slice(1));if(!fs.existsSync(target)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(target));}else{res.setHeader('Content-Type','text/html');res.end(html);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(async()=>{
  const preview=await import('/public/desktop-preview.js'),workspaces=await import('/public/desktop-workspaces.js');
  const catalog={schemaVersion:1,enabled:true,revision:'r1',projects:[{id:'general',workspaceId:'same',name:'Shared project ID'},{id:'second',workspaceId:'same',name:'Second project'}],defaultProjectIds:{same:'general'},memberships:{chat:{workspaceId:'same',projectId:'general'}},sourceLibrary:[]};
  const state={tab:'overview',page:'context',tabs:[],data:{hostId:'local-host',hostName:'Local computer',runs:[{id:'chat',title:'Local chat',workspaceId:'same',projectId:'general',createdAt:'2026-10-18T01:00:00Z'}],context:{workspaces:[{id:'same',name:'Local workspace'}]},workspaceProjects:catalog}};
  const tabs=[{id:'owner-browser',type:'browser',title:'Owner browser',url:'https://example.test/synthetic',hidden:true,lastActivityAt:'2026-10-18T03:00:00Z'},{id:'owner-terminal',type:'terminal',title:'Owner terminal',terminalId:'original-session'},{id:'document:doc',type:'document',documentId:'doc',title:'Owner document',associationChatId:'chat'}];
  window.fixture={state,calls:[],offline:false,opened:[],tabs,executionDestination:'local-host',events:null};
  window.desktop={onPeer:callback=>fixture.events=callback,peers:async call=>{
   fixture.calls.push(structuredClone(call));if(fixture.offline)throw Error('Synthetic offline');
   if(call.method==='context.get')return {workspaces:[{id:'same',name:call.hostId==='remote'?'Remote workspace':'Legacy workspace'}]};
   if(call.method==='sync')return {state:{capabilities:call.hostId==='legacy'?[]:['projects.v1'],workspaceProjects:call.hostId==='legacy'?undefined:structuredClone(catalog),runs:[{id:'chat',title:'Remote chat',workspaceId:'same',projectId:'general',createdAt:'2026-10-18T02:00:00Z'}]}};
   if(call.method==='tabs.get')return {revision:3,tabs:call.args.id==='general'?structuredClone(tabs):[]};
   throw Error('Unexpected owner command '+call.method);
  }};
  const ui={state,escape:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),toast:message=>document.querySelector('#error').textContent=message,loadPeers:async()=>[{hostId:'remote',label:'Remote computer'},{hostId:'legacy',label:'Older computer'}],api:()=>{throw Error('No local mutation is authorized by sidebar navigation');},openTab:tab=>{const old=state.tabs.find(row=>row.id===tab.id);if(old)Object.assign(old,tab);else state.tabs.push(tab);state.tab=tab.id;ui.render();},render:()=>{
   document.querySelector('#sidebar').innerHTML='<div class="brand"><span class="brand-text">Proteus</span></div><nav><button data-page="context" class="navitem">Workspaces</button><button data-page="engine" class="navitem">Engine Room</button></nav><div class="sidebottom"><p>Local</p></div>';
   preview.bindPreviewSidebar();document.querySelector('#main').textContent=state.tabs.find(row=>row.id===state.tab)?.id||'Local overview';
  },openWorkspace:workspaces.openWorkspace,openRemoteProject:workspaces.openRemoteProject,openWorkspaceChat:workspaces.openWorkspaceChat,workspaceOwners:workspaces.workspaceOwners,refreshWorkspaceOwners:workspaces.refreshWorkspaceOwners,loadWorkspaceOwnerTabs:workspaces.loadWorkspaceOwnerTabs,manageWorkspaceTab:async(action,id)=>{fixture.opened.push({action,id});const tab=state.tabs.find(row=>row.id===id);tab.hidden=false;ui.openTab(tab);},syncContentTabs:async scope=>{
   fixture.calls.push({syncScope:scope});const parentId='project:'+scope.hostId+':'+scope.id;
   for(const row of tabs)if(!state.tabs.some(tab=>tab.contentTabId===row.id&&tab.parentId===parentId))state.tabs.push({id:'mirrored:'+scope.hostId+':'+row.id,type:row.type==='document'?'remote-document':row.type,contentTabId:row.id,parentId,hostId:scope.hostId,label:row.title,terminal:row.terminalId?{id:row.terminalId}:undefined,documentId:row.documentId,associationChatId:row.associationChatId,hidden:row.hidden});
  }};
  workspaces.initWorkspaces(ui);preview.initDesktopPreview(ui);fixture.ui=ui;fixture.workspaces=workspaces;ui.render();
 });
 await page.locator('[data-preview-workspace="same"]').waitFor();assert.equal(await page.locator('.preview-tree-computer').count(),0);
 await page.locator('[data-preview-workspace-expand="same"]').click();await page.locator('[data-preview-expand="general"]').click();await page.getByText('Local chat',{exact:true}).waitFor();
 await page.locator('[data-preview-other-computers]').click();await page.locator('[data-preview-computer-expand="remote"]').waitFor();await page.locator('[data-preview-computer-expand="remote"]').click();await page.locator('[data-preview-workspace-expand="remote:same"]').click();await page.locator('[data-preview-expand="remote:general"]').click();
 await page.getByText('Owner terminal',{exact:true}).waitFor();await page.getByText('Owner document',{exact:true}).waitFor();await page.getByText('Owner browser',{exact:true}).waitFor();await page.getByText('Remote chat',{exact:true}).waitFor();
 assert.equal(await page.locator('[data-preview-project-count="general"]').innerText(),'1');assert.equal(await page.locator('[data-preview-project-count="remote:general"]').innerText(),'4');
 await page.locator('[data-preview-chat="remote:chat"]').click();assert.equal(await page.evaluate(()=>fixture.state.tabs.find(tab=>tab.id===fixture.state.tab).parentId),'project:remote:general');assert.equal(await page.evaluate(()=>fixture.executionDestination),'local-host');
 await page.getByText('Owner terminal',{exact:true}).click();assert.deepEqual(await page.evaluate(()=>fixture.state.tabs.find(tab=>tab.id===fixture.state.tab).terminal),{id:'original-session'});
 await page.getByText('Owner document',{exact:true}).click();assert.equal(await page.evaluate(()=>fixture.state.tabs.find(tab=>tab.id===fixture.state.tab).associationChatId),'chat');
 await page.locator('[data-preview-workspace="same"]').click();assert.equal(await page.evaluate(()=>fixture.state.tab),'workspace:local:same');
 await page.locator('[data-preview-computer-expand="legacy"]').click();await page.locator('[data-preview-workspace-expand="legacy:same"]').click();await page.getByText('Projects unavailable on this computer',{exact:true}).waitFor();
 await page.evaluate(async()=>{fixture.offline=true;await fixture.workspaces.refreshWorkspaceOwners();fixture.ui.render();});await page.getByText('Offline · saved projects',{exact:true}).waitFor();await page.getByText('Remote chat',{exact:true}).waitFor();
 await page.evaluate(()=>fixture.ui.render());assert.equal(await page.locator('[data-preview-expand="remote:general"]').getAttribute('aria-expanded'),'true');
 const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('proteus.preview.sidebar.v2')));assert.ok(saved.projects.includes('general'));assert.ok(saved.projects.includes('remote:general'));assert.ok(saved.computers.includes('remote'));
 await page.evaluate(()=>{fixture.workspaces.initWorkspaces(fixture.ui);fixture.ui.render();});await page.locator('[data-preview-project="remote:general"]').waitFor();await page.getByText('Remote chat',{exact:true}).waitFor();
 await page.locator('[data-preview-collapse-all]').click();assert.equal(await page.locator('[data-preview-other-computers]').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('[data-preview-workspace-expand="same"]').getAttribute('aria-expanded'),'false');
 await page.waitForTimeout(250);
 await page.evaluate(()=>{const nav=document.querySelector('nav');nav.style.cssText='height:70px;max-height:70px;overflow:auto';nav.insertAdjacentHTML('beforeend','<div style="height:1000px"></div>');fixture.scrollNav=nav;fixture.scrollWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===sessionStorage&&key==='proteus.preview.sidebar.v2')fixture.scrollWrites++;return original.call(this,key,value);};nav.scrollTop=120;for(let i=0;i<30;i++)nav.dispatchEvent(new Event('scroll'));});
 assert.equal(await page.evaluate(()=>fixture.scrollWrites),0);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>fixture.scrollWrites),1);assert.equal(await page.evaluate(()=>fixture.scrollNav.isConnected),true);
 await page.evaluate(()=>{fixture.scrollNav.scrollTop=180;fixture.scrollNav.dispatchEvent(new Event('scroll'));window.dispatchEvent(new Event('pagehide'));});assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('proteus.preview.sidebar.v2')).scroll),180);
 assert.equal(await page.locator('#error').innerText(),'');assert.deepEqual(errors,[]);assert.ok((await page.evaluate(()=>fixture.calls)).every(call=>call.syncScope||['context.get','sync','tabs.get'].includes(call.method)));console.log(JSON.stringify({passed:true,groups:9,scope:'synthetic desktop Other Computers tree and owner navigation'}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
