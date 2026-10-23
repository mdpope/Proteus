// Two isolated desktop applications, a disposable encrypted relay, independent cookies.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import {startRelay} from '../relay/server.js';import {secret} from '../src/remote-crypto.js';
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-follow-ui-'))),apps=[],errors=[],followDebug=[];
const fixture=http.createServer((req,res)=>{const slow=req.url==='/slow'&&req.headers.cookie?.includes('localIdentity=client');res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Follow '+req.url+'</title><h1>Follow '+req.url+'</h1><div id="fixture-content" style="height:'+(slow?0:8000)+'px;background:linear-gradient(white,green)">Synthetic local page</div>'+(slow?'<script>setTimeout(()=>{document.querySelector("#fixture-content").style.height="8000px";document.documentElement.dataset.ready="true";},3500)</script>':''));});
await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));const origin='http://follow.test:'+fixture.address().port,token=secret(),relay=await startRelay({port:0,token});
const until=async(fn,message='condition')=>{for(let i=0;i<200;i++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Timed out: '+message);};
const service=async(app,fn,arg)=>app.evaluate(({app},{source,arg})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();return eval('('+source+')')(service,arg);},{source:fn.toString(),arg});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const scrollPosition=app=>app.evaluate(async({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=browser.tabs.get(browser.active);return tab.view.webContents.executeJavaScript('({top:scrollY,fraction:scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)})');});
const nativeScript=(app,source)=>app.evaluate(({app},source)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return browser.tabs.get(browser.active).view.webContents.executeJavaScript(source);},source);
// Renderer URLs can describe pending navigation before the native page exists.
const nativeReady=(app,url)=>until(()=>app.evaluate(({app},url)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),wc=browser.tabs.get(browser.active)?.view?.webContents;return !!wc&&wc.getURL()===url&&!wc.isLoading();},url),'native document ready '+url);
const nativeFollow=(app,y)=>app.evaluate(({app},y)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),wc=browser.tabs.get(browser.active).view.webContents;wc.send('proteus:follow-scroll',{url:wc.getURL(),positions:[{path:'root',top:0,left:0,x:0,y}]});},y);
async function delayedNativeScroll(owner,client){
 // Bounded synthetic traces distinguish a replaced address edit from an older
 // descriptor response winning a navigation race. They are saved only on failure.
 await owner.page.evaluate(()=>{const trace=window.followFixtureAddressTrace=[];for(const name of ['input','submit','keydown','focusin'])document.addEventListener(name,event=>{if(!event.target.closest?.('#browser-form'))return;trace.push({at:Date.now(),kind:name,key:event.key,value:document.querySelector('#browser-url')?.value,target:event.target.id,active:document.activeElement?.id,tab:followFixture.state.tab});while(trace.length>40)trace.shift();},true);});
 await service(owner,s=>{const tabs=s.contentTabs,mutate=tabs.mutateAsync,trace=tabs.followFixtureMutationTrace=[];tabs.mutateAsync=async function(value){trace.push(structuredClone({at:Date.now(),value}));while(trace.length>80)trace.shift();try{return await mutate.call(this,value);}catch(error){trace.push({at:Date.now(),error:{code:error.code,message:error.message}});throw error;}};});
 for(const target of [owner,client])await target.evaluate(({app})=>{
  const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=browser.tabs.get(browser.active),trace=browser.followFixtureNavigationTrace=[];
  const state=()=>({url:tab.view?.webContents.getURL(),pending:tab.navigationPending,navigationURL:tab.navigationURL,pageNavigationURL:tab.pageNavigationURL,applyingShared:tab.applyingShared,history:tab.logicalHistory});
  const record=(kind,value)=>{trace.push(structuredClone({at:Date.now(),kind,...value,state:state()}));while(trace.length>160)trace.shift();};
  const command=browser.command;browser.command=async function(value){if(value.id!==tab.id||!['navigate','apply-history','restore-history'].includes(value.action))return command.call(this,value);record('command',{value});try{const result=await command.call(this,value);record('result',{action:value.action,result:{url:result?.url,history:result?.history,pending:result?.navigationPending}});return result;}catch(error){record('error',{action:value.action,error:error.message});throw error;}};
  const navigate=browser.navigate;browser.navigate=async function(id,url){if(id!==tab.id)return navigate.call(this,id,url);record('navigate',{url});const result=await navigate.call(this,id,url);record('navigated',{url});return result;};
  for(const name of ['did-start-navigation','did-navigate','did-stop-loading','did-fail-load'])tab.view.webContents.on(name,()=>record(name,{}));
  record('begin',{});
 });
 await owner.page.locator('#browser-url').fill(origin+'/slow');await owner.page.locator('#browser-url').press('Enter');
 await until(()=>client.page.evaluate(()=>followFixture.state.tabs.find(tab=>tab.id===followFixture.state.tab)?.info?.url?.endsWith('/slow')),'slow page URL follows');
 await Promise.all([nativeReady(owner,origin+'/slow'),nativeReady(client,origin+'/slow')]);
 await until(()=>nativeScript(client,'!!document.querySelector("#fixture-content")'),'slow content placeholder');
 assert.equal(await nativeScript(client,'document.documentElement.dataset.ready'),undefined,'receiver content is still delayed');
 await owner.evaluate(({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();browser.tabs.get(browser.active).view.webContents.sendInputEvent({type:'mouseWheel',x:200,y:200,deltaY:-900,deltaX:0,canScroll:true});});
 await until(async()=>(await scrollPosition(owner)).top>300,'owner scrolls before remote content is ready');
 await until(()=>nativeScript(client,'document.documentElement.dataset.ready==="true"'),'remote browser content mounts after3.5s');
 await until(async()=>Math.abs((await scrollPosition(owner)).fraction-(await scrollPosition(client)).fraction)<.025,'late native browser content restores scroll');
 // Exercise the native preload's cancellation boundaries without exposing its
 // IPC API to the website. Each message is sent from the trusted main process.
 await nativeScript(client,'document.querySelector("#fixture-content").style.height="0px"');await nativeFollow(client,.7);await pause(100);
 await client.evaluate(({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();browser.tabs.get(browser.active).view.webContents.sendInputEvent({type:'mouseWheel',x:200,y:200,deltaY:-10,deltaX:0,canScroll:true});});await pause(100);
 await nativeScript(client,'document.querySelector("#fixture-content").style.height="8000px"');await pause(200);assert.equal((await scrollPosition(client)).top,0,'real user input cancels a pending native scroll');
 await nativeScript(client,'document.querySelector("#fixture-content").style.height="0px"');await nativeFollow(client,.7);await pause(100);await nativeFollow(client,.2);await pause(100);
 await nativeScript(client,'document.querySelector("#fixture-content").style.height="8000px"');await until(async()=>Math.abs((await scrollPosition(client)).fraction-.2)<.01,'newer native position supersedes pending state');
 await nativeScript(client,'document.querySelector("#fixture-content").style.height="0px"');await nativeFollow(client,.8);await pause(100);
 await nativeScript(client,'history.pushState({},"","#new-address");document.querySelector("#fixture-content").style.height="8000px"');await pause(200);assert.equal((await scrollPosition(client)).top,0,'same-document navigation rejects the earlier URL position');
 await nativeScript(client,'document.querySelector("#fixture-content").style.height="0px"');await nativeFollow(client,.6);await pause(100);
 await nativeScript(client,'history.pushState({syntheticEntry:true},"",location.href)');await pause(100);await nativeScript(client,'document.querySelector("#fixture-content").style.height="8000px"');await pause(200);assert.equal((await scrollPosition(client)).top,0,'a new history entry with the same URL cancels pending native restoration');
 await owner.page.locator('#browser-url').fill(origin+'/nested');await owner.page.locator('#browser-url').press('Enter');await until(()=>client.page.evaluate(()=>followFixture.state.tabs.find(tab=>tab.id===followFixture.state.tab)?.info?.url?.endsWith('/nested')),'return to nested page');
 console.log('PASS native browser scroll: delayed DOM, genuine user cancellation, superseding state, navigation cancellation');
}
async function sustainedScroll(sender,receiver,owner,direction){
 // Exercise more than one relay traffic window with real native input, including
 // direction changes so the page never reaches an edge and appears falsely idle.
 // Finish prior native navigation and its queued descriptor reconciliation before measuring scroll.
 for(const app of [sender,receiver]){
  await nativeReady(app,origin+'/nested');
  await until(()=>app.evaluate(({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=browser.tabs.get(browser.active);return !tab.navigationPending&&!tab.applyingShared;}),'prior native navigation settled');
 }
 await Promise.all([sender,receiver].map(app=>app.page.evaluate(()=>followFixture.contentTabSync.all())));
 await until(async()=>(await Promise.all([sender,receiver].map(app=>app.page.evaluate(()=>!followFixture.projectFollower.applying)))).every(Boolean),'prior follow reconciliation complete');
 await service(owner,s=>{s.remote.followFixtureCounts={};});
 const start=Date.now();let previous=(await scrollPosition(receiver)).top,lastProgress=start,maxGap=0,changes=0;
 for(let input=0;input<120;input++){
  await sender.evaluate(({app},deltaY)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=browser.tabs.get(browser.active);tab.view.webContents.sendInputEvent({type:'mouseWheel',x:200,y:200,deltaY,deltaX:0,canScroll:true});},Math.floor(input/20)%2?90:-90);
  await pause(105);
  if(input%2===1){const position=(await scrollPosition(receiver)).top;if(Math.abs(position-previous)>2){const time=Date.now();maxGap=Math.max(maxGap,time-lastProgress);lastProgress=time;previous=position;changes++;}}
 }
 const duration=Date.now()-start;maxGap=Math.max(maxGap,Date.now()-lastProgress);
 await until(async()=>Math.abs((await scrollPosition(sender)).fraction-(await scrollPosition(receiver)).fraction)<0.025,direction+' final scroll position');
 const methods=await service(owner,s=>s.remote.followFixtureCounts),descriptors=methods['tabs.get']||0,updates=methods['tabs.follow:update']||0;
 console.log(JSON.stringify({scrollDirection:direction,durationMs:duration,visibleChanges:changes,maxProgressGapMs:maxGap,methods}));
 assert.ok(duration>10000,'continuous native scrolling crosses the ten-second relay traffic window');
 assert.ok(changes>=25,direction+' follows continuously: '+JSON.stringify({changes,maxGap,methods}));
 assert.ok(maxGap<2200,direction+' has no traffic-throttle stall: '+JSON.stringify({maxGap,methods}));
 assert.ok(descriptors<=6,direction+' avoids descriptor requests per scroll: '+JSON.stringify(methods));
 if(direction==='client to owner')assert.ok(updates>=25&&updates<=70,'remote scroll updates remain coalesced: '+JSON.stringify(methods));
}
async function delayedSharedScroll(page){
 const result=await page.evaluate(async()=>{
  const {restoreSharedScroll}=await import('./project-follow.js');
  const roots=Array.from({length:3},()=>{const root=document.createElement('div');root.style.cssText='position:fixed;left:-10000px;width:200px';document.body.append(root);return root;});
  let current=true;const positions=[{path:'0',top:450,left:0,x:0,y:.5}],stop=[restoreSharedScroll(roots[0],positions),restoreSharedScroll(roots[1],positions,()=>current),restoreSharedScroll(roots[2],positions)];
  try{
   await new Promise(resolve=>setTimeout(resolve,3200));current=false;roots[2].dispatchEvent(new WheelEvent('wheel'));
   const targets=roots.map(root=>{const target=document.createElement('div');target.style.cssText='height:100px;overflow:auto';const content=document.createElement('div');content.style.height='1000px';content.textContent='Delayed synthetic content';target.append(content);root.append(target);return target;});
   for(let attempt=0;attempt<80&&targets[0].scrollTop!==450;attempt++)await new Promise(resolve=>setTimeout(resolve,25));
   const positionsAfterMount=targets.map(target=>target.scrollTop);
   targets[0].scrollTop=100;targets[0].append(document.createElement('div'));await new Promise(resolve=>setTimeout(resolve,100));
   return {positionsAfterMount,afterCompletedMutation:targets[0].scrollTop,dimensions:targets.map(target=>({connected:target.isConnected,height:target.clientHeight,scrollHeight:target.scrollHeight,overflow:getComputedStyle(target).overflowY})),hidden:document.hidden};
  }finally{stop.forEach(dispose=>dispose());roots.forEach(root=>root.remove());}
 });
 assert.deepEqual(result.positionsAfterMount,[450,0,0],'late content restores only a current, uncancelled target: '+JSON.stringify(result));
 assert.equal(result.afterCompletedMutation,100,'completed restoration releases its observer');
 console.log('PASS shared scroll: content mounted after3.2s, changed scope/user input cancel, completed observer released');
}
try{
 for(const name of ['owner','client']){
  const home=path.join(root,name);fs.mkdirSync(home);fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
  const executablePath=process.env.PROTEUS_FOLLOW_EXECUTABLE;
  const app=await electron.launch({...(executablePath?{executablePath}:{}),args:[...(executablePath?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron'),'--host-resolver-rules=MAP follow.test 127.0.0.1'],env:{...process.env,PROTEUS_HOME:home,PORT:'0'}});apps.push(app);
  // Both applications would be foreground on their respective computers. Local
  // window occlusion must not suspend one synthetic app's animation frames.
  await app.evaluate(({app,webContents})=>{for(const contents of webContents.getAllWebContents())contents.setBackgroundThrottling(false);app.on('web-contents-created',(_event,contents)=>contents.setBackgroundThrottling(false));});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(name+': '+error.message));
  page.on('console',message=>{if(message.text().startsWith('Project follow:'))followDebug.push(name+': '+message.text());});
  await page.locator('#home-screen').waitFor();
  await page.route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.followFixture={state,openTab:(...args)=>{projectFollower.human();return openTab(...args);},refresh,contentTabSync,projectFollower,saveWorkspace,scopes:visibleContentScopes};'});});
  await page.reload();await page.locator('#home-screen').waitFor();
  // Separate machines would both have visible foreground windows. Keep both
  // synthetic renderers visible even when the local window manager occludes one.
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{get:()=>false,configurable:true}));
  app.page=page;
 }
 const [a,b]=apps;
 const responseDelay=Number(process.env.PROTEUS_FOLLOW_RESPONSE_DELAY_MS||0);assert.ok(Number.isSafeInteger(responseDelay)&&responseDelay>=0&&responseDelay<=1000);
 if(responseDelay)for(const app of apps)await app.page.route('**/api/content-tabs',async route=>{const response=await route.fetch();await pause(responseDelay);await route.fulfill({response});});
 await service(a,async(s,args)=>{await s.remote.configure({enabled:true,mode:'external',label:'Follow owner',relayURL:args.url,publicURL:args.url,relayToken:args.token});},{url:'ws://127.0.0.1:'+relay.port,token});
 await until(()=>service(a,s=>s.remote.status==='online'),'owner online');
 const pairing=await service(a,async s=>({code:(await s.remote.pairing()).code,hostId:s.remote.config.hostId}));
 await b.page.evaluate(async value=>{await window.desktop.peers({action:'pair',code:value.code});await window.desktop.peers({action:'connect',hostId:value.hostId});},pairing);
 const owner=await service(a,s=>{const context=s.context.get(),catalog=s.workspaceProjects.get(s.engine),workspaceId=context.defaultWorkspaceId;return {workspaceId,projectId:catalog.defaultProjectIds[workspaceId]};});
 for(const [app,hostId]of [[a,null],[b,pairing.hostId]])await app.page.evaluate(async({owner,hostId})=>{await followFixture.refresh(true);const id='project:'+(hostId||'local')+':'+owner.projectId;followFixture.openTab({id,type:'workspace',...owner,hostId:hostId||undefined,label:'Follow fixture',workspacePage:'chats'});await followFixture.contentTabSync.sync({scope:'project',id:owner.projectId,...(hostId?{hostId}:{})});},{owner,hostId});
 // Capture the production project interface and a real, unsubmitted dialog.
 // Retain only synthetic screenshots; disposable app data is removed below.
 const screenshots=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-follow-appearance-')));
 await a.page.locator('[data-preview-rename]').waitFor();
 const appearance=await a.page.evaluate(()=>({productionProjectCatalog:followFixture.state.data.workspaceProjects?.enabled===true,sidebar:!!document.querySelector('#sidebar nav.preview-sidebar-scroll'),projectPages:!!document.querySelector('.preview-project-pages'),bodyClass:document.body.className,viewport:{width:innerWidth,height:innerHeight}}));
 assert.equal(appearance.productionProjectCatalog,true);assert.equal(appearance.sidebar,true);assert.equal(appearance.projectPages,true);
 await a.page.screenshot({path:path.join(screenshots,'project-interface.png')});
 await a.page.locator('[data-preview-rename]').click();await a.page.locator('#dialog[open] #preview-project-name').waitFor();
 await a.page.screenshot({path:path.join(screenshots,'project-dialog.png')});await a.page.locator('#close-dialog').click();
 console.log(JSON.stringify({appearance,screenshots}));
 await delayedSharedScroll(a.page);
 const first=await a.page.evaluate(async url=>{const info=await window.desktop.browser({action:'create',url,parentId:followFixture.state.tab});followFixture.openTab({id:info.id,type:'browser',info,label:'First',parentId:followFixture.state.tab});return info.id;},origin+'/one');
 await until(()=>b.page.evaluate(()=>followFixture.state.tabs.find(tab=>tab.id===followFixture.state.tab)?.info?.url?.endsWith('/one')),'browser selection follows');
 await Promise.all(apps.map(app=>nativeReady(app,origin+'/one')));
 for(const [app,name]of [[a,'owner'],[b,'client']])await app.evaluate(async({app},{origin,name})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=[...browser.tabs.values()].find(tab=>tab.view?.webContents.getURL().startsWith(origin));await tab.view.webContents.session.cookies.set({url:origin,name:'localIdentity',value:name});},{origin,name});
 await a.page.locator('#browser-url').fill(origin+'/two');await a.page.locator('#browser-url').press('Enter');
 await until(()=>b.page.evaluate(()=>followFixture.state.tabs.find(tab=>tab.id===followFixture.state.tab)?.info?.url?.endsWith('/two')),'URL follows');
 await Promise.all(apps.map(app=>nativeReady(app,origin+'/two')));
 const identities=[];for(const app of apps)identities.push(await app.evaluate(async({app},origin)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=[...browser.tabs.values()].find(tab=>tab.view?.webContents.getURL().startsWith(origin));return (await tab.view.webContents.session.cookies.get({url:origin})).find(row=>row.name==='localIdentity')?.value;},origin));assert.deepEqual(identities,['owner','client']);
 await a.evaluate(({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=browser.tabs.get(browser.active);tab.view.webContents.sendInputEvent({type:'mouseWheel',x:200,y:200,deltaY:-650,deltaX:0,canScroll:true});});
 await until(()=>b.evaluate(async({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=browser.tabs.get(browser.active);return tab?.view&&await tab.view.webContents.executeJavaScript('scrollY>100');}),'browser scroll follows');
 await b.page.locator('#browser-url').fill(origin+'/three');await b.page.locator('#browser-url').press('Enter');await until(()=>a.page.evaluate(()=>followFixture.state.tabs.find(tab=>tab.id===followFixture.state.tab)?.info?.url?.endsWith('/three')),'reverse URL follows');
 const history=await a.page.evaluate(id=>followFixture.state.tabs.find(tab=>tab.id===id)?.info?.history,first);assert.ok(history.entries.some(row=>row.url.endsWith('/one')),'session beginning retained');
 await b.page.evaluate(()=>{followFixture.state.tab='overview';followFixture.state.page='home';followFixture.projectFollower.changed();});await new Promise(resolve=>setTimeout(resolve,200));
 await a.page.locator('#browser-url').fill(origin+'/four');await a.page.locator('#browser-url').press('Enter');await new Promise(resolve=>setTimeout(resolve,700));assert.equal(await b.page.evaluate(()=>followFixture.state.tab),'overview');
 assert.equal(await b.page.evaluate(()=>followFixture.state.tabs.find(tab=>tab.type==='browser')?.info?.url?.endsWith('/three')),true,'inactive project does not load a new page');
 await b.page.evaluate(({owner,hostId})=>{followFixture.openTab(followFixture.state.tabs.find(tab=>tab.projectId===owner.projectId&&tab.hostId===hostId));},{owner,hostId:pairing.hostId});
 await until(()=>b.page.evaluate(()=>followFixture.state.tabs.find(tab=>tab.id===followFixture.state.tab)?.info?.url?.endsWith('/four')),'catch up on re-entry');
 const chat=await a.page.evaluate(async owner=>{const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...owner,provider:'rehearsal',prompt:'Synthetic follow-along chat'})});if(!response.ok)throw Error(await response.text());const run=await response.json();await followFixture.refresh(true);const parent=followFixture.state.tabs.find(tab=>tab.projectId===owner.projectId&&!tab.hostId);const tab={id:parent.id+':chat:'+run.id,type:'run',runId:run.id,parentId:parent.id,label:'Synthetic follow chat'};followFixture.openTab(tab);return tab.id;},owner);
 try{await until(()=>b.page.evaluate(()=>followFixture.state.tabs.find(tab=>tab.id===followFixture.state.tab)?.type==='remote-run'),'chat follows');}
 catch(error){for(const [name,app]of [['owner',a],['client',b]])console.log(JSON.stringify({name,selection:await app.page.evaluate(()=>({active:followFixture.state.tab,tabs:followFixture.state.tabs.map(tab=>({id:tab.id,type:tab.type,parentId:tab.parentId,contentTabId:tab.contentTabId,runId:tab.runId,url:tab.info?.url}))}))}));throw error;}
 await a.page.evaluate(async({chat,url})=>{const info=await window.desktop.browser({action:'create',url,parentId:chat});followFixture.openTab({id:info.id,type:'browser',info,parentId:chat,label:'Nested browser'});},{chat,url:origin+'/nested'});
 await until(()=>b.page.evaluate(()=>followFixture.state.tabs.find(tab=>tab.id===followFixture.state.tab)?.info?.url?.endsWith('/nested')),'nested chat browser follows');
 await delayedNativeScroll(a,b);
 await service(a,s=>{const command=s.remote.command;s.remote.followFixtureCounts={};s.remote.command=function(peer,message){const key=message.method+(message.method==='tabs.follow'?':'+message.args?.action:'');this.followFixtureCounts[key]=(this.followFixtureCounts[key]||0)+1;return command.call(this,peer,message);};});
 await sustainedScroll(a,b,a,'owner to client');
 await sustainedScroll(b,a,a,'client to owner');
 assert.deepEqual(errors,[]);console.log('PASS two isolated desktops: scoped selection, URL both directions, sustained nested-browser scrolling both directions, independent cookies, full navigation beginning, inactive scope stays inactive, re-entry catchup, chat/nested browser selection and production interface');
}catch(error){
 const diagnosticDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-follow-diagnostics-'));
 for(const [index,app]of apps.entries())try{const diagnostic={app:index,selection:await app.page.evaluate(()=>({active:followFixture.state.tab,conflicts:followFixture.scopes().map(scope=>({...scope,conflict:followFixture.contentTabSync.hasConflict(scope)})),pendingNavigation:Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('proteus.navigation.pending:'))),address:document.querySelector('#browser-url')?.value,addressTrace:window.followFixtureAddressTrace,tabs:followFixture.state.tabs.map(tab=>({id:tab.id,type:tab.type,parentId:tab.parentId,contentTabId:tab.contentTabId,url:tab.info?.url,entry:tab.info?.history?.currentEntryId}))})),native:await app.evaluate(({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();return {tabs:[...browser.tabs.values()].map(tab=>({id:tab.id,url:tab.view?.webContents.getURL()})),trace:browser.followFixtureNavigationTrace};}),owner:await service(app,s=>({follow:[...s.projectFollow.scopes.values()],mutations:s.contentTabs.followFixtureMutationTrace,tabs:Object.fromEntries(Object.entries(s.contentTabs.read().scopes).map(([key,value])=>[key,{revision:value.revision,tabs:value.tabs.map(tab=>({id:tab.id,type:tab.type,url:tab.url,chatId:tab.chatId}))}]))}))};fs.writeFileSync(path.join(diagnosticDirectory,index+'.json'),JSON.stringify(diagnostic,null,2));console.log(JSON.stringify({app:index,diagnostic:path.join(diagnosticDirectory,index+'.json'),selection:diagnostic.selection,native:diagnostic.native.tabs}));}catch{}
 console.log(JSON.stringify({followDebug}));throw error;
}finally{
 for(const app of apps.reverse()){const timer=setTimeout(()=>app.process().kill('SIGKILL'),8000);try{await app.close();}finally{clearTimeout(timer);}}
 await relay.close();fixture.closeAllConnections();await new Promise(resolve=>fixture.close(resolve));fs.rmSync(root,{recursive:true,force:true});
}
