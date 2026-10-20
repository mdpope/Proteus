import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Engine} from '../src/engine.js';
import {ActivityStore} from '../src/activity.js';

const schedule=cwd=>({schemaVersion:1,id:'synthetic',name:'Synthetic chat',enabled:false,cron:'0 9 * * 1-5',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic prompt'});
test('archive preserves history, delete tombstones it across restart, and active work is guarded',async()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-chat-lifecycle-'));
  const generated=path.join(home,'generated.md');fs.writeFileSync(generated,'Synthetic generated document');
  const engine=new Engine(home);
  try{
    const run=engine.createRun(schedule(home),'chat',null,{deferStart:true});
    assert.throws(()=>engine.lifecycle(run.id,'archive'),/Finish or cancel/);
    assert.throws(()=>engine.lifecycle(run.id,'delete'),/Finish or cancel/);
    run.deferredStart=false;run.status='completed';engine.persist(run);
    engine.running.set(run.id,{id:run.id});assert.throws(()=>engine.lifecycle(run.id,'delete'),/Finish or cancel/);engine.running.clear();
    const updatedAt=run.updatedAt;
    const archived=engine.lifecycle(run.id,'archive',{expectedUpdatedAt:updatedAt,expectedArchivedAt:null});
    assert.equal(archived.archived,true);assert.equal(run.updatedAt,updatedAt);assert.equal(engine.visibleRuns().length,0);
    assert.equal(engine.getRun(run.id).events.length,1);
    assert.throws(()=>engine.lifecycle(run.id,'unarchive',{expectedArchivedAt:'stale'}),/changed/);
    engine.lifecycle(run.id,'unarchive',{expectedArchivedAt:archived.archivedAt});
    assert.equal(engine.visibleRuns().length,1);
    const activity=new ActivityStore(home);activity.attach(engine,()=> 'synthetic-host');
    const journalBefore=JSON.stringify(engine.journal);
    const deleted=engine.lifecycle(run.id,'delete',{expectedUpdatedAt:updatedAt,expectedArchivedAt:null});
    assert.equal(deleted.deleted,true);assert.deepEqual(engine.journal,JSON.parse(journalBefore));
    assert.equal(fs.readFileSync(generated,'utf8'),'Synthetic generated document');
    assert.throws(()=>engine.getRun(run.id),/not found/);
    assert.equal(engine.visibleRuns(true).length,0);
    assert.equal(fs.existsSync(path.join(home,'runs',run.id+'.json')),false);
    assert.equal((await activity.logs(20)).items?.some(item=>item.event==='chat.undefined'),false);
    await engine.close();
    // A stale run file restored by sync/backup cannot reimport the deleted ID.
    fs.writeFileSync(path.join(home,'runs',run.id+'.json'),JSON.stringify(run));
    const restored=new Engine(home);assert.equal(restored.listRuns().length,0);assert.equal(fs.existsSync(path.join(home,'runs',run.id+'.json')),false);await restored.close();
    await activity.close();
  }finally{await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});
