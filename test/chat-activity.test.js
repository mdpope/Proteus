import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chatActivityAt,runSummary,remoteRun} from '../src/remote.js';

const at=minute=>`2026-10-17T12:${String(minute).padStart(2,'0')}:00.000Z`;
const fixture=()=>({id:'synthetic',trigger:'chat',status:'completed',createdAt:at(0),updatedAt:at(20),events:[],schedule:{provider:'rehearsal',name:'Synthetic',workspace:{cwd:'/synthetic',additionalDirectories:[]}}});
test('chat activity follows accepted user sends and queued timestamps, not provider output or metadata',()=>{
 const run=fixture();run.events=[{role:'user',at:at(1)},{role:'assistant',at:at(9)},{role:'system',at:at(10)},{role:'user',at:at(11),data:{delivery:{id:'failed',state:'failed'}}},{role:'user',at:at(12),data:{delivery:{id:'pending',state:'sending'}}}];
 assert.equal(chatActivityAt(run),at(1));
 run.updatedAt=at(21);run.queuedMessages=[{id:'queue',at:at(5),editedAt:at(15)},{id:'failed',at:at(11)}];
 assert.equal(chatActivityAt(run),at(5));
 run.updatedAt=at(22);run.events.push({role:'user',at:at(7),data:{delivery:{id:'delivered',state:'steered'}}});
 assert.equal(runSummary(run).lastActivityAt,at(7));assert.equal(remoteRun(run).lastActivityAt,at(7));
 run.updatedAt=at(23);run.title='Renamed';run.archivedAt=at(23);assert.equal(chatActivityAt(run),at(7));
});
test('activity falls back to creation, preserves unknown dates and avoids reloading unchanged histories',()=>{
 const run=fixture();assert.equal(chatActivityAt(run),at(0));
 const unknown={...fixture(),createdAt:'invalid'};assert.equal(chatActivityAt(unknown),null);
 let reads=0;const lazy=fixture();Object.defineProperty(lazy,'events',{get(){reads++;return [{role:'user',at:at(2)}];}});
 assert.equal(chatActivityAt(lazy),at(2));assert.equal(chatActivityAt(lazy),at(2));assert.equal(reads,1);
 lazy.updatedAt=at(24);assert.equal(chatActivityAt(lazy),at(2));assert.equal(reads,2);
});
test('active delivery settlement is observed even when the clock timestamp is unchanged',()=>{
 const run=fixture();run.status='running';run.events=[{role:'user',at:at(5),data:{delivery:{id:'steer',state:'sending'}}}];
 assert.equal(chatActivityAt(run),at(0));run.events[0].data.delivery.state='steered';assert.equal(chatActivityAt(run),at(5));
});
test('state, chat index and chat-view expose the same user activity timestamp',async t=>{
 const {startServer}=await import('../src/server.js');const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-chat-activity-'));
 const app=await startServer({home,port:0,timers:false,withSeed:false,providers:{rehearsal:{async run(){}}}});
 t.after(async()=>{await app.close();fs.rmSync(home,{recursive:true,force:true});});
 const run=app.engine.createRun({schemaVersion:1,id:'activity',name:'Activity fixture',enabled:false,cron:'0 9 * * *',timezone:'UTC',provider:'rehearsal',model:'',workspace:{cwd:home,additionalDirectories:[]},misfire:'skip',prompt:'Synthetic activity test'},'chat',null,{deferStart:true});
 run.createdAt=at(0);run.events=[{role:'user',at:at(3),text:'Synthetic accepted message'},{role:'assistant',at:at(9),text:'Synthetic provider response'}];run.status='completed';app.engine.persist(run);
 const read=async route=>{const response=await fetch(app.origin+route,{headers:{authorization:'Bearer '+app.token}});assert.equal(response.status,200);return response.json();};
 assert.equal((await read('/api/state?summaries=1')).runs.find(row=>row.id===run.id).lastActivityAt,at(3));
 assert.equal((await read('/api/chats/index')).items.find(row=>row.chatId===run.id).lastActivityAt,at(3));
 assert.equal((await read('/api/chat-view?id='+run.id)).lastActivityAt,at(3));
});
