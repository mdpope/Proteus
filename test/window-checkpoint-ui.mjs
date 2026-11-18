// Synthetic project data only. Exercise the actual renderer acknowledgement,
// two windows sharing a project, failed synchronization, and graceful restart.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const f=await sidebarFixture(),second=randomUUID(),ids=['main',second];let app;
const first=JSON.parse(fs.readFileSync(path.join(f.locations.home,'desktop-workspace.json'),'utf8'));
first.tabs=first.tabs.filter(tab=>['overview','workspace'].includes(tab.type)||tab.id===f.parentId+':chat:'+f.user[0].id);
first.active=f.parentId+':chat:'+f.user[0].id;first.selectedChildren={[f.parentId]:first.active};first.chatDrafts={[first.active]:'Synthetic draft'};
fs.writeFileSync(path.join(f.locations.home,'desktop-workspace.json'),JSON.stringify(first));
fs.mkdirSync(path.join(f.locations.home,'window-sessions'),{recursive:true});
fs.writeFileSync(path.join(f.locations.home,'window-sessions',second+'.json'),JSON.stringify({...first,windowId:second,chatDrafts:{[first.active]:'Second synthetic draft'}}));
fs.writeFileSync(path.join(f.locations.home,'desktop-windows.json'),JSON.stringify({schemaVersion:1,windows:ids.map(id=>({id}))}));
const host=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
const until=async(fn,label)=>{for(let i=0;i<400;i++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
const launch=async()=>{app=await electron.launch({args:['.','--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:f.locations.root,CODEX_HOME:f.auth,PORT:'0'}});await until(()=>host((main,ids)=>ids.every(id=>{const ctx=main.getWindows()?.contexts.get(id);return ctx?.recovery?.startupTimer===null&&ctx.externalURLReady===true&&!ctx.window.webContents.isLoading();}),ids),'restored windows');};
const close=async()=>{const timer=setTimeout(()=>app.process().kill('SIGKILL'),15000);try{await app.close();}finally{clearTimeout(timer);app=null;}};
const checkpoint=()=>host(async main=>{try{await main.getService().prepareUpdateCheckpoint();return {saved:true};}catch(error){return {error:error.message};}});
const windows=()=>host(main=>[...main.getWindows().contexts].map(([id,ctx])=>{const s=ctx.session.get();return {id,tabs:s.tabs.map(t=>[t.contentTabId||t.id,t.parentId||null,!!t.hidden,!!t.navigationClosed]),active:s.active,selectedChildren:s.selectedChildren,drafts:s.chatDrafts};}));
try{
 await launch();
 // No change notification: the checkpoint itself must perform a fresh read.
 await host((main,{project,chats})=>{const tabs=main.getService().contentTabs,scope={scope:'project',id:project},current=tabs.get(scope.scope,scope.id);tabs.mutate({...scope,expectedRevision:current.revision,operations:chats.map(chat=>({action:'open',tab:{id:'chat:'+chat.id,type:'chat',chatId:chat.id,title:chat.title}}))});},{project:f.project.id,chats:f.user.slice(1,3)});
 assert.deepEqual(await checkpoint(),{saved:true});
 const expected=await windows();for(const w of expected){for(const chat of f.user.slice(1,3))assert.ok(w.tabs.some(t=>t[0]==='chat:'+chat.id));assert.equal(w.active,first.active);assert.equal(w.selectedChildren[f.parentId],first.active);}
 for(let i=0;i<2;i++){await close();await launch();assert.deepEqual(await checkpoint(),{saved:true});assert.deepEqual(await windows(),expected);}
 // Background sync absorbs this failure; an update checkpoint must reject it.
 await host((main,project)=>{const tabs=main.getService().contentTabs,original=tabs.getAsync;tabs.getAsync=function(scope,id,...rest){if(scope==='project'&&id===project)throw Error('Injected checkpoint read failure');return original.call(this,scope,id,...rest);};globalThis.restoreCheckpointRead=()=>{tabs.getAsync=original;};},f.project.id);
 const failed=await checkpoint();assert.ok(failed.error,JSON.stringify(failed));assert.deepEqual(await windows(),expected);
 await app.evaluate(()=>globalThis.restoreCheckpointRead());await new Promise(resolve=>setTimeout(resolve,1300));assert.deepEqual(await checkpoint(),{saved:true});assert.deepEqual(await windows(),expected);
 console.log('window-checkpoint-ui: two-window hydration, exact restarts, drafts and failure acknowledgement passed');
}finally{if(app)await close();await f.cleanup();}
