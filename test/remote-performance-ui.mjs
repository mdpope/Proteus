// Disposable Electron acceptance: legacy receipts, replay after restart and UI responsiveness.
import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';

const home=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-remote-performance-')));
const workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>createHash('sha256').update(value).digest('hex');
const deviceId='synthetic-performance-device', request={id:randomUUID(),issuedAt:new Date().toISOString(),method:'tabs.mutate',args:{scope:'team',id:'team',expectedRevision:0,operations:[]}};
const oldResult={scope:'team',id:'team',revision:17,tabs:[],syntheticReplayMarker:'retained'};
let legacy=Object.fromEntries(Array.from({length:8674},(_,i)=>['synthetic:'+i,{digest:'a'.repeat(64),result:{id:'synthetic-'+i,payload:('Synthetic replay result '+i+' ').repeat(220).slice(0,5090)},at:Date.now()}]));
legacy[deviceId+':'+request.id]={digest:digest(JSON.stringify(canonical([request.method,request.args]))),result:oldResult,at:Date.now()};
const legacyFile=path.join(home,'remote-commands.json');fs.writeFileSync(legacyFile,JSON.stringify(legacy,null,2)+'\n');legacy=null;
const legacyHash=digest(fs.readFileSync(legacyFile)),legacyBytes=fs.statSync(legacyFile).size;
fs.writeFileSync(path.join(home,'settings.json'),JSON.stringify({schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}}));
const executablePath=process.argv[2]&&path.resolve(process.argv[2],'Contents/MacOS/Proteus');
let app;
async function launch(){
  app=await electron.launch({...(executablePath?{executablePath}:{}),args:[...(executablePath?[]:['.']),'--use-mock-keychain','--user-data-dir='+path.join(home,'electron')],env:{...process.env,PROTEUS_HOME:home,PORT:'0'},timeout:60000});
  const page=await app.firstWindow();await page.locator('#topbar-home').waitFor();
  await app.evaluate(async({app},id)=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();service.remote.config.devices.push({id});await service.remote.commandJournal.ready;},deviceId);
  return page;
}
async function command(message){return app.evaluate(async({app},{deviceId,message})=>{const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();return service.remote.command({device:{id:deviceId}},message);},{deviceId,message});}
try{
  let page=await launch();
  assert.deepEqual(await command(request),oldResult,'Migrated receipt replays without executing stale operation');
  const work=await app.evaluate(async({app},deviceId)=>{
    const service=process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService();
    const {randomUUID}=process.mainModule.require('node:crypto');let previous=performance.now(),maxGap=0,ticks=0;
    const timer=setInterval(()=>{const now=performance.now();maxGap=Math.max(maxGap,now-previous);previous=now;ticks++;},5);
    const beforeStats=await service.remote.commandDiagnostics();
    const start=performance.now(),messages=[],durations=[];
    try{
      for(let i=0;i<10;i++){
        const current=service.contentTabs.get('team','team');
        const message={id:randomUUID(),issuedAt:new Date().toISOString(),method:'tabs.mutate',args:{scope:'team',id:'team',expectedRevision:current.revision,operations:[{action:'open',tab:{id:'synthetic-browser',type:'browser',title:'Synthetic '+i,url:'https://example.com/'+i,profileId:'default'}}]}};
        const before=performance.now();await service.remote.command({device:{id:deviceId}},message);durations.push(performance.now()-before);messages.push(message);
      }
      await new Promise(resolve=>setTimeout(resolve,20));
      const afterStats=await service.remote.commandDiagnostics();
      return {messages,durations,maxGap,ticks,elapsedMs:performance.now()-start,payloadBytesWritten:afterStats.payloadBytesWritten-beforeStats.payloadBytesWritten,claimWrites:afterStats.claimWrites-beforeStats.claimWrites,resultWrites:afterStats.resultWrites-beforeStats.resultWrites,electron:process.versions.electron,node:process.versions.node};
    }finally{clearInterval(timer);}
  },deviceId);
  assert.ok(work.ticks>0,'Main event loop remains available during journal I/O');
  assert.equal(work.claimWrites,10);assert.equal(work.resultWrites,10);
  assert.ok(work.payloadBytesWritten<100_000,'Small mutations must not rewrite the existing receipt history');
  assert.ok(work.maxGap<150,'Journal mutations must not reproduce the old 143–174ms synchronous stalls: '+work.maxGap);
  await page.locator('[data-page="runs"]').click();await page.locator('#topbar-home').waitFor();
  const last=work.messages.at(-1),result=await command(last);
  await app.close();app=null;
  assert.equal(digest(fs.readFileSync(legacyFile)),legacyHash,'Migration and new mutations preserve original legacy file');
  await launch();assert.deepEqual(await command(request),oldResult);assert.deepEqual(await command(last),result,'Restart replays same receipt despite stale expected revision');
  const stored=await app.evaluate(async({app})=>process.mainModule.require(app.getAppPath()+'/desktop/main.cjs').getService().contentTabs.get('team','team'));
  assert.equal(stored.revision,10,'Retries and restart did not repeat effects');
  console.log(JSON.stringify({passed:true,legacyBytes,legacyRecords:8675,mutations:10,payloadBytesWritten:work.payloadBytesWritten,mainLoopMaxGapMs:+work.maxGap.toFixed(1),durationMs:work.durations.map(n=>+n.toFixed(1)),electron:work.electron,node:work.node,legacyPreserved:true,restartReplay:true}));
}finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
