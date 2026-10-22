import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { seedDesktopPreview, DesktopPreview, assertDesktopPreviewHome, desktopPreviewCodexHome } from '../src/desktop-preview.js';
import { SettingsStore } from '../src/settings.js';
import { ContextStore } from '../src/context.js';
import { Engine } from '../src/engine.js';

async function fixture(t){
 const root=fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-preview-test-')));
 const cleanup=[];
 t.after(async()=>{for(const close of cleanup.toReversed())await close();fs.rmSync(root,{recursive:true,force:true});});
 const home=path.join(root,'home'),a=path.join(root,'a'),b=path.join(root,'b'),library=path.join(root,'library');
 for(const folder of [a,b,library])fs.mkdirSync(folder);
 fs.writeFileSync(path.join(library,'AGENTS.md'),'# Sample instructions\nOnly synthetic task content.');
 seedDesktopPreview({home,workFolders:[{name:'Sample A',path:a},{name:'Sample B',path:b}],sourceFolders:[library]});
 const settings=new SettingsStore(home,a),context=new ContextStore(home,settings,{skipRefresh:true});
 const preview=new DesktopPreview(home,context);await context.refreshAsync();
 const engine=new Engine(home);cleanup.push(()=>engine.close());
 return {root,home,a,b,library,context,preview,engine,cleanup};
}
test('preview seeding refuses populated homes, validates marker and never seeds enabled schedules',async t=>{
 const f=await fixture(t);
 assert.throws(()=>seedDesktopPreview({home:f.home,workFolders:[{path:f.a}]}),/empty data home/);
 assert.equal(assertDesktopPreviewHome(f.home).isolatedDesktopPreview,true);
 assert.equal(f.engine.schedules.list().length,0);
 for(const run of f.engine.listRuns()){assert.equal(run.synthetic,true);assert.equal(run.schedule.provider,'rehearsal');assert.equal(run.providerSessionId,null);assert.equal(run.usage.observed,false);}
 const wrong=path.join(f.root,'wrong');fs.mkdirSync(wrong);assert.throws(()=>assertDesktopPreviewHome(wrong),/explicitly seeded/);
});
test('stable project defaults, unknown fields and revision conflicts survive restarts',async t=>{
 const f=await fixture(t),old=f.preview.get(f.engine),project=old.projects[0];
 const initial=f.preview.read();initial.extension={preserve:true};f.preview.write(initial);
 assert.throws(()=>f.preview.projects({action:'rename',projectId:project.id,name:'Changed',expectedRevision:old.revision},f.engine),/changed/);
 let current=f.preview.get(f.engine);
 current=f.preview.projects({action:'rename',projectId:project.id,name:'Inbox',expectedRevision:current.revision},f.engine);
 assert.equal(current.defaultProjectIds[project.workspaceId],project.id);
 assert.equal(f.preview.projectFor({workspaceId:project.workspaceId}).name,'Inbox');
 const restarted=new DesktopPreview(f.home,new ContextStore(f.home,new SettingsStore(f.home,f.a),{skipRefresh:true}));
 assert.equal(restarted.read().extension.preserve,true);
 assert.equal(restarted.projectFor({workspaceId:project.workspaceId}).id,project.id);
});
test('project move preserves history, session, roots, approval scope and source snapshot',async t=>{
 const f=await fixture(t),run=f.engine.listRuns()[0];
 run.providerSessionId='synthetic-session-identity';run.draft={text:'Retained draft'};f.engine.persist(run);
 const before=structuredClone(run),target=f.preview.get().projects.find(project=>project.workspaceId!==run.workspaceId);
 const result=f.preview.projects({action:'move-chat',chatId:run.id,projectId:target.id,expectedRevision:f.preview.read().revision,expectedUpdatedAt:run.updatedAt},f.engine);
 assert.equal(result.memberships[run.id].projectId,target.id);assert.equal(run.workspaceId,target.workspaceId);
 assert.equal(run.providerSessionId,before.providerSessionId);assert.deepEqual(run.events,before.events);assert.deepEqual(run.draft,before.draft);
 assert.deepEqual(run.schedule.workspace,before.schedule.workspace);assert.equal(run.schedule.context.workspaceId,before.schedule.context.workspaceId);assert.equal(run.schedule.context.followsWorkspace,false);
 assert.deepEqual(f.engine.permissions.describe(run.schedule),f.engine.permissions.describe(before.schedule));
 const reloaded=JSON.parse(fs.readFileSync(path.join(f.home,'runs',run.id+'.json')));assert.equal(reloaded.projectId,target.id);
});
test('owner source discovery is optional and does not grant working-folder write access; removal retains selections',async t=>{
 const f=await fixture(t),workspace=f.context.config().workspaces[0],entry=f.context.get(workspace.id).entries.find(entry=>entry.path===path.join(f.library,'AGENTS.md'));
 assert.ok(entry);assert.equal(entry.mode,'available');
 assert.deepEqual(f.context.capture({workspaceId:workspace.id}).entries,[]);
 const captured=f.context.capture({workspaceId:workspace.id,selectedIds:[entry.id]});
 assert.match(captured.entries[0].content,/synthetic task/);assert.deepEqual(captured.workspace.additionalDirectories,[]);
 assert.deepEqual(f.context.scope(workspace.id).approvals.folders,[]);assert.deepEqual(f.context.scope(workspace.id).libraryFolders,[]);
 f.context.mutate(config=>{config.workspaces[0].defaults.selectedIds=[entry.id];},f.context.config().revision);
 let state=f.preview.get();assert.equal(state.sourceLibrary[0].usedBy[0].id,workspace.id);
 state=await f.preview.sources({action:'remove',id:state.sourceLibrary[0].id,expectedRevision:state.revision},f.engine);
 assert.equal(state.sourceEntries.length,0);assert.deepEqual(f.context.scope(workspace.id).defaults.selectedIds,[entry.id]);
 assert.throws(()=>f.context.capture({workspaceId:workspace.id}),/registration was removed/);
 assert.throws(()=>f.preview.assertAvailable(captured),/registration was removed/);
 state=await f.preview.sources({action:'add',path:f.library,expectedRevision:state.revision},f.engine);
 assert.equal(state.sourceLibrary.length,1);assert.equal(f.context.capture({workspaceId:workspace.id}).entries[0].id,entry.id);
});
test('preview HTTP routing uses project workspace for new chats, persists moves, and normal server has no preview API',async t=>{
 const {startServer}=await import('../src/server.js');
 const f=await fixture(t),home=path.join(f.root,'http-home');
 seedDesktopPreview({home,workFolders:[{path:f.a,name:'Sample A'},{path:f.b,name:'Sample B'}],sourceFolders:[f.library]});
 const app=await startServer({home,port:0,timers:false,desktopPreview:true,providers:{rehearsal:{async run(){}}}});
 f.cleanup.push(()=>app.close());app.engine.drain=async()=>{};
 const call=async(route,value)=>{const response=await fetch(app.origin+route,{headers:{authorization:'Bearer '+app.token,'content-type':'application/json'},...(value?{method:'POST',body:JSON.stringify(value)}:{})});return {status:response.status,data:await response.json()};};
 let state=(await call('/api/state')).data;assert.equal(state.desktopPreview.enabled,true);assert.equal(state.schedules.length,0);
 const project=state.desktopPreview.projects.find(item=>item.workspaceId!==state.context.defaultWorkspaceId);
 const created=await call('/api/chat',{projectId:project.id,prompt:'Synthetic HTTP test, no provider run.',provider:'rehearsal',model:''});
 assert.equal(created.status,200);assert.equal(created.data.projectId,project.id);assert.equal(created.data.schedule.context.workspaceId,project.workspaceId);
 const row=(await call('/api/chats/index')).data.items.find(item=>item.id===created.data.id);assert.equal(row.projectId,project.id);
 const target=state.desktopPreview.projects[0];
 const moved=await call('/api/desktop-preview/projects',{action:'move-chat',chatId:created.data.id,projectId:target.id,expectedRevision:state.desktopPreview.revision,expectedUpdatedAt:created.data.updatedAt});
 assert.equal(moved.status,200);assert.equal(moved.data.memberships[created.data.id].projectId,target.id);
 assert.equal(app.engine.getRun(created.data.id).schedule.context.workspaceId,project.workspaceId);
 const normal=await startServer({home:path.join(f.root,'normal'),port:0,timers:false,withSeed:false,providers:{rehearsal:{async run(){}}}});f.cleanup.push(()=>normal.close());
 const response=await fetch(normal.origin+'/api/desktop-preview',{headers:{authorization:'Bearer '+normal.token}});assert.equal(response.status,404);
 await assert.rejects(()=>startServer({home:path.join(f.root,'unmarked'),port:0,desktopPreview:true}),/explicitly seeded/);
});
test('preview selects defaults only from refreshed provider metadata and preserves subsequent choices',async t=>{
 const f=await fixture(t),settings=new SettingsStore(f.home,f.a);
 const models=[{id:'advertised-alternative',controls:{}},{id:'advertised-default',isDefault:true,controls:{defaultReasoningEffort:'advertised-effort',reasoningEfforts:['advertised-effort']}}];
 assert.equal(f.preview.initializeProviderDefaults(settings,{available:true,stale:true,models}),false);
 assert.equal(settings.get().provider,'rehearsal');
 assert.equal(f.preview.initializeProviderDefaults(settings,{available:true,stale:false,models}),true);
 assert.equal(settings.get().model,'advertised-default');assert.equal(settings.get().reasoningEffort,'advertised-effort');
 settings.save({...settings.get(),provider:'rehearsal',model:''},settings.get().revision);
 assert.equal(f.preview.initializeProviderDefaults(settings,{available:true,models}),false);assert.equal(settings.get().provider,'rehearsal');
});

