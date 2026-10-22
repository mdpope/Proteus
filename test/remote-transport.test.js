import test from 'node:test';
import assert from 'node:assert/strict';
import {BrowserRemoteClient,importKey,unseal} from '../src/remote-client.js';
import {remoteTransportLimits as limits,transportBudget} from '../src/remote-transport.js';
import {sendRelayPacket} from '../relay/server.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';

class Socket extends EventTarget {readyState=1;bufferedAmount=0;sent=[];send(value){this.sent.push(JSON.parse(value));}close(code){this.readyState=3;this.closeCode=code;}}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function client(){const key=await importKey('a'.repeat(64)),value=new BrowserRemoteClient({hostId:'synthetic',deviceId:'device',key});value.socket=new Socket();value.status='online';value.prefix='synthetic';return value;}

test('request queues reject excess actions before transmission and release all queued bytes on close',async()=>{
 const remote=await client();let release;remote.sendQueue=new Promise(resolve=>{release=resolve;});
 const pending=Array.from({length:limits.pendingRequests},(_,index)=>remote.request('sync',{}, {id:'request-'+index}).catch(error=>error));
 await assert.rejects(remote.request('sync'),error=>error.code==='REMOTE_BUSY');assert.equal(remote.waiting.size,limits.pendingRequests);assert.equal(remote.socket.sent.length,0);
 remote.close();release();await remote.sendQueue;await Promise.all(pending);assert.equal(remote.waiting.size,0);assert.equal(remote.queuedSendBytes,0);assert.equal(remote.socket.sent.length,0);assert.ok(remote.host.key,'congestion/close retains protected pairing');
});
test('queued wire bytes and individual message bytes are bounded before encryption',async()=>{
 const remote=await client();let release;remote.sendQueue=new Promise(resolve=>{release=resolve;});
 await assert.rejects(remote.request('synthetic',{value:'x'.repeat(6_100_000)}),/message limit/);
 const pending=Array.from({length:4},(_,index)=>remote.request('synthetic',{value:'x'.repeat(2_999_000)}, {id:'large-'+index}).catch(error=>error));
 await assert.rejects(remote.request('synthetic',{value:'x'.repeat(2_999_000)}),error=>error.code==='REMOTE_BUSY');
 assert.ok(remote.queuedSendBytes<=limits.queuedSendBytes);remote.close();release();await remote.sendQueue;await Promise.all(pending);assert.equal(remote.queuedSendBytes,0);
});
test('encryption snapshots request arguments and preserves its retry identifier',async()=>{
 const remote=await client();let release;remote.sendQueue=new Promise(resolve=>{release=resolve;});const args={value:'original'},pending=remote.request('synthetic',args,{id:'stable-retry',issuedAt:'2026-10-22T00:00:00Z'}).catch(error=>error);args.value='changed after submission';release();await remote.sendQueue;
 const packet=remote.socket.sent[0],value=await unseal(remote.host.key,packet.box,'synthetic:client:1');assert.equal(value.id,'stable-retry');assert.equal(value.args.value,'original');assert.equal(value.issuedAt,'2026-10-22T00:00:00Z');remote.close();await pending;
});
test('closing a throttled connection cancels its pending delay without emitting queued actions',async()=>{
 const remote=await client();remote.sentAt=Array.from({length:80},()=>({at:Date.now(),bytes:100}));const pending=remote.request('sync').catch(error=>error);await tick();assert.ok(remote.sendDelay);remote.close();await remote.sendQueue;await pending;assert.equal(remote.sendDelay,null);assert.equal(remote.queuedSendBytes,0);assert.equal(remote.socket.sent.length,0);
});
test('incoming packet and byte queues stop before parsing an unbounded backlog',async()=>{
 for(const message of ['{"synthetic":true}',JSON.stringify({value:'x'.repeat(7_900_000)})]){
  const remote=await client();let release;remote.receiveQueue=new Promise(resolve=>{release=resolve;});let blocked=false;remote.addEventListener('recovery-blocked',()=>blocked=true);
  for(let index=0;index<=limits.queuedReceivePackets&&remote.status!=='closed';index++)remote.queueMessage(message);
  assert.equal(remote.status,'closed');assert.ok(remote.queuedReceivePackets<=limits.queuedReceivePackets);assert.ok(remote.queuedReceiveBytes<=limits.queuedReceiveBytes);assert.equal(blocked,false,'temporary congestion does not masquerade as credential failure');release();await remote.receiveQueue;assert.equal(remote.queuedReceivePackets,0);assert.equal(remote.queuedReceiveBytes,0);
 }
});
test('socket backlog checks include the next serialized packet',async()=>{
 const socket=new Socket(),packet={type:'synthetic'},size=Buffer.byteLength(JSON.stringify(packet));socket.bufferedAmount=limits.bufferedBytes-size+1;assert.equal(sendRelayPacket(socket,packet),false);assert.equal(socket.closeCode,1013);assert.equal(socket.sent.length,0);
 const remote=await client();remote.socket.bufferedAmount=limits.bufferedBytes-size+1;assert.throws(()=>remote.raw(packet),/cannot buffer/);assert.equal(remote.socket.sent.length,0);remote.close();
 const exact=new Socket();exact.bufferedAmount=limits.bufferedBytes-size;assert.equal(sendRelayPacket(exact,packet),true);assert.equal(exact.sent.length,1);
});
test('relay byte and packet budgets reset at a bounded window and treat directions independently',()=>{
 let now=0;const incoming=transportBudget({packets:3,bytes:100,windowMs:1000},()=>now),outgoing=transportBudget({packets:3,bytes:100,windowMs:1000},()=>now);
 assert.equal(incoming(60),true);assert.equal(incoming(41),false);assert.equal(outgoing(10),true);assert.equal(outgoing(10),true);assert.equal(outgoing(10),true);assert.equal(outgoing(1),false);now=1000;assert.equal(incoming(100),true);assert.equal(outgoing(100),true);
});
test('the minimal Docker relay file layout imports without an application source tree',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-relay-package-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.copyFileSync(new URL('../relay/server.js',import.meta.url),path.join(root,'server.mjs'));fs.copyFileSync(new URL('../relay/transport.mjs',import.meta.url),path.join(root,'transport.mjs'));fs.symlinkSync(fileURLToPath(new URL('../node_modules',import.meta.url)),path.join(root,'node_modules'));
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',`const module=await import(${JSON.stringify(pathToFileURL(path.join(root,'server.mjs')).href)});process.stdout.write(typeof module.startRelay);`],{encoding:'utf8'}),'function');
});
