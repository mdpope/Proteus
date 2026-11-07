import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {revision} from '../scheduling/schedules.js';
import {ManagedTokenCoordinator} from './managed-token-coordinator.js';
import {atlassianOAuth,atlassianOAuthProfile as profile} from './managed-atlassian-oauth.js';
import {qualifyAtlassianDefinition,verifyAtlassian} from './managed-atlassian-probes.js';
import {managedHttpAdapter} from './managed-http-adapter.js';
const fail=code=>Object.assign(Error('Review the managed Atlassian connection on its owning computer.'),{code});
const sameState=(a,b)=>typeof a==='string'&&/^[a-f0-9]{64}$/.test(a)&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));

// One owner owns consent, protected credentials and token renewal. Native model
// clients only see the existing run-scoped MCP bridge, never this controller.
export class ManagedAtlassian {
 constructor({registry,vault,openExternal,fetchFn=fetch,now=()=>Date.now(),onChange=()=>{},oauth,transport=managedHttpAdapter}){
  this.registry=registry;this.vault=vault;this.openExternal=openExternal;this.now=now;this.onChange=onChange;this.transport=transport;this.fetchFn=fetchFn;
  this.oauth=oauth||atlassianOAuth({fetchFn,now});this.contexts=new Map();this.flows=new Map();this.authStatus=new Map();this.closed=false;
  this.tokens=new ManagedTokenCoordinator({ownerId:registry.ownerId,vault,now,adapters:{[profile.adapter]:{prepare:this.oauth.prepare,refresh:this.oauth.refresh,verify:args=>this.verifyToken(args)}}});
 }
 definition(id){
  const definition=this.registry.read().connections.find(c=>c.id===id);
  if(this.closed||!definition?.enabled)throw fail('CONFIGURATION_MISMATCH');return qualifyAtlassianDefinition(definition);
 }
 binding(definition,clientId){return {ownerId:definition.ownerId,credentialOwnerId:definition.authentication.credentialOwnerId,credentialRef:definition.authentication.credentialRef,adapter:profile.adapter,issuer:profile.issuer,clientId,expected:structuredClone(definition.expected)};}
 async context(definition){
  const current=this.definition(definition.id);if(revision(current)!==revision(definition))throw fail('CONFIGURATION_MISMATCH');
  const key=revision(definition);let binding=this.contexts.get(key);if(binding)return binding;
  const state=await this.vault.read(definition.authentication.credentialRef),clientId=state?.credential?.clientInformation?.client_id;
  if(typeof clientId!=='string'||!clientId)throw fail('SIGN_IN_REQUIRED');
  binding=this.binding(definition,clientId);this.contexts.set(key,binding);return binding;
 }
 async verifyToken({binding,result}){
  const matches=this.registry.read().connections.filter(c=>c.authentication.credentialRef===binding.credentialRef);
  if(matches.length!==1)throw fail('CONFIGURATION_MISMATCH');
  const definition=this.definition(matches[0].id);
  if(JSON.stringify(definition.expected)!==JSON.stringify(binding.expected)||result?.credential?.issuer!==profile.issuer||result.credential.resource!==profile.endpoint||result.credential.clientInformation?.client_id!==binding.clientId||!Array.isArray(result.credential.scopes)||!binding.expected.scopes.every(s=>result.credential.scopes.includes(s))||typeof result.accessToken!=='string'||!result.accessToken||!Number.isFinite(result.expiresAt)||result.expiresAt<=this.now()+60000)throw fail('CONFIGURATION_MISMATCH');
  const adapter=this.transport({qualify:qualifyAtlassianDefinition,withToken:async(_definition,consume)=>consume(result.accessToken),verify:verifyAtlassian,fetchFn:this.fetchFn});
  const client=await adapter.connect(definition,{signal:AbortSignal.timeout(definition.policy.requestTimeoutMs*2)});
  try{
   const evidence=await client.verify({identityOnly:true,signal:AbortSignal.timeout(definition.policy.requestTimeoutMs)});
   this.definition(definition.id);
   return {principal:evidence.principal,tenant:evidence.tenant,audience:profile.endpoint,scopes:[...result.credential.scopes]};
  }finally{await client.close();}
 }
 adapter(){return this.transport({qualify:qualifyAtlassianDefinition,withToken:async(definition,consume)=>this.tokens.use(await this.context(definition),consume),invalidate:async definition=>this.tokens.invalidate(await this.context(definition)),verify:verifyAtlassian,fetchFn:this.fetchFn});}
 status(id){return this.authStatus.get(id)||{state:'unchecked'};}
 setStatus(id,value){const next={...value,at:new Date(this.now()).toISOString()};this.authStatus.set(id,next);this.onChange(id,next);return next;}
 async signIn(id,{expectedRevision}={}){
  if(this.registry.read().revision!==expectedRevision)throw fail('CONFIGURATION_MISMATCH');
  const definition=this.definition(id),configurationRevision=revision(definition);
  if(this.flows.has(id))throw fail('BUSY');
  if(typeof this.openExternal!=='function')throw fail('UNAVAILABLE');
  // Fail before registration/browser launch if protected storage is unavailable.
  await this.vault.requireAvailable();
  const state=randomBytes(32).toString('hex'),controller=new AbortController();let flow,timer,processing=false,stage='loopback-listen';
  const close=()=>{clearTimeout(timer);controller.abort();server.close();server.closeAllConnections();if(this.flows.get(id)?.state===state)this.flows.delete(id);};
  const server=http.createServer(async(req,res)=>{
   const respond=(status,message)=>{res.writeHead(status,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'});res.end(message);};
   let url;try{url=new URL(req.url,'http://127.0.0.1');}catch{respond(400,'Invalid callback.');return;}
   if(req.method!=='GET'||req.headers.host!=='127.0.0.1:'+server.address()?.port||url.pathname!=='/managed-mcp/callback'||url.searchParams.getAll('state').length!==1||url.searchParams.getAll('code').length>1||!sameState(url.searchParams.get('state'),state)||processing||!flow){respond(400,'Invalid or completed sign-in callback.');return;}
   processing=true;
   try{
    if(controller.signal.aborted||revision(this.definition(id))!==configurationRevision||url.searchParams.has('error'))throw fail('AUTH_REQUIRED');
    const binding=this.binding(definition,flow.clientInformation.client_id),result=await this.oauth.exchange(binding,flow,url.searchParams.get('code'));
    // Persist immediately after exchange, then prove actual account/site access.
    // Failed verification leaves protected quarantine, never an issued token.
    await this.tokens.accept(binding,result);
    if(controller.signal.aborted||revision(this.definition(id))!==configurationRevision)throw fail('CONFIGURATION_MISMATCH');
    this.contexts.set(configurationRevision,binding);this.setStatus(id,{state:'authenticated',nextAction:'Verify required capabilities.'});
    respond(200,'Sign-in verified. Return to Proteus to verify the required connection capabilities.');
   }catch{this.setStatus(id,{state:'sign-in-required',nextAction:'Review account, consent and protected storage on this computer.'});respond(400,'Sign-in could not be verified. Return to Proteus for connection status.');}
   finally{res.on('finish',close);setImmediate(()=>{if(res.writableFinished)close();});}
  });
  server.headersTimeout=10000;server.requestTimeout=15000;
  this.flows.set(id,{state,close,server});
  try{
   await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
   const redirectUri='http://127.0.0.1:'+server.address().port+'/managed-mcp/callback';
   stage='oauth-start';flow=await this.oauth.begin({redirectUri,state,scopes:definition.expected.scopes});
   stage='configuration-recheck';if(controller.signal.aborted||revision(this.definition(id))!==configurationRevision)throw fail('CONFIGURATION_MISMATCH');
   timer=setTimeout(()=>{this.setStatus(id,{state:'sign-in-required',nextAction:'The owner sign-in window expired.'});close();},600000);timer.unref();
   this.setStatus(id,{state:'sign-in-in-progress'});stage='browser-open';await this.openExternal(flow.authorizationUrl.href);
   return {connectionId:id,state:'sign-in-in-progress'};
  }catch(error){
   close();
   const failureStage=['discovery','client-registration','authorization-request'].includes(error?.stage)?error.stage:stage;
   const code=['CONFIGURATION_MISMATCH','UNAVAILABLE','RATE_LIMITED','AUTH_REQUIRED'].includes(error?.code)?error.code:'AUTH_REQUIRED';
   const httpStatus=Number.isInteger(error?.httpStatus)&&error.httpStatus>=400&&error.httpStatus<=599?error.httpStatus:undefined;
   const message=`Atlassian sign-in could not start at ${failureStage} (${code}${httpStatus?', HTTP '+httpStatus:''}). Review this connection's setup; no consent completion is recorded.`;
   this.setStatus(id,{state:'sign-in-required',stage:failureStage,code,...(httpStatus?{httpStatus}:{}),nextAction:message});
   throw Object.assign(Error(message),{code,stage:failureStage});
  }
 }
 async close(){this.closed=true;for(const flow of this.flows.values())flow.close();this.tokens.close();this.contexts.clear();}
}
