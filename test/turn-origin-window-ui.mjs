// Actual Electron windows, synthetic chat/provider and loopback pages only.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture(),errors=[],submissions=[];let app;
const until=async(fn,label)=>{for(let index=0;index<200;index++){const result=await fn();if(result)return result;await new Promise(resolve=>setTimeout(resolve,75));}throw Error('Timed out: '+label);};
const native=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
const session=page=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
const ready=async page=>{page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));page.on('response',async response=>{if(/\/api\/runs\/[^/]+\/send$/.test(new URL(response.url()).pathname)){const body=await response.json().catch(()=>({}));submissions.push({status:response.status(),error:body.error,origin:response.request().postDataJSON()?.inputOrigin});}});await page.locator('#topbar-home').waitFor();return page;};
async function selectChat(page){
 const expand=page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]');await expand.waitFor();if(await expand.getAttribute('aria-expanded')!=='true')await expand.click();
 await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();
 const tab=await until(async()=>(await session(page)).tabs.find(tab=>tab.parentId===fixture.parentId&&(tab.runId||tab.id)===fixture.user[0].id),'owner chat membership arrives in this window');
 await page.locator('[data-chat-subtab="'+tab.id+'"]').click();await page.locator('#followup').waitFor();
 await page.waitForFunction(()=>typeof document.querySelector('#continue')?.onclick==='function');
 assert.equal(await page.locator('#sidebar [data-preview-item]').count(),0,'Project tabs are absent from the desktop sidebar');
}
try{
 app=await electron.launch({args:['.','--use-mock-keychain'],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 const fixtureHome=await until(()=>native(main=>main.getService()?.home),'exact isolated owner initialized');
 assert.equal(fixtureHome,fixture.locations.home,'The fixture must use its exact isolated owner before any mutation');
 const first=await ready(await app.firstWindow()),firstID=await first.evaluate(()=>window.desktop.windowId),runId=fixture.user[0].id;
 await native((main,id)=>{const service=main.getService(),run=service.engine.getRun(id);run.schedule.provider='rehearsal';run.schedule.model='';run.nextModelOptions={model:''};service.engine.providers.rehearsal={run:async({emit})=>emit('assistant','Synthetic origin accepted.')};service.engine.persist(run);service.notify();},runId);
 const opened=app.waitForEvent('window');await native(main=>main.createWindow());const second=await ready(await opened),secondID=await second.evaluate(()=>window.desktop.windowId);
 for(const [page,id] of [[first,firstID],[second,secondID]]){
  await native((main,id)=>{const window=main.getWindows().contexts.get(id).window;window.show();window.focus();},id);await page.bringToFront();await selectChat(page);await page.locator('#followup').fill('Synthetic submission from '+id);await page.locator('#continue').click();
  await until(()=>native((main,{runId,id})=>{const run=main.getService().engine.getRun(runId);return run.status==='completed'&&run.turnOrigin?.windowId===id;},{runId,id}),'origin captured by the submitting renderer');
  const rows=await native((main,runId)=>main.getBrowser().agent({action:'list'},runId),runId);assert.ok(rows.length);assert.ok(rows.every(row=>row.windowId===id));
 }
 // Focus changes cannot redirect an agent open; each project mirror remains lazy.
 await native(main=>[...main.getWindows().contexts.values()][0].window.focus());
 const created=await native((main,{runId,url})=>main.getBrowser().agent({action:'open',url,title:'Origin-owned page'},runId),{runId,url:fixture.origin+'/origin-owned'});
 assert.equal(created.windowId,secondID);
 const mirror=await until(async()=>(await session(first)).tabs.find(tab=>tab.parentId===fixture.parentId&&tab.type==='browser'&&(tab.contentTabId||tab.id)===created.id),'origin-owned tab mirrors into the other project window');
 assert.equal(await native((main,id)=>!!main.getBrowser().get(id).view,mirror.id),false);
 const snapshot=await native((main,{runId,tabId})=>main.getBrowser().agent({action:'snapshot',tabId},runId),{runId,tabId:mirror.id});
 assert.equal(snapshot.windowId,secondID);assert.equal(await native((main,id)=>!!main.getBrowser().get(id).view,mirror.id),false,'An agent must not load a different window’s mirror');
 const override=await native((main,{runId,windowId})=>main.getBrowser().agent({action:'list',windowId},runId),{runId,windowId:firstID});assert.ok(override.every(row=>row.windowId===firstID));
 await native((main,id)=>main.getWindows().contexts.get(id).window.close(),secondID);
 await until(()=>native((main,id)=>!main.getWindows().contexts.has(id),secondID),'origin window closed');
 const fallback=await native((main,runId)=>main.getBrowser().agent({action:'list'},runId),runId);assert.ok(fallback.every(row=>row.windowId===firstID));assert.match(fallback[0].windowNote,/closed/);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,actualSubmittingWindows:true,focusIndependent:true,otherMirrorUnloaded:true,explicitWindow:true,closedOriginFallback:true,sidebarProjectResourcesAbsent:true}));
}catch(error){
 if(app)console.error(JSON.stringify({owner:await native((main,id)=>{const run=main.getService()?.engine.getRun(id);return {status:run?.status,origin:run?.turnOrigin,provider:run?.schedule?.provider,events:run?.events.slice(-3).map(event=>({role:event.role,text:event.text?.slice(0,250)}))};},fixture.user[0].id),errors,submissions,notices:await Promise.all(app.windows().map(page=>page.locator('[role="alert"],.toast').allTextContents().catch(()=>[])))}));
 throw error;
}finally{await app?.close().catch(()=>{});await fixture.cleanup();}
