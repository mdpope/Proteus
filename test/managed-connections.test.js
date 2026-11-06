import test from 'node:test';
import assert from 'node:assert/strict';
import {ManagedConnections} from '../src/services/integrations/managed-connections.js';
const binding={connectionId:'one',configurationRevision:'revision-1',name:'example',workspaceId:'workspace',ownerId:'owner'};
const definition={name:'example',authentication:{adapter:'test'},expected:{principal:'person',tenant:'tenant',resource:'site'},capabilities:['issue.read'],probes:[{id:'issue-read',capability:'issue.read'}],policy:{requestTimeoutMs:1000,healthIntervalMs:900000,maxReadRetries:1}};
const tools=[{name:'read',inputSchema:{type:'object'},annotations:{readOnlyHint:true,idempotentHint:true}},{name:'write',inputSchema:{type:'object'},annotations:{readOnlyHint:false}},{name:'unknown',inputSchema:{type:'object'}}];
const content={content:[{type:'text',text:'synthetic evidence'}]};
function fixture(t,overrides={}){
 let connections=0,calls=[],closeCount=0,valid=true,now=100000;
 const notifications=[];
 const client={listTools:async()=>structuredClone(tools),callTool:async(name,args,context)=>{calls.push({name,args,runId:context.runId});return content;},verify:async()=>({principal:'person',tenant:'tenant',resource:'site',capabilities:['issue.read']}),close:async()=>{closeCount++;},...overrides};
 const registry={resolve:b=>{if(!valid||b.configurationRevision!=='revision-1')throw Error('changed');return definition;}};
 const service=new ManagedConnections({registry,now:()=>now,notify:n=>notifications.push(n),adapters:{test:{connect:async()=>{connections++;return client;}}}});
 t.after(()=>service.close());
 return {service,client,calls,notifications,connections:()=>connections,closeCount:()=>closeCount,change:()=>{valid=false;},advance:ms=>{now+=ms;}};
}
test('concurrent runs share transport but keep distinct per-call permissions and attribution',async t=>{
 const f=fixture(t),a=f.service.lease({runId:'a',bindings:[binding],isActive:()=>true,authorize:async r=>r.readOnly}),b=f.service.lease({runId:'b',bindings:[binding],isActive:()=>true,authorize:async()=>false});
 await Promise.all([a.catalog('example'),b.catalog('example')]);assert.equal(f.connections(),1);
 assert.equal(a.status('example').authentication,'unverified','tools/list is not authenticated access');
 assert.deepEqual(await a.call('example','read',{}),content);
 await assert.rejects(a.call('example','write',{}),{code:'PERMISSION_DENIED'});
 await assert.rejects(a.call('example','unknown',{}),{code:'PERMISSION_DENIED'});
 await assert.rejects(b.call('example','read',{}),{code:'PERMISSION_DENIED'});
 assert.deepEqual(f.calls.map(c=>c.runId),['a']);
 a.close();await assert.rejects(a.catalog('example'),{code:'CONNECTION_CLOSED'});assert.equal((await b.catalog('example')).length,3);
});
test('revision and active-run authority are rechecked after asynchronous approval',async t=>{
 const f=fixture(t);
 const lease=f.service.lease({runId:'a',bindings:[binding],isActive:()=>true,authorize:async()=>{f.change();return true;}});
 await assert.rejects(lease.call('example','read',{}),{code:'CONFIGURATION_MISMATCH'});assert.equal(f.calls.length,0);
});
test('uncertain write is never retried; only explicitly idempotent annotated reads may reconnect once',async t=>{
 let attempts=0;
 const f=fixture(t,{callTool:async()=>{attempts++;if(attempts===1)throw Object.assign(Error('expired'),{code:'AUTH_EXPIRED'});return content;}});
 const lease=f.service.lease({runId:'a',bindings:[binding],isActive:()=>true,authorize:async()=>true});
 assert.deepEqual(await lease.call('example','read',{}),content);assert.equal(attempts,2);assert.equal(f.connections(),2);
 f.client.callTool=async()=>{attempts++;throw Object.assign(Error('write outcome unknown'),{code:'AUTH_EXPIRED'});};
 await assert.rejects(lease.call('example','write',{}));assert.equal(attempts,3);assert.equal(f.connections(),2);
});
test('health verification is coalesced, cached, identity-scoped and recovers with a generation',async t=>{
 let probes=0;const f=fixture(t,{verify:async()=>{probes++;await new Promise(r=>setTimeout(r,10));return {principal:'person',tenant:'tenant',resource:'site',capabilities:['issue.read']};}});
 const states=await Promise.all(Array.from({length:8},()=>f.service.ensureReady(binding)));
 assert.ok(states.every(s=>s.state==='ready'&&s.authentication==='verified'));assert.equal(probes,1);
 await f.service.ensureReady(binding);assert.equal(probes,1);
 f.client.verify=async()=>{throw Object.assign(Error('token=never-log-this'),{code:'AUTH_REQUIRED'});};
 f.advance(900001);const failed=await f.service.ensureReady(binding);
 assert.equal(failed.state,'auth-required');assert.ok(!JSON.stringify(failed).includes('never-log-this'));
 await f.service.ensureReady(binding,{repair:true});assert.equal(f.notifications.length,1);
 f.client.verify=async()=>({principal:'person',tenant:'tenant',resource:'site',capabilities:['issue.read']});
 const restored=await f.service.ensureReady(binding,{repair:true});assert.equal(restored.state,'ready');assert.ok(restored.generation>states[0].generation);
});
test('tool-level failures remain failures and do not claim resource readiness',async t=>{
 const f=fixture(t,{callTool:async()=>({content:[],isError:true})});
 const lease=f.service.lease({runId:'a',bindings:[binding],isActive:()=>true,authorize:async()=>true});
 assert.equal((await lease.call('example','read',{})).isError,true);assert.equal(lease.status('example').access,'unverified');
});
test('connection errors have bounded cooldown and cannot disclose connector error strings',async t=>{
 const f=fixture(t,{listTools:async()=>{throw Object.assign(Error('Authorization: sensitive-token'),{code:'RATE_LIMITED',retryAfterMs:30000});}});
 const lease=f.service.lease({runId:'a',bindings:[binding],isActive:()=>true,authorize:async()=>true});
 await assert.rejects(lease.catalog('example'),e=>e.code==='RATE_LIMITED'&&!e.message.includes('sensitive-token'));
 assert.ok(!JSON.stringify(lease.status('example')).includes('sensitive-token'));
 await assert.rejects(lease.catalog('example'));assert.equal(f.connections(),1);
 f.advance(30001);await assert.rejects(lease.catalog('example'));assert.equal(f.connections(),2);
});

