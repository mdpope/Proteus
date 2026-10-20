import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserHistory } from '../src/browser-history.js';
import { BrowserHistoryStore } from '../src/browser-history-store.js';
import { DesktopPeers } from '../src/desktop-peers.js';
const visit=(id,extra={})=>({eventId:id,url:'https://example.test/'+id,title:'Synthetic '+id,visitedAt:'2026-10-12T12:00:00Z',profileId:'default',sourceHostId:'owner',...extra});
function directory(t){const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-browser-index-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return home;}
function store(t,options){const result=new BrowserHistoryStore(directory(t),options);t.after(()=>result.close());return result;}

test('history preference edits preserve unknown persisted fields and omit derived catalogs and peer runtime state',t=>{
 const history=store(t),peer={hostId:'owner-peer',enabled:true,backfill:'all',profileIds:['default'],future:{keep:true}};
 history.db.prepare('UPDATE metadata SET value=? WHERE key=?').run(JSON.stringify({enabled:true,retentionDays:0,peers:[peer],futurePreference:{keep:true}}),'settings');
 history.settings({enabled:false,availablePeers:[{key:'never-store'}],availableProfiles:[{settings:'never-store'}],peers:[{hostId:peer.hostId,enabled:false,backfill:'all',profileIds:['default'],cursor:'never-store',signature:'never-store',lastSyncAt:'never-store',error:'never-store'}]});
 assert.deepEqual(history.settings(),{enabled:false,retentionDays:0,futurePreference:{keep:true},peers:[{...peer,enabled:false}]});
 assert.doesNotMatch(history.meta('settings'),/never-store|availablePeers|availableProfiles/);
});

test('worker history records full redirect URLs, retries by ID, validates collisions and excludes private profiles/userinfo',async t=>{
 const history=new BrowserHistory(directory(t),{hostId:()=> 'owner'});t.after(()=>history.close());
 assert.deepEqual((await history.record({visits:[visit('a'),visit('b',{profileId:'work'})]})).acknowledgedEventIds,['a','b']);
 assert.equal((await history.record({events:[visit('a')]})).inserted,0);
 assert.equal((await history.query({})).total,2);assert.equal((await history.query({profileId:'work'})).items[0].eventId,'b');
 await assert.rejects(history.record({events:[visit('a',{url:'https://example.test/collision'})]}),/another visit/);
 for(const extra of [{private:true},{profileId:'private:one'},{url:'https://u:p@example.test/'}])await assert.rejects(history.record({events:[visit('private',extra)]}),/Private|address/);
 assert.equal((await history.query({})).total,2);
});

test('legacy import preserves original bytes/settings and distinct equal URL/time rows across restart',t=>{
 const home=directory(t),file=path.join(home,'browsing-history.json'),data={version:1,enabled:false,retentionDays:365,unknown:{future:true},items:[{id:'same',url:'https://example.test',title:'A',visitedAt:'2026-01-01T00:00:00Z'},{id:'same',url:'https://example.test',title:'B',visitedAt:'2026-01-01T00:00:00Z'}]};
 fs.writeFileSync(file,JSON.stringify(data));const original=fs.readFileSync(file);let history=new BrowserHistoryStore(home);
 assert.equal(history.query().total,2);assert.equal(history.settings().enabled,false);assert.deepEqual(history.status().migration.legacySettings.unknown,{future:true});const ids=history.query().items.map(row=>row.eventId);history.close();
 history=new BrowserHistoryStore(home);assert.deepEqual(history.query().items.map(row=>row.eventId),ids);assert.deepEqual(fs.readFileSync(file),original);history.close();
});

test('invalid legacy rows roll back the complete migration and allow safe repair',t=>{
 const home=directory(t),file=path.join(home,'browsing-history.json');fs.writeFileSync(file,JSON.stringify({items:[visit('ok'),visit('bad',{visitedAt:'bad'})]}));
 const bytes=fs.readFileSync(file);assert.throws(()=>new BrowserHistoryStore(home),/date/);assert.deepEqual(fs.readFileSync(file),bytes);
 fs.writeFileSync(file,JSON.stringify({items:[visit('ok')]}));const history=new BrowserHistoryStore(home);assert.equal(history.query().total,1);history.close();
});

