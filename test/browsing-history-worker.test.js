import {assertPrivate} from './helpers/permissions.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {BrowsingHistory} from '../desktop/browser/browsing-history.cjs';
const until=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}throw new Error('Synthetic writer did not reach the expected operation');};
function deferredWriter(){
  const writes=[];return {writes,save(data){return new Promise((resolve,reject)=>writes.push({data:structuredClone(data),resolve,reject}));},close(){}};
}

test('history worker snapshots coalesce visits and preserve later titles and rows when older snapshots prune',async()=>{
  const writer=deferredWriter(),store=new BrowsingHistory('/tmp/proteus-no-file-history-test',{writer});
  store.visit('https://example.test/first','First');store.visit('https://example.test/second','Second');
  assert.equal(store.list().total,2);const flushing=store.flush();await until(()=>writer.writes.length===1);
  store.visit('https://example.test/second','Latest title');store.visit('https://example.test/third','Third');
  writer.writes[0].resolve([1]);await until(()=>writer.writes.length===2);
  assert.deepEqual(store.list().items.map(item=>item.title),['Third','Latest title']);assert.equal(writer.writes[0].data.items[1].title,'Second');assert.equal(writer.writes[1].data.items[0].title,'Latest title');
  writer.writes[1].resolve([0,1]);await flushing;await store.close();assert.equal(writer.writes.length,2);
});

for(const fail of [false,true])test(`explicit history edits ${fail?'preserve prior state on failure':'commit before success'} and order later visits`,async()=>{
  const writer=deferredWriter(),store=new BrowsingHistory('/tmp/proteus-no-file-history-test',{writer});
  store.visit('https://example.test/first','First');const initial=store.flush();await until(()=>writer.writes.length===1);writer.writes[0].resolve([0]);await initial;
  const editing=store.update({action:'history-clear'});await until(()=>writer.writes.length===2);store.visit('https://example.test/second','Later');assert.equal(store.list().total,1);
  if(fail){writer.writes[1].reject(new Error('Synthetic disk full'));await assert.rejects(editing,/disk full/);}else{writer.writes[1].resolve([]);assert.equal((await editing).total,0);}
  const flushing=store.flush();await until(()=>writer.writes.length===3);assert.deepEqual(writer.writes[2].data.items.map(item=>item.title),fail?['First','Later']:['Later']);
  writer.writes[2].resolve(fail?[0,1]:[0]);await flushing;await store.close();assert.equal(store.list().total,fail?2:1);
});

test('queued history preferences govern visits after commit and close flushes the queue',async()=>{
  const writer=deferredWriter(),store=new BrowsingHistory('/tmp/proteus-no-file-history-test',{writer});
  const editing=store.update({action:'history-settings',enabled:false,retentionDays:30});await until(()=>writer.writes.length===1);
  store.visit('https://example.test/ignored','After disable');const closing=store.close();writer.writes[0].resolve([]);await editing;await closing;assert.equal(store.list().enabled,false);assert.equal(store.list().total,0);assert.equal(writer.writes.length,1);
});

test('history worker preserves unknown document fields and original bytes across an actual atomic-write failure',async t=>{
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-history-worker-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const store=new BrowsingHistory(home,{retryMs:20000});t.after(()=>store.close());store.data.extension={opaque:'preserved'};store.visit('https://example.test/first','First');await store.flush();const original=fs.readFileSync(store.file);
  fs.mkdirSync(store.file+'.tmp');store.visit('https://example.test/second','Second');await assert.rejects(store.flush());assert.deepEqual(fs.readFileSync(store.file),original);assert.equal(store.list().total,2);
  fs.rmdirSync(store.file+'.tmp');await store.close();const saved=JSON.parse(fs.readFileSync(store.file));assert.deepEqual(saved.extension,{opaque:'preserved'});assert.equal(saved.items.length,2);assertPrivate(store.file,0o600);assert.equal(fs.existsSync(store.file+'.tmp'),false);
});

test('closing the history writer directly rejects outstanding saves instead of leaving their promises pending',async t=>{
  const {HistoryWriter}=await import('../desktop/browser/browsing-history-writer.cjs');
  const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-history-close-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const writer=new HistoryWriter(path.join(home,'browsing-history.json'));
  const saving=writer.save({version:1,enabled:true,retentionDays:90,items:[]});const rejected=assert.rejects(saving,/closed before saving/);await writer.close();await rejected;
});

test('visits queued during explicit history commits retain their observation time and device name',async t=>{
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-10-05T00:00:00Z')});
  let name='Visit-time Mac';const writer=deferredWriter(),store=new BrowsingHistory('/tmp/proteus-no-file-history-test',{writer,device:()=>({name})});
  const editing=store.update({action:'history-clear'});await until(()=>writer.writes.length===1);store.visit('https://example.test/queued','Queued');
  name='Later Mac';t.mock.timers.setTime(Date.now()+5000);writer.writes[0].resolve([]);await editing;
  const flushing=store.flush();await until(()=>writer.writes.length===2);assert.equal(writer.writes[1].data.items[0].deviceName,'Visit-time Mac');assert.equal(writer.writes[1].data.items[0].visitedAt,'2026-10-05T00:00:00.000Z');writer.writes[1].resolve([0]);await flushing;await store.close();
});
