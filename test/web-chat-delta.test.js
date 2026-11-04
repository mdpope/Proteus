import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {startServer} from '../src/server.js';
import {startRelay} from '../relay/server.js';
import {secret} from '../src/services/remote/remote-crypto.js';
import {atomicJSON} from '../src/shared/files.js';
import {BrowserRemoteClient,parsePairing} from '../web/resources/js/remote-client.js';
import {createVisibleChatWatch} from '../web/resources/js/chat-watch.js';
import {mergeChatHistory} from '../public/features/chats/chat-history.js';
import {until} from './remote-client.mjs';

async function fixture(t){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-web-chat-delta-')),workspace=path.join(home,'workspace');fs.mkdirSync(workspace);
 atomicJSON(path.join(home,'settings.json'),{schemaVersion:1,provider:'rehearsal',model:'',timezone:'UTC',workspace:{cwd:workspace,additionalDirectories:[]},skillDirectories:[],mcpServers:{}});
 const token=secret(),relay=await startRelay({port:0,token,allowedClientOrigins:['https://example.test']}),app=await startServer({home,port:0,timers:false}),clients=[];
 const url=`ws://127.0.0.1:${relay.port}`;await app.remote.configure({enabled:true,mode:'external',relayURL:url,publicURL:url,relayToken:token});await until(()=>app.remote.status==='online');
 t.after(async()=>{clients.forEach(client=>client.close());await app.close();await relay.close();fs.rmSync(home,{recursive:true,force:true});});
 const connect=async saved=>{const capsule=saved?null:parsePairing((await app.remote.pairing()).code),host=saved||{hostId:capsule.hostId,relay:url,inviteKey:capsule.key,label:'Synthetic owner'};const client=new BrowserRemoteClient(host,{socketFactory:url=>new WebSocket(url,{headers:{Origin:'https://example.test'}})});clients.push(client);await client.connect();return client;};
 const create=()=>{
  const run=app.engine.createRun({...app.engine.schedules.list()[0],prompt:'Synthetic streaming acceptance'},'chat',null,{deferStart:true});
  run.status='completed';delete run.deferredStart;run.nextModelOptions={model:'synthetic-model'};
  run.schedule.context={...run.schedule.context,entries:Array.from({length:100},(_,i)=>({id:'source-'+i,name:'Captured synthetic source '+i,kind:'instruction',path:path.join(workspace,'source-'+i+'.md'),description:'c'.repeat(550),mode:'universal'}))};
  run.events=Array.from({length:100},(_,i)=>({role:'assistant',text:'Synthetic history '+i+' '+ 'history '.repeat(110),at:new Date(1_700_000_000_000+i).toISOString()}));app.engine.persist(run);return run;
 };
 return {app,connect,create,peer:client=>[...app.remote.peers.values()].find(peer=>peer.prefix===client.prefix)};
}

