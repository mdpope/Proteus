import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { ActivityStore, safeLog } from '../src/services/telemetry/activity.js';
import { BrowserRemoteClient, importKey, seal } from '../src/services/remote/remote-client.js';
import { AppAccount } from '../src/services/remote/app-account.js';
import history from '../desktop/browser/browsing-history.cjs';
import workspace from '../desktop/windows/workspace-session.cjs';

function home(t){const p=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-parity-test-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;}
test('browser notifications stay local, deduplicate per owner and persist recovery references',async t=>{
  const folder=home(t),published=[],store=new ActivityStore(folder,{identity:()=>({accountId:'a',workspaceId:'w',origin:'https://example.test'}),publish:async item=>published.push(item)});
  let emitted=0;store.on('notification',()=>emitted++);
  const issue={kind:'history-conflict',windowId:'main',scope:{scope:'project',id:'project',hostId:'host'},title:'History needs attention',body:'Bearer HIDDEN https://example.test/path?token=PRIVATE'};
  const first=store.add('browser.issue',issue);
  const again=store.browserIssue({...issue,scope:{hostId:'host',id:'project',scope:'project'},body:'Updated pending action'});
  assert.equal(again.id,first.id);assert.equal(emitted,1);assert.equal(again.silent,true);assert.deepEqual(again.browserIssue.scope,issue.scope);
  assert.equal(store.data.outbox.length,0);assert.deepEqual(published,[]);
  assert.notEqual(store.browserIssue({...issue,windowId:'second'}).id,first.id);
  assert.notEqual(store.browserIssue({kind:'load-error',windowId:'main',tabId:'browser',logId:'log',body:issue.body}).id,first.id);
  const load=store.notifications().items[0];assert.doesNotMatch(load.body,/HIDDEN|PRIVATE/);assert.match(load.body,/example.test\/path/);
  store.read(first.id);assert.notEqual(store.browserIssue(issue).id,first.id);
  store.preferences({'browser.issue':false});assert.equal(store.notifications().preferences['browser.issue'],false);
  for(const invalid of [{...issue,windowId:''},{...issue,scope:{scope:'arbitrary',id:'project'}},{kind:'load-error',windowId:'main'}])assert.throws(()=>store.browserIssue(invalid));
  await store.close();const reopened=new ActivityStore(folder);assert.deepEqual(reopened.notifications().items,store.notifications().items);await reopened.close();
});
test('activity records transitions once and requires schedule completion opt in',async t=>{
  const engine=new EventEmitter(),old={id:'old',status:'completed',trigger:'chat',schedule:{}};engine.listRuns=()=>[old];
  const store=new ActivityStore(home(t));store.attach(engine,()=> 'host');
  engine.emit('change',old);assert.equal(store.notifications().items.length,0);
  const run={id:'fresh',status:'queued',trigger:'chat',schedule:{}};engine.emit('change',run);
  run.status='awaiting_input';run.pending={id:'q1'};engine.emit('change',run);engine.emit('change',run);
  assert.equal(store.notifications().items.length,1);
  run.status='completed';run.pending=null;engine.emit('change',run);engine.emit('change',run);
  assert.equal(store.notifications().items.length,2);
  const scheduled={id:'s1',status:'completed',trigger:'scheduled',schedule:{id:'s'}};engine.emit('change',scheduled);assert.equal(store.notifications().items.length,2);
  scheduled.id='s2';scheduled.schedule.notifications={onCompletion:true};engine.emit('change',scheduled);assert.equal(store.notifications().items[0].type,'schedule.completed');
  const id=store.notifications().items[0].id;store.read(id);assert.ok(store.notifications().items[0].readAt);
  assert.throws(()=>store.preferences({systemEnabled:'yes'}));await store.close();
});
test('structured asynchronous questions notify once without pausing a turn and show their bounded text',async t=>{
 const engine=new EventEmitter(),run={id:'questions',status:'running',trigger:'chat',schedule:{},userQuestions:[]};engine.listRuns=()=>[run];
 const folder=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-question-notifications-')),store=new ActivityStore(folder);store.attach(engine,()=> 'host');t.after(async()=>{await store.close();fs.rmSync(folder,{recursive:true,force:true});});
 run.userQuestions.push({id:'q1',status:'pending',text:'Private question contents'});engine.emit('change',run);engine.emit('change',run);
 assert.equal(store.notifications().items.length,1);assert.equal(run.status,'running');assert.equal(store.notifications().items[0].chatId,run.id);assert.equal(store.notifications().items[0].body,'Question: Private question contents');
 run.userQuestions[0].status='answered';engine.emit('change',run);assert.equal(store.notifications().items.length,1);
 run.userQuestions.push({id:'q2',status:'pending'});engine.emit('change',run);assert.equal(store.notifications().items.length,2);
});
test('activity outbox never transfers a prior account event into a replacement account',async t=>{
  let identity={accountId:'a',workspaceId:'1',origin:'https://example.test'},fail=true;const received=[];
  const store=new ActivityStore(home(t),{identity:()=>identity,publish:async item=>{if(fail)throw new Error('offline');received.push(item);}});
  t.after(async()=>await store.close());
  store.add('chat.completed',{hostId:'host',chatId:'chat'});await new Promise(resolve=>setTimeout(resolve,10));assert.equal(store.data.outbox.length,1);
  identity={...identity,accountId:'b'};fail=false;await store.flush();assert.equal(received.length,0);assert.equal(store.data.outbox.length,0);
  store.add('review.required');await new Promise(resolve=>setTimeout(resolve,10));assert.equal(received.length,1);assert.equal(received[0].body,'Open Proteus to view the details.');await store.close();
});
test('diagnostic messages redact credentials and URL query/fragment without storing raw objects',()=>{
  const value=safeLog('Bearer SUPERSECRET token=HIDDEN https://example.test/path?secret=URL#token password=PW');
  assert.doesNotMatch(value,/SUPERSECRET|HIDDEN|URL|PW/);assert.match(value,/example.test\/path/);
});
test('unauthenticated relay notices cannot become credential deletion authority',async()=>{
  const client=new BrowserRemoteClient({hostId:'host',deviceId:'device',key:'retained'});let revoked=false,rejected=false;
  client.addEventListener('revoked',()=>revoked=true);client.addEventListener('rejected',()=>rejected=true);
  await client.receive({type:'revoked'});assert.equal(revoked,false);assert.equal(rejected,true);assert.equal(client.host.key,'retained');
});
test('only authenticated current-session revocation carries destructive authority',async()=>{
  const key=await importKey('a'.repeat(64)),client=new BrowserRemoteClient({hostId:'host',deviceId:'device',key});client.status='online';client.prefix='test-prefix';let proof;
  client.addEventListener('revoked',event=>proof=event.detail);
  const box=await seal(key,{type:'revoked',deviceId:'device'},'test-prefix:host:1');await client.receive({type:'data',seq:1,box});
  assert.deepEqual(proof,{authenticated:true,deviceId:'device'});
});
test('retained browsing history survives closed tabs and retains full login URLs while excluding unsafe schemes',async t=>{
  const folder=home(t),store=new history.BrowsingHistory(folder);store.visit('https://example.test/board','Board','http://localhost:4317');
  store.visit('https://example.test/oauth?code=SECRET','Do not save','http://localhost:4317');store.visit('file:///private/secret','No','http://localhost:4317');
  await store.flush();assert.equal(new history.BrowsingHistory(folder).list().total,2);assert.equal(store.list({query:'board'}).items[0].title,'Board');
  await store.update({action:'history-settings',enabled:false,retentionDays:30});store.visit('https://example.test/private','Private');assert.equal(store.list().total,2);
  await store.update({action:'history-clear'});assert.equal(store.list().total,0);await store.close();
});
test('Team restoration preserves safe descriptors and order without restoring loaded pages or secrets',()=>{
  const value=workspace.normalizeSession({team:{active:'web1',dock:true,listId:'team1',tabs:[{id:'web1',url:'https://example.test/board',title:'Board',loaded:true},{id:'bad',url:'https://user:password@example.test/auth'}],orders:{team1:{date:'2026-10-04',revision:'revision',order:['One','Two'],instructions:'Synthetic',timezone:'UTC',listId:'team1'}}},engineSection:'notifications'});
  assert.equal(value.team.dock,true);assert.equal(value.team.tabs.length,1);assert.equal(value.team.tabs[0].loaded,false);assert.deepEqual(value.team.orders.team1.order,['One','Two']);assert.equal(value.engineSection,'notifications');assert.doesNotMatch(JSON.stringify(value),/SECRET/);
});
test('app account proxy rejects arbitrary paths and stale mutation identity before network',async()=>{
  let requests=0;const identity={accountId:'a',workspaceId:'1',origin:'https://example.test',sessionId:'1'};
  const api={load(){},identity:()=>identity,assertIdentity:value=>{if(value!==identity)throw new Error('stale');},authorized:async()=>{requests++;return {accountId:'a',teamLists:[]};}};
  const account=new AppAccount({api});await assert.rejects(account.request({path:'/../../oauth/token'}),/Unsupported/);await assert.rejects(account.request({path:'/links',method:'POST',body:{url:'https://example.test'},identity:{}}),/stale/);assert.equal(requests,0);
  await account.request({path:'/links',method:'POST',body:{url:'https://example.test'},identity});assert.equal(requests,1);
});

