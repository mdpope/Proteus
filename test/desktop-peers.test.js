import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {DesktopPeers} from '../src/desktop-peers.js';import {startServer} from '../src/server.js';import {startRelay} from '../relay/server.js';import {atomicJSON} from '../src/files.js';import {secret} from '../src/remote-crypto.js';import {until} from './remote-client.mjs';
const key=randomBytes(32);const safeStorage={isEncryptionAvailable:()=>true,encryptString:text=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([iv,cipher.update(text),cipher.final(),cipher.getAuthTag()]);},decryptString:box=>{const decipher=createDecipheriv('aes-256-gcm',key,box.subarray(0,12));decipher.setAuthTag(box.subarray(-16));return Buffer.concat([decipher.update(box.subarray(12,-16)),decipher.final()]).toString();}};
const record={hostId:'11111111-1111-4111-8111-111111111111',deviceId:'22222222-2222-4222-8222-222222222222',relay:'wss://relay.example.test',key:'ab'.repeat(32),label:'Synthetic peer'};
const pairingCode=()=>Buffer.from(JSON.stringify({version:1,hostId:record.hostId,relay:record.relay,key:record.key,expiresAt:new Date(Date.now()+60000).toISOString()})).toString('base64url');
test('desktop workspace context inspection keeps the authenticated paired-host boundary',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peer-context-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const peers=new DesktopPeers(home,{safeStorage});peers.load();t.after(()=>peers.close());
 await assert.rejects(peers.request(record.hostId,'context.get',{workspaceId:'synthetic'}),/not paired/);
 peers.records.set(record.hostId,{...record,paused:true});await assert.rejects(peers.request(record.hostId,'context.get',{workspaceId:'synthetic'}),/paused/);
 peers.records.set(record.hostId,{...record});let sent;peers.sessions.set(record.hostId,{ready:true,client:{status:'online',request:async(method,args)=>{sent={method,args};return {workspaces:[{id:'synthetic'}]};},close(){}}});
 assert.deepEqual(await peers.request(record.hostId,'context.get',{workspaceId:'synthetic'}),{workspaces:[{id:'synthetic'}]});assert.deepEqual(sent,{method:'context.get',args:{workspaceId:'synthetic'}});
 await assert.rejects(peers.request(record.hostId,'context.arbitrary-write',{}),/Unsupported/);
});
test('pause is durable and hides cached incoming chats without deleting pairing',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peer-pause-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 fs.writeFileSync(path.join(home,'desktop-peers.enc'),safeStorage.encryptString(JSON.stringify([record])));
 let connects=0;const peers=new DesktopPeers(home,{safeStorage,clientFactory:()=>{connects++;throw new Error('Must not connect while paused');}});
 peers.load();peers.cache.set(record.hostId,{items:[{hostId:record.hostId,title:'Synthetic cached chat'}]});peers.saveCache();
 await peers.pause(record.hostId,true);assert.equal(peers.records.size,1);assert.equal(peers.list()[0].status,'paused');
 assert.deepEqual((await peers.index()).items,[]);await peers.indexPending;assert.deepEqual((await peers.index()).items,[]);
 await assert.rejects(peers.request(record.hostId,'sync'),/paused/);await assert.rejects(peers.connect(record.hostId),/paused/);assert.equal(connects,0);
 peers.close();const restored=new DesktopPeers(home,{safeStorage});assert.equal(restored.list()[0].paused,true);assert.equal(restored.cache.get(record.hostId).items.length,1);assert.deepEqual((await restored.index()).items,[]);await restored.indexPending;restored.close();
});
function forbiddenStorage(calls){return Object.fromEntries(['isEncryptionAvailable','getSelectedStorageBackend','encryptString','decryptString'].map(name=>[name,()=>{calls.push(name);throw new Error('Unexpected protected storage access');}]));}

