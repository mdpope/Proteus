// Disposable synthetic profiles only; never connects a model or a live app home.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;
const errors=[];
const until=async(fn,label)=>{for(let n=0;n<150;n++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
const main=(fn,value)=>app.evaluate(async({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
const ready=async page=>{page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor();return page;};
const launch=async()=>{app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});await ready(await app.firstWindow());};
const pages=()=>app.windows().filter(page=>{try{return new URL(page.url()).pathname==='/'&&page.url().startsWith('http');}catch{return false;}});
const command=(page,value)=>page.evaluate(value=>window.desktop.browser(value),value);
try{
 await launch();const first=app.windows()[0];
 const created=app.waitForEvent('window');await main(main=>main.createWindow());const second=await ready(await created);
 const ids=await Promise.all([first,second].map(page=>page.evaluate(()=>window.desktop.windowId)));
 assert.equal(ids[0],'main');assert.notEqual(ids[0],ids[1]);
 const a=await command(first,{action:'create',url:fixture.origin+'/window-a'}),b=await command(second,{action:'create',url:fixture.origin+'/window-b'});
 assert.deepEqual((await command(first,{action:'list'})).map(tab=>tab.id).filter(id=>id===b.id),[]);
 assert.equal((await command(second,{action:'list'})).some(tab=>tab.id===a.id),false);
 await assert.rejects(command(second,{action:'close',id:a.id}),/window/);
 await main((main,ids)=>{const registry=main.getWindows();registry.contexts.get(ids[0]).window.setBounds({x:110,y:140,width:1050,height:720});registry.contexts.get(ids[1]).window.setBounds({x:220,y:180,width:1000,height:740});},ids);
 // Distinct main scopes and reading positions cannot overwrite a sibling.
 for(const [index,page]of [first,second].entries())await page.evaluate(async index=>{await window.desktop.viewPositions({action:'set',key:'document:shared',position:[['root',{top:100+index,left:0}]]});const saved=await window.desktop.workspaceSession({action:'get'});await window.desktop.workspaceSession({action:'save',session:{...saved,page:index?'context':'engine'}});},index);
 const before=await main(main=>[...main.getWindows().contexts.values()].map(ctx=>({id:ctx.id,bounds:ctx.window.getNormalBounds()})));
 await app.close();app=null;await launch();
 await until(()=>pages().length===2,'both windows restored');
 for(const page of pages())await ready(page);
 const restored=await main(main=>[...main.getWindows().contexts.values()].map(ctx=>({id:ctx.id,bounds:ctx.window.getNormalBounds()})));
 assert.deepEqual(restored,before);
 for(const page of pages()){const id=await page.evaluate(()=>window.desktop.windowId),index=ids.indexOf(id);const rows=await page.evaluate(()=>window.desktop.viewPositions({action:'get'}));assert.equal(rows.find(([key])=>key==='document:shared')[1][0][1].top,100+index);}
 await main((main,id)=>main.getWindows().contexts.get(id).window.close(),ids[1]);
 await until(()=>main(main=>main.getWindows().contexts.size===1),'one window explicitly closed');
 assert.equal((await command(pages()[0],{action:'list'})).some(tab=>tab.url===fixture.origin+'/window-a'),true);
 await app.close();app=null;await launch();
 assert.equal(pages().length,1);assert.equal(await pages()[0].evaluate(()=>window.desktop.windowId),'main');
 assert.deepEqual(errors,[]);
 const saved=JSON.parse(fs.readFileSync(path.join(fixture.locations.home,'desktop-windows.json'),'utf8'));assert.deepEqual(saved.windows.map(row=>row.id),['main']);
 console.log('PASS synthetic two-window IPC, browser isolation, independent reading positions, Quit geometry restoration and explicit Close persistence');
}catch(error){console.error(error);throw error;}finally{await app?.close();await fixture.cleanup();}
