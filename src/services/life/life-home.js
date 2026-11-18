import path from 'node:path';
import {createHash} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';
import {AccountTokenVault} from '../remote/account-session.js';
import {revision} from '../scheduling/schedules.js';
import {homeEntity as project,homeServices,homeCommandShape,validateHomeCommand} from './home-catalog.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function homeOrigin(value){
 const url=new URL(value);
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw Error('Enter the Home Assistant HTTP(S) origin without credentials or a path.');
 return url.origin;
}
export class LifeHome {
 constructor(life,{home,safeStorage,fetch:fetcher=globalThis.fetch,vault}={}){
  this.life=life;this.fetch=fetcher;this.home=path.join(home,'life','home-assistant');this.file=path.join(this.home,'settings.json');
  this.vault=vault||new AccountTokenVault(this.home,safeStorage);this.lanes=new Map();
 }
 identity(accountId){const identity=this.life.api.identity();if(!identity?.accountId||accountId&&accountId!==identity.accountId)throw Error('Sign in to the Life account that owns this Home connection.');this.life.requireEnabled();return identity;}
 settings(){return readJSON(this.file,{schemaVersion:1,enabled:false,entities:[]});}
 check(binding){const identity=this.identity(binding.accountId);this.life.api.assertIdentity(binding);return identity;}
 bound(){const identity=this.identity(),settings=this.settings();if(!settings.enabled||settings.accountId!==identity.accountId)throw Error('Connect Home Assistant in Life → Smart Home on this computer.');return {identity,settings};}
 async request(origin,token,route,{method='GET',body}={}){
  let response;try{response=await this.fetch(origin+'/api/'+route,{method,redirect:'error',signal:AbortSignal.timeout(12000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
  catch{throw Error('Home Assistant is unreachable. An interrupted device command may have taken effect; refresh its state before trying another command.');}
  if(!response.ok)throw Error(response.status===401?'Home Assistant rejected its saved token. Reconnect in Life → Smart Home.':'Home Assistant could not complete the request (HTTP '+response.status+').');
  const text=await response.text();if(text.length>8_000_000)throw Error('Home Assistant response exceeded the supported size.');
  try{return JSON.parse(text);}catch{throw Error('Home Assistant returned an invalid response.');}
 }
 credential(settings){const value=this.vault.load();if(value?.accountId!==settings.accountId||value.origin!==settings.origin||typeof value.token!=='string')throw Error('Reconnect this Home Assistant account.');return value;}
 async catalog(settings,identity){
  const value=this.credential(settings);
  const [rows,services]=await Promise.all([this.request(value.origin,value.token,'states'),this.request(value.origin,value.token,'services')]);
  this.check(identity);
  if(!Array.isArray(rows))throw Error('Home Assistant returned invalid devices.');
  return {entities:rows.map(project).filter(Boolean),services:homeServices(services)};
 }
 async view({refresh=false}={}){
  const identity=this.identity(),settings=this.settings(),owned=settings.accountId===identity.accountId;
  const catalog=owned&&settings.enabled&&refresh?await this.catalog(settings,identity):{entities:[],services:[]};
  // allowed remains an all-entities compatibility projection for older clients.
  // It is never read as policy and grows automatically with HA discovery.
  return {accountId:identity.accountId,configured:owned&&settings.enabled,origin:owned?settings.origin||'':'',revision:revision(settings),controlPolicy:'all-exposed',allowed:catalog.entities.map(entity=>entity.id),...catalog};
 }
 async configure(args){
  const identity=this.identity(args.accountId),before=this.settings();if(args.expectedRevision!==revision(before))throw Error('Home connection changed. Refresh before saving.');
  const origin=homeOrigin(args.origin),token=args.token||this.credential(before).token;
  if(typeof token!=='string'||token.length<20||token.length>16000||/[\s\x00-\x1f]/.test(token))throw Error('Enter a valid Home Assistant long-lived access token.');
  if(!args.token&&(before.accountId!==identity.accountId||before.origin!==origin))throw Error('Supply a new token when changing the Home Assistant origin or Life account.');
  const rows=await this.request(origin,token,'states');this.check(identity);
  if(revision(this.settings())!==args.expectedRevision)throw Error('Home connection changed while checking it.');
  if(!Array.isArray(rows))throw Error('Home Assistant returned invalid devices.');
  this.vault.save({accountId:identity.accountId,origin,token});
  atomicJSON(this.file,{schemaVersion:2,accountId:identity.accountId,origin,enabled:true,controlPolicy:'all-exposed'});
  return this.view({refresh:true});
 }
 disconnect(args){const identity=this.identity(args.accountId),settings=this.settings();if(settings.accountId!==identity.accountId||args.expectedRevision!==revision(settings))throw Error('Home connection changed.');atomicJSON(this.file,{schemaVersion:1,enabled:false,entities:[]});this.vault.clear();return this.view();}
 async context(){try{return await this.view({refresh:true});}catch{return {entities:[],services:[]};}}
 async execute(args){
  if(!uuid.test(args.operationId||''))return Promise.reject(Error('Use a stable UUID for this device command.'));
  // Serialize effects and config observation; independent callers share one owner.
  const key=this.identity(args.accountId).accountId,previous=this.lanes.get(key)||Promise.resolve();
  const operation=previous.catch(()=>{}).then(()=>this.perform(args));this.lanes.set(key,operation);
  void operation.finally(()=>{if(this.lanes.get(key)===operation)this.lanes.delete(key);}).catch(()=>{});return operation;
 }
 async perform(args){
  const {identity,settings}=this.bound();this.identity(args.accountId);
  if(args.accountId!==identity.accountId)throw Error('View Home and supply its current accountId before controlling a device.');
  if(args.expectedRevision!==revision(settings))throw Error('Home connection changed. Refresh Smart Home before controlling a device.');
  const value=this.credential(settings),command=homeCommandShape(args);
  const digest=createHash('sha256').update(JSON.stringify([identity.accountId,settings.origin,command])).digest('hex');
  const file=path.join(this.home,'operations',identity.accountId,args.operationId+'.json'),previous=readJSON(file,null);
  const legacyDigest=command.entityIds.length===1&&command.domain===command.entityIds[0].split('.')[0]&&!Object.keys(command.data).length&&['turn_on','turn_off'].includes(command.service)?createHash('sha256').update(JSON.stringify([identity.accountId,settings.origin,command.entityIds[0],command.service])).digest('hex'):null;
  if(previous&&previous.digest!==digest&&previous.digest!==legacyDigest)throw Error('This operationId belongs to a different device command.');
  if(previous?.result)return previous.result;
  // State confirmation is available only for explicit on/off. Other HA service
  // acknowledgements mean accepted, not that a physical action has finished.
  const desired=command.service==='turn_on'?'on':command.service==='turn_off'?'off':null;
  const observe=async()=>{
   const rows=await Promise.all(command.entityIds.map(id=>this.request(value.origin,value.token,'states/'+encodeURIComponent(id))));
   this.check(identity);return rows.map(project).filter(Boolean);
  };
  const resultFor=(entities,confirmed)=>({entityId:command.entityIds.length===1?command.entityIds[0]:null,entityIds:command.entityIds,domain:command.domain,service:command.service,name:entities.map(entity=>entity.name).join(', '),state:entities.length===1?entities[0].state:null,accepted:true,confirmed,answer:confirmed?entities.map(entity=>entity.name+' is '+entity.state+'.').join(' '):'Home Assistant accepted '+command.domain+'.'+command.service+(entities.length?' for '+entities.map(entity=>entity.name).join(', '):'')+'.',at:Date.now()});
  if(!previous){
   const catalog=await this.catalog(settings,identity),service=validateHomeCommand(command,catalog);
   this.check(identity);if(revision(this.settings())!==args.expectedRevision)throw Error('Home connection changed before the command.');
   atomicJSON(file,{digest,status:'submitted',at:Date.now()});
   await this.request(value.origin,value.token,'services/'+command.domain+'/'+command.service+(service.responseRequired?'?return_response':''),{method:'POST',body:{...command.data,...(command.entityIds.length?{entity_id:command.entityIds}:{})}});
   this.check(identity);
   // Persist acknowledgement before reading state. A later observation failure
   // must not make a successful service call eligible to be sent twice.
   atomicJSON(file,{digest,status:'accepted',at:Date.now()});
  }
  if(previous?.status==='submitted'&&!desired)throw Error('The command may have taken effect, but Home Assistant did not acknowledge it. Check the device; this request will not send it again.');
  const entities=await observe();
  const confirmed=!!desired&&entities.length===command.entityIds.length&&entities.length>0&&entities.every(entity=>entity.state===desired);
  if(previous?.status==='submitted'&&!confirmed)throw Error('The requested device state is not confirmed. Refresh Home Assistant; this request will not send the command again.');
  const result=resultFor(entities,confirmed);
  atomicJSON(file,{digest,status:confirmed?'confirmed':'accepted',result});return result;
 }

 async voice(receipt,result,context){
  if(result.professional!==false||!context||context.accountId!==receipt.accountID||!result.home)throw Error('This voice request has no valid Home control context.');
  const confirmed=await this.execute({accountId:receipt.accountID,operationId:receipt.requestId,expectedRevision:context.revision,entityId:result.home.entityId,entityIds:result.home.entityIds,domain:result.home.domain,service:result.home.service,data:result.home.data ?? (result.home.dataJSON?JSON.parse(result.home.dataJSON):{})});
  return {...result,answer:confirmed.answer,savedPath:null,answeredAt:confirmed.at};
 }
}
