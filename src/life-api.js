import fs from 'node:fs';
import { requireProtectedStorage } from './credential-storage.js';
import path from 'node:path';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
export const LIFE_CALLBACK = 'proteus://life-oauth/callback';
export const DESKTOP_LIFE_CALLBACK = 'proteus-desktop://life-oauth/callback';
export function lifeOrigin(value) {
 const url=new URL(String(value||'').trim());
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw new Error('Enter an HTTPS website origin without a path or account details.');
 return url.origin;
}
export class LifeTokenVault {
 constructor(home,safeStorage){this.file=path.join(home,'life','website-session.enc');this.safeStorage=safeStorage;}
 available(){requireProtectedStorage(this.safeStorage, 'sign in to Life');}
 exists(){return fs.existsSync(this.file);}
 load(){
  // Signed-out startup must not unlock the credential store just to discover
  // that no session exists. Existing encrypted files still fail closed.
  try{if(fs.statSync(this.file).size>64000)throw new Error();}
  catch(e){if(e.code==='ENOENT')return null;throw new Error('Life sign-in could not be read securely. Its protected file was preserved.');}
  this.available();
  try{return JSON.parse(this.safeStorage.decryptString(fs.readFileSync(this.file)));}
  catch(e){if(e.code==='ENOENT')return null;throw new Error('Life sign-in could not be read securely. Its protected file was preserved.');}
 }
 save(value){this.available();fs.mkdirSync(path.dirname(this.file),{recursive:true,mode:0o700});const temp=this.file+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(temp,this.safeStorage.encryptString(JSON.stringify(value)),{flag:'wx',mode:0o600});fs.renameSync(temp,this.file);}finally{fs.rmSync(temp,{force:true});}}
 clear(){fs.rmSync(this.file,{force:true});}
}
class LifeHTTPError extends Error {constructor(status,message){super(message);this.status=status;}}
export class LifeAPI {
 constructor({vault,fetch:fetcher=globalThis.fetch,openExternal,callbackURL=LIFE_CALLBACK,client,onChange=()=>{},timeout=20000}={}){this.callbackURL=callbackURL;this.client=client;this.vault=vault;this.fetch=fetcher;this.openExternal=openExternal;this.onChange=onChange;this.timeout=timeout;this.credential=null;this.profile=null;this.loaded=false;this.generation=0;this.authAttempt=0;this.pending=null;this.refreshing=null;this.closing=false;this.controllers=new Set();this.error=null;this.notice=null;}
 load(){if(this.loaded)return;const c=this.vault?.load();if(c){if(lifeOrigin(c.origin)!==c.origin||!c.clientId||!c.accessToken||!c.refreshToken||!/^[a-f0-9]{64}$/.test(c.accountId)||!c.workspaceId||!Number.isFinite(c.expiresAt))throw new Error('Saved Life sign-in is invalid. Sign out before trying again.');this.credential=c;}this.loaded=true;}
 identity(){const c=this.credential;return c?{accountId:c.accountId,workspaceId:c.workspaceId,origin:c.origin,sessionId:String(this.generation)}:null;}
 changed(){this.onChange();}
 cancel(){this.authAttempt++;this.pending=null;this.changed();}
 invalidate(){this.generation++;this.authAttempt++;for(const c of this.controllers)c.abort();this.controllers.clear();this.pending=null;this.profile=null;}
 clear(){this.invalidate();this.credential=null;this.vault?.clear();this.loaded=true;this.changed();}
 async raw(origin,endpoint,{method='GET',body,form,token,binary=false}={}){
  const controller=new AbortController();this.controllers.add(controller);const timer=setTimeout(()=>controller.abort(),this.timeout);
  try{
   const headers={Accept:binary?'application/octet-stream':'application/json'};if(token)headers.Authorization='Bearer '+token;
   if(body!==undefined)headers['Content-Type']='application/json';if(form)headers['Content-Type']='application/x-www-form-urlencoded';
   const response=await this.fetch(origin+endpoint,{method,headers,body:form?new URLSearchParams(form):body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:controller.signal});
   const max=binary?20*1024*1024:30*1024*1024;let size=0;const parts=[];
   for await(const chunk of response.body||[]){size+=chunk.length;if(size>max){controller.abort();throw new Error('Life response exceeds the supported size.');}parts.push(Buffer.from(chunk));}
   const bytes=Buffer.concat(parts);let value=null;if(!binary)try{value=JSON.parse(bytes.toString('utf8'));}catch{}
   if(!response.ok){const message=response.status===401?'Life sign-in expired or was revoked.':response.status===403?'Your website account does not allow this action.':response.status===409?'Life records or account changed. Refresh before saving.':response.status===429?'The website is busy. Wait briefly before retrying.':response.status>=500?'Life website could not complete the request.':String(value?.message||'Website request failed.').slice(0,250);throw new LifeHTTPError(response.status,message);}
   if(binary)return {bytes,headers:response.headers};if(!value||typeof value!=='object')throw new Error('Website returned an invalid Life response.');return value;
  }catch(e){if(e instanceof LifeHTTPError)throw e;if(e.name==='AbortError'||e.name==='TimeoutError')throw new Error('Life request timed out or the account changed.');if(e instanceof TypeError)throw new Error('Life website is unreachable. Reconnect before saving changes.');throw e;}finally{clearTimeout(timer);this.controllers.delete(controller);}
 }
 async begin(origin,{extend=false}={}){
  if(this.closing)throw new Error('Life is closing.');this.load();this.vault.available();if(this.credential&&!extend)throw new Error('Sign out of the current Life account before changing accounts.');if(extend&&this.credential&&lifeOrigin(origin)!==this.credential.origin)throw new Error('Keep the current website account when extending permissions.');
  const attempt=++this.authAttempt,epoch=this.generation;this.pending=null;
  origin=lifeOrigin(origin);const discovery=await this.raw(origin,'/api/v1/native-config'+(this.client?'?client='+encodeURIComponent(this.client):''));
  if(attempt!==this.authAttempt||epoch!==this.generation||this.closing||(this.credential&&!extend))throw new Error('Life sign-in was cancelled or the account changed.');
  if(!discovery.enabled||discovery.protocol!==1||discovery.issuer!==origin||discovery.redirectUri!==this.callbackURL||!discovery.clientId||discovery.authorizationEndpoint!==origin+'/oauth/authorize'||discovery.tokenEndpoint!==origin+'/oauth/token'||discovery.apiBase!==origin+'/api/v1/life')throw new Error('Native Life sign-in is not configured correctly on this website.');
  if(!this.openExternal)throw new Error('Open Life sign-in in the desktop app.');
  const verifier=randomBytes(48).toString('base64url'),state=randomBytes(32).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');
  const scopes = ['brain:read','brain:write', ...(discovery.appApiBase === origin+'/api/v1/app' && Array.isArray(discovery.appScopes) ? discovery.appScopes.filter(s => ['app:read','app:write'].includes(s)) : [])];
  const pending={origin,clientId:discovery.clientId,scopes,expectedAccountId:extend?this.credential?.accountId:null,verifier,state,expires:Date.now()+10*60*1000,generation:this.generation,attempt};this.pending=pending;this.error=null;this.notice=null;
  const url=new URL(origin+'/oauth/authorize');url.search=new URLSearchParams({response_type:'code',client_id:discovery.clientId,redirect_uri:this.callbackURL,scope:scopes.join(' '),state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
  try{await this.openExternal(url.href);}catch{if(this.pending===pending)this.pending=null;throw new Error('Could not open the preferred sign-in browser.');}if(attempt!==this.authAttempt||epoch!==this.generation||this.pending!==pending)throw new Error('Life sign-in was cancelled.');this.changed();
 }
 async callback(value){
  const pending=this.pending;
  try{
   const url=new URL(value),q=url.searchParams;
   if(url.protocol!==new URL(this.callbackURL).protocol||url.hostname!==new URL(this.callbackURL).hostname||url.pathname!==new URL(this.callbackURL).pathname||url.username||url.password||url.port||url.hash||!pending||pending.expires<Date.now()||pending.generation!==this.generation||pending.attempt!==this.authAttempt||q.getAll('state').length!==1||q.get('state')!==pending.state)throw new Error('Life sign-in callback did not match the pending request. Start again.');
   this.pending=null;
   if(q.has('error')||q.getAll('code').length!==1||!q.get('code'))throw new Error('Life sign-in was not authorized.');
   const token=await this.raw(pending.origin,'/oauth/token',{method:'POST',form:{grant_type:'authorization_code',client_id:pending.clientId,redirect_uri:this.callbackURL,code_verifier:pending.verifier,code:q.get('code')}});
   if(pending.generation!==this.generation||pending.attempt!==this.authAttempt||this.closing)throw new Error('Life sign-in was cancelled.');
   const next=this.token(pending,token),profile=await this.raw(pending.origin,'/api/v1/life',{token:next.accessToken});
   if(pending.generation!==this.generation||pending.attempt!==this.authAttempt||this.closing)throw new Error('Life account changed during sign-in.');
   if(!/^[a-f0-9]{64}$/.test(profile.accountId)||!String(profile.workspaceId||''))throw new Error('Website returned no valid Life account identity.');
   if(pending.expectedAccountId&&pending.expectedAccountId!==profile.accountId)throw new Error('Authorize the same website account; your previous sign-in was preserved.');
   Object.assign(next,{accountId:profile.accountId,workspaceId:String(profile.workspaceId)});this.vault.save(next);this.invalidate();this.credential=next;this.profile=profile;this.error=null;this.notice='Website account connected.';this.changed();return true;
  }catch(e){if(pending?.attempt===this.authAttempt){this.error=e.message;this.changed();}throw e;}
 }
 token(current,value){if(!value.access_token||!value.refresh_token||String(value.token_type||'').toLowerCase()!=='bearer'||!Number.isFinite(value.expires_in)||value.expires_in<=0)throw new Error('Website returned an incomplete Life session.');return {...current,accessToken:value.access_token,refreshToken:value.refresh_token,expiresAt:Date.now()+value.expires_in*1000,verifier:undefined,state:undefined,expires:undefined,generation:undefined,attempt:undefined};}
 async refreshToken(failedToken){
  if(failedToken&&this.credential?.accessToken!==failedToken)return;if(this.refreshing)return this.refreshing;
  const current=this.credential,epoch=this.generation;if(!current||this.closing)throw new Error('Sign in to Life first.');
  this.refreshing=(async()=>{try{const value=await this.raw(current.origin,'/oauth/token',{method:'POST',form:{grant_type:'refresh_token',client_id:current.clientId,refresh_token:current.refreshToken}});if(epoch!==this.generation)throw new Error('Life account changed.');const next=this.token(current,value);this.vault.save(next);this.credential=next;}catch(e){if([400,401,403].includes(e.status)&&epoch===this.generation)this.clear();throw e;}})();
  try{await this.refreshing;}finally{this.refreshing=null;}
 }
 async authorized(endpoint,options={}){
  this.load();const epoch=this.generation;let current=this.credential;if(!current||this.closing)throw new Error('Sign in to the Life website first.');
  if(current.expiresAt-Date.now()<60000)await this.refreshToken();if(epoch!==this.generation||this.closing)throw new Error('Life account changed.');current=this.credential;
  const request=async credential=>{const value=await this.raw(credential.origin,endpoint,{...options,token:credential.accessToken});if(epoch!==this.generation||this.closing)throw new Error('Life account changed.');return value;};
  try{return await request(current);}catch(e){if(e.status!==401)throw e;if(epoch!==this.generation||this.closing)throw new Error('Life account changed.');await this.refreshToken(current.accessToken);if(epoch!==this.generation||this.closing)throw new Error('Life account changed.');const next=this.credential;try{return await request(next);}catch(second){if(second.status===401&&epoch===this.generation&&this.credential?.accessToken===next.accessToken)this.clear();throw second;}}
 }
 verify(value){if(!this.credential||value.accountId!==this.credential.accountId||String(value.workspaceId)!==this.credential.workspaceId){this.clear();throw new Error('Life account or workspace changed. Sign in again before continuing.');}return value;}
 assertIdentity(expected){const actual=this.identity();if(!actual||!expected||expected.accountId!==actual.accountId||String(expected.workspaceId)!==actual.workspaceId||expected.origin!==actual.origin||expected.sessionId!==actual.sessionId)throw new Error('This Life view belongs to an earlier account session. Refresh before saving.');}
 async refresh(){try{this.profile=this.verify(await this.authorized('/api/v1/life'));this.error=null;}catch(e){this.error=e.message;this.changed();throw e;}this.changed();return this.profile;}
 async data(section,query){const value=this.verify(await this.authorized('/api/v1/life/data',{method:'POST',body:{section,query}}));this.profile={...this.profile,...Object.fromEntries(['accountId','workspaceId','displayName','capabilities','readOnly','sections'].map(k=>[k,value[k]]))};return {...value,identity:this.identity()};}
 async action(action,input,idempotencyKey,expected){this.assertIdentity(expected);const profile=await this.refresh();this.assertIdentity(expected);if(profile.readOnly)throw new Error('This website account is read-only.');const value=await this.authorized('/api/v1/life/action',{method:'POST',body:{action,input,idempotencyKey,expectedAccountId:expected.accountId,expectedWorkspaceId:expected.workspaceId}});return this.verify(value);}
 async evidence(id,expected){this.assertIdentity(expected);await this.refresh();this.assertIdentity(expected);if(!/^[1-9][0-9]*$/.test(String(id)))throw new Error('Choose valid evidence.');const {bytes,headers}=await this.authorized('/api/v1/life/evidence/'+id,{binary:true});let mime='application/octet-stream';if(bytes.subarray(0,5).toString()==='%PDF-')mime='application/pdf';else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';else if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')mime='image/webp';let name='original-'+id;const disposition=headers.get('content-disposition')||'',match=disposition.match(/filename="([^"]+)"/);if(match)name=path.basename(match[1]).slice(0,255);return {name,mimeType:mime,base64:bytes.toString('base64'),identity:this.identity()};}
 async logout(){if(this.closing)throw new Error('Life is closing.');let unreadable=false;try{this.load();}catch{unreadable=true;}this.closing=true;this.cancel();try{if(this.refreshing)await this.refreshing.catch(()=>{});const current=this.credential;this.clear();if(unreadable)this.notice='Signed out locally. The protected session could not be read; website revocation could not be confirmed.';if(current)try{await this.raw(current.origin,'/api/v1/native-session',{method:'DELETE',token:current.accessToken});this.notice='Signed out. This website session was revoked.';}catch{this.notice='Signed out locally. Website revocation could not be confirmed; review website connections.';}}finally{this.closing=false;this.changed();}}
 close(){this.closing=true;this.invalidate();}
}
