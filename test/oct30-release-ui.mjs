// Disposable Electron owner, two real windows and synthetic local conversations.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture();let app;const errors=[];
const until=async(fn,label)=>{for(let n=0;n<200;n++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
const native=(fn,value)=>app.evaluate(({app},{code,value})=>new Function('main','value','return ('+code+')(main,value)')(process.mainModule.require(app.getAppPath()+'/desktop/main.cjs'),value),{code:fn.toString(),value});
const session=page=>page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
async function launch(){
 app=await electron.launch({...(process.env.PROTEUS_PREVIEW_EXECUTABLE?{executablePath:process.env.PROTEUS_PREVIEW_EXECUTABLE,args:['--use-mock-keychain']}:{args:['.','--use-mock-keychain']}),env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,CODEX_HOME:fixture.auth,PORT:'0'}});
 await app.context().route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.oct30Fixture={state,contentTabSync,get ready(){return workspaceReady;}};'});});
 const page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.reload();await page.waitForFunction(()=>window.oct30Fixture?.ready);page.setDefaultTimeout(20000);return page;
}
async function project(page){const expand=page.locator('[data-preview-workspace-expand="'+fixture.studio.id+'"]');await expand.waitFor();if(await expand.getAttribute('aria-expanded')!=='true')await expand.click();await page.locator('[data-preview-project="'+fixture.project.id+'"]').first().click();}
const colors=async page=>{await page.locator('[data-page="engine"]').click();await page.locator('[data-engine-section="palette"]').click();await page.locator('#palette-preset').waitFor();};
const scope={scope:'project',id:fixture.project.id};
const owner=()=>native((main,scope)=>main.getService().contentTabs.getAsync(scope.scope,scope.id),scope);
const ids=async page=>(await session(page)).tabs.filter(tab=>tab.parentId===fixture.parentId).map(tab=>tab.contentTabId||tab.info?.contentTabId||(['run','remote-run'].includes(tab.type)?'chat:'+(tab.runId||tab.id):tab.id));
try{
 const first=await launch();await colors(first);await first.locator('#palette-preset').selectOption('daylight');
 assert.equal(await first.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--bg').trim()),'#ffffff');assert.equal(await first.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light');
 await first.locator('#palette-save').click();await first.getByText('Palette saved',{exact:true}).waitFor();
 assert.equal(JSON.parse(fs.readFileSync(path.join(fixture.locations.home,'settings.json'))).appearance.palette.themeId,'daylight');
 await native(main=>main.createWindow());let second;await until(()=>{second=app.windows().find(page=>page!==first&&page.url()===first.url());return second;},'second application window');second.setDefaultTimeout(20000);second.on('pageerror',error=>errors.push(error.message));await second.locator('#topbar-home').waitFor();
 await until(()=>second.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--bg').trim()==='#ffffff'),'Daylight reaches sibling window');
 await project(first);await project(second);
 const news=await first.evaluate(value=>window.desktop.browser({action:'create',...value}),{url:fixture.origin+'/news',parentId:fixture.parentId,unloaded:true});
 await until(async()=>(await owner()).tabs.some(tab=>tab.id===news.id),'new browser registered');
 await until(async()=>(await ids(first)).includes(news.id)&&(await ids(second)).includes(news.id),'both windows show news');
 await until(async()=>(await owner()).tabs.find(tab=>tab.id===news.id)?.history?.currentEntryId,'owner history seed');
 const descriptor=(await owner()).tabs.find(tab=>tab.id===news.id);
 const pending={action:'browser-redirect',tabId:news.id,entryId:descriptor.history.currentEntryId,url:fixture.origin+'/pending-news',title:'Pending news',operationId:crypto.randomUUID(),baseRevision:descriptor.history.revision+999};
 await first.evaluate(async({scope,pending})=>{const id=window.desktop.windowId,prefix=id==='main'?'':'window:'+id+':',key=JSON.stringify(['',scope.scope,scope.id]);window.oct30Fixture.contentTabSync.forget(scope);localStorage.setItem(prefix+'proteus.navigation.pending:'+key,JSON.stringify([pending]));await window.oct30Fixture.contentTabSync.sync(scope);},{scope,pending});
 assert.equal(await first.evaluate(scope=>window.oct30Fixture.contentTabSync.hasConflict(scope),scope),true,'real owner rejects the stale navigation receipt');
 await second.evaluate(async logical=>{const saved=await window.desktop.workspaceSession({action:'get'}),tab=saved.tabs.find(tab=>(tab.contentTabId||tab.id)===logical);if(!tab)throw Error('Missing sibling view');await window.desktop.browser({action:'close',id:tab.browserId||tab.id});},news.id);
 await until(async()=>!(await owner()).tabs.some(tab=>tab.id===news.id),'sibling Close committed');
 await until(async()=>!(await ids(first)).includes(news.id)&&!(await ids(second)).includes(news.id),'conflicted window adopts shared Close');
 const canonical=(await owner()).tabs.map(tab=>tab.id);assert.deepEqual([...new Set(await ids(first))],canonical);assert.deepEqual([...new Set(await ids(second))],canonical);
 const waiting=await native(async main=>{const service=main.getService();service.engine.providers.rehearsal={run:async({ask,emit})=>{const answer=await ask({type:'question',question:'Synthetic release attention question'});emit('assistant',answer);}};const run=service.engine.createRun(await service.buildChatSchedule({provider:'rehearsal',model:'',prompt:'Synthetic attention'}),'chat');return run.id;});
 await until(()=>native((main,id)=>main.getService().engine.getRun(id).pending?.type==='question',waiting),'real disposable provider question');
 const requestId=await native((main,id)=>main.getService().engine.getRun(id).pending.id,waiting);
 await first.locator('[data-page="attention"]').click();await first.locator('#attention-clear-all').click();
 await until(()=>native((main,id)=>!!main.getService().engine.getRun(id).attentionAcknowledged,waiting),'bulk acknowledgement persisted');
 assert.equal(await native((main,id)=>main.getService().engine.getRun(id).pending.id,waiting),requestId,'Clear all never answers the real question');
 assert.equal((await native(main=>main.getService().attentionStore.snapshot())).chats.length,0);
 await native(async(main,{id,requestId})=>{main.getService().engine.reply(id,'Synthetic answer',requestId);},{id:waiting,requestId});
 await until(()=>native((main,id)=>main.getService().engine.getRun(id).status==='completed',waiting),'first question settled normally');
 await native(async(main,id)=>main.getService().engine.send(id,'Synthetic second question','queue',crypto.randomUUID()),waiting);
 await until(()=>native((main,id)=>main.getService().attentionStore.snapshot().chats.some(row=>row.id===id),waiting),'a new question creates new attention');
 assert.equal(await native(main=>main.getService().activity.add('chat.completed',{chatId:'synthetic',chatTitle:'Routine completion'}).silent),true,'routine completion is quiet by default');
 await first.screenshot({path:path.join(process.env.PROTEUS_TEST_EVIDENCE||fixture.temporary,'oct30-attention.png')});
 await app.close();app=null;const restarted=await launch();await colors(restarted);assert.equal(await restarted.locator('#palette-preset').inputValue(),'daylight');assert.equal(await restarted.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--bg').trim()),'#ffffff');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,synthetic:true,daylightActualUI:true,lightNativeControls:true,twoWindowTheme:true,restartPersistence:true,ownerNavigationConflictReproduced:true,sharedCloseDuringReview:true,canonicalOrderAndMembership:true,bulkClearLeavesQuestionPending:true,newQuestionReappears:true,quietCompletions:true}));
}finally{if(app){const timer=setTimeout(()=>app.process().kill('SIGKILL'),15000);try{await app.close();}finally{clearTimeout(timer);}}await fixture.cleanup();}
