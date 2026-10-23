// Isolated Electron placement with real native context menus and asynchronous creation.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-tab-placement-')));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
// Placement acceptance must not depend on fetching real Ghostery filter lists.
fs.writeFileSync(path.join(home,'browser-profiles.json'),JSON.stringify({version:1,enabled:false,account:null,items:[],defaultSettings:{blockingEnabled:false}}));
fs.mkdirSync(path.join(home,'runs'));
fs.writeFileSync(path.join(home,'runs/fixture-chat.json'),JSON.stringify({id:'fixture-chat',title:'Rehearsal chat',titleRevision:'synthetic',titleKind:'manual',trigger:'chat',status:'completed',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z',events:[],schedule:{schemaVersion:1,id:'fixture-chat',name:'Rehearsal chat',provider:'rehearsal',model:'',enabled:false,cron:'0 9 * * 1-5',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},context:{workspaceId:'default',entries:[],selectedIds:[],includeDefaults:true},misfire:'skip',prompt:'Synthetic completed chat only.'}}));
fs.writeFileSync(path.join(home,'desktop-workspace.json'),JSON.stringify({tabs:[{id:'fixture-chat',type:'run',label:'Rehearsal chat'},{id:'workspace:local:default',type:'workspace',workspaceId:'default',label:'Rehearsal workspace'}],active:'overview',page:'home'}));
let iconPNGs=[];
const server=http.createServer((req,res)=>{const image=/^\/valid-icon-([012])\.png$/.exec(req.url);if(image&&iconPNGs[Number(image[1])]){res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','public, max-age=60');res.end(iconPNGs[Number(image[1])]);return;}res.setHeader('Content-Type','text/html');res.end('<title>Rehearsal page</title><a href="/popup" target="_blank">Open</a>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let app;try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.route('**/api/team/lists',route=>route.fulfill({json:{identity:{accountId:'fixture',workspaceId:'1'},teamLists:[]}}));await page.locator('#topbar-home').waitFor();console.log('ready');
 await app.evaluate(({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),changed=browser.changed,command=browser.command,create=browser.create;globalThis.placementCounts={changed:0,commands:0,networkCompleted:0};browser.changed=function(...args){placementCounts.changed++;return changed.apply(this,args);};browser.command=function(...args){placementCounts.commands++;return command.apply(this,args);};browser.create=async function(...args){const info=await create.apply(this,args),wc=this.get(info.id).view?.webContents;if(wc&&!wc.isDestroyed())wc.debugger.on('message',(_event,method)=>{if(method==='Network.loadingFinished')placementCounts.networkCompleted++;});return info;};});
 const create=args=>page.evaluate(args=>window.desktop.browser({action:'create',...args}),args);
 const waitBrowser=async suffix=>{const end=Date.now()+15000;do{const tab=await app.evaluate(({app},suffix)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().list().find(tab=>tab.url?.endsWith(suffix)),suffix);if(tab)return tab;await new Promise(resolve=>setTimeout(resolve,100));}while(Date.now()<end);throw new Error('Synthetic browser did not reach '+suffix);};
 const waitSource=async(info,group)=>{const end=Date.now()+15000;do{const ready=await page.evaluate(async({id,url,group})=>{if(group==='team'){const state=(await import('/features/tools/team-tools.js')).teamState(),tab=state.tabs.find(tab=>tab.browserId===id);return !!tab&&state.active===tab.id&&tab.url===url&&tab.loaded;}const saved=await window.desktop.workspaceSession({action:'get'}),tab=saved.tabs.find(tab=>tab.id===id);return saved.active===id&&tab?.url===url&&!tab.unloaded;},{id:info.id,url:info.url,group});if(ready)return;await new Promise(resolve=>setTimeout(resolve,100));}while(Date.now()<end);throw new Error('Synthetic source selection did not settle '+info.id);};
 const order=async(group,parentId)=>page.evaluate(async({group,parentId})=>{if(group==='team')return (await import('/features/tools/team-tools.js')).teamState().tabs.filter(t=>t.browserId).map(t=>t.browserId);return (await window.desktop.workspaceSession({action:'get'})).tabs.filter(t=>t.type==='browser'&&(t.parentId||null)===parentId).map(t=>t.id);},{group,parentId});
 for(const [group,parentId] of [['main',null],['main','fixture-chat'],['main','workspace:local:default'],['team',null]]){
  console.log('container',group,parentId);const originals=[];for(let i=0;i<3;i++){const info=await create({url:origin+'/'+group+'/'+(parentId||'root')+'/'+i,group,parentId});originals.push(info);await waitSource(info,group);console.log('source-ready',group,parentId,i);}
  for(const source of originals){
   console.log('source',source.id);const nextURL=origin+'/new/'+source.id;
   await app.evaluate(({app},{id,url})=>{const b=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();b.actions.menu(b.get(id),{linkURL:url}).items[0].click();},{id:source.id,url:nextURL});
   const created=await waitBrowser('/new/'+source.id);
   await page.waitForTimeout(350);const ids=await order(group,parentId);
   assert.equal(ids[ids.indexOf(source.id)+1],created.id,group+' '+parentId+' adjacency');assert.equal(created.parentId||null,parentId);assert.equal(created.profileId,source.profileId);
   assert.deepEqual(ids.filter(id=>originals.some(t=>t.id===id)),originals.map(t=>t.id));
  }
 }
 // Capture before async create. Changing selection while it is pending cannot change source.
 const a=await create({url:origin+'/async-a'}),b=await create({url:origin+'/async-b'});
 await app.evaluate(({app},id)=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),create=browser.create.bind(browser);browser.create=async(...args)=>{await new Promise(resolve=>{globalThis.releasePlacement=resolve;});browser.create=create;return create(...args);};browser.actions.menu(browser.get(id),{linkURL:'http://127.0.0.1:'+new URL(browser.state(browser.get(id)).url).port+'/delayed'}).items[0].click();},a.id);
 await page.locator('[data-tab="'+b.id+'"]').click();await app.evaluate(()=>globalThis.releasePlacement());
 const child=await waitBrowser('/delayed');await page.waitForTimeout(350);
 const ids=await order('main',null);assert.equal(ids[ids.indexOf(a.id)+1],child.id);
 // Renderer links in a Team Markdown tab retain that logical source anchor,
 // even if the user selects another Team tab before answering its native menu.
 const teamSource='markdown:synthetic-source';
 await page.evaluate(async({id,url,home})=>{const team=await import('/features/tools/team-tools.js'),state=team.teamState();state.tabs.push({id,type:'markdown',label:'Synthetic Markdown source',file:home+'/source.md',markdown:{file:home+'/source.md',content:'[Synthetic context link]('+url+')'}});state.active=id;},{id:teamSource,url:origin+'/team-renderer-link',home});
 await page.locator('[data-page="team"]').click();await page.getByRole('link',{name:'Synthetic context link'}).waitFor();
 await app.evaluate(({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),command=browser.command;globalThis.placementCommand=command;browser.command=function(value){if(value.action==='popup-menu')return new Promise(resolve=>{globalThis.releaseRendererMenu=()=>resolve('open-tab');});return command.call(this,value);};});
 await page.getByRole('link',{name:'Synthetic context link'}).dispatchEvent('contextmenu');
 await page.locator('[data-team-tab="overview"]').click();await app.evaluate(()=>globalThis.releaseRendererMenu());
 await waitBrowser('/team-renderer-link');
 await page.waitForFunction(async id=>{const state=(await import('/features/tools/team-tools.js')).teamState();return state.tabs[state.tabs.findIndex(t=>t.id===id)+1]?.url.endsWith('/team-renderer-link');},teamSource);
 const linked=await page.evaluate(async()=> (await window.desktop.browser({action:'list'})).find(t=>t.url.endsWith('/team-renderer-link')));assert.equal(linked.group,'team');assert.equal(linked.parentId,null);
 await app.evaluate(({app})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser();browser.command=globalThis.placementCommand;delete globalThis.placementCommand;delete globalThis.releaseRendererMenu;});
 // A late real favicon must restart the exhausted malformed-icon generation.
 iconPNGs=(await app.evaluate(()=>{const {nativeImage}=process.mainModule.require('electron');return [[0,0,255,255],[0,255,0,255],[255,0,0,255]].map(pixel=>nativeImage.createFromBitmap(Buffer.from(pixel),{width:1,height:1}).toPNG().toString('base64'));})).map(value=>Buffer.from(value,'base64'));
 const iconTab=await create({url:origin+'/icon-fixture'});await waitSource(iconTab,'main');
 await app.evaluate(async({app},{id,url})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),wc=browser.get(id).view.webContents;await wc.executeJavaScript(`(()=>{const link=document.createElement('link');link.rel='icon';link.href=${JSON.stringify(url)};document.head.append(link);})()`);},{id:iconTab.id,url:origin+'/valid-icon-0.png'});
 let firstIcon;const iconEnd=Date.now()+15000;do{firstIcon=await app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().get(id).favicon,iconTab.id);if(firstIcon)break;await new Promise(resolve=>setTimeout(resolve,100));}while(Date.now()<iconEnd);assert.ok(firstIcon,'Late valid favicon was not published');
 const fallback=await app.evaluate(async({app},{id,origin})=>{const browser=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser(),tab=browser.get(id),wc=tab.view.webContents,execute=wc.executeJavaScript.bind(wc),send=wc.debugger.sendCommand.bind(wc.debugger);let cachedImages=0;
  await execute(`fetch(${JSON.stringify(origin+'/valid-icon-1.png')}).then(response=>response.arrayBuffer())`);
  wc.debugger.sendCommand=(method,...args)=>method==='Network.getResponseBody'?Promise.reject(new Error('Synthetic evicted response body')):send(method,...args);
  wc.executeJavaScript=async(script,...args)=>{const value=await execute(script,...args);if(script.includes('only-if-cached')&&value?.startsWith('data:image/'))cachedImages++;return value;};
  try{tab.iconURLs=[origin+'/valid-icon-1.png'];await browser.resolveFavicon(tab,tab.iconURLs);const cached=tab.favicon;
   wc.executeJavaScript=(script,...args)=>script.includes('only-if-cached')?Promise.resolve(''):execute(script,...args);
   tab.iconURLs=[origin+'/valid-icon-2.png'];await browser.resolveFavicon(tab,tab.iconURLs);return {cachedImages,cached,session:tab.favicon};
  }finally{wc.executeJavaScript=execute;wc.debugger.sendCommand=send;}
 },{id:iconTab.id,origin});
 assert.equal(fallback.cachedImages,1,'Cached-page image fallback did not return a valid PNG');assert.notEqual(fallback.cached,firstIcon);assert.notEqual(fallback.session,fallback.cached,'Session image fallback did not refresh the favicon');
 await page.waitForTimeout(1000);const before=await app.evaluate(()=>({...globalThis.placementCounts}));await page.waitForTimeout(1000);const after=await app.evaluate(()=>({...globalThis.placementCounts}));const stableChanges=after.changed-before.changed,stableCommands=after.commands-before.commands,stableNetworkCompletions=after.networkCompleted-before.networkCompleted;assert.ok(stableChanges<60,'Stable fixture has a browser-state feedback loop: '+stableChanges);assert.ok(stableCommands<100,'Stable fixture has an IPC feedback loop: '+stableCommands);assert.ok(stableNetworkCompletions<60,'Malformed favicons cause a recursive network storm: '+stableNetworkCompletions);
 console.log(JSON.stringify({passed:true,containers:4,firstMiddleLast:true,asyncOrigin:true,profilePreserved:true,teamMarkdownOrigin:true,teamMenuSelectionRace:true,lateFavicon:true,cachedImageFallback:true,sessionImageFallback:true,stableChanges,stableCommands,stableNetworkCompletions}));
}catch(error){console.error(JSON.stringify({error:error.message,tabs:await app?.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getBrowser().list()).catch(()=>[]),notices:await Promise.all((app?.windows()||[]).filter(p=>p.url().includes('notice.html')).map(p=>p.locator('body').innerText().catch(()=>'')))}));throw error;
}finally{await app?.close();await new Promise(r=>server.close(r));fs.rmSync(home,{recursive:true,force:true});}
