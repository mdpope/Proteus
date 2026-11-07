import {revision} from '../scheduling/schedules.js';
import {qualifyAdoAuthentication,safeAdoFailure,adoFailure as fail} from './managed-ado-alternative-profile.js';
import {verifyAdoResource} from './managed-ado-resource-identity.js';
// Secrets enter only through the local owner form. No registry/model/token API.
export class ManagedAdoPat {
 constructor({ownerId,vault,fetchFn=fetch,now=()=>Date.now()}){Object.assign(this,{ownerId,vault,fetchFn,now});this.pending=new Map();this.checked=new Map();this.closed=false;}
 binding(d){qualifyAdoAuthentication(d);if(this.closed||d.ownerId!==this.ownerId||d.authentication.adapter!=='ado-pat')throw fail('CONFIGURATION_MISMATCH');return revision(d);}
 async store(d,values){try{return await this.storeProtected(d,values);}catch(error){throw safeAdoFailure(error);}}
 async storeProtected(d,{pat,email}){
  const binding=this.binding(d);await this.vault.requireAvailable();
  if(typeof pat!=='string'||! /^[a-zA-Z0-9]{40,128}$/.test(pat)||typeof email!=='string'||email.length>254||! /^[^\s:@]+@[^\s:@]+$/.test(email))throw fail('CONFIGURATION_MISMATCH');
  if(Date.parse(d.authentication.expiresAt)<=this.now()+90000)throw fail('PAT_EXPIRED');
  const authorization=Buffer.from(email+':'+pat).toString('base64');
  await verifyAdoResource(d,'Basic '+authorization,{fetchFn:this.fetchFn,signal:AbortSignal.timeout(d.policy.requestTimeoutMs)});
  await this.vault.write(d.authentication.credentialRef,{schemaVersion:1,binding,pat,email});this.checked.delete(binding);
  return {state:'authenticated',nextAction:'Verify the selected capabilities. PAT expiry is owner supplied; issuer revocation can occur sooner.'};
 }
 async use(d,consume){try{return await this.useProtected(d,consume);}catch(error){throw safeAdoFailure(error);}}
 async useProtected(d,consume){
  const key=this.binding(d),expiry=Date.parse(d.authentication.expiresAt);if(expiry<=this.now()+90000)throw fail('PAT_EXPIRED');await this.vault.requireAvailable();
  const record=await this.vault.read(d.authentication.credentialRef);if(!record||record.binding!==key)throw fail('PAT_REQUIRED');
  const token=Buffer.from(record.email+':'+record.pat).toString('base64');
  if((this.checked.get(key)||0)<=this.now()){
   let task=this.pending.get(key);if(!task){task=verifyAdoResource(d,'Basic '+token,{fetchFn:this.fetchFn,signal:AbortSignal.timeout(d.policy.requestTimeoutMs)}).then(()=>this.checked.set(key,this.now()+300000)).finally(()=>this.pending.delete(key));this.pending.set(key,task);}await task;
  }
  if(this.closed)throw fail('UNAVAILABLE');return consume(token,expiry);
 }
 invalidate(d){this.checked.delete(this.binding(d));}
 async signIn(){throw fail('PAT_REQUIRED');}
 close(){this.closed=true;this.checked.clear();}
}