test('missing peer store lists and indexes repeatedly without protected storage or orphan cache access',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peers-missing-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const cacheFile=path.join(home,'desktop-chat-index.enc'),orphan=safeStorage.encryptString(JSON.stringify({[record.hostId]:{items:[{title:'Orphan must stay private'}]}}));fs.writeFileSync(cacheFile,orphan);
  const originalRead=fs.readFileSync;t.mock.method(fs,'readFileSync',function(file,...args){assert.notEqual(file,cacheFile,'orphan cache must not be read');return originalRead.call(this,file,...args);});
  const calls=[],peers=new DesktopPeers(home,{safeStorage:forbiddenStorage(calls)});
  for(let i=0;i<3;i++){assert.deepEqual(peers.list(),[]);assert.deepEqual(await peers.index(),{items:[],hosts:[],partial:false});}
  assert.equal(peers.indexPending,null);assert.deepEqual(calls,[]);assert.equal(fs.existsSync(peers.file),false);assert.deepEqual(originalRead(cacheFile),orphan);assert.deepEqual(fs.readdirSync(home),['desktop-chat-index.enc']);
});

test('local chats API remains available with no peer store and no protected storage calls',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peers-local-index-')),calls=[];
  const app=await startServer({home,port:0,timers:false,providers:{}});app.peers=new DesktopPeers(home,{safeStorage:forbiddenStorage(calls)});
  t.after(async()=>{app.peers.close();await app.close();fs.rmSync(home,{recursive:true,force:true});});
  app.engine.runs.set('synthetic-local',{id:'synthetic-local',title:'Synthetic local chat',status:'completed',trigger:'chat',schedule:{provider:'rehearsal'},createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'});
  for(let i=0;i<3;i++){const response=await fetch(app.origin+'/api/chats/index',{headers:{Authorization:'Bearer '+app.token}});assert.equal(response.status,200);const result=await response.json();assert.equal(result.partial,false);assert.equal(result.items.length,1);assert.equal(result.items[0].id,'synthetic-local');assert.equal(result.items[0].local,true);assert.equal(result.hosts.length,1);}
  assert.deepEqual(calls,[]);assert.equal(fs.existsSync(app.peers.file),false);assert.equal(fs.existsSync(app.peers.cacheFile),false);
});

test('pairing preflights encryption before creating a client or consuming an invitation',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peers-pair-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  for(const storage of [{isEncryptionAvailable:()=>false},{...safeStorage,getSelectedStorageBackend:()=>'basic_text'}]){
    let clients=0;const peers=new DesktopPeers(home,{safeStorage:storage,clientFactory:()=>{clients++;throw new Error('must not connect');}});
    assert.deepEqual(peers.list(),[]);await assert.rejects(peers.pair(pairingCode(),'Synthetic'),/Unlock/);assert.equal(clients,0);assert.equal(peers.pairing.size,0);assert.equal(peers.records.size,0);assert.deepEqual(fs.readdirSync(home),[]);
  }
});

test('existing denied, corrupt, oversized, invalid and non-file stores fail closed and parse transactionally',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peers-storage-')),file=path.join(home,'desktop-peers.enc');t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  fs.writeFileSync(file,safeStorage.encryptString(JSON.stringify([record])));const original=fs.readFileSync(file);
  for(const storage of [{isEncryptionAvailable:()=>false},{...safeStorage,getSelectedStorageBackend:()=>'basic_text'},{...safeStorage,decryptString:()=>{throw new Error('denied');}}]){const peers=new DesktopPeers(home,{safeStorage:storage});assert.throws(()=>peers.list(),/Unlock|preserved/);await assert.rejects(peers.index(),/Unlock|preserved/);assert.deepEqual(fs.readFileSync(file),original);assert.equal(peers.loaded,false);assert.equal(peers.records.size,0);}
  for(const bytes of [Buffer.from('bad'),Buffer.alloc(200001),safeStorage.encryptString('{}'),safeStorage.encryptString(JSON.stringify([record,{...record,hostId:'invalid'}])),safeStorage.encryptString(JSON.stringify([record,record]))]){fs.writeFileSync(file,bytes);const peers=new DesktopPeers(home,{safeStorage});assert.throws(()=>peers.list(),/preserved/);assert.throws(()=>peers.list(),/preserved/);assert.equal(peers.records.size,0);assert.equal(peers.loaded,false);assert.deepEqual(fs.readFileSync(file),bytes);}
  fs.unlinkSync(file);fs.symlinkSync(path.join(home,'absent-target'),file);assert.throws(()=>new DesktopPeers(home,{safeStorage}).list(),/preserved/);assert.equal(fs.lstatSync(file).isSymbolicLink(),true);fs.unlinkSync(file);fs.mkdirSync(file);assert.throws(()=>new DesktopPeers(home,{safeStorage}).list(),/preserved/);assert.equal(fs.statSync(file).isDirectory(),true);
});

