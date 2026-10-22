import {cleanupStack} from './helpers/cleanup.js';
import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import test from 'node:test'; import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { LogStore, logLimits } from '../src/log-store.js';
import { ActivityStore } from '../src/activity.js';
const cleanups=new WeakMap();
function cleanup(t,action){if(!cleanups.has(t))cleanups.set(t,cleanupStack(t));cleanups.get(t)(action);}
const home=t=>{const folder=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-logs-test-'));cleanup(t,()=>fs.rmSync(folder,{recursive:true,force:true}));return folder;};
const row=i=>({id:'synthetic-'+i,createdAt:'2026-10-13T12:00:00.000Z',level:'error',event:'synthetic.error',summary:'Synthetic '+i,message:'Synthetic full trace '+i+'\n    at fixture:42',details:{code:'E_REHEARSAL'}});
test('log rotation keeps newest 2000, stable pages, targeted details and restart',t=>{
  const folder=home(t),store=new LogStore(folder);
  for(let i=0;i<2005;i++)store.append(row(i));
  const first=store.query();assert.equal(first.total,2000);assert.equal(first.items.length,50);assert.equal(first.items[0].id,'synthetic-2004');assert.ok(!first.items[0].details);assert.ok(!first.items[0].message.includes('\n'));
  store.append(row(2005));const next=store.query({cursor:first.nextCursor});assert.equal(next.items[0].id,'synthetic-1954');assert.equal(new Set([...first.items,...next.items].map(x=>x.id)).size,100);
  assert.equal(store.query({target:'synthetic-42'}).items[0].id,'synthetic-42');assert.equal(store.detail('synthetic-42').details.code,'E_REHEARSAL');assert.throws(()=>store.detail('synthetic-0'),/no longer retained/);assert.throws(()=>store.query({cursor:'NaN'}),/cursor/);
  store.close();const reopened=new LogStore(folder);assert.equal(reopened.query().total,2000);assert.equal(reopened.detail('synthetic-42').message,row(42).message);reopened.close();
  assert.ok(fs.statSync(path.join(folder,'logs.sqlite')).size<4*1024*1024,'Repeated rotation reuses database pages');
});
test('log payload byte rotation prevents 2000 oversized entries filling disk',t=>{
  const store=new LogStore(home(t));const large='x'.repeat(240000);
  for(let i=0;i<300;i++)store.append({...row(i),message:large});
  assert.ok(store.query().total<300);assert.ok(store.db.prepare('SELECT SUM(bytes) AS bytes FROM logs').get().bytes<=logLimits.bytes);assert.equal(store.query().items[0].id,'synthetic-299');store.close();
});
test('legacy activity import is atomic, original preserved and never reimported after rotation',t=>{
  const folder=home(t),legacy={version:1,logs:[row(1)],notifications:[{id:'keep'}],preferences:{custom:true},outbox:[{id:'receipt'}],unknown:'retained'};
  const bytes=JSON.stringify(legacy);fs.writeFileSync(path.join(folder,'activity.json'),bytes);
  let store=new LogStore(folder);assert.equal(store.detail('synthetic-1').legacy,true);assert.equal(fs.readFileSync(path.join(folder,'activity.legacy.json'),'utf8'),bytes);assert.equal(fs.readFileSync(path.join(folder,'activity.json'),'utf8'),bytes);store.close();
  fs.writeFileSync(path.join(folder,'activity.json'),JSON.stringify({...legacy,logs:[row(2)]}));store=new LogStore(folder);assert.equal(store.query().total,1);assert.throws(()=>store.detail('synthetic-2'));store.close();
});
test('worker logging retains redacted stacks/causes, does not rewrite activity on each log, and drains close',async t=>{
  const folder=home(t);let store=new ActivityStore(folder);cleanup(t,async()=>await store.close());
  await store.logs();const before=fs.readFileSync(path.join(folder,'activity.json'),'utf8');
  const cause=new Error('Rehearsal cause password=HIDDEN');const error=new Error('Rehearsal failure',{cause});error.stack+='\n'+('    at fixture\n'.repeat(400));
  const item=store.log('error','synthetic.failure',error,{chatId:'synthetic-chat',token:'DO_NOT_STORE',extra:{value:'https://example.test/error?secret=PRIVATE#hidden'}});
  const detail=await store.logDetail(item.id);assert.ok(detail.message.length>1000);assert.match(detail.details.error.cause.message,/Rehearsal cause/);assert.doesNotMatch(JSON.stringify(detail),/HIDDEN|DO_NOT_STORE|PRIVATE/);assert.equal(detail.chatId,'synthetic-chat');assert.equal(fs.readFileSync(path.join(folder,'activity.json'),'utf8'),before);
  const large=store.log('error','synthetic.large','🧪'.repeat(200000));await store.logDetail(large.id);await store.close();
  store=new ActivityStore(folder);assert.ok((await store.logs()).items.some(row=>row.id===item.id));
});
