import { fakeSession } from './fake-copilot.js';
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

test('settings persist defaults, preserve extensions, and reject stale or unavailable paths', async () => {
  const { SettingsStore }=await import('../src/settings.js'); const dir=temp();
  try { const store=new SettingsStore(dir,dir); const initial=store.get();
    store.save({...initial,extension:{retained:true},workspace:{cwd:dir,additionalDirectories:[dir]}},initial.revision);
    assert.deepEqual(new SettingsStore(dir,dir).get().extension,{retained:true});
    assert.throws(()=>store.save(initial,initial.revision),/changed outside/);
    const current=store.get();assert.throws(()=>store.save({...current,workspace:{cwd:'/directory-that-does-not-exist',additionalDirectories:[]}},current.revision));
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('new chat snapshots all configured roots, skills, MCP, and editor context', async () => {
  const dir=temp(); const provider={run:async()=>{}};
  const app=await startServer({home:dir,port:0,timers:false,withSeed:false,providers:{copilot:provider}});
  const headers={'Content-Type':'application/json',Authorization:`Bearer ${app.token}`};
  try { const initial=app.settings.get(); app.settings.save({...initial,workspace:{cwd:dir,additionalDirectories:[os.tmpdir()]},skillDirectories:[dir],mcpServers:{example:{type:'local',command:'example',tools:['*']}}},initial.revision);
    const response=await fetch(app.origin+'/api/chat',{method:'POST',headers,body:JSON.stringify({prompt:'Inspect workspace',editorContext:{activeFile:path.join(dir,'README.md')}})});
    assert.equal(response.status,200); const run=await response.json();
    assert.deepEqual(run.schedule.workspace.additionalDirectories,[fs.realpathSync(os.tmpdir())]);assert.deepEqual(run.schedule.skillDirectories,[dir]);assert.ok(run.schedule.mcpServers.example);assert.equal(run.schedule.editorContext.activeFile,path.join(dir,'README.md'));
  } finally { await app.close();fs.rmSync(dir,{recursive:true,force:true}); }
});

test('browser provider tools bind access to the actual run identity', async () => {
  const { browserTools }=await import('../src/browser-tools.js');const calls=[];
  assert.deepEqual(browserTools(null,'run'),[]);
  const tool=browserTools({agent:async(args,id)=>{calls.push({args,id});return {title:'Visible page'};}},'actual-run')[0];
  const result=await tool.handler({action:'snapshot',tabId:'one'});assert.match(result,/Visible page/);assert.equal(calls[0].id,'actual-run');
  assert.ok(!tool.parameters.properties.action.enum.includes('evaluate'));
  const empty = browserTools({agent:async()=>[]},'actual-run')[0];
  const listed = JSON.parse(await empty.handler({action:'list'}));
  assert.equal(listed.available,true);assert.deepEqual(listed.tabs,[]);
  assert.match(listed.nextStep,/Use open/);
  const failing=browserTools({agent:async()=>{throw new Error('locator.click: Timeout waiting for Search');}},'actual-run')[0];
  const failure=await failing.handler({action:'click',tabId:'one'});
  assert.equal(failure.resultType,'failure');assert.match(failure.error,/Timeout waiting for Search/);
});


test('parallel provider permissions queue without losing earlier requests', async () => {
  const dir=temp();const answers=[];
  const provider={run:async({ask})=>{answers.push(...await Promise.all(['one','two','three'].map(question=>ask({type:'permission',question}))));}};
  const engine=new Engine(dir,{copilot:provider});
  try { const run=engine.createRun({...example(dir),provider:'copilot',model:'test-model'});
    for(const question of ['one','two','three']) {
      await until(()=>run.pending?.question===question);engine.reply(run.id,'approve',run.pending.id);
    }
    await until(()=>run.status==='completed');assert.deepEqual(answers,['approve','approve','approve']);assert.equal(engine.questionQueues.size,0);
  } finally { await engine.close();fs.rmSync(dir,{recursive:true,force:true}); }
});

test('cancellation rejects both visible and queued permissions', async () => {
  const dir=temp();const answers=[];
  const provider={run:async({ask})=>{answers.push(...await Promise.allSettled(['one','two'].map(question=>ask({type:'permission',question}))));}};
  const engine=new Engine(dir,{copilot:provider});
  try { const run=engine.createRun({...example(dir),provider:'copilot',model:'test-model'});
    await until(()=>run.status==='awaiting_input');engine.cancel(run.id);await until(()=>run.status==='cancelled');assert.deepEqual(answers.map(a=>a.status),['rejected','rejected']);
  } finally { await engine.close();fs.rmSync(dir,{recursive:true,force:true}); }
});

test('Copilot adapter forwards explicit approval and rejection using current SDK decisions', async () => {
  const { CopilotProvider }=await import('../src/copilot.js');
  for(const answer of ['approve','approve-auto','deny']) {
    let decision;
    const provider=new CopilotProvider();
    const session=fakeSession({rpc:{usage:{getMetrics:async()=>({})}}});
    provider.connect=async()=>({listModels:async()=>[{id:'fixture'}],createSession:async config=>{
      session.send=async()=>{decision=await config.onPermissionRequest({kind:'read',path:'/fixture'});session.event('session.idle');};return session;
    }});
    await provider.run({run:{id:'fixture',schedule:{model:'fixture',workspace:{cwd:'/fixture',additionalDirectories:[]}},usage:{inputTokens:0,outputTokens:0}},prompt:'fixture',signal:new AbortController().signal,update:()=>{},emit:()=>{},ask:async()=>answer});
    assert.equal(decision.kind,answer==='deny'?'reject':'approve-once');
    assert.equal(decision.approvedInteractively,answer==='approve'?true:undefined);
  }
});


test('provider failure settles unanswered permissions before the same run resumes', async () => {
  const dir=temp();let attempt=0;let stale;
  const provider={run:async({ask})=>{
    if(attempt++===0) {
      stale=Promise.allSettled(['old one','old two'].map(question=>ask({type:'permission',question})));
      await new Promise(resolve=>setImmediate(resolve));
      throw new Error('Provider turn timed out');
    }
    assert.equal(await ask({type:'permission',question:'resumed request'}),'approve');
  }};
  const engine=new Engine(dir,{copilot:provider});
  try {
    const run=engine.createRun({...example(dir),provider:'copilot',model:'test-model'});
    await until(()=>run.status==='failed');
    await until(()=>engine.questionQueues.size===0);
    assert.deepEqual((await stale).map(result=>result.status),['rejected','rejected']);
    assert.equal(engine.pending.size,0);
    engine.resume(run.id,'Continue after the timeout');
    await until(()=>run.pending?.question==='resumed request');
    engine.reply(run.id,'approve',run.pending.id);
    await until(()=>run.status==='completed');
  } finally { await engine.close();fs.rmSync(dir,{recursive:true,force:true}); }
});

test('Copilot aborts a timed-out provider turn before disconnecting', async () => {
  const { CopilotProvider }=await import('../src/copilot.js');const calls=[];
  const session=fakeSession({send:async()=>{throw new Error('Timed out');},abort:async()=>calls.push('abort'),disconnect:async()=>calls.push('disconnect')});
  const provider=new CopilotProvider();
  provider.connect=async()=>({listModels:async()=>[{id:'fixture'}],createSession:async()=>session});
  await assert.rejects(provider.run({run:{id:'fixture',schedule:{model:'fixture',workspace:{cwd:'/fixture',additionalDirectories:[]}},usage:{inputTokens:0,outputTokens:0}},prompt:'fixture',signal:new AbortController().signal,update:()=>{},emit:()=>{},ask:async()=>{throw new Error('Unexpected permission request');}}),/Timed out/);
  assert.deepEqual(calls,['abort','disconnect']);
});

test('question history retains wording, option descriptions, stable reply links and interrupted requests',async()=>{
 const dir=temp();const answers=[];const provider={run:async({ask})=>{for(const name of ['first','second'])answers.push(await ask({type:'question',question:name+' wording',choices:['A','B'],optionDetails:[{label:'A',description:'original explanation'},{label:'B',description:'another explanation'}],providerQuestionId:name}));}};
 const engine=new Engine(dir,{copilot:provider});
 try{const run=engine.createRun({...example(dir),provider:'copilot',model:'test-model'});await until(()=>run.pending?.question==='first wording');const first=run.pending.id;engine.reply(run.id,'freeform answer',first);await until(()=>run.pending?.question==='second wording');
 const firstEvent=run.events.find(e=>e.data?.question?.id===first);assert.equal(firstEvent.data.question.answer,'freeform answer');assert.match(firstEvent.text,/original explanation/);assert.equal(firstEvent.data.question.providerQuestionId,'first');assert.equal(run.events.find(e=>e.data?.questionReply)?.data.questionReply.requestId,first);
 engine.cancel(run.id);await until(()=>!engine.running);assert.equal(run.events.find(e=>e.data?.question?.providerQuestionId==='second').data.question.status,'cancelled');assert.deepEqual(answers,['freeform answer']);
 const persisted=JSON.parse(fs.readFileSync(path.join(dir,'runs',run.id+'.json'),'utf8'));assert.equal(persisted.events.find(e=>e.data?.question?.id===first).data.question.answer,'freeform answer');
 }finally{await engine.close();fs.rmSync(dir,{recursive:true,force:true});}
});