test('closing the first waiter does not abort another run sharing its connection',async t=>{
 let release;const gate=new Promise(r=>{release=r;});
 const f=fixture(t,{listTools:async()=>{await gate;return structuredClone(tools);}});
 const a=f.service.lease({runId:'a',bindings:[binding],isActive:()=>true,authorize:async()=>true});
 const b=f.service.lease({runId:'b',bindings:[binding],isActive:()=>true,authorize:async()=>true});
 const first=a.catalog('example');const rejected=assert.rejects(first,{code:'CONNECTION_CLOSED'});
 const second=b.catalog('example');await new Promise(r=>setImmediate(r));a.close();release();
 await rejected;assert.equal((await second).length,3);assert.equal(f.connections(),1);
});
test('reconnecting an expired read does not close another in-flight mutation',async t=>{
 let finish,started;const active=new Promise(r=>{started=r;});
 const pending=new Promise(r=>{finish=r;});let reads=0;
 const f=fixture(t,{callTool:async name=>{if(name==='write'){started();await pending;return content;}if(++reads===1)throw Object.assign(Error('expired'),{code:'SESSION_EXPIRED'});return content;}});
 const a=f.service.lease({runId:'a',bindings:[binding],isActive:()=>true,authorize:async()=>true});
 const b=f.service.lease({runId:'b',bindings:[binding],isActive:()=>true,authorize:async()=>true});
 const write=a.call('example','write',{});write.catch(()=>{});t.after(()=>finish());await active;
 assert.deepEqual(await b.call('example','read',{}),content);assert.equal(f.closeCount(),0);
 finish();await write;assert.equal(f.closeCount(),1);
});

test('canceling a coalesced readiness waiter does not cancel another scheduled check',async t=>{
 let release,started;const gate=new Promise(r=>{release=r;}),active=new Promise(r=>{started=r;});
 const f=fixture(t,{verify:async()=>{started();await gate;return {principal:'person',tenant:'tenant',resource:'site',capabilities:['issue.read']};}});
 const controller=new AbortController(),first=f.service.ensureReady(binding,{signal:controller.signal});
 const rejected=assert.rejects(first);await active;
 const second=f.service.ensureReady(binding);controller.abort();release();
 await rejected;assert.equal((await second).state,'ready');assert.equal(f.connections(),1);
});

test('expired upstream evidence is stale and a new session is acquired before the next operation',async t=>{
 let expired=false;const f=fixture(t,{isExpired:()=>expired});await f.service.ensureReady(binding);assert.equal(f.service.status(binding).stale,false);expired=true;assert.equal(f.service.status(binding).stale,true);
 const connect=f.service.adapters.test.connect;f.service.adapters.test.connect=async(...args)=>{expired=false;return connect(...args);};
 const lease=f.service.lease({runId:'a',bindings:[binding],isActive:()=>true,authorize:async()=>true});await lease.call('example','read',{});assert.equal(f.connections(),2);assert.equal(f.closeCount(),1);
});