test('existing unreadable pairing store remains closed without changing its bytes',t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peers-unreadable-')),file=path.join(home,'desktop-peers.enc');t.after(()=>fs.rmSync(home,{recursive:true,force:true}));const bytes=safeStorage.encryptString(JSON.stringify([record]));fs.writeFileSync(file,bytes);
  const originalRead=fs.readFileSync;t.mock.method(fs,'readFileSync',function(target,...args){if(target===file)throw Object.assign(new Error('Denied'),{code:'EACCES'});return originalRead.call(this,target,...args);});
  const peers=new DesktopPeers(home,{safeStorage});assert.throws(()=>peers.list(),/preserved/);assert.equal(peers.loaded,false);assert.equal(peers.records.size,0);assert.deepEqual(originalRead(file),bytes);
});

test('authorized empty store decrypts once but repeated index reads do not encrypt a cache',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peers-empty-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));fs.writeFileSync(path.join(home,'desktop-peers.enc'),safeStorage.encryptString('[]'));
  let encrypted=0,decrypted=0;const peers=new DesktopPeers(home,{safeStorage:{...safeStorage,encryptString:()=>{encrypted++;throw new Error('Unexpected write');},decryptString:box=>{decrypted++;return safeStorage.decryptString(box);}}});
  for(let i=0;i<3;i++)assert.deepEqual(await peers.index(),{items:[],hosts:[],partial:false});assert.equal(decrypted,1);assert.equal(encrypted,0);assert.equal(fs.existsSync(peers.cacheFile),false);
});
test('protected writes never fall back to plaintext after empty-store startup',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peers-writes-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  for(const storage of [{isEncryptionAvailable:()=>false},{...safeStorage,getSelectedStorageBackend:()=>'basic_text'},{...safeStorage,encryptString:()=>{throw new Error('Encryption denied');}}]){
    const peers=new DesktopPeers(home,{safeStorage:storage});assert.deepEqual(peers.list(),[]);peers.records.set(record.hostId,record);peers.cache.set(record.hostId,{items:[{title:'Synthetic private cache'}]});
    assert.throws(()=>peers.save(),/Unlock|Encryption denied/);assert.throws(()=>peers.saveCache(),/Unlock|Encryption denied/);assert.deepEqual(fs.readdirSync(home),[]);
  }
});

