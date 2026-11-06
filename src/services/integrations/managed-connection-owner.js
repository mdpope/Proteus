import {AtlassianOnboarding,atlassianSetupScopes} from './managed-atlassian-onboarding.js';
import {adoAlternativeIds,adoReadScopes} from './managed-ado-alternative-profile.js';
import path from 'node:path';
import fs from 'node:fs';
const definitionSchema=JSON.parse(fs.readFileSync(new URL('../../../schemas/managed-connection.schema.json',import.meta.url),'utf8'));
import {managedWorkspace} from './managed-requirements.js';
import {atomicJSON,readJSON} from '../../shared/files.js';
import {revision} from '../scheduling/schedules.js';
import {ManagedConnectionRegistry,validateManagedConnection} from './managed-connection-registry.js';
import {ManagedCredentialVault} from './managed-credential-vault.js';
import {ManagedConnections} from './managed-connections.js';
import {ManagedAtlassian} from './managed-atlassian.js';
import {ManagedAdo} from './managed-ado.js';
import {adoIdentityProfile} from './managed-ado-identity.js';
import {adoServerProfile} from './managed-ado-adapter.js';
import {adoCapabilities,qualifyAdoProbes} from './managed-ado-probes.js';
import {atlassianOAuthProfile} from './managed-atlassian-oauth.js';
import {atlassianCapabilities,qualifyAtlassianDefinition} from './managed-atlassian-probes.js';

