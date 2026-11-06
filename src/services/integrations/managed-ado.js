import {ManagedAdoCli} from './managed-ado-cli.js';
import {ManagedAdoPat} from './managed-ado-pat.js';
import {adoAlternativeIds,adoFailure} from './managed-ado-alternative-profile.js';
import {revision} from '../scheduling/schedules.js';
import {ManagedAdoIdentity} from './managed-ado-identity.js';
import {managedAdoAdapter} from './managed-ado-adapter.js';
import {qualifyAdoProbes,verifyAdo} from './managed-ado-probes.js';
const fail=code=>Object.assign(Error('Review the configured ADO connection on its owning computer.'),{code});
export class ManagedAdo {
 constructor({registry,vault,openExternal,now=()=>Date.now(),onChange=()=>{},identity}){
  this.registry=registry;this.now=now;this.onChange=onChange;this.identity=identity||new ManagedAdoIdentity({ownerId:registry.ownerId,vault,openExternal,now});this.cli=new ManagedAdoCli({ownerId:registry.ownerId,now});this.pat=new ManagedAdoPat({ownerId:registry.ownerId,vault,now});this.flows=new Map();this.states=new Map();this.closed=false;
 }
 definition(id){const definition=this.registry.read().connections.find(c=>c.id===id);if(this.closed||!definition?.enabled)throw fail('CONFIGURATION_MISMATCH');return qualifyAdoProbes(definition);}
 status(id){return this.states.get(id)||{state:'unchecked'};}
 state(id,value){this.states.set(id,{...value,at:new Date(this.now()).toISOString()});this.onChange();}
 identityFor(d){return d.authentication.adapter==='ado-azure-cli'?this.cli:d.authentication.adapter==='ado-pat'?this.pat:this.identity;}
 async storePat(id,values){const d=this.definition(id),pin=revision(d);if(this.flows.has(id))throw fail('BUSY');const task=this.pat.store(d,values).then(result=>{if(revision(this.definition(id))!==pin)throw fail('CONFIGURATION_MISMATCH');this.state(id,result);return result;}).finally(()=>this.flows.delete(id));this.flows.set(id,task);return task;}
 adapter(){return managedAdoAdapter({now:this.now,identity:{use:(definition,consume)=>{if(revision(this.definition(definition.id))!==revision(definition))throw fail('CONFIGURATION_MISMATCH');return this.identityFor(definition).use(definition,consume);},invalidate:definition=>this.identityFor(definition).invalidate(definition)},verify:verifyAdo});}
 async signIn(id,{expectedRevision}={}){
  if(this.registry.read().revision!==expectedRevision)throw fail('CONFIGURATION_MISMATCH');const definition=this.definition(id),pin=revision(definition);if(this.flows.has(id))throw fail('BUSY');
  this.state(id,{state:'sign-in-in-progress'});
  const task=this.identityFor(definition).signIn(definition).then(()=>{if(revision(this.definition(id))!==pin)throw fail('CONFIGURATION_MISMATCH');this.state(id,{state:'authenticated',nextAction:'Verify required capabilities.'});}).catch(error=>{this.state(id,{state:'sign-in-required',code:error.code,nextAction:adoAlternativeIds.includes(definition.authentication.adapter)?adoFailure(error.code).message:'Review the approved public client, corporate account, consent and protected storage.'});}).finally(()=>this.flows.delete(id));this.flows.set(id,task);
  return {connectionId:id,state:'sign-in-in-progress'};
 }
 async close(){this.closed=true;this.identity.close();this.cli.close();this.pat.close();await Promise.allSettled(this.flows.values());}
}