test('real peer index remains bounded and encrypted through offline restart',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peers-bounded-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));fs.writeFileSync(path.join(home,'desktop-peers.enc'),safeStorage.encryptString(JSON.stringify([record])));
  class Client extends EventTarget{constructor(host){super();this.host=host;}async connect(){this.status='online';}async request(method){if(method==='sync')return {state:{hostName:record.label,runs:[]}};return Array.from({length:150},(_,i)=>({id:'synthetic-'+i,title:'Synthetic '+i,status:'completed'}));}close(){this.status='offline';}}
  const peers=new DesktopPeers(home,{safeStorage,clientFactory:host=>new Client(host)});await peers.index();await peers.indexPending;assert.equal((await peers.index()).items.length,100);const stored=fs.readFileSync(peers.cacheFile);assert.ok(!stored.includes(Buffer.from('Synthetic')));peers.close();
  const restarted=new DesktopPeers(home,{safeStorage,clientFactory:host=>Object.assign(new Client(host),{connect:async()=>{throw new Error('Synthetic offline');}})});const initial=await restarted.index();assert.equal(initial.items.length,100);await restarted.indexPending;const result=await restarted.index();assert.equal(result.items.length,100);assert.equal(result.partial,true);assert.equal(result.hosts[0].online,false);restarted.close();
});
test('host lifecycle event wins over an in-flight stale index and survives offline restart',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peers-lifecycle-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  fs.writeFileSync(path.join(home,'desktop-peers.enc'),safeStorage.encryptString(JSON.stringify([record])));
  let client,release,hold=false;
  class Client extends EventTarget{constructor(host){super();this.host=host;}async connect(){this.status='online';}async request(method){if(method==='sync')return {state:{hostName:record.label,runs:[]}};if(hold)await new Promise(resolve=>release=resolve);return [{id:'synthetic-chat',title:'Synthetic',status:'completed',updatedAt:'2026-01-01T00:00:00Z'}];}close(){this.status='offline';}}
  const peers=new DesktopPeers(home,{safeStorage,clientFactory:host=>client=new Client(host)});await peers.index();await peers.indexPending;await until(()=>peers.indexPending===null);
  assert.equal((await peers.index()).items.length,1);
  hold=true;peers.indexAt=0;await peers.index();await until(()=>Boolean(release));
  client.dispatchEvent(new CustomEvent('change',{detail:{event:'chat.lifecycle',data:{id:'synthetic-chat',deleted:true,deletedAt:'2026-01-02T00:00:00Z'}}}));
  release();await peers.indexPending;assert.equal((await peers.index()).items.length,0);peers.close();
  const restarted=new DesktopPeers(home,{safeStorage,clientFactory:host=>Object.assign(new Client(host),{connect:async()=>{throw new Error('Offline');}})});
  const initial=await restarted.index();assert.equal(initial.items.length,0);await restarted.indexPending;assert.equal((await restarted.index()).items.length,0);restarted.close();
});

class NamingClient {
  constructor(host){this.host=host;this.status='offline';this.listeners=new Map();this.name='Host-owned name';}
  addEventListener(type,listener){this.listeners.set(type,listener);}
  emit(type,detail){this.listeners.get(type)?.({detail});}
  async connect(){this.status='online';}
  async request(method){if(method==='sync')return {state:{hostName:this.name,runs:[]}};return [];}
  close(){this.status='offline';}
}
function namingFixture(t){
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peer-names-'));let client;
  fs.writeFileSync(path.join(home,'desktop-peers.enc'),safeStorage.encryptString(JSON.stringify([record])));
  fs.writeFileSync(path.join(home,'desktop-chat-index.enc'),safeStorage.encryptString(JSON.stringify({[record.hostId]:{items:[{id:'synthetic-chat',hostId:record.hostId,destinationName:record.label}],lastSyncAt:'2026-01-01T00:00:00Z'}})));
  const peers=new DesktopPeers(home,{safeStorage,clientFactory:host=>client=new NamingClient(host)});
  t.after(()=>{peers.close();fs.rmSync(home,{recursive:true,force:true});});return {home,peers,get client(){return client;}};
}
test('authenticated host names update labels without changing pairing identity and survive encrypted restart',async t=>{
  const f=namingFixture(t),{peers}=f;peers.load();const identity={...peers.records.get(record.hostId)};delete identity.label;
  await peers.connect(record.hostId);assert.equal(peers.list()[0].label,'Host-owned name');assert.equal(peers.cache.get(record.hostId).items[0].destinationName,'Host-owned name');
  f.client.name='Renamed through sync';await peers.request(record.hostId,'sync');assert.equal(peers.list()[0].label,f.client.name);
  f.client.emit('change',{event:'state',data:{hostName:'Renamed through state',runs:[]}});assert.equal(peers.list()[0].label,'Renamed through state');assert.equal(f.client.host.label,'Renamed through state');
  const current={...peers.records.get(record.hostId)};delete current.label;assert.deepEqual(current,identity);assert.equal(peers.cache.get(record.hostId).items[0].destinationName,'Renamed through state');
  assert.ok(!fs.readFileSync(peers.file).includes(Buffer.from('Renamed through state')));const restarted=new DesktopPeers(f.home,{safeStorage});assert.equal(restarted.list()[0].label,'Renamed through state');assert.equal(restarted.cache.get(record.hostId).items[0].destinationName,'Renamed through state');restarted.close();
});
test('authenticated Mac and Linux metadata refreshes without changing protected pairing records',async t=>{
  const f=namingFixture(t),{peers}=f;
  assert.equal(peers.list()[0].hostPlatform,'unknown');
  await peers.connect(record.hostId);
  for(const [hostPlatform,hostPlatformLabel,hostArchitecture] of [['linux','Linux','x64'],['darwin','macOS','arm64']]){
    f.client.emit('change',{event:'state',data:{hostName:'Host-owned name',hostPlatform,hostPlatformLabel:'Untrusted label',hostArchitecture,runs:[]}});
    const current=peers.list()[0];assert.equal(current.hostPlatform,hostPlatform);assert.equal(current.hostPlatformLabel,hostPlatformLabel);assert.equal(current.hostArchitecture,hostArchitecture);
    await peers.index();await peers.indexPending;assert.equal((await peers.index()).hosts[0].hostPlatform,hostPlatform);
  }
  const saved=JSON.parse(safeStorage.decryptString(fs.readFileSync(peers.file)))[0];assert.equal(Object.hasOwn(saved,'hostPlatform'),false);assert.equal(saved.key,record.key);
  f.client.status='offline';f.client.emit('change',{event:'state',data:{hostPlatform:'linux'}});assert.equal(peers.list()[0].hostPlatform,'darwin');
  f.client.status='online';f.client.emit('change',{event:'state',data:{runs:[]}});assert.equal(peers.list()[0].hostPlatform,'unknown');
  const replaced=f.client;await peers.disconnect(record.hostId);await peers.connect(record.hostId);replaced.emit('change',{event:'state',data:{hostPlatform:'linux'}});assert.equal(peers.list()[0].hostPlatform,'unknown');
});

