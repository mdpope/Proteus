import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID,createCipheriv,createDecipheriv} from 'node:crypto';
import {BrowserHistory} from '../src/browser-history.js';
import {DesktopPeers} from '../src/desktop-peers.js';
import {startServer} from '../src/server.js';
import {startRelay} from '../relay/server.js';
import {atomicJSON} from '../src/files.js';
import {secret} from '../src/remote-crypto.js';
import {until} from './remote-client.mjs';
const key=randomBytes(32),safeStorage={isEncryptionAvailable:()=>true,encryptString:text=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([iv,cipher.update(text),cipher.final(),cipher.getAuthTag()]);},decryptString:box=>{const decipher=createDecipheriv('aes-256-gcm',key,box.subarray(0,12));decipher.setAuthTag(box.subarray(-16));return Buffer.concat([decipher.update(box.subarray(12,-16)),decipher.final()]).toString();}};
const record={hostId:'11111111-1111-4111-8111-111111111111',deviceId:'22222222-2222-4222-8222-222222222222',relay:'wss://relay.example.test',key:'ab'.repeat(32),label:'Synthetic peer'};
function fixture(t){const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peer-projects-'));const peers=new DesktopPeers(home,{safeStorage,heartbeatMs:0});peers.load();t.after(()=>{peers.close();fs.rmSync(home,{recursive:true,force:true});});return {home,peers};}

test('desktop project commands preserve pairing, pause, session and unknown-command boundaries',async t=>{
 const {peers}=fixture(t),methods=['projects.get','projects.update','sources.get','sources.update','chat.move','context.update','workspace.delete','tabs.manage'];
 for(const method of methods)await assert.rejects(peers.request(record.hostId,method),/not paired/);
 peers.records.set(record.hostId,{...record,paused:true});for(const method of methods)await assert.rejects(peers.request(record.hostId,method),/paused/);
 peers.records.set(record.hostId,{...record});const calls=[];let finish;
 const session={ready:true,client:{status:'online',request:async(method,args,options)=>{calls.push({method,args,options});if(method==='projects.get')return new Promise(resolve=>{finish=resolve;});return {ok:true};},close(){}}};peers.sessions.set(record.hostId,session);
 const options={id:randomUUID(),issuedAt:new Date().toISOString()},args={action:'create',workspaceId:'default',expectedRevision:'reviewed'};
 await peers.request(record.hostId,'projects.update',args,options);assert.deepEqual(calls[0],{method:'projects.update',args,options});
 await assert.rejects(peers.request(record.hostId,'projects.execute',{}),/Unsupported/);
 const pending=peers.request(record.hostId,'projects.get');peers.sessions.set(record.hostId,{...session});finish({memberships:{},projects:[]});await assert.rejects(pending,/connection changed/);
});

test('project catalog reconciliation preserves same-workspace moves through stale indexing and encrypted restart',async t=>{
 const {home,peers}=fixture(t);peers.records.set(record.hostId,{...record});peers.save();
 const row={id:'chat',chatId:'chat',hostId:record.hostId,workspaceId:'default',workspaceName:'Workspace',projectId:'old',projectName:'Old',updatedAt:'2026-01-01T00:00:00Z',archivedAt:'2025-12-01T00:00:00Z'};
 peers.cache.set(record.hostId,{items:[row],lastSyncAt:'2026-01-01T00:00:00Z'});
 const member={workspaceId:'default',workspaceName:'Workspace',projectId:'new',projectName:'Renamed project'},catalog={projects:[{id:'new'}],memberships:{chat:member}};
 peers.reconcileProjects(record.hostId,catalog);const merged=peers.membershipStatus(record.hostId,row);assert.deepEqual({...merged}, {...row,...member});assert.equal(merged.updatedAt,row.updatedAt);assert.equal(peers.lifecycleOverrides.size,0);
 const restarted=new DesktopPeers(home,{safeStorage});restarted.load();assert.deepEqual(restarted.cache.get(record.hostId).items[0],{...row,...member,destinationName:record.label});restarted.close();
 assert.ok(!fs.readFileSync(peers.cacheFile).includes(Buffer.from('Renamed project')));
 assert.equal(peers.membershipStatus(record.hostId,{...row,...member}).projectId,'new');assert.equal(peers.membershipOverrides.size,0);
 peers.reconcileProjects('33333333-3333-4333-8333-333333333333',{projects:[],memberships:{chat:{...member,projectId:'wrong-owner'}}});assert.equal(peers.cache.get(record.hostId).items[0].projectId,'new');
});

test('paired desktop projects, sources, chat membership and project tabs use the real owner protocol',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-peer-project-owner-')),token=secret(),relay=await startRelay({port:0,token}),url=`ws://127.0.0.1:${relay.port}`,apps=[];
 const history=new BrowserHistory(path.join(home,'client'),{hostId:randomUUID()});
 let peers=new DesktopPeers(path.join(home,'client'),{safeStorage,heartbeatMs:0,browserHistory:history});
 t.after(async()=>{peers.close();for(const app of apps)await app.close();await relay.close();await history.close();fs.rmSync(home,{recursive:true,force:true});});
 for(const name of ['Alpha','Beta']){
  const ownerHome=path.join(home,name),cwd=path.join(ownerHome,'workspace');fs.mkdirSync(cwd,{recursive:true});
  atomicJSON(path.join(ownerHome,'settings.json'),{schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd,additionalDirectories:[]},skillDirectories:[],mcpServers:{}});
  const app=await startServer({home:ownerHome,port:0,timers:false,withSeed:false,providers:{rehearsal:{async run(){}}}});app.engine.drain=async()=>{};apps.push(app);
  await app.remote.configure({enabled:true,mode:'external',label:name,relayURL:url,publicURL:url,relayToken:token});await until(()=>app.remote.status==='online');await peers.pair((await app.remote.pairing()).code,name);await peers.connect(app.remote.config.hostId);
 }
 const [a,b]=apps.map(app=>app.remote.config.hostId),request=(method,args,options)=>peers.request(a,method,args,options);
 let catalog=await request('projects.get');const originalDefault=catalog.defaultProjectIds.default,beforeBeta=await peers.request(b,'projects.get');
 assert.ok((await request('sync')).state.capabilities.includes('projects.v1'));
 const create={action:'create',workspaceId:'default',name:'Synthetic project',expectedRevision:catalog.revision},operation={id:randomUUID(),issuedAt:new Date().toISOString()};
 catalog=await request('projects.update',create,operation);const project=catalog.projects.find(row=>row.name==='Synthetic project');assert.ok(project);
 assert.deepEqual(await request('projects.update',create,operation),catalog,'a retry returns the same durable result');
 await assert.rejects(request('projects.update',{...create,name:'Stale second edit'}),/changed/);
 assert.deepEqual((await peers.request(b,'projects.get')).projects,beforeBeta.projects);
 await assert.rejects(peers.request(b,'tabs.get',{scope:'project',id:project.id}),/unavailable/);
 catalog=await request('projects.update',{action:'rename',projectId:project.id,name:'Renamed project',expectedRevision:catalog.revision});
 const {runId}=await request('chat.start',{projectId:project.id,provider:'rehearsal',prompt:'Synthetic project chat'});const run=await request('chat.get',{id:runId});assert.equal(run.projectId,project.id);
 await peers.index();await peers.indexPending;let indexed=(await peers.index()).items.find(row=>row.id===runId);assert.equal(indexed.projectId,project.id);assert.equal(indexed.projectName,'Renamed project');
 const result=await request('chat.move',{id:runId,projectId:originalDefault,workspaceId:'default',expectedUpdatedAt:run.updatedAt,expectedRevision:catalog.revision});assert.equal(result.memberships[runId].projectId,originalDefault);assert.equal(peers.cache.get(a).items.find(row=>row.id===runId).projectId,originalDefault);assert.equal(peers.lifecycleOverrides.has(a+':undefined'),false);
 catalog=await request('projects.get');let tabs=await request('tabs.get',{scope:'project',id:project.id});
 tabs=await request('tabs.mutate',{scope:'project',id:project.id,expectedRevision:tabs.revision,operations:[{action:'open',tab:{id:'synthetic-browser',type:'browser',url:'https://example.test/'}}]});
 await assert.rejects(request('tabs.manage',{action:'hide',scope:'project',id:project.id,tabId:'synthetic-browser',expectedRevision:tabs.revision}),/Resource access/);
 apps[0].remote.setResourceAccess(apps[0].remote.config.devices[0].id,true);
 tabs=await request('tabs.manage',{action:'hide',scope:'project',id:project.id,tabId:'synthetic-browser',expectedRevision:tabs.revision});assert.equal(tabs.tabs.find(row=>row.id==='synthetic-browser').hidden,true);
 await assert.rejects(request('tabs.mutate',{scope:'project',id:project.id,expectedRevision:tabs.revision,operations:[{action:'open',tab:{id:'chat:'+runId,type:'chat',chatId:runId}}]}),/another project/);
 const library=path.join(home,'source-library');fs.mkdirSync(library);fs.writeFileSync(path.join(library,'AGENTS.md'),'# Private synthetic source body\nDo not expose this text in catalog metadata.');
 catalog=await request('sources.update',{action:'add',path:library,expectedRevision:catalog.revision});const source=catalog.sourceLibrary.find(row=>row.path===fs.realpathSync(library));assert.ok(source);assert.ok(catalog.sourceEntries.length);assert.ok(!JSON.stringify(catalog).includes('Do not expose this text'));
 const currentRun=await request('chat.get',{id:runId});const movedWithSource=await request('chat.move',{id:runId,projectId:project.id,expectedUpdatedAt:currentRun.updatedAt,expectedRevision:catalog.revision});assert.ok(!JSON.stringify(movedWithSource).includes('Do not expose this text'),'project move returns sanitized source metadata');
 catalog=await request('sources.update',{action:'refresh',id:source.id,expectedRevision:catalog.revision});assert.equal((await request('sources.get')).revision,catalog.revision);
 catalog=await request('sources.update',{action:'remove',id:source.id,expectedRevision:catalog.revision});assert.equal(catalog.sourceLibrary.find(row=>row.id===source.id).available,false);assert.equal(fs.existsSync(path.join(library,'AGENTS.md')),true);
 catalog=await request('projects.update',{action:'delete',projectId:project.id,expectedRevision:catalog.revision});assert.ok(!catalog.projects.some(row=>row.id===project.id));assert.equal((await request('chat.get',{id:runId})).projectId,originalDefault);
 const eventId=randomUUID(),visit={eventId,url:'https://example.test/shared-visit',title:'Synthetic history',visitedAt:new Date().toISOString(),profileId:'default'};
 await request('browser.history.record',{events:[visit]});assert.equal((await request('browser.history.query',{search:'shared-visit'})).items.length,1);assert.equal((await peers.request(b,'browser.history.query',{search:'shared-visit'})).items.length,0);
 assert.deepEqual((await peers.syncHistory()).results,[],'sharing stays opt-in');assert.equal((await history.query({search:'shared-visit'})).items.length,0);
 await history.settings({peers:[{hostId:a,enabled:true,profileIds:['default'],backfill:'all'}]});await peers.syncHistory(a);assert.equal((await history.query({search:'shared-visit'})).items.length,1);await peers.syncHistory(a);assert.equal((await history.query({search:'shared-visit'})).items.length,1,'retry keeps the same event identity');
 const context=await request('context.get');await assert.rejects(request('context.update',{action:'workspace',workspaceId:'default',name:'Never applied',expectedRevision:'stale'}),/changed/);assert.equal((await request('context.get')).revision,context.revision);
 apps[0].remote.setResourceAccess(apps[0].remote.config.devices[0].id,false);await assert.rejects(request('workspace.delete',{workspaceId:'default'}),/Resource access/);
 peers.close();peers=new DesktopPeers(path.join(home,'client'),{safeStorage,heartbeatMs:0});peers.load();assert.equal(peers.cache.get(a).items.find(row=>row.id===runId).projectId,originalDefault);await peers.connect(a);
 apps[0].remote.revoke(apps[0].remote.config.devices[0].id);await until(()=>!peers.records.has(a));await assert.rejects(peers.request(a,'projects.get'),/not paired/);assert.equal(peers.cache.has(a),false);
});