test('preview Codex home is canonical and confined to its initialized runtime directories',async t=>{
 const f=await fixture(t),fallback=path.join(f.home,'preview-codex');
 assert.equal(desktopPreviewCodexHome(f.home),fallback);assert.ok(fs.statSync(fallback).isDirectory());
 assert.throws(()=>desktopPreviewCodexHome(f.home,'relative'),/absolute/);
 assert.throws(()=>desktopPreviewCodexHome(f.home,f.library),/initialized preview data root/);
 assert.throws(()=>desktopPreviewCodexHome(f.home,path.join(os.homedir(),'.codex')),/global Codex/);
 assert.throws(()=>desktopPreviewCodexHome(f.home,path.resolve('src')),/source/);
 const outside=path.join(f.root,'outside-runtime');assert.throws(()=>desktopPreviewCodexHome(f.home,outside),/initialized preview data root/);assert.equal(fs.existsSync(outside),false);
 fs.rmdirSync(fallback);fs.symlinkSync(f.library,fallback,'dir');
 assert.throws(()=>desktopPreviewCodexHome(f.home),/initialized preview data root/);fs.unlinkSync(fallback);
 const home=path.join(f.root,'app-data'),codex=path.join(f.root,'codex'),marker=path.join(f.root,'.proteus-design-preview.json');
 seedDesktopPreview({home,workFolders:[{path:f.a,name:'Sample'}]});
 assert.throws(()=>desktopPreviewCodexHome(home,codex),/initialized preview data root/);
 fs.writeFileSync(marker,JSON.stringify({schemaVersion:1,purpose:'proteus-isolated-desktop-design-preview'}));
 assert.equal(desktopPreviewCodexHome(home,codex),codex);
 fs.rmdirSync(codex);fs.symlinkSync(f.library,codex,'dir');assert.throws(()=>desktopPreviewCodexHome(home,codex),/initialized preview data root/);fs.unlinkSync(codex);
 fs.renameSync(marker,marker+'.original');fs.symlinkSync(marker+'.original',marker);
 assert.throws(()=>desktopPreviewCodexHome(home,codex),/regular file/);
});


