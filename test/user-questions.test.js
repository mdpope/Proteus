import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Engine} from '../src/engine.js';
import {remoteRun} from '../src/services/remote/remote.js';
import {chatQuestions} from '../public/features/chats/user-questions.js';
const until=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(resolve=>setTimeout(resolve,5));}throw Error('Synthetic question timed out');};
function fixture(t,provider={async run(){}}){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-user-question-'));let engine=new Engine(home,{codex:provider});
 const run=engine.createRun({schemaVersion:1,id:'questions',name:'Synthetic questions',enabled:false,provider:'codex',model:'fixture',workspace:{cwd:home,additionalDirectories:[]},cron:'0 9 * * 1-5',timezone:'UTC',misfire:'skip',prompt:'Synthetic test'},'chat');
 t.after(async()=>{await engine.close();fs.rmSync(home,{recursive:true,force:true});});
 return {engine,run,home};
}
function question(engine,run,item='item-1'){
 engine.event(run,'assistant','Choose a destination.',{providerItemId:item,userQuestions:[{title:'Where should this open?',options:['Project A','Project B']},{title:'Any instructions?'}]});return run.userQuestions[0];
}
test('structured questions survive paging/restart without inferring questions from prose or expiring them',async t=>{
 const {engine,run,home}=fixture(t);await until(()=>run.status==='completed');
 engine.event(run,'assistant','Should this be a question?');assert.equal(run.userQuestions,undefined);
 const q=question(engine,run);question(engine,run);assert.equal(run.userQuestions.length,2);
 for(let i=0;i<120;i++)engine.event(run,'system','Synthetic later message');
 const remote=remoteRun(run);assert.ok(remote.eventStart>q.eventIndex);assert.deepEqual(remote.userQuestions,run.userQuestions);assert.equal(chatQuestions(remote).length,2);
 await engine.close();const reopened=new Engine(home);t.after(()=>reopened.close());assert.equal(reopened.getRun(run.id).userQuestions[0].status,'pending');assert.equal(reopened.getRun(run.id).userQuestions[0].id,q.id);
});
test('answered asynchronous question uses existing session once; conflicting or unrelated operations cannot answer it',async t=>{
 const seen=[],provider={async run({prompt}){seen.push(prompt);}};const {engine,run}=fixture(t,provider);await until(()=>run.status==='completed');run.providerSessionId='same-session';const q=question(engine,run);
 await engine.answerQuestion(run.id,q.id,'Project B','answer-1');await engine.answerQuestion(run.id,q.id,'Project B','answer-1');await until(()=>run.status==='completed');
 assert.equal(run.providerSessionId,'same-session');assert.equal(q.status,'answered');assert.equal(seen.length,2);assert.match(seen[1],/Where should this open\?[\s\S]*Project B/);assert.equal(run.events.filter(e=>e.data?.questionReply?.requestId===q.id).length,1);
 await assert.rejects(engine.answerQuestion(run.id,q.id,'Changed','answer-1'),/already has/);
 const second=run.userQuestions[1];await assert.rejects(engine.answerQuestion(run.id,second.id,'Custom','answer-1'),/already in use/);assert.equal(second.status,'pending');
 run.providerSessionId='different';await assert.rejects(engine.answerQuestion(run.id,second.id,'Custom','answer-2'),/session changed/);
});
test('in-flight answer clicks and ambiguous steering never replay a response',async t=>{
 let finish,release,steers=0;const gate=new Promise(resolve=>finish=resolve),transport=new Promise(resolve=>release=resolve);
 const provider={async run(){await gate;},async steer(){steers++;await transport;throw Error('Uncertain transport');}};
 const {engine,run}=fixture(t,provider);t.after(()=>finish());await until(()=>run.status==='running');run.providerSessionId='native';const q=question(engine,run);
 const first=engine.answerQuestion(run.id,q.id,'Custom answer','answer-steer');
 await assert.rejects(engine.answerQuestion(run.id,q.id,'Custom answer','answer-steer'),/unconfirmed/);assert.equal(steers,1);release();await assert.rejects(first,/Uncertain transport/);
 await assert.rejects(engine.answerQuestion(run.id,q.id,'Custom answer','answer-steer'),/unconfirmed/);assert.equal(steers,1);assert.equal(q.status,'uncertain');finish();
});
test('ordinary requests remain separate from permissions and provider resolution clears only its question',async t=>{
 const {engine,run}=fixture(t);await until(()=>run.status==='completed');run.status='running';const controller=new AbortController();
 const waiting=engine.ask(run,{type:'question',question:'Native question',choices:['A','B']},controller.signal);await until(()=>run.pending);const requestId=run.pending.id;
 assert.equal(chatQuestions(remoteRun(run))[0].blocking,true);controller.abort({code:'provider-resolved'});await assert.rejects(waiting,/request ended/);assert.equal(run.pending,null);assert.equal(run.status,'running');assert.equal(run.events.find(e=>e.data?.question?.id===requestId).data.question.status,'resolved');
 run.status='completed';engine.persist(run);
});
test('nonblocking native questions leave the turn running and answer through their RPC without steering',async t=>{
 const {engine,run}=fixture(t);await until(()=>run.status==='completed');run.status='running';run.providerSessionId='same';let response;
 const controller=new AbortController(),waiting=engine.ask(run,{type:'question',isBlocking:false,autoResolutionMs:60000,question:'Keep working?',choices:['Continue','Pause']},controller.signal).then(value=>response=value);
 assert.equal(run.status,'running');assert.equal(run.pending,null);const q=run.userQuestions[0];assert.equal(q.autoResolutionMs,60000);
 await engine.answerQuestion(run.id,q.id,'Continue','native-answer');await waiting;assert.equal(response,'Continue');assert.equal(q.deliveryState,'native-input');assert.equal(engine.backgroundQuestions.size,0);
 await engine.answerQuestion(run.id,q.id,'Continue','native-answer');assert.equal(run.events.filter(e=>e.data?.questionReply).length,1);
 const resolved=new AbortController(),second=engine.ask(run,{type:'question',isBlocking:false,question:'Second'},resolved.signal);resolved.abort({code:'provider-resolved'});await assert.rejects(second,/request ended/);assert.equal(run.userQuestions[1].status,'resolved');assert.equal(run.status,'running');run.status='completed';engine.persist(run);
});
