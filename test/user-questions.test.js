import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {clearQuestionFromQueue} from '../src/services/chats/user-questions.js';
import {startServer} from '../src/server.js';
import {Engine} from '../src/engine.js';
import {RemoteHost,remoteRun} from '../src/services/remote/remote.js';
import {chatQuestions} from '../public/features/chats/user-questions.js';
const until=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(resolve=>setTimeout(resolve,5));}throw Error('Synthetic question timed out');};
function fixture(t,provider={async run(){}}){
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-user-question-'));let engine=new Engine(home,{codex:provider});
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


test('clearing queue visibility survives restart and paging while the original question remains answerable',async t=>{
 const {engine,run,home}=fixture(t);await until(()=>run.status==='completed');const q=question(engine,run);const original=JSON.stringify(run.events),count=run.events.length;
 clearQuestionFromQueue(engine,run.id,q.id);const stamp=run.questionQueueCleared[q.id];clearQuestionFromQueue(engine,run.id,q.id);
 assert.equal(run.questionQueueCleared[q.id],stamp);assert.equal(q.status,'pending');assert.equal(run.events.length,count);assert.equal(JSON.stringify(run.events),original);assert.equal(run.queuedMessages?.length||0,0);
 assert.equal(chatQuestions(remoteRun(run)).find(item=>item.id===q.id).queueCleared,true);
 await engine.close();const reopened=new Engine(home,{codex:{async run(){}}});t.after(()=>reopened.close());const restored=reopened.getRun(run.id);assert.equal(restored.questionQueueCleared[q.id],stamp);
 await reopened.answerQuestion(run.id,q.id,'Later answer','cleared-answer');assert.equal(restored.userQuestions[0].status,'answered');assert.equal(restored.events.filter(e=>e.data?.questionReply?.requestId===q.id).length,1);
});
test('clearing a blocking question never resolves its wait or an approval; later explicit reply still works',async t=>{
 const {engine,run}=fixture(t);await until(()=>run.status==='completed');run.status='running';const controller=new AbortController();let answered=false;
 const waiting=engine.ask(run,{type:'question',question:'Still needed?'},controller.signal).then(value=>{answered=true;return value;});await until(()=>run.pending);const pending=run.pending;
 clearQuestionFromQueue(engine,run.id,pending.id);assert.equal(run.pending,pending);assert.equal(answered,false);assert.equal(chatQuestions(remoteRun(run)).find(q=>q.id===pending.id).queueCleared,true);
 await engine.reply(run.id,'Changed my mind',pending.id);assert.equal(await waiting,'Changed my mind');
 assert.throws(()=>clearQuestionFromQueue(engine,run.id,undefined),/Choose a question/);assert.throws(()=>clearQuestionFromQueue(engine,run.id,'missing'),/no longer/);
 run.pending={id:'permission-only',type:'permission'};assert.throws(()=>clearQuestionFromQueue(engine,run.id,'permission-only'),/no longer/);run.pending=null;run.status='completed';engine.persist(run);
});


test('remote question queue review is human-only and does not share answer or permission side effects',async t=>{
 const {engine,run}=fixture(t);await until(()=>run.status==='completed');const q=question(engine,run),owner={service:{engine}};
 await assert.rejects(RemoteHost.prototype.execute.call(owner,{},'chat.clear-question',{id:run.id,questionId:q.id,agentControl:true}),/human chat/);
 assert.equal(run.questionQueueCleared,undefined);
 await RemoteHost.prototype.execute.call(owner,{},'chat.clear-question',{id:run.id,questionId:q.id});assert.equal(q.status,'pending');assert.ok(run.questionQueueCleared[q.id]);
});


test('authenticated owner route clears only queue membership and returns review metadata to paged views',async()=>{
 const home=fs.realpathSync(privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-question-clear-api-')));let app;
 try{
  app=await startServer({home,port:0,timers:false,providers:{codex:{async run(){}}}});
  const run=app.engine.createRun({schemaVersion:1,id:'questions-api',name:'Synthetic questions',enabled:false,provider:'codex',model:'fixture',workspace:{cwd:home,additionalDirectories:[]},cron:'0 9 * * 1-5',timezone:'UTC',misfire:'skip',prompt:'Synthetic test'},'chat');await until(()=>run.status==='completed');const q=question(app.engine,run);
  const endpoint=app.origin+'/api/runs/'+run.id+'/clear-question',body=JSON.stringify({questionId:q.id});
  assert.equal((await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body})).status,401);
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+app.token},body});assert.equal(response.status,200);
  const view=await (await fetch(app.origin+'/api/chat-view?id='+run.id,{headers:{Authorization:'Bearer '+app.token}})).json();assert.ok(view.questionQueueCleared[q.id]);assert.equal(view.userQuestions[0].status,'pending');
 }finally{await app?.close();fs.rmSync(home,{recursive:true,force:true});}
});