test('manual project reorder persists within workspace slots with conflict protection and unchanged membership/defaults',async t=>{
 const f=await fixture(t),value=f.preview.read();value.extension={keep:true};
 const [a,b,c,d]=value.projects;value.projects=[a,c,b,d];value.projects[0].unknownProjectField={keep:true};f.preview.write(value);
 const before=f.preview.get(f.engine),runBefore=JSON.stringify(f.engine.listRuns()),request={action:'reorder',workspaceId:a.workspaceId,projectId:a.id,targetId:b.id,after:true,expectedRevision:before.revision};
 const next=f.preview.projects(request,f.engine);
 assert.deepEqual(next.projects.map(project=>project.id),[b.id,c.id,a.id,d.id]);
 assert.deepEqual(next.defaultProjectIds,before.defaultProjectIds);assert.deepEqual(next.memberships,before.memberships);
 assert.deepEqual(next.extension,{keep:true});assert.deepEqual(next.projects.find(project=>project.id===a.id).unknownProjectField,{keep:true});
 assert.equal(JSON.stringify(f.engine.listRuns()),runBefore);
 assert.throws(()=>f.preview.projects(request,f.engine),/changed/);
 assert.throws(()=>f.preview.projects({...request,targetId:c.id,expectedRevision:next.revision},f.engine),/current workspace/);
 assert.throws(()=>f.preview.projects({...request,after:undefined,expectedRevision:next.revision},f.engine),/position/);
 const restarted=new DesktopPreview(f.home,new ContextStore(f.home,new SettingsStore(f.home,f.a),{skipRefresh:true}));
 assert.deepEqual(restarted.read().projects.map(project=>project.id),[b.id,c.id,a.id,d.id]);
 const created=restarted.projects({action:'create',workspaceId:a.workspaceId,name:'Appended project',expectedRevision:next.revision},f.engine);
 assert.deepEqual(created.projects.filter(project=>project.workspaceId===a.workspaceId).map(project=>project.name),[b.name,a.name,'Appended project']);
});

