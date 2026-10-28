// Rehearsal only: a populated owner with captured chats and inherited folders.
// No provider turn, operational schedule or live application data is used.
import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sidebarFixture} from './preview-sidebar-fixture.mjs';

const fixture=await sidebarFixture(),bundle=process.argv[2]&&path.resolve(process.argv[2]);let app;
try{
 app=await electron.launch({...(bundle?{executablePath:path.join(bundle,'Contents/MacOS/Proteus')}:{}),args:[...(bundle?[]:['.']),'--use-mock-keychain','--user-data-dir='+fixture.locations.userData],env:{...process.env,PROTEUS_HOME:fixture.locations.home,PORT:'0',CODEX_HOME:fixture.auth},timeout:60000});
 const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
 const result=await app.evaluate(async({app})=>{
  const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
  const require=process.mainModule.require.bind(process.mainModule),fs=require('node:fs'),path=require('node:path'),folder=service.home;
  const roots=Array.from({length:12},(_,i)=>path.join(folder,'synthetic-root-'+i));for(const root of roots)fs.mkdirSync(root);
  const config=service.context.config(),workspaceId=config.defaultWorkspaceId;
  service.context.mutate(value=>{
   const workspace=value.workspaces.find(item=>item.id===workspaceId);
   workspace.cwd=folder;workspace.additionalDirectories=roots;
   workspace.approvals={mode:'custom',folders:[{path:roots[2],access:'read'}],rules:[],readOnlyTools:false};
  },config.revision);
  const workspace={cwd:folder,additionalDirectories:roots},ids=[];
  for(let i=0;i<500;i++){
   const id='synthetic-permission-'+i;ids.push(id);
   service.engine.runs.set(id,{id,title:'Synthetic saved chat '+i,trigger:'chat',status:'completed',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',events:[],schedule:{id,name:'Synthetic saved chat '+i,provider:'rehearsal',workspace,context:{workspaceId,baseWorkspace:workspace,entries:[],includeDefaults:false,selectedIds:[]},mcpServers:{},skillDirectories:[]}});
  }
  const original=JSON.stringify(ids.map(id=>service.engine.runs.get(id))),durations=[],assemblies=[];let pulses=0,maxGapMs=0,last=performance.now();
  const timer=setInterval(()=>{const now=performance.now();maxGapMs=Math.max(maxGapMs,now-last);last=now;pulses++;},5);
  try{
   for(let i=0;i<4;i++){
    const start=performance.now(),response=await fetch(service.origin+'/api/state?summaries=1&rehearsal='+i,{headers:{authorization:'Bearer '+service.token}});
    if(!response.ok)throw Error('Synthetic state request failed: '+response.status);
    const state=await response.json();durations.push(performance.now()-start);
    if(state.runs.filter(run=>ids.includes(run.id)).length!==500)throw Error('Saved-chat summaries were lost.');
    if(state.runs.filter(run=>ids.includes(run.id)).some(run=>!run.permissionContext.readOnlyFolders.includes(roots[2])))throw Error('Read-only folder projection changed.');
    const phase=service.performanceDiagnostics.snapshot().phases.find(phase=>phase.name==='http.state.assemble'&&phase.kind==='sync');assemblies.push(phase?.maxMs);
    await new Promise(resolve=>setTimeout(resolve,30));
   }
   return {synthetic:true,chats:ids.length,roots:roots.length,durationsMs:durations,assemblyMaxMs:assemblies.at(-1),pulses,maxGapMs,chatRecordsUnchanged:original===JSON.stringify(ids.map(id=>service.engine.runs.get(id))),version:require(app.getAppPath()+'/package.json').version};
  }finally{clearInterval(timer);ids.forEach(id=>service.engine.runs.delete(id));}
 });
 assert.ok(result.pulses>0);assert.ok(result.chatRecordsUnchanged);assert.ok(result.assemblyMaxMs<2500,JSON.stringify(result));
 console.log(JSON.stringify(result));
}finally{await app?.close();await fixture.cleanup();}
