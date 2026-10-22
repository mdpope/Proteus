import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {BrowserHistory} from '../src/browser-history.js';
import {BrowserHistoryStore} from '../src/browser-history-store.js';
import {ContentTabs} from '../src/content-tabs.js';
import {createTabSynchronizer} from '../public/content-tab-sync.js';
import {applyNavigationDelta} from '../public/navigation-history.js';
const entry=i=>({id:'entry-'+i,url:'https://example.test/'+i,title:'Page '+i});

test('complete 10,050-entry session hydrates once; append, Back, branch and title refresh use bounded deltas',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-navigation-delta-')),history=new BrowserHistory(home,{hostId:'owner'});await history.ready;
 t.after(async()=>{await history.close();fs.rmSync(home,{recursive:true,force:true});});
 const tabs=new ContentTabs(home,{history}),scope={scope:'project',id:'delta-test'},id='browser',entries=Array.from({length:10050},(_,i)=>entry(i));
 tabs.mutate({...scope,expectedRevision:0,operations:[{action:'open',tab:{id,type:'browser',url:entries.at(-1).url,title:'Large session'}}]});
 await history.seed({tabId:tabs.navigationKey(scope.scope,scope.id,id),history:{entries,index:entries.length-1}});
 let local=[],calls=[],bytes=0;const errors=[];
 const sync=createTabSynchronizer({navigation:true,scopes:()=>[scope],readLocal:async()=>local,apply:async(_scope,value)=>{local=value;},onError:error=>errors.push(error),request:async(_scope,action,args)=>{calls.push({action,args});const result=action==='get'?await tabs.getAsync(scope.scope,scope.id,args):action==='history'?await tabs.history({...scope,...args}):await tabs.mutateAsync({...scope,...args});bytes+=Buffer.byteLength(JSON.stringify(result));return result;}});
 await sync.all();assert.equal(local[0].history.entries.length,10050);assert.equal(local[0].history.entries[0].id,'entry-0');assert.equal(calls.filter(call=>call.action==='history').length,51);
 const bootstrapBytes=bytes;calls=[];bytes=0;
 const navigate=async(action,baseRevision,entryId,url,title)=>tabs.mutateAsync({...scope,historyLimit:200,operations:[{action:'browser-'+action,tabId:id,entryId,baseRevision,operationId:crypto.randomUUID(),url,title,visitedAt:'2026-10-22T12:00:00Z'}]});
 await navigate('navigate',0,'after-limit','https://example.test/after-limit','After limit');await sync.all();
 assert.equal(local[0].history.entries.length,10051);assert.equal(local[0].history.entries[0].id,'entry-0');assert.equal(local[0].history.currentEntryId,'after-limit');
 assert.equal(calls.filter(call=>call.action==='history').length,1);assert.equal(calls.find(call=>call.action==='history').args.sinceRevision,0);assert.ok(bytes<bootstrapBytes/20,{bytes,bootstrapBytes});
 calls=[];await navigate('traverse',1,'entry-9000');await navigate('navigate',2,'branch','https://example.test/branch','Branch');await sync.all();
 assert.equal(calls.filter(call=>call.action==='history').length,1);assert.equal(local[0].history.entries.length,9002);assert.equal(local[0].history.entries[0].id,'entry-0');assert.equal(local[0].history.currentEntryId,'branch');
 calls=[];await navigate('redirect',3,'branch','https://example.test/branch','Updated title');await sync.all();assert.equal(local[0].history.entries.at(-1).title,'Updated title');assert.equal(calls.filter(call=>call.action==='history').length,1);
 calls=[];await navigate('traverse',4,'entry-0');await sync.all();assert.equal(local[0].history.index,0);assert.equal(local[0].history.entries.length,9002,'Back retains the whole Forward list');assert.deepEqual(errors,[]);
});

test('byte-bounded navigation pages retain current selection and every long-URL entry',t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-navigation-pages-')),store=new BrowserHistoryStore(home);t.after(()=>{store.close();fs.rmSync(home,{recursive:true,force:true});});
 const entries=Array.from({length:200},(_,i)=>({...entry(i),url:'https://example.test/'+i+'?value='+'x'.repeat(3800)}));store.seed({tabId:'large-urls',history:{entries,index:150}});
 const selected=store.navigationGet({tabId:'large-urls',limit:200});assert.equal(selected.entries[selected.history.index].id,'entry-150');assert.ok(Buffer.byteLength(JSON.stringify(selected))<512*1024);
 const all=[];let cursor;do{const page=store.navigationGet({tabId:'large-urls',limit:200,...(cursor?{cursor}:{start:true})});assert.ok(Buffer.byteLength(JSON.stringify(page))<512*1024);all.push(...page.entries);cursor=page.nextCursor;}while(cursor);
 assert.deepEqual(all.map(row=>row.id),entries.map(row=>row.id));
});