test('stable indexed cursor search/date paging tolerates concurrent new visits and query changes fail closed',t=>{
 const history=store(t);history.record({events:['a','b','c','d','e'].map(id=>visit(id))});
 const first=history.query({search:'Synthetic',limit:2,from:'2026-10-12T00:00:00Z',before:'2026-10-13T00:00:00Z'});assert.deepEqual(first.items.map(row=>row.eventId),['e','d']);
 history.record({events:[visit('z',{visitedAt:'2026-10-12T13:00:00Z'})]});
 const second=history.query({search:'Synthetic',limit:2,from:'2026-10-12T00:00:00Z',before:'2026-10-13T00:00:00Z',cursor:first.cursor});assert.deepEqual(second.items.map(row=>row.eventId),['c','b']);
 assert.throws(()=>history.query({query:'other',cursor:first.cursor}),/query changed/);
 assert.equal(history.query({search:'example c'}).items[0].eventId,'c');
});

test('replication cursor commit retries and tombstones prevent resurrecting explicitly deleted visits',t=>{
 const source=store(t),replica=store(t);source.record({events:[visit('a'),visit('b',{profileId:'work'})]});
 let page=source.sync({profileIds:['default'],limit:1});assert.equal(page.events.length,1);replica.apply({...page,peerHostId:'source',signature:'v1'});replica.apply({...page,peerHostId:'source',signature:'v1'});assert.equal(replica.query().total,1);
 source.delete({eventIds:['a']});const deletion=source.sync({cursor:page.cursor,profileIds:['default']});assert.equal(deletion.tombstones.length,1);replica.apply({...deletion,peerHostId:'source',signature:'v1'});replica.apply(page);assert.equal(replica.query().total,0);
 assert.equal(replica.db.prepare('SELECT cursor FROM peer_cursors WHERE host_id=?').get('source').cursor,deletion.cursor);
 assert.equal(source.sync({cursor:Buffer.from(JSON.stringify({epoch:'stale',seq:1})).toString('base64url')}).rebootstrap,true);
});

test('backfill cutoffs omit old visits but always carry deletion tombstones; retention leaves active navigation intact',t=>{
 const history=store(t);history.settings({retentionDays:90});history.navigation({tabId:'tab',operationId:'old-nav',baseRevision:0,action:'navigate',entryId:'entry',...visit('old',{visitedAt:'2026-01-01T00:00:00Z'})});
 history.record({events:[visit('new')]});assert.deepEqual(history.sync({from:'2026-10-01T00:00:00Z'}).events.map(row=>row.eventId),['new']);
 history.delete({eventIds:['old']});assert.equal(history.sync({from:'2026-10-01T00:00:00Z'}).tombstones[0].eventId,'old');
 history.prune({now:Date.parse('2027-10-12T00:00:00Z')});assert.equal(history.query().total,0);assert.equal(history.navigationGet({tabId:'tab'}).history.entries[0].url,'https://example.test/old');
});

test('navigation atomic event/receipt, revision conflicts, preserved Forward and branching, stale redirect guards',t=>{
 const history=store(t),nav=(id,base,extra={})=>({tabId:'tab',operationId:id,baseRevision:base,action:'navigate',entryId:id,visitedAt:'2026-10-12T12:00:00Z',url:'https://example.test/'+id,profileId:'default',...extra});
 const a=history.navigation(nav('a',0));assert.equal(a.currentEntryId,'a');assert.equal(a.eventId,'a');assert.equal(history.navigation(nav('a',0)).revision,1);assert.equal(history.query().total,1);
 history.navigation(nav('b',1));history.navigation(nav('back',2,{action:'traverse',selectedEntryId:'a'}));assert.equal(history.navigationGet({tabId:'tab'}).history.entries.length,2);
 assert.throws(()=>history.navigation(nav('stale',1)),/Navigation changed/);assert.equal(history.query().total,3);
 assert.throws(()=>history.navigation(nav('redirect',3,{action:'redirect',entryId:'b'})),/no longer selected/);
 history.navigation(nav('c',3));assert.deepEqual(history.navigationGet({tabId:'tab'}).history.entries.map(row=>row.id),['a','c']);assert.equal(history.query().total,4);
 assert.throws(()=>history.batchNavigation({operations:[nav('d',4),nav('e',1)]}),/Navigation changed/);assert.equal(history.navigationGet({tabId:'tab'}).revision,4);assert.equal(history.query().total,4);
});

test('seed preserves legacy stacks without visits and cannot overwrite current position; private profile traversal fails',t=>{
 const history=store(t),seed={tabId:'tab',profileId:'work',history:{entries:[{url:'https://example.test/a'},{url:'https://example.test/b'}],index:0}};
 const initial=history.seed(seed);assert.equal(initial.history.index,0);assert.equal(initial.total,2);assert.equal(history.query().total,0);
 assert.deepEqual(history.seed({...seed,history:{entries:[],index:0}}).history,initial.history);
 assert.throws(()=>history.navigation({tabId:'tab',operationId:'bad',baseRevision:0,action:'traverse',selectedEntryId:initial.currentEntryId,profileId:'default'}),/another browser profile/);
});

