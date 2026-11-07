import test from 'node:test';
import assert from 'node:assert/strict';
import {ManagedAdoIdentity,adoIdentityProfile as profile} from '../src/services/integrations/managed-ado-identity.js';
const tenant='11111111-1111-4111-8111-111111111111',principal='22222222-2222-4222-8222-222222222222',clientId='33333333-3333-4333-8333-333333333333',organizationId='44444444-4444-4444-8444-444444444444';
const definition=()=>({id:'ado',ownerId:'owner',authentication:{adapter:profile.adapter,clientId,credentialRef:'opaque',credentialOwnerId:'owner'},expected:{principal,tenant,organizationId,resource:'https://dev.azure.com/fixture',audience:profile.audience,scopes:[profile.scope]}});
function fixture(t,{wrongAccount=false,failWrite=false,failNetwork=false,locked=false,redirect=false}={}){
 const rows=new Map(),writes=[],requests=[],opened=[],stats={rotations:0,clock:0};let config,nonce;
 const account={localAccountId:principal,tenantId:tenant,environment:'login.microsoftonline.com'};
 const vault={requireAvailable:()=>{if(locked)throw Object.assign(Error('private locked details'),{code:'CREDENTIAL_STORE_UNAVAILABLE'});},read:async ref=>structuredClone(rows.get(ref)),write:async(ref,row)=>{if(failWrite&&row.phase==='unverified')throw Object.assign(Error('secret disk diagnostic'),{code:'CREDENTIAL_STORE_UNAVAILABLE'});rows.set(ref,structuredClone(row));writes.push(structuredClone(row));}};
 const tokenCache={deserialize:value=>assert.ok(value.includes('synthetic-refresh-secret')),serialize:()=>JSON.stringify({refreshToken:'synthetic-refresh-secret-'+stats.rotations}),getAllAccounts:async()=>{await config.cache.cachePlugin.beforeCacheAccess({tokenCache});return [account];}};
 const result=()=>({accessToken:'synthetic-access-secret',expiresOn:new Date(stats.clock+3600000),account,idTokenClaims:{oid:wrongAccount?organizationId:principal,tid:tenant,aud:clientId,nonce}});
 const issue=async grant=>{stats.rotations++;await config.system.networkClient.sendPostRequestAsync(profile.issuer+'/'+tenant+'/oauth2/v2.0/token',{body:new URLSearchParams({client_id:clientId,grant_type:grant}).toString()});await config.cache.cachePlugin.afterCacheAccess({tokenCache,cacheHasChanged:true});return result();};
 const createClient=value=>{config=value;return {getTokenCache:()=>tokenCache,getAuthCodeUrl:async args=>{nonce=args.nonce;return profile.issuer+'/'+tenant+'/oauth2/v2.0/authorize?'+new URLSearchParams({client_id:clientId,redirect_uri:args.redirectUri,response_mode:args.responseMode,state:args.state,nonce:args.nonce,code_challenge:args.codeChallenge});},acquireTokenByCode:()=>issue('authorization_code'),acquireTokenSilent:async args=>{assert.equal(args.account.localAccountId,principal);return issue('refresh_token');}};};
 const fetchFn=async(url,options)=>{requests.push({url:String(url),method:options.method||'GET',redirect:options.redirect});assert.equal(options.redirect,'manual');if(String(url).includes('/token')){assert.equal(rows.get('opaque').phase,'refreshing');if(stats.rateLimit)return new Response(null,{status:429,headers:{'retry-after':'60'}});if(failNetwork)throw Error('secret transport diagnostic');return Response.json({});}assert.equal(rows.get('opaque').phase,'unverified');return redirect?new Response(null,{status:302,headers:{location:'https://wrong.test'}}):Response.json({instanceId:organizationId,authenticatedUser:{id:principal,isActive:true}});};
 const openExternal=async url=>{opened.push(url);const u=new URL(url),callback=u.searchParams.get('redirect_uri');const invalid=await fetch(callback,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({state:'0'.repeat(64),code:'bad'})});assert.equal(invalid.status,400);const response=await fetch(callback,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({state:u.searchParams.get('state'),code:'synthetic-code'})});assert.equal(response.status,200);};
 const manager=new ManagedAdoIdentity({ownerId:'owner',vault,createClient,fetchFn,openExternal,now:()=>stats.clock});t.after(()=>manager.close());
 return {manager,rows,writes,requests,opened,stats,definition:definition(),vault,createClient,fetchFn,config:()=>config};
}
test('explicit consent persists protected SDK cache before account proof and exposes no token in status',async t=>{
 const f=fixture(t);const status=await f.manager.signIn(f.definition);assert.equal(status.state,'authenticated');assert.ok(!JSON.stringify(status).includes('secret'));assert.deepEqual(f.writes.map(r=>r.phase),['refreshing','unverified','ready']);assert.equal(f.opened.length,1);
 assert.equal(await f.manager.use(f.definition,t=>t.length),'synthetic-access-secret'.length);assert.equal(f.stats.rotations,1);assert.equal(f.config().system.disableInternalRetries,true);assert.equal(f.config().auth.clientId,clientId);
});
test('twenty concurrent consumers silently renew once after expiry with no additional browser opening',async t=>{
 const f=fixture(t);await f.manager.signIn(f.definition);f.stats.clock=4000000;
 const outputs=await Promise.all(Array.from({length:20},()=>f.manager.use(f.definition,t=>{assert.equal(f.rows.get('opaque').phase,'ready');return t.length;})));assert.equal(outputs.length,20);assert.equal(f.stats.rotations,2);assert.equal(f.opened.length,1);
 f.manager.invalidate(f.definition);await f.manager.use(f.definition,()=>{});assert.equal(f.stats.rotations,3);
});
test('wrong corporate principal quarantines the new cache without publishing token or retrying',async t=>{
 const f=fixture(t,{wrongAccount:true});await assert.rejects(f.manager.signIn(f.definition),{code:'ACCESS_DENIED'});assert.equal(f.rows.get('opaque').phase,'unverified');await assert.rejects(f.manager.use(f.definition,()=>assert.fail()),{code:'ROTATION_UNCERTAIN'});assert.equal(f.stats.rotations,1);
});
test('failed persistence keeps durable refresh uncertainty and never releases the result',async t=>{
 const f=fixture(t,{failWrite:true});await assert.rejects(f.manager.signIn(f.definition),e=>e.code==='CREDENTIAL_STORE_UNAVAILABLE'&&!e.message.includes('secret'));assert.equal(f.rows.get('opaque').phase,'refreshing');await assert.rejects(f.manager.use(f.definition,()=>assert.fail()),{code:'ROTATION_UNCERTAIN'});
});
test('uncertain network exchange is not replayed after a fresh owner service starts',async t=>{
 const f=fixture(t,{failNetwork:true});await assert.rejects(f.manager.signIn(f.definition),e=>!e.message.includes('secret'));const other=new ManagedAdoIdentity({ownerId:'owner',vault:f.vault,createClient:()=>assert.fail('No stale grant reuse')});t.after(()=>other.close());await assert.rejects(other.use(f.definition,()=>assert.fail()),{code:'ROTATION_UNCERTAIN'});
});
test('locked store, wrong owner and changed resource binding do not select a fallback account',async t=>{
 const locked=fixture(t,{locked:true});await assert.rejects(locked.manager.signIn(locked.definition),{code:'CREDENTIAL_STORE_UNAVAILABLE'});assert.equal(locked.opened.length,0);
 const f=fixture(t);await f.manager.signIn(f.definition);await assert.rejects(f.manager.use({...f.definition,ownerId:'other'},()=>assert.fail()),{code:'CONFIGURATION_MISMATCH'});await assert.rejects(f.manager.use({...f.definition,expected:{...f.definition.expected,resource:'https://dev.azure.com/other'}},()=>assert.fail()),{code:'SIGN_IN_REQUIRED'});assert.equal(f.stats.rotations,1);
});
test('organization redirects are rejected and no token is released',async t=>{
 const f=fixture(t,{redirect:true});await assert.rejects(f.manager.signIn(f.definition),{code:'CONFIGURATION_MISMATCH'});assert.equal(f.rows.get('opaque').phase,'unverified');assert.ok(f.requests.every(r=>!r.url.includes('wrong.test')));
});
test('token network policy rejects cross-host, wrong-tenant and confidential-client requests before persistence',async t=>{
 const f=fixture(t);await f.manager.signIn(f.definition);const n=f.config().system.networkClient,prior=f.writes.length;
 for(const url of ['https://wrong.test/token',profile.issuer+'/'+organizationId+'/oauth2/v2.0/token'])await assert.rejects(n.sendPostRequestAsync(url,{body:''}),{code:'CONFIGURATION_MISMATCH'});
 await assert.rejects(n.sendPostRequestAsync(profile.issuer+'/'+tenant+'/oauth2/v2.0/token',{body:new URLSearchParams({client_id:clientId,grant_type:'refresh_token',client_secret:'synthetic-secret'}).toString()}),{code:'CONFIGURATION_MISMATCH'});assert.equal(f.writes.length,prior);
});

