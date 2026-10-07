import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserRemoteClient, importKey, seal, unseal } from '../src/remote-client.js';
import { toolActivity } from '../src/tool-activity.js';
import { toolPresentation, activitySummary } from '../public/tool-presentation.js';
import { normalizeProviderUsage } from '../src/usage.js';
import { DesktopPeers } from '../src/desktop-peers.js';
import { CopilotProvider } from '../src/copilot.js';
import { initChatsIndex, loadChatsIndex, recentChats, attentionChats, reconcileIndexedChat, openIndexedChat } from '../public/chats-index.js';
const hostId='11111111-1111-4111-8111-111111111111',deviceId='22222222-2222-4222-8222-222222222222',keyHex='a'.repeat(64),challenge='b'.repeat(64);
class Socket extends EventTarget {
  readyState=1;
  sent=[];
  send(packet){this.sent.push(JSON.parse(packet));}
  close(){this.readyState=3;}
  interrupted(code){const event=new Event('close');event.code=code;this.dispatchEvent(event);}
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function pairing(onCredential=async()=>{}){
 const socket=new Socket(),host={hostId,relay:'wss://relay.example.test',inviteKey:keyHex,expiresAt:new Date(Date.now()+60000).toISOString()},stages=[];
 const client=new BrowserRemoteClient(host,{socketFactory:()=>socket,onCredential,timeoutMs:500});client.addEventListener('stage',event=>stages.push(event.detail.stage));
 const connected=client.connect();await tick();await client.receive({type:'challenge',challenge});
 await client.receive({type:'paired',box:await seal(await importKey(keyHex),{id:deviceId,key:keyHex,pairedAt:new Date().toISOString()},`${challenge}:paired`)});
 return {client,socket,connected,stages};
}
test('browser pairing separates invitation, account-save, authentication and ready stages',async()=>{
 let saved;const {client,socket,connected,stages}=await pairing(async record=>{saved=record;});
 assert.equal(saved.deviceId,deviceId);assert.equal(client.status,'connecting');assert.equal(client.credentialSaved,true);
 const auth=socket.sent.at(-1),value=await unseal(client.host.key,auth.box,`${challenge}:auth`);assert.equal(value.nonce.length,64);
 await client.receive({type:'ready',box:await seal(client.host.key,{protocol:1},`${client.prefix}:ready`)});await connected;
 assert.deepEqual(stages,['relay','pairing','account-save','authentication','connected']);assert.equal(client.status,'online');client.close();
});
test('failed account-save and rejected invitations identify their stage without exposing secrets',async()=>{
 const socket=new Socket(),client=new BrowserRemoteClient({hostId,relay:'wss://relay.example.test',inviteKey:keyHex},{socketFactory:()=>socket,onCredential:async()=>{throw new Error('token=private-fixture');}});
 const connected=client.connect();const failure=assert.rejects(connected,/account save failed.*no account destination was confirmed/);await tick();await client.receive({type:'challenge',challenge});await client.receive({type:'paired',box:await seal(await importKey(keyHex),{id:deviceId,key:keyHex},`${challenge}:paired`)});await failure;assert.equal(client.credentialSaved,undefined);
 const expired=new BrowserRemoteClient({hostId,relay:'wss://relay.example.test',inviteKey:keyHex,expiresAt:'2000-01-01T00:00:00Z'},{socketFactory:()=>{throw new Error('Must not open expired invitation');}});await assert.rejects(expired.connect(),/Invitation expired/);
 for(const code of [1008,1012,1013,1006]){const ws=new Socket(),remote=new BrowserRemoteClient({hostId,relay:'wss://relay.example.test',inviteKey:keyHex},{socketFactory:()=>ws});const promise=remote.connect(),rejected=assert.rejects(promise,code===1008?/Relay refused.*relay/:code===1012?/Mac disconnected.*relay/:code===1013?/Mac is offline/:/interrupted.*relay.*1006/);await tick();ws.interrupted(code);await rejected;}
});
test('structured and saved browser failures retain the actual safe reason across presentation',()=>{
 for(const result of [{structuredContent:{error:'Debugger is already attached to the target; token=synthetic-secret; api-key=synthetic-api-secret'}},{content:JSON.stringify({error:{message:'Debugger is already attached to the target',password:'synthetic-secret'}})},{isError:true,content:[{type:'text',text:'Debugger is already attached to the target'}]}]){
  let tool;const receive=toolActivity({emit:(role,text,data)=>{tool=data.tool;},update(){}});receive({type:'tool.execution_start',data:{toolCallId:'synthetic',toolName:'proteus_browser'}});receive({type:'tool.execution_complete',data:{toolCallId:'synthetic',success:false,result}});
  assert.equal(tool.status,'failed');assert.match(toolPresentation(tool).error,/Debugger is already attached/);assert.ok(!toolPresentation(tool).error.includes('synthetic-secret'));assert.ok(!toolPresentation(tool).error.includes('synthetic-api-secret'));
 }
 assert.equal(toolPresentation({status:'failed',output:JSON.stringify({error:'Debugger is already attached to the target'})}).error,'Debugger is already attached to the target');
 assert.equal(activitySummary([{status:'completed'},{status:'failed'},{status:'running'}],2),'Activity · 3 tools · 2 automatic approvals · 1 failed · 1 running');
});
test('Copilot missing and unusable account quotas explain unavailability while zero remains measured',async()=>{
 for(const raw of [{},{quotaSnapshots:{chat:{remainingPercentage:100}}},{quotaSnapshots:{premium_interactions:{}}}]){const result=normalizeProviderUsage('copilot',raw);assert.equal(result.available,false);assert.match(result.error,/Copilot returned/);}
 const zero=normalizeProviderUsage('copilot',{quotaSnapshots:{premium_interactions:{remainingPercentage:0}}});assert.equal(zero.available,true);assert.equal(zero.windows[0].remainingPercent,0);assert.equal(zero.error,null);
 let quotaCalls=0,stopped=0;const provider=new CopilotProvider({}, {quotaClientFactory:()=>({start:async()=>{},getAuthStatus:async()=>({isAuthenticated:false}),stop:async()=>{stopped++;},rpc:{account:{getQuota:async()=>{quotaCalls++;}}}})});await assert.rejects(provider.quota(),/signed out.*Sign in/);assert.equal(quotaCalls,0);assert.equal(stopped,1);
});
test('attention rows and badge share current local state, exclude offline cache, and reject stale review replies',async()=>{
 let next={items:[{hostId:'this-mac',local:true,chatId:'local-failure',status:'failed',attentionRequired:true,updatedAt:'2026-10-06T01:00:00Z'},{hostId:'peer',chatId:'peer-failure',status:'failed',attentionRequired:true,failureEventAt:'2026-10-06T01:00:00Z',updatedAt:'2026-10-06T01:00:00Z'}],hosts:[{id:'peer',online:false,lastSyncAt:'2026-10-06T01:00:00Z'}],partial:true};
 const runs=[{id:'local-failure',status:'failed',failureReviewedAt:'2026-10-06T02:00:00Z',updatedAt:'2026-10-06T02:00:00Z'}];initChatsIndex({api:async()=>next});await loadChatsIndex();assert.equal(attentionChats(runs).length,0);assert.equal(recentChats(runs).find(row=>row.hostId==='peer').cached,true);
 next={...next,hosts:[{id:'peer',online:true}]};await loadChatsIndex();assert.equal(attentionChats(runs).length,1);
 reconcileIndexedChat({...next.items[1],attentionRequired:false,failureReviewedAt:'2026-10-06T02:00:00Z',updatedAt:'2026-10-06T02:00:00Z'});await loadChatsIndex();assert.equal(attentionChats(runs).length,0);
 next={...next,items:[{...next.items[1],failureEventAt:'2026-10-06T03:00:00Z',updatedAt:'2026-10-06T03:00:00Z',attentionRequired:true}]};await loadChatsIndex();assert.equal(attentionChats(runs).length,1);
});

test('paired Mac review reconciles cached rows and ignores a stale index while accepting a newer failure',()=>{
 const peers=new DesktopPeers('/synthetic',{safeStorage:{}});peers.saveCache=()=>{};peers.cache.set('peer',{items:[{id:'failed',chatId:'failed',status:'failed',failureEventAt:'2026-10-06T01:00:00Z',attentionRequired:true,archivedAt:null}]});
 peers.reconcileChat('peer',{id:'failed',failureEventAt:'2026-10-06T01:00:00Z',failureReviewedAt:'2026-10-06T02:00:00Z',attentionRequired:false});assert.equal(peers.cache.get('peer').items[0].attentionRequired,false);assert.equal(peers.lifecycleOverrides.size,0);
 assert.equal(peers.reviewStatus('peer',{id:'failed',status:'failed',failureEventAt:'2026-10-06T00:00:00Z',attentionRequired:true}).attentionRequired,false);
 assert.equal(peers.reviewStatus('peer',{id:'failed',status:'failed',failureEventAt:'2026-10-06T03:00:00Z',attentionRequired:true}).attentionRequired,true);assert.equal(peers.reviewOverrides.size,0);peers.close();
});

test('a local index row refreshes held view state before deciding the chat is missing',async()=>{
 const opened=[],messages=[],state={data:{runs:[]},page:'runs',tab:'overview'};initChatsIndex({state,api:async path=>{assert.equal(path,'/api/state');return {runs:[{id:'new-local-chat',status:'completed'}]};},openLocal:run=>opened.push(run.id),toast:message=>messages.push(message)});await openIndexedChat({local:true,chatId:'new-local-chat'});assert.deepEqual(opened,['new-local-chat']);assert.deepEqual(messages,[]);
 await openIndexedChat({local:true,chatId:'deleted-local-chat'});assert.match(messages[0],/no longer available/);
});
