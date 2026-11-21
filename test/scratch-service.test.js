import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Scratchpad} from '../src/services/scratchpad/scratchpad.js';
import {captureScratchProject} from '../src/services/scratchpad/scratch-access.js';

async function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'scratch-service-')),home=path.join(root,'home'),folder=path.join(root,'vault');fs.mkdirSync(home);fs.mkdirSync(folder);
 const run={id:'chat',trigger:'chat',projectId:'alpha'},turn={controller:new AbortController()},prompts=[];
 const engine={running:new Map([['chat',turn]]),getRun:()=>run,persist:()=>{},ask:async(_run,question)=>{prompts.push(question);return 'approve';}};
 const projects={membership:run=>({projectId:run.projectId}),snapshot:()=>({catalog:{projects:[{id:'alpha',workspaceId:'personal',name:'Alpha'},{id:'beta',workspaceId:'personal',name:'Beta'}]},config:{workspaces:[{id:'personal',name:'Personal'}]}})};
 const service=new Scratchpad(home,{projects,engine});captureScratchProject(engine,projects,run);
 t.after(async()=>{await service.close();fs.rmSync(root,{recursive:true,force:true});});
 await service.configure({folder,expectedRevision:service.settings().revision});
 const create=(projectId,title)=>service.handle({action:'create',projectId,title,body:'# '+title,operationId:randomUUID()});
 return {service,engine,projects,run,turn,prompts,root,folder,create};
}
test('owner worker persists notes and only returns the captured project to its agent',async t=>{
 const f=await fixture(t),a=await f.create('alpha','Local'),b=await f.create('beta','Private other project');
 const rows=await f.service.handle({action:'list'},{runId:'chat'});assert.deepEqual(rows.items.map(row=>row.id),[a.id]);
 await assert.rejects(f.service.handle({action:'read',id:b.id},{runId:'chat'}),/outside the captured project/);
 assert.equal((await f.service.handle({action:'read',id:a.id},{runId:'chat'})).body,'# Local');
 f.run.projectId='beta';await assert.rejects(f.service.handle({action:'list',projectId:'beta'},{runId:'chat'}),/outside the captured project/);
 assert.equal(f.prompts.length,0);assert.equal(f.service.settings().root,path.join(f.folder,'Scratchpad'));
});
test('orphaned historical projects do not block the Scratchpad tree or storage rebuild',async t=>{
 const f=await fixture(t),note=await f.create('alpha','Still available'),snapshot=f.projects.snapshot();
 snapshot.catalog.projects.push({id:'orphan',workspaceId:'removed',name:'Historical project'},{id:'closed-project',workspaceId:'closed',name:'Deleted workspace project'});
 snapshot.config.workspaces.push({id:'closed',name:'Closed',deletedAt:'2026-11-01T00:00:00Z'});
 f.projects.snapshot=()=>snapshot;
 const destinations=f.service.bindingForRebuild().associations;
 assert.deepEqual(destinations.map(row=>row.scope),['workspace:personal','project:alpha','project:beta']);
 const tree=await f.service.handle({action:'tree'});
 assert.ok(tree.items.some(row=>row.scratchId===note.id));
 await assert.rejects(f.create('orphan','Invalid destination'),/Workspace is unavailable/);
 assert.equal((await f.service.handle({action:'read',id:note.id})).body,'# Still available');
});
test('explicit project read grant is narrow and retry does not prompt again',async t=>{
 const f=await fixture(t),b=await f.create('beta','Other');
 const args={action:'request-access',projectId:'beta',actions:['read','list'],reason:'Compare the approved design.',operationId:randomUUID()};
 assert.equal((await f.service.handle(args,{runId:'chat'})).granted,true);assert.equal((await f.service.handle(args,{runId:'chat'})).granted,true);assert.equal(f.prompts.length,1);
 assert.equal(f.prompts[0].details.managedApprovalRequired,true);
 assert.equal((await f.service.handle({action:'read',id:b.id},{runId:'chat'})).title,'Other');
 await assert.rejects(f.service.handle({action:'delete',id:b.id,expectedRevision:b.revision,operationId:randomUUID()},{runId:'chat'}),/outside the captured project/);
});
test('denial, automatic tool approval and turn end never expand project scope',async t=>{
 const f=await fixture(t);
 for(const answer of ['deny','approve-auto']) {f.engine.ask=async()=>answer;const result=await f.service.handle({action:'request-access',projectId:'beta',actions:['read'],reason:'Test explicit consent.',operationId:randomUUID()},{runId:'chat'});assert.equal(result.granted,false);}
 f.engine.ask=async()=>{f.turn.controller.abort();return 'approve';};
 await assert.rejects(f.service.handle({action:'request-access',projectId:'beta',actions:['read'],reason:'Test ended turn.',operationId:randomUUID()},{runId:'chat'}),/active chat turn/);assert.equal(f.run.scratchpadGrants,undefined);
});
test('reassociation requires both source and destination authorization',async t=>{
 const f=await fixture(t),a=await f.create('alpha','Move');
 const args={action:'move',id:a.id,expectedRevision:a.revision,projectId:'beta',operationId:randomUUID()};
 await assert.rejects(f.service.handle(args,{runId:'chat'}),/outside the captured project/);
 await f.service.handle({action:'request-access',projectId:'beta',actions:['create'],reason:'Move the design into Beta.',operationId:randomUUID()},{runId:'chat'});
 assert.equal((await f.service.handle(args,{runId:'chat'})).projectId,'beta');
 await assert.rejects(f.service.handle({action:'read',id:a.id},{runId:'chat'}),/outside the captured project/);
});
test('configured root replacement is rejected and selecting another root revokes old grants',async t=>{
 const f=await fixture(t);await f.service.handle({action:'request-access',projectId:'beta',actions:['list'],reason:'Read design.',operationId:randomUUID()},{runId:'chat'});
 const old=f.service.settings().root;fs.renameSync(old,old+'-old');fs.mkdirSync(old);
 await assert.rejects(f.create('alpha','Do not write here'),/root changed/);
 await f.service.configure({folder:f.folder,expectedRevision:f.service.settings().revision});
 await assert.rejects(f.service.handle({action:'list',projectId:'beta'},{runId:'chat'}),/outside the captured project/);
});
test('switching storage indexes progressively on the worker and preserves the original files and root binding',async t=>{
 const f=await fixture(t),original=await f.create('alpha','Original root note'),oldRoot=f.service.settings().root,oldBinding=(await f.service.handle({action:'status'})).rootId;
 const folder=path.join(f.root,'second-vault'),root=path.join(folder,'Scratchpad');fs.mkdirSync(root,{recursive:true});
 for(let i=0;i<240;i++)fs.writeFileSync(path.join(root,'Manual-'+i+'.md'),'# Manual '+i+'\n\nImported only from the newly chosen location.');
 await f.service.configure({folder,expectedRevision:f.service.settings().revision});
 const observations=[];let status;
 do {status=await f.service.handle({action:'status'});const rows=await f.service.handle({action:'list'});observations.push({running:status.indexing.running,count:rows.items.length});}while(status.indexing.running);
 assert.equal((await f.service.handle({action:'status'})).indexing.added,240);
 assert.ok(observations.some(row=>row.running),'The initial index is a background job, not a blocking configure call');
 assert.ok(fs.existsSync(path.join(oldRoot,'README.md')));assert.ok(fs.existsSync(path.join(oldRoot,original.relative)));
 await assert.rejects(f.service.handle({action:'read',id:original.id,rootId:oldBinding}),/storage changed/);
 const imported=(await f.service.handle({action:'list'})).items[0];assert.match((await f.service.handle({action:'read',id:imported.id})).body,/Imported only/);
});
test('folder suggestions are fetched afresh and removed registrations disappear',async t=>{
 const f=await fixture(t);let folders=[f.folder];f.service.memoryLocations=()=>folders;
 assert.deepEqual(f.service.settings().suggestions.map(row=>row.folder),[f.folder]);
 const added=path.join(f.root,'new-library');folders=[...folders,added];assert.equal(f.service.settings().suggestions.at(-1).folder,added);
 folders=[added];assert.deepEqual(f.service.settings().suggestions.map(row=>row.folder),[added]);
});