test('private LAN desktop records reload with encrypted custody and no browser-policy relaxation',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peer-lan-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const lan={...record,relay:'ws://192.168.1.25:4318'},code=Buffer.from(JSON.stringify({version:1,hostId:lan.hostId,relay:lan.relay,key:lan.key,expiresAt:new Date(Date.now()+60000).toISOString()})).toString('base64url');
  const peers=new DesktopPeers(home,{safeStorage,clientFactory:(host,options)=>({connect:()=>options.onCredential({...lan,label:host.label}),close(){}})});
  await peers.pair(code,'Synthetic LAN');peers.close();
  const restored=new DesktopPeers(home,{safeStorage});assert.equal(restored.list()[0].hostId,lan.hostId);assert.equal(restored.records.get(lan.hostId).relay,lan.relay);assert.ok(!fs.readFileSync(restored.file).includes(Buffer.from(lan.key)));restored.close();
});
test('invalid, offline and superseded sessions cannot rename a saved desktop',async t=>{
  const f=namingFixture(t),{peers}=f;await peers.connect(record.hostId);const session=peers.sessions.get(record.hostId),original=fs.readFileSync(peers.file);
  for(const name of [null,42,{},'', '   ','x'.repeat(81),'bad\u0000name','bad\nname','bad\u007fname']){f.client.emit('change',{event:'state',data:{hostName:name}});assert.equal(peers.list()[0].label,'Host-owned name');}
  f.client.status='offline';f.client.emit('change',{event:'state',data:{hostName:'Offline spoof'}});assert.equal(peers.list()[0].label,'Host-owned name');f.client.status='online';
  peers.sessions.set(record.hostId,{client:new NamingClient({}),unread:false});f.client.emit('change',{event:'state',data:{hostName:'Old session spoof'}});peers.adoptHostName(record.hostId,session,'Old direct spoof');assert.equal(peers.list()[0].label,'Host-owned name');assert.deepEqual(fs.readFileSync(peers.file),original);
});
test('late authenticated sync response cannot rename a replaced desktop session',async t=>{
  const f=namingFixture(t),{peers}=f;await peers.connect(record.hostId);let resolve;f.client.request=()=>new Promise(r=>{resolve=r;});const pending=peers.request(record.hostId,'sync');
  peers.sessions.set(record.hostId,{client:new NamingClient({}),unread:false});resolve({state:{hostName:'Late response spoof'}});await assert.rejects(pending,/connection changed/);assert.equal(peers.list()[0].label,'Host-owned name');
});
test('failed protected rename preserves old credentials and cache without escaping state listener',async t=>{
  const f=namingFixture(t),{peers}=f;await peers.connect(record.hostId);const bytes=fs.readFileSync(peers.file),cached=structuredClone(peers.cache.get(record.hostId));peers.safeStorage={...safeStorage,encryptString:()=>{throw new Error('Synthetic encrypted write denied');}};
  assert.doesNotThrow(()=>f.client.emit('change',{event:'state',data:{hostName:'Must not persist'}}));assert.equal(peers.list()[0].label,'Host-owned name');assert.equal(f.client.host.label,'Host-owned name');assert.deepEqual(peers.cache.get(record.hostId),cached);assert.deepEqual(fs.readFileSync(peers.file),bytes);
});
test('pending connection metadata is ignored after explicit disconnect or removal',async t=>{
  for(const action of ['disconnect','remove'])await t.test(action,async t=>{
    const f=namingFixture(t),{peers}=f;let resolve;
    peers.clientFactory=host=>Object.assign(new NamingClient(host),{request:()=>new Promise(r=>{resolve=r;})});
    const pending=peers.connect(record.hostId);await until(()=>!!resolve);peers[action](record.hostId);resolve({state:{hostName:'Late obsolete connection'}});await assert.rejects(pending,/connection changed/i);
    const restarted=new DesktopPeers(f.home,{safeStorage});assert.deepEqual(restarted.list().map(item=>item.label),action==='remove'?[]:[record.label]);restarted.close();
  });
});

