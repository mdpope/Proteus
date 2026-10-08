import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {atomicJSON} from '../src/files.js';
import {chatDelta} from '../src/chat-deltas.js';
import {mergeChatHistory} from '../public/chat-history.js';
import {startServer} from '../src/server.js';

test('atomic replacement preserves prior data and removes temp after every failed write stage',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-atomic-')),file=path.join(home,'state.json');
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
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-summary-'));let app;
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
 const {RunHistoryCache}=await import('../src/run-history-cache.js');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-history-cache-'));
 try{const cache=new RunHistoryCache(id=>path.join(home,id+'.json'),2),runs=[];
 for(let i=0;i<6;i++){const run={id:String(i),status:i===0?'running':'completed',events:[{text:'event '+i}]};atomicJSON(path.join(home,i+'.json'),run);runs.push(run);cache.attach(run);}
 assert.equal([...cache.entries.values()].filter(e=>e.events).length,3);const active=runs[0].events;
 assert.equal(runs[1].events[0].text,'event 1');assert.equal(runs[0].events,active);
 assert.equal([...cache.entries.values()].filter(e=>e.events).length,3);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