test('real owner chat streaming omits captured metadata and history, while auxiliary reads retain the visible delta cursor',async t=>{
 const {app,connect,create,peer}=await fixture(t),run=create(),other=create(),full=await connect(),delta=await connect({...full.host});
 const current={client:delta,state:(await delta.request('sync',{})).state},controller=createVisibleChatWatch({request:(owner,method,args)=>owner.client.request(method,args),updated:()=>{},failed:assert.fail});
 let fullPage=await full.request('chat.get',{id:run.id}),deltaPage=await controller.read(current,run.id),fullCount=0,deltaCount=0,lastDelta;
 assert.ok(Buffer.byteLength(JSON.stringify({context:deltaPage.context,schedule:deltaPage.schedule}))>65_000);
 full.addEventListener('change',event=>{if(event.detail.event==='run'&&event.detail.runId===run.id){fullCount++;fullPage=mergeChatHistory(fullPage,event.detail.data);}});
 delta.addEventListener('change',event=>{if(event.detail.event==='run'&&event.detail.runId===run.id){deltaCount++;lastDelta=event.detail.data;deltaPage=mergeChatHistory(deltaPage,event.detail.data);}});
 const frames=[],raw=app.remote.raw.bind(app.remote);app.remote.raw=(target,packet,kind)=>{if(kind==='run')frames.push({mode:target===peer(delta)?'delta':'full',bytes:Buffer.byteLength(JSON.stringify({clientId:target.id,packet}))});return raw(target,packet,kind);};
 // Complete the first metadata-hash seed, and report this cost separately.
 app.engine.event(run,'assistant','Warm-up provider event');app.remote.publish();await until(()=>fullPage.events.at(-1)?.text==='Warm-up provider event'&&deltaPage.events.at(-1)?.text==='Warm-up provider event');
 const firstDelivery={full:frames.find(row=>row.mode==='full').bytes,delta:frames.find(row=>row.mode==='delta').bytes};
 const oldPage=await delta.request('chat.get',{id:run.id,beforeEvent:10,watch:'none'}),cursor=peer(delta).historyCursor,watchToken=peer(delta).watchToken;
 await delta.request('chat.get',{id:other.id,watch:'none'});
 assert.equal(peer(delta).runId,run.id);assert.equal(peer(delta).deltaOnly,true);assert.equal(peer(delta).fieldDelta,true);assert.equal(peer(delta).historyCursor,cursor);assert.equal(peer(delta).watchToken,watchToken);
 frames.length=0;const initialFull=fullCount,initialDelta=deltaCount;
 for(let i=0;i<12;i++){
  if(i===6)delete run.nextModelOptions;
  app.engine.stream(run,'synthetic-response','stream '+i+' ');
  app.engine.event(run,'assistant','Provider update '+i+' '+ 'changed '.repeat(110));app.remote.publish();
  await until(()=>fullCount>=initialFull+i+1&&deltaCount>=initialDelta+i+1);
  assert.equal(lastDelta.fieldDelta,true);assert.equal(lastDelta.context,undefined);assert.equal(lastDelta.schedule,undefined);assert.equal(lastDelta.events.length,0);assert.ok(lastDelta.eventPatches.length>=1);
 }
 assert.deepEqual(deltaPage.schedule,fullPage.schedule);assert.deepEqual(deltaPage.context,fullPage.context);
 assert.equal(deltaPage.events.at(-1).text,fullPage.events.at(-1).text);assert.deepEqual(deltaPage.liveMessages,fullPage.liveMessages);
 // A history page arriving after field deltas retains current metadata and history.
 const merged=mergeChatHistory(deltaPage,oldPage);assert.equal(merged.eventCount,deltaPage.eventCount);assert.deepEqual(merged.schedule,deltaPage.schedule);assert.equal(merged.events.at(-1).text,deltaPage.events.at(-1).text);assert.equal(merged.nextModelOptions,undefined);
 const measurements=mode=>{const bytes=frames.filter(row=>row.mode===mode).map(row=>row.bytes);assert.equal(bytes.length,12);return {updates:bytes.length,total:bytes.reduce((a,b)=>a+b,0),mean:bytes.reduce((a,b)=>a+b,0)/bytes.length,min:Math.min(...bytes),max:Math.max(...bytes)};};
 const before=measurements('full'),after=measurements('delta');assert.ok(after.mean<before.mean/20);
 t.diagnostic(JSON.stringify({workload:{historyEvents:100,updates:12,capturedMetadataBytes:Buffer.byteLength(JSON.stringify({context:deltaPage.context,schedule:deltaPage.schedule}))},firstDelivery,before,after}));
 controller.clear();await until(()=>peer(delta).runId===null);const count=deltaCount;
 app.engine.event(run,'assistant','After hidden or left');app.remote.publish();await until(()=>fullCount>initialFull+12);assert.equal(deltaCount,count);
 const stale=watchToken;await controller.read(current,run.id);assert.notEqual(peer(delta).watchToken,stale);
 assert.equal((await delta.request('chat.watch',{id:run.id,watch:'none',watchToken:stale})).cleared,false);
 controller.clear();await until(()=>peer(delta).runId===null);
});

for(const supportsDelta of [false,true])test('a legacy owner without field deltas merges '+(supportsDelta?'history patches with full metadata':'whole pages'),async t=>{
 const {app,connect,create}=await fixture(t),run=create(),client=await connect(),command=app.remote.command.bind(app.remote);
 app.remote.command=(peer,message)=>command(peer,message.method==='chat.get'?{...message,args:{id:message.args.id,...(supportsDelta?{watch:message.args.watch}:{})}}:message);
 const current={client,state:{capabilities:[]}},controller=createVisibleChatWatch({request:(owner,method,args)=>owner.client.request(method,args),updated:()=>{},failed:assert.fail});
 let page=await controller.read(current,run.id),received;
 client.addEventListener('change',event=>{if(event.detail.event==='run'){received=event.detail.data;page=mergeChatHistory(page,received);}});
 app.engine.event(run,'assistant','Legacy full page streaming update');app.remote.publish();await until(()=>page.events.at(-1)?.text==='Legacy full page streaming update');
 assert.equal(received.fieldDelta,undefined);assert.equal(received.events.length,supportsDelta?0:100);assert.ok(received.context.entries.length===100);assert.equal(page.events.at(-1).text,'Legacy full page streaming update');controller.clear();
});