test('pairing adopts the destination capsule name instead of a caller alias',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peer-capsule-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const code=Buffer.from(JSON.stringify({version:1,hostId:record.hostId,relay:record.relay,key:record.key,label:'Destination-defined name',expiresAt:new Date(Date.now()+60000).toISOString()})).toString('base64url');
  const peers=new DesktopPeers(home,{safeStorage,clientFactory:(host,options)=>({connect:()=>options.onCredential({...record,label:host.label}),close(){}})});await peers.pair(code,'Ignored client alias');assert.equal(peers.list()[0].label,'Destination-defined name');assert.equal(new DesktopPeers(home,{safeStorage}).list()[0].label,'Destination-defined name');
});

test('two desktops isolate catalogs, runs and authorization across encrypted restart and revocation',async t=>{const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peers-')),token=secret(),relay=await startRelay({port:0,token}),url=`ws://127.0.0.1:${relay.port}`,apps=[];let peers=new DesktopPeers(path.join(home,'client'),{safeStorage});t.after(async()=>{peers.close();for(const app of apps)await app.close();await relay.close();fs.rmSync(home,{recursive:true,force:true});});
for(const name of ['Alpha','Beta']){const h=path.join(home,name),cwd=path.join(h,'workspace');fs.mkdirSync(cwd,{recursive:true});fs.writeFileSync(path.join(cwd,'AGENTS.md'),'# '+name+' instructions');atomicJSON(path.join(h,'settings.json'),{schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd,additionalDirectories:[]},skillDirectories:[],mcpServers:{}});const app=await startServer({home:h,port:0,timers:false});apps.push(app);await app.remote.configure({enabled:true,mode:'external',label:name,relayURL:url,publicURL:url,relayToken:token});await until(()=>app.remote.status==='online');await peers.pair((await app.remote.pairing()).code,name);}
const [a,b]=apps.map(app=>app.remote.config.hostId);assert.deepEqual(peers.list().map(p=>p.label),['Alpha','Beta']);const stored=fs.readFileSync(peers.file);assert.ok(!stored.includes(Buffer.from('Alpha')));assert.equal(fs.statSync(peers.file).mode&0o777,0o600);assert.ok(!JSON.stringify(peers.list()).includes('deviceId'));assert.ok(!JSON.stringify(peers.list()).includes('key'));
await assert.rejects(peers.request(a,'chat.start',{prompt:'must not run'}),/Reconnecting/);await peers.connect(a);await peers.connect(b);const sa=(await peers.request(a,'sync')).state,sb=(await peers.request(b,'sync')).state;assert.ok(sa.context.workspaces[0].cwd.includes('Alpha'));assert.ok(sb.context.workspaces[0].cwd.includes('Beta'));assert.ok(!JSON.stringify(sa.context).includes('/Beta/'));
const inventory=await peers.request(a,'integrations.list');assert.ok(Array.isArray(inventory.configurations));assert.ok(Array.isArray(inventory.consumers));await assert.rejects(peers.request(a,'integrations.check',{id:'unselected'}),/Unsupported desktop peer command/);await assert.rejects(peers.request(a,'integrations.recover',{id:'unselected'}),/Unsupported desktop peer command/);
const {runId}=await peers.request(a,'chat.start',{prompt:'Synthetic Alpha only',provider:'rehearsal',workspaceId:sa.context.defaultWorkspaceId});await until(()=>apps[0].engine.getRun(runId).pending);assert.equal(apps[1].engine.listRuns().length,0);await assert.rejects(peers.request(b,'chat.get',{id:runId}),/not found|Unknown/);await assert.rejects(peers.request(a,'schedule.run',{id:'anything'}),/ENOENT|not found/);await assert.rejects(peers.request(a,'arbitrary.execute',{}),/Unsupported/);
const run=await peers.request(a,'chat.get',{id:runId});await peers.request(a,'chat.reply',{id:runId,requestId:run.pending.id,answer:'Synthetic answer'});await until(()=>apps[0].engine.getRun(runId).status==='completed');
await peers.index();await peers.indexPending;assert.ok((await peers.index()).items.some(item=>item.id===runId));const encryptedIndex=fs.readFileSync(peers.cacheFile);assert.ok(!encryptedIndex.includes(Buffer.from(runId)));assert.equal(fs.statSync(peers.cacheFile).mode&0o777,0o600);
peers.close();peers=new DesktopPeers(path.join(home,'client'),{safeStorage});assert.equal(peers.list().length,2);assert.ok(peers.cache.get(a).items.some(item=>item.id===runId));assert.ok(peers.list().every(p=>p.status==='offline'));await peers.connect(a);assert.equal((await peers.request(a,'chat.get',{id:runId})).id,runId);await peers.connect(b);apps[0].remote.revoke(apps[0].remote.config.devices[0].id);await until(()=>peers.list().length===1);assert.equal(peers.list()[0].hostId,b);assert.equal(peers.cache.has(a),false);assert.equal(JSON.parse(safeStorage.decryptString(fs.readFileSync(peers.cacheFile)))[a],undefined);await assert.rejects(peers.request(a,'chat.resume',{id:runId,prompt:'not authorized'}),/not paired/);assert.equal((await peers.request(b,'sync')).state.runs.length,0);peers.remove(b);assert.equal(peers.list().length,0);assert.deepEqual(JSON.parse(safeStorage.decryptString(fs.readFileSync(peers.cacheFile))),{});assert.deepEqual(await peers.index(),{items:[],hosts:[],partial:false});
});

