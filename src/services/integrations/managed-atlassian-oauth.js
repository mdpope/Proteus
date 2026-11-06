import {discoverOAuthProtectedResourceMetadata,discoverAuthorizationServerMetadata,registerClient,startAuthorization,exchangeAuthorization,refreshAuthorization} from '@modelcontextprotocol/sdk/client/auth.js';

// This qualified route deliberately excludes the older /v1/mcp issuer and its
// credentials. An endpoint/client change requires an explicit owner migration.
export const atlassianOAuthProfile=Object.freeze({
 adapter:'atlassian-oauth-v2',endpoint:'https://mcp.atlassian.com/v1/mcp/authv2',
 resourceMetadata:'https://mcp.atlassian.com/.well-known/oauth-protected-resource/v1/mcp/authv2',
 issuer:'https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3',
 metadata:'https://auth.atlassian.com/.well-known/oauth-authorization-server/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3',
 authorization:'https://auth.atlassian.com/authorize',token:'https://auth.atlassian.com/oauth/token',
 registration:'https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3/dcr/register'
});
const failure=code=>Object.assign(Error('Managed Atlassian authorization requires review on its owning computer.'),{code});
const scopes=value=>typeof value==='string'?value.split(' ').filter(Boolean):[];
function publicClient(value){
 if(!value||typeof value.client_id!=='string'||!value.client_id||value.client_id.length>512||value.client_secret||value.token_endpoint_auth_method!=='none')throw failure('CONFIGURATION_MISMATCH');
 return value;
}
export function validateAtlassianBinding(binding){
 if(binding?.adapter!==atlassianOAuthProfile.adapter||binding.issuer!==atlassianOAuthProfile.issuer||binding.expected?.audience!==atlassianOAuthProfile.endpoint||binding.ownerId!==binding.credentialOwnerId)throw failure('CONFIGURATION_MISMATCH');
}
// Every network destination is pinned, including discovery. No credential-bearing
// redirect, alternate issuer, account fallback or automatic client registration.
export function atlassianOAuth({fetchFn=fetch,now=()=>Date.now(),timeoutMs=30000}={}){
 const profile=atlassianOAuthProfile;
 const request=async(input,init={})=>{
  const url=new URL(input instanceof Request?input.url:String(input)),method=init.method||'GET';
  const allowed=method==='GET'?[profile.resourceMetadata,profile.metadata]:method==='POST'?[profile.token,profile.registration]:[];
  if(!allowed.includes(url.href))throw failure('CONFIGURATION_MISMATCH');
  const signal=AbortSignal.any([AbortSignal.timeout(timeoutMs),...(init.signal?[init.signal]:[])]);
  let response;
  try{response=await fetchFn(url,{...init,signal,credentials:'omit',redirect:'manual',referrerPolicy:'no-referrer'});}
  catch{throw failure('UNAVAILABLE');}
  if(response.redirected||response.status>=300&&response.status<400){await response.body?.cancel();throw failure('CONFIGURATION_MISMATCH');}
  if(response.status===429){await response.body?.cancel();const raw=response.headers.get('retry-after'),seconds=Number(raw),date=Date.parse(raw);throw Object.assign(failure('RATE_LIMITED'),{retryAfterMs:Math.max(1000,Math.min(3600000,Number.isFinite(seconds)?seconds*1000:Number.isFinite(date)?date-now():1000))});}
  // Keep SDK error bodies private as well as bounded. Callers receive fixed codes.
  const chunks=[];let bytes=0;
  for await(const chunk of response.body||[]){bytes+=chunk.length;if(bytes>65536)throw failure('CONFIGURATION_MISMATCH');chunks.push(chunk);}
  return new Response(chunks.length?Buffer.concat(chunks):null,{status:response.status,headers:response.headers});
 };
 const guarded=async work=>{try{return await work();}catch(error){if(['CONFIGURATION_MISMATCH','UNAVAILABLE','RATE_LIMITED'].includes(error?.code))throw error;throw failure('AUTH_REQUIRED');}};
 const qualify=async()=>guarded(async()=>{
  const resource=await discoverOAuthProtectedResourceMetadata(new URL(profile.endpoint),{resourceMetadataUrl:new URL(profile.resourceMetadata)},request);
  if(resource.resource!==profile.endpoint||resource.authorization_servers?.length!==1||resource.authorization_servers[0]!==profile.issuer)throw failure('CONFIGURATION_MISMATCH');
  const metadata=await discoverAuthorizationServerMetadata(new URL(profile.issuer),{fetchFn:request});
  if(!metadata||metadata.issuer!==profile.issuer||metadata.authorization_endpoint!==profile.authorization||metadata.token_endpoint!==profile.token||metadata.registration_endpoint!==profile.registration||!metadata.code_challenge_methods_supported?.includes('S256')||!metadata.token_endpoint_auth_methods_supported?.includes('none')||!metadata.response_types_supported?.includes('code')||!metadata.grant_types_supported?.includes('refresh_token'))throw failure('CONFIGURATION_MISMATCH');
  return {metadata,resource,qualifiedAt:new Date(now()).toISOString()};
 });
 const credential=(binding,value)=>{
  validateAtlassianBinding(binding);
  if(value?.issuer!==profile.issuer||value.resource!==profile.endpoint||publicClient(value.clientInformation).client_id!==binding.clientId||typeof value.refreshToken!=='string'||!value.refreshToken||value.refreshToken.length>32768||!Array.isArray(value.scopes)||!binding.expected.scopes.every(scope=>value.scopes.includes(scope)))throw failure('CONFIGURATION_MISMATCH');
  return value;
 };
 const result=(binding,tokens,previous)=>{
  // Preserve the rotated grant even if the remaining token fields fail later.
  const granted=tokens.scope===undefined?previous.scopes:scopes(tokens.scope);
  return {accessToken:tokens.token_type?.toLowerCase()==='bearer'?tokens.access_token:null,
   expiresAt:Number.isFinite(tokens.expires_in)?now()+tokens.expires_in*1000:0,
   credential:{issuer:profile.issuer,resource:profile.endpoint,clientInformation:previous.clientInformation,refreshToken:tokens.refresh_token,scopes:granted}};
 };
 return {
  qualify,
  // Owner UI calls these only after explicit sign-in, never from maintenance.
  begin:async({redirectUri,state,scopes:requested=[]})=>guarded(async()=>{
   const redirect=new URL(redirectUri);
   if(redirect.protocol!=='http:'||redirect.hostname!=='127.0.0.1'||!redirect.port||redirect.pathname!=='/managed-mcp/callback'||redirect.search||redirect.hash||redirect.username||redirect.password||typeof state!=='string'||! /^[a-f0-9]{64}$/.test(state)||!Array.isArray(requested)||requested.length>100||requested.some(s=>typeof s!=='string'||!s||s.length>512||/[\s\x00-\x1f]/.test(s)))throw failure('CONFIGURATION_MISMATCH');
   const {metadata}=await qualify();
   const clientInformation=publicClient(await registerClient(new URL(profile.issuer),{metadata,clientMetadata:{client_name:'Proteus managed connections',redirect_uris:[redirect.href],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']},scope:requested.join(' '),fetchFn:request}));
   const started=await startAuthorization(new URL(profile.issuer),{metadata,clientInformation,redirectUrl:new URL(redirectUri),scope:requested.join(' '),state,resource:new URL(profile.endpoint)});
   return {...started,clientInformation,metadata,redirectUri,scopes:[...requested]};
  }),
  exchange:async(binding,flow,code)=>guarded(async()=>{
   validateAtlassianBinding(binding);const clientInformation=publicClient(flow.clientInformation);
   if(clientInformation.client_id!==binding.clientId||typeof code!=='string'||!code||code.length>8192)throw failure('CONFIGURATION_MISMATCH');
   const {metadata}=await qualify();
   const tokens=await exchangeAuthorization(new URL(profile.issuer),{metadata,clientInformation,authorizationCode:code,codeVerifier:flow.codeVerifier,redirectUri:flow.redirectUri,resource:new URL(profile.endpoint),fetchFn:request});
   return result(binding,tokens,flow);
  }),
  prepare:async({binding,credential:value})=>{credential(binding,value);return qualify();},
  refresh:async({binding,credential:value,prepared})=>guarded(async()=>{
   credential(binding,value);if(!prepared?.metadata)throw failure('CONFIGURATION_MISMATCH');
   const tokens=await refreshAuthorization(new URL(profile.issuer),{metadata:prepared.metadata,clientInformation:value.clientInformation,refreshToken:value.refreshToken,resource:new URL(profile.endpoint),fetchFn:request});
   return result(binding,tokens,value);
  })
 };
}
