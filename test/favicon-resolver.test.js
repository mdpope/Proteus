import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {FaviconResolver,finishIconResponse}=require('../desktop/browser/favicon-resolver.cjs');
function fixture(){let next=0;const jobs=new Map();const resolver=new FaviconResolver({timers:{setTimeout:callback=>{jobs.set(++next,callback);return next;},clearTimeout:id=>jobs.delete(id)}});return {resolver,jobs,fire:async()=>{const [id,callback]=jobs.entries().next().value;jobs.delete(id);callback();await resolver.generation.pending;}};}
test('favicon resolver coalesces overlapping and callback-triggered network completions',async()=>{
 const {resolver,jobs}=fixture();let calls=0,release,nested;
 const callback=async()=>{calls++;nested=resolver.resolve('https://example.invalid',['/favicon.ico'],callback);await new Promise(resolve=>release=resolve);return true;};
 const first=resolver.resolve('https://example.invalid',['/favicon.ico'],callback),second=resolver.resolve('https://example.invalid',['/favicon.ico'],callback);
 assert.equal(first,second);await Promise.resolve();assert.equal(nested,first);assert.equal(calls,1);release();assert.equal(await first,true);assert.equal(await resolver.resolve('https://example.invalid',['/favicon.ico'],callback),true);assert.equal(calls,1);assert.equal(jobs.size,0);
});
test('failed and malformed favicon resolutions consume a finite retry budget even with repeated events',async()=>{
 const f=fixture();let calls=0;const callback=async()=>{calls++;if(calls%2)throw new Error('Synthetic invalid image');return false;};
 await f.resolver.resolve('https://example.invalid',['/favicon.ico'],callback);
 for(let i=0;i<100;i++)await f.resolver.resolve('https://example.invalid',['/favicon.ico'],callback);
 assert.equal(calls,6);assert.equal(f.jobs.size,0);assert.equal(f.resolver.generation.attempts,6);
 f.resolver.reset();await f.resolver.resolve('https://example.invalid',['/favicon.ico'],async()=>false);
 while(f.jobs.size)await f.fire();assert.equal(f.resolver.generation.attempts,6);
});
test('late icon changes and navigation reset get a fresh generation; stale and closed callbacks cannot commit',async()=>{
 const f=fixture();let release,oldCurrent;
 const old=f.resolver.resolve('https://example.invalid/one',['/one.ico'],async isCurrent=>{oldCurrent=isCurrent;await new Promise(r=>release=r);return isCurrent();});
 await Promise.resolve();f.resolver.reset();assert.equal(oldCurrent(),false);
 let newCalls=0;assert.equal(await f.resolver.resolve('https://example.invalid/two',['/two.ico'],async isCurrent=>{newCalls++;return isCurrent();}),true);
 release();assert.equal(await old,false);assert.equal(f.resolver.generation.complete,true);assert.equal(f.jobs.size,0);
 assert.equal(await f.resolver.resolve('https://example.invalid/two',['/late.ico'],async isCurrent=>{newCalls++;return isCurrent();}),true);assert.equal(newCalls,2);
 f.resolver.reset();await f.resolver.resolve('https://example.invalid/two',['/missing.ico'],async()=>false);assert.equal(f.jobs.size,1);f.resolver.close();assert.equal(f.jobs.size,0);assert.equal(await f.resolver.resolve('https://example.invalid',['/one.ico'],()=>{throw new Error('must not run');}),false);
});
test('only the selected icon response completion triggers resolution; unrelated and repeated completions do not',()=>{
 const responses=new Map([['https://example.invalid/icon.png',{requestId:'icon',ready:false}],['https://example.invalid/photo.png',{requestId:'photo',ready:false}]]),icons=['https://example.invalid/icon.png'];
 assert.equal(finishIconResponse(responses,icons,{requestId:'document',encodedDataLength:100}),false);
 assert.equal(finishIconResponse(responses,icons,{requestId:'photo',encodedDataLength:20}),false);assert.equal(responses.get('https://example.invalid/photo.png').ready,true);
 assert.equal(finishIconResponse(responses,icons,{requestId:'icon',encodedDataLength:30}),true);assert.equal(responses.get(icons[0]).size,30);
 assert.equal(finishIconResponse(responses,icons,{requestId:'icon',encodedDataLength:30}),false);
});
