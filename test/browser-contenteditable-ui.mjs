// Contenteditable DOM retention is distinct from ARIA snapshot visibility.
// Disposable scheduled owner, actual native windows and loopback content; no account traffic.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-scheduled-browser-')));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const server=http.createServer((req,res)=>{res.setHeader('content-type','text/html');res.end(`<!doctype html><title>Scheduled background fixture</title><style>body{margin:0}button{position:fixed;right:24px;bottom:24px}dialog{width:60vw}</style><h1>Synthetic search</h1><button onclick="document.querySelector('dialog').showModal()">Search</button><dialog><div contenteditable="true" role="textbox" aria-label="Query"></div><output></output></dialog><script>document.querySelector('[contenteditable]').addEventListener('keydown',e=>{if(e.key==='Enter')document.querySelector('output').textContent=e.target.textContent})</script>`);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
let app;const native=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
try{
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'}});
 const first=await app.firstWindow();await first.locator('#topbar-home').waitFor();
 const opened=app.waitForEvent('window');await native(main=>main.createWindow());const second=await opened;await second.locator('#topbar-home').waitFor();
 const run=await native(main=>{const s=main.getService(),workspaceId=s.context.get().defaultWorkspaceId;const r=s.engine.createRun({schemaVersion:1,id:'background-fixture',name:'Synthetic scheduled browser',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:s.home,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic only',context:s.context.capture({workspaceId})},'scheduled',null,{deferStart:true});r.status='completed';r.turnOrigin={client:'mobile',deviceId:'synthetic-phone',windowId:'remote-window'};s.engine.persist(r);return r.id;});
 const act=value=>native((main,{value,run})=>main.getBrowser().agent(value,run),{value,run});
 const before=await native(main=>[...main.getWindows().contexts.values()].map(ctx=>({id:ctx.id,active:ctx.session.get().active,focused:ctx.window.isFocused()})));
 // Hidden renderer layouts can report a zero-size browser area while another pane is active.
 await native(main=>{for(const ctx of main.getWindows().contexts.values())main.getWindows().run(ctx.id,()=>main.getBrowser().show(null,{x:0,y:0,width:0,height:0}));});
 const tab=await act({action:'open',url,title:'Scheduled own search'});
 assert.equal(tab.agentPaused,false);assert.equal(tab.destination.destination.type,'chat');assert.equal(tab.destination.destination.id,run);
 const initial=await native((main,id)=>{const b=main.getBrowser(),t=b.get(id);return {bounds:t.view.getBounds(),visible:t.view.getVisible(),association:t.associationChatId,windows:[...main.getWindows().contexts.values()].map(ctx=>({id:ctx.id,active:ctx.session.get().active,focused:ctx.window.isFocused()}))};},tab.id);
 assert.equal(initial.association,run);assert.ok(initial.bounds.width>=300&&initial.bounds.height>=200,JSON.stringify(initial.bounds));assert.equal(initial.visible,false);assert.deepEqual(initial.windows,before);
 await act({action:'snapshot',tabId:tab.id});await act({action:'click',tabId:tab.id,role:'button',name:'Search'});
 await assert.rejects(act({action:'fill',tabId:tab.id,role:'textbox',name:'Query',text:'Wrong content argument'}),/explicit string value/);
 assert.equal((await act({action:'fill',tabId:tab.id,role:'textbox',name:'Query',value:'Synthetic bounded query'})).fillResult.retained,true);await act({action:'press',tabId:tab.id,role:'textbox',name:'Query',key:'Enter'});
 assert.match(JSON.stringify(await act({action:'snapshot',tabId:tab.id})),/Synthetic bounded query/);
 const diagnosed=await act({action:'fill',tabId:tab.id,role:'textbox',name:'Query',value:'Private synthetic query',diagnostics:true});
 assert.equal(diagnosed.fillResult.retained,true);
 assert.deepEqual(diagnosed.fillResult.diagnostics.samples.map(x=>x.phase),['before','immediate','150ms','500ms']);
 assert.ok(diagnosed.fillResult.diagnostics.events.some(x=>x.type==='input'));
 assert.ok(!JSON.stringify(diagnosed.fillResult).includes('Private synthetic query'));
 // Cancellation is observed, never converted to a successful fill or replayed.
 await native((main,id)=>main.getBrowser().get(id).view.webContents.executeJavaScript("document.querySelector('[contenteditable]').addEventListener('beforeinput',e=>e.preventDefault(),{once:true})"),tab.id);
 const cancelled=await act({action:'fill',tabId:tab.id,role:'textbox',name:'Query',value:'Cancelled query',diagnostics:true});
 assert.equal(cancelled.fillResult.retained,false);
 assert.ok(cancelled.fillResult.diagnostics.events.some(x=>x.type==='beforeinput'&&x.defaultPrevented));
 // A collapsed layout after first use must not strand a retained background page.
 await native((main,id)=>main.getBrowser().get(id).view.setBounds({x:0,y:0,width:0,height:0}),tab.id);
 await act({action:'snapshot',tabId:tab.id});const retained=await act({action:'fill',tabId:tab.id,role:'textbox',name:'Query',value:'Recovered viewport'});
 assert.equal(retained.fillResult.retained,true);assert.equal(retained.fillResult.contentEditable,true);
 await native((main,id)=>main.getBrowser().get(id).view.webContents.executeJavaScript("document.querySelector('[contenteditable]').addEventListener('input',e=>setTimeout(()=>{e.target.textContent=''},20),{once:true})"),tab.id);
 const reset=await act({action:'fill',tabId:tab.id,role:'textbox',name:'Query',value:'Rejected by editor',diagnostics:true});assert.equal(reset.fillResult.retained,false);assert.equal(reset.fillResult.diagnostics.samples.at(-1).original.length,0);
 // Replacing the original target is reported explicitly, without following it with new input.
 await native((main,id)=>main.getBrowser().get(id).view.webContents.executeJavaScript("document.querySelector('[contenteditable]').addEventListener('input',e=>{const next=e.target.cloneNode(false);e.target.replaceWith(next)},{once:true})"),tab.id);
 const replaced=await act({action:'fill',tabId:tab.id,role:'textbox',name:'Query',value:'Replaced query',diagnostics:true});assert.equal(replaced.fillResult.retained,false);assert.equal(replaced.fillResult.diagnostics.samples.at(-1).current.sameTarget,false);assert.equal(replaced.fillResult.diagnostics.samples.at(-1).original.connected,false);

 const afterInput=await native(main=>[...main.getWindows().contexts.values()].map(ctx=>({id:ctx.id,active:ctx.session.get().active,focused:ctx.window.isFocused()})));assert.deepEqual(afterInput,before);
 let capture=await act({action:'screenshot',tabId:tab.id}),captureMeta=JSON.parse(capture.content.find(item=>item.type==='text').text);
 const imageSize=await app.evaluate(({nativeImage},data)=>nativeImage.createFromBuffer(Buffer.from(data,'base64')).getSize(),capture.content.find(item=>item.type==='image').data);assert.deepEqual(imageSize,{width:captureMeta.width,height:captureMeta.height});
 const point=await native((main,id)=>main.getBrowser().get(id).view.webContents.executeJavaScript("(()=>{const b=document.querySelector('[contenteditable]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()"),tab.id);
 await act({action:'coordinate-click',tabId:tab.id,captureId:captureMeta.captureId,...point});
 assert.equal(await native((main,id)=>main.getBrowser().get(id).view.webContents.executeJavaScript("document.activeElement.getAttribute('aria-label')"),tab.id),'Query');
 capture=await act({action:'screenshot',tabId:tab.id});captureMeta=JSON.parse(capture.content.find(item=>item.type==='text').text);
 await native((main,id)=>main.getBrowser().get(id).view.setBounds({x:0,y:0,width:0,height:0}),tab.id);
 await assert.rejects(act({action:'coordinate-click',tabId:tab.id,captureId:captureMeta.captureId,x:10,y:10}),/changed|fresh|expired/i);
 // Selecting a page explicitly restores real view metrics; hiding it again retains identity.
 await native((main,id)=>{const b=main.getBrowser(),t=b.get(id);main.getWindows().run(t.windowId,()=>{b.show(id,{x:0,y:0,width:800,height:600});if(t.agentViewport)throw Error('Emulation survived native selection');b.show(null);});},tab.id);
 for(const field of ['persist','agentActions','downloads']){
  await native((main,{id,field})=>{const t=main.getBrowser().get(id);t[field]=field==='downloads'?new Set(['synthetic']):field==='persist'?true:1;},{id:tab.id,field});
  await assert.rejects(act({action:'unload',tabId:tab.id}),/Persisted|active browser/);
  await native((main,{id,field})=>{const t=main.getBrowser().get(id);t[field]=field==='downloads'?new Set():field==='persist'?false:0;},{id:tab.id,field});
 }
 // Explicit cleanup may release this run's own idle lease, never another run or active action.
 await native((main,id)=>main.getBrowser().get(id).automationRuns.add('other-synthetic-run'),tab.id);
 await assert.rejects(act({action:'unload',tabId:tab.id}),/active browser/);
 await native((main,id)=>main.getBrowser().get(id).automationRuns.delete('other-synthetic-run'),tab.id);
 const unloaded=await act({action:'unload',tabId:tab.id});assert.equal(unloaded.loaded,false);
 const restored=await act({action:'snapshot',tabId:tab.id});assert.equal(restored.id,tab.id);assert.equal(restored.agentPaused,false);
 assert.equal(await native((main,id)=>main.getBrowser().get(id).associationChatId,tab.id),run);
 console.log(JSON.stringify({passed:true,multipleWindows:true,scheduledWithoutVisibleChat:true,canonicalOwnPlacement:true,noSelectionOrFocusChange:true,backgroundClickFillPress:true,zeroViewportRecovery:true,ownIdleUnload:true,otherRunProtected:true,identityRetained:true}));
}finally{await app?.close();await new Promise(r=>server.close(r));fs.rmSync(home,{recursive:true,force:true});}