test('account legacy import uses original source IDs without URL heuristics and preserves duplicate equal visits',t=>{
 const history=store(t),rows=[{...visit('a'),id:'one'},{...visit('a'),id:'two'}];assert.equal(history.importLegacy({source:'account-one',items:rows}).imported,2);assert.equal(history.importLegacy({source:'account-one',items:rows}).imported,0);assert.equal(history.query().total,2);
});

test('configured peer replication retains last cursor on failure, resumes, and excludes unselected profiles',async t=>{
 const source=store(t),history=store(t),hostId='11111111-1111-4111-8111-111111111111';source.record({events:[visit('a')]});history.settings({peers:[{hostId,enabled:true,profileIds:['default'],backfill:'all'}]});
 const peers=new DesktopPeers(directory(t),{browserHistory:history});peers.loaded=true;peers.records.set(hostId,{hostId,paused:false});t.after(()=>peers.close());let fail=false;
 peers.request=async()=>{if(fail)throw new Error('Synthetic offline');return source.sync({profileIds:['default']});};
 assert.equal((await peers.syncHistory()).results[0].inserted,1);const cursor=history.peerStatus()[0].cursor;fail=true;assert.match((await peers.syncHistory()).results[0].error,/offline/);assert.equal(history.peerStatus()[0].cursor,cursor);
 fail=false;assert.equal((await peers.syncHistory()).results[0].inserted,0);assert.equal(history.query().total,1);
 peers.request=async()=>({events:[visit('bad',{profileId:'unselected'})],tombstones:[],cursor:'forged'});assert.match((await peers.syncHistory()).results[0].error,/unselected/);assert.equal(history.query().total,1);
});

test('worker change notices are absent for duplicate record/replay/read/unchanged settings and migration retries',async t=>{
 const history=new BrowserHistory(directory(t),{hostId:'owner'});t.after(()=>history.close());let notices=0;history.on('changed',()=>notices++);
 await history.record({events:[visit('one')]});assert.equal(notices,1);await history.record({events:[visit('one')]});await history.query();await history.settings({action:'settings'});await history.settings({enabled:true,retentionDays:0});assert.equal(notices,1);
 const nav={action:'navigate',tabId:'tab',operationId:'nav',baseRevision:0,entryId:'entry',url:'https://example.test/nav',visitedAt:'2026-10-12T12:00:00Z'};
 await history.navigation(nav);assert.equal(notices,2);await history.navigation(nav);await history.navigation({action:'seed',tabId:'tab',url:'https://example.test/stale'});assert.equal(notices,2);
});

test('account import preserves cloud originals and retries an interrupted second batch without duplicate visits',async t=>{
 const history=new BrowserHistory(directory(t),{hostId:'owner'});t.after(()=>history.close());const rows=Array.from({length:250},(_,i)=>({...visit('a'+i),id:'record-'+i}));let requests=0,checks=0,interrupt=true;
 const identity={endpoint:'https://synthetic.test',accountId:'account',workspaceId:'workspace'},account={life:{api:{load(){},identity:()=>identity,assertIdentity(){if(interrupt && ++checks===3)throw Error('Synthetic account changed');}}},request:async({path})=>{assert.equal(path,'/history');requests++;return {items:rows};}};
 await assert.rejects(history.importAccount(account),/account changed/);assert.equal((await history.query()).total,200);
 interrupt=false;await history.importAccount(account);assert.equal((await history.query()).total,250);assert.equal((await history.importAccount(account)).alreadyImported,true);assert.equal(requests,2);assert.equal(rows.length,250);
});

test('retention maintenance drains multiple bounded worker batches while preserving navigation, deletion tombstones and retry receipts',async t=>{
 const history=new BrowserHistory(directory(t),{hostId:'owner'});t.after(()=>history.close());await history.ready;history.scheduleMaintenance=()=>{};await history.maintenance();await history.settings({retentionDays:90});
 const now=Date.parse('2027-10-12T12:00:00Z'),navigation={action:'navigate',tabId:'retained-tab',entryId:'retained-entry',operationId:'protected-retry',baseRevision:0,...visit('retained-visit')};
 await history.navigation(navigation);await history.record({events:[visit('deleted-visit')]});await history.delete({eventIds:['deleted-visit']});
 for(let offset=0;offset<2400;offset+=200)await history.record({events:Array.from({length:200},(_,index)=>visit('expired-'+(offset+index)))});
 let yields=0;const timer=setInterval(()=>yields++,1);const result=await history.maintenance({now});clearInterval(timer);
 assert.equal(result.pruned,2401);assert.ok(result.batches>=3);assert.ok(yields>0);assert.equal((await history.query()).total,0);
 assert.equal((await history.navigationGet({tabId:'retained-tab'})).history.currentEntryId,'retained-entry');assert.equal((await history.navigation(navigation)).replayed,true);assert.ok((await history.sync()).tombstones.some(row=>row.eventId==='deleted-visit'));
});

