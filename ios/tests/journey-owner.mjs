// Synthetic-only owner for the native baseline/current journey. No provider runs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {startServer} from '../../src/server.js';
import {startRelay} from '../../relay/server.js';
import {secret} from '../../src/services/remote/remote-crypto.js';
import {atomicJSON} from '../../src/shared/files.js';
const home=process.env.PROTEUS_JOURNEY_HOME || fs.mkdtempSync(path.join(os.tmpdir(),'proteus-ios-journey-'));
const workspace=path.join(home,'workspace');fs.mkdirSync(workspace,{recursive:true});
if(!fs.existsSync(path.join(home,'settings.json')))atomicJSON(path.join(home,'settings.json'),{schemaVersion:1,provider:'rehearsal',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},mcpServers:{}});
const token=secret(),relay=await startRelay({port:4438,token});
const unavailable={status:async()=>({available:false,models:[]})};
const app=await startServer({home,port:0,timers:false,providers:{rehearsal:unavailable,codex:unavailable,claude:unavailable,copilot:unavailable}});
await app.remote.configure({label:'Journey synthetic owner',enabled:true,mode:'external',relayURL:'ws://127.0.0.1:4438',publicURL:'ws://127.0.0.1:4438',relayToken:token});
while(app.remote.status!=='online')await new Promise(r=>setTimeout(r,50));
const workspaceId=app.context.config().workspaces[0].id;
app.workspaceProjects.ensureProjects();
const catalog=app.workspaceProjects.get(app.engine),project=catalog.defaultProjectIds[workspaceId];
const runs=[];
const retained=app.engine.listRuns();
if(retained.length){
 for(let i=0;i<3;i++){const run=retained.find(r=>r.title==='Journey chat '+i);if(!run)throw Error('Synthetic journey identity missing');runs.push(run);}
 runs.push(...retained.filter(r=>!runs.includes(r)));runs[0].status='running';
}else for(let i=0;i<1500;i++){
 const schedule=await app.buildChatSchedule({workspaceId,projectId:project,name:i<3?'Journey chat '+i:'Synthetic General chat '+i,prompt:'Synthetic only',provider:'rehearsal'});
 const run=app.engine.createRun(schedule,'chat',null,{deferStart:true});run.status=i===0?'running':'completed';run.title=schedule.name;
 run.events=Array.from({length:i===0?3000:3},(_,j)=>({role:j%2?'assistant':'user',text:'Message '+j+' '+('Rich **markdown** and `code`. '.repeat(i===0?30:1)),at:new Date().toISOString()}));
 app.workspaceProjects.associate(run,app.workspaceProjects.get(app.engine).projects.find(p=>p.id===project),app.engine);runs.push(run);
}
const tabs=runs.slice(0,3).map(run=>({action:'open',tab:{id:'chat:'+run.id,type:'chat',chatId:run.id,title:run.schedule.name}}));
for(let i=0;i<200;i++)tabs.push({action:'open',tab:{id:'journey-browser-'+i,type:'browser',title:'Journey browser '+i,url:'https://example.com/'}});
const existing=app.contentTabs.get('project',project);
if(existing.tabs.length){
 const tab=existing.tabs.find(t=>t.id==='journey-browser-0');const id=crypto.randomUUID();
 await app.mutateContentTabs({scope:'project',id:project,expectedRevision:existing.revision,operations:[{action:'browser-navigate',tabId:tab.id,operationId:id,eventId:id,baseRevision:tab.history?.revision||0,entryId:crypto.randomUUID(),url:'https://example.com/',title:'Journey browser 0',profileId:'default',visitedAt:new Date().toISOString()}]});
}else for(let i=0;i<tabs.length;i+=100)app.contentTabs.mutate({scope:'project',id:project,expectedRevision:app.contentTabs.get('project',project).revision,operations:tabs.slice(i,i+100)});
// Keep the rich conversation in the first summary page after bulk creation.
for(const run of runs.slice(0,3))run.createdAt=run.updatedAt=run.lastActivityAt=new Date(Date.now()+10000).toISOString();
let ticks=0;
const timer=setInterval(()=>{app.engine.event(runs[0],'assistant','Streaming **synthetic** update '+(++ticks));app.remote.changed();},1000);
const server=http.createServer(async(req,res)=>{
 if(req.url==='/pair'){res.setHeader('content-type','application/json');res.end(JSON.stringify({...(await app.remote.pairing()),projectId:project,workspaceId,chatIds:runs.slice(0,3).map(r=>r.id)}));return;}
 if(req.url==='/evidence'){res.setHeader('content-type','application/json');res.end(JSON.stringify({synthetic:true,chats:app.engine.listRuns().length,tabs:app.contentTabs.get('project',project).tabs.length,richEvents:runs[0].events.length,ticks,transport:app.performanceDiagnostics?.snapshot().remoteTransport}));return;}
 res.setHeader('content-type','text/html');res.end('<title>Journey browser</title><h1>Journey browser loaded</h1><p>Synthetic local page</p>');
});
await new Promise(r=>server.listen(4439,'127.0.0.1',r));console.log('Synthetic journey owner ready');
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{clearInterval(timer);server.close();await app.close();await relay.close();process.exit(0);});
