import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {remoteState} from '../src/services/remote/remote.js';
import { LiveBrowser } from '../src/services/browser/live-browser.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { startServer } from '../src/server.js';
import { startRelay } from '../relay/server.js';
import { atomicJSON } from '../src/shared/files.js';
import { seal, unseal, secret } from '../src/services/remote/remote-crypto.js';
import { RemoteClient, until } from './remote-client.mjs';
import { hostPlatformMetadata } from '../src/shared/host-platform.js';

async function fixture(t, providers) {
  const home = privateTemporaryDirectory(path.join(os.tmpdir(), 'proteus-remote-')); const workspace = path.join(home, 'workspace'); fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(workspace, 'AGENTS.md'), '# Synthetic instructions\nCheck evidence.');
  fs.mkdirSync(path.join(workspace, '.vscode')); atomicJSON(path.join(workspace, '.vscode', 'mcp.json'), { servers: { synthetic: { command: 'false', env: { TOKEN: 'SECRET_MUST_STAY_ON_MAC' } } } });
  atomicJSON(path.join(home, 'settings.json'), { schemaVersion: 1, provider: 'rehearsal', model: '', timezone: 'UTC', workspace: { cwd: workspace, additionalDirectories: [] }, skillDirectories: [], mcpServers: {} });
  const token = secret(); const relay = await startRelay({ port: 0, token });
  const app = await startServer({ home, port: 0, timers: false, providers });
  const url = `ws://127.0.0.1:${relay.port}`;
  await app.remote.configure({ enabled: true, mode: 'external', relayURL: url, publicURL: url, relayToken: token });
  await until(() => app.remote.status === 'online');
  const clients = [];
  t.after(async () => { clients.forEach(c => c.close()); await app.close(); await relay.close(); fs.rmSync(home, { recursive: true, force: true }); });
  const connect = async (capsule, device) => { const c = new RemoteClient(capsule || RemoteClient.capsule((await app.remote.pairing()).code), device); clients.push(c); return c.connect(); };
  return { app, home, relay, connect, workspace };
}
test('AES-GCM authenticates the payload and routing context', () => {
  const key = secret(); const payload = { prompt: 'Synthetic private message' }; const box = seal(key, payload, 'connection:client:1');
  assert.deepEqual(unseal(key, box, 'connection:client:1'), payload);
  assert.throws(() => unseal(key, box, 'connection:host:1'));
  assert.throws(() => unseal(secret(), box, 'connection:client:1'));
  const corrupt = Buffer.from(box, 'base64'); corrupt[14] ^= 1; assert.throws(() => unseal(key, corrupt.toString('base64'), 'connection:client:1'));
});
test('encrypted reply measurements identify fixed read methods at actual wire send',async t=>{
 const {app,connect}=await fixture(t),client=await connect();
 const snapshot=await client.request('sync');assert.ok(snapshot.state.context);
 const tabs=await client.request('tabs.get',{scope:'main',id:'main'});assert.ok(Array.isArray(tabs.tabs));
 await until(()=>app.performanceDiagnostics.snapshot().remoteTransport?.sentReplies?.['tabs.get']?.packets>0);
 const traffic=app.performanceDiagnostics.snapshot().remoteTransport;
 assert.ok(traffic.sentReplies.sync.bytes>Buffer.byteLength(JSON.stringify(snapshot)),'wire count includes encrypted encoding');
 assert.equal(traffic.sentReplies['tabs.get'].packets,1);
 assert.ok(traffic.sentKinds.reply.bytes>=traffic.sentReplies.sync.bytes+traffic.sentReplies['tabs.get'].bytes);
 t.diagnostic(JSON.stringify({synthetic:true,syncWireBytes:traffic.sentReplies.sync.bytes,tabReadWireBytes:traffic.sentReplies['tabs.get'].bytes,tabReadPackets:traffic.sentReplies['tabs.get'].packets}));
});
test('relay registration rejection remains actionable during retry and clears after a successful connection', async t => {
  const { app } = await fixture(t);
  const token = app.remote.config.relayToken;
  await app.remote.configure({ enabled: true, relayToken: secret() });
  await until(() => app.remote.status === 'offline');
  const error = app.remote.info().error;
  assert.match(error, /rejected this computer’s registration/);
  assert.match(error, /pairing code; incoming access here is not required/);
  app.remote.connect();
  assert.equal(app.remote.info().error, error, 'A retry must not erase the explanation.');
  await until(() => app.remote.status === 'offline');
  await app.remote.configure({ enabled: true, relayToken: token });
  await until(() => app.remote.status === 'online');
  assert.equal(app.remote.info().error, null);
});
test('oversize client output disconnects only that client and retains authenticated pairing',async t=>{
 const {app,connect}=await fixture(t),invite=RemoteClient.capsule((await app.remote.pairing()).code),first=await connect(invite),second=await connect();
 await until(()=>app.remote.relayClientDisconnect===true);
 const peer=[...app.remote.peers.values()].find(peer=>peer.device?.id===first.device.id);
 app.remote.raw(peer,{type:'synthetic',value:'x'.repeat(8_000_000)});
 await until(()=>first.ws.readyState===3);
 assert.equal(app.remote.status,'online');assert.ok((await second.request('sync')).state.capabilities.includes('content-tabs.v1'));
 const restored=await connect(invite,first.device);assert.ok((await restored.request('sync')).state.capabilities.includes('content-tabs.v1'));
});
test('reconnect sync skips obsolete state snapshots while retaining lifecycle replay',async t=>{
 const {app,connect}=await fixture(t),invite=RemoteClient.capsule((await app.remote.pairing()).code),first=await connect(invite);
 app.remote.broadcast('synthetic-anchor',{});await until(()=>first.events.some(event=>event.event==='synthetic-anchor'));
 const cursor=first.events.find(event=>event.event==='synthetic-anchor').cursor;first.close();
 for(let i=0;i<5;i++)app.remote.broadcast('state',{obsolete:i});
 app.remote.broadcast('chat.lifecycle',{id:'synthetic-retained',archivedAt:'synthetic'});
 const next=await connect(invite,first.device),result=await next.request('sync',{cursor});
 assert.ok(result.state.capabilities.includes('content-tabs.v1'));assert.equal(next.events.some(event=>event.event==='state'),false);assert.equal(next.events.some(event=>event.event==='chat.lifecycle'&&event.data.id==='synthetic-retained'),true);
});
test('protocol v1 mobile peers discover this host platform, reconnect and retain device grants',async t=>{
  const {app,connect}=await fixture(t);const invitation=RemoteClient.capsule((await app.remote.pairing()).code),first=await connect(invitation);
  const state=(await first.request('sync')).state,metadata=hostPlatformMetadata();
  assert.equal(state.protocol,1);assert.ok(state.capabilities.includes('host.platform.v1'));
  for(const [key,value]of Object.entries(metadata)){assert.equal(state[key],value);assert.equal(app.remote.info()[key],value);}
  await assert.rejects(first.request('browser.live.list',{id:'synthetic'}),/Enable View live chat browsers/);
  app.remote.setBrowserAccess(first.device.id,true);app.remote.setDocumentAccess(first.device.id,true);
  first.close();const reconnected=await connect(invitation,first.device);assert.equal((await reconnected.request('sync')).state.hostPlatform,metadata.hostPlatform);
  assert.equal(app.remote.info().devices[0].browserAccess,true);assert.equal(app.remote.info().devices[0].documentAccess,true);
  app.remote.setBrowserAccess(first.device.id,false);await assert.rejects(reconnected.request('browser.live.list',{id:'synthetic'}),/Enable View live chat browsers/);
  app.remote.revoke(first.device.id);await until(()=>reconnected.failure==='revoked');await assert.rejects(connect(invitation,first.device),/rejected/);
});
test('logs expose bounded summary pages and complete redacted details through local and paired APIs',async t=>{
  const {app,connect}=await fixture(t),viewer=await connect();let target;
  for(let i=0;i<120;i++){const entry=app.activity.log('error','synthetic.error','Rehearsal '+i+'\n'+('    at synthetic-frame\n'.repeat(200)),{details:{password:'DO_NOT_EXPOSE',index:i}});if(i===10)target=entry.id;}
  const page=await viewer.request('logs.list',{limit:50});assert.equal(page.items.length,50);assert.ok(page.hasMore);assert.ok(!page.items[0].details);
  const older=await viewer.request('logs.list',{limit:50,cursor:page.nextCursor});assert.equal(older.items[0].summary,'Rehearsal 69');
  const detail=await viewer.request('logs.get',{id:target});assert.ok(detail.message.length>1000);assert.doesNotMatch(JSON.stringify(detail),/DO_NOT_EXPOSE/);
  const response=await fetch(app.origin+'/api/logs?target='+target,{headers:{Authorization:`Bearer ${app.token}`}});assert.equal(response.status,200);assert.equal((await response.json()).items[0].id,target);
  const localDetail=await fetch(app.origin+'/api/logs?id='+target,{headers:{Authorization:`Bearer ${app.token}`}});assert.deepEqual(await localDetail.json(),detail);
});
test('failed legacy log migration preserves source and still releases the runner and listener on shutdown',async t=>{
  const folder=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-log-recovery-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const original=JSON.stringify({version:1,logs:[{}],notifications:[],outbox:[],preferences:{custom:'preserved'}});fs.writeFileSync(path.join(folder,'activity.json'),original);
  const app=await startServer({home:folder,port:0,timers:false});await assert.rejects(app.activity.logs());
  await assert.rejects(app.close());assert.equal(fs.existsSync(path.join(folder,'connection.json')),false);assert.equal(fs.readFileSync(path.join(folder,'activity.legacy.json'),'utf8'),original);
  const restarted=await startServer({home:folder,port:0,timers:false});await assert.rejects(restarted.close());
});
test('history settings expose owner catalogs, preserve receipts, and never grant viewer pairings',async t=>{
  const {app,connect}=await fixture(t),viewer=await connect();
  const ownerPeer='11111111-1111-4111-8111-111111111111',viewerPeer='22222222-2222-4222-8222-222222222222',profileId='33333333-3333-4333-8333-333333333333';
  let paired=[{hostId:ownerPeer,label:'Owner paired desktop',status:'online',paused:true,key:'PAIR_SECRET',config:{token:'CONFIG_SECRET'}}],syncs=0;
  app.peers={list:()=>paired,syncHistory:async()=>{syncs++;return {synced:true};}};
  let identity={origin:'https://synthetic-owner.test',accountId:'owner'};
  app.browserProfiles.identity=()=>identity;app.browserProfiles.data={enabled:true,account:app.browserProfiles.key(),items:[{id:profileId,name:'Owner profile',settings:{secret:'PROFILE_SECRET'},partition:'PRIVATE_PARTITION'}]};
  app.browserProfiles.refresh=()=>{throw new Error('Settings reads must use the cached owner profiles.');};
  const settings=await viewer.request('browser.history.settings',{availablePeers:[{hostId:viewerPeer,label:'Viewer desktop'}]});
  assert.deepEqual(settings.availablePeers,[{hostId:ownerPeer,label:'Owner paired desktop',status:'online',paused:true}]);
  assert.deepEqual(settings.availableProfiles,[{id:'default',name:'Default'},{id:profileId,name:'Owner profile'}]);
  assert.doesNotMatch(JSON.stringify(settings),/PAIR_SECRET|CONFIG_SECRET|PROFILE_SECRET|PRIVATE_PARTITION/);
  const local=await fetch(app.origin+'/api/browser-history',{method:'POST',headers:{Authorization:`Bearer ${app.token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'settings'})});
  assert.equal(local.status,200);assert.deepEqual(await local.json(),settings);
  await assert.rejects(viewer.request('browser.history.settings',{peers:[{hostId:viewerPeer,enabled:true,backfill:'all',profileIds:['default']}],availablePeers:[{hostId:viewerPeer}]}),/already paired/);
  const peer={hostId:ownerPeer,enabled:true,backfill:'30',profileIds:['default',profileId],extension:{future:true}},requestId=randomUUID();
  const saved=await viewer.request('browser.history.settings',{peers:[{...peer,cursor:'FAKE_CURSOR',error:'FAKE_ERROR'}],availablePeers:[{hostId:viewerPeer}],availableProfiles:[{id:'viewer'}]},requestId);
  assert.deepEqual(await viewer.request('browser.history.settings',{peers:[{...peer,cursor:'FAKE_CURSOR',error:'FAKE_ERROR'}],availablePeers:[{hostId:viewerPeer}],availableProfiles:[{id:'viewer'}]},requestId),saved);assert.equal(syncs,1);
  const persisted=await app.browserHistory.settings();assert.deepEqual(persisted.peers,[peer]);assert.equal(Object.hasOwn(persisted,'availablePeers'),false);assert.equal(Object.hasOwn(persisted,'availableProfiles'),false);
  paired=[];
  await viewer.request('browser.history.settings',{peers:[peer]});
  await assert.rejects(viewer.request('browser.history.settings',{peers:[{...peer,backfill:'all'}]}),/already paired/);
  await viewer.request('browser.history.settings',{peers:[{...peer,enabled:false}]});
  await assert.rejects(viewer.request('browser.history.settings',{peers:[peer]}),/already paired/);
  identity={...identity,accountId:'another-owner-account'};
  assert.deepEqual((await viewer.request('browser.history.settings')).availableProfiles,[{id:'default',name:'Default'}]);
});
test('paired chat archive and delete synchronize without resurrecting cached history',async t=>{
  const {app,connect,workspace}=await fixture(t);const first=await connect(),second=await connect();
  const controls=(await first.request('sync')).state;assert.ok(controls.mcpStatusProviders.includes('claude'));assert.equal(controls.mcpLoginProviders.includes('claude'),false);
  const schedule={...app.engine.schedules.list()[0],workspace:{cwd:workspace,additionalDirectories:[]}};
  const run=app.engine.createRun(schedule,'chat',null,{deferStart:true});run.deferredStart=false;run.status='completed';app.engine.persist(run);
  const before=await first.request('chat.get',{id:run.id});
  assert.ok((await first.request('runs.list')).some(row=>row.id===run.id));
  const archived=await first.request('chat.archive',{id:run.id,archived:true,expectedUpdatedAt:before.updatedAt,expectedArchivedAt:null});
  assert.ok(archived.archivedAt);assert.equal((await first.request('runs.list')).some(row=>row.id===run.id),false);
  assert.ok((await second.request('runs.list',{includeArchived:true})).find(row=>row.id===run.id)?.archived);
  assert.equal((await second.request('sync')).state.runCountIncludingArchived,1);
  assert.ok((await second.request('chat.get',{id:run.id})).archived);
  await assert.rejects(first.request('chat.archive',{id:run.id,archived:false,expectedArchivedAt:'old'}),/changed/);
  await second.request('chat.archive',{id:run.id,archived:false,expectedArchivedAt:archived.archivedAt});
  assert.ok((await first.request('runs.list')).some(row=>row.id===run.id));
  const deleted=await first.request('chat.delete',{id:run.id,expectedUpdatedAt:before.updatedAt,expectedArchivedAt:null});
  assert.equal(deleted.deleted,true);await until(()=>second.events.some(event=>event.event==='chat.lifecycle'&&event.data?.deleted===true&&event.data.id===run.id));
  await assert.rejects(first.request('chat.get',{id:run.id}),/not found/);
  await assert.rejects(first.request('chat.send',{id:run.id,prompt:'Synthetic retry',mode:'queue'}),/not found/);
  await assert.rejects(first.request('chat.attachments.begin',{id:run.id,messageId:'synthetic',name:'x.txt',mediaType:'text\/plain',size:1,sha256:'x'}),/not found/);
  assert.equal((await second.request('runs.list',{includeArchived:true})).length,0);
  assert.equal((await app.activity.logs(40)).items.some(item=>item.event==='chat.undefined'),false);
});
test('authenticated mixed watches preserve deltas, summary isolation and conditional unwatch',async t=>{
  const {app,connect,workspace}=await fixture(t),full=await connect(),summary=await connect(),delta=await connect();
  const run=app.engine.createRun({...app.engine.schedules.list()[0],workspace:{cwd:workspace,additionalDirectories:[]}},'chat',null,{deferStart:true});
  run.deferredStart=false;run.status='completed';
  run.events=Array.from({length:100},(_,index)=>({type:'assistant',text:'x'.repeat(1000),at:new Date().toISOString(),index}));app.engine.persist(run);
  assert.ok((await delta.request('sync')).state.capabilities.includes('chat.delta.v1'));
  await full.request('chat.get',{id:run.id});await summary.request('chat.get',{id:run.id,watch:'summary'});
  const initial=await delta.request('chat.get',{id:run.id,watch:'delta'});assert.equal(initial.events.length,100);
  await delta.request('chat.get',{id:run.id,beforeEvent:50,watch:'none'});
  app.remote.publish();await until(()=>delta.events.some(event=>event.event==='run'));
  full.events=[];summary.events=[];delta.events=[];
  run.events[99]={...run.events[99],text:'changed'};run.updatedAt=new Date().toISOString();app.engine.persist(run);app.engine.emit('change',run);app.remote.publish();
  await until(()=>full.events.some(event=>event.event==='run')&&summary.events.some(event=>event.event==='run.changed')&&delta.events.some(event=>event.event==='run'));
  const deltaEvent=delta.events.find(event=>event.event==='run'),checkpoint=deltaEvent.cursor,patch=deltaEvent.data;
  assert.deepEqual(patch.events,[]);assert.equal(patch.eventPatches.length,1);assert.equal(patch.eventPatches[0].index,99);
  assert.equal(summary.events.some(event=>event.event==='run'),false);assert.equal(full.events.some(event=>event.event==='run.changed'),false);
  assert.equal((await delta.request('chat.watch',{id:'stale-view',watch:'none'})).cleared,false);
  assert.equal((await delta.request('chat.watch',{id:run.id,watch:'none'})).cleared,true);
  delta.events=[];run.events[99]={...run.events[99],text:'after leaving'};app.engine.persist(run);app.remote.publish();
  // A sync round trip drains prior packets without a timing-only assertion.
  await delta.request('sync');assert.equal(delta.events.some(event=>event.runId===run.id),false);
  delta.close();app.remote.broadcast('chat.lifecycle',{id:run.id,archivedAt:'synthetic-reconnect'});
  const restored=await connect(delta.capsule,delta.device);await restored.request('sync',{cursor:checkpoint});
  assert.ok(restored.events.some(event=>event.event==='chat.lifecycle'&&event.data.archivedAt==='synthetic-reconnect'),'incremental pushes must preserve a replayable durable cursor');
});
test('a paired client can apply permissions to the current waiting chat and receive tool details', async t => {
  const { app, connect, workspace } = await fixture(t, { copilot: { run: async ({ ask, emit }) => {
    emit('tool', 'Read fixture', { tool: { callId: 'fixture-read', name: 'view', summary: 'Read fixture', status: 'running', arguments: '{"path":"fixture.md"}', output: 'Visible progress' } });
    await ask({ type: 'permission', details: { kind: 'mcp', serverName: 'synthetic', toolName: 'read_only', readOnly: true } });
    await ask({ type: 'question', question: 'Keep this result?' });
    emit('assistant', 'Complete final response');
  } } });
  const client = await connect();
  const schedule = { ...app.engine.schedules.list()[0], provider: 'copilot', model: 'fixture', workspace: { cwd: workspace, additionalDirectories: [] } };
  const run = app.engine.createRun(schedule); await until(() => run.pending?.type === 'permission');
  const before = await client.request('chat.get', { id: run.id });
  assert.equal(before.events.find(e => e.data?.tool).data.tool.output, 'Visible progress');
  await assert.rejects(client.request('chat.permissions', { id: run.id, mode: 'trusted', expectedContextId: 'stale', expectedRevision: before.permissionRevision }), /configuration changed/);
  await client.request('chat.permissions', { id: run.id, mode: 'trusted', expectedContextId: before.permissionContext.id, expectedRevision: before.permissionRevision });
  await until(() => run.pending?.type === 'question');
  assert.equal(run.automaticApprovals, 1);
  const after = await client.request('chat.get', { id: run.id }); assert.equal(after.permissionContext.mode, 'trusted');
  await client.request('chat.reply', { id: run.id, requestId: run.pending.id, answer: 'Keep' });
  await until(() => run.status === 'completed');
});
test('pair, start, stream feedback, resume from second device, and reject duplicate commands', async t => {
  const { app, connect } = await fixture(t); const a = await connect(); const b = await connect();
  const sync = await a.request('sync'); assert.equal(sync.state.context.entries.find(e => e.kind === 'mcp').mode, 'disabled');
  assert.ok(!JSON.stringify(sync).includes('SECRET_MUST_STAY_ON_MAC'));
  const args = { prompt: 'Synthetic remote rehearsal', provider: 'rehearsal', workspaceId: sync.state.context.defaultWorkspaceId };
  const requestId = randomUUID(); const { runId } = await a.request('chat.start', args, requestId);
  assert.equal((await a.request('chat.start', args, requestId)).runId, runId); assert.equal(app.engine.listRuns().length, 1);
  assert.equal((await a.request('chat.start', Object.fromEntries(Object.entries(args).reverse()), requestId)).runId, runId);
  await assert.rejects(a.request('chat.start', { ...args, prompt: 'Changed request' }, requestId), /already used/);
  await until(() => app.engine.getRun(runId).status === 'awaiting_input');
  const run = await b.request('chat.get', { id: runId });
  await assert.rejects(b.request('chat.reply', { id: runId, answer: 'wrong', requestId: 'stale' }), /no longer/);
  await b.request('chat.reply', { id: runId, answer: 'From another device', requestId: run.pending.id });
  await until(() => app.engine.getRun(runId).status === 'completed');
  await until(() => a.events.some(e => e.event === 'run' && e.data.status === 'completed'));
  assert.ok((await a.request('chat.get', { id: runId })).events.some(e => e.text.includes('From another device')));
  a.close(); const restored = await connect(a.capsule, a.device);
  assert.equal((await restored.request('chat.start', args, requestId)).runId, runId);
  await restored.request('chat.resume', { id: runId, prompt: 'Continue the same history' });
  await until(() => app.engine.getRun(runId).status === 'awaiting_input');
  assert.equal(app.engine.listRuns().length, 1);
});
test('single-use invitations, revoked devices, and replayed encrypted frames are rejected', async t => {
  const { app, connect } = await fixture(t); const invite = RemoteClient.capsule((await app.remote.pairing()).code);
  const client = await connect(invite); await assert.rejects(connect(invite), /rejected/);
  await client.request('sync'); client.raw(client.lastPacket); await until(() => client.failure === 'rejected');
  const restored = await connect(invite, client.device); app.remote.revoke(client.device.id);
  await until(() => restored.failure === 'revoked'); await assert.rejects(connect(invite, client.device), /rejected/);
});
test('schedule conflicts preserve unknown fields and repository ownership; stale and arbitrary commands cannot execute', async t => {
  const { app, connect } = await fixture(t); const client = await connect();
  let state = (await client.request('sync')).state; const schedule = state.schedules[0];
  const value = app.engine.schedules.get(schedule.id); value.extension = { preserved: true }; app.engine.schedules.save(value, schedule.revision);
  await assert.rejects(client.request('schedule.save', { id: schedule.id, expectedRevision: schedule.revision, changes: { cron: '0 10 * * *' } }), /changed/);
  state = (await client.request('sync')).state;
  await client.request('schedule.save', { id: schedule.id, expectedRevision: state.schedules[0].revision, changes: { cron: '0 10 * * *' } });
  assert.deepEqual(app.engine.schedules.get(schedule.id).extension, { preserved: true });
  const current = app.engine.schedules.list()[0]; app.engine.schedules.save({ ...app.engine.schedules.get(schedule.id), source: { manifest: '/synthetic/repo/automation.json' } }, current.revision);
  await assert.rejects(client.request('schedule.save', { id: schedule.id, changes: { enabled: true } }), /repository-owned/);
  await assert.rejects(client.request('credentials.get'), /Unsupported/);
  await assert.rejects(client.request('chat.start', { prompt: 'expired' }, randomUUID(), '2000-01-01T00:00:00Z'), /expired/);
  const instruction = state.context.entries.find(e => e.kind === 'instruction');
  await client.request('context.mode', { id: instruction.id, mode: 'universal', expectedRevision: state.context.revision });
  assert.equal((await client.request('sync')).state.context.entries.find(e => e.id === instruction.id).mode, 'universal');
});
test('live provider text reaches both local and remote state before the final message', async t => {
  let finish;
  const provider = { async run({ stream, run, emit }) { stream('message-1', 'Partial response'); await new Promise(resolve => { finish = resolve; }); delete run.liveMessages['message-1']; emit('assistant', 'Partial response completed'); } };
  const { app, connect } = await fixture(t, { copilot: provider }); const client = await connect();
  const { runId } = await client.request('chat.start', { prompt: 'Stream synthetic tokens', provider: 'copilot', model: 'synthetic' });
  await until(() => !!finish); assert.equal((await client.request('chat.get', { id: runId })).liveMessages['message-1'], 'Partial response');
  finish(); await until(() => app.engine.getRun(runId).status === 'completed');
  assert.deepEqual((await client.request('chat.get', { id: runId })).liveMessages, {});
});
test('relay rejects browser origins and incorrect host credentials', async t => {
  const relay = await startRelay({ port: 0, token: secret() }); t.after(() => relay.close());
  for (const headers of [{ Authorization: 'Bearer wrong' }, { Origin: 'https://untrusted.example' }]) {
    const ws = new WebSocket(`ws://127.0.0.1:${relay.port}/socket?role=host&host=${randomUUID()}`, { headers });
    await new Promise(resolve => { ws.on('error', error => { assert.match(error.message, /403/); resolve(); }); });
  }
});

test('paired clients receive only workspace images referenced by the selected chat', async t => {
  const { app, connect, workspace } = await fixture(t); const client = await connect();
  const png = fs.readFileSync(new URL('../ios/Proteus/Assets.xcassets/AppIcon.appiconset/AppIcon.png', import.meta.url));
  fs.writeFileSync(path.join(workspace, 'plot.png'), png);
  const sync = await client.request('sync');
  const { runId } = await client.request('chat.start', { prompt: '![Preview](plot.png)', provider: 'rehearsal', workspaceId: sync.state.context.defaultWorkspaceId });
  const image = await client.request('chat.image', { id: runId, source: 'plot.png' });
  assert.equal(image.dataURL, 'data:image/png;base64,' + png.toString('base64'));
  await assert.rejects(client.request('chat.image', { id: runId, source: 'AGENTS.md' }), /not referenced/);
  app.engine.cancel(runId);
});

test('favorites and explicit schedule selections sync across devices without enabling sources', async t => {
  const { app, connect, workspace } = await fixture(t); const a = await connect(); const b = await connect();
  let state = (await a.request('sync')).state; const mcp = state.context.entries.find(e => e.kind === 'mcp');
  await a.request('context.favorite', { id: mcp.id, enabled: true, expectedRevision: state.context.revision });
  state = (await b.request('sync')).state; assert.deepEqual(state.context.favorites, [mcp.id]); assert.equal(state.context.entries.find(e => e.id === mcp.id).mode, 'disabled');
  const instruction = state.context.entries.find(e => e.kind === 'instruction');
  const plan = await b.request('context.preview', { includeDefaults: false, selectedIds: [instruction.id], workspaceId: state.context.defaultWorkspaceId });
  assert.equal(plan.entries.length, 1); assert.ok(plan.estimatedTextTokens > 0); assert.ok(!JSON.stringify(plan).includes('SECRET_MUST_STAY_ON_MAC'));
  const original = state.schedules[0];
  const local = app.engine.schedules.get(original.id); local.workspace = { cwd: workspace, additionalDirectories: [] }; app.engine.schedules.save(local, original.revision);
  state = (await b.request('sync')).state;
  const selection = { includeDefaults: false, selectedIds: [instruction.id], agentId: null };
  await b.request('schedule.save', { id: original.id, expectedRevision: state.schedules[0].revision, changes: { contextSelection: selection } });
  state = (await a.request('sync')).state; assert.deepEqual(state.schedules[0].contextSelection, selection);
  const { runId } = await a.request('schedule.run', { id: original.id });
  const run = await a.request('chat.get', { id: runId }); assert.equal(run.context.includeDefaults, false); assert.deepEqual(run.context.entries.map(e => e.id), [instruction.id]);
});

test('remote model options and provider capabilities round trip through encrypted commands', async t => {
  const { copilotModel }=await import('../src/models/model-catalog.js');
  const model=copilotModel({id:'fixture',supportedReasoningEfforts:['none'],billing:{tokenPrices:{maxPromptTokens:100,longContext:{maxPromptTokens:200}}}});
  const {app,connect}=await fixture(t,{copilot:{status:async()=>({available:true,models:[model]}),run:async()=>{}}});
  const client=await connect();const catalog=await client.request('provider.status',{force:true});
  assert.deepEqual(catalog.models[0].controls,model.controls);
  const schedule=app.engine.schedules.list()[0];
  await client.request('schedule.save',{id:schedule.id,expectedRevision:schedule.revision,changes:{provider:'copilot',model:'fixture',reasoningEffort:'none',contextTier:'long_context'}});
  assert.equal(app.engine.schedules.get(schedule.id).reasoningEffort,'none');
  const sync=await client.request('sync');assert.equal(sync.state.schedules[0].contextTier,'long_context');
  const result=await client.request('chat.start',{prompt:'Model options fixture',provider:'copilot',model:'fixture',reasoningEffort:'none',contextTier:'long_context',workspaceId:sync.state.context.defaultWorkspaceId});
  const run=await client.request('chat.get',{id:result.runId});assert.equal(run.schedule.reasoningEffort,'none');assert.equal(run.schedule.contextTier,'long_context');
});

test('remote provider catalogs, speed, live steering and queued tool presentations remain distinct',async t=>{
  let finish;const steers=[];
  const codex={status:async()=>({available:true,models:[{id:'codex-fixture',controls:{reasoningEfforts:['future'],contextTiers:[{id:'default',promptTokens:null}],serviceTiers:[{id:'priority',name:'Fast'}]}}]}),steer:async(_,text)=>steers.push(text),run:async({emit})=>{emit('tool','Read fixture',{tool:{callId:'t',name:'view',status:'completed',arguments:'{"path":"fixture.md"}',output:'[{"name":"Fixture","status":"Ready"}]'}});await new Promise(r=>finish=r);}};
  const {app,connect}=await fixture(t,{codex,copilot:{status:async()=>({available:true,models:[{id:'copilot-fixture'}]})}});const client=await connect();
  const catalog=await client.request('provider.status',{provider:'codex',force:true});assert.equal(catalog.models[0].id,'codex-fixture');
  const sync=await client.request('sync');assert.equal(sync.state.providerStatuses.codex.models[0].id,'codex-fixture');
  const {runId}=await client.request('chat.start',{prompt:'Synthetic provider',provider:'codex',model:'codex-fixture',serviceTier:'priority',workspaceId:sync.state.context.defaultWorkspaceId});await until(()=>!!finish);
  await client.request('chat.send',{id:runId,prompt:'Adjust',mode:'steer',messageId:'steer-native'});assert.deepEqual(steers,['Adjust']);
  await assert.rejects(client.request('chat.send',{id:runId,prompt:'Invalid',mode:'queue',messageId:'queue-invalid',modelOptions:{model:'codex-fixture',reasoningEffort:'invented'}}),/unavailable/);
  await client.request('chat.send',{id:runId,prompt:'Follow up',mode:'queue',messageId:'queue-native',modelOptions:{model:'codex-fixture',reasoningEffort:'future',serviceTier:'',contextTier:'default'}});
  const run=await client.request('chat.get',{id:runId});assert.equal(run.schedule.serviceTier,'priority');assert.equal(run.queuedMessages.length,1);assert.equal(run.queuedMessages[0].modelOptions.reasoningEffort,'future');assert.equal(run.nextModelOptions.serviceTier,'');assert.equal(run.schedule.reasoningEffort,undefined);assert.equal(run.events.find(e=>e.data?.tool).data.tool.presentation.output.kind,'table');
  await client.request('chat.remove-queued',{id:runId,messageId:'queue-native'});finish();await until(()=>app.engine.getRun(runId).status==='completed');
});

test('provider usage is normalized, selected-host scoped, and blocked when hidden', async t => {
  let reads=0;
  const {app,connect}=await fixture(t,{copilot:{quota:async()=>{reads++;return {windows:[{id:'premium',label:'Premium requests',remainingPercent:73,resetAt:null,privateCredential:'NEVER_SEND'}],available:true,credential:'NEVER_SEND'};},status:async()=>({available:true,models:[]})}});
  const client=await connect();
  let usage=await client.request('provider.usage',{force:true});
  assert.equal(usage.enabled,true);assert.equal(usage.providers.copilot.windows[0].remainingPercent,73);assert.equal(usage.providers.copilot.windows[0].resetAt,null);
  assert.equal(JSON.stringify(usage).includes('NEVER_SEND'),false);assert.ok(usage.providers.copilot.checkedAt);
  let state=(await client.request('sync')).state;assert.equal(state.appearance.showProviderUsage,true);assert.equal(state.providerUsage.providers.copilot.windows[0].remainingPercent,73);
  const settings=app.settings.get();app.settings.save({...settings,appearance:{showProviderUsage:false,providerUsageCollapsed:true}},settings.revision);
  usage=await client.request('provider.usage',{force:true});assert.deepEqual(usage,{enabled:false,providers:{}});assert.equal(reads,1);
  state=(await client.request('sync')).state;assert.equal(state.appearance.showProviderUsage,false);assert.equal(state.appearance.providerUsageCollapsed,true);assert.equal(state.providerUsage,undefined);
});


test('live browser requires a per-device grant and the same device must view the referenced frame',async t=>{
 const {app,connect}=await fixture(t);let release=null;
 app.liveBrowser=new LiveBrowser({list:()=>[{id:'synthetic-tab'}],current:()=>true,capture:async()=>{if(release)await new Promise(resolve=>{release.resolve=resolve;});return {revision:1,width:800,height:600,image:'data:image/jpeg;base64,synthetic'};}});
 const first=await connect(),second=await connect();const run=app.engine.createRun(app.engine.schedules.list()[0]);await until(()=>run.pending);
 await assert.rejects(first.request('browser.live.list',{id:run.id}),/permission|enable|allow/i);
 const [a,b]=app.remote.config.devices;app.remote.setBrowserAccess(a.id,true);app.remote.setBrowserAccess(b.id,true);
 const frame=await first.request('browser.live.frame',{id:run.id,tabId:'synthetic-tab'});
 await assert.rejects(second.request('browser.live.instruct',{id:run.id,frameId:frame.id,text:'Synthetic instruction',mode:'queue'}),/View this browser frame/);
 await first.request('browser.live.instruct',{id:run.id,frameId:frame.id,text:'Synthetic answer',mode:'answer',requestId:run.pending.id,point:{x:.5,y:.5}});
 await until(()=>run.status==='completed');assert.ok(run.events.some(event=>event.text?.includes('marked point 400,300')));
 app.liveBrowser.clear();release={};const capture=first.request('browser.live.frame',{id:run.id,tabId:'synthetic-tab'});await until(()=>release.resolve);
 app.remote.setBrowserAccess(a.id,false);release.resolve();await assert.rejects(capture,/permission|enable|allow/i);
 assert.equal(app.liveBrowser.frames.size,0);await assert.rejects(first.request('browser.live.list',{id:run.id}),/permission|enable|allow/i);
});

test('paired workspace configuration preserves scoped selections, full local copies and root refresh parity',async t=>{
 const {app,connect,workspace}=await fixture(t);const first=await connect(),second=await connect();
 const original=await first.request('context.get'),entry=original.entries.find(e=>e.kind==='instruction');
 const copied=await first.request('context.update',{action:'copy-workspace',workspaceId:'default',name:'Paired configuration',expectedRevision:original.revision});const workspaceId=copied.copiedWorkspaceId;
 let state=await first.request('context.update',{action:'mode',workspaceId,id:entry.id,mode:'available',expectedRevision:copied.revision});
 state=await first.request('context.update',{action:'save-workspace',workspaceId,configuration:{defaults:{includeDefaults:false,selectedIds:[entry.id]},approvals:{mode:'custom',readOnlyTools:false,folders:[{path:fs.realpathSync(workspace),access:'read'}],rules:[{kind:'shell',command:'git status'}]}},expectedRevision:state.revision});
 const remote=await second.request('context.get',{workspaceId});assert.equal(remote.entries.find(e=>e.id===entry.id).mode,'available');assert.deepEqual(remote.workspaces.find(w=>w.id===workspaceId).approvals.rules,[{kind:'shell',command:'git status'}]);assert.equal((await second.request('context.get',{workspaceId:'default'})).entries.find(e=>e.id===entry.id).mode,'workspace');
 const duplicate=await second.request('context.update',{action:'copy-workspace',workspaceId,name:'Independent paired copy',expectedRevision:remote.revision});assert.deepEqual(duplicate.workspaces.find(w=>w.id===duplicate.copiedWorkspaceId).defaults.selectedIds,[entry.id]);
 assert.deepEqual(duplicate.workspaces.find(w=>w.id===duplicate.copiedWorkspaceId).approvals,remote.workspaces.find(w=>w.id===workspaceId).approvals);
 const refreshed=await first.request('context.refresh',{workspaceId,root:workspace});assert.ok(refreshed.rootStatus[fs.realpathSync(workspace)].scannedFolders>0);assert.equal(app.context.scope('default').approvals.mode,'ask');
});
test('state uses the configured computer name and counts running chats outside the recent page',async t=>{
 const {app,connect}=await fixture(t);app.remote.config.label='Synthetic Office PC';
 const rows=Array.from({length:101},(_,i)=>({id:'synthetic-'+i,status:i===100?'running':'completed',schedule:{provider:'rehearsal'},events:[]}));
 const visible=app.engine.visibleRuns.bind(app.engine),listed=app.engine.listRuns.bind(app.engine);app.engine.visibleRuns=()=>rows;app.engine.listRuns=()=>rows;
 t.after(()=>{app.engine.visibleRuns=visible;app.engine.listRuns=listed;});
 const state=remoteState({...app,attention:()=>[]});assert.equal(state.hostName,'Synthetic Office PC');assert.equal(state.runs.length,100);assert.equal(state.runningChatCount,1);assert.equal(state.runs.some(r=>r.status==='running'),false);
});
test('remote starting-folder selection tolerates missing siblings without authorizing outside folders',async t=>{
 const {app,connect,workspace,home}=await fixture(t),client=await connect();
 const missing=path.join(home,'temporarily-missing'),alternate=path.join(home,'alternate'),outside=path.join(home,'outside');
 for(const folder of [missing,alternate,outside])fs.mkdirSync(folder);
 app.context.mutate(config=>{config.workspaces.find(w=>w.id===config.defaultWorkspaceId).additionalDirectories=[missing,alternate];},app.context.config().revision);
 const missingRoot=fs.realpathSync(missing);fs.rmdirSync(missing);
 const start=commandFolder=>client.request('chat.start',{provider:'rehearsal',prompt:'Synthetic missing supplemental folder regression',workspaceId:app.context.config().defaultWorkspaceId,commandFolder});
 for(const folder of [workspace,alternate]){
  const result=await start(folder),run=app.engine.getRun(result.runId);
  assert.equal(run.schedule.workspace.cwd,fs.realpathSync(folder));
  assert.ok(!run.schedule.workspace.additionalDirectories.includes(missingRoot));
  assert.ok(run.schedule.context.baseWorkspace.additionalDirectories.includes(missingRoot),'preserve configured unavailable sibling in the snapshot base');
 }
 assert.ok(app.context.scope().additionalDirectories.includes(missingRoot),'saved configuration remains intact');
 await assert.rejects(start(outside),/configured starting folder/);
 await assert.rejects(start(missing),/ENOENT|existing starting folder/);
 const file=path.join(home,'not-a-folder');fs.writeFileSync(file,'synthetic');
 await assert.rejects(start(file),/existing starting folder/);
});

test('workspace file browsing needs its own exact grant and rechecks revocation before returning bytes',async t=>{
 const {app,connect,workspace}=await fixture(t),client=await connect(),workspaceId=app.context.get().defaultWorkspaceId;
 fs.writeFileSync(path.join(workspace,'file-preview.md'),'# Synthetic file');
 await assert.rejects(client.request('files.roots',{workspaceId}),/file|workspace/i);
 app.remote.setDocumentAccess(client.device.id,true);
 await assert.rejects(client.request('files.roots',{workspaceId}),/file|workspace/i);
 app.remote.setWorkspaceFileAccess(client.device.id,[workspaceId]);
 const roots=await client.request('files.roots',{workspaceId}),rootId=roots.roots.find(root=>root.path===workspace).id;
 const result=await client.request('files.preview',{workspaceId,rootId,file:'file-preview.md'});
 assert.equal(result.content,'# Synthetic file');assert.equal(result.relativePath,'file-preview.md');
 await assert.rejects(client.request('files.preview',{workspaceId:'ungranted',rootId,file:'file-preview.md'}));
 await assert.rejects(client.request('files.preview',{workspaceId,rootId,file:'../file-preview.md'}));
 await assert.rejects(client.request('files.mutate',{workspaceId,rootId,action:'create',name:'denied.txt'}),/editing/);
 app.remote.setWorkspaceFileAccess(client.device.id,[workspaceId],[workspaceId]);
 await client.request('files.mutate',{workspaceId,rootId,action:'create',name:'approved.txt'});
 assert.equal(fs.existsSync(path.join(workspace,'approved.txt')),true);
 app.remote.setWorkspaceFileAccess(client.device.id,[workspaceId],[]);
 await assert.rejects(client.request('files.mutate',{workspaceId,rootId,action:'create',name:'revoked.txt'}),/editing/);
 const original=app.workspaceExplorer.preview.bind(app.workspaceExplorer);let release,started;
 const began=new Promise(resolve=>started=resolve);
 app.workspaceExplorer.preview=async args=>{started();await new Promise(resolve=>release=resolve);return original(args);};
 const pending=client.request('files.preview',{workspaceId,rootId,file:'file-preview.md'});
 await began;app.remote.setWorkspaceFileAccess(client.device.id,[]);release();
 await assert.rejects(pending,/file|workspace/i);
 assert.equal(app.remote.config.devices.find(row=>row.id===client.device.id).documentAccess,true);
});

test('workspace file tabs converge through the owner without granting other devices or chat document access',async t=>{
 const {app,connect,workspace}=await fixture(t),client=await connect(),other=await connect(),workspaceId=app.context.get().defaultWorkspaceId;
 fs.writeFileSync(path.join(workspace,'shared-file.md'),'# Owner file');
 app.remote.setWorkspaceFileAccess(client.device.id,[workspaceId]);
 const {roots}=await client.request('files.roots',{workspaceId}),rootId=roots.find(root=>root.path===workspace).id;
 const args={workspaceId,rootId,file:'shared-file.md',scope:'workspace',scopeId:workspaceId};
 const first=await client.request('files.open',args),again=await client.request('files.open',args);
 assert.equal(first.tabId,again.tabId);assert.equal(again.tabs.filter(tab=>tab.id===first.tabId).length,1);
 assert.equal(app.contentTabs.documentSource(workspaceId,first.tabId.slice(9),'workspace'),path.join(workspace,'shared-file.md'));
 const tab=(await client.request('tabs.get',{scope:'workspace',id:workspaceId})).tabs.find(tab=>tab.id===first.tabId);
 assert.deepEqual(tab.workspaceFile,{workspaceId,rootId,file:'shared-file.md',title:'shared-file.md',mediaType:'text/markdown'});
 assert.notEqual(app.remote.config.devices.find(device=>device.id===client.device.id).documentAccess,true);
 assert.equal((await other.request('tabs.get',{scope:'workspace',id:workspaceId})).tabs.some(tab=>tab.id===first.tabId),false);
 const config=app.context.config(),otherFolder=path.join(path.dirname(workspace),'file-view-container');fs.mkdirSync(otherFolder);
 app.context.mutate(value=>value.workspaces.push({...value.workspaces.find(row=>row.id===workspaceId),id:'file-view-container',name:'Other file view container',cwd:otherFolder,additionalDirectories:[]}),config.revision);
 const placed=await client.request('files.open',{...args,scopeId:'file-view-container'});
 assert.equal(placed.tabs.find(tab=>tab.id===placed.tabId).workspaceFile.workspaceId,workspaceId,'Viewer source authority must not change with presentation workspace');
 assert.deepEqual(app.remote.config.devices.find(device=>device.id===client.device.id).workspaceFileAccess,[workspaceId]);
 await assert.rejects(other.request('files.preview',{workspaceId,rootId,file:'shared-file.md'}),/file|workspace/i);
 await assert.rejects(client.request('files.open',{...args,scope:'chat',scopeId:'other'}),/workspace|project/);
 await assert.rejects(client.request('files.open',{...args,workspaceId:'other'}),/workspace|file/);
 await client.request('tabs.mutate',{scope:'workspace',id:workspaceId,expectedRevision:again.revision,operations:[{action:'visibility',id:tab.id,hidden:true}]});
 assert.equal(app.contentTabs.get('workspace',workspaceId).tabs.find(item=>item.id===tab.id).hidden,true);
 app.remote.setWorkspaceFileAccess(client.device.id,[]);
 assert.equal((await client.request('tabs.get',{scope:'workspace',id:workspaceId})).tabs.some(item=>item.id===tab.id),false);
 await assert.rejects(client.request('tabs.mutate',{scope:'workspace',id:workspaceId,expectedRevision:app.contentTabs.get('workspace',workspaceId).revision,operations:[{action:'close',id:tab.id}]}),/document/i);
});
