import test from 'node:test';
import assert from 'node:assert/strict';
import external from '../desktop/services/external-urls.cjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('OS website URLs exclude credentials, non-web schemes and control characters',()=>{
 for(const raw of ['javascript:alert(1)','file:///etc/passwd','https://user:secret@example.com','https://example.com\n','proteus://chat/a',null])assert.equal(external.webURL(raw),null);
 assert.equal(external.webURL('https://example.com:8443/path?q=1#fragment'),'https://example.com:8443/path?q=1#fragment');
});
test('cold links wait for restored UI, preserve order and repeated URLs; failures do not replay opened tabs',async()=>{
 let ready=false;const opened=[],errors=[];
 const queue=new external.ExternalURLs({target:async()=>ready?{id:'window'}:null,open:async(ctx,url)=>{assert.equal(ctx.id,'window');opened.push(url);if(url.endsWith('/fail'))throw Error('synthetic');},onError:error=>errors.push(error.message)});
 for(const suffix of ['/one','/one','/fail','/last'])queue.receive('https://example.test'+suffix);
 await tick();assert.deepEqual(opened,[]);ready=true;await queue.drain();
 assert.deepEqual(opened.map(url=>new URL(url).pathname),['/one','/one','/fail','/last']);assert.deepEqual(errors,['synthetic']);assert.equal(queue.queue.length,0);
 await queue.drain();assert.equal(opened.length,4);
});
test('incoming links during an open are serialized and the queue is bounded',async()=>{
 let release;const opened=[],errors=[],gate=new Promise(resolve=>release=resolve);
 const queue=new external.ExternalURLs({target:async()=>({}),open:async(_,url)=>{opened.push(url);await gate;},onError:error=>errors.push(error.message)});
 queue.receive('https://example.test/first');await tick();
 for(let i=0;i<65;i++)queue.receive('https://example.test/'+i);
 assert.equal(opened.length,1);assert.equal(queue.queue.length,64);assert.equal(errors.length,1);release();await tick();assert.equal(opened.length,65);
});
