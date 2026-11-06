import {PublicClientApplication} from '@azure/msal-node';
import {createHash} from 'node:crypto';
import {managedEntraConsent} from './managed-entra-consent.js';

export const adoIdentityProfile=Object.freeze({adapter:'ado-entra-public-client',issuer:'https://login.microsoftonline.com',audience:'499b84ac-1321-427f-aa17-267ca6975798',scope:'499b84ac-1321-427f-aa17-267ca6975798/.default'});
const guid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=code=>Object.assign(Error('Review the corporate Azure DevOps connection on its owning computer.'),{code});
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function qualifyAdoIdentity(definition){
 const {authentication:a,expected:e}=definition;
 if(a?.adapter!==adoIdentityProfile.adapter||a.credentialOwnerId!==definition.ownerId||!guid.test(a.clientId||'')||!guid.test(e?.tenant||'')||!guid.test(e?.principal||'')||!guid.test(e?.organizationId||'')||e.audience!==adoIdentityProfile.audience||e.scopes?.length!==1||e.scopes[0]!==adoIdentityProfile.scope||!/^https:\/\/dev\.azure\.com\/[a-zA-Z0-9][a-zA-Z0-9-]{0,49}$/.test(e.resource||''))throw fail('CONFIGURATION_MISMATCH');
 return definition;
}
async function boundedJSON(response){
 if(!response.body)throw fail('UNAVAILABLE');const reader=response.body.getReader();let bytes=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2_000_000)throw fail('CONFIGURATION_MISMATCH');chunks.push(Buffer.from(value));}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
 catch{await reader.cancel().catch(()=>{});throw fail('UNAVAILABLE');}
}
const retryAfter=value=>Math.max(1000,Math.min(3600000,Number.isFinite(Number(value))?Number(value)*1000:1000));
// MSAL owns OAuth/PKCE and token-cache format. The owner supplies the documented
// cache/network interfaces: encrypted persistence before token publication, no
// browser fallback during silent acquisition, no global CLI account/cache use.
export class ManagedAdoIdentity {
 constructor({ownerId,vault,openExternal,fetchFn=fetch,now=()=>Date.now(),createClient=config=>new PublicClientApplication(config)}){
  this.ownerId=ownerId;this.vault=vault;this.openExternal=openExternal;this.fetch=fetchFn;this.now=now;this.createClient=createClient;this.pending=new Map();this.tokens=new Map();this.invalidated=new Set();this.closed=false;this.controllers=new Set();
 }
 binding(definition){
  qualifyAdoIdentity(definition);if(definition.ownerId!==this.ownerId||this.closed)throw fail('CONFIGURATION_MISMATCH');
  return {ownerId:this.ownerId,credentialOwnerId:definition.authentication.credentialOwnerId,credentialRef:definition.authentication.credentialRef,adapter:adoIdentityProfile.adapter,issuer:adoIdentityProfile.issuer,clientId:definition.authentication.clientId,expected:definition.expected};
 }
 async use(definition,consume){const result=await this.acquire(definition);if(this.closed)throw fail('UNAVAILABLE');return consume(result.accessToken,result.expiresAt);}
 invalidate(definition){const key=digest(this.binding(definition));this.tokens.delete(key);this.invalidated.add(key);}
 async signIn(definition){const {principal,tenant,resource}=await this.acquire(definition,{interactive:true});return {principal,tenant,resource,state:'authenticated'};}
 async acquire(definition,{interactive=false}={}){
  const binding=this.binding(definition),key=digest(binding),ref=binding.credentialRef;
  if(interactive&&this.pending.has(ref))throw fail('BUSY');
  if(!interactive){const token=this.tokens.get(key);if(token?.expiresAt>this.now()+90000)return token;if(this.pending.has(ref)){await this.pending.get(ref);return this.acquire(definition);}}
  const task=this.transaction(definition,binding,key,interactive);this.pending.set(ref,task);
  try{const result=await task;if(this.closed)throw fail('UNAVAILABLE');this.tokens.set(key,result);return result;}
  finally{if(this.pending.get(ref)===task)this.pending.delete(ref);}
 }
 async transaction(definition,binding,key,interactive){
  await this.vault.requireAvailable();const old=await this.vault.read(binding.credentialRef);
  if(!interactive&&(!old||old.binding!==key))throw fail('SIGN_IN_REQUIRED');
  if(!interactive&&old.phase!=='ready')throw fail('ROTATION_UNCERTAIN');
  let networkFailure;
  let cache=interactive?'':old.cache,record={schemaVersion:1,binding:key,phase:interactive?'unverified':'ready',cache},wrote=false;
  const controller=new AbortController();this.controllers.add(controller);
  const timer=setTimeout(()=>controller.abort(),interactive?600000:60000);timer.unref();
  const persist=async phase=>{record={schemaVersion:1,binding:key,phase,cache};await this.vault.write(binding.credentialRef,record);wrote=true;};
  const tenant=binding.expected.tenant,authority=adoIdentityProfile.issuer+'/'+tenant;
  const network=async(method,url,options={})=>{
   const target=new URL(url);const tokenPath='/'+tenant+'/oauth2/v2.0/token';
   if(target.origin!==adoIdentityProfile.issuer||target.username||target.password||target.hash||!(method==='POST'?target.pathname.toLowerCase()===tokenPath.toLowerCase()&&[...target.searchParams].every(([k,v])=>k==='client-request-id'&&guid.test(v)):target.pathname==='/common/discovery/instance'||target.pathname.toLowerCase()===('/'+tenant+'/v2.0/.well-known/openid-configuration').toLowerCase()))throw fail('CONFIGURATION_MISMATCH');
   if(method==='POST'){
    const form=new URLSearchParams(options.body);if(form.get('client_id')!==binding.clientId||!['authorization_code','refresh_token'].includes(form.get('grant_type'))||form.has('client_secret')||form.has('client_assertion'))throw fail('CONFIGURATION_MISMATCH');
    // A crash or rejected persistence after this point cannot reuse the previous
    // refresh grant. Recovery is explicit owner sign-in, never repeated rotation.
    await persist('refreshing');
   }
   const response=await this.fetch(target,{method,headers:options.headers,body:method==='POST'?options.body:undefined,redirect:'manual',signal:controller.signal});
   if(response.redirected||response.status>=300&&response.status<400){await response.body?.cancel();throw fail('CONFIGURATION_MISMATCH');}
   if(response.status===429){await response.body?.cancel();if(!interactive&&old?.phase==='ready'){await this.vault.write(binding.credentialRef,old);record=old;wrote=false;}throw Object.assign(fail('RATE_LIMITED'),{retryAfterMs:retryAfter(response.headers.get('retry-after'))});}
   return {status:response.status,headers:Object.fromEntries(response.headers),body:await boundedJSON(response)};
  };
  const cachePlugin={beforeCacheAccess:async context=>{if(cache)context.tokenCache.deserialize(cache);},afterCacheAccess:async context=>{if(context.cacheHasChanged){cache=context.tokenCache.serialize();if(Buffer.byteLength(cache)>4_000_000)throw fail('CONFIGURATION_MISMATCH');await persist('unverified');}}};
  const guardedNetwork=async(...args)=>{try{return await network(...args);}catch(error){networkFailure=error?.code?error:fail('UNAVAILABLE');throw networkFailure;}};
  try{
  const client=this.createClient({auth:{clientId:binding.clientId,authority,knownAuthorities:['login.microsoftonline.com']},cache:{cachePlugin},system:{disableInternalRetries:true,loggerOptions:{piiLoggingEnabled:false,loggerCallback:()=>{}},networkClient:{sendGetRequestAsync:(url,options)=>guardedNetwork('GET',url,options),sendPostRequestAsync:(url,options)=>guardedNetwork('POST',url,options)}}});
   let result;
   if(interactive){
    if(typeof this.openExternal!=='function')throw fail('UNAVAILABLE');
    result=await managedEntraConsent(client,{authority,clientId:binding.clientId,scopes:binding.expected.scopes,openExternal:this.openExternal,signal:controller.signal});
   }else{
    const accounts=await client.getTokenCache().getAllAccounts();
    const matches=accounts.filter(a=>a.localAccountId?.toLowerCase()===binding.expected.principal.toLowerCase()&&a.tenantId?.toLowerCase()===tenant.toLowerCase()&&a.environment==='login.microsoftonline.com');
    if(matches.length!==1)throw fail('SIGN_IN_REQUIRED');
    result=await client.acquireTokenSilent({account:matches[0],scopes:binding.expected.scopes,forceRefresh:this.invalidated.has(key)});
   }
   controller.signal.throwIfAborted();
   const claims=result?.idTokenClaims,account=result?.account,expiresAt=result?.expiresOn?.getTime();
   if(claims?.oid?.toLowerCase()!==binding.expected.principal.toLowerCase()||claims?.tid?.toLowerCase()!==tenant.toLowerCase()||claims?.aud!==binding.clientId||account?.localAccountId?.toLowerCase()!==binding.expected.principal.toLowerCase()||account?.tenantId?.toLowerCase()!==tenant.toLowerCase()||account?.environment!=='login.microsoftonline.com'||typeof result?.accessToken!=='string'||!result.accessToken||!Number.isFinite(expiresAt)||expiresAt<=this.now()+60000)throw fail('ACCESS_DENIED');
   // Verify the exact organization over a non-redirecting minimal request. MCP
   // capability proof remains a separate check through the actual managed server.
   const response=await this.fetch(binding.expected.resource+'/_apis/connectionData?connectOptions=0&lastChangeId=-1&lastChangeId64=-1',{headers:{authorization:'Bearer '+result.accessToken},redirect:'manual',signal:controller.signal});
   if(response.redirected||response.status>=300&&response.status<400){await response.body?.cancel();throw fail('CONFIGURATION_MISMATCH');}
   if(response.status===429){await response.body?.cancel();throw Object.assign(fail('RATE_LIMITED'),{retryAfterMs:retryAfter(response.headers.get('retry-after'))});}
   if(!response.ok){await response.body?.cancel();throw fail(response.status===401?'AUTH_REQUIRED':response.status===403?'ACCESS_DENIED':'UNAVAILABLE');}
   const identity=await boundedJSON(response);
   if(identity.instanceId?.toLowerCase()!==binding.expected.organizationId.toLowerCase()||!guid.test(identity.authenticatedUser?.id||'')||identity.authenticatedUser?.isActive!==true)throw fail('ACCESS_DENIED');
   if(!cache)throw fail('CONFIGURATION_MISMATCH');await persist('ready');this.invalidated.delete(key);
   return {accessToken:result.accessToken,expiresAt,principal:binding.expected.principal,tenant,resource:binding.expected.resource};
  }catch(error){
   if(networkFailure)error=networkFailure;
   // Cache errors and vendor messages may contain credentials. Only fixed codes
   // cross this boundary; even a valid token stays unpublished on disk failure.
   if(wrote&&record.phase==='ready')await persist('unverified').catch(()=>{});
   if(['CREDENTIAL_STORE_UNAVAILABLE','CONFIGURATION_MISMATCH','SIGN_IN_REQUIRED','ROTATION_UNCERTAIN','ACCESS_DENIED','AUTH_REQUIRED','UNAVAILABLE','RATE_LIMITED'].includes(error?.code))throw Object.assign(fail(error.code),error.retryAfterMs?{retryAfterMs:error.retryAfterMs}:{});
   throw fail(interactive?'SIGN_IN_REQUIRED':'AUTH_REQUIRED');
  }finally{clearTimeout(timer);controller.abort();this.controllers.delete(controller);}
 }
 close(){this.closed=true;this.tokens.clear();for(const controller of this.controllers)controller.abort();}
}
