// Rehearsal only: disposable owner data and local fixture pages; no real websites/accounts.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-incognito-ui-'))),marker='INCOGNITO_ONLY_'+Date.now();
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>'+req.url+'</title><h1>Fixture page</h1><a href="/target">Link</a>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
let app,page;const errors=[];
const until=async(fn,label)=>{for(let i=0;i<200;i++){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Timeout: '+label);};
const native=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
const command=value=>page.evaluate(value=>window.desktop.browser(value),value);
const select=info=>page.evaluate(info=>privateFixture.openTab({id:info.id,type:'browser',info,parentId:info.parentId,label:info.title}),info);
async function launch(){
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.locator('#topbar-home').waitFor();
 await page.route('**/api/team/lists',route=>route.fulfill({json:{identity:{accountId:'fixture',workspaceId:'1'},teamLists:[]}}));
 await page.route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.privateFixture={state,openTab,saveWorkspace,closeTabSet,visibleFollowScope,followPresentation,get ready(){return workspaceReady&&!workspaceRestoring;}};'});});
 await page.reload();await until(()=>page.evaluate(()=>privateFixture?.ready),'renderer ready');
}
async function closeApp(){if(!app)return;const current=app;app=null;const timeout=setTimeout(()=>current.process().kill('SIGKILL'),8000);try{await current.close();}finally{clearTimeout(timeout);}}
function assertNoPrivateFiles(){const visit=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())visit(file);else if(entry.isFile()){const bytes=fs.readFileSync(file);assert.equal(bytes.includes(Buffer.from(marker)),false,'Private marker persisted in '+path.relative(home,file));}}};visit(home);}
try{
 await launch();await native(async main=>{await main.getService().browserProfiles.handle({action:'settings',id:'default',settings:{blockingEnabled:false}});});
 const ordinary=await command({action:'create',url:origin+'/ordinary'});await select(ordinary);
 const blank=await command({action:'create'});await select(blank);
 const sibling=await command({action:'create',url:origin+'/sibling'});await select(sibling);await select(blank);
 const slot=await page.evaluate(id=>privateFixture.state.tabs.findIndex(tab=>tab.id===id),blank.id);
 await page.getByRole('button',{name:'Incognito tab',exact:true}).filter({visible:true}).click();
 const first=await until(async()=>{const values=await command({action:'list'});return values.some(tab=>tab.incognito);},'Incognito tile');
 const one=(await command({action:'list'})).find(tab=>tab.incognito);
 assert.equal(await page.evaluate(id=>privateFixture.state.tabs.findIndex(tab=>tab.id===id),one.id),slot);
 await command({action:'navigate',id:one.id,url:origin+'/'+marker});
 await until(async()=>!(await command({action:'list'})).find(tab=>tab.id===one.id)?.loading,'private navigation');
 const storage=await native(async(main,{id,marker})=>{const b=main.getBrowser(),tab=b.get(id),wc=tab.view.webContents;await wc.executeJavaScript('document.cookie="session='+marker+';path=/";localStorage.setItem("session","'+marker+'");true');return {path:wc.session.storagePath,profile:tab.profileId,cookieStore:b.cookieStores.has(tab.profileId)};},{id:one.id,marker});
 assert.equal(storage.path,null);assert.equal(storage.cookieStore,false);
 const two=await command({action:'duplicate-incognito',id:one.id});await select(two);
 await until(async()=>!(await command({action:'list'})).find(tab=>tab.id===two.id)?.loading,'duplicate loaded');
 const isolated=await native(async(main,ids)=>Promise.all(ids.map(id=>main.getBrowser().get(id).view.webContents.executeJavaScript('({cookie:document.cookie,storage:localStorage.getItem("session")})'))),[two.id,ordinary.id]);
 for(const result of isolated){assert.equal(result.cookie,'');assert.equal(result.storage,null);}
 assert.notEqual(two.profileId,one.profileId);assert.equal(two.history.entries.length,1);
 const labels=await native((main,id)=>main.getBrowser().actions.menu(main.getBrowser().get(id),{linkURL:'https://fixture.invalid/target'}).items.map(item=>item.label),one.id);
 assert.equal(labels[labels.indexOf('Open Link in Background Tab')+1],'Open Link in Incognito Tab');
 await page.locator('[data-tab-container="'+two.id+'"]').click({button:'right'});
 const popup=await until(()=>app.windows().find(window=>window.url().endsWith('/browser-page-menu.html')),'native menu');
 await popup.getByRole('menuitem',{name:'Duplicate as Incognito tab',exact:true}).waitFor();
 assert.equal(await popup.getByRole('menuitem',{name:'Mute tab',exact:true}).locator('svg.menu-icon').count(),1);
 await popup.keyboard.press('Escape').catch(error=>{if(!popup.isClosed())throw error;});
 const overview=await command({action:'overview'});assert.equal(overview.tabs.find(tab=>tab.id===one.id).thumbnail,undefined);await command({action:'overview-end'});
 await page.evaluate(()=>privateFixture.saveWorkspace());
 const remote=await native(async main=>({inventory:main.getService().tabInventory(),content:main.getService().contentTabs.list(),live:main.getService().liveBrowser.list('none')}));
 assert.doesNotMatch(JSON.stringify(remote),new RegExp(marker));assert.ok(!JSON.stringify(remote).includes(one.id));
 const resources=await native(async main=>main.getService().resources.list());assert.doesNotMatch(JSON.stringify(resources),new RegExp(marker));
 assert.equal(await page.evaluate(()=>privateFixture.visibleFollowScope()),null);assert.deepEqual(await page.evaluate(id=>privateFixture.followPresentation(privateFixture.state.tabs.find(tab=>tab.id===id)),two.id),{});
 await assert.rejects(command({action:'share',id:one.id,shared:true}),/Incognito/);
 await assert.rejects(command({action:'persist',id:one.id,enabled:true}),/Incognito/);
 await native((main,id)=>{const b=main.getBrowser();global.privateClosedSession=b.sessionFor(b.get(id).profileId);},one.id);
 await page.evaluate(id=>privateFixture.closeTabSet(privateFixture.state.tabs.filter(tab=>tab.id===id)),one.id);
 assert.deepEqual(await native(async()=>global.privateClosedSession.cookies.get({})),[]);
 assert.equal(await native((main,id)=>main.getBrowser().incognito.has(id),storage.profile),false);
 assertNoPrivateFiles();await closeApp();assertNoPrivateFiles();await launch();
 assert.equal((await command({action:'list'})).some(tab=>tab.incognito||tab.url?.includes(marker)),false);
 // A forced process crash must not leave a restorable tab or private browsing payload.
 const crash=await command({action:'create',url:origin+'/'+marker+'-crash',incognito:true});await select(crash);await page.evaluate(()=>privateFixture.saveWorkspace());
 app.process().kill('SIGKILL');await new Promise(resolve=>app.process().once('exit',resolve));app=null;assertNoPrivateFiles();
 await launch();assert.equal((await command({action:'list'})).some(tab=>tab.incognito||tab.url?.includes(marker)),false);assertNoPrivateFiles();assert.deepEqual(errors,[]);
 console.log('PASS Incognito: selector slot; per-tab cookie/localStorage isolation; duplicate/link menu ordering; mute icon; no thumbnails, durable markers or remote inventory; close clears cookies; clean exit and crash never restore private tabs.');
}finally{await closeApp();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
