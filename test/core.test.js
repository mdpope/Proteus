import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { nextRuns, validateSchedule, ScheduleStore, lastDue, revision } from '../src/schedules.js';
import { atomicJSON, isWithin } from '../src/files.js';
import { Engine } from '../src/engine.js';
import { startServer } from '../src/server.js';

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'proteus-test-'));
const example = cwd => ({ schemaVersion:1,id:'sample',name:'Sample',enabled:false,cron:'0 9 * * 1-5',timezone:'America/Denver',provider:'rehearsal',model:'',workspace:{cwd,additionalDirectories:[]},misfire:'skip',prompt:'Check the workspace.' });
const until = async predicate => { for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw new Error('Condition timed out.'); };

test('five-field cron honors Denver daylight saving transitions', () => {
  const dates=nextRuns('0 9 * * 1-5','America/Denver',new Date('2026-10-30T16:00:01Z'),2);
  assert.deepEqual(dates,['2026-11-02T16:00:00.000Z','2026-11-03T16:00:00.000Z']);
  assert.throws(()=>nextRuns('* * * * * *','America/Denver'),/five-field/);
  assert.throws(()=>nextRuns('0 9 * * 1-5','Mars/Olympus'));
});
test('invalid IDs and workspace roots never become paths', () => {
  assert.throws(()=>validateSchedule({...example('/tmp'),id:'../escape'}),/id/);
  assert.throws(()=>validateSchedule({...example('/tmp'),workspace:{cwd:'relative',additionalDirectories:[]}}),/absolute/);
  assert.throws(()=>validateSchedule({...example('/tmp'),provider:'copilot',model:'auto'}),/explicit/);
});
test('saving rejects stale edits and preserves extension fields', () => {
  const dir=temp();try{
    const store=new ScheduleStore(dir);const s={...example(dir),extension:{owner:'test'}};store.save(s);
    const old=revision(s);atomicJSON(path.join(dir,'sample.json'),{...s,prompt:'Changed externally'});
    assert.throws(()=>store.save({...s,name:'Stale editor'},old),/changed outside/);
    assert.equal(store.get('sample').prompt,'Changed externally');
    const fresh=store.get('sample');store.save({...fresh,name:'Updated'},revision(fresh));assert.deepEqual(store.get('sample').extension,{owner:'test'});
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('malformed external files are listed as errors and cannot run', () => {
  const dir=temp();try{fs.writeFileSync(path.join(dir,'broken.json'),'{');const store=new ScheduleStore(dir);assert.equal(store.list().length,1);assert.ok(store.list()[0].error);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('directory checks reject symlink escapes and sibling-prefix paths', () => {
  const dir=temp();try{const root=path.join(dir,'work');fs.mkdirSync(root);fs.mkdirSync(path.join(dir,'work-other'));fs.symlinkSync(path.join(dir,'work-other'),path.join(root,'escape'));assert.equal(isWithin(path.join(root,'escape'),[root]),false);assert.equal(isWithin(root,[root]),true);assert.equal(isWithin(path.join(dir,'work-other'),[root]),false);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('rehearsal feedback is durable and runs retain their original schedule', async () => {
  const dir=temp();const engine=new Engine(dir);try{
    const s=example(dir);const run=engine.createRun(s);s.prompt='Later edit';
    await until(()=>run.status==='awaiting_input');assert.equal(run.schedule.prompt,'Check the workspace.');
    assert.throws(()=>engine.reply(run.id,'reply','stale'),/no longer/);
    engine.reply(run.id,'Check dependencies',run.pending.id);await until(()=>run.status==='completed');
    await engine.close();const restored=new Engine(dir);assert.ok(restored.getRun(run.id).events.some(e=>e.text.includes('Check dependencies')));assert.equal(restored.getRun(run.id).usage.observed,false);await restored.close();
  }finally{await engine.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('a stopped runner leaves work resumable and rejects parallel turns', async () => {
  const dir=temp();const engine=new Engine(dir);try{
    const run=engine.createRun(example(dir));await until(()=>run.status==='awaiting_input');
    assert.throws(()=>engine.createRun(example(dir)),/active run/);assert.throws(()=>engine.resume(run.id,'again'),/active turn/);
    await engine.close();await until(()=>run.status==='interrupted');const restored=new Engine(dir);assert.equal(restored.getRun(run.id).pending,null);restored.resume(run.id,'Continue after restart');await until(()=>restored.getRun(run.id).status==='awaiting_input');await restored.close();
  }finally{await engine.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('scheduler claims an occurrence once, even if polled repeatedly', async () => {
  const dir=temp();let now=new Date('2026-09-30T14:59:59Z');const engine=new Engine(dir,{},()=>now);try{
    engine.schedules.save({...example(dir),enabled:true});now=new Date('2026-09-30T15:00:01Z');engine.tick();engine.tick();assert.equal(engine.listRuns().length,1);assert.equal(engine.listRuns()[0].slot,'2026-09-30T15:00:00.000Z');
    now=new Date('2026-09-30T15:00:20Z');engine.tick();assert.equal(engine.listRuns().length,1);
  }finally{await engine.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('missed runs skip or coalesce according to the schedule', async () => {
  for(const policy of ['skip','coalesce']){const dir=temp();let now=new Date('2026-09-30T14:00:00Z');const engine=new Engine(dir,{},()=>now);try{engine.schedules.save({...example(dir),enabled:true,misfire:policy});now=new Date('2026-09-30T17:00:00Z');engine.tick();assert.equal(engine.listRuns().length,policy==='skip'?0:1);}finally{await engine.close();fs.rmSync(dir,{recursive:true,force:true});}}
});
test('partial run/journal persistence cannot replay the same occurrence', async () => {
  const dir=temp();let now=new Date('2026-09-30T15:00:01Z');const engine=new Engine(dir,{},()=>now);try{
    const s={...example(dir),enabled:true};engine.schedules.save(s);engine.createRun(s,'scheduled','2026-09-30T15:00:00.000Z');
    engine.journal.lastPoll='2026-09-30T14:59:59Z';engine.tick();assert.equal(engine.listRuns().length,1);
  }finally{await engine.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('loopback API enforces authentication, origin, duplicate IDs, and paused imports', async () => {
  const dir=temp();const app=await startServer({home:dir,port:0,timers:false,withSeed:false});
  const headers={'Content-Type':'application/json',Authorization:`Bearer ${app.token}`};
  try{
    assert.equal((await fetch(app.origin+'/api/state')).status,401);
    assert.equal((await fetch(app.origin+'/api/chat',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:'{}'})).status,403);
    const response=await fetch(app.origin+'/api/import',{method:'POST',headers,body:JSON.stringify({schedules:[{...example(dir),enabled:true}]})});assert.equal(response.status,200);assert.equal(app.engine.schedules.get('sample').enabled,false);
    const dup=await fetch(app.origin+'/api/import',{method:'POST',headers,body:JSON.stringify({schedules:[example(dir)]})});assert.equal(dup.status,400);
    await assert.rejects(startServer({home:dir,port:0,timers:false}),/already owns/);
  }finally{await app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
