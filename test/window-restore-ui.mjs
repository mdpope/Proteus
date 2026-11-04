// Regression for the Nov 2 incident: a window that restarted with all saved views
// and owner descriptors retained, but showed only its chat and had no native browsers.
// Isolated app home, synthetic pages, real Electron restarts and real renderer windows.
import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const f=await sidebarFixture();
const home=f.locations.home,mainFile=path.join(home,'desktop-workspace.json'),windowsFile=path.join(home,'desktop-windows.json');
const until=async(fn,label,tries=450)=>{let last;for(let i=0;i<tries;i++){try{const value=await fn();if(value)return value;}catch(error){last=error;}await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label+(last?' ('+last.message+')':''));};

// Seed: one project with a chat, visible browsers, hidden browsers and a document,
// plus a second window with its own chat and browser. Hidden flags must survive.
const seed=JSON.parse(fs.readFileSync(mainFile,'utf8')),parent=f.parentId;
const chat=seed.tabs.find(tab=>tab.type==='run'&&tab.id===parent+':chat:'+f.user[0].id);
const browser=(name,hidden=false)=>({id:'synthetic-view-'+name,contentTabId:'browser:'+randomUUID(),type:'browser',label:'Synthetic '+name,url:f.origin+'/'+name,parentId:parent,unloaded:true,openedAt:new Date().toISOString(),...(hidden?{hidden:true}:{})});
const visible=['alpha','bravo','charlie','delta','echo'].map(name=>browser(name)),hidden=['hidden-one','hidden-two'].map(name=>browser(name,true));
seed.tabs=[...seed.tabs.filter(tab=>!['browser'].includes(tab.type)&&!tab.id.startsWith('synthetic-duplicate')),...visible,...hidden];seed.active=chat.id;seed.page='context';
fs.writeFileSync(mainFile,JSON.stringify(seed));
const firstId='main',secondId=randomUUID(),secondSession=path.join(home,'window-sessions',secondId+'.json');
fs.mkdirSync(path.dirname(secondSession),{recursive:true});
const otherRun=fs.readdirSync(path.join(home,'runs')).map(file=>JSON.parse(fs.readFileSync(path.join(home,'runs',file),'utf8'))).find(run=>run.projectId&&run.projectId!==f.project.id&&!run.archivedAt);assert.ok(otherRun,'a chat outside this project');
const secondChat={id:'chat-second',type:'run',runId:otherRun.id,label:'Second window chat'},secondBrowser={id:'synthetic-second-browser',contentTabId:'browser:'+randomUUID(),type:'browser',label:'Second window browser',url:f.origin+'/second',unloaded:true};
fs.writeFileSync(secondSession,JSON.stringify({schemaVersion:1,windowId:secondId,tabs:[{id:'overview',type:'overview',label:'Home'},secondChat,secondBrowser],active:secondChat.id,page:'home'}));
fs.writeFileSync(windowsFile,JSON.stringify({schemaVersion:1,windows:[{id:firstId},{id:secondId}]}));

