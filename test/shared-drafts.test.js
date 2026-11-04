import {assertPrivate} from './helpers/permissions.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {SharedDrafts} from '../src/services/chats/shared-drafts.js';
import {ContentTabs,workspaceContentScopes} from '../src/services/workspaces/content-tabs.js';
import {privateTemporaryDirectory} from '../src/shared/private-paths.cjs';
import {startServer} from '../src/server.js';
import {startRelay} from '../relay/server.js';
import {secret} from '../src/services/remote/remote-crypto.js';
import {RemoteClient,until} from './remote-client.mjs';

test('shared draft revisions preserve conflicts, exact uncertain receipts and conditional send clearing',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-drafts-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const drafts=new SharedDrafts(home,{validate:()=>{}}),identity={kind:'reply',id:'synthetic-chat'};
 const attempt={...identity,text:'Phone unfinished reply',expectedRevision:0,operationId:randomUUID(),attachments:['PRIVATE_FILE'],provider:'PRIVATE_CHOICE'};
 const [first,other]=await Promise.all([drafts.save(attempt),drafts.save({...attempt,text:'Desktop reply',operationId:randomUUID()})]);
 assert.equal(first.revision,1);assert.equal(other.conflict,true);assert.equal(other.text,attempt.text);
 await drafts.close();const restored=new SharedDrafts(home,{validate:()=>{}});
 assert.equal((await restored.save(attempt)).appliedRevision,1);await assert.rejects(restored.save({...attempt,text:'Changed uncertain attempt'}),/already used/);
 await restored.save({...identity,text:'Newer correction',expectedRevision:1,operationId:randomUUID()});
 await restored.clearSent(identity,attempt.text);assert.equal(restored.get(identity).text,'Newer correction');
 await restored.clearSent(identity,'Newer correction');assert.equal(restored.get(identity).text,'');assert.equal(restored.get(identity).clearedRevision,2);
 const stored=fs.readFileSync(restored.file,'utf8');assert.doesNotMatch(stored,/PRIVATE_FILE|PRIVATE_CHOICE/);assertPrivate(restored.file,0o600);
 await assert.rejects(restored.save({...attempt,text:'x'.repeat(200001),operationId:randomUUID()}),/bounded/);
});

test('setup tab descriptors publish only their empty marker and retain stable owner identity',t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-setup-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));const tabs=new ContentTabs(home);
 const session={tabs:[{id:'project',type:'workspace',workspaceId:'workspace',projectId:'project'},{id:'setup-view',contentTabId:'shared-setup',parentId:'project',type:'browser',url:'',label:'New chat',newChatDraft:{schemaVersion:1,prompt:'PRIVATE TEXT',form:{prompt:'PRIVATE TEXT'},attachments:['PRIVATE FILE'],provider:'PRIVATE MODEL'}}]};
 const scope=workspaceContentScopes(session).find(row=>row.scope==='project');const saved=tabs.mutate({...scope,expectedRevision:0,operations:scope.tabs.map(tab=>({action:'open',tab}))});
 assert.equal(saved.tabs[0].id,'shared-setup');assert.deepEqual(saved.tabs[0].setup,{kind:'chat'});assert.doesNotMatch(JSON.stringify(saved),/PRIVATE/);
 assert.throws(()=>tabs.mutate({scope:'project',id:'project',expectedRevision:saved.revision,operations:[{action:'open',tab:{id:'bad',type:'browser',url:'https://example.test',setup:{kind:'chat'}}}]}),/blank/);
});

test('two encrypted clients and desktop exchange only draft text and consume one shared setup',async t=>{
 const home=privateTemporaryDirectory(path.join(os.tmpdir(),'proteus-draft-remote-')),token=secret(),relay=await startRelay({port:0,token}),calls=[];
 const app=await startServer({home,port:0,timers:false,withSeed:false,providers:{rehearsal:{async run({prompt}){calls.push(prompt);},async status(){return {available:true,models:[]};}}}}),clients=[];
 t.after(async()=>{clients.forEach(client=>client.close());await app.close();await relay.close();fs.rmSync(home,{recursive:true,force:true});});
 const relayURL='ws://127.0.0.1:'+relay.port;await app.remote.configure({enabled:true,mode:'external',relayURL,publicURL:relayURL,relayToken:token});await until(()=>app.remote.status==='online');
 for(let i=0;i<2;i++){const client=new RemoteClient(RemoteClient.capsule((await app.remote.pairing()).code));clients.push(client);await client.connect();}
 const catalog=app.workspaceProjects.get(app.engine),workspaceId=app.context.get().defaultWorkspaceId,projectId=catalog.defaultProjectIds[workspaceId],setupId=randomUUID();
 app.contentTabs.mutate({scope:'project',id:projectId,expectedRevision:0,operations:[{action:'open',tab:{id:setupId,type:'browser',title:'New chat',url:'',setup:{kind:'chat'}}}]});
 const identity={kind:'setup',id:setupId,scope:'project',scopeId:projectId};
 const post=async(route,value)=>{const response=await fetch(app.origin+route,{method:'POST',headers:{authorization:'Bearer '+app.token,'content-type':'application/json'},body:JSON.stringify(value)});const body=await response.json();assert.equal(response.ok,true,body.error);return body;};
 await clients[0].request('draft.text.save',{...identity,text:'Finish this on desktop',expectedRevision:0,operationId:randomUUID()});
 assert.equal((await post('/api/shared-draft',{action:'get',...identity})).text,'Finish this on desktop');assert.equal((await clients[1].request('draft.text.get',identity)).text,'Finish this on desktop');
 assert.doesNotMatch(JSON.stringify(await clients[1].request('tabs.get',{scope:'project',id:projectId})),/Finish this on desktop/);
 await assert.rejects(clients[0].request('draft.text.get',{kind:'reply',id:randomUUID()}),/not found|Unknown/);
 await assert.rejects(app.remote.execute({device:app.remote.config.devices[0]},'draft.text.get',{...identity,agentControl:true}),/human composer/);
 const args={setupId,setupScope:'project',setupScopeId:projectId,workspaceId,projectId,provider:'rehearsal',model:'',prompt:'Finish this on desktop'};
 await assert.rejects(app.startSharedSetup({...args,projectId:randomUUID()},()=>assert.fail('A mismatched setup must not start a chat')),/original project/);
 const attempts=await Promise.allSettled(clients.map(client=>client.request('chat.start',args))),one=attempts.find(result=>result.status==='fulfilled').value;
 const two=await clients[1].request('chat.start',args);assert.equal(two.runId,one.runId);await until(()=>calls.length===1);assert.equal([...app.engine.runs.values()].filter(run=>run.setupId===setupId).length,1);
 const members=app.contentTabs.get('project',projectId);assert.equal(members.tabs.some(tab=>tab.id===setupId),false);assert.equal(members.tabs.filter(tab=>tab.chatId===one.runId).length,1);
 const reply={kind:'reply',id:one.runId};await clients[1].request('draft.text.save',{...reply,text:'Phone follow-up',expectedRevision:0,operationId:randomUUID()});assert.equal((await post('/api/shared-draft',{action:'get',...reply})).text,'Phone follow-up');
 await until(()=>app.engine.getRun(one.runId).status==='completed');await post('/api/runs/'+one.runId+'/send',{prompt:'Phone follow-up',messageId:randomUUID(),mode:'queue'});assert.equal((await clients[0].request('draft.text.get',reply)).text,'');
});
