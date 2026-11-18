import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ScratchStore} from '../src/services/scratchpad/scratch-store.js';

function fixture(t) {
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-scratch-test-')),root=path.join(directory,'Scratchpad'),home=path.join(directory,'index');fs.mkdirSync(root);
 const store=new ScratchStore({root,home});store.setup();t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
 const create=(args={})=>store.mutate({action:'create',operationId:randomUUID(),title:'Draft',body:'# Notes\n',association:{workspaceId:'workspace-a',projectId:'project-a',workspaceName:'Personal',projectName:'Project A'},...args});
 return {store,root,home,directory,create};
}
test('workspace filtering includes its projects and searches filename and custom frontmatter',t=>{
 const f=fixture(t);const a=f.create({title:'Alpha'});f.create({title:'Other',association:{workspaceId:'elsewhere'}});
 const file=path.join(f.root,a.relative);fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('title: Alpha','title: Alpha\ntags: [research, telescope]'));
 f.store.sync();assert.equal(f.store.list({workspaceFilter:'workspace-a',search:'telescope'}).items[0].id,a.id);assert.equal(f.store.list({workspaceFilter:'elsewhere',search:'telescope'}).items.length,0);
 assert.equal(f.store.list({search:a.id}).items[0].id,a.id);
});
test('attachment tree and reads reject traversal, links and unsupported active content',t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.root,'image.png'),Buffer.from([1,2,3]));
 assert.ok(f.store.tree().items.some(row=>row.path==='image.png'));assert.equal(f.store.asset({path:'image.png'}).mediaType,'image/png');fs.writeFileSync(path.join(f.root,'External.md'),'# External note\n\n![Image](image.png)');assert.equal(f.store.asset({path:'External.md'}).content,'# External note\n\n![Image](image.png)');
 assert.throws(()=>f.store.asset({path:'../image.png'}),/Invalid/);fs.symlinkSync('/etc/passwd',path.join(f.root,'escape.png'));assert.throws(()=>f.store.asset({path:'escape.png'}),/links/);assert.throws(()=>f.store.asset({path:'page.html'}),/supported/);
});
test('scratch files and SQLite index preserve stable identity through rename and project moves',t=>{
 const f=fixture(t),row=f.create();assert.match(row.relative,/Personal--workspace-a\/Project A--project-a\/Draft--/);assert.equal(f.store.read({id:row.id}).body,'# Notes\n');
 const rename=f.store.mutate({action:'rename',operationId:randomUUID(),id:row.id,expectedRevision:row.revision,title:'Renamed'});assert.equal(rename.id,row.id);assert.equal(fs.existsSync(path.join(f.root,row.relative)),false);
 const moved=f.store.mutate({action:'move',operationId:randomUUID(),id:row.id,expectedRevision:rename.revision,association:{workspaceId:'workspace-b',projectId:'project-b',workspaceName:'Work',projectName:'Other'}});
 assert.equal(moved.projectId,'project-b');assert.equal(f.store.list({scope:'project:project-a'}).items.length,0);assert.equal(f.store.list({scope:'project:project-b'}).items[0].id,row.id);assert.match(f.store.read({id:row.id}).text,/project_id: project-b/);
});
test('explicit synchronization imports manual files, normalizes metadata and observes external deletion',t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.root,'Manual.md'),'# Outside editor\n');const report=f.store.sync();assert.equal(report.added,1);assert.deepEqual(report.errors,[]);
 const row=f.store.list().items[0],file=path.join(f.root,row.relative);assert.match(fs.readFileSync(file,'utf8'),/scratch_id:/);assert.equal(f.store.read({id:row.id}).body,'# Outside editor\n');
 const before=fs.statSync(file).mtimeMs;assert.equal(f.store.sync().unchanged,1);assert.equal(fs.statSync(file).mtimeMs,before,'Unchanged sync does not rewrite files');
 fs.unlinkSync(file);assert.equal(f.store.sync().removed,1);assert.equal(f.store.list().items.length,0);assert.equal(f.store.list({deleted:true}).items[0].id,row.id);
});
test('manual edits and stale revisions are preserved until an explicit sync',t=>{
 const f=fixture(t),row=f.create(),file=path.join(f.root,row.relative),text=fs.readFileSync(file,'utf8')+'Human edit\n';fs.writeFileSync(file,text);
 assert.throws(()=>f.store.mutate({action:'update',id:row.id,expectedRevision:row.revision,operationId:randomUUID(),body:'Stale draft'}),error=>error.code==='SCRATCH_REJECTED'&&/changed on disk/.test(error.message));assert.equal(fs.readFileSync(file,'utf8'),text);
 assert.equal(f.store.sync({scope:row.scope}).updated,1);const current=f.store.read({id:row.id});assert.match(current.body,/Human edit/);
 assert.throws(()=>f.store.mutate({action:'update',id:row.id,expectedRevision:row.revision,operationId:randomUUID(),body:'Stale draft'}),/revision changed/);
});
test('same operation replays the exact receipt and conflicting arguments never write',t=>{
 const f=fixture(t),args={action:'create',operationId:randomUUID(),title:'Only once',body:'Body'};
 const first=f.store.mutate(args);assert.deepEqual(f.store.mutate(args),first);assert.equal(f.store.list().items.length,1);assert.throws(()=>f.store.mutate({...args,title:'Different'}),/different scratch changes/);
});
test('an interrupted file commit reconciles from its original operation without duplicating files',t=>{
 const f=fixture(t),args={action:'create',operationId:randomUUID(),title:'Interrupted',body:'Durable body'},index=f.store.index.bind(f.store);f.store.index=()=>{throw Error('Synthetic crash after file commit');};
 assert.throws(()=>f.store.mutate(args),/Synthetic crash/);f.store.index=index;
 const report=f.store.sync();assert.equal(report.added,0);assert.ok(report.errors.some(row=>row.error.includes('interrupted save')));
 const row=f.store.mutate(args);assert.equal(f.store.read({id:row.id}).body,'Durable body');assert.equal(f.store.list().items.length,1);assert.equal(fs.readdirSync(f.root).filter(file=>file.startsWith('Interrupted')).length,1);
});
test('an outside edit after interrupted commit is not overwritten by operation retry',t=>{
 const f=fixture(t),args={action:'create',operationId:randomUUID(),title:'Interrupted',body:'First'},index=f.store.index.bind(f.store);f.store.index=()=>{throw Error('Synthetic interrupted index');};assert.throws(()=>f.store.mutate(args));f.store.index=index;
 const file=path.join(f.root,fs.readdirSync(f.root).find(file=>file.startsWith('Interrupted')));fs.appendFileSync(file,'\nHuman edit');const human=fs.readFileSync(file,'utf8');assert.throws(()=>f.store.mutate(args),error=>!error.code&&/changed on disk/.test(error.message));assert.equal(fs.readFileSync(file,'utf8'),human);
});
test('duplicate IDs cannot overwrite another scratch or reassign a captured project by frontmatter',t=>{
 const f=fixture(t),row=f.create(),text=f.store.read({id:row.id}).text;
 assert.throws(()=>f.create({body:text,association:{workspaceId:'b',projectId:'b'}}),/identity already exists/);
 fs.writeFileSync(path.join(f.root,'Duplicate.md'),text);const report=f.store.sync();assert.equal(report.updated,0);assert.equal(report.errors.length,2);assert.equal(f.store.row(row.id).projectId,'project-a');
});
test('scoped scans do not read or import another registered project',t=>{
 const f=fixture(t),a=f.create(),b=f.create({association:{workspaceId:'workspace-a',projectId:'project-b',workspaceName:'Personal',projectName:'Project B'}});
 fs.appendFileSync(path.join(f.root,b.relative),'\nOther project change');const report=f.store.sync({scope:a.scope});assert.deepEqual(report.errors,[]);assert.equal(report.updated,0);assert.throws(()=>f.store.read({id:b.id}),/outside Proteus/);
});
test('symlinks and path traversal never read outside the configured root',t=>{
 const f=fixture(t),outside=path.join(f.directory,'outside.md');fs.writeFileSync(outside,'Private outside fixture');fs.symlinkSync(outside,path.join(f.root,'Linked.md'));
 const report=f.store.sync();assert.equal(report.added,0);assert.match(report.errors[0].error,/Symbolic links/);assert.throws(()=>f.store.readFile('../outside.md'),/Invalid scratch path/);assert.equal(fs.readFileSync(outside,'utf8'),'Private outside fixture');
});
test('delete removes the active file and retains a recoverable trash copy',t=>{
 const f=fixture(t),row=f.create(),deleted=f.store.mutate({action:'delete',id:row.id,expectedRevision:row.revision,operationId:randomUUID()});assert.equal(fs.existsSync(path.join(f.root,row.relative)),false);assert.ok(fs.existsSync(path.join(f.root,deleted.relative)));assert.equal(f.store.list().items.length,0);assert.equal(f.store.sync().added,0);assert.throws(()=>f.store.read({id:row.id}),/deleted/);
});

test('virtual destinations stay visible without making empty folders; saves use workspace root',t=>{
 const f=fixture(t),association={workspaceId:'virtual-workspace',workspaceName:'Personal',projectId:'virtual-project',projectName:'Ideas'};
 const destination=f.store.directory(association);
 assert.equal(fs.existsSync(path.join(f.root,destination.relative)),false);
 assert.ok(f.store.tree().items.some(row=>row.path===destination.relative&&row.virtual));
 fs.mkdirSync(path.join(f.root,'User folder'));
 assert.ok(f.store.tree().items.some(row=>row.path==='User folder'));
 assert.deepEqual(f.store.sync().errors,[]);
 const row=f.create({association:{workspaceId:'virtual-workspace',workspaceName:'Personal'}});
 assert.match(row.relative,/^Personal--virtual-workspace\/Draft--/);
 assert.equal(fs.existsSync(path.join(f.root,'Personal--virtual-workspace','Unassigned')),false);
 assert.equal(fs.existsSync(path.join(f.root,destination.relative)),false);
 assert.ok(fs.existsSync(path.join(f.root,row.relative)));
});