test('invalid shared history cannot starve notification delivery',async t=>{
  const delivered=[],identity={accountId:'a',workspaceId:'1',origin:'https://example.test'};
  const store=new ActivityStore(home(t),{identity:()=>identity,publish:async(item,_account,kind)=>{if(kind==='history')throw Object.assign(new Error('Invalid URL'),{status:422});delivered.push(item.type);}});
  store.queue('history',{url:'https://example.test/login',createdAt:new Date().toISOString()});store.add('chat.completed');
  await new Promise(resolve=>setTimeout(resolve,10));await store.flush();assert.deepEqual(delivered,['chat.completed']);assert.equal(store.data.outbox.length,0);
  await store.close(); // Finish the asynchronous log worker before removing this fixture home.
});
test('redirect queries and fragments remain in retained local history',t=>{
  const store=new history.BrowsingHistory(home(t));
  for(const url of ['https://example.test/remote#pair=PRIVATE','https://example.test/oauth/authorize','https://example.test/login','https://example.test/path?session=SECRET'])store.visit(url,'Private');
  assert.equal(store.list().total,4);
});
test('retained history evicts oldest rows before reaching its own reopen size limit',async t=>{
  const folder=home(t),store=new history.BrowsingHistory(folder),at=new Date().toISOString();
  store.data.items=Array.from({length:2500},(_,i)=>({id:String(i),url:'https://example.test/'+('x'.repeat(3900)),title:'Board',visitedAt:at}));await store.save();
  assert.ok(fs.statSync(store.file).size<=8*1024*1024);assert.ok(new history.BrowsingHistory(folder).list().total>0);await store.close();
});
test('notifications name the chat and computer and show the latest reply as plain bounded text',async t=>{
 const engine=new EventEmitter(),run={id:'rich',title:'HOA fee schedule',status:'running',trigger:'chat',schedule:{},events:[{role:'assistant',text:'## Done\nDrafted the **email** to Craig with `the fee table`.'}]};engine.listRuns=()=>[run];
 const folder=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-rich-notifications-')),store=new ActivityStore(folder);store.attach(engine,()=>'host',()=>'Build Mac');t.after(async()=>{await store.close();fs.rmSync(folder,{recursive:true,force:true});});
 run.status='completed';engine.emit('change',run);
 const item=store.notifications().items[0];
 assert.equal(item.title,'HOA fee schedule');assert.equal(item.hostName,'Build Mac');assert.equal(item.body,'Done Drafted the email to Craig with the fee table.');
 run.status='awaiting_input';run.pending={id:'p1',type:'permission',details:{kind:'write',fileName:'/tmp/minutes.md'}};engine.emit('change',run);
 const review=store.notifications().items.find(entry=>entry.type==='review.required');assert.equal(review.title,'Needs you · HOA fee schedule');assert.equal(review.body,'Edit file: /tmp/minutes.md');
});
