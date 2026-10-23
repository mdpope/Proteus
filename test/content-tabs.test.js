import {assertPrivate} from './helpers/permissions.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ContentTabs,contentTab,workspaceContentScopes} from '../src/services/workspaces/content-tabs.js';
import {startServer} from '../src/server.js';
import {startRelay} from '../relay/server.js';
import {RemoteClient,until} from './remote-client.mjs';
import {secret} from '../src/services/remote/remote-crypto.js';
import {atomicJSON} from '../src/shared/files.js';
function store(t){const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-tabs-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));return {home,tabs:new ContentTabs(home)};}
const browser={id:'browser-a',type:'browser',title:'Synthetic page',url:'https://example.test/one'};
test('legacy browser-only main registry imports newly managed saved surfaces once and retains closed-tab authority',t=>{
 const {tabs,home}=store(t),session={tabs:[{id:'run-a',type:'run',label:'Saved chat'}, {...browser,label:'Stale browser title'}, {id:'term-view',type:'terminal',terminal:{id:'term-a'},label:'Saved terminal'}, {id:'viewer',type:'markdown',file:path.join(home,'fixture.md'),label:'Saved viewer'}, {id:'child-browser',type:'browser',parentId:'run-a',label:'Chat child',url:browser.url}]};
 fs.writeFileSync(tabs.file,JSON.stringify({schemaVersion:1,extension:'retained',scopes:{'main:main':{revision:7,extension:'retained',tabs:[browser]}}}));
 tabs.seedWorkspace(session);let main=tabs.get('main','main');assert.deepEqual(main.tabs.map(tab=>tab.type),['chat','browser','terminal','document']);assert.equal(main.tabs[1].title,browser.title);assert.equal(main.revision,8);assert.equal(tabs.get('chat','run-a').tabs[0].id,'child-browser');
 let saved=JSON.parse(fs.readFileSync(tabs.file));assert.equal(saved.extension,'retained');assert.equal(saved.scopes['main:main'].extension,'retained');assert.equal(saved.scopes['main:main'].desktopSeedVersion,2);
 const bytes=fs.readFileSync(tabs.file,'utf8');tabs.seedWorkspace(session);assert.equal(fs.readFileSync(tabs.file,'utf8'),bytes);
 tabs.mutate({scope:'main',id:'main',expectedRevision:main.revision,operations:[{action:'close',id:'chat:run-a'},{action:'close',id:'terminal:term-a'}]});new ContentTabs(home).seedWorkspace(session);main=tabs.get('main','main');assert.deepEqual(main.tabs.map(tab=>tab.type),['browser','document']);
 const other=store(t);fs.writeFileSync(other.tabs.file,JSON.stringify({schemaVersion:1,scopes:{'main:main':{revision:7,tabs:[]}}}));other.tabs.seedWorkspace(session);assert.equal(other.tabs.get('main','main').tabs.some(tab=>tab.type==='browser'),false);
});
test('legacy main import preserves canonical browser ordering and local imported-surface ordering',t=>{
 const {tabs}=store(t),other={...browser,id:'browser-b'},session={tabs:[{id:'run-a',type:'run',label:'First chat'},browser,{id:'run-b',type:'run',label:'Second chat'},other]};
 tabs.mutate({scope:'main',id:'main',expectedRevision:0,operations:[{action:'open',tab:other},{action:'open',tab:browser}]});tabs.seedWorkspace(session);
 const rows=tabs.get('main','main').tabs;assert.deepEqual(rows.filter(tab=>tab.type==='browser').map(tab=>tab.id),['browser-b','browser-a']);assert.deepEqual(rows.filter(tab=>tab.type==='chat').map(tab=>tab.chatId),['run-a','run-b']);
});
test('tab descriptors converge with atomic revisions, duplicate prevention and local-state omission',t=>{
 const {tabs,home}=store(t),initial=tabs.get('chat','run-a');assert.equal(initial.revision,0);
 const first=tabs.mutate({scope:'chat',id:'run-a',expectedRevision:0,operations:[{action:'open',tab:{...browser,cookies:'secret',selected:true,scroll:99,content:'private'}}]});assert.equal(first.revision,1);assert.deepEqual(first.tabs,[browser]);
 assert.equal(tabs.mutate({scope:'chat',id:'run-a',expectedRevision:1,operations:[{action:'open',tab:browser}]}).revision,1);
 assert.throws(()=>tabs.mutate({scope:'chat',id:'run-a',expectedRevision:0,operations:[{action:'close',id:browser.id}]}),/changed/);
 const second=new ContentTabs(home).mutate({scope:'chat',id:'run-a',expectedRevision:1,operations:[{action:'open',tab:{...browser,id:'browser-b'}},{action:'rename',id:browser.id,title:'Renamed'},{action:'reorder',ids:['browser-b','browser-a']}]});assert.equal(second.revision,2);assert.equal(second.tabs[1].title,'Renamed');assert.deepEqual(new ContentTabs(home).get('chat','run-a'),second);assertPrivate(tabs.file,0o600);
 tabs.mutate({scope:'chat',id:'run-a',expectedRevision:2,operations:[{action:'close',id:'browser-b'},{action:'close',id:'browser-a'}]});tabs.seedWorkspace({tabs:[{id:'run-a',type:'run'},{...browser,type:'browser',parentId:'run-a',label:'Stale restore'}]});assert.equal(tabs.get('chat','run-a').tabs.length,0);
});
test('sync sanitizes private URLs, separates scopes and never exports terminals or source paths',t=>{
 const {tabs}=store(t);for(const url of ['file:///etc/passwd','https://user:pass@example.test/'])assert.throws(()=>contentTab({...browser,url}),/private|sensitive/);
 assert.throws(()=>contentTab({...browser,type:'terminal'}),/bounded/);
 const result=workspaceContentScopes({tabs:[{id:'run-a',type:'run'},{id:'runtime-a',contentTabId:'stable-a',type:'browser',parentId:'run-a',label:'Site',url:browser.url},{id:'md',type:'markdown',parentId:'run-a',file:'/tmp/synthetic.md',label:'Notes'},{id:'terminal',type:'terminal',parentId:'run-a',terminal:{command:'never'}}],team:{tabs:[{id:'team',type:'browser',title:'Team',url:browser.url}]}});
 assert.equal(result[0].tabs[0].id,'stable-a');assert.equal(result[0].tabs.length,2);assert.doesNotMatch(JSON.stringify(result),/\/tmp|command|never|terminal/);tabs.seedWorkspace({tabs:[]});assert.equal(tabs.get('team','team').revision,0);assert.throws(()=>tabs.get('other','run-a'),/explicit/);
});
test('corrupt tab state is preserved rather than silently replaced',t=>{const {tabs}=store(t);fs.writeFileSync(tabs.file,'bad');assert.throws(()=>tabs.get('chat','run'),/preserved/);assert.equal(fs.readFileSync(tabs.file,'utf8'),'bad');});
test('paired synthetic clients reconcile descriptors and enforce current document grants and revocation',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-tabs-protocol-'));const workspace=path.join(home,'workspace');fs.mkdirSync(workspace);atomicJSON(path.join(home,'settings.json'),{schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}});
 const token=secret(),relay=await startRelay({port:0,token}),app=await startServer({home,port:0,timers:false}),clients=[];
 t.after(async()=>{clients.forEach(c=>c.close());await app.close();await relay.close();fs.rmSync(home,{recursive:true,force:true});});
 const url=`ws://127.0.0.1:${relay.port}`;await app.remote.configure({enabled:true,mode:'external',relayURL:url,publicURL:url,relayToken:token});await until(()=>app.remote.status==='online');
 const connect=async()=>{const client=new RemoteClient(RemoteClient.capsule((await app.remote.pairing()).code));clients.push(client);await client.connect();return client;};const first=await connect(),second=await connect();
 assert.ok((await first.request('sync')).state.capabilities.includes('content-tabs.v1'));
 const started=await first.request('chat.start',{prompt:'Synthetic descriptor fixture',provider:'rehearsal'}),id=started.runId;
 let state=await first.request('tabs.get',{scope:'chat',id});assert.equal(state.revision,0);
 state=await first.request('tabs.mutate',{scope:'chat',id,expectedRevision:0,operations:[{action:'open',tab:browser}]});assert.equal(state.revision,1);const mirrored=(await second.request('tabs.get',{scope:'chat',id})).tabs;assert.deepEqual(mirrored.map(({history,...tab})=>tab),[{...browser,profileName:'Default'}]);assert.equal(mirrored[0].history.entries[mirrored[0].history.index].url,browser.url);assert.ok(mirrored[0].history.currentEntryId);assert.equal(mirrored[0].history.revision,0);
 await assert.rejects(second.request('tabs.mutate',{scope:'chat',id,expectedRevision:0,operations:[{action:'close',id:browser.id}]}),/changed/);
 const entryA=mirrored[0].history.currentEntryId,operationId='77777777-7777-4777-8777-777777777777',navArgs={scope:'chat',id,operations:[{action:'browser-navigate',tabId:browser.id,entryId:'entry-b',operationId,baseRevision:0,url:'https://example.test/two',visitedAt:'2026-10-12T12:00:00Z'}]};
 let navigated=await first.request('tabs.mutate',navArgs);assert.equal(navigated.tabs[0].history.revision,1);assert.equal((await second.request('tabs.get',{scope:'chat',id})).tabs[0].url,'https://example.test/two');
 await first.request('tabs.mutate',navArgs);assert.equal((await app.browserHistory.query()).total,1);
 await second.request('tabs.mutate',{scope:'chat',id,operations:[{action:'browser-traverse',tabId:browser.id,entryId:entryA,operationId:'back-op',baseRevision:1,visitedAt:'2026-10-12T12:01:00Z'}]});
 const back=(await first.request('tabs.get',{scope:'chat',id})).tabs[0].history;assert.equal(back.index,0);assert.equal(back.entries.length,2);assert.equal(back.entries[1].id,'entry-b');
 await assert.rejects(first.request('tabs.mutate',{scope:'chat',id,operations:[{...navArgs.operations[0],operationId:'stale-op',entryId:'stale',baseRevision:1}]}),/Navigation changed/);
 const navigationPage=await second.request('tabs.history',{scope:'chat',id,tabId:browser.id,start:true,limit:1});assert.equal(navigationPage.total,2);assert.equal(navigationPage.hasMore,true);
 assert.ok((await first.request('sync')).state.capabilities.includes('browser.history.v1'));
 const visitId='88888888-8888-4888-8888-888888888888',historyArgs={events:[{eventId:visitId,profileId:'11111111-1111-4111-8111-111111111111',url:'https://example.test/named',title:'Named profile',visitedAt:'2026-10-12T12:02:00Z'}]};
 await first.request('browser.history.record',historyArgs);await second.request('browser.history.record',historyArgs);assert.equal((await second.request('browser.history.query',{profileId:historyArgs.events[0].profileId})).total,1);
 await first.request('browser.history.delete',{eventIds:[visitId]});await second.request('browser.history.record',historyArgs);assert.equal((await first.request('browser.history.query',{profileId:historyArgs.events[0].profileId})).total,0);assert.ok((await second.request('browser.history.sync',{})).tombstones.some(row=>row.eventId===visitId));
 await assert.rejects(first.request('browser.history.settings',{action:'set',peers:[{hostId:'unpaired',enabled:true,profileIds:['default'],backfill:'all'}]}),/already paired/);
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
 tabs.mutate({scope:'chat',id:'run-a',expectedRevision:1,operations:[{action:'close',id:descriptor.id}]});assert.throws(()=>tabs.documentSource('run-a',descriptor.documentId),/no longer open/);assertPrivate(tabs.sourcesFile,0o600);
 fs.writeFileSync(tabs.sourcesFile,'corrupt');assert.throws(()=>tabs.seedWorkspace(session),/preserved/);assert.equal(fs.readFileSync(tabs.sourcesFile,'utf8'),'corrupt');
});
test('shared browser history keeps full redirect URLs and excludes engine page state',t=>{
 const {tabs}=store(t);const tab={...browser,history:{index:2,entries:[{url:'https://example.test/older',title:'Older'},{url:'https://example.test/callback?token=secret',title:'Login'},{url:browser.url,title:'Current',pageState:'secret'}]}};
 const result=tabs.mutate({scope:'chat',id:'history',expectedRevision:0,operations:[{action:'open',tab}]});
 assert.deepEqual(result.tabs[0].history,{index:2,entries:[{url:'https://example.test/older',title:'Older'},{url:'https://example.test/callback?token=secret',title:'Login'},{url:browser.url,title:'Current'}]});
 assert.deepEqual(tabs.get('chat','history'),result);
});