test('retention drain can stop cleanly for shutdown and failed batch retry preserves committed progress',async t=>{
 const history=new BrowserHistory(directory(t));await history.ready;await history.maintenance();
 let calls=0;history.prune=async()=>{if(++calls===2)throw Object.assign(Error('Synthetic disk unavailable'),{code:'SQLITE_IOERR'});return {pruned:1000,hasMore:true};};
 await assert.rejects(history.maintenance(),/disk unavailable/);assert.equal(calls,2);assert.match((await history.status()).maintenance.error,/retry/);
 history.prune=async()=>({pruned:0,hasMore:false});assert.equal((await history.maintenance()).pruned,0);assert.equal((await history.status()).maintenance.error,undefined);
 // Shutdown between batches cancels future work; the real client closes only after
 // an already dispatched batch has returned, so no partial transaction is abandoned.
 history.prune=async()=>{history.closing=true;return {pruned:1000,hasMore:true};};const result=await history.maintenance();assert.equal(result.stopped,true);assert.equal(result.batches,1);await history.close();
});

test('legacy redirect commands append distinct original and destination visits atomically with retry safety',t=>{
 const history=store(t),operation={tabId:'tab',operationId:'user-nav',baseRevision:0,action:'navigate',entryId:'entry',...visit('event')};history.navigation(operation);
 const redirect={tabId:'tab',operationId:'redirect',baseRevision:1,action:'redirect',entryId:'entry',url:'https://example.test/final',title:'Final destination'};
 const acknowledgement=history.navigation(redirect);let result=history.query();assert.equal(result.total,2);assert.equal(result.items[0].url,redirect.url);assert.notEqual(result.items[0].eventId,'event');const original=result.items.find(row=>row.eventId==='event');assert.equal(original.url,operation.url);assert.equal(original.visitedAt,new Date(operation.visitedAt).toISOString());assert.equal(history.navigation(redirect).replayed,true);assert.deepEqual(history.navigationGet({tabId:'tab'}).history.entries.map(row=>row.url),[operation.url,redirect.url]);
 assert.equal(history.record({events:[visit('event')]}).changed,false);assert.equal(history.navigation(operation).replayed,true);assert.equal(history.navigationGet({tabId:'tab'}).url,redirect.url);assert.equal(history.query({query:'final destination'}).total,1);
 for(const url of ['https://user:password@example.test/page'])assert.throws(()=>history.navigation({...redirect,operationId:'unsafe-'+url,entryId:acknowledgement.currentEntryId,baseRevision:2,url}),/Private authentication/);
 assert.equal(history.navigationGet({tabId:'tab'}).revision,2);assert.equal(history.query().total,2);
});

test('redirect deltas converge when old/new payloads arrive out of order and keep aliases away from ordinary append authority',t=>{
 const source=store(t),oldFirst=store(t),newFirst=store(t);source.navigation({tabId:'tab',operationId:'original',baseRevision:0,action:'navigate',entryId:'entry',...visit('event')});const old=source.sync();
 source.navigation({tabId:'tab',operationId:'redirect',baseRevision:1,action:'redirect',entryId:'entry',url:'https://example.test/canonical',title:'Canonical'});const changed=source.sync({cursor:old.cursor});
 oldFirst.apply(old);oldFirst.apply(changed);newFirst.apply(changed);newFirst.apply(old);
 for(const replica of [oldFirst,newFirst]){assert.equal(replica.query().total,2);assert.equal(replica.query().items[0].url,'https://example.test/canonical');assert.equal(replica.record({events:[visit('event')]}).changed,false);assert.throws(()=>replica.record({events:[visit('event',{url:'https://example.test/forged',aliases:['https://example.test/canonical'],updatedAt:'2099-01-01T00:00:00Z'})]}),/another visit/);}
 assert.throws(()=>newFirst.apply({events:[{...changed.events[0],aliases:['https://user:password@example.test/page']}],tombstones:[]}),/Private authentication/);
});

