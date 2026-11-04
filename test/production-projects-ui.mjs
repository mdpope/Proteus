// Production bootstrap against synthetic legacy data, with a separate browser profile.
// No real chats, credentials, browser profiles or application data are copied.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
import {ContentTabs} from '../src/services/workspaces/content-tabs.js';
const fixture=await sidebarFixture(),home=fixture.locations.home,errors=[];
let app,page,peerUpgraded=false;
const originalRuns=new Map();
for(const file of fs.readdirSync(path.join(home,'runs'))){
 const location=path.join(home,'runs',file),run=JSON.parse(fs.readFileSync(location));delete run.projectId;delete run.projectName;
 fs.writeFileSync(location,JSON.stringify(run));originalRuns.set(file,fs.readFileSync(location,'utf8'));
}
// Simulate the previous production layout: projects did not yet exist.
fs.unlinkSync(path.join(home,'desktop-preview.json'));fs.unlinkSync(path.join(home,'preview-projects.json'));
const source=JSON.parse(fs.readFileSync(path.join(home,'desktop-workspace.json')));
source.tabs=source.tabs.filter(tab=>!tab.projectId).map(tab=>({...tab,...(tab.parentId===fixture.parentId?{parentId:fixture.workspaceId}:{})}));
source.tabs.splice(2,0,{id:'older-workspace-chat-view',type:'run',runId:fixture.user[10].id,parentId:fixture.workspaceId,label:'Synthetic older chat ordered first'});
for(let index=0;index<105;index++)source.tabs.push({id:'legacy-resource-'+index,type:'browser',parentId:fixture.workspaceId,label:'Synthetic legacy resource '+index,url:fixture.origin+'/legacy-'+index,unloaded:true,openedAt:'2026-10-01T12:00:00.000Z'});
// Existing main descriptors and their child scopes reproduce the failed live shape.
for(let index=1;index<=9;index++)source.tabs.push({id:fixture.user[index].id,type:'run',label:'Synthetic main chat '+index});
for(let index=0;index<13;index++)source.tabs.push({id:'main-browser-'+index,type:'browser',parentId:fixture.user[1+index%9].id,label:'Synthetic main browser '+index,url:fixture.origin+'/main-'+index,unloaded:true});
source.tabs.push({id:'unavailable-chat',type:'run',label:'Temporarily unavailable chat'},{id:'unavailable-child',type:'browser',parentId:'unavailable-chat',label:'Saved child',url:fixture.origin+'/unavailable',unloaded:true});
const peerHost='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',peerParent='workspace:'+peerHost+':peer-workspace';
source.tabs.push({id:peerParent,type:'workspace',hostId:peerHost,workspaceId:'peer-workspace',label:'Synthetic peer'});
for(let index=0;index<3;index++)source.tabs.push({id:peerParent+':chat:peer-'+index,type:'remote-run',hostId:peerHost,runId:'peer-'+index,parentId:peerParent,label:'Saved peer alias '+index},{id:'peer-child-'+index,type:'browser',parentId:peerParent+':chat:peer-'+index,label:'Peer alias child',url:'https://example.test/peer-'+index,unloaded:true});
source.tabs.push({id:'peer-browser-alias-a',contentTabId:'peer-shared-browser',type:'browser',parentId:peerParent,label:'Peer browser alias',url:fixture.origin+'/peer-shared',unloaded:true},{id:'peer-browser-alias-b',contentTabId:'peer-shared-browser',type:'browser',parentId:peerParent,label:'Peer browser alias',url:fixture.origin+'/peer-shared',unloaded:true});
const registry=new ContentTabs(home);registry.seedWorkspace(source);const prior=registry.read();for(const row of Object.values(prior.scopes))row.revision+=20;registry.write(prior);
source.selectedChildren={[fixture.workspaceId]:'older-workspace-chat-view'};
source.chatDrafts={[fixture.user[0].id]:'Synthetic retained draft','unavailable-chat':'Retain unknown draft'};source.active='overview';
fs.writeFileSync(path.join(home,'desktop-workspace.json'),JSON.stringify(source));
const beforeIds=source.tabs.map(tab=>tab.id),findLegacy=(saved,id)=>{const original=source.tabs.find(tab=>tab.id===id);return saved.tabs.find(tab=>tab.id===id||tab.type==='browser'&&tab.contentTabId===(original?.contentTabId||id));},api=(route,args)=>page.evaluate(async({route,args})=>{const response=await fetch(route,args?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)}:undefined);const value=await response.json();if(!response.ok)throw Error(value.error||response.status);return value;},{route,args});
const until=async(check,label)=>{const deadline=Date.now()+20000;while(Date.now()<deadline){if(await check())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
async function launch(){
 app=await electron.launch({...(process.env.PROTEUS_PRODUCTION_EXECUTABLE?{executablePath:process.env.PROTEUS_PRODUCTION_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_PRODUCTION_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(fixture.temporary,'production-electron')],env:{...process.env,PROTEUS_HOME:home,PROTEUS_DESKTOP_PREVIEW:'0',CODEX_HOME:fixture.auth,COPILOT_HOME:path.join(fixture.temporary,'copilot'),PORT:'0'},timeout:60000});
 app.process().stderr?.on('data',chunk=>process.stderr.write(chunk));page=await app.firstWindow();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));await page.locator('[data-preview-workspace]').first().waitFor();
 await app.evaluate(({app},{hostId,upgraded})=>{const peers=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getDesktopPeers(),original=peers.handle.bind(peers);peers.syntheticMutations=0;peers.syntheticProjects=upgraded?{revision:'synthetic-projects',projects:[{id:'peer-project',workspaceId:'peer-workspace',name:'General'}],defaultProjectIds:{'peer-workspace':'peer-project'},memberships:Object.fromEntries([0,1,2].map(index=>['peer-'+index,{workspaceId:'peer-workspace',projectId:'peer-project'}]))}:null;const scopeRows=new Map();peers.handle=async value=>{if(value.action==='list')return [{hostId,label:'Synthetic legacy owner',online:true}];if(value.hostId!==hostId)return original(value);if(value.method==='tabs.get'||value.method==='tabs.mutate'){const key=value.args.scope+':'+value.args.id,row=scopeRows.get(key)||{revision:19,tabs:value.args.scope==='workspace'?[{id:'peer-shared-browser',type:'browser',title:'Peer browser alias',url:''}]:value.args.scope==='project'?[0,1,2].map(index=>({id:'chat:peer-'+index,type:'chat',chatId:'peer-'+index,title:'Saved peer alias '+index})):[]};if(value.method==='tabs.mutate'){for(const op of value.args.operations){if(op.tab?.type==='chat'||op.id?.startsWith('chat:')||op.ids?.some(id=>id.startsWith('chat:')))peers.syntheticMutations++;if(op.action==='open'){row.tabs=row.tabs.filter(tab=>tab.id!==op.tab.id);row.tabs.push(op.tab);}if(op.action==='reorder'){if(new Set(op.ids).size!==op.ids.length)throw Error('Duplicate descriptor order');row.tabs=op.ids.map(id=>row.tabs.find(tab=>tab.id===id));}}row.revision++;}scopeRows.set(key,row);return row;}if(value.method==='context.get')return {workspaces:[{id:'peer-workspace',name:'Synthetic peer'}]};if(value.method==='projects.get')return peers.syntheticProjects;if(value.method==='sync')return {state:{capabilities:peers.syntheticProjects?['projects.v1']:[],workspaceProjects:peers.syntheticProjects,runs:[]}};if(value.method==='runs.list')return [];throw Error('Synthetic owner unavailable');};peers.request=(hostId,method,args)=>peers.handle({action:'request',hostId,method,args});},{hostId:peerHost,upgraded:peerUpgraded});
 await page.route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('windowRestore.start().then(','window.migrationReady=windowRestore.start().then(')+'\nwindow.migrationFixture={contentTabSync,saveWorkspace,state};\n'});});
 // A restart already has contentTabId values on disk before restoration begins.
 // Wait for saved IDs to match this process's native tabs, rather than reloading
 // the renderer halfway through remapping the prior process's browser IDs.
 await until(async()=>page.evaluate(async expected=>{const saved=await window.desktop.workspaceSession({action:'get'}),live=await window.desktop.browser({action:'list'}),tabs=saved.tabs.filter(tab=>tab.type==='browser'),ids=new Set(live.map(tab=>tab.id));return tabs.length>=expected&&tabs.length===live.length&&tabs.every(tab=>tab.contentTabId&&ids.has(tab.id));},source.tabs.filter(tab=>tab.type==='browser').length),'first restoration settles before test reload');
 await page.reload();await page.evaluate(()=>window.migrationReady);await page.evaluate(async()=>{await window.migrationFixture.contentTabSync.all();await window.migrationFixture.saveWorkspace();});
 assert.equal(await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getDesktopPeers().syntheticMutations),0,'Legacy aliases do not reopen owner views');
}
async function close(){if(!app)return;const owned=app.process(),timer=setTimeout(()=>owned.kill('SIGKILL'),10000);try{await app.close();}finally{clearTimeout(timer);app=null;}}
try{
 await launch();const state=await api('/api/state');assert.ok(state.workspaceProjects?.enabled);assert.ok(!state.desktopPreview?.enabled);assert.equal(await page.locator('#topbar-home strong').innerText(),'Proteus');
 assert.equal(fs.existsSync(path.join(home,'desktop-preview.json')),false);assert.equal(fs.existsSync(path.join(home,'projects.json')),true);
 let saved=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 for(const id of beforeIds)assert.ok(findLegacy(saved,id),'Preserved '+id);
 await until(async()=>{const value=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));return value.tabs.filter(tab=>tab.type==='browser'&&tab.contentTabId).length>=source.tabs.filter(tab=>tab.type==='browser').length;},'restored browser views saved with stable logical IDs');
 saved=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 const viewKey=tab=>tab.type==='browser'?'browser:'+(tab.contentTabId||tab.id):tab.type+':'+tab.id;
 assert.deepEqual(saved.tabs.filter(tab=>tab.type==='browser'||beforeIds.includes(tab.id)).map(viewKey),source.tabs.map(viewKey),'Entire legacy view order survives migration, including older chats before newer chats');
 assert.equal(saved.chatDrafts[fixture.user[0].id],'Synthetic retained draft');
 assert.equal(saved.tabs.filter(tab=>tab.contentTabId==='peer-shared-browser').length,2,'Distinct native aliases retain one logical descriptor');
 const defaultId=state.workspaceProjects.defaultProjectIds[fixture.studio.id];assert.ok(defaultId);
 assert.equal(saved.selectedChildren[fixture.workspaceId],'project:local:'+defaultId,'Workspace retains remembered project selection');
 assert.equal(saved.selectedChildren['project:local:'+defaultId],'older-workspace-chat-view','Inactive project retains original selected chat');
 const chat=saved.tabs.find(tab=>tab.runId===fixture.user[0].id);assert.equal(chat.parentId,'project:local:'+defaultId);
 assert.equal(findLegacy(saved,'legacy-resource-104').parentId,fixture.workspaceId,'Direct workspace resource remains direct');
 await page.locator(`[data-preview-workspace="${fixture.studio.id}"]`).click();await page.locator('[data-preview-project-row]').first().waitFor();
 await page.locator('[data-preview-new-project]').click();await page.locator('#preview-project-name').fill('Production migration review');await page.locator('#dialog-submit').click();
 const changed=await api('/api/state'),created=changed.workspaceProjects.projects.find(project=>project.name==='Production migration review');assert.ok(created);
 await page.locator(`[data-preview-workspace="${fixture.studio.id}"]`).click();await page.locator(`[data-preview-default="${created.id}"]`).click();
 await until(async()=>(await api('/api/state')).workspaceProjects.defaultProjectIds[fixture.studio.id]===created.id,'changed project default');
 await page.locator(`[data-preview-delete-project="${defaultId}"]`).click();await page.locator('#dialog-submit').click();
 await until(async()=>!(await api('/api/state')).workspaceProjects.projects.some(project=>project.id===defaultId),'delete old default');
 await page.locator('[data-preview-page=tabs]').click();assert.equal(await page.locator('.workspace-tab-reorder').count(),0);
 const resourceRow=page.locator('[data-managed-tab]').filter({has:page.getByRole('button',{name:'Synthetic legacy resource 104',exact:true})});
 await resourceRow.locator('[data-action=move]').click();await page.locator('#tab-destination').selectOption('project:local:'+created.id);await page.locator('#dialog-submit').click();
 await until(async()=>findLegacy(await page.evaluate(()=>window.desktop.workspaceSession({action:'get'})),'legacy-resource-104')?.parentId==='project:local:'+created.id,'resource after former 100-item limit moves to project');
 source.tabs.find(tab=>tab.id==='legacy-resource-104').parentId='project:local:'+created.id;

 await page.locator('[data-page=engine]').click();await page.locator('[data-engine-section=source-library]').click();await page.locator('[data-preview-source-add]').waitFor();
 await page.locator('[data-engine-section=setup]').click();await page.getByText('Open data folder',{exact:false}).first().waitFor();
 // Simulate the old peer gaining projects while the local renderer stays open.
 peerUpgraded=true;
 await app.evaluate(({app})=>{const peers=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getDesktopPeers();peers.syntheticProjects={revision:'synthetic-projects',projects:[{id:'peer-project',workspaceId:'peer-workspace',name:'General'}],defaultProjectIds:{'peer-workspace':'peer-project'},memberships:Object.fromEntries([0,1,2].map(index=>['peer-'+index,{workspaceId:'peer-workspace',projectId:'peer-project'}]))};});
 await page.evaluate(async()=>{await window.migrationFixture.contentTabSync.all();await window.migrationFixture.contentTabSync.all();await window.migrationFixture.saveWorkspace();});
 saved=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 for(let index=0;index<3;index++){const view=saved.tabs.find(tab=>tab.id===peerParent+':chat:peer-'+index);assert.equal(view.parentId,'project:'+peerHost+':peer-project');assert.equal(findLegacy(saved,'peer-child-'+index).parentId,view.id);}
 assert.equal(await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getDesktopPeers().syntheticMutations),0,'Peer upgrade does not reopen or close owner chat views');
 const beforeRestartOrder=saved.tabs.map(viewKey);
 await close();await launch();const restarted=await api('/api/state');assert.equal(restarted.workspaceProjects.defaultProjectIds[fixture.studio.id],created.id);
 saved=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));
 for(const id of beforeIds)assert.ok(findLegacy(saved,id),'Restart retained '+id);
 assert.deepEqual(saved.tabs.map(viewKey),beforeRestartOrder,'Restart retains the complete current view order');
 for(const old of source.tabs.filter(tab=>tab.type==='browser')){const tab=findLegacy(saved,old.id);assert.equal(tab.url,old.url,'Retained browser URL '+old.id);assert.equal(tab.parentId,old.parentId,'Retained browser placement '+old.id);}
 assert.equal(saved.tabs.find(tab=>tab.runId===fixture.user[0].id).parentId,'project:local:'+created.id);assert.equal(saved.chatDrafts[fixture.user[0].id],'Synthetic retained draft');
 for(const [file,contents]of originalRuns)assert.equal(fs.readFileSync(path.join(home,'runs',file),'utf8'),contents,'Migration/deletion preserves original run bytes');
 assert.deepEqual(errors,[]);await page.screenshot({path:'/private/tmp/proteus-production-projects.png'});
 console.log(JSON.stringify({passed:true,synthetic:true,retainedLegacyTabs:beforeIds.length,checks:['strict whole-view order across migration and restart','inactive workspace-project-chat selection chain','existing revisioned registries','main chat aliases and child scopes','unknown chat references','legacy peer local aliases','duplicate native browser aliases','live peer project upgrade','production branding without preview marker','additive project migration','legacy resources and draft retained','project default/delete','workspace aggregate no reorder','resource beyond former 100-item limit moves to project','Engine Room source/settings','restart with original run bytes']}));
}catch(error){await page?.screenshot({path:'/private/tmp/proteus-production-projects-failure.png'}).catch(()=>{});throw error;}finally{await close();await fixture.cleanup();}
