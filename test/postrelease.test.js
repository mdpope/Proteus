import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {atomicJSON} from '../src/shared/files.js';
import {chatDelta} from '../src/services/chats/chat-deltas.js';
import {mergeChatHistory} from '../public/features/chats/chat-history.js';
import {startServer} from '../src/server.js';
import {RunHistoryCache} from '../src/services/chats/run-history-cache.js';
import {chatActivityAt} from '../src/services/chats/run-activity.js';
import {Engine} from '../src/engine.js';

test('atomic replacement preserves prior data and removes temp after every failed write stage',()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-atomic-')),file=path.join(home,'state.json');
 try{atomicJSON(file,{valid:true});for(const stage of ['openSync','writeFileSync','fsyncSync','renameSync']){
  const original=fs[stage];fs[stage]=()=>{throw Object.assign(new Error('disk full'),{code:'ENOSPC'});};
  try{assert.throws(()=>atomicJSON(file,{valid:false}),{code:'ENOSPC'});}finally{fs[stage]=original;}
  assert.deepEqual(JSON.parse(fs.readFileSync(file)),{valid:true});assert.deepEqual(fs.readdirSync(home),['state.json']);
 }atomicJSON(file,{recovered:true});assert.deepEqual(JSON.parse(fs.readFileSync(file)),{recovered:true});}finally{fs.rmSync(home,{recursive:true,force:true});}
});
test('history cursors deliver only changes, including edits at existing event positions',()=>{
 const run={id:'synthetic'},view={id:run.id,eventStart:0,eventCount:2,events:[{text:'question',data:{status:'pending'}},{text:'answer'}]};
 const first=chatDelta(run,view),second=chatDelta(run,view,first.historyCursor);
 assert.deepEqual(second.events,[]);assert.deepEqual(second.eventPatches,[]);
 const next=chatDelta(run,{...view,eventCount:3,events:[{text:'question',data:{status:'answered'}},{text:'answer'},{text:'new'}]},second.historyCursor);
 assert.deepEqual(next.eventPatches.map(p=>p.index),[0,2]);assert.deepEqual(mergeChatHistory(first,next).events.map(e=>e.text),['question','answer','new']);assert.equal(mergeChatHistory(first,next).events[0].data.status,'answered');
 assert.equal(chatDelta({id:'another'},{...view,id:'another'},first.historyCursor).events.length,2);
});
test('summary state omits histories and storage failure diagnostics do not escape the scheduler handler',async()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-summary-'));let app;
 try{app=await startServer({home,port:0,timers:false});
 const request=async route=>{const response=await fetch(app.url.split('/?')[0]+route,{headers:{Authorization:'Bearer '+app.token}});assert.equal(response.status,200);return response.json();};
 const run={id:'synthetic',title:'Synthetic',trigger:'chat',createdAt:new Date().toISOString(),status:'completed',schedule:{provider:'rehearsal',workspace:{cwd:home,additionalDirectories:[]}},usage:{observed:false},events:Array.from({length:600},(_,i)=>({role:'user',text:'message '+i}))};
 app.engine.runs.set(run.id,run);
 const state=await request('/api/state?summaries=1');assert.equal(state.runs[0].events,undefined);
 const view=await request('/api/chat-view?id=synthetic');assert.equal(view.events.length,100);assert.equal(view.eventStart,500);
 const delta=await request('/api/chat-view?id=synthetic&cursor='+view.historyCursor);assert.equal(delta.events.length,0);assert.deepEqual(delta.eventPatches,[]);
 const original=fs.openSync;fs.openSync=(file,...args)=>{if(String(file).includes('scheduler-errors.json'))throw Object.assign(new Error('disk full'),{code:'ENOSPC'});return original(file,...args);};
 try{assert.doesNotThrow(()=>app.engine.emit('scheduler-error',{error:'synthetic disk error'}));}finally{fs.openSync=original;}
 const failed=await request('/api/state?summaries=1');assert.equal(failed.schedulerErrors.at(-1).persistenceError,'ENOSPC');
 }finally{if(app)await app.close();fs.rmSync(home,{recursive:true,force:true});}
});

