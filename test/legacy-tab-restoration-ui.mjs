import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-legacy-nav-'))),file=path.join(home,'fixture.md');
fs.writeFileSync(file,'# Synthetic restored viewer');
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
let app;
const launch=async()=>{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'}});
 const shell=await app.firstWindow();await shell.locator('#topbar-home').waitFor({timeout:60000});return shell;
};
const owner=async(fn,value)=>app.evaluate(async({app},{code,value})=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');return new Function('main','value','return ('+code+')(main,value)')(main,value);},{code:fn.toString(),value});
try{
 await launch();
 const runId=await owner(main=>{const engine=main.getService().engine,run=engine.createRun({...engine.schedules.list()[0],provider:'rehearsal'});run.title='Synthetic restored chat';run.status='completed';run.events=[{role:'system',at:engine.now(),text:'Rehearsal fixture; no external workflow executed.'}];engine.persist(run);return run.id;});
 await app.close();app=null;
 const browser={id:'legacy-browser',type:'browser',title:'Synthetic browser',url:'https://example.invalid/legacy'};
 fs.writeFileSync(path.join(home,'content-tabs.json'),JSON.stringify({schemaVersion:1,scopes:{'main:main':{revision:7,tabs:[browser]}}}));
 fs.writeFileSync(path.join(home,'desktop-workspace.json'),JSON.stringify({schemaVersion:1,active:'overview',page:'home',tabs:[{id:'overview',type:'overview',label:'Home'},{id:runId,type:'run',runId,label:'Synthetic restored chat'},{...browser,label:browser.title},{id:'synthetic-terminal',type:'terminal',label:'Synthetic terminal',terminal:{id:'synthetic-terminal'}},{id:'synthetic-viewer',type:'markdown',label:'Synthetic viewer',file},{id:'synthetic-child',type:'browser',parentId:runId,label:'Synthetic child',url:browser.url}]}));
 let shell=await launch();const errors=[];shell.on('pageerror',error=>errors.push(error.message));
 await shell.locator('#tabs [data-tab]').filter({hasText:'Synthetic restored chat'}).waitFor();
 await shell.locator('#tabs [data-tab]').filter({hasText:'Synthetic terminal'}).waitFor();await shell.locator('#tabs [data-tab]').filter({hasText:'Synthetic viewer'}).waitFor();
 await shell.waitForTimeout(3500);
 const types=await owner(main=>main.getService().contentTabs.get('main','main').tabs.map(tab=>tab.type));assert.deepEqual(types,['chat','browser','terminal','document']);
 assert.ok(await owner((main,id)=>main.getService().contentTabs.get('chat',id).tabs.some(tab=>tab.id==='synthetic-child'),runId));
 const order=await shell.locator('#tabs [data-tab]').allTextContents();assert.match(order[0],/Synthetic restored chat/);assert.match(order[2],/Synthetic terminal/);assert.match(order[3],/Synthetic viewer/);
 await owner((main,id)=>{const tabs=main.getService().contentTabs,row=tabs.get('main','main');return tabs.mutateAsync({scope:'main',id:'main',expectedRevision:row.revision,operations:[{action:'close',id:'chat:'+id}]});},runId);
 await shell.locator('#tabs [data-tab]').filter({hasText:'Synthetic restored chat'}).waitFor({state:'detached'});
 await app.close();app=null;shell=await launch();await shell.waitForTimeout(3500);
 assert.equal(await shell.locator('#tabs [data-tab]').filter({hasText:'Synthetic restored chat'}).count(),0);
 assert.equal(await owner((main,id)=>main.getService().contentTabs.get('main','main').tabs.some(tab=>tab.chatId===id),runId),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,legacyTypesRestored:true,parentAndChildRetained:true,orderRetained:true,intentionalCloseSurvivesRestart:true}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