test('remote tab descriptors retain only explicit destination/run identity, with no cached content',async()=>{const {normalizeSession}=await import('../desktop/workspace-session.cjs');const hostId='11111111-1111-4111-8111-111111111111',runId='22222222-2222-4222-8222-222222222222';const value=normalizeSession({tabs:[{id:'one',type:'remote-run',hostId,runId,label:'Synthetic remote chat',key:'must disappear',prompt:'private draft',events:['private content']},{id:'two',type:'remote-run',hostId,runId},{id:'bad',type:'remote-run',hostId:'invalid',runId}],active:'one'});assert.equal(value.tabs.length,2);assert.deepEqual(value.tabs[1],{id:'peer:'+hostId+':'+runId,type:'remote-run',label:'Synthetic remote chat',hostId,runId});assert.ok(!JSON.stringify(value).includes('private'));});

test('recovery retries one host independently, never replays mutations, and respects disconnect',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-recovery-'));
  const second={...record,hostId:'33333333-3333-4333-8333-333333333333'};
  fs.writeFileSync(path.join(home,'desktop-peers.enc'),safeStorage.encryptString(JSON.stringify([record,second])));
  const clients=[],requests=[];let available=false;
  class Client extends EventTarget{
    constructor(host){super();this.host=host;this.status='offline';clients.push(this);}
    async connect(){if(this.host.hostId===second.hostId||!available)throw Error('Offline');this.status='online';}
    async request(method){requests.push(method);if(method==='chat.send')throw Error('Unknown outcome');return method==='sync'?{state:{runs:[]}}:[];}
    close(){this.status='closed';this.dispatchEvent(new CustomEvent('status',{detail:'offline'}));}
  }
  const peers=new DesktopPeers(home,{safeStorage,clientFactory:h=>new Client(h),retryBaseMs:10,retryMaxMs:20,heartbeatMs:0,random:()=>0});
  t.after(()=>{peers.close();fs.rmSync(home,{recursive:true,force:true});});
  await assert.rejects(peers.connect(record.hostId));await assert.rejects(peers.connect(second.hostId));available=true;
  await until(()=>peers.sessions.get(record.hostId)?.ready);
  assert.equal(peers.sessions.get(second.hostId)?.ready,false);
  await assert.rejects(peers.request(record.hostId,'chat.send',{}));peers.sessions.get(record.hostId).client.close();
  await until(()=>peers.sessions.get(record.hostId)?.ready);assert.equal(requests.filter(x=>x==='chat.send').length,1);
  peers.disconnect(record.hostId);await peers.index();await peers.indexPending;peers.resumeConnections();
  assert.equal(peers.sessions.has(record.hostId),false);assert.equal(peers.recovery.get(record.hostId).timer,null);
  await peers.connect(record.hostId);assert.equal(peers.sessions.get(record.hostId).ready,true);
  peers.sessions.get(record.hostId).client.dispatchEvent(new CustomEvent('recovery-blocked',{detail:{reason:'authentication'}}));
  peers.sessions.get(record.hostId).client.close();peers.resumeConnections();assert.equal(peers.recovery.get(record.hostId).timer,null);
  assert.equal(peers.list().find(p=>p.hostId===record.hostId).status,'needs-action');
  peers.close();assert.equal(peers.recovery.size,0);
});