test('redirect following traversal preserves both original visits and adds a new destination',t=>{
 const history=store(t);history.navigation({tabId:'tab',operationId:'a',baseRevision:0,action:'navigate',entryId:'entry-a',...visit('a')});history.navigation({tabId:'tab',operationId:'b',baseRevision:1,action:'navigate',entryId:'entry-b',...visit('b')});history.navigation({tabId:'tab',operationId:'back',baseRevision:2,action:'traverse',entryId:'entry-a',...visit('back',{visitedAt:'2026-10-12T12:01:00Z'})});
 history.navigation({tabId:'tab',operationId:'back-redirect',baseRevision:3,action:'redirect',entryId:'entry-a',url:'https://example.test/a-final'});
 const rows=history.query().items;assert.equal(rows.length,4);assert.equal(rows.find(row=>row.eventId==='a').url,'https://example.test/a');assert.equal(rows.find(row=>row.eventId==='back').url,'https://example.test/a');assert.ok(rows.some(row=>row.url==='https://example.test/a-final'));
});

test('earlier FTS row IDs migrate atomically and indexed deletes/updates preserve search correctness and receipts',t=>{
 const home=directory(t);let history=new BrowserHistoryStore(home);history.record({events:[visit('a'),visit('b')]});history.navigation({tabId:'tab',operationId:'receipt',baseRevision:0,action:'navigate',entryId:'entry',...visit('nav')});
 history.db.prepare('DELETE FROM metadata WHERE key=?').run('search-version');history.db.exec('DELETE FROM event_search;');
 history.db.prepare('INSERT INTO event_search(rowid,event_id,title,url) VALUES(?,?,?,?)').run(10001,'a','Synthetic a','https://example.test/a');history.close();
 history=new BrowserHistoryStore(home);assert.equal(history.meta('search-version'),'2');assert.equal(history.query({query:'Synthetic'}).total,3);assert.equal(history.db.prepare('SELECT COUNT(*) AS total FROM nav_receipts').get().total,1);
 history.record({events:[visit('a',{title:'Revised needle',updatedAt:'2026-10-12T13:00:00Z'})]});assert.equal(history.query({query:'Revised needle'}).total,1);assert.equal(history.query({query:'Synthetic a'}).total,0);history.delete({eventIds:['a']});assert.equal(history.query({query:'Revised needle'}).total,0);assert.equal(history.query().total,2);history.close();
});

test('new stores and legacy imports without an explicit retention preference keep all history until the user chooses pruning',async t=>{
 const home=directory(t),file=path.join(home,'browsing-history.json'),old=visit('very-old',{id:'very-old',visitedAt:'2001-01-01T00:00:00Z'});fs.writeFileSync(file,JSON.stringify({items:[old]}));const original=fs.readFileSync(file);
 const history=new BrowserHistory(home,{hostId:'owner'});t.after(()=>history.close());await history.ready;await history.maintenance();assert.equal((await history.settings()).retentionDays,0);assert.equal((await history.query()).total,1);assert.deepEqual(fs.readFileSync(file),original);
 await history.settings({retentionDays:90});await history.maintenance();assert.equal((await history.query()).total,0);assert.deepEqual(fs.readFileSync(file),original);
});

test('new navigation receipts retain compact deterministic acknowledgements and old full receipts remain replayable',t=>{
 const history=store(t),entries=Array.from({length:200},(_,i)=>({id:'seed-'+i,url:'https://example.test/seed/'+i,title:'Seed '+i}));history.seed({tabId:'tab',history:{entries,index:199}});
 const operation={tabId:'tab',operationId:'compact-op',baseRevision:0,action:'navigate',entryId:'new-entry',...visit('new-visit')},ack=history.navigation(operation),row=history.db.prepare('SELECT payload FROM nav_receipts WHERE operation_id=?').get('compact-op');
 assert.ok(Buffer.byteLength(row.payload)<1500);assert.equal(JSON.parse(row.payload).history,undefined);assert.equal(ack.history,undefined);const {replayed,...retry}=history.navigation(operation);assert.equal(replayed,true);assert.deepEqual(retry,ack);assert.equal(history.navigationGet({tabId:'tab'}).total,201);
 const legacy={...ack,history:{entries:[{id:'new-entry',url:operation.url,title:'Original full receipt'}],index:0,revision:1}};history.db.prepare('UPDATE nav_receipts SET payload=? WHERE operation_id=?').run(JSON.stringify(legacy),'compact-op');assert.deepEqual(history.navigation(operation).history,legacy.history);assert.equal(history.db.prepare('SELECT payload FROM nav_receipts WHERE operation_id=?').get('compact-op').payload,JSON.stringify(legacy));
});