// One host composition boundary supplies UI, tools, schedule preflight and native
// providers. No path here approves pending run permissions or starts model turns.
export class ManagedConnectionOwner {
 constructor(service,{storage,openExternal,adapters,now=()=>Date.now(),authFactory=options=>new ManagedAtlassian(options),adoAuthFactory=options=>new ManagedAdo(options)}={}){
  this.service=service;this.now=now;this.closed=false;this.file=path.join(service.home,'managed-mcp-health.json');
  this.registry=new ManagedConnectionRegistry(service.home,{ownerId:service.remote.info().hostId,references:id=>this.references(id)});
  this.vault=new ManagedCredentialVault(service.home,storage);
  this.auth=authFactory({registry:this.registry,vault:this.vault,openExternal,now,onChange:()=>service.notify()});
  this.onboarding=new AtlassianOnboarding(this.auth,{workspaces:()=>service.context.config().workspaces,onChange:()=>service.notify()});
  this.adoAuth=adoAuthFactory({registry:this.registry,vault:this.vault,openExternal,now,onChange:()=>service.notify()});
  this.manager=new ManagedConnections({registry:this.registry,adapters:adapters||{[atlassianOAuthProfile.adapter]:this.auth.adapter(),[adoIdentityProfile.adapter]:this.adoAuth.adapter(),...Object.fromEntries(adoAlternativeIds.map(id=>[id,this.adoAuth.adapter()]))},now,
   onChange:()=>{this.persist();service.notify();},notify:event=>service.activity?.log('warning','managed-connection.attention',event.reason,{connectionId:event.connectionId,code:event.code})});
  this.events=[];
  try{
   if(fs.existsSync(this.file)&&fs.statSync(this.file).size>2000000)throw Error();
   const saved=readJSON(this.file,{schemaVersion:1,observations:[],events:[]});
   if(saved.schemaVersion!==1||!Array.isArray(saved.observations)||saved.observations.length>500||!Array.isArray(saved.events)||saved.events.length>200)throw Error();
   this.events=saved.events;
   // Last successful evidence survives restart, but no live transport does.
   for(const [key,value]of saved.observations)this.manager.observations.set(key,{...value,state:'unchecked',transport:'unchecked',authentication:'unverified',access:'unverified',checkedAt:null});
  }catch{this.storageCorrupt=true;this.storageError='Saved connection health needs inspection; current checks are independent.';}
 }
 persist(){
  if(this.storageCorrupt)return;
  const entries=[...this.manager.observations].slice(-500);
  for(const [key,value]of entries){const prior=this.events.findLast(e=>e.key===key);if(value.state==='ready'&&value.generation>0&&prior?.generation!==value.generation)this.events.push({key,generation:value.generation,at:value.checkedAt,kind:'connection-recovered'});}
  this.events=this.events.slice(-200);
  try{atomicJSON(this.file,{schemaVersion:1,observations:entries,events:this.events});this.storageError=null;}
  catch{this.storageError='Connection health could not be saved; do not treat it as durable recovery evidence.';}
 }
 references(id){
  const definition=this.registry.read().connections.find(c=>c.id===id);if(!definition)return [];
  const rows=[];
  for(const schedule of this.service.engine.schedules.list())if(schedule.managedConnections?.some(c=>c.name===definition.name))rows.push({kind:'schedule',id:schedule.id,workspaceId:schedule.context?.workspaceId||null,enabled:schedule.enabled});
  for(const run of this.service.engine.listRuns())if(run.schedule?.managedConnections?.some(c=>c.name===definition.name))rows.push({kind:'chat',id:run.id,workspaceId:run.schedule.context?.workspaceId||null,active:['running','awaiting_input','queued'].includes(run.status)});
  return rows;
 }
 authFor(definition){return [adoIdentityProfile.adapter,...adoAlternativeIds].includes(definition.authentication.adapter)?this.adoAuth:this.auth;}
 active(id){return this.auth.flows?.has(id)||this.adoAuth.flows?.has(id)||[...this.manager.leases.values()].some(lease=>lease.bindings.some(binding=>binding.connectionId===id));}
 binding(definition,workspaceId=definition.workspaceIds[0]){return this.registry.capture({ownerId:this.registry.ownerId,workspaceId,names:[definition.name]})[0];}
 row(definition){
  let status={state:definition.enabled?'unchecked':'disabled',configured:true};
  if(definition.enabled)status=this.manager.status(this.binding(definition));
  let credentialStore='available';try{this.vault.requireAvailable();}catch{credentialStore='unavailable';}
  return {...definition,status:{...status,credentialStore,ownerSignIn:this.authFor(definition).status(definition.id)},references:this.references(definition.id),active:this.active(definition.id)};
 }
 adapterCatalog(){return [...adoAlternativeIds.map(id=>({id,name:id==='ado-pat'?'Azure DevOps · Personal access token':'Azure DevOps · Corporate Azure CLI',transport:adoServerProfile,audience:id==='ado-pat'?'azure-devops-pat':adoIdentityProfile.audience,scopes:id==='ado-pat'?adoReadScopes:[adoIdentityProfile.scope],capabilities:Object.keys(adoCapabilities),signIn:id==='ado-pat'?'owner-pat-entry':'existing-cli-session',credentialStore:id==='ado-pat'?'platform-protected':'qualified-cli-cache',requires:id==='ado-pat'?'Existing organization-approved PAT: Project and Team read, Work Items read. No automatic rotation.':'Pinned Azure CLI 2.80.0 and explicit corporate profile. Windows DPAPI qualified; macOS/Linux cache isolation currently unqualified. No interactive login or account fallback.'})),{id:atlassianOAuthProfile.adapter,name:'Atlassian / Jira',endpoint:atlassianOAuthProfile.endpoint,onboarding:true,scopes:[...atlassianSetupScopes],capabilities:Object.keys(atlassianCapabilities),signIn:'owner-browser',credentialStore:'platform-protected'},{id:adoIdentityProfile.adapter,name:'Azure DevOps corporate',transport:adoServerProfile,audience:adoIdentityProfile.audience,scopes:[adoIdentityProfile.scope],capabilities:Object.keys(adoCapabilities),signIn:'owner-browser',credentialStore:'platform-protected',requires:'An organization-approved Entra public client with delegated Azure DevOps user_impersonation and native http://localhost redirect.'}];}
 contract(){return {schemaVersion:1,definitionSchema:structuredClone(definitionSchema),adapters:this.adapterCatalog(),portableRequirement:{name:'logical-name',capabilities:['semantic.capability'],required:false},scheduleWorkspaceField:'managedConnectionWorkspaceId',note:'The workspace must be captured explicitly. Supported adapters are listed by the owner. No secret or token fields are accepted.'};}
 snapshot(){
  const registry=this.registry.read();
  return {schemaVersion:1,ownerId:this.registry.ownerId,revision:registry.revision,observedAt:new Date(this.now()).toISOString(),connections:registry.connections.map(c=>this.row(c)),
   workspaces:this.service.context.config().workspaces.map(w=>({id:w.id,name:w.name})),recoveryEvents:this.events,storageError:this.storageError||null,
   adapters:this.adapterCatalog(),atlassianSetup:this.onboarding.status()};
 }
 async action(args){
  if(this.closed)throw Error('Managed connections are closed.');
  if(args.action==='schema')return this.contract();
  if(args.action==='list')return this.snapshot();
  if(args.action==='atlassian-setup-status')return this.onboarding.status();
  if(args.action==='atlassian-setup-cancel'){this.onboarding.cancel(args.setupId);return this.onboarding.status();}
  const current=this.registry.read();if(current.revision!==args.expectedRevision)throw Error('Managed connections changed. Refresh before acting.');
  if(args.action==='atlassian-setup-start')return this.onboarding.start();
  if(args.action==='atlassian-setup-confirm'){const result=await this.onboarding.confirm(args);this.service.notify();return result;}
  const definition=current.connections.find(c=>c.id===args.connectionId);
  if(args.action==='save'){
   const input=validateManagedConnection(args.definition);
   if(input?.id&&this.active(input.id))throw Error('Wait for captured connection runs to finish before editing.');
   if([adoIdentityProfile.adapter,...adoAlternativeIds].includes(input.authentication.adapter))qualifyAdoProbes(input);else qualifyAtlassianDefinition(input);
   const workspaceIds=new Set(this.service.context.config().workspaces.map(w=>w.id));if(input.workspaceIds.some(id=>!workspaceIds.has(id)))throw Error('Choose current workspaces on this owner.');
   const prior=current.connections.find(c=>c.id===input.id);if(prior?.enabled)await this.manager.disconnect(this.binding(prior));
   this.registry.save(input,{expectedRevision:args.expectedRevision});this.service.notify();return this.snapshot();
  }
  if(!definition)throw Error('Choose an existing managed connection.');
  if(args.action==='remove'||args.action==='disable'){
   if(this.active(definition.id))throw Error('Wait for captured connection runs to finish before changing this connection.');
   if(definition.enabled)await this.manager.disconnect(this.binding(definition));
   if(args.action==='remove')this.registry.remove(definition.id,{expectedRevision:args.expectedRevision});
   else this.registry.save({...definition,enabled:false},{expectedRevision:args.expectedRevision});
   this.service.notify();return this.snapshot();
  }
  if(args.action==='store-pat'){
   if(this.active(definition.id))throw Error('Wait for captured connection runs to finish before changing authentication.');
   return this.adoAuth.storePat(definition.id,{pat:args.pat,email:args.email});
  }
  if(args.action==='sign-in'){
   if(this.active(definition.id))throw Error('Wait for captured connection runs to finish before changing authentication.');
   return this.authFor(definition).signIn(definition.id,{expectedRevision:args.expectedRevision});
  }
  if(['verify','repair'].includes(args.action)){
   const binding=this.binding(definition);
   if(args.action==='repair')await this.manager.disconnect(binding);
   return this.manager.ensureReady(binding,{repair:args.action==='repair'});
  }
  throw Error('Unsupported managed connection action.');
 }
 async agent(runId,args){
  if(args.action==='schema')return this.contract();
  const run=this.service.engine.getRun(runId),workspaceId=run.schedule.managedConnections?.length?managedWorkspace(run.schedule):null,requirements=run.schedule.managedConnections||[];
  const selected=[];
  for(const requirement of requirements){
   try{
    const binding=run.schedule.managedConnectionBindings?.find(b=>b.name===requirement.name)||this.registry.capture({ownerId:this.registry.ownerId,workspaceId,names:[requirement.name]})[0];
    const definition=this.manager.definition(binding),permission=this.service.engine.permissions.decide(run.schedule,{kind:'mcp-connect',serverName:binding.name,toolName:'*',readOnly:false});
    selected.push({binding,definition,status:this.manager.status(binding),effectiveRunPermission:{connectionAllowed:permission.allowed,reason:permission.reason}});
   }catch{selected.push({name:requirement.name,state:'configuration-mismatch'});}
  }
  if(args.action==='list')return {runReadiness:structuredClone((run.managedConnectionReadiness||[]).filter(row=>requirements.some(requirement=>requirement.name===row.name))),connections:selected.map(row=>row.binding?{connectionId:row.binding.connectionId,name:row.binding.name,configurationRevision:row.binding.configurationRevision,expected:row.definition.expected,status:row.status,effectiveRunPermission:row.effectiveRunPermission}:row),recoveryEvents:this.events.filter(e=>selected.some(row=>row.binding&&e.key===row.binding.connectionId+':'+row.binding.configurationRevision))};
  const row=selected.find(row=>row.binding?.connectionId===args.connectionId);if(!row||args.expectedRevision!==row.binding.configurationRevision)throw Error('Choose a selected managed connection and its exact captured revision.');
  if(!row.effectiveRunPermission.connectionAllowed)throw Error('This run has not granted connection access. Review its own permission profile.');
  if(args.action==='repair')await this.manager.disconnect(row.binding);
  if(!['verify','repair'].includes(args.action))throw Error('Unsupported managed connection action.');
  return this.manager.ensureReady(row.binding,{repair:args.action==='repair'});
 }
 async tick(){
  if(this.closed)return;if(this.ticking)return this.ticking;
  this.ticking=(async()=>{
   const definitions=this.registry.read().connections.filter(c=>c.enabled),needed=new Set();
   for(const lease of this.manager.leases.values())for(const binding of lease.bindings)needed.add(binding.connectionId);
   const now=this.now();
   for(const schedule of this.service.engine.schedules.list())if(schedule.enabled&&!schedule.error){
    const next=Date.parse(schedule.nextRuns?.[0]);let workspaceId;try{workspaceId=managedWorkspace(schedule,{captured:false});}catch{continue;}
    for(const requirement of schedule.managedConnections||[]){const definition=definitions.find(d=>d.name===requirement.name&&d.workspaceIds.includes(workspaceId));if(definition&&next>=now&&next-now<=definition.policy.preflightLeadMs)needed.add(definition.id);}
   }
   for(const definition of definitions){if(this.closed)break;if(!needed.has(definition.id))continue;
    try{const binding=this.binding(definition),status=this.manager.status(binding);if(!status.requiredAction&&(!status.nextRetryAt||Date.parse(status.nextRetryAt)<=now))await this.manager.ensureReady(binding);}catch{/* Independent connections keep their own failure and recovery state. */}
   }
  })().catch(()=>{this.storageError='Managed connection maintenance could not inspect the current owner configuration.';}).finally(()=>{this.ticking=null;});return this.ticking;
 }
 async close(){this.closed=true;this.onboarding.close();await this.manager.close();await this.auth.close();await this.adoAuth.close();await this.ticking;}
}