test('offline requests start recovery without replaying commands or defeating backoff',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peer-demand-'));
  fs.writeFileSync(path.join(home,'desktop-peers.enc'),safeStorage.encryptString(JSON.stringify([record])));
  let available=false,clients=0;const requests=[];
  class Client extends EventTarget{
    constructor(host){super();this.host=host;this.status='offline';clients++;}
    async connect(){if(!available)throw Error('Offline');this.status='online';}
    async request(method){requests.push(method);return {state:{runs:[]}};}
    close(){this.status='closed';this.dispatchEvent(new CustomEvent('status',{detail:'offline'}));}
  }
  const peers=new DesktopPeers(home,{safeStorage,clientFactory:h=>new Client(h),retryBaseMs:60000,heartbeatMs:0});
  t.after(()=>{peers.close();fs.rmSync(home,{recursive:true,force:true});});
  await assert.rejects(peers.request(record.hostId,'chat.send'),/Reconnecting/);
  await until(()=>!!peers.recovery.get(record.hostId)?.timer);
  const timer=peers.recovery.get(record.hostId).timer;
  for(let i=0;i<5;i++){
    await assert.rejects(peers.request(record.hostId,'tabs.get'),/Reconnecting/);
    await assert.rejects(peers.connect(record.hostId,{automatic:true}),/Reconnecting/);
    await peers.index();await peers.indexPending;
  }
  assert.equal(clients,1);assert.equal(peers.recovery.get(record.hostId).timer,timer);assert.deepEqual(requests,[]);
  available=true;await peers.connect(record.hostId);await peers.request(record.hostId,'tabs.get');
  assert.deepEqual(requests,['sync','tabs.get']);
  peers.disconnect(record.hostId);await assert.rejects(peers.request(record.hostId,'tabs.get'),/disconnected/);assert.equal(clients,2);
  await peers.connect(record.hostId);peers.sessions.get(record.hostId).client.dispatchEvent(new CustomEvent('recovery-blocked'));peers.sessions.get(record.hostId).client.close();
  await assert.rejects(peers.request(record.hostId,'tabs.get'),/authentication/);assert.equal(clients,3);
});
