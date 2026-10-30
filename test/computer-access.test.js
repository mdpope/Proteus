import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {ComputerAccess} from '../src/services/remote/computer-access.js';
import {DesktopPeers} from '../src/services/remote/desktop-peers.js';
import {startServer} from '../src/server.js';import {startRelay} from '../relay/server.js';import {secret} from '../src/services/remote/remote-crypto.js';import {RemoteClient,until} from './remote-client.mjs';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {cleanupStack} from './helpers/cleanup.js';
const setup=t=>{const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-managed-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return {home,policy:new ComputerAccess(home)};};
test('computer role persists atomically, preserves future metadata, and rejects stale or invalid updates',async t=>{
 const {home,policy}=setup(t),first=policy.get();assert.equal(first.managed,false);policy.set({managed:true,expectedRevision:first.revision});assert.throws(()=>policy.assertOutgoing(),/managed-computer/);
 const file=path.join(home,'computer-access.json'),saved=JSON.parse(fs.readFileSync(file));saved.future={retained:true};fs.writeFileSync(file,JSON.stringify(saved));const restored=new ComputerAccess(home);
 assert.equal(restored.get().managed,true);assert.throws(()=>restored.set({managed:false,expectedRevision:first.revision}),/changed/);assert.throws(()=>restored.set({managed:'false',expectedRevision:saved.revision}),/Choose/);
 restored.set({managed:false,expectedRevision:saved.revision});assert.deepEqual(JSON.parse(fs.readFileSync(file)).future,{retained:true});
 fs.writeFileSync(file,'malformed');assert.throws(()=>new ComputerAccess(home));assert.equal(fs.readFileSync(file,'utf8'),'malformed');
 await assert.rejects(startServer({home,port:0,timers:false,providers:{}}));assert.equal(fs.readFileSync(file,'utf8'),'malformed');
});
test('managed startup hides retained peers and cache without consulting credential storage or starting network clients',async t=>{
 const {home,policy}=setup(t);policy.set({managed:true,expectedRevision:policy.get().revision});fs.writeFileSync(path.join(home,'desktop-peers.enc'),'retained encrypted bytes');fs.writeFileSync(path.join(home,'desktop-chat-index.enc'),'retained cache');
 let calls=0;const peers=new DesktopPeers(home,{accessPolicy:policy,safeStorage:{decryptString(){calls++;throw Error('Must not decrypt');}},clientFactory(){calls++;throw Error('Must not connect');}});t.after(()=>peers.close());
 assert.deepEqual(peers.list(),[]);assert.deepEqual((await peers.index()).items,[]);await assert.rejects(peers.pair('invalid'),/managed-computer/);await assert.rejects(peers.connect(randomUUID()),/managed-computer/);peers.resumeConnections();assert.equal(calls,0);
 assert.equal(fs.readFileSync(peers.file,'utf8'),'retained encrypted bytes');assert.equal(fs.readFileSync(peers.cacheFile,'utf8'),'retained cache');
});
test('enabling managed mode closes outgoing clients and rejects an in-flight response even after immediate re-enable',async t=>{
 const {home,policy}=setup(t),peers=new DesktopPeers(home,{accessPolicy:policy}),hostId=randomUUID();t.after(()=>peers.close());peers.loaded=true;let finish,closed=0;
 peers.records.set(hostId,{hostId});peers.cache.set(hostId,{items:[{title:'Private cached workspace'}]});peers.lastIndex={items:[{title:'Private cached workspace'}]};
 peers.sessions.set(hostId,{ready:true,client:{status:'online',close(){closed++;},request:()=>new Promise(resolve=>finish=resolve)}});
 const pending=peers.request(hostId,'projects.get');policy.set({managed:true,expectedRevision:policy.get().revision});assert.equal(closed,1);assert.equal(peers.sessions.size,0);assert.equal(peers.cache.size,0);assert.deepEqual(peers.list(),[]);
 policy.set({managed:false,expectedRevision:policy.get().revision});finish({projects:[{name:'Must not escape'}]});await assert.rejects(pending,/access changed/);
});
test('management pairing grants only the chosen incoming direction; ordinary invites and existing devices are unchanged',async t=>{
 const cleanup=cleanupStack(t),token=secret(),home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-managed-pair-'));
 cleanup(()=>fs.rmSync(home,{recursive:true,force:true}));
 const relay=await startRelay({port:0,token});cleanup(()=>relay.close());
 const app=await startServer({home,port:0,timers:false,providers:{}});cleanup(()=>app.close());
 const clients=[];cleanup(()=>{for(const client of clients)client.close();});
 const url='ws://127.0.0.1:'+relay.port;await app.remote.configure({enabled:true,mode:'external',relayURL:url,publicURL:url,relayToken:token});await until(()=>app.remote.status==='online');
 const pair=async management=>{const invite=await app.remote.pairing(undefined,{management}),client=new RemoteClient(RemoteClient.capsule(invite.code));clients.push(client);await client.connect();return client;};
 const ordinary=await pair(false);assert.equal(app.remote.config.devices.find(row=>row.id===ordinary.device.id).resourceAccess,false);
 const manager=await pair(true),device=app.remote.config.devices.find(row=>row.id===manager.device.id);assert.equal(device.resourceAccess,true);assert.equal(device.documentAccess,false);assert.notEqual(device.browserAccess,true);
 assert.equal(app.remote.config.devices.find(row=>row.id===ordinary.device.id).resourceAccess,false,'a new management invite cannot broaden an older device');
 const policy=await manager.request('computer.access.get');await assert.rejects(ordinary.request('computer.access.update',{managed:true,expectedRevision:policy.revision}),/Resource access/);
 await manager.request('computer.access.update',{managed:true,expectedRevision:policy.revision});assert.equal(app.computerAccess.get().managed,true);
 assert.ok((await manager.request('sync')).state.capabilities.includes('computer.access.v1'));assert.equal((await manager.request('projects.get')).enabled,true,'the same controller can still manage this host');
 app.remote.revoke(manager.device.id);await assert.rejects(app.remote.command({device:manager.device},{method:'computer.access.get'}),/Unknown paired device/);
});