test('history page reads stop at the transfer budget instead of materializing the requested stack',t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-navigation-read-budget-')),store=new BrowserHistoryStore(home);t.after(()=>{store.close();fs.rmSync(home,{recursive:true,force:true});});
 const entries=Array.from({length:1000},(_,i)=>({...entry(i),url:'https://example.test/'+i+'?value='+'x'.repeat(3800)}));store.seed({tabId:'read-budget',history:{entries,index:0}});
 let rowsRead=0;const prepare=store.db.prepare.bind(store.db);
 t.mock.method(store.db,'prepare',sql=>{
  const statement=prepare(sql);if(!sql.startsWith('SELECT position,payload FROM nav_entries'))return statement;
  return {all(...args){const rows=statement.all(...args);rowsRead+=rows.length;return rows;},*iterate(...args){for(const row of statement.iterate(...args)){rowsRead++;yield row;}}};
 });
 const all=[];let cursor;
 do{
  rowsRead=0;const page=store.navigationGet({tabId:'read-budget',limit:10000,...(cursor?{cursor}:{start:true})});
  assert.equal(rowsRead,page.entries.length+(page.hasMore?1:0),'Only emitted entries and one continuation lookahead may enter JS memory');
  assert.ok(Buffer.byteLength(JSON.stringify(page))<512*1024);all.push(...page.entries);cursor=page.nextCursor;
 }while(cursor);
 assert.deepEqual(all.map(row=>row.id),entries.map(row=>row.id));
 rowsRead=0;const small=store.navigationGet({tabId:'read-budget',limit:2,start:true});assert.equal(small.entries.length,2);assert.equal(rowsRead,3);assert.equal(small.hasMore,true);
});

test('delta transport cache expires independently of retained session history and rejects stale revisions',t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-navigation-log-')),store=new BrowserHistoryStore(home);t.after(()=>{store.close();fs.rmSync(home,{recursive:true,force:true});});
 store.seed({tabId:'tab',history:{entries:[entry(0),entry(1)],index:1}});
 for(let i=0;i<270;i++)store.navigation({action:'traverse',tabId:'tab',entryId:'entry-'+i%2,baseRevision:i,operationId:'operation-'+i});
 const old=store.navigationGet({tabId:'tab',sinceRevision:0});assert.equal(old.reset,true);assert.equal(old.total,2);assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM nav_changes').get().count,256);
 const recent=store.navigationGet({tabId:'tab',sinceRevision:269});assert.equal(recent.delta.changes.length,1);assert.throws(()=>store.navigationGet({tabId:'tab',sinceRevision:271}),/Invalid navigation base/);
 const previous={entries:[entry(0),entry(1)],revision:269,index:0,currentEntryId:'entry-0'},before=structuredClone(previous),expected={revision:270,currentEntryId:'entry-1',total:2};
 assert.throws(()=>applyNavigationDelta(previous,{...recent,delta:{...recent.delta,changes:[{...recent.delta.changes[0],position:10}]}},expected),/incomplete/);assert.deepEqual(previous,before);
});

test('more than 64 browser tabs reuse the verified scope baseline instead of repeatedly downloading history',async()=>{
 const scope={scope:'workspace',id:'many'},entries=Array.from({length:300},(_,i)=>entry(i));let calls=0,local=[];
 const tabs=Array.from({length:70},(_,i)=>({id:'browser-'+i,type:'browser',url:entries[200].url,title:'Page 200',history:{entries:entries.slice(100),index:100,currentEntryId:'entry-200',revision:1,offset:100,total:300,hasMore:false}}));
 const sync=createTabSynchronizer({navigation:true,scopes:()=>[scope],readLocal:async()=>local,apply:async(_scope,tabs)=>{local=tabs;},onError:error=>assert.fail(error),request:async(_scope,action,args)=>{if(action==='get')return {revision:1,tabs};assert.equal(action,'history');calls++;const offset=args.start?0:200;return {revision:1,currentEntryId:'entry-200',total:300,offset,entries:entries.slice(offset,offset+200),hasMore:offset===0,nextCursor:offset===0?'next':null};}});
 await sync.all();assert.equal(calls,140);await sync.all();assert.equal(calls,140);sync.forget(scope);await sync.all();assert.equal(calls,280,'Forgetting a scope releases its private cached stack');
});
