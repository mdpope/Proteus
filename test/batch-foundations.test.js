import {privateTemporaryDirectory} from '../src/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {HistoryWriter} from '../desktop/browsing-history-writer.cjs';
import {BrowsingHistory} from '../desktop/browsing-history.cjs';
import {uniqueModels} from '../public/model-choices.js';

test('catalog normalization keeps current metadata without collapsing distinct model IDs',()=>{
 assert.deepEqual(uniqueModels([{id:'a',name:'Shared',controls:{reasoningEfforts:['low']}},{id:'b',name:'Shared'},{id:'a',name:'Latest',controls:{reasoningEfforts:['high']}},{}]),[{id:'a',name:'Latest',controls:{reasoningEfforts:['high']}},{id:'b',name:'Shared'}]);
});
test('optional history failures preserve disk state, bound memory and retry; explicit deletion reports failure',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-history-retry-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 let fail=false;const notices=[],writer=new HistoryWriter(path.join(home,'browsing-history.json'));
 const store=new BrowsingHistory(home,{writer:{save:async(...args)=>{if(fail)throw Object.assign(new Error('Disk full'),{code:'ENOSPC'});return writer.save(...args);},close:()=>writer.close()},onError:error=>notices.push(error),retryMs:20000});t.after(()=>store.close());
 store.visit('https://example.test/first','First');await store.flush();const original=fs.readFileSync(store.file,'utf8');fail=true;
 assert.doesNotThrow(()=>store.visit('https://example.test/second','Second'));await assert.rejects(store.flush(),/Disk full/);await new Promise(resolve=>setImmediate(resolve));assert.equal(fs.readFileSync(store.file,'utf8'),original);assert.equal(store.list().persistenceError,'ENOSPC');
 await assert.rejects(store.update({action:'history-clear'}),/Disk full/);assert.equal(store.list().total,2);
 store.visit('https://example.test/third','Third');assert.equal(notices.length,1);
 fail=false;await store.close();assert.equal(new BrowsingHistory(home).list().total,3);assert.equal(store.list().persistenceError,undefined);
});