test('completed history cache reloads durable events and pins active references',async()=>{
 const {RunHistoryCache}=await import('../src/services/chats/run-history-cache.js');
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-history-cache-'));
 try{const cache=new RunHistoryCache(id=>path.join(home,id+'.json'),2),runs=[];
 for(let i=0;i<6;i++){const run={id:String(i),status:i===0?'running':'completed',events:[{text:'event '+i}]};atomicJSON(path.join(home,i+'.json'),run);runs.push(run);cache.attach(run);}
 assert.equal([...cache.entries.values()].filter(e=>e.events).length,3);const active=runs[0].events;
 assert.equal(runs[1].events[0].text,'event 1');assert.equal(runs[0].events,active);
 assert.equal([...cache.entries.values()].filter(e=>e.events).length,3);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});

test('history cache bounds resident bytes and releases oversized completed histories after projection',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-history-bytes-'));
 try{
  const inFlight=new Set(['active']),cache=new RunHistoryCache(id=>path.join(home,id+'.json'),4,{maxBytes:1500,isPinned:run=>inFlight.has(run.id)}),runs=[];
  for(let i=0;i<8;i++){const run={id:i===0?'active':String(i),status:'completed',createdAt:'2026-10-22T00:00:00.000Z',events:[{role:'user',text:'x'.repeat(600),at:'2026-10-22T01:00:00.000Z'}]};const size=atomicJSON(path.join(home,run.id+'.json'),run);assert.equal(size,fs.statSync(path.join(home,run.id+'.json')).size);cache.attach(run,size);runs.push(run);}
  const pinned=runs[0].events;assert.equal(cache.entries.get('active').events,pinned);
  assert.ok([...cache.resident.values()].filter(entry=>entry.run.id!=='active').reduce((sum,entry)=>sum+entry.bytes,0)<=1500);
  let reads=0;for(const run of runs){const descriptor=Object.getOwnPropertyDescriptor(run,'events');Object.defineProperty(run,'events',{...descriptor,get(){reads++;return descriptor.get();}});}
  assert.ok(runs.every(run=>chatActivityAt(run)==='2026-10-22T01:00:00.000Z'));assert.equal(reads,0,'summaries must not hydrate evicted transcripts');
  assert.equal(runs[1].events[0].text.length,600);assert.equal(reads,1);assert.equal(runs[0].events,pinned);
  const huge={id:'huge',status:'completed',events:[{text:'large'.repeat(1000)}]};cache.attach(huge,atomicJSON(path.join(home,'huge.json'),huge));
  assert.equal(huge.events[0].text.length,5000);await Promise.resolve();assert.equal(cache.entries.get('huge').events,null);
  assert.equal(runs[0].events,pinned);inFlight.clear();cache.trim();assert.ok([...cache.resident.values()].reduce((sum,entry)=>sum+entry.bytes,0)<=1500);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});

test('durable activity seed notices same-clock delivery settlement without rereading event arrays',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-activity-seed-'));
 try{
  const file=path.join(home,'run.json'),cache=new RunHistoryCache(()=>file),createdAt='2026-10-22T00:00:00.000Z',sentAt='2026-10-22T01:00:00.000Z';
  const run={id:'run',status:'running',createdAt,updatedAt:createdAt,events:[{role:'user',at:sentAt,text:'send',data:{delivery:{id:'message',state:'sending'}}}]};
  cache.attach(run,atomicJSON(file,run));assert.equal(chatActivityAt(run),createdAt);
  run.events[0].data.delivery.state='steered';cache.attach(run,atomicJSON(file,run));assert.equal(chatActivityAt(run),sentAt);
  run.events.push({role:'assistant',at:'2026-10-22T02:00:00.000Z',text:'response'});cache.attach(run,atomicJSON(file,run));assert.equal(chatActivityAt(run),sentAt);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});

test('question publication persists pending state and question history in one durable replacement',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-question-save-')),engine=new Engine(home);
 try{
  const run=engine.createRun({schemaVersion:1,id:'question',name:'Question',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'rehearsal',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic question'},'chat',null,{deferStart:true});
  run.status='running';let writes=0;const original=fs.fsyncSync;fs.fsyncSync=(...args)=>{writes++;return original(...args);};
  let waiting;try{waiting=engine.askNext(run,{type:'question',question:'Synthetic choice?',choices:['Continue']},new AbortController().signal);}finally{fs.fsyncSync=original;}
  assert.equal(writes,1);const saved=JSON.parse(fs.readFileSync(path.join(home,'runs',run.id+'.json')));assert.equal(saved.status,'awaiting_input');assert.equal(saved.events.at(-1).data.question.id,saved.pending.id);
  engine.reply(run.id,'Continue',run.pending.id);assert.equal(await waiting,'Continue');run.status='completed';engine.persist(run);
 }finally{await engine.close();fs.rmSync(home,{recursive:true,force:true});}
});
