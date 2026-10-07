import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ContentTabs,contentTab,workspaceContentScopes} from '../src/content-tabs.js';
import {startServer} from '../src/server.js';
import {startRelay} from '../relay/server.js';
import {RemoteClient,until} from './remote-client.mjs';
import {secret} from '../src/remote-crypto.js';
import {atomicJSON} from '../src/files.js';
function store(t){const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-tabs-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return {home,tabs:new ContentTabs(home)};}
const browser={id:'browser-a',type:'browser',title:'Synthetic page',url:'https://example.test/one'};
test('tab descriptors converge with atomic revisions, duplicate prevention and local-state omission',t=>{
 const {tabs,home}=store(t),initial=tabs.get('chat','run-a');assert.equal(initial.revision,0);
 const first=tabs.mutate({scope:'chat',id:'run-a',expectedRevision:0,operations:[{action:'open',tab:{...browser,cookies:'secret',selected:true,scroll:99,content:'private'}}]});assert.equal(first.revision,1);assert.deepEqual(first.tabs,[browser]);
 assert.equal(tabs.mutate({scope:'chat',id:'run-a',expectedRevision:1,operations:[{action:'open',tab:browser}]}).revision,1);
 assert.throws(()=>tabs.mutate({scope:'chat',id:'run-a',expectedRevision:0,operations:[{action:'close',id:browser.id}]}),/changed/);
 const second=new ContentTabs(home).mutate({scope:'chat',id:'run-a',expectedRevision:1,operations:[{action:'open',tab:{...browser,id:'browser-b'}},{action:'rename',id:browser.id,title:'Renamed'},{action:'reorder',ids:['browser-b','browser-a']}]});assert.equal(second.revision,2);assert.equal(second.tabs[1].title,'Renamed');assert.deepEqual(new ContentTabs(home).get('chat','run-a'),second);assert.equal(fs.statSync(tabs.file).mode&0o777,0o600);
 tabs.mutate({scope:'chat',id:'run-a',expectedRevision:2,operations:[{action:'close',id:'browser-b'},{action:'close',id:'browser-a'}]});tabs.seedWorkspace({tabs:[{id:'run-a',type:'run'},{...browser,type:'browser',parentId:'run-a',label:'Stale restore'}]});assert.equal(tabs.get('chat','run-a').tabs.length,0);
});
test('sync sanitizes private URLs, separates scopes and never exports terminals or source paths',t=>{
 const {tabs}=store(t);for(const url of ['file:///etc/passwd','https://user:pass@example.test/','https://example.test/?access_token=secret','https://example.test/#pair=secret'])assert.throws(()=>contentTab({...browser,url}),/private|sensitive/);
 assert.throws(()=>contentTab({...browser,type:'terminal'}),/bounded/);
 const result=workspaceContentScopes({tabs:[{id:'run-a',type:'run'},{id:'runtime-a',contentTabId:'stable-a',type:'browser',parentId:'run-a',label:'Site',url:browser.url},{id:'md',type:'markdown',parentId:'run-a',file:'/tmp/synthetic.md',label:'Notes'},{id:'terminal',type:'terminal',parentId:'run-a',terminal:{command:'never'}}],team:{tabs:[{id:'team',type:'browser',title:'Team',url:browser.url}]}});
 assert.equal(result[0].tabs[0].id,'stable-a');assert.equal(result[0].tabs.length,2);assert.doesNotMatch(JSON.stringify(result),/\/tmp|command|never|terminal/);tabs.seedWorkspace({tabs:[]});assert.equal(tabs.get('team','team').revision,0);assert.throws(()=>tabs.get('other','run-a'),/explicit/);
});
test('corrupt tab state is preserved rather than silently replaced',t=>{const {tabs}=store(t);fs.writeFileSync(tabs.file,'bad');assert.throws(()=>tabs.get('chat','run'),/preserved/);assert.equal(fs.readFileSync(tabs.file,'utf8'),'bad');});
test('paired synthetic clients reconcile descriptors and enforce current document grants and revocation',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-tabs-protocol-'));const workspace=path.join(home,'workspace');fs.mkdirSync(workspace);atomicJSON(path.join(home,'settings.json'),{schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}});
 const token=secret(),relay=await startRelay({port:0,token}),app=await startServer({home,port:0,timers:false}),clients=[];
 t.after(async()=>{clients.forEach(c=>c.close());await app.close();await relay.close();fs.rmSync(home,{recursive:true,force:true});});
 const url=`ws://127.0.0.1:${relay.port}`;await app.remote.configure({enabled:true,mode:'external',relayURL:url,publicURL:url,relayToken:token});await until(()=>app.remote.status==='online');
 const connect=async()=>{const client=new RemoteClient(RemoteClient.capsule((await app.remote.pairing()).code));clients.push(client);await client.connect();return client;};const first=await connect(),second=await connect();
 assert.ok((await first.request('sync')).state.capabilities.includes('content-tabs.v1'));
 const started=await first.request('chat.start',{prompt:'Synthetic descriptor fixture',provider:'rehearsal'}),id=started.runId;
 let state=await first.request('tabs.get',{scope:'chat',id});assert.equal(state.revision,0);
 state=await first.request('tabs.mutate',{scope:'chat',id,expectedRevision:0,operations:[{action:'open',tab:browser}]});assert.equal(state.revision,1);assert.deepEqual((await second.request('tabs.get',{scope:'chat',id})).tabs,[browser]);
 await assert.rejects(second.request('tabs.mutate',{scope:'chat',id,expectedRevision:0,operations:[{action:'close',id:browser.id}]}),/changed/);
 const doc={id:'document:'+'a'.repeat(64),type:'document',title:'Synthetic note',documentId:'a'.repeat(64),mediaType:'text/markdown'};app.contentTabs.mutate({scope:'chat',id,expectedRevision:1,operations:[{action:'open',tab:doc}]});
 assert.equal((await second.request('tabs.get',{scope:'chat',id})).tabs.length,1);
 await assert.rejects(second.request('tabs.mutate',{scope:'chat',id,expectedRevision:2,operations:[{action:'open',tab:doc}]}),/View chat documents/);
 app.remote.setDocumentAccess(second.device.id,true);assert.equal((await second.request('tabs.get',{scope:'chat',id})).tabs.length,2);
 app.remote.setDocumentAccess(second.device.id,false);assert.equal((await second.request('tabs.get',{scope:'chat',id})).tabs.length,1);
 const browserOnly=await second.request('tabs.mutate',{scope:'chat',id,expectedRevision:2,operations:[{action:'open',tab:{...browser,id:'browser-b'}},{action:'reorder',ids:['browser-b','browser-a']}]});assert.deepEqual(browserOnly.tabs.map(tab=>tab.id),['browser-b','browser-a']);assert.equal(app.contentTabs.get('chat',id).tabs.length,3);await assert.rejects(second.request('tabs.mutate',{scope:'chat',id,expectedRevision:3,operations:[{action:'open',tab:{...browser,id:doc.id}}]}),/reserved/);
 app.remote.setDocumentAccess(second.device.id,true);const replayID='11111111-1111-4111-8111-111111111111',replayArgs={scope:'chat',id,expectedRevision:3,operations:[{action:'rename',id:'browser-a',title:'Safe replay'}]};assert.equal((await second.request('tabs.mutate',replayArgs,replayID)).tabs.length,3);app.remote.setDocumentAccess(second.device.id,false);assert.equal((await second.request('tabs.mutate',replayArgs,replayID)).tabs.length,2,'Replay rechecks the current document grant');
 const before=app.remote.config.devices.map(device=>({...device}));const status=app.remote.deviceStatus(first.device.id);assert.equal(status.device.online,true);assert.ok(status.checkedAt);assert.deepEqual(app.remote.config.devices,before);
 const team=await first.request('tabs.mutate',{scope:'team',id:'team',expectedRevision:0,operations:[{action:'open',tab:{...browser,id:'team-a'}}]});assert.equal(team.revision,1);assert.equal((await second.request('tabs.get',{scope:'team',id:'team'})).tabs[0].id,'team-a');
 app.remote.revoke(second.device.id);await until(()=>app.remote.info().devices.every(device=>device.id!==second.device.id));const revoked=new RemoteClient(second.capsule,second.device);clients.push(revoked);await assert.rejects(revoked.connect(),/rejected|revoked/);
});
test('host-open document registry remains private and resolves only an open chat-bound descriptor',t=>{
 const {tabs}=store(t),session={tabs:[{id:'run-a',type:'run'},{id:'notes',type:'markdown',parentId:'run-a',file:'/tmp/synthetic-notes.md',label:'Notes'}]};
 tabs.seedWorkspace(session);const descriptor=tabs.get('chat','run-a').tabs[0];assert.doesNotMatch(JSON.stringify(descriptor),/\/tmp|source|content/);assert.equal(tabs.documentSource('run-a',descriptor.documentId),'/tmp/synthetic-notes.md');assert.throws(()=>tabs.documentSource('run-b',descriptor.documentId),/no longer open/);
 tabs.mutate({scope:'chat',id:'run-a',expectedRevision:1,operations:[{action:'close',id:descriptor.id}]});assert.throws(()=>tabs.documentSource('run-a',descriptor.documentId),/no longer open/);assert.equal(fs.statSync(tabs.sourcesFile).mode&0o777,0o600);
 fs.writeFileSync(tabs.sourcesFile,'corrupt');assert.throws(()=>tabs.seedWorkspace(session),/preserved/);assert.equal(fs.readFileSync(tabs.sourcesFile,'utf8'),'corrupt');
});
test('shared browser history keeps selected page, bounds and redacts sensitive entries',t=>{
 const {tabs}=store(t);const tab={...browser,history:{index:2,entries:[{url:'https://example.test/older',title:'Older'},{url:'https://example.test/callback?token=secret',title:'Login'},{url:browser.url,title:'Current',pageState:'secret'}]}};
 const result=tabs.mutate({scope:'chat',id:'history',expectedRevision:0,operations:[{action:'open',tab}]});
 assert.deepEqual(result.tabs[0].history,{index:1,entries:[{url:'https://example.test/older',title:'Older'},{url:browser.url,title:'Current'}]});
 assert.deepEqual(tabs.get('chat','history'),result);
});
