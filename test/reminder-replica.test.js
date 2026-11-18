import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {ReminderReplica,createReminderSync} from '../public/models/reminder-replica.js';
function cache(){const db=new DatabaseSync(':memory:');return new ReminderReplica({exec:sql=>db.exec(sql),run:(sql,args=[])=>db.prepare(sql).run(...args),rows:(sql,args=[])=>db.prepare(sql).all(...args)});}
const row=(revision,extra={})=>({id:'r',revision,title:'Call dentist',listId:'inbox',dueKind:'date',dueDate:'2026-11-14',completedAt:null,deletedAt:null,...extra});
const page=(cursor,record)=>({cursor,hasMore:false,accountId:'a',workspaceId:'w',inboxId:'inbox',timeZone:'America/Denver',changes:[{kind:'list',record:{id:'inbox',revision:1,name:'Inbox',inbox:true}},{kind:'reminder',record}]});
test('SQLite replica applies versions, tombstones, cursor atomically and isolates accounts',()=>{
 const store=cache();store.apply('a',page(1,row(1)));assert.equal(store.read('a').items.length,1);
 store.apply('a',page(2,row(2,{completedAt:'now'})));assert.equal(store.read('a').items.length,0);assert.equal(store.read('a',{completed:'completed'}).items.length,1);
 store.apply('a',page(3,row(1)));assert.equal(store.read('a',{id:'r'}).record.revision,2);
 store.apply('a',page(4,row(3,{deletedAt:'now'})));assert.equal(store.read('a',{completed:'all'}).items.length,0);assert.equal(store.read('a',{deleted:true}).items.length,1);
 assert.throws(()=>store.read('b'),/download/);
 const invalid=page(5,row(4));invalid.changes.push({kind:'bad',record:row(5)});assert.throws(()=>store.apply('a',invalid));assert.equal(store.meta('a').cursor,4);assert.equal(store.read('a',{id:'r'}).record.revision,3);
 store.clear('a');assert.equal(store.meta('a'),null);
});
test('delta sync drains pages and offline reads are read-only; auth and account races fail closed',async()=>{
 const replica=cache();let account='a',fail=false,calls=[];
 const sync=createReminderSync({replica,current:()=>account,request:async query=>{calls.push(query.since);if(fail)throw Object.assign(Error('unreachable'),{status:503});return {...page(query.since+1,row(query.since+1)),hasMore:query.since===0};}});
 assert.equal((await sync.read()).items.length,1);assert.deepEqual(calls,[0,1]);sync.invalidate();fail=true;assert.equal((await sync.read()).readOnly,true);
 const denied=createReminderSync({replica,current:()=>account,request:async()=>{throw Object.assign(Error('denied'),{status:403});}});await assert.rejects(denied.read(),/denied/);
 const race=createReminderSync({replica,current:()=>account,request:async()=>{account='b';return page(3,row(3));}});await assert.rejects(race.read(),/account changed/);assert.equal(replica.meta('b'),null);
});
