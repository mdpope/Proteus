import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createLiveEvents} from '../public/services/live-events.js';

test('shared worker fans out every event and retains the stream until the last window closes',()=>{
  const streams=[];
  class Source {constructor(url){this.url=url;this.readyState=0;this.listeners={};streams.push(this);}addEventListener(type,fn){this.listeners[type]=fn;}close(){this.closed=true;}emit(type,data){this.listeners[type]?.({data});}}
  const context=vm.createContext({EventSource:Source});
  vm.runInContext(fs.readFileSync(new URL('../public/services/live-events-worker.js',import.meta.url),'utf8'),context);
  const port=()=>({sent:[],postMessage(value){this.sent.push(value);},start(){},close(){this.closed=true;}});
  const a=port(),b=port();context.onconnect({ports:[a]});context.onconnect({ports:[b]});
  assert.equal(streams.length,1);assert.equal(streams[0].url,'/api/events');
  streams[0].readyState=1;streams[0].emit('open');
  for(const type of ['change','content-tabs','project-follow'])streams[0].emit(type,'payload-'+type);
  for(const client of [a,b])assert.deepEqual(client.sent.slice(-4).map(v=>[v.type,v.data??v.readyState]),[['state',1],['change','payload-change'],['content-tabs','payload-content-tabs'],['project-follow','payload-project-follow']]);
  a.onmessage({data:{type:'close'}});assert.equal(streams[0].closed,undefined);
  streams[0].readyState=0;streams[0].emit('error');assert.equal(b.sent.at(-1).readyState,0);
  streams[0].readyState=1;streams[0].emit('open');assert.equal(b.sent.at(-1).readyState,1);
  b.onmessage({data:{type:'close'}});assert.equal(streams[0].closed,true);
  const c=port();context.onconnect({ports:[c]});assert.equal(streams.length,2);
  streams[0].emit('change','obsolete');assert.equal(c.sent.some(row=>row.data==='obsolete'),false);
});

test('client forwards worker events, closes its port and falls back if the worker fails',()=>{
  const sources=[];class Source extends EventTarget {constructor(){super();this.readyState=0;sources.push(this);}close(){this.readyState=2;}}
  let worker;class Worker extends EventTarget {constructor(){super();worker=this;this.port={messages:[],postMessage(value){this.messages.push(value);},start(){},close(){this.closed=true;}};}}
  const stream=createLiveEvents({Worker,Source});let data;
  stream.addEventListener('project-follow',event=>{data=event.data;});
  worker.port.onmessage({data:{type:'state',readyState:1}});assert.equal(stream.readyState,1);
  worker.port.onmessage({data:{type:'project-follow',data:'hello'}});assert.equal(data,'hello');
  worker.dispatchEvent(new Event('error'));assert.equal(sources.length,1);assert.equal(worker.port.closed,true);
  sources[0].dispatchEvent(new MessageEvent('project-follow',{data:'direct'}));assert.equal(data,'direct');
  stream.close();assert.equal(sources[0].readyState,2);assert.equal(stream.readyState,2);
});

test('unavailable and nonresponsive shared workers use the direct stream',async()=>{
  const sources=[];class Source extends EventTarget {constructor(url){super();this.url=url;this.readyState=0;sources.push(this);}close(){this.readyState=2;}}
  const direct=createLiveEvents({Worker:null,Source});assert.equal(direct.url,'/api/events');direct.close();
  let port;class Worker extends EventTarget {constructor(){super();port=this.port={postMessage(){},start(){},close(){this.closed=true;}};}}
  const delayed=createLiveEvents({Worker,Source,timeout:10});
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(port.closed,true);assert.equal(sources.length,2);delayed.close();assert.equal(sources[1].readyState,2);
});
