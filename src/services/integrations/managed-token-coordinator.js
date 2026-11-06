import {createHash} from 'node:crypto';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function error(code,message){return Object.assign(Error(message),{code});}
function bindingKey(binding){
 if(!binding||typeof binding.ownerId!=='string'||!binding.ownerId||binding.credentialOwnerId!==binding.ownerId||typeof binding.credentialRef!=='string'||!binding.credentialRef||typeof binding.adapter!=='string'||!binding.adapter||typeof binding.issuer!=='string'||!binding.issuer||typeof binding.clientId!=='string'||!binding.clientId||!binding.expected||!['principal','tenant','audience'].every(k=>typeof binding.expected[k]==='string'&&binding.expected[k])||!Array.isArray(binding.expected.scopes)||binding.expected.scopes.some(s=>typeof s!=='string'||!s))throw error('CONFIGURATION_MISMATCH','Use a complete owner, issuer, client and expected account/audience binding.');
 return hash({ownerId:binding.ownerId,credentialRef:binding.credentialRef,issuer:binding.issuer,clientId:binding.clientId,adapter:binding.adapter,expected:{...binding.expected,scopes:[...new Set(binding.expected.scopes)].sort()}});
}
// Adapters verify identity/audience with their supported SDK/server evidence.
// Tokens never leave this host service except into its authenticated transport.
export class ManagedTokenCoordinator {
 constructor({ownerId,vault,adapters,now=()=>Date.now(),marginMs=60000}){
  this.ownerId=ownerId;this.vault=vault;this.adapters=adapters;this.now=now;this.marginMs=marginMs;
  this.pending=new Map();this.tokens=new Map();this.closed=false;
 }
 async use(binding,consume){
  if(this.closed)throw error('CLOSED','Connection authentication is closed.');
  if(binding?.ownerId!==this.ownerId)throw error('OWNER_MISMATCH','Credentials must be used on their owning computer.');
  const key=bindingKey(binding),ref=binding.credentialRef;
  let cached=this.tokens.get(key);
  if(!cached||cached.expiresAt<=this.now()+this.marginMs){
   const active=this.pending.get(ref);
   if(active&&active.key!==key)throw error('CONFIGURATION_MISMATCH','A different binding is already using this credential.');
   if(active)cached=await active.promise;
   else{
    const promise=Promise.resolve().then(()=>this.acquire(binding,key));this.pending.set(ref,{key,promise});
    try{cached=await promise;}finally{if(this.pending.get(ref)?.promise===promise)this.pending.delete(ref);}
   }
  }
  if(this.closed)throw error('CLOSED','Connection authentication is closed.');
  // Callback is a trusted transport implementation, never a tool-return handler.
  return consume(cached.accessToken);
 }
 async acquire(binding,key){
  const state=await this.vault.read(binding.credentialRef);
  if(!state||state.bindingKey!==key)throw error('SIGN_IN_REQUIRED','Sign in for this exact account and resource binding.');
  if(state.phase!=='ready')throw error('ROTATION_UNCERTAIN','A prior credential renewal did not finish durably. Review this connection before signing in again.');
  const adapter=this.adapters[binding.adapter];
  if(!adapter?.refresh)throw error('UNSUPPORTED_ADAPTER','This authentication adapter does not support managed renewal.');
  // Qualification is non-mutating and happens before rotation is marked uncertain.
  let prepared;
  try{prepared=await adapter.prepare?.({binding:structuredClone(binding),credential:structuredClone(state.credential)});}
  catch{throw error('QUALIFICATION_FAILED','Connection qualification failed before credential renewal.');}
  // Commit uncertainty before the remote operation. A crash after remote rotation
  // must not allow restart to silently reuse the previous refresh credential.
  await this.vault.write(binding.credentialRef,{...state,phase:'refreshing'});
  let result;
  try{result=await adapter.refresh({binding:structuredClone(binding),credential:structuredClone(state.credential),prepared});}
  catch{throw error('RENEWAL_FAILED','Connection renewal failed. Review authentication status before retrying.');}
  return this.acceptResult(binding,key,result,adapter);
 }
 async acceptResult(binding,key,result,adapter){
  // Keep any rotated credential durably quarantined even when identity/token
  // validation fails. It must never be issued, but must not be silently lost.
  if(result?.credential)await this.vault.write(binding.credentialRef,{bindingKey:key,phase:'unverified',credential:result.credential});
  if(adapter?.verify){
   try{result={...result,verified:await adapter.verify({binding:structuredClone(binding),result})};}
   catch{throw error('IDENTITY_MISMATCH','The renewed credential is retained but identity verification did not complete.');}
  }
  if(!result||typeof result.accessToken!=='string'||!result.accessToken||!Number.isFinite(result.expiresAt)||result.expiresAt<=this.now()+this.marginMs||!result.credential||result.verified?.principal!==binding.expected.principal||result.verified?.tenant!==binding.expected.tenant||result.verified?.audience!==binding.expected.audience||!Array.isArray(result.verified?.scopes)||!binding.expected.scopes.every(s=>result.verified.scopes.includes(s)))throw error('IDENTITY_MISMATCH','Renewal did not verify the expected account, audience and scopes.');
  await this.vault.write(binding.credentialRef,{bindingKey:key,phase:'ready',credential:result.credential});
  if(this.closed)throw error('CLOSED','Connection authentication is closed.');
  const token={accessToken:result.accessToken,expiresAt:result.expiresAt};this.tokens.set(key,token);return token;
 }
 // Initial consent/adoption follows the same persist-before-verify contract as renewal.
 // Only the owner sign-in controller may supply these secret-bearing results.
 async accept(binding,result){
  if(this.closed||binding?.ownerId!==this.ownerId)throw error('OWNER_MISMATCH','Use the credential-owning computer.');
  if(this.pending.has(binding.credentialRef))throw error('BUSY','Wait for the current credential operation.');
  const key=bindingKey(binding),adapter=this.adapters[binding.adapter];
  if(!adapter?.verify)throw error('UNSUPPORTED_ADAPTER','This adapter cannot verify owner sign-in.');
  this.tokens.delete(key);
  const promise=Promise.resolve().then(()=>this.acceptResult(binding,key,result,adapter));
  this.pending.set(binding.credentialRef,{key,promise});
  try{await promise;}finally{if(this.pending.get(binding.credentialRef)?.promise===promise)this.pending.delete(binding.credentialRef);}
 }
 // Only a validated owner sign-in/adoption flow may call this, never an agent tool.
 async adopt(binding,credential){
  if(this.closed||binding?.ownerId!==this.ownerId)throw error('OWNER_MISMATCH','Use the credential-owning computer.');
  if(this.pending.has(binding.credentialRef))throw error('BUSY','Wait for the current credential operation.');
  const key=bindingKey(binding);
  const promise=Promise.resolve().then(()=>this.vault.write(binding.credentialRef,{bindingKey:key,phase:'ready',credential}));
  this.pending.set(binding.credentialRef,{key:'adoption',promise});
  try{await promise;this.tokens.delete(key);}finally{if(this.pending.get(binding.credentialRef)?.promise===promise)this.pending.delete(binding.credentialRef);}
 }
 invalidate(binding){this.tokens.delete(bindingKey(binding));}
 close(){this.closed=true;this.tokens.clear();}
}