test('project deletion atomically reassigns membership, protects defaults, and preserves running chat data',async t=>{
 const f=await fixture(t);let catalog=f.preview.get(f.engine);
 const source=catalog.projects.find(project=>project.id!==catalog.defaultProjectIds[project.workspaceId]),target=catalog.projects.find(project=>project.id===catalog.defaultProjectIds[source.workspaceId]);
 const run=f.engine.listRuns().find(run=>run.projectId===source.id),before=JSON.stringify(run),runFile=fs.readFileSync(path.join(f.home,'runs',run.id+'.json'),'utf8');
 assert.throws(()=>f.preview.projects({action:'delete',projectId:target.id,expectedRevision:catalog.revision},f.engine),/default project cannot be deleted/);
 assert.throws(()=>f.preview.projects({action:'delete',projectId:source.id,workspaceId:'wrong-workspace',expectedRevision:catalog.revision},f.engine),/does not belong/);
 const request={action:'delete',projectId:source.id,expectedRevision:catalog.revision};
 catalog=f.preview.projects(request,f.engine);
 assert.equal(catalog.projects.some(project=>project.id===source.id),false);
 assert.equal(catalog.memberships[run.id].projectId,target.id);
 assert.equal(JSON.stringify(run),before);assert.equal(fs.readFileSync(path.join(f.home,'runs',run.id+'.json'),'utf8'),runFile);
 assert.throws(()=>f.preview.projectFor({projectId:source.id}),/unavailable/);
 assert.equal(f.preview.projects(request,f.engine).revision,catalog.revision);
 assert.throws(()=>f.preview.projects({...request,expectedRevision:'unrelated-stale-review'},f.engine),/changed/);
 catalog=f.preview.projects({action:'create',workspaceId:source.workspaceId,name:'New home',expectedRevision:catalog.revision},f.engine);
 const next=catalog.projects.find(project=>project.name==='New home');
 catalog=f.preview.projects({action:'default',projectId:next.id,expectedRevision:catalog.revision},f.engine);
 assert.equal(catalog.memberships[run.id].projectId,target.id,'changing default does not undo the original fixed reassignment');
 catalog=f.preview.projects({action:'delete',projectId:target.id,expectedRevision:catalog.revision},f.engine);
 assert.equal(catalog.memberships[run.id].projectId,next.id);
 const restarted=new DesktopPreview(f.home,new ContextStore(f.home,new SettingsStore(f.home,f.a),{skipRefresh:true}));
 assert.equal(restarted.membership(run).projectId,next.id);
 assert.equal(restarted.get(f.engine).projects.some(project=>project.workspaceId===source.workspaceId&&project.name==='General'),false);
 assert.equal(JSON.stringify(run),before);
});
