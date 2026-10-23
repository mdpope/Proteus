import {_electron as electron} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-agent-sharing-')));
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const hits=new Map(),server=http.createServer((req,res)=>{hits.set(req.url,(hits.get(req.url)||0)+1);res.setHeader('content-type','text/html');res.end('<!doctype html><title>Sharing rehearsal</title><h1>Synthetic browser content</h1>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
let app;
const owner=(fn,value)=>app.evaluate(async({app},{code,value})=>{const main=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs');return new Function('main','value','return ('+code+')(main,value)')(main,value);},{code:fn.toString(),value});
const launch=async()=>{app=await electron.launch({...(process.env.PROTEUS_TEST_EXECUTABLE?{executablePath:process.env.PROTEUS_TEST_EXECUTABLE}:{}),args:[...(process.env.PROTEUS_TEST_EXECUTABLE?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'}});await (await app.firstWindow()).locator('#topbar-home').waitFor();await owner(main=>{const {dialog}=process.mainModule.require('electron');main.sharingFixture={original:dialog.showMessageBox,prompts:0,answer:0};dialog.showMessageBox=async()=>{main.sharingFixture.prompts++;return {response:main.sharingFixture.answer};};});};
const act=value=>owner((main,{value,run})=>main.getBrowser().agent(value,run),{value,run});let run;
try{
 await launch();
 run=await owner(main=>{const s=main.getService(),workspaceId=s.context.get().defaultWorkspaceId;const r=s.engine.createRun({schemaVersion:1,id:'agent-sharing-fixture',name:'Synthetic sharing rehearsal',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:s.home,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic only',context:s.context.capture({workspaceId})},'chat',null,{deferStart:true});r.status='completed';r.deferredStart=false;s.engine.persist(r);return r.id;});
 const human=await owner((main,url)=>main.getBrowser().create(url+'/human'),url);assert.equal(human.agentPaused,true);
 await assert.rejects(act({action:'snapshot',tabId:human.id}),/not shared with agents/);
 assert.equal((await act({action:'request-access',tabId:human.id})).shared,false);assert.equal((await act({action:'request-access',tabId:human.id})).shared,false);assert.equal(await owner(main=>main.sharingFixture.prompts),1);
 await owner((main,id)=>main.getBrowser().command({action:'agent-access',id,paused:false}),human.id);
 assert.match(JSON.stringify(await act({action:'snapshot',tabId:human.id})),/Synthetic browser content/);
 const identities=[];
 for(const unloaded of [false,true]){
  const suffix=unloaded?'/agent-unloaded':'/agent-loaded',tab=await act({action:'open',url:url+suffix,unloaded});assert.equal(tab.agentPaused,false);
  if(unloaded){assert.equal(tab.loaded,false);assert.equal(hits.get(suffix)||0,0);}
  assert.equal((await act({action:'request-access',tabId:tab.id})).shared,true);assert.equal(await owner(main=>main.sharingFixture.prompts),1);
  assert.match(JSON.stringify(await act({action:'snapshot',tabId:tab.id})),/Synthetic browser content/);
  await owner((main,run)=>main.getBrowser().releaseRun(run),run);await act({action:'unload',tabId:tab.id});
  assert.equal((await act({action:'load',tabId:tab.id})).agentPaused,false);
  identities.push(await owner((main,id)=>({logical:main.getBrowser().agentIdentity(main.getBrowser().get(id)),url:main.getBrowser().state(main.getBrowser().get(id)).url}),tab.id));
  await owner((main,id)=>main.getBrowser().command({action:'agent-access',id,paused:true}),tab.id);
  await assert.rejects(act({action:'snapshot',tabId:tab.id}),/not shared with agents/);
  await act({action:'unload',tabId:tab.id});await assert.rejects(act({action:'load',tabId:tab.id}),/not shared with agents/);
  // Share only the second tab again, to test both persisted decisions after restart.
  if(unloaded)await owner((main,id)=>main.getBrowser().command({action:'agent-access',id,paused:false}),tab.id);
 }
 assert.equal(await owner(main=>main.sharingFixture.prompts),1);
 await app.close();app=null;await launch();
 for(const [index,identity] of identities.entries()){
  const restored=await owner((main,identity)=>main.getBrowser().create(identity.url,null,null,{unloaded:true,contentTabId:identity.logical}),identity);
  assert.equal(restored.agentPaused,index===0);
  if(index===0)await assert.rejects(act({action:'snapshot',tabId:restored.id}),/not shared with agents/);
  else{assert.equal((await act({action:'request-access',tabId:restored.id})).shared,true);assert.match(JSON.stringify(await act({action:'snapshot',tabId:restored.id})),/Synthetic browser content/);}
 }
 assert.equal(await owner(main=>main.sharingFixture.prompts),0);
 console.log('PASS exact-package sharing: agent-created loaded/unloaded tabs need no sharing prompt; human tabs require a grant; refusal, revocation, release/recreation and restart preserve the decision');
}finally{await app?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
