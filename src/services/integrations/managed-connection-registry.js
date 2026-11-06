import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';
import {revision} from '../scheduling/schedules.js';

const id=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value);
const name=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(value);
function fields(value,allowed){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw Error('Invalid managed connection fields.');
}
function strings(values,{max=100}={}){
 if(!Array.isArray(values)||values.length>max||values.some(value=>!id(value))||new Set(values).size!==values.length)throw Error('Choose distinct explicit connection bindings.');
 return [...values];
}
function https(value){
 let url;try{url=new URL(value);}catch{throw Error('Choose an exact HTTPS connection endpoint.');}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Connection endpoints cannot contain credentials, query strings or fragments.');
 return url.href;
}
// Definitions contain only non-secret routing. Adapter-specific secrets never pass
// through this registry or its captured run binding.
export function validateManagedConnection(value){
 fields(value,['id','name','label','enabled','ownerId','workspaceIds','transport','authentication','expected','capabilities','probes','policy']);
 if(!id(value.id)||!name(value.name)||!id(value.ownerId)||typeof value.enabled!=='boolean'||typeof value.label!=='string'||!value.label.trim()||value.label.length>160||/[\x00-\x1f\x7f]/.test(value.label))throw Error('Complete the connection identity and label.');
 const workspaceIds=strings(value.workspaceIds);if(!workspaceIds.length)throw Error('Bind the connection to at least one workspace.');
 const transport=value.transport;
 if(transport?.type==='http'){
  fields(transport,['type','endpoint']);https(transport.endpoint);
 }else if(transport?.type==='stdio'){
  fields(transport,['type','package','version','integrity']);
  if(!/^(@[a-z0-9-]+\/)?[a-z0-9-]+$/.test(transport.package||'')||!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(transport.version||'')||!/^sha512-[a-zA-Z0-9+/]{86}==$/.test(transport.integrity||''))throw Error('Pin the connector package, exact version and SHA-512 integrity.');
 }else throw Error('Unsupported managed transport.');
 fields(value.authentication,['adapter','credentialRef','credentialOwnerId','clientId','cli','expiresAt','reminderDays']);
 if(value.authentication.cli!==undefined){fields(value.authentication.cli,['executable','profileDirectory','sha256','version']);for(const key of ['executable','profileDirectory','sha256','version'])if(typeof value.authentication.cli[key]!=='string'||value.authentication.cli[key].length>4096||/[\x00-\x1f\x7f]/.test(value.authentication.cli[key]))throw Error('Choose explicit nonsecret CLI paths and version pins.');}
 if(value.authentication.clientId!==undefined&&!/^[a-f0-9-]{36}$/i.test(value.authentication.clientId))throw Error('Choose an explicit public application client ID.');
 if(!id(value.authentication.adapter)||!id(value.authentication.credentialRef)||value.authentication.credentialOwnerId!==value.ownerId)throw Error('Use an opaque credential reference owned by this connection host.');
 fields(value.expected,['principal','tenant','resource','audience','scopes','organizationId','adoUserId']);
 if(value.expected.organizationId!==undefined&&!/^[a-f0-9-]{36}$/i.test(value.expected.organizationId))throw Error('Pin the expected organization ID.');
 for(const key of ['principal','tenant','resource','audience'])if(typeof value.expected[key]!=='string'||!value.expected[key]||value.expected[key].length>512||/[\x00-\x1f\x7f]/.test(value.expected[key]))throw Error('Pin expected account and resource identity.');
 if(!Array.isArray(value.expected.scopes)||value.expected.scopes.length>100||value.expected.scopes.some(s=>typeof s!=="string"||!s||s.length>512||/[\x00-\x20\x7f]/.test(s))||new Set(value.expected.scopes).size!==value.expected.scopes.length)throw Error("Choose distinct OAuth scopes.");
 strings(value.capabilities);
 if(!Array.isArray(value.probes)||value.probes.length>20)throw Error('Choose bounded named health probes.');
 for(const probe of value.probes){
  fields(probe,['id','capability','parameters']);
  if(probe.parameters!==undefined){
   fields(probe.parameters,['issueIdOrKey','projectId','teamId','workItemId']);
   for(const [key,parameter]of Object.entries(probe.parameters)){
    const valid=key==='issueIdOrKey'?typeof parameter==='string'&&/^(?:[A-Z][A-Z0-9_]{0,63}-[1-9][0-9]{0,15}|[1-9][0-9]{0,19})$/.test(parameter):key==='workItemId'?Number.isSafeInteger(parameter)&&parameter>0:typeof parameter==='string'&&/^[a-f0-9-]{36}$/i.test(parameter);
    if(!valid)throw Error('Choose exact resource identities for the approved minimal read probe.');
   }
  }
  if(!id(probe.id)||!value.capabilities.includes(probe.capability))throw Error('Bind each approved probe to a required capability.');
 }
 if(new Set(value.probes.map(p=>p.id)).size!==value.probes.length)throw Error('Probe IDs must be distinct.');
 fields(value.policy,['healthIntervalMs','preflightLeadMs','requestTimeoutMs','maxReadRetries']);
 if(!Number.isInteger(value.policy.healthIntervalMs)||value.policy.healthIntervalMs<60_000||value.policy.healthIntervalMs>86_400_000||!Number.isInteger(value.policy.preflightLeadMs)||value.policy.preflightLeadMs<0||value.policy.preflightLeadMs>3_600_000||!Number.isInteger(value.policy.requestTimeoutMs)||value.policy.requestTimeoutMs<1000||value.policy.requestTimeoutMs>120_000||!Number.isInteger(value.policy.maxReadRetries)||value.policy.maxReadRetries<0||value.policy.maxReadRetries>1)throw Error('Choose bounded connection maintenance and request limits.');
 return structuredClone(value);
}
function validateRegistry(value,ownerId){
 fields(value,['schemaVersion','connections']);
 if(value.schemaVersion!==1||!Array.isArray(value.connections)||value.connections.length>500)throw Error('Invalid managed connection registry.');
 for(const connection of value.connections){validateManagedConnection(connection);if(connection.ownerId!==ownerId)throw Error('Connection registry belongs to another owner.');}
 if(new Set(value.connections.map(c=>c.id)).size!==value.connections.length||new Set(value.connections.map(c=>c.name)).size!==value.connections.length)throw Error('Connection identities and logical names must be unique on this owner.');
 if(new Set(value.connections.map(c=>c.authentication.credentialRef)).size!==value.connections.length)throw Error('Use a distinct owner credential grant for each managed connection.');
 return value;
}
export class ManagedConnectionRegistry {
 constructor(home,{ownerId,references=()=>[]}={}){
  if(!id(ownerId))throw Error('An explicit connection owner is required.');
  this.file=path.join(home,'managed-mcp-connections.json');this.ownerId=ownerId;this.references=references;
 }
 read(){
  const value=validateRegistry(readJSON(this.file,{schemaVersion:1,connections:[]}),this.ownerId);
  return {...value,revision:revision(value)};
 }
 save(definition,{expectedRevision}={}){
  const current=this.read();if(current.revision!==expectedRevision)throw Error('Managed connections changed. Refresh before saving.');
  const input=validateManagedConnection({...definition,id:definition.id||randomUUID()});
  if(input.ownerId!==this.ownerId)throw Error('Configure connections only on their owning computer.');
  const old=current.connections.find(c=>c.id===input.id);
  if(old&&old.name!==input.name&&this.references(old.id).length)throw Error('Update dependent references before renaming this connection.');
  const next={schemaVersion:1,connections:[...current.connections.filter(c=>c.id!==input.id),input]};
  validateRegistry(next,this.ownerId);atomicJSON(this.file,next);return this.read();
 }
 remove(connectionId,{expectedRevision}={}){
  const current=this.read();if(current.revision!==expectedRevision)throw Error('Managed connections changed. Refresh before removing.');
  if(!current.connections.some(c=>c.id===connectionId))throw Error('Connection not found.');
  if(this.references(connectionId).length)throw Error('This connection is still referenced. Resolve dependent work before removing.');
  // Registry removal deliberately does not delete or revoke its credentials.
  atomicJSON(this.file,{schemaVersion:1,connections:current.connections.filter(c=>c.id!==connectionId)});return this.read();
 }
 capture({ownerId,workspaceId,names}){
  if(ownerId!==this.ownerId||!id(workspaceId))throw Error('Use the explicit owning computer and workspace.');
  strings(names);const current=this.read();
  return names.map(logicalName=>{
   const definition=current.connections.find(c=>c.name===logicalName);
   if(!definition||!definition.enabled||!definition.workspaceIds.includes(workspaceId))throw Error('Selected connection is unavailable in this workspace.');
   return {connectionId:definition.id,name:definition.name,ownerId,workspaceId,configurationRevision:revision(definition)};
  });
 }
 resolve(binding){
  fields(binding,['connectionId','name','ownerId','workspaceId','configurationRevision']);
  if(binding.ownerId!==this.ownerId)throw Error('Captured connection belongs to another computer.');
  const definition=this.read().connections.find(c=>c.id===binding.connectionId);
  if(!definition||!definition.enabled||definition.name!==binding.name||!definition.workspaceIds.includes(binding.workspaceId)||revision(definition)!==binding.configurationRevision)throw Error('Captured connection changed. Recapture explicitly before starting new work.');
  return structuredClone(definition);
 }
}
