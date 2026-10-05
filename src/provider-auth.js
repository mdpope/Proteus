import os from 'node:os';
import {spawn} from 'node:child_process';
import {CopilotClient} from '@github/copilot-sdk';
import {CodexRPC} from './codex.js';
import {claudeExecutable} from './claude.js';

const providers=new Set(['copilot','codex','claude']);
const terminal=new Set(['connected','failed','cancelled','timed-out']);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const accountLabel=value=>typeof value==='string'&&value.length<=120&&!/[\x00-\x1f\x7f]/.test(value)?value:null;
function authURL(value){
  let url;try{url=new URL(value);}catch{throw new Error('The provider returned an invalid sign-in URL.');}
  const allowed=new Set(['github.com','auth.openai.com','chatgpt.com','login.openai.com']);
  if(url.protocol!=='https:'||url.port||url.hash||url.href.length>4096||url.username||url.password||!allowed.has(url.hostname))throw new Error('The provider returned an untrusted sign-in URL.');
  for(const key of url.searchParams.keys())if(/^(?:code|token|access_token|id_token|refresh_token|password|client_secret)$/i.test(key))throw new Error('The provider returned a credential-bearing sign-in URL.');
  return url.href;
}
function stopChild(child){
  if(!child?.pid||child.exitCode!==null||child.signalCode!==null)return;
  try{if(process.platform!=='win32')process.kill(-child.pid,'SIGTERM');else child.kill('SIGTERM');}catch{try{child.kill('SIGTERM');}catch{}}
  const timer=setTimeout(()=>{if(child.exitCode===null&&child.signalCode===null)try{if(process.platform!=='win32')process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch{try{child.kill('SIGKILL');}catch{}}},1000);timer.unref?.();
}
export class ProviderAuthManager {
  constructor({adapters,settings,activeTurn=()=>false,onTerminal=()=>{},copilotClientFactory=baseDirectory=>new CopilotClient({baseDirectory,mode:'empty',logLevel:'none'}),codexClientFactory=options=>new CodexRPC(options),spawnProcess=spawn,stopProcess=stopChild,timeoutMs=600000,pollMs=2000,now=()=>Date.now()}={}){
    this.adapters=adapters||{};this.settings=settings;this.activeTurn=activeTurn;this.onTerminal=onTerminal;this.copilotClientFactory=copilotClientFactory;this.codexClientFactory=codexClientFactory;this.spawnProcess=spawnProcess;this.stopProcess=stopProcess;this.timeoutMs=timeoutMs;this.pollMs=pollMs;this.now=now;this.records=new Map();
  }
  snapshot(record){return {providerId:record.providerId,state:record.state,message:record.message||null,...(record.accountLabel?{accountLabel:record.accountLabel}:{}),...(record.url?{url:record.url}:{}),startedAt:record.startedAt,expiresAt:record.expiresAt};}
  status(providerId){if(!providers.has(providerId))throw new Error('Choose Copilot, Codex, or Claude.');const record=this.records.get(providerId);return record?this.snapshot(record):{providerId,state:'idle',message:null};}
  isActive(providerId){const record=this.records.get(providerId);return !!record&&(!terminal.has(record.state)||!record.workSettled||record.cleaning||record.cleanedRevision!==record.resourceRevision);}
  async handle({action,providerId}={}){if(action==='start')return this.start(providerId);if(action==='status')return this.status(providerId);if(action==='cancel')return this.cancel(providerId);throw new Error('Choose a provider sign-in action.');}
  start(providerId){
    if(!providers.has(providerId)||!this.adapters[providerId])throw new Error('Choose an available provider.');
    if(this.activeTurn(providerId)||this.adapters[providerId].active||this.adapters[providerId].sessions?.size)throw new Error('Wait for active provider work to finish before signing in.');
    const old=this.records.get(providerId);if(old&&!terminal.has(old.state))return this.snapshot(old);if(old&&this.isActive(providerId))throw new Error('The previous sign-in is still closing. Retry shortly.');
    const record={providerId,state:'starting',message:'Starting sign-in on this Mac…',url:null,startedAt:new Date(this.now()).toISOString(),expiresAt:new Date(this.now()+this.timeoutMs).toISOString(),stopped:false,workSettled:false,flowId:null,loginId:null,resourceRevision:0,cleanedRevision:-1};this.records.set(providerId,record);
    record.timer=setTimeout(()=>{if(!record.stopped){record.state='timed-out';record.message='Sign-in timed out. Retry on this Mac.';record.url=null;record.stopped=true;void this.cleanup(record).then(()=>this.notifyTerminal(record));}},this.timeoutMs);record.timer.unref?.();
    record.work=(async()=>{try{if(providerId==='copilot')await this.copilot(record);else if(providerId==='codex')await this.codex(record);else await this.claude(record);}catch{if(!record.stopped){record.state='failed';record.message='Sign-in did not complete. Retry or use the provider CLI on this Mac.';record.url=null;record.accountLabel=null;record.stopped=true;}}finally{if(record.stopped)await this.cleanup(record);record.workSettled=true;this.notifyTerminal(record);}})();
    return this.snapshot(record);
  }
  notifyTerminal(record){if(record.notified||this.isActive(record.providerId))return;record.notified=true;this.onTerminal(record.providerId);}
  async verify(record){
    while(!record.stopped&&(this.activeTurn(record.providerId)||this.adapters[record.providerId].active||this.adapters[record.providerId].sessions?.size))await wait(this.pollMs);
    if(record.stopped)return;
    const adapter=this.adapters[record.providerId];
    if(record.providerId!=='claude')await adapter.close?.();
    if(record.stopped)return;
    const status=await adapter.status();
    if(record.stopped)return;
    record.state=status?.available?'connected':'failed';record.message=status?.available?'Connected. Refreshing provider models…':'Sign-in finished, but this provider is still unavailable. Refresh the connection or retry.';record.url=null;if(!status?.available)record.accountLabel=null;record.stopped=true;
  }
  async copilot(record){
    const adapter=this.adapters.copilot,baseDirectory=adapter.dataDirectory?.()||this.settings?.get?.().copilotDataDirectory||process.env.COPILOT_HOME||os.homedir()+'/.copilot';
    const client=this.copilotClientFactory(baseDirectory);record.client=client;record.resourceRevision++;await client.start();if(record.stopped)return;
    const session=await client.createSession({workingDirectory:os.tmpdir(),tools:[],mcpServers:{},skipCustomInstructions:true,enableConfigDiscovery:false,enableSkills:false,onPermissionRequest:async()=>({kind:'reject',feedback:'Authentication-only session.'})});record.session=session;record.resourceRevision++;if(record.stopped)return;
    const begun=await session.rpc.accounts.login.begin({kind:'githubDotCom'});record.flowId=begun.flowId;record.resourceRevision++;let step=begun.step;if(record.stopped)return;
    while(!record.stopped){
      if(step.kind==='completed'){if(step.result?.status!=='completed')throw new Error('The provider did not complete sign-in.');record.accountLabel=accountLabel(step.result.login)||null;await this.verify(record);return;}
      if(step.kind==='error'||step.kind==='input-required')throw new Error('Unsupported sign-in step.');
      if(step.kind==='open-url'){record.url=authURL(step.url);record.message='Complete Copilot sign-in in the browser on this Mac.';}
      else if(step.kind==='needs-interaction')record.message='Complete Copilot sign-in in the browser or system prompt on this Mac.';
      else if(step.kind==='awaiting')record.message='Waiting for Copilot authorization on this Mac…';
      else throw new Error('Unsupported sign-in step.');
      record.state='waiting';await wait(this.pollMs);if(record.stopped)return;step=await session.rpc.accounts.login.advance({flowId:record.flowId});
    }
  }
  async codex(record){
    const client=this.codexClientFactory(this.adapters.codex.options||{});record.client=client;record.resourceRevision++;await client.initialize();if(record.stopped)return;
    const completed=[];let wake=null,closed=false;
    const changed=message=>{if(message.method==='account/login/completed'){completed.push(message.params);wake?.();}};
    const onClosed=()=>{closed=true;wake?.();};
    client.on('notification',changed);client.on('closed',onClosed);
    record.stopListening=()=>{client.off('notification',changed);client.off('closed',onClosed);wake?.();};
    const result=await client.request('account/login/start',{type:'chatgpt'});if(!result?.loginId||!result?.authUrl)throw new Error('Codex did not start browser sign-in.');
    record.loginId=result.loginId;record.resourceRevision++;if(record.stopped)return;record.url=authURL(result.authUrl);record.state='waiting';record.message='Complete Codex sign-in in the browser on this Mac.';
    let completion=null;
    while(!record.stopped&&!closed){completion=completed.find(item=>item?.loginId===record.loginId);if(completion)break;await new Promise(resolve=>{wake=resolve;});wake=null;}
    record.stopListening();record.stopListening=null;
    if(closed)throw new Error('Codex login connection closed.');
    if(record.stopped||!completion)return;if(!completion.success)throw new Error('Codex sign-in failed.');
    try{const account=await client.request('account/read',{refreshToken:true},5000);record.accountLabel=accountLabel(account?.account?.email)||null;}catch{}
    await this.verify(record);
  }
  async claude(record){
    const adapter=this.adapters.claude,command=adapter.options?.command||claudeExecutable(),env={...process.env,...adapter.options?.env};
    const child=this.spawnProcess(command,['auth','login','--claudeai'],{cwd:os.tmpdir(),env,stdio:'ignore',detached:process.platform!=='win32'});record.child=child;record.resourceRevision++;if(record.stopped)return;record.state='waiting';record.message='Complete Claude sign-in in the browser opened on this Mac.';
    const code=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject);record.stopListening=()=>resolve(null);});
    if(record.stopped)return;if(code!==0)throw new Error('Claude sign-in failed.');await this.verify(record);
  }
  async cleanup(record){
    if(record.cleaning){await record.cleaning;if(record.cleanedRevision===record.resourceRevision)return;}
    if(record.cleanedRevision===record.resourceRevision)return;
    const revision=record.resourceRevision;
    record.cleaning=(async()=>{clearTimeout(record.timer);record.stopListening?.();
      if(record.providerId==='copilot'){
        if(record.flowId&&record.state!=='connected')try{await record.session?.rpc.accounts.login.cancel({flowId:record.flowId});}catch{}
        try{await record.session?.disconnect();}catch{}
        if(record.session?.sessionId)try{await record.client?.deleteSession(record.session.sessionId);}catch{}
        try{await record.client?.stop();}catch{}
      }else if(record.providerId==='codex'){
        if(record.loginId&&record.state!=='connected')try{await record.client?.request('account/login/cancel',{loginId:record.loginId},5000);}catch{}
        try{await record.client?.close();}catch{}
    }else this.stopProcess(record.child);
      record.cleanedRevision=revision;
    })();try{await record.cleaning;}finally{record.cleaning=null;}
    if(record.cleanedRevision!==record.resourceRevision)await this.cleanup(record);
  }
  async cancel(providerId){if(!providers.has(providerId))throw new Error('Choose Copilot, Codex, or Claude.');const record=this.records.get(providerId);if(!record)return this.status(providerId);if(!terminal.has(record.state)){record.state='cancelled';record.message='Sign-in cancelled. Retry when ready.';record.url=null;record.stopped=true;await this.cleanup(record);this.notifyTerminal(record);}return this.snapshot(record);}
  async close(){await Promise.all([...this.records.values()].map(async record=>{if(!terminal.has(record.state))await this.cancel(record.providerId);await this.cleanup(record);await Promise.race([record.work?.catch(()=>{})||Promise.resolve(),wait(3000)]);await this.cleanup(record);}));}
}
