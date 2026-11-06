import test from 'node:test';
import assert from 'node:assert/strict';
import {atlassianOAuth,atlassianOAuthProfile as p} from '../src/services/integrations/managed-atlassian-oauth.js';
const binding=()=>({ownerId:'fixture-owner',credentialOwnerId:'fixture-owner',credentialRef:'opaque',adapter:p.adapter,issuer:p.issuer,clientId:'fixture-client',expected:{principal:'fixture-person',tenant:'fixture-site',audience:p.endpoint,scopes:['read:jira-work']}});
const metadata=()=>({issuer:p.issuer,authorization_endpoint:p.authorization,token_endpoint:p.token,registration_endpoint:p.registration,response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none']});
function fixture({resource,meta,status=200,redirect=false}={}){
 const calls=[];
 const oauth=atlassianOAuth({now:()=>1000,fetchFn:async(url,init)=>{
  calls.push({url:String(url),method:init.method||'GET',body:init.body,headers:init.headers});assert.equal(init.credentials,'omit');assert.equal(init.redirect,'manual');
  if(status!==200)return new Response('sensitive failure detail',{status,headers:{location:'https://untrusted.invalid','retry-after':'12'}});
  if(redirect)return new Response(null,{status:302,headers:{location:'https://untrusted.invalid'}});
  if(String(url)===p.resourceMetadata)return Response.json(resource||{resource:p.endpoint,authorization_servers:[p.issuer],scopes_supported:['read:jira-work']});
  if(String(url)===p.metadata)return Response.json(meta||metadata());
  if(String(url)===p.registration){const request=JSON.parse(init.body);return Response.json({...request,client_id:'fixture-client'});}
  if(String(url)===p.token)return Response.json({token_type:'Bearer',access_token:'synthetic-access',refresh_token:'synthetic-rotated',expires_in:3600,scope:'read:jira-work'});
  assert.fail('unexpected OAuth destination');
 }});
 return {oauth,calls};
}
test('public discovery pins the separate authv2 issuer and resource without accessing credentials',async()=>{
 const {oauth,calls}=fixture(),qualified=await oauth.qualify();
 assert.equal(qualified.resource.resource,p.endpoint);assert.deepEqual(calls.map(c=>c.url),[p.resourceMetadata,p.metadata]);
 assert.ok(calls.every(c=>!c.body));
 for(const options of [{resource:{resource:'https://mcp.atlassian.com/v1/mcp',authorization_servers:[p.issuer]}},{resource:{resource:p.endpoint,authorization_servers:['https://other.invalid']}},{meta:{...metadata(),token_endpoint:'https://other.invalid/token'}},{redirect:true}]){
  const f=fixture(options);await assert.rejects(f.oauth.qualify(),{code:'CONFIGURATION_MISMATCH'});assert.ok(f.calls.every(c=>c.method==='GET'));
 }
});
test('explicit owner consent uses public client, PKCE, state and exact resource on code exchange',async()=>{
 const {oauth,calls}=fixture(),redirectUri='http://127.0.0.1:53683/managed-mcp/callback',state='a'.repeat(64);
 const flow=await oauth.begin({redirectUri,state,scopes:['read:jira-work']});
 assert.equal(flow.authorizationUrl.origin,'https://auth.atlassian.com');
 for(const [name,value]of Object.entries({resource:p.endpoint,state,redirect_uri:redirectUri,code_challenge_method:'S256',client_id:'fixture-client'}))assert.equal(flow.authorizationUrl.searchParams.get(name),value);
 assert.ok(flow.codeVerifier.length>=43);assert.ok(!flow.authorizationUrl.toString().includes(flow.codeVerifier));
 const granted=await oauth.exchange(binding(),flow,'synthetic-code');
 assert.equal(granted.credential.refreshToken,'synthetic-rotated');assert.equal(granted.expiresAt,3601000);assert.equal(granted.accessToken,'synthetic-access');
 const token=calls.find(c=>c.url===p.token),params=new URLSearchParams(token.body);assert.equal(params.get('resource'),p.endpoint);assert.equal(params.get('code_verifier'),flow.codeVerifier);assert.equal(params.get('grant_type'),'authorization_code');
 assert.equal(calls.filter(c=>c.url===p.registration).length,1);
});
test('silent renewal uses only the qualified token endpoint and never registers or opens consent',async()=>{
 const {oauth,calls}=fixture(),credential={issuer:p.issuer,resource:p.endpoint,clientInformation:{client_id:'fixture-client',token_endpoint_auth_method:'none'},refreshToken:'synthetic-original',scopes:['read:jira-work']};
 const prepared=await oauth.prepare({binding:binding(),credential}),rotated=await oauth.refresh({binding:binding(),credential,prepared});
 assert.equal(rotated.credential.refreshToken,'synthetic-rotated');assert.equal(rotated.verified,undefined,'identity verification follows durable credential persistence in the coordinator');
 assert.equal(calls.filter(c=>c.url===p.registration).length,0);assert.equal(calls.filter(c=>c.url===p.token).length,1);
 const params=new URLSearchParams(calls.at(-1).body);assert.equal(params.get('refresh_token'),'synthetic-original');assert.equal(params.get('resource'),p.endpoint);assert.equal(params.get('client_id'),'fixture-client');
 const before=calls.length;await assert.rejects(oauth.prepare({binding:{...binding(),issuer:'https://mcp.atlassian.com'},credential}),{code:'CONFIGURATION_MISMATCH'});assert.equal(calls.length,before);
});
test('OAuth redirects, remote error text and rate limits never escape as secret-bearing diagnostics',async()=>{
 const limited=fixture({status:429});await assert.rejects(limited.oauth.qualify(),e=>e.code==='RATE_LIMITED'&&e.retryAfterMs===12000&&!e.message.includes('sensitive'));
 const denied=fixture({status:401});await assert.rejects(denied.oauth.qualify(),e=>e.code==='AUTH_REQUIRED'&&!e.message.includes('sensitive'));
 const f=fixture();await assert.rejects(f.oauth.begin({redirectUri:'https://other.invalid/managed-mcp/callback',state:'a'.repeat(64)}),{code:'CONFIGURATION_MISMATCH'});assert.equal(f.calls.length,0);
});
