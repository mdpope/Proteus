import http from 'node:http';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {atlassianOAuthProfile as profile} from './managed-atlassian-oauth.js';
import {discoverAtlassian} from './managed-atlassian-probes.js';
import {validateManagedConnection} from './managed-connection-registry.js';

export const atlassianSetupScopes=Object.freeze(['read:me','read:account','read:jira-work','offline_access']);
const failure=message=>Error(message);
// Owner-only enrollment, separate from the runtime registry. Until explicit account/site
// confirmation, no workspace or model can capture this grant. Only encrypted refresh
// credentials survive a crash; the access token and browser flow remain in memory.
export class AtlassianOnboarding {
 constructor(auth,{workspaces,onChange=()=>{}}){this.auth=auth;this.workspaces=workspaces;this.onChange=onChange;this.session=null;}
 status(){const s=this.session;return s?{id:s.id,state:s.state,stage:s.stage,message:s.message,expiresAt:s.expiresAt,...(s.discovery?{account:s.discovery.account,sites:s.discovery.sites}:{}),...(s.connectionId?{connectionId:s.connectionId}:{})}:null;}
 update(s,value){Object.assign(s,value);this.onChange();}
 async start(){
  if(this.session&&['starting','authorizing','discovering','review','saving'].includes(this.session.state))throw failure('Finish or cancel the current Atlassian setup first.');
  const s={id:randomUUID(),state:'starting',stage:'loopback-listen',credentialRef:randomUUID(),expiresAt:new Date(this.auth.now()+600000).toISOString(),controller:new AbortController()};this.session=s;
  const state=randomBytes(32).toString('hex');let flow,processing=false;
  const stopListener=()=>{s.server?.close();s.server?.closeAllConnections();};
  s.stop=stopListener;
  const fail=error=>{const stage=['discovery','client-registration','authorization-request'].includes(error?.stage)?error.stage:s.stage;const code=['CONFIGURATION_MISMATCH','UNAVAILABLE','RATE_LIMITED','AUTH_REQUIRED','CREDENTIAL_STORE_UNAVAILABLE'].includes(error?.code)?error.code:'AUTH_REQUIRED';const httpStatus=Number.isInteger(error?.httpStatus)&&error.httpStatus>=400&&error.httpStatus<=599?', HTTP '+error.httpStatus:'';this.update(s,{state:'failed',stage,message:`Atlassian setup stopped at ${stage} (${code}${httpStatus}). Review setup and try again when ready.`});};
  s.server=http.createServer(async(req,res)=>{
   const respond=(status,message)=>{res.writeHead(status,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'});res.end(message);};
   let url;try{url=new URL(req.url,'http://127.0.0.1');}catch{respond(400,'Invalid callback.');return;}
   const received=url.searchParams.get('state');
   if(req.method!=='GET'||req.headers.host!=='127.0.0.1:'+s.server.address()?.port||url.pathname!=='/managed-mcp/callback'||url.searchParams.getAll('state').length!==1||url.searchParams.getAll('code').length>1||! /^[a-f0-9]{64}$/.test(received||'')||!timingSafeEqual(Buffer.from(received),Buffer.from(state))||processing||!flow||s.state!=='authorizing'){respond(400,'Invalid or completed callback.');return;}
   processing=true;
   try{
    if(url.searchParams.has('error'))throw failure('Consent declined.');
    this.update(s,{state:'discovering',stage:'token-exchange'});
    const binding={adapter:profile.adapter,issuer:profile.issuer,ownerId:this.auth.registry.ownerId,credentialOwnerId:this.auth.registry.ownerId,clientId:flow.clientInformation.client_id,expected:{audience:profile.endpoint,scopes:[...atlassianSetupScopes]}};
    const result=await this.auth.oauth.exchange(binding,flow,url.searchParams.get('code'));
    // Do not lose a newly issued refresh grant even if discovery fails. Quarantine
    // is never usable by the runtime token coordinator and contains no access token.
    s.stage='protected-storage';await this.auth.vault.write(s.credentialRef,{phase:'onboarding-unconfirmed',credential:result.credential});
    s.controller.signal.throwIfAborted();
    if(typeof result.accessToken!=='string'||!result.accessToken||result.expiresAt<=this.auth.now()+60000||!result.credential?.refreshToken||result.credential.issuer!==profile.issuer||result.credential.resource!==profile.endpoint||!atlassianSetupScopes.every(scope=>result.credential.scopes?.includes(scope)))throw failure('Authorization is incomplete.');
    s.stage='account-discovery';
    const definition={transport:{type:'http',endpoint:profile.endpoint},policy:{requestTimeoutMs:30000}};
    const adapter=this.auth.transport({qualify:d=>{if(d.transport.endpoint!==profile.endpoint)throw failure('Endpoint changed.');},withToken:async(_d,consume)=>consume(result.accessToken),verify:(_d,context)=>discoverAtlassian(context),fetchFn:this.auth.fetchFn});
    const signal=AbortSignal.any([s.controller.signal,AbortSignal.timeout(90000)]),client=await adapter.connect(definition,{signal});
    let discovery;try{discovery=await client.verify({signal});}finally{await client.close();}
    s.controller.signal.throwIfAborted();s.result=result;s.discovery=discovery;
    this.update(s,{state:'review',stage:'account-review',message:'Review the signed-in account and choose the Jira site to connect.'});
    respond(200,'Atlassian authorization received. Return to Proteus to confirm your account and choose a site.');
   }catch(error){if(!s.controller.signal.aborted)fail(error);respond(400,'Setup did not complete. Return to Proteus for status.');}
   finally{res.on('finish',stopListener);setImmediate(()=>{if(res.writableFinished)stopListener();});}
  });
  s.server.headersTimeout=10000;s.server.requestTimeout=15000;
  s.timer=setTimeout(()=>{if(s.state==='complete')return;s.controller.abort();stopListener();s.result=null;s.discovery=null;this.update(s,{state:'expired',message:'Setup expired. Connect again when ready.'});},600000);s.timer.unref();
  try{
   s.stage='protected-storage';await this.auth.vault.requireAvailable();s.controller.signal.throwIfAborted();s.stage='loopback-listen';
   await new Promise((resolve,reject)=>{s.server.once('error',reject);s.server.listen(0,'127.0.0.1',resolve);});
   s.stage='oauth-start';flow=await this.auth.oauth.begin({redirectUri:'http://127.0.0.1:'+s.server.address().port+'/managed-mcp/callback',state,scopes:[...atlassianSetupScopes]});
   s.controller.signal.throwIfAborted();s.stage='browser-open';this.update(s,{state:'authorizing',message:'Approve read access in the Atlassian page, then return here.'});
   await this.auth.openExternal(flow.authorizationUrl.href);return this.status();
  }catch(error){stopListener();clearTimeout(s.timer);fail(error);throw failure(s.message);}
 }
 async confirm(args){
  if(Object.keys(args).some(key=>!['action','setupId','expectedRevision','siteId','workspaceIds','name','label','issue'].includes(key)))throw failure('Use only the returned site and current setup fields.');
  const s=this.session;if(!s||s.id!==args.setupId||s.state!=='review'||!s.result)throw failure('Refresh Atlassian setup before confirming.');
  if(s.result.expiresAt<=this.auth.now()+60000)throw failure('Authorization expired before confirmation. Cancel and connect again.');
  const site=s.discovery.sites.find(site=>site.id===args.siteId);if(!site)throw failure('Choose a site returned by this sign-in.');
  const workspaceIds=args.workspaceIds,available=new Set(this.workspaces().map(w=>w.id));
  if(!Array.isArray(workspaceIds)||!workspaceIds.length||workspaceIds.some(id=>!available.has(id)))throw failure('Choose current authorized workspaces.');
  const ownerId=this.auth.registry.ownerId,issue=typeof args.issue==='string'?args.issue.trim():'';
  const definition=validateManagedConnection({id:randomUUID(),name:args.name,label:args.label,enabled:true,ownerId,workspaceIds,transport:{type:'http',endpoint:profile.endpoint},authentication:{adapter:profile.adapter,credentialRef:s.credentialRef,credentialOwnerId:ownerId},expected:{principal:s.discovery.account.id,tenant:site.id,resource:site.url,audience:profile.endpoint,scopes:[...atlassianSetupScopes]},capabilities:['atlassian.identity.read','atlassian.resources.read',...(issue?['jira.issue.read','jira.issue.search']:[])],probes:issue?['jira-issue','jira-search'].map((id,i)=>({id,capability:i?'jira.issue.search':'jira.issue.read',parameters:{issueIdOrKey:issue}})):[],policy:{healthIntervalMs:900000,preflightLeadMs:300000,requestTimeoutMs:30000,maxReadRetries:1}});
  // Atomic revision check happens before any credential becomes runtime-usable.
  this.auth.registry.save(definition,{expectedRevision:args.expectedRevision});
  this.auth.flows.set(definition.id,{close:()=>{}});this.update(s,{state:'saving',connectionId:definition.id,stage:'account-verification'});
  try{
   await this.auth.tokens.accept(this.auth.binding(definition,s.result.credential.clientInformation.client_id),s.result);
   this.auth.setStatus(definition.id,{state:'authenticated',nextAction:issue?'Verify the selected Jira issue read and search.':'Account connected. Configure a sample Jira issue to verify issue read and search.'});
   this.update(s,{state:'complete',message:'Connection saved. Account and site verified.'});return {connectionId:definition.id};
  }catch{this.update(s,{state:'failed',message:'Configuration saved, but account verification did not finish. Review the saved connection; do not repeat setup.'});throw failure(s.message);}
  finally{clearTimeout(s.timer);s.result=null;s.discovery=null;this.auth.flows.delete(definition.id);}
 }
 cancel(id){const s=this.session;if(!s||s.id!==id)throw failure('Refresh Atlassian setup before cancelling.');if(s.state==='saving')throw failure('Wait for account verification to finish.');clearTimeout(s.timer);s.controller.abort();s.stop();s.result=null;s.discovery=null;this.update(s,{state:'cancelled',message:'Setup cancelled. No new consent was started.'});}
 close(){const s=this.session;if(s){clearTimeout(s.timer);s.controller.abort();s.stop();s.result=null;s.discovery=null;}}
}
