import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {ProviderAuthManager} from '../src/provider-auth.js';

const until=async condition=>{for(let i=0;i<100;i++){if(condition())return;await new Promise(resolve=>setTimeout(resolve,5));}assert.fail('Provider auth state did not change.');};
const adapters=()=>({
  copilot:{dataDirectory:()=>'/synthetic/copilot-home',sessions:new Map(),status:async()=>({available:true})},
  codex:{options:{env:{CODEX_HOME:'/synthetic/codex-home'}},status:async()=>({available:true})},
  claude:{options:{command:'/synthetic/claude',env:{CLAUDE_CONFIG_DIR:'/synthetic/claude-home'}},status:async()=>({available:true})},
});
test('Copilot signs in through an isolated SDK auth session with configured home and removes the empty session',async()=>{
  const calls=[],session={sessionId:'synthetic-auth-session',rpc:{accounts:{login:{begin:async value=>{calls.push(['begin',value]);return {flowId:'flow-1',step:{kind:'open-url',url:'https://github.com/login/oauth/authorize?client_id=synthetic'}};},advance:async()=>({kind:'completed',result:{status:'completed'}}),cancel:async()=>assert.fail('Successful login should not be cancelled')}}},disconnect:async()=>calls.push(['disconnect'])};
  const factory=directory=>{calls.push(['home',directory]);return {start:async()=>{},createSession:async options=>{calls.push(['session',options]);return session;},deleteSession:async id=>calls.push(['delete',id]),stop:async()=>calls.push(['stop'])};};
  const manager=new ProviderAuthManager({adapters:adapters(),copilotClientFactory:factory,pollMs:1});
  assert.equal(manager.start('copilot').state,'starting');await until(()=>manager.status('copilot').state==='connected');await manager.records.get('copilot').work;
  assert.deepEqual(calls[0],['home','/synthetic/copilot-home']);assert.equal(calls.find(item=>item[0]==='session')[1].enableConfigDiscovery,false);assert.deepEqual(calls.find(item=>item[0]==='begin'),['begin',{kind:'githubDotCom'}]);assert.ok(calls.some(item=>item[0]==='delete'&&item[1]==='synthetic-auth-session'));
  assert.equal(manager.status('copilot').url,undefined);assert.equal(JSON.stringify(manager.status('copilot')).includes('flow-1'),false);
});
test('Codex browser auth uses app-server start/completed/cancel only and never a model turn',async()=>{
  const calls=[];let client;
  class FakeCodex extends EventEmitter {async initialize(){calls.push(['initialize']);return this;}async request(method,args){calls.push([method,args]);if(method==='account/login/start')return {type:'chatgpt',loginId:'login-1',authUrl:'https://auth.openai.com/oauth/authorize?state=synthetic'};return {status:'cancelled'};}async close(){calls.push(['close']);}}
  const manager=new ProviderAuthManager({adapters:adapters(),codexClientFactory:options=>{assert.equal(options.env.CODEX_HOME,'/synthetic/codex-home');return client=new FakeCodex();}});
  manager.start('codex');await until(()=>manager.status('codex').state==='waiting');assert.match(manager.status('codex').url,/^https:\/\/auth\.openai\.com/);client.emit('notification',{method:'account/login/completed',params:{loginId:'login-1',success:true}});await until(()=>manager.status('codex').state==='connected');await manager.records.get('codex').work;
  assert.deepEqual(calls.map(item=>item[0]),['initialize','account/login/start','account/read','close']);
  assert.equal(calls.some(item=>item[0].startsWith('turn/')),false);
  const cancelManager=new ProviderAuthManager({adapters:adapters(),codexClientFactory:()=>client=new FakeCodex()});cancelManager.start('codex');await until(()=>cancelManager.status('codex').state==='waiting');await cancelManager.cancel('codex');assert.equal(cancelManager.status('codex').state,'cancelled');assert.ok(calls.some(item=>item[0]==='account/login/cancel'));
});
test('Claude login is an ephemeral no-output child in the same config directory and can be cancelled',async()=>{
  const calls=[],child=new EventEmitter();child.pid=undefined;child.exitCode=null;child.signalCode=null;
  const manager=new ProviderAuthManager({adapters:adapters(),spawnProcess:(command,args,options)=>{calls.push({command,args,options});return child;},stopProcess:()=>calls.push({stopped:true})});
  manager.start('claude');await until(()=>manager.status('claude').state==='waiting');assert.equal(calls[0].command,'/synthetic/claude');assert.deepEqual(calls[0].args,['auth','login','--claudeai']);assert.equal(calls[0].options.env.CLAUDE_CONFIG_DIR,'/synthetic/claude-home');assert.equal(calls[0].options.stdio,'ignore');
  child.emit('exit',0);await until(()=>manager.status('claude').state==='connected');await manager.records.get('claude').work;assert.equal(manager.status('claude').url,undefined);
  const pending=new EventEmitter();pending.pid=undefined;pending.exitCode=null;pending.signalCode=null;const cancel=new ProviderAuthManager({adapters:adapters(),spawnProcess:()=>pending,stopProcess:()=>calls.push({cancelled:true})});cancel.start('claude');await until(()=>cancel.status('claude').state==='waiting');await cancel.cancel('claude');assert.equal(cancel.status('claude').state,'cancelled');assert.ok(calls.some(item=>item.cancelled));
});
test('auth start guards only the selected provider and fails closed on unsafe URLs',async()=>{
  const child=new EventEmitter();child.pid=undefined;child.exitCode=null;child.signalCode=null;
  const active=new ProviderAuthManager({adapters:adapters(),activeTurn:id=>id==='codex',spawnProcess:()=>child,stopProcess:()=>{}});assert.throws(()=>active.start('codex'),/active provider work/);
  assert.equal(active.start('claude').providerId,'claude');await active.cancel('claude');
  for(const url of ['http://auth.openai.com/login','https://exfil.test/login','https://auth.openai.com/login?code=secret','https://auth.openai.com:8443/login','https://auth.openai.com/login#token','https://auth.openai.com/'+ 'x'.repeat(4100)]){
    const client={start:async()=>{},createSession:async()=>({sessionId:'auth',rpc:{accounts:{login:{begin:async()=>({flowId:'x',step:{kind:'open-url',url}}),cancel:async()=>{}}}},disconnect:async()=>{}}),deleteSession:async()=>{},stop:async()=>{}};
    const manager=new ProviderAuthManager({adapters:adapters(),copilotClientFactory:()=>client,pollMs:1});manager.start('copilot');await until(()=>manager.status('copilot').state==='failed');await manager.records.get('copilot').work;const state=manager.status('copilot');assert.equal(state.url,undefined);assert.equal(JSON.stringify(state).includes('secret'),false);
  }
});
test('Codex accepts early completion notification and exposes only a provider-reported account label',async()=>{
  let client;
  class FakeCodex extends EventEmitter {async initialize(){return this;}async request(method){if(method==='account/login/start'){this.emit('notification',{method:'account/login/completed',params:{loginId:'early',success:true}});return {loginId:'early',authUrl:'https://auth.openai.com/oauth/authorize?state=synthetic'};}if(method==='account/read')return {account:{email:'person@example.test'}};throw new Error('Unexpected request');}async close(){}}
  const provider=adapters();provider.codex.close=async()=>{};
  const manager=new ProviderAuthManager({adapters:provider,codexClientFactory:()=>client=new FakeCodex(),pollMs:1});
  manager.start('codex');await until(()=>manager.status('codex').state==='connected');await manager.records.get('codex').work;
  assert.equal(manager.status('codex').accountLabel,'person@example.test');assert.equal(manager.status('codex').url,undefined);assert.equal(manager.isActive('codex'),false);
});
test('cancel waits for late auth-only session cleanup before releasing the provider hold',async()=>{
  let releaseSession;const calls=[],terminals=[];
  const late=new Promise(resolve=>{releaseSession=resolve;});
  const session={sessionId:'only-auth-session',disconnect:async()=>calls.push('disconnect'),rpc:{accounts:{login:{}}}};
  const client={start:async()=>{},createSession:async()=>late,deleteSession:async id=>calls.push('delete:'+id),stop:async()=>calls.push('stop')};
  const manager=new ProviderAuthManager({adapters:adapters(),copilotClientFactory:()=>client,onTerminal:id=>terminals.push(id)});
  manager.start('copilot');await until(()=>!!manager.records.get('copilot').client);
  const cancel=manager.cancel('copilot');await cancel;
  assert.equal(manager.isActive('copilot'),true);assert.deepEqual(terminals,[]);
  releaseSession(session);await manager.records.get('copilot').work;
  assert.equal(manager.isActive('copilot'),false);assert.deepEqual(terminals,['copilot']);assert.ok(calls.includes('delete:only-auth-session'));
  assert.equal(calls.some(item=>item.includes('unrelated')),false);
});
test('cancel during delayed provider verification cannot be overwritten by a late status result',async()=>{
  let releaseStatus,statusStarted=false;const deferred=new Promise(resolve=>{releaseStatus=resolve;});
  const provider=adapters();provider.claude.status=async()=>{statusStarted=true;return deferred;};
  const child=new EventEmitter();child.pid=undefined;child.exitCode=null;child.signalCode=null;
  const manager=new ProviderAuthManager({adapters:provider,spawnProcess:()=>child,stopProcess:()=>{}});
  manager.start('claude');await until(()=>manager.status('claude').state==='waiting');child.emit('exit',0);
  await until(()=>statusStarted);await manager.cancel('claude');releaseStatus({available:true});await manager.records.get('claude').work;
  assert.equal(manager.status('claude').state,'cancelled');assert.equal(manager.isActive('claude'),false);
});
