// Synthetic extension and owner registry only. No provider, production profile or real site.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
import {extensionWindow} from './extension-window-fixture.mjs';

const executable=process.env.PROTEUS_TEST_EXECUTABLE;
const until=async(fn,label)=>{const end=Date.now()+30000;while(Date.now()<end){const value=await fn();if(value)return value;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Timed out: '+label);};
// Instrument only the disposable renderer response. The gate does not change the
// synchronizer's result; it controls whether creation precedes or follows snapshot.
function gatedSynchronizer(source,mode,mainScopeId){
 const before='let local=await snapshot(scope);',after="let raw=await request(scope,'get',{historyLimit:200});";
 const needle=mode==='before-snapshot'?before:after,target=JSON.stringify(mainScopeId);
 if(source.split(needle).length!==2||source.split(before).length!==2)throw Error('Update the synthetic synchronizer gate for the current source.');
 const gate="if(scope.scope==='main'&&scope.id==="+target+"&&record.baseline===null&&!window.__extensionIntentGate){let release;const promise=new Promise(resolve=>release=resolve);window.__extensionIntentGate={release,phase:"+JSON.stringify(mode)+",scopeId:scope.id,baselineUnset:true,revision:record.revision};await promise;}";
 const capture="if(scope.scope==='main'&&scope.id==="+target+"&&window.__extensionIntentGate&&!window.__extensionIntentGate.captured)window.__extensionIntentGate.captured=local.map(tab=>({id:tab.id,navigationPending:!!tab.navigationPending}));";
 const instrumented=source.replace(before,before+capture).replace(needle,gate+needle);
 return 'window.__extensionIntentGateInstalled='+JSON.stringify({target:mainScopeId})+';\n'+instrumented;
}

async function exercise(mode){
 const fixture=await sidebarFixture();let app;
 try{
  app=await electron.launch({...(executable?{executablePath:executable}:{}),args:[...(executable?[]:['.']),...(process.platform==='linux'?['--password-store=basic']:['--use-mock-keychain']),'--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'},timeout:60000});
  const page=await app.firstWindow();page.setDefaultTimeout(30000);await page.locator('#topbar-home').waitFor();
  const windowId=await page.evaluate(()=>window.desktop.windowId||'main'),mainScopeId=windowId==='main'?'main':'window:'+windowId;
  const owner=(fn,value)=>app.evaluate(async({app},{code,value,expectedHome})=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');if(main.getService().home!==expectedHome)throw Error('Disposable fixture home required');return await eval('('+code+')')(main,value);},{code:fn.toString(),value,expectedHome:fixture.locations.home});
  // Ensure an authoritative, preexisting owner revision, then reload so this
  // renderer's main-scope synchronizer has an unset baseline.
  const seeded=await owner(async(main,id)=>{const store=main.getService().contentTabs,current=await store.getAsync('main',id);if(current.revision!==0)throw Error('Fresh synthetic main scope required');return store.mutateAsync({scope:'main',id,expectedRevision:current.revision,operations:[{action:'open',tab:{id:'synthetic-owner-anchor',type:'browser',title:'Synthetic anchor',url:''}}]});},mainScopeId);
  assert.equal(seeded.revision,1);
  await page.route('**/models/content-tab-sync.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:gatedSynchronizer(await response.text(),mode,mainScopeId)});});
  await page.reload();await page.locator('#topbar-home').waitFor();await page.waitForFunction(()=>!!window.__extensionIntentGateInstalled);assert.equal(await page.evaluate(()=>window.__extensionIntentGateInstalled.target),mainScopeId);
  const installed=await app.evaluate(async({app,dialog},source)=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');await main.getService().browserProfiles.handle({action:'settings',id:'default',settings:{blockingEnabled:false}});const open=dialog.showOpenDialog,message=dialog.showMessageBox;dialog.showOpenDialog=async()=>({canceled:false,filePaths:[source]});dialog.showMessageBox=async()=>({response:1});try{return await main.getBrowser().command({action:'extensions-install',profileId:'default'});}finally{dialog.showOpenDialog=open;dialog.showMessageBox=message;}},path.resolve('test/fixtures/tab-extension'));
  assert.equal(installed.length,1);const popupEvent=extensionWindow(app,installed[0].id,'/popup.html');await owner((main,id)=>main.getBrowser().command({action:'extensions-open',extensionId:id}),installed[0].id);const popup=await popupEvent;await popup.getByText(/Extension API ready/).waitFor();
  const create=async active=>{const native=await popup.evaluate(active=>new Promise((resolve,reject)=>chrome.tabs.create({active},tab=>{const error=chrome.runtime.lastError;if(error)reject(Error(error.message));else resolve({id:tab.id,active:tab.active});})),active);const info=await owner((main,id)=>{const browser=main.getBrowser(),tab=[...browser.tabs.values()].find(item=>item.view?.webContents.id===id);if(!tab)throw Error('Created synthetic tab missing');return browser.state(tab,true);},native.id);return {native,info};};
  // The active create causes the first main-scope read. A second inactive
  // create occurs while that read is held, exercising a late creation event.
  const active=await create(true);await page.locator('[data-tab-container="'+active.info.id+'"].selected').waitFor();
  await page.waitForFunction(()=>!!window.__extensionIntentGate);
  const gate=await page.evaluate(()=>({phase:window.__extensionIntentGate.phase,scopeId:window.__extensionIntentGate.scopeId,baselineUnset:window.__extensionIntentGate.baselineUnset,revision:window.__extensionIntentGate.revision,captured:window.__extensionIntentGate.captured||[]}));assert.equal(gate.phase,mode);assert.equal(gate.scopeId,mainScopeId);assert.equal(gate.baselineUnset,true);assert.equal(gate.revision,0,'renderer baseline remains unset');
  const inactive=await create(false);assert.notEqual(inactive.info.id,active.info.id);assert.equal(inactive.native.active,false);if(mode==='after-snapshot')assert.equal(gate.captured.some(tab=>tab.id===inactive.info.id),false);
  await page.locator('[data-tab-container="'+inactive.info.id+'"]').waitFor();assert.equal(await page.locator('#tabs .tabitem.selected').getAttribute('data-tab-container'),active.info.id,'inactive creation keeps the selected tab');
  await page.evaluate(()=>window.__extensionIntentGate.release());
  const read=()=>owner(async(main,id)=>main.getService().contentTabs.getAsync('main',id),mainScopeId);
  await until(async()=>{const current=await read();return current.tabs.some(t=>t.id===active.info.id)&&current.tabs.some(t=>t.id===inactive.info.id);},'both extension creations accepted by owner');
  const accepted=await read();assert.ok(accepted.revision>seeded.revision);
  for(const info of [active.info,inactive.info])assert.equal(await owner((main,id)=>main.getBrowser().tabs.has(id),info.id),true,'accepted tab retains its native view');
  await until(async()=>{const session=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'}));return [active.info.id,inactive.info.id].every(id=>{const tab=session.tabs.find(t=>t.id===id);return tab&&tab.pendingOpen!==true;});},'creation intent settled after owner acceptance');
  assert.equal(await page.locator('#tabs .tabitem.selected').getAttribute('data-tab-container'),active.info.id);
  // Explicit owner close and move remain authoritative, even if a stale select
  // arrives later. The moved descriptor must remain only in its destination.
  await owner(async(main,{scopeId,id})=>{const store=main.getService().contentTabs,current=await store.getAsync('main',scopeId);await store.mutateAsync({scope:'main',id:scopeId,expectedRevision:current.revision,operations:[{action:'close',id}]});},{scopeId:mainScopeId,id:active.info.id});
  await owner(async(main,{scopeId,id,destination})=>{const store=main.getService().contentTabs,source=await store.getAsync('main',scopeId),target=await store.getAsync('workspace',destination);await store.moveAsync({scope:'main',id:scopeId,tabId:id,expectedRevision:source.revision,destination:{scope:'workspace',id:destination,expectedRevision:target.revision}});},{scopeId:mainScopeId,id:inactive.info.id,destination:fixture.studio.id});
  await until(async()=>{const current=await read();return !current.tabs.some(t=>[active.info.id,inactive.info.id].includes(t.id))&&current.closed?.[active.info.id]&&current.closed?.[inactive.info.id];},'owner close and move recorded');
  await owner((main,infos)=>{const browser=main.getBrowser();for(const info of infos)browser.actions.send({type:'select-tab',info});},[active.info,inactive.info]);
  await page.unroute('**/models/content-tab-sync.js*');await page.reload();await page.locator('#topbar-home').waitFor();
  await until(async()=>{const current=await read(),destination=await owner(async(main,id)=>main.getService().contentTabs.getAsync('workspace',id),fixture.studio.id),session=await page.evaluate(()=>window.desktop.workspaceSession({action:'get'})),closedNative=await owner((main,id)=>main.getBrowser().tabs.has(id),active.info.id);return Array.isArray(session?.tabs)&&!closedNative&&!session.tabs.some(t=>[active.info.id,inactive.info.id].includes(t.id)&&!t.parentId)&&!current.tabs.some(t=>[active.info.id,inactive.info.id].includes(t.id))&&destination.tabs.some(t=>t.id===inactive.info.id);},'stale selection and restoration cannot reopen main identities');
  const final=await read();assert.ok(final.closed?.[active.info.id]);assert.ok(final.closed?.[inactive.info.id]);assert.equal(final.tabs.some(t=>[active.info.id,inactive.info.id].includes(t.id)),false);
  console.log(JSON.stringify({passed:true,synthetic:true,mode,ownerRevision:seeded.revision,activeAndInactive:true,inactiveSelectionPreserved:true,creationAcceptedAndSettled:true,ownerCloseMoveAndStaleRestore:true}));
 }catch(error){console.error(JSON.stringify({mode,errorClass:error.name}));throw error;}finally{await app?.close();await fixture.cleanup();}
}
for(const mode of ['before-snapshot','after-snapshot'])await exercise(mode);
