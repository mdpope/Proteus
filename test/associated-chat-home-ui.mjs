import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const {WorkspaceSession}=createRequire(import.meta.url)('../desktop/windows/workspace-session.cjs'),fixture=await sidebarFixture();let app,page;const errors=[];
const until=async fn=>{for(let i=0;i<200;i++){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Associated chat placement did not settle.');};
const chat=fixture.user[0],alias={id:chat.id,type:'run',label:chat.title},nested={id:'saved-chat-child',type:'markdown',label:'Saved chat child',parentId:alias.id,file:fixture.document};
const store=new WorkspaceSession(fixture.locations.home),saved=store.get();store.save({...saved,tabs:[...saved.tabs,alias,nested],active:alias.id,chatDrafts:{[chat.id]:'Keep this saved draft'}});
const session=()=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
async function launch(){app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor();}
try{
 await launch();let state=await until(async()=>{const value=await session();return value.tabs.some(tab=>tab.id===alias.id&&tab.parentId===fixture.parentId)?value:null;});
 assert.equal(state.tabs.find(tab=>tab.id===nested.id).parentId,alias.id);assert.equal(state.chatDrafts[chat.id],'Keep this saved draft');assert.equal(state.tabs.filter(tab=>tab.type==='run'&&!tab.parentId&&(tab.runId||tab.id)===chat.id).length,0);
 const beforeCount=state.tabs.filter(tab=>tab.type==='run'&&(tab.runId||tab.id)===chat.id).length;
 await page.evaluate(async id=>{const {openIndexedChat}=await import('/features/chats/chats-index.js');await openIndexedChat({local:true,chatId:id});},chat.id);
 await until(async()=>{const value=await session();return value.tabs.find(tab=>tab.id===value.active)?.parentId===fixture.parentId;});
 const linkRead=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/chat-view'&&new URL(response.url()).searchParams.get('id')===chat.id);
 await app.evaluate(({app},id)=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),service=main.getService();main.getWindows().current().window.webContents.send('proteus:open-chat-link','proteus://chat?host='+service.remote.info().hostId+'&id='+id);},chat.id);await linkRead;
 await until(async()=>{const value=await session();return value.tabs.find(tab=>tab.id===value.active)?.parentId===fixture.parentId;});
 // Close the logical chat and reopen it explicitly from the index. Owner
 // hydration may replace its private view ID; the new user selection must win.
 const childIDs=await app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().contentTabs.get('chat',id).tabs.map(tab=>tab.id),chat.id);assert.ok(childIDs.length);
 const projectDocumentIDs=await app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().contentTabs.get('project',id).tabs.filter(tab=>tab.type==='document').map(tab=>tab.id),fixture.project.id);assert.ok(projectDocumentIDs.length);
 let selected=await session();const selectedView=selected.tabs.find(tab=>tab.id===selected.active);
 await page.locator('[data-chat-child-close="'+selectedView.id+'"]').click();
 await until(()=>app.evaluate(({app},id)=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');return !!main.getService().contentTabs.get('project',main.getService().workspaceProjects.membership(main.getService().engine.getRun(id)).projectId).closed?.['chat:'+id];},chat.id));
 await page.evaluate(async id=>{const {openIndexedChat}=await import('/features/chats/chats-index.js');await openIndexedChat({local:true,chatId:id});},chat.id);
 await until(async()=>{const saved=await session(),active=saved.tabs.find(tab=>tab.id===saved.active);return active?.parentId===fixture.parentId&&(active.runId||active.id)===chat.id;});
 state=await session();const reopenedCount=state.tabs.filter(tab=>tab.type==='run'&&(tab.runId||tab.id)===chat.id).length;assert.ok(reopenedCount>=1&&reopenedCount<=beforeCount);
 state=await session();assert.equal(state.tabs.filter(tab=>tab.type==='run'&&(tab.runId||tab.id)===chat.id).length,reopenedCount);assert.equal(state.tabs.filter(tab=>tab.type==='run'&&!tab.parentId&&(tab.runId||tab.id)===chat.id).length,0);
 await app.close();app=null;await launch();state=await session();assert.equal(state.tabs.filter(tab=>tab.type==='run'&&!tab.parentId&&(tab.runId||tab.id)===chat.id).length,0);state=await until(async()=>{const saved=await session();return projectDocumentIDs.every(id=>saved.tabs.some(tab=>tab.contentTabId===id&&tab.parentId===fixture.parentId))&&childIDs.every(id=>saved.tabs.some(tab=>tab.contentTabId===id&&saved.tabs.some(parent=>parent.id===tab.parentId&&(parent.runId||parent.id)===chat.id)))?saved:null;});
 assert.deepEqual(await app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().contentTabs.get('chat',id).tabs.map(tab=>tab.id),chat.id),childIDs);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,legacyAliasRestoredInsideProject:true,globalChatListOpensProject:true,deepLinkOpensProject:true,noNewChatAlias:true,childOriginAndDraftPreserved:true,processRestart:true,explicitReopenSelection:true,sameFileInProjectAndChatPreserved:true}));
}catch(error){
 if(app)console.log(JSON.stringify({synthetic:true,error:error.message,session:await session().then(value=>({active:value.active,tabs:value.tabs.map(tab=>({id:tab.id,type:tab.type,parentId:tab.parentId,runId:tab.runId,contentTabId:tab.contentTabId}))})),childScope:await app.evaluate(({app},id)=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().contentTabs.get('chat',id),chat.id)}));
 await page?.screenshot({path:process.cwd()+'/.runtime-tests/associated-chat-home-failure.png'}).catch(()=>{});throw error;}finally{await app?.close();await fixture.cleanup();}