const browserIds=[...visible,...hidden].map(tab=>tab.contentTabId);
let app;
const host=(fn,value)=>app.evaluate(async({app},{fn,value})=>new Function('main','value','return ('+fn+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{fn:fn.toString(),value});
const inWindow=(id,code)=>host(async(main,{id,code})=>main.getWindows().contexts.get(id).window.webContents.executeJavaScript(code),{id,code});
const inventory=id=>inWindow(id,"window.desktop.browser({action:'list'})");
const saved=id=>inWindow(id,"window.desktop.workspaceSession({action:'get'})");
const banner=id=>inWindow(id,"document.querySelector('#window-restore-notice')?.innerText||''");
async function launch(fault){
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+f.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,PROTEUS_HOME:f.locations.home,CODEX_HOME:f.auth,PORT:'0'}});
 // Installed before the app creates its first window, so the very first startup is covered.
 if(fault)await app.evaluate(async({app,session},fault)=>{
  const {BrowserTabs}=process.mainModule.require(app.getAppPath()+'/desktop/browser/browser.cjs');
  globalThis.restoreFault={...fault,stateCancelled:0};
  if(fault.state){const windows=[];session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/api/state*']},(details,callback)=>{const value=globalThis.restoreFault;if(!windows.includes(details.webContentsId))windows.push(details.webContentsId);const first=details.webContentsId===windows[0];if(first&&value.state!=='off'&&(value.state==='always'||value.stateCancelled<value.state)){value.stateCancelled++;callback({cancel:true});}else callback({});});}
  if(fault.children){const create=BrowserTabs.prototype.create;BrowserTabs.prototype.create=function(url,owner,history,descriptor={}){const rule=globalThis.restoreFault.children?.[descriptor.contentTabId];if(descriptor.restore&&rule==='throw')return Promise.reject(Error('Injected child restore failure.'));if(descriptor.restore&&rule==='hang')return new Promise(()=>{});return create.call(this,url,owner,history,descriptor);};}
 },fault);
 await until(()=>host((main,ids)=>ids.every(id=>main.getWindows()?.contexts.get(id)?.window.webContents.getURL()),[firstId,secondId]),'both windows opened');
}
async function close(){const timer=setTimeout(()=>app.process().kill('SIGKILL'),15000);try{await app.close();}finally{clearTimeout(timer);}app=null;}
const lift=()=>app.evaluate(()=>{const value=globalThis.restoreFault;if(value){value.state='off';value.children={};}});
const ready=id=>until(()=>host((main,id)=>main.getWindows().contexts.get(id).recovery.startupTimer===null,id),'window '+id+' ready');
// Every retained identity, order and hidden flag, one native view each, none extra.
async function assertComplete(id=firstId,expected=browserIds){
 const rows=await inventory(id),identities=rows.map(row=>row.restoreIdentity);
 assert.deepEqual([...identities].sort(),[...expected].sort(),'exactly one native browser per retained identity');
 const session=await saved(id),inSession=session.tabs.filter(tab=>tab.type==='browser').map(tab=>tab.contentTabId);
 assert.deepEqual(inSession,expected,'saved order unchanged');
 for(const tab of hidden.filter(tab=>expected.includes(tab.contentTabId))){assert.equal(session.tabs.find(row=>row.contentTabId===tab.contentTabId).hidden,true,'hidden flag retained');assert.equal(rows.find(row=>row.restoreIdentity===tab.contentTabId).hidden,true);assert.equal(rows.find(row=>row.restoreIdentity===tab.contentTabId).loaded,false,'hidden stays unloaded');}
 for(const tab of visible.filter(tab=>expected.includes(tab.contentTabId)))assert.notEqual(session.tabs.find(row=>row.contentTabId===tab.contentTabId).hidden,true);
 assert.ok(session.tabs.some(tab=>tab.id===chat.id),'chat view retained');
}
// The other window keeps its own views and selection through everything above.
const assertSecondIntact=async()=>{
 const session=await saved(secondId),browsers=session.tabs.filter(tab=>tab.type==='browser');
 assert.ok(browsers.some(tab=>tab.contentTabId===secondBrowser.contentTabId),'second window browser view retained');
 assert.ok(session.tabs.some(tab=>tab.runId===otherRun.id),'second window chat view retained');
 assert.equal(session.tabs.find(tab=>tab.id===session.active)?.runId,otherRun.id,'second window selection retained');
 assert.equal(browsers.some(tab=>browserIds.includes(tab.contentTabId)),false,'no views leak from the first window');
 assert.deepEqual((await inventory(secondId)).map(row=>row.restoreIdentity).filter(id=>id===secondBrowser.contentTabId),[secondBrowser.contentTabId]);
};
const results=[];
try{
 // 1. The owner cannot answer the first state reads. Former behaviour: restoration was
 //    skipped forever with one toast, leaving this window empty until Reload Window.
 await launch({state:3});
 await ready(firstId);await ready(secondId);await assertComplete();await assertSecondIntact();
 assert.equal(await banner(firstId),'','no notice remains after automatic recovery');
 assert.equal(await app.evaluate(()=>globalThis.restoreFault.stateCancelled),3,'the fault actually fired');
 results.push('startup state failure retries and restores all retained tabs without touching the second window');

 // 2. Visible and hidden tabs and project counts agree after restart; a chat tab renders.
 const chips=await inWindow(firstId,"[...document.querySelectorAll('[data-chat-subtab]')].map(node=>node.title||node.innerText)");
 assert.equal(chips.filter(text=>/Synthetic (alpha|bravo|charlie|delta|echo)/.test(text)).length,visible.length,'all intended visible tabs render');
 assert.equal(chips.filter(text=>/Synthetic hidden/.test(text)).length,0,'hidden tabs stay out of the strip');
 results.push('restored strip shows every visible tab and no hidden tab');
 await close();

 // 3. Single child failure and hang. The rest of the session restores; failed children
 //    stay in the saved session and project counts stay honest until retried.
 const broken=visible[1].contentTabId,stuck=hidden[0].contentTabId;
 await launch({children:{[broken]:'throw',[stuck]:'hang'}});
 await ready(firstId);
 const partial=await inventory(firstId);
 assert.deepEqual(partial.map(row=>row.restoreIdentity).sort(),browserIds.filter(id=>id!==broken&&id!==stuck).sort(),'only the failed children are missing natively');
 await until(async()=>/2 saved tabs could not be restored/.test(await banner(firstId)),'explicit child failure notice');
 await assertSecondIntact();
 const retained=await saved(firstId);
 assert.deepEqual(retained.tabs.filter(tab=>tab.type==='browser').map(tab=>tab.contentTabId),browserIds,'saved session keeps failed children in order');
 const failedRow=retained.tabs.find(tab=>tab.contentTabId===broken);assert.equal(failedRow.url,visible[1].url);assert.equal(retained.tabs.find(tab=>tab.contentTabId===stuck).hidden,true);
 // Selecting a failed child explains it instead of showing an empty page.
 await inWindow(firstId,`[...document.querySelectorAll('[data-chat-subtab]')].find(node=>/Synthetic bravo/.test(node.title||node.innerText))?.click()`);
 await until(()=>inWindow(firstId,"!!document.querySelector('#restore-tab-retry')"),'failed tab view');
 assert.match(await inWindow(firstId,"document.querySelector('#main').innerText"),/could not be restored.*retained/s);
 await lift();
 await inWindow(firstId,"document.querySelector('#restore-tab-retry').click()");
 await until(async()=>(await banner(firstId))==='','notice cleared after retry');
 await until(async()=>(await inventory(firstId)).length===browserIds.length,'failed children restored');
 await assertComplete();await assertSecondIntact();
 results.push('one failed and one hung child do not abandon the session; retry restores them without duplicates');
 await close();

 // 4. Startup failure that outlasts automatic retries: explicit state, nothing overwritten.
 const before=fs.readFileSync(mainFile);
 await launch({state:'always'});
 await until(async()=>/could not be restored/.test(await banner(firstId)),'explicit window failure',350);
 assert.deepEqual(fs.readFileSync(mainFile),before,'saved session bytes unchanged while failed');
 assert.equal((await inventory(firstId)).length,0);
 await ready(secondId);await assertSecondIntact();
 // A tab closed on the owner while this window is failed must not come back.
 const closing=hidden[1].contentTabId,scope={scope:'project',id:f.project.id};
 const close_=await inWindow(secondId,`(async()=>{const api=async body=>{const response=await fetch('/api/content-tabs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const value=await response.json();if(!response.ok)throw Error(value.error);return value;};const current=await api({action:'get',scope:${JSON.stringify(scope.scope)},id:${JSON.stringify(scope.id)}});const present=current.tabs.some(tab=>tab.id===${JSON.stringify(closing)});const next=await api({action:'mutate',scope:${JSON.stringify(scope.scope)},id:${JSON.stringify(scope.id)},expectedRevision:current.revision,operations:[{action:'close',id:${JSON.stringify(closing)}}]});return {present,closed:!next.tabs.some(tab=>tab.id===${JSON.stringify(closing)})};})()`);
 assert.deepEqual(close_,{present:true,closed:true},'owner knew the tab and closed it');
 await lift();
 await inWindow(firstId,"document.querySelector('[data-restore-retry]').click()");
 await until(async()=>(await banner(firstId))==='','window recovers after retry');
 await ready(firstId);
 const remaining=browserIds.filter(id=>id!==closing);
 await until(async()=>(await inventory(firstId)).every(row=>row.restoreIdentity!==closing),'owner-closed tab not reopened');
 await assertComplete(firstId,remaining);await assertSecondIntact();
 results.push('a failed startup stays explicit and recoverable, overwrites nothing, and cannot reopen an owner-closed tab');

 // 5. A later reload keeps the same identities: no duplicate views and the close sticks.
 const ids=(await inventory(firstId)).map(row=>row.id).sort();
 await host((main,id)=>main.getWindows().contexts.get(id).recovery.reload(),firstId);
 await until(()=>host((main,id)=>!main.getWindows().contexts.get(id).recovery.restoring,firstId),'reload window finishes');
 assert.deepEqual((await inventory(firstId)).map(row=>row.id).sort(),ids,'reload reuses every live view');
 await assertComplete(firstId,remaining);await assertSecondIntact();
 results.push('Reload Window reuses views and preserves the owner close');
 for(const line of results)console.log('PASS '+line);
}finally{if(app)await close().catch(()=>{});await f.cleanup();}
