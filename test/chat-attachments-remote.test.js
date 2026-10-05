import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {startServer} from '../src/server.js';
import {startRelay} from '../relay/server.js';
import {atomicJSON} from '../src/files.js';
import {secret} from '../src/remote-crypto.js';
import {RemoteClient,until} from './remote-client.mjs';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLytQAAAABJRU5ErkJggg==','base64');
const sha256=createHash('sha256').update(png).digest('hex');
test('explicit first-message and follow-up consent deliver only exact synthetic bytes to named provider',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-attachment-remote-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  atomicJSON(path.join(home,'settings.json'),{schemaVersion:1,provider:'copilot',model:'fixture',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}});
  const calls=[];
  const provider={acceptedMediaTypes:['image/png'],async run({attachments,prompt}){calls.push({attachments,prompt});},async status(){return {available:true,models:[{id:'fixture',name:'Fixture'}]};}};
  const token=secret(),relay=await startRelay({port:0,token}),app=await startServer({home,port:0,timers:false,providers:{copilot:provider}});
  const clients=[];t.after(async()=>{clients.forEach(client=>client.close());await app.close();await relay.close();});
  const relayURL=`ws://127.0.0.1:${relay.port}`;await app.remote.configure({enabled:true,mode:'external',relayURL,publicURL:relayURL,relayToken:token});await until(()=>app.remote.status==='online');
  const client=new RemoteClient(RemoteClient.capsule((await app.remote.pairing()).code));clients.push(client);await client.connect();
  const upload=async owner=>{const begun=await client.request('chat.attachments.begin',{...owner,name:'synthetic.png',mediaType:'image/png',size:png.length,sha256});await client.request('chat.attachments.chunk',{uploadId:begun.uploadId,index:0,dataBase64:png.toString('base64')});return client.request('chat.attachments.finish',{uploadId:begun.uploadId});};
  const draftId=randomUUID(),messageId=randomUUID();
  const first=await upload({draftId,providerId:'copilot',messageId});
  const grant=await client.request('chat.attachments.authorize',{draftId,providerId:'copilot',messageId,attachments:[first]});
  await assert.rejects(client.request('chat.start',{draftId,provider:'codex',providerId:'codex',model:'fixture',prompt:'Wrong destination',messageId,attachments:[first.attachmentId],consentId:grant.consentId}),/does not match|unavailable|provider/);
  assert.equal(calls.length,0);
  const {runId}=await client.request('chat.start',{draftId,provider:'copilot',providerId:'copilot',model:'fixture',prompt:'Inspect this synthetic image',messageId,attachments:[first.attachmentId],consentId:grant.consentId});
  await until(()=>calls.length===1);assert.deepEqual(calls[0].attachments[0].bytes,png);assert.equal(calls[0].prompt,'Inspect this synthetic image');
  await until(()=>app.engine.getRun(runId).status==='completed');
  const nextMessage=randomUUID(),second=await upload({id:runId,providerId:'copilot',messageId:nextMessage});
  const nextGrant=await client.request('chat.attachments.authorize',{id:runId,providerId:'copilot',messageId:nextMessage,attachments:[second]});
  await assert.rejects(client.request('chat.send',{id:runId,prompt:'Wrong file list',providerId:'copilot',mode:'queue',messageId:nextMessage,attachments:[first.attachmentId],consentId:nextGrant.consentId}),/does not match|expired/);
  await client.request('chat.send',{id:runId,prompt:'Check another synthetic image',providerId:'copilot',mode:'queue',messageId:nextMessage,attachments:[second.attachmentId],consentId:nextGrant.consentId});
  await until(()=>calls.length===2);assert.deepEqual(calls[1].attachments[0].bytes,png);
  assert.deepEqual((await client.request('chat.get',{id:runId})).events.filter(item=>item.data?.attachments).map(item=>item.data.attachments[0].name),['synthetic.png','synthetic.png']);
});

test('deferred draft cannot execute during an unrelated drain',async t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'proteus-attachment-deferred-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  atomicJSON(path.join(home,'settings.json'),{schemaVersion:1,provider:'copilot',model:'fixture',timezone:'UTC',workspace:{cwd:home,additionalDirectories:[]},skillDirectories:[],mcpServers:{}});
  let calls=0;const app=await startServer({home,port:0,timers:false,providers:{copilot:{async run(){calls++;},async status(){return {available:true,models:[]};}}}});t.after(()=>app.close());
  const run=app.engine.createRun(app.buildChatSchedule({prompt:'Never run before consent',provider:'copilot',model:'fixture'}),'chat',null,{deferStart:true});
  await app.engine.drain();await new Promise(resolve=>setTimeout(resolve,20));assert.equal(calls,0);assert.equal(run.status,'queued');
  app.engine.discardDeferredRun(run.id);assert.equal(app.engine.runs.has(run.id),false);
});