test('desktop seed retains private browser identities and skips remote-owned scopes and document origins',t=>{
 const {tabs,home}=store(t),privateURL='file:///private/synthetic-sensitive.html',remoteFile=path.join(home,'remote-only.md');
 const session={tabs:[{id:'workspace:local:one',type:'workspace',workspaceId:'one'},{id:'project:local:p',type:'workspace',workspaceId:'one',projectId:'p'},{id:'private-local-browser',type:'browser',url:privateURL,history:{entries:[{url:privateURL,title:privateURL}],index:0},label:privateURL,parentId:'workspace:local:one',hidden:true,unloaded:true},{id:'public-browser',type:'browser',url:'https://example.com',parentId:'workspace:local:one'},{id:'project-browser',type:'browser',url:'https://user:secret@example.com',parentId:'project:local:p'},{id:'remote-root',type:'workspace',hostId:'remote-host',workspaceId:'peer-workspace',projectId:'peer-project'},{id:'remote-browser',type:'browser',parentId:'remote-root',url:'https://remote.example.com'},{id:'remote-document',type:'markdown',parentId:'remote-root',file:remoteFile},{id:'standalone-remote-document',type:'markdown',hostId:'remote-host',file:remoteFile},{id:'standalone-remote-browser',type:'browser',hostId:'remote-host',url:'https://remote.example.com'}]};
 tabs.seedWorkspace(session);
 const local=tabs.get('workspace','one');assert.deepEqual(local.tabs.map(tab=>tab.id),['private-local-browser','public-browser']);assert.equal(local.tabs[0].url,'');assert.equal(local.tabs[0].title,'New tab');assert.equal(local.tabs[0].hidden,true);assert.equal(local.tabs[0].history,undefined);
 assert.equal(tabs.get('project','p').tabs[0].url,'');assert.equal(tabs.get('project','peer-project').revision,0);assert.equal(tabs.get('main','main').tabs.length,0);
 assert.doesNotMatch(fs.readFileSync(tabs.file,'utf8'),/sensitive|secret|remote-browser/);assert.doesNotMatch(fs.readFileSync(tabs.sourcesFile,'utf8'),/remote-only/);
 const bytes=fs.readFileSync(tabs.file);new ContentTabs(home).seedWorkspace(session);assert.deepEqual(fs.readFileSync(tabs.file),bytes);
 const closed=tabs.mutate({scope:'workspace',id:'one',expectedRevision:local.revision,operations:[{action:'close',id:'private-local-browser'}]});
 new ContentTabs(home).seedWorkspace(session);assert.deepEqual(tabs.get('workspace','one'),closed,'Explicit close remains authoritative across stale restore');
});

test('profile names decorate read projections without changing raw titles, history or revisions',()=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-profile-title-'));
 try{let name='Social';const profileId='abcdef01-1234-4567-8901-abcdef123456',tabs=new ContentTabs(home,{profiles:()=>[{id:profileId,name}]});
 tabs.mutate({scope:'chat',id:'fixture',expectedRevision:0,operations:[{action:'open',tab:{id:'browser',type:'browser',title:'Actual title',url:'https://example.test',profileId}}]});
 const first=tabs.get('chat','fixture');assert.equal(first.tabs[0].profileName,'Social');name='Research';const second=tabs.get('chat','fixture');assert.equal(second.tabs[0].profileName,'Research');assert.equal(second.tabs[0].title,'Actual title');assert.equal(second.revision,first.revision);assert.equal(JSON.stringify(tabs.read()).includes('profileName'),false);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
