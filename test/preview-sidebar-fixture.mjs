// Synthetic data only, prepared before its disposable Electron profile is opened.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {randomUUID} from 'node:crypto';import {createRequire} from 'node:module';import {createServer} from 'node:http';
import {seedDesktopPreview} from '../src/desktop-preview.js';import {atomicJSON} from '../src/files.js';import {revision} from '../src/schedules.js';
const require=createRequire(import.meta.url),{initializePreviewRoot,preparePreviewFixtures}=require('../desktop/preview-runtime.cjs'),{WorkspaceSession}=require('../desktop/workspace-session.cjs');
export async function sidebarFixture(){
 const temporary=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'proteus-sidebar-ui-'))),locations=initializePreviewRoot(path.join(temporary,'preview')),auth=path.join(temporary,'empty-codex');fs.mkdirSync(auth);
 const requests=[];const server=createServer((request,response)=>{requests.push(request.url);response.writeHead(200,{'Content-Type':'text/html'});response.end('<!doctype html><title>Synthetic sidebar browser</title><h1>Disposable sidebar browser</h1>');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const seeded=seedDesktopPreview({home:locations.home,workFolders:preparePreviewFixtures(locations),sourceFolders:[locations.sourceRoot]}),studio=seeded.workspaces.find(row=>row.name==='Studio'),personal=seeded.workspaces.find(row=>row.name==='Personal'),project=seeded.projects.find(row=>row.workspaceId===studio.id&&row.name==='Design review'),personalProject=seeded.projects.find(row=>row.workspaceId===personal.id&&row.name==='Research');
 const catalog=JSON.parse(fs.readFileSync(path.join(locations.home,'preview-projects.json'),'utf8'));
 for(let i=0;i<8;i++)catalog.projects.push({id:randomUUID(),workspaceId:studio.id,name:'Synthetic project '+(i+1),createdAt:new Date(Date.now()-(i+10)*3600000).toISOString(),synthetic:true});atomicJSON(path.join(locations.home,'preview-projects.json'),catalog);
 const initialRuns=fs.readdirSync(path.join(locations.home,'runs')).map(file=>JSON.parse(fs.readFileSync(path.join(locations.home,'runs',file),'utf8'))),sample=initialRuns.find(row=>row.projectId===project.id),user=[];
 const title='Synthetic sidebar conversation with a deliberately long title that uses two readable lines and keeps the full title in its tooltip';
 function addRun(index,{kind='user',failed=false,target=project}={}){
  const run=structuredClone(sample),id=randomUUID(),at=new Date(Date.now()-(target===project&&index===13?25*60:index+5)*60000).toISOString(),workspace=target===project?studio:personal;
  Object.assign(run,{id,title:index===0?title:`Synthetic ${failed?'attention':kind} conversation ${String(index+1).padStart(2,'0')} with a long readable title`,titleRevision:randomUUID(),createdAt:at,updatedAt:at,chatType:kind,trigger:kind==='scheduled'?'schedule':'chat',status:failed?'failed':'completed',projectId:target.id,projectName:target.name,workspaceId:workspace.id,workspaceName:workspace.name});
  run.schedule.id='synthetic-'+id;run.schedule.chatType=kind;run.schedule.name=run.title;run.scheduleRevision=revision(run.schedule);run.events=[{role:failed?'error':'system',text:'Synthetic sidebar fixture only; no provider request or external action occurred.',at}];if(failed)run.failureEventAt=at;
  atomicJSON(path.join(locations.home,'runs',id+'.json'),run);return run;
 }
 for(let i=0;i<14;i++)user.push(addRun(i));
 for(const kind of ['internet','scheduled'])for(let i=0;i<12;i++)addRun(i,{kind,target:personalProject});
 for(let i=0;i<12;i++)addRun(i,{failed:true,target:personalProject});
 for(let i=0;i<3;i++){const schedule={...structuredClone(sample.schedule),id:'synthetic-disabled-'+i,name:'Synthetic disabled schedule '+i,enabled:false};atomicJSON(path.join(locations.home,'schedules',schedule.id+'.json'),schedule);}
 const parentId='project:local:'+project.id,workspaceId='workspace:local:'+studio.id,document=path.join(studio.cwd,'docs','sidebar-fixture.md');fs.writeFileSync(document,'# Synthetic sidebar document\n\nStable document view for isolated navigation testing.\n');
 const favicon='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1YAAAAASUVORK5CYII=';
 const at=minutes=>new Date(Date.now()-minutes*60000).toISOString();
 const tabs=[{id:'overview',type:'overview',label:'Home'},{id:workspaceId,type:'workspace',workspaceId:studio.id,label:'Studio',workspacePage:'projects'},{id:parentId,type:'workspace',workspaceId:studio.id,projectId:project.id,label:project.name,workspacePage:'chats'},
  {id:parentId+':chat:'+user[0].id,type:'run',runId:user[0].id,label:title,parentId,lastActivityAt:at(5)},
  {id:'synthetic-duplicate-chat-view',type:'run',runId:user[0].id,label:title,parentId,lastActivityAt:at(5)},
  {id:'synthetic-browser-favicon',type:'browser',label:'Synthetic favicon browser',url:origin+'/favicon-tab',favicon,parentId,unloaded:true,lastActivityAt:at(1),openedAt:at(90)},
  {id:'synthetic-browser-hidden',type:'browser',label:'Synthetic hidden browser',url:origin+'/hidden-tab',parentId,hidden:true,unloaded:true,lastActivityAt:at(2),openedAt:at(90)},
  {id:'markdown:'+document,type:'markdown',file:document,label:'Synthetic sidebar document',parentId,lastActivityAt:at(3),openedAt:at(90)}];
 new WorkspaceSession(locations.home).save({schemaVersion:1,active:workspaceId,page:'context',tabs});
 return {temporary,locations,auth,studio,personal,project,parentId,workspaceId,user,title,document,origin,requests,projectChatCount:15,projectTotal:18,projects:catalog.projects,cleanup:async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(temporary,{recursive:true,force:true,maxRetries:10,retryDelay:100});}};
}