test('actual MSAL SDK performs PKCE consent and protected silent renewal using injected fixture endpoints',async t=>{
 const rows=new Map(),writes=[],network=[];let authorization,now=Date.now(),rotations=0;
 const vault={requireAvailable:()=>{},read:async ref=>structuredClone(rows.get(ref)),write:async(ref,row)=>{rows.set(ref,structuredClone(row));writes.push(row.phase);}};
 const token=claims=>Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.fixture';
 const fetchFn=async(url,options={})=>{
  const u=new URL(url);network.push(u.pathname);assert.equal(options.redirect,'manual');
  if(u.pathname.includes('/openid-configuration'))return Response.json({issuer:profile.issuer+'/'+tenant+'/v2.0',authorization_endpoint:profile.issuer+'/'+tenant+'/oauth2/v2.0/authorize',token_endpoint:profile.issuer+'/'+tenant+'/oauth2/v2.0/token',end_session_endpoint:profile.issuer+'/'+tenant+'/oauth2/v2.0/logout',jwks_uri:profile.issuer+'/'+tenant+'/discovery/v2.0/keys',response_types_supported:['code'],subject_types_supported:['pairwise'],id_token_signing_alg_values_supported:['RS256']});
  if(u.pathname.endsWith('/token')){
   assert.equal(rows.get('opaque').phase,'refreshing');const fields=new URLSearchParams(options.body);assert.equal(fields.get('client_id'),clientId);rotations++;
   if(fields.get('grant_type')==='authorization_code'){assert.ok(fields.get('code_verifier'));const {createHash}=await import('node:crypto');assert.equal(createHash('sha256').update(fields.get('code_verifier')).digest('base64url'),authorization.searchParams.get('code_challenge'));}
   const issued=Math.floor(now/1000);return Response.json({token_type:'Bearer',scope:profile.scope,expires_in:3600,ext_expires_in:3600,access_token:'synthetic-msal-access',refresh_token:'synthetic-msal-refresh-'+rotations,client_info:Buffer.from(JSON.stringify({uid:principal,utid:tenant})).toString('base64url'),id_token:token({iss:profile.issuer+'/'+tenant+'/v2.0',aud:clientId,oid:principal,tid:tenant,sub:principal,preferred_username:'fixture@example.invalid',nonce:authorization.searchParams.get('nonce'),iat:issued,exp:issued+3600})});
  }
  if(u.pathname.endsWith('/connectionData')){assert.equal(options.headers.authorization,'Bearer synthetic-msal-access');return Response.json({instanceId:organizationId,authenticatedUser:{id:principal,isActive:true}});}
  assert.fail('Unexpected SDK endpoint: '+u.pathname);
 };
 const openExternal=async url=>{authorization=new URL(url);const response=await fetch(authorization.searchParams.get('redirect_uri'),{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({state:authorization.searchParams.get('state'),code:'synthetic-msal-code'})});assert.equal(response.status,200);};

 const manager=new ManagedAdoIdentity({ownerId:'owner',vault,fetchFn,openExternal,now:()=>now});t.after(()=>manager.close());
 await manager.signIn(definition());assert.equal(rotations,1);assert.equal(rows.get('opaque').phase,'ready');assert.ok(rows.get('opaque').cache.includes('synthetic-msal-refresh-1'));
 manager.invalidate(definition());await manager.use(definition(),value=>assert.equal(value,'synthetic-msal-access'));assert.equal(rotations,2);assert.equal(rows.get('opaque').phase,'ready');assert.ok(rows.get('opaque').cache.includes('synthetic-msal-refresh-2'));
 assert.deepEqual(writes.slice(-3),['refreshing','unverified','ready']);assert.ok(!network.some(p=>p.includes('/common/')));
});

test('a definitive token-service rate limit preserves the prior grant and reports the bounded retry delay',async t=>{
 const f=fixture(t);await f.manager.signIn(f.definition);f.stats.clock=4000000;f.stats.rateLimit=true;
 await assert.rejects(f.manager.use(f.definition,()=>assert.fail()),e=>e.code==='RATE_LIMITED'&&e.retryAfterMs===60000);assert.equal(f.rows.get('opaque').phase,'ready');
 f.stats.rateLimit=false;await f.manager.use(f.definition,()=>{});assert.equal(f.rows.get('opaque').phase,'ready');assert.equal(f.opened.length,1);
});
