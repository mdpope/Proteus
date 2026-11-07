// Disposable Linux-capable Electron acceptance: stale window descriptors must
// not erase document origin on startup, reload, or a second application launch.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
import {ContentTabs} from '../src/services/workspaces/content-tabs.js';
import {captureNavigation,verifyNavigation} from '../src/services/updates/navigation-preservation.js';

const fixture=await sidebarFixture(),home=fixture.locations.home,file=path.join(home,'desktop-workspace.json');
const session=JSON.parse(fs.readFileSync(file,'utf8')),origin=fixture.user[0].id;
const doc=session.tabs.find(tab=>tab.type==='markdown'),documentId=createHash('sha256').update(origin+'\0'+doc.file).digest('hex'),id='document:'+documentId;
doc.contentTabId=id;
// A second window-local alias must survive alongside the selected view.
session.tabs=session.tabs.filter(tab=>tab.type!=='browser');
session.tabs.push({...doc,id:'synthetic-document-alias'});
session.active='synthetic-document-alias';session.selectedChildren={[fixture.parentId]:session.active};
session.chatDrafts={[origin]:'Unsent synthetic draft'};
fs.writeFileSync(file,JSON.stringify(session));
const registry=new ContentTabs(home),seed=structuredClone(session);
for(const tab of seed.tabs)if(tab.type==='markdown')tab.associationChatId=origin;
registry.seedWorkspace(seed);registry.rememberSources(seed);
const initial=registry.get('project',fixture.project.id);
const scope=initial.tabs.find(tab=>tab.id===id);assert.equal(scope.chatId,origin);assert.equal(scope.associationChatId,origin);
let app,page;const errors=[];
const until=async(fn,label)=>{for(let i=0;i<150;i++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
const owner=(fn,value)=>app.evaluate(async({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
async function launch(){
 app=await electron.launch({args:['.','--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:home,CODEX_HOME:fixture.auth,PORT:'0'},timeout:60000});
 page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));
 await until(()=>owner(main=>main.getWindows()?.contexts.get('main')?.recovery.startupTimer===null),'window ready');
}
async function close(){if(!app)return;const current=app;app=null;const timer=setTimeout(()=>current.process().kill('SIGKILL'),15000);try{await current.close();}finally{clearTimeout(timer);}}
const saved=()=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
const snapshot=()=>owner(main=>{const service=main.getService();return {content:service.contentTabs.read(),projects:service.workspaceProjects.read(),context:service.context.config()};});
const inventory=(value,session)=>captureNavigation({contentTabs:{read:()=>value.content},workspaceProjects:{read:()=>value.projects},context:{config:()=>value.context},navigationSessions:()=>[{id:'main',session}]});
async function assertRestored(){
 await until(async()=>{const state=await saved(),views=state.tabs.filter(tab=>tab.contentTabId===id);return views.length===2&&views.every(tab=>tab.associationChatId===origin);},'both document aliases saved with original association');
 const state=await saved(),views=state.tabs.filter(tab=>tab.contentTabId===id);
 assert.deepEqual(views.map(tab=>tab.id),[doc.id,'synthetic-document-alias']);
 assert.equal(state.active,session.active);assert.equal(state.selectedChildren[fixture.parentId],session.active);
 const current=await snapshot();assert.deepEqual(current.content.scopes['project:'+fixture.project.id].tabs,initial.tabs,'startup must preserve every project descriptor');
 assert.equal(current.content.scopes['project:'+fixture.project.id].revision,initial.revision);
 assert.equal(await page.locator('#window-restore-notice').count(),0);
 return inventory(current,state);
}
try{
 await launch();const first=await assertRestored();
 // Exercise the actual Reload Window recovery command, not a synthetic serializer.
 await owner(main=>main.getWindows().contexts.get('main').recovery.reload());
 await until(()=>owner(main=>!main.getWindows().contexts.get('main').recovery.restoring),'reload finished');
 verifyNavigation(first,await assertRestored());
 await close();await launch();verifyNavigation(first,await assertRestored());
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,synthetic:true,documentAliases:2,startup:true,reload:true,coldRestart:true,stableProjectRevision:initial.revision,preservationVerified:true}));
}finally{await close();await fixture.cleanup();}
