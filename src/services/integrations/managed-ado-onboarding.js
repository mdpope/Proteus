import {randomUUID} from 'node:crypto';
import {boundedAdoJSON} from './managed-ado-resource-identity.js';
import {adoDomains,adoFailure,safeAdoFailure} from './managed-ado-alternative-profile.js';
import {adoServerProfile} from './managed-ado-adapter.js';
import {validateManagedConnection} from './managed-connection-registry.js';
const guid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
// Enrollment has no agent route. A PAT stays in this short-lived owner session
// until reviewed; only the existing protected vault can make it durable. Tool
// families describe exposure, never proof of issuer scopes or mutation authority.
export class AdoOnboarding {
 constructor({auth,registry,workspaces,onChange=()=>{},fetchFn=fetch,now=()=>Date.now()}){Object.assign(this,{auth,registry,workspaces,onChange,fetchFn,now});this.session=null;}
 status(){const s=this.session;return s?{id:s.id,state:s.state,message:s.message,expiresAt:s.expiresAt,...(s.account?{account:s.account,organization:s.organization,projects:s.projects,projectsTruncated:s.projectsTruncated}:{}),...(s.connectionId?{connectionId:s.connectionId}:{})}:null;}
 async request(url,authorization,signal){
  let response;try{response=await this.fetchFn(url,{headers:{authorization},redirect:'manual',signal});}catch{throw adoFailure('UNAVAILABLE');}
  if(response.redirected||response.status>=300&&response.status<400){await response.body?.cancel();throw adoFailure('CONFIGURATION_MISMATCH');}
  if(!response.ok){await response.body?.cancel();throw adoFailure(response.status===401?'AUTH_REQUIRED':response.status===403?'ACCESS_DENIED':response.status===429?'RATE_LIMITED':'UNAVAILABLE');}
  return {data:await boundedAdoJSON(response),cursor:response.headers.get('x-ms-continuationtoken')};
 }
 async start({organization,email,pat,expiresAt,reminderDays=7}){
  if(this.session&&['discovering','review','saving'].includes(this.session.state))throw Error('Finish or cancel the current Azure DevOps setup first.');
  const org=String(organization||'').replace(/^https:\/\/dev\.azure\.com\//,'').replace(/\/$/,'');
  if(!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,49}$/.test(org)||typeof email!=='string'||email.length>254||! /^[^\s:@]+@[^\s:@]+$/.test(email)||typeof pat!=='string'||! /^[a-zA-Z0-9]{40,128}$/.test(pat)||!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=this.now()+90000||!Number.isInteger(reminderDays)||reminderDays<1||reminderDays>30)throw adoFailure('CONFIGURATION_MISMATCH');
  await this.auth.pat.vault.requireAvailable();
  const s={id:randomUUID(),state:'discovering',controller:new AbortController(),expiresAt:new Date(this.now()+600000).toISOString(),message:'Checking the supplied organization and signed-in PAT identity.'};this.session=s;
  s.timer=setTimeout(()=>{s.controller.abort();s.pat=null;s.email=null;s.state='expired';s.message='Setup expired. No connection was created.';this.onChange();},600000);s.timer.unref();
  try{
   const resource='https://dev.azure.com/'+org,authorization='Basic '+Buffer.from(email+':'+pat).toString('base64'),signal=AbortSignal.any([s.controller.signal,AbortSignal.timeout(30000)]);
   const {data}=await this.request(resource+'/_apis/connectionData?connectOptions=0&lastChangeId=-1&lastChangeId64=-1',authorization,signal),user=data.authenticatedUser;
   if(!guid.test(data.instanceId||'')||!guid.test(user?.id||'')||user.isActive!==true)throw adoFailure('ACCESS_DENIED');
   const projects=[];let cursor,seen=new Set();
   for(let page=0;page<10;page++){
    const result=await this.request(resource+'/_apis/projects?api-version=7.1&$top=100'+(cursor?'&continuationToken='+encodeURIComponent(cursor):''),authorization,signal);
    if(!Array.isArray(result.data.value)||result.data.value.length>100||result.data.value.some(p=>!guid.test(p.id||'')||typeof p.name!=='string'||p.name.length>512))throw adoFailure('CONFIGURATION_MISMATCH');
    projects.push(...result.data.value.map(p=>({id:p.id,name:p.name})));cursor=result.cursor;
    if(!cursor)break;if(seen.has(cursor)||cursor.length>2048)throw adoFailure('CONFIGURATION_MISMATCH');seen.add(cursor);
   }
   signal.throwIfAborted();Object.assign(s,{state:'review',account:{id:user.id,name:typeof user.providerDisplayName==='string'?user.providerDisplayName.slice(0,512):email},organization:{id:data.instanceId,name:org,url:resource},projects,projectsTruncated:!!cursor,pat,email,patExpiresAt:expiresAt,reminderDays,message:'Review the account and organization. The existing PAT determines service permissions; discovering projects does not verify writes.'});this.onChange();return this.status();
  }catch(error){clearTimeout(s.timer);s.pat=null;s.email=null;s.state='failed';s.message=safeAdoFailure(error).message;this.onChange();throw Error(s.message);}
 }
 async confirm({setupId,expectedRevision,workspaceIds,name='hc-ado-corporate',label='Azure DevOps',domains=adoDomains}){
  const s=this.session;if(!s||s.id!==setupId||s.state!=='review'||!s.pat||Date.parse(s.expiresAt)<=this.now())throw Error('Refresh Azure DevOps setup before confirming.');
  if(this.registry.read().revision!==expectedRevision)throw Error('Managed connections changed. Refresh before confirming.');
  const available=new Set(this.workspaces().map(w=>w.id));if(!Array.isArray(workspaceIds)||!workspaceIds.length||workspaceIds.some(id=>!available.has(id)))throw Error('Choose current authorized workspaces.');
  if(!Array.isArray(domains)||!domains.includes('core')||new Set(domains).size!==domains.length||domains.some(d=>!adoDomains.includes(d)))throw Error('Choose supported tool families, including project discovery.');
  const ownerId=this.registry.ownerId;
  const definition=validateManagedConnection({id:s.connectionId||randomUUID(),name,label,enabled:true,ownerId,workspaceIds,transport:{...adoServerProfile,domains:[...domains]},authentication:{adapter:'ado-pat',credentialRef:s.credentialRef||randomUUID(),credentialOwnerId:ownerId,permissionProfile:'issuer-granted',expiresAt:s.patExpiresAt,reminderDays:s.reminderDays},expected:{principal:s.account.id,tenant:s.organization.id,organizationId:s.organization.id,resource:s.organization.url,audience:'azure-devops-pat',scopes:[]},capabilities:['ado.projects.read'],probes:[{id:'ado.projects.read',capability:'ado.projects.read',parameters:{}}],policy:{healthIntervalMs:900000,preflightLeadMs:300000,requestTimeoutMs:30000,maxReadRetries:1}});
  s.state='saving';s.connectionId=definition.id;s.credentialRef=definition.authentication.credentialRef;
  try{await this.auth.pat.store(definition,{pat:s.pat,email:s.email});s.controller.signal.throwIfAborted();this.registry.save(definition,{expectedRevision});s.pat=null;s.email=null;s.state='complete';s.message='Connection saved. Verify the managed tools before use; issuer scopes and run permissions still apply.';clearTimeout(s.timer);this.onChange();return {connectionId:definition.id};}
  catch(error){s.state='review';s.message=safeAdoFailure(error).message;this.onChange();throw Error(s.message);}
 }
 cancel(id){const s=this.session;if(!s||s.id!==id)throw Error('Refresh Azure DevOps setup before cancelling.');if(s.state==='saving')throw Error('Wait for protected storage to finish.');clearTimeout(s.timer);s.controller.abort();s.pat=null;s.email=null;s.state='cancelled';this.onChange();return this.status();}
 close(){const s=this.session;if(s){clearTimeout(s.timer);s.controller.abort();s.pat=null;s.email=null;}}
}
