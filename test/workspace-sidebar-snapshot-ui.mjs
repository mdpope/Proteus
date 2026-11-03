// Two real renderer windows, synthetic owner memory and disposable profiles only.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';
const fixture=await sidebarFixture(),host='11111111-1111-4111-8111-111111111111';
let app;const errors=[];
const ready=async page=>{page.on('pageerror',error=>errors.push(error.message));await page.locator('#topbar-home').waitFor();return page;};
try{
 app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_DESKTOP_PREVIEW:'1',PROTEUS_PREVIEW_HOME:fixture.locations.root,PROTEUS_HOME:fixture.locations.home,CODEX_HOME:fixture.auth,PORT:'0'}});
 const first=await ready(await app.firstWindow()),created=app.waitForEvent('window');
 await app.evaluate(({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').createWindow());
 const second=await ready(await created);
 await app.evaluate(async({app},{home,host})=>{
  const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
  if(service.home!==home)throw Error('Disposable fixture home required');
  const {state}=await service.remote.execute({},'sync',{});state.hostName='Snapshot fixture';state.context.workspaces[0].name='Before';
  const peers=service.peers;peers.load();peers.records.set(host,{hostId:host,label:'Snapshot fixture',relay:'wss://synthetic.invalid',key:'ab'.repeat(32),deviceId:'22222222-2222-4222-8222-222222222222'});
  const calls=[];const client={status:'online',host:{label:'Snapshot fixture'},close(){this.status='offline';},async request(method){calls.push(method);if(method==='context.get')return state.context;if(method==='sync')return {state};if(method==='runs.list')return [];throw Error('Unexpected synthetic request');}};
  const session={ready:true,client};peers.sessions.set(host,session);peers.adoptHostState(host,session,state);
  global.__sidebarSnapshotFixture={peers,state,session,calls,host};peers.emitState(host,{changed:true,event:'state'});
 },{home:fixture.locations.home,host});
 for(const page of [first,second]){
  await page.locator('[data-preview-other-computers]').click();
  await page.locator(`[data-preview-computer-expand="${host}"]`).waitFor();
  await page.locator(`[data-preview-computer-expand="${host}"]`).click();
 }
 await app.evaluate(async()=>{const f=global.__sidebarSnapshotFixture;for(let i=0;i<30;i++){f.state.context.workspaces[0].name=i===29?'After':'Revision '+i;f.peers.adoptHostState(f.host,f.session,f.state);f.peers.emitState(f.host,{changed:true,event:'state'});await new Promise(resolve=>setTimeout(resolve,40));}});
 for(const page of [first,second])await page.locator(`[data-preview-host="${host}"][data-preview-workspace]`).filter({hasText:'After'}).waitFor();
 const calls=await app.evaluate(()=>global.__sidebarSnapshotFixture.calls);
 assert.equal(calls.filter(method=>method==='context.get'||method==='sync').length,0,'pushes and two-window sidebar redraws must not refetch full remote catalogs');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,windows:2,pushedChanges:30,remoteCatalogReads:0,renamesAppearInBothWindows:true}));
}finally{await app?.close();await fixture.cleanup();}
