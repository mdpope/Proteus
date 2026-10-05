import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { ActivityStore, safeLog } from '../src/activity.js';
import { BrowserRemoteClient, importKey, seal } from '../src/remote-client.js';
import { AppAccount } from '../src/app-account.js';
import history from '../desktop/browsing-history.cjs';
import workspace from '../desktop/workspace-session.cjs';

function home(t){const p=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-parity-test-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;}
test('activity records transitions once and requires schedule completion opt in',t=>{
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
  assert.throws(()=>store.preferences({systemEnabled:'yes'}));store.close();
});
test('activity outbox never transfers a prior account event into a replacement account',async t=>{
  let identity={accountId:'a',workspaceId:'1',origin:'https://example.test'},fail=true;const received=[];
  const store=new ActivityStore(home(t),{identity:()=>identity,publish:async item=>{if(fail)throw new Error('offline');received.push(item);}});
  store.add('chat.completed',{hostId:'host',chatId:'chat'});await new Promise(resolve=>setTimeout(resolve,10));assert.equal(store.data.outbox.length,1);
  identity={...identity,accountId:'b'};fail=false;await store.flush();assert.equal(received.length,0);assert.equal(store.data.outbox.length,0);
  store.add('review.required');await new Promise(resolve=>setTimeout(resolve,10));assert.equal(received.length,1);assert.equal(received[0].body,'Open Proteus to view the details.');
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
test('retained browsing history survives closed tabs and excludes credential URLs',t=>{
  const folder=home(t),store=new history.BrowsingHistory(folder);store.visit('https://example.test/board','Board','http://localhost:4317');
  store.visit('https://example.test/oauth?code=SECRET','Do not save','http://localhost:4317');store.visit('file:///private/secret','No','http://localhost:4317');
  assert.equal(new history.BrowsingHistory(folder).list().total,1);assert.equal(store.list({query:'board'}).items[0].title,'Board');
  store.update({action:'history-settings',enabled:false,retentionDays:30});store.visit('https://example.test/private','Private');assert.equal(store.list().total,1);
  store.update({action:'history-clear'});assert.equal(store.list().total,0);
});
test('Team restoration preserves safe descriptors and order without restoring loaded pages or secrets',()=>{
  const value=workspace.normalizeSession({team:{active:'web1',dock:true,listId:'team1',tabs:[{id:'web1',url:'https://example.test/board',title:'Board',loaded:true},{id:'bad',url:'https://example.test/auth?code=SECRET'}],orders:{team1:{date:'2026-10-04',revision:'revision',order:['One','Two'],instructions:'Synthetic',timezone:'UTC',listId:'team1'}}},engineSection:'notifications'});
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
});
test('pairing fragments and auth paths never enter retained local history',t=>{
  const store=new history.BrowsingHistory(home(t));
  for(const url of ['https://example.test/remote#pair=PRIVATE','https://example.test/oauth/authorize','https://example.test/login','https://example.test/path?session=SECRET'])store.visit(url,'Private');
  assert.equal(store.list().total,0);
});
test('retained history evicts oldest rows before reaching its own reopen size limit',t=>{
  const folder=home(t),store=new history.BrowsingHistory(folder),at=new Date().toISOString();
  store.data.items=Array.from({length:2500},(_,i)=>({id:String(i),url:'https://example.test/'+('x'.repeat(3900)),title:'Board',visitedAt:at}));store.save();
  assert.ok(fs.statSync(store.file).size<=8*1024*1024);assert.ok(new history.BrowsingHistory(folder).list().total>0);
});
