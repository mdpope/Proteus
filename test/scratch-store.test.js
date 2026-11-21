import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ScratchStore} from '../src/services/scratchpad/scratch-store.js';
import {recoverScratchPath} from '../src/services/scratchpad/scratch-path-migration.js';

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
test('readable Scratchpad paths keep stable IDs and do not claim an existing name',t=>{
 const f=fixture(t),first=f.create({title:'Untitled'});
 const renamed=f.store.mutate({action:'update',id:first.id,title:'Orchards & Weather',expectedRevision:first.revision,operationId:randomUUID()});
 assert.equal(renamed.relative,'Personal/Project A/Orchards & Weather.md');
 assert.equal(f.store.list({search:'Orchards & Weather'}).items[0].id,first.id);
 const second=f.create({title:'orchards & weather'});
 assert.equal(second.relative,'Personal/Project A/orchards & weather (2).md');
 assert.equal(f.store.read({id:first.id}).body,'# Notes\n');
 const separate=f.create({association:{workspaceId:'workspace-b',workspaceName:'personal',projectId:'project-b',projectName:'Project A'}});
 assert.equal(separate.relative,'personal (2)/Project A/Draft.md');
 const legacyPath='Personal/Project A/Untitled--'+first.id+'.md';
 fs.renameSync(path.join(f.root,renamed.relative),path.join(f.root,legacyPath));
 assert.deepEqual(f.store.sync().errors,[]);
 const old=f.store.read({id:first.id});
 assert.equal(old.relative,legacyPath);
 const migrated=f.store.mutate({action:'rename',id:old.id,title:old.title,expectedRevision:old.revision,operationId:randomUUID()});
 assert.equal(migrated.relative,renamed.relative);
 assert.equal(migrated.id,first.id);
});
test('legacy path migration preserves bytes, IDs, relative links and existing destinations',t=>{
 const f=fixture(t),note=f.create({association:{workspaceId:'old-ws',workspaceName:'Studio 📁',projectId:'old-project',projectName:'Design'}});
 const bytes=fs.readFileSync(path.join(f.root,note.relative));
 const fromWorkspace='Studio 📁--old-ws',fromProject=fromWorkspace+'/Design--old-project',fromNote=fromProject+'/Draft--'+note.id+'.md';
 fs.renameSync(path.join(f.root,'Studio 📁'),path.join(f.root,fromWorkspace));
 fs.renameSync(path.join(f.root,fromWorkspace,'Design'),path.join(f.root,fromProject));
 fs.renameSync(path.join(f.root,fromProject,'Draft.md'),path.join(f.root,fromNote));
 f.store.db.prepare('UPDATE directories SET relative=? WHERE scope=?').run(fromWorkspace,'workspace:old-ws');
 f.store.db.prepare('UPDATE directories SET relative=? WHERE scope=?').run(fromProject,note.scope);
 f.store.db.prepare('UPDATE scratches SET relative=? WHERE id=?').run(fromNote,note.id);
 fs.mkdirSync(path.join(f.root,'Studio 📁'));
 fs.writeFileSync(path.join(f.root,'Studio 📁','Keep.md'),'Existing content.');
 const plan=f.store.planPaths();assert.equal(plan.folders,2);assert.equal(plan.files,1);
 assert.deepEqual(fs.readFileSync(path.join(f.root,fromNote)),bytes);
 assert.throws(()=>f.store.migratePaths('different'),/Preview/);
 assert.deepEqual(f.store.migratePaths(plan.digest),{folders:2,files:1,missing:0});
 const migrated=f.store.read({id:note.id});assert.equal(migrated.relative,'Studio 📁 (2)/Design/Draft.md');
 assert.equal(migrated.revision,note.revision);assert.deepEqual(fs.readFileSync(path.join(f.root,migrated.relative)),bytes);
 assert.equal(f.store.asset({path:fromNote}).content,migrated.text);
 assert.equal(f.store.asset({path:'Studio 📁 (2)/Design/Draft--'+note.id+'.md'}).content,migrated.text);
 assert.equal(fs.readFileSync(path.join(f.root,'Studio 📁','Keep.md'),'utf8'),'Existing content.');
 assert.equal(f.store.planPaths().changes.length,0);
});
test('an interrupted legacy path rename reconciles the same filesystem object',t=>{
 const f=fixture(t),note=f.create(),from='Personal/Project A/Draft--'+note.id+'.md';
 fs.renameSync(path.join(f.root,note.relative),path.join(f.root,from));
 f.store.db.prepare('UPDATE scratches SET relative=? WHERE id=?').run(from,note.id);
 const [intent]=f.store.planPaths().changes;
 f.store.db.prepare('INSERT INTO scratch_path_migration VALUES(1,?)').run(JSON.stringify(intent));
 fs.renameSync(path.join(f.root,intent.from),path.join(f.root,intent.to));
 recoverScratchPath(f.store);
 assert.equal(f.store.read({id:note.id}).relative,note.relative);
 assert.equal(f.store.read({id:note.id}).revision,note.revision);
 assert.equal(f.store.planPaths().changes.length,0);
});
test('attachment tree and reads reject traversal, links and unsupported active content',t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.root,'image.png'),Buffer.from([1,2,3]));
 assert.ok(f.store.tree().items.some(row=>row.path==='image.png'));assert.equal(f.store.asset({path:'image.png'}).mediaType,'image/png');fs.writeFileSync(path.join(f.root,'External.md'),'# External note\n\n![Image](image.png)');assert.equal(f.store.asset({path:'External.md'}).content,'# External note\n\n![Image](image.png)');
 assert.throws(()=>f.store.asset({path:'../image.png'}),/Invalid/);fs.symlinkSync('/etc/passwd',path.join(f.root,'escape.png'));assert.throws(()=>f.store.asset({path:'escape.png'}),/links/);assert.throws(()=>f.store.asset({path:'page.html'}),/supported/);
});
test('scratch files and SQLite index preserve stable identity through rename and project moves',t=>{
 const f=fixture(t),row=f.create();assert.equal(row.relative,'Personal/Project A/Draft.md');assert.equal(f.store.read({id:row.id}).body,'# Notes\n');
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
 const movable=f.store.tree({associations:[association]}).items.find(row=>row.path===destination.relative);
 assert.equal(movable.virtual,true);
 assert.deepEqual(movable.association,{workspaceId:association.workspaceId,projectId:association.projectId});
 fs.mkdirSync(path.join(f.root,'User folder'));
 assert.equal(f.store.tree({associations:[association]}).items.find(row=>row.path==='User folder').association,undefined);
 assert.deepEqual(f.store.sync().errors,[]);
 const row=f.create({association:{workspaceId:'virtual-workspace',workspaceName:'Personal'}});
 assert.equal(row.relative,'Personal/Draft.md');
 assert.equal(fs.existsSync(path.join(f.root,'Personal','Unassigned')),false);
 assert.equal(fs.existsSync(path.join(f.root,destination.relative)),false);
 assert.ok(fs.existsSync(path.join(f.root,row.relative)));
});

test('a pasted Scratchpad image remains addressable when the note moves between projects',async t=>{
 const f=fixture(t),row=f.create(),data='iVBORw0KGgo=';
 const asset=await f.store.paste({id:row.id,data,mediaType:'image/png'});
 assert.equal(f.store.asset({path:asset.name}).data,data);
 f.store.mutate({action:'move',operationId:randomUUID(),id:row.id,expectedRevision:row.revision,association:{workspaceId:'workspace-b',projectId:'project-b'}});
 assert.equal(f.store.asset({path:asset.name}).data,data);
 assert.deepEqual(await f.store.paste({id:row.id,data,mediaType:'image/png'}),asset);
});
