import path from 'node:path';
import {createHash} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';
import {requireProtectedStorage} from './credential-storage.js';

const key=reference=>{
 if(typeof reference!=='string'||! /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(reference))throw Error('Invalid opaque credential reference.');
 return createHash('sha256').update(reference).digest('hex');
};
function unavailable(){
 const error=Error('Protected connection credentials are unavailable. Unlock the owner credential store or complete sign-in.');
 error.code='CREDENTIAL_STORE_UNAVAILABLE';return error;
}
// Electron safeStorage uses the platform protected store. The file contains only
// encrypted bytes; Linux basic_text is explicitly rejected. No model/UI read API.
export class ManagedCredentialVault {
 constructor(home,storage){this.root=path.join(home,'managed-mcp-credentials');this.storage=storage;}
 read(reference){
  try{
   requireProtectedStorage(this.storage,'read managed connection credentials');
   const envelope=readJSON(path.join(this.root,key(reference)+'.json'),null);if(!envelope)return null;
   if(envelope.schemaVersion!==1||typeof envelope.ciphertext!=='string')throw unavailable();
   return JSON.parse(this.storage.decryptString(Buffer.from(envelope.ciphertext,'base64')));
  }catch{throw unavailable();}
 }
 write(reference,value){
  try{
   requireProtectedStorage(this.storage,'save managed connection credentials');
   const encrypted=this.storage.encryptString(JSON.stringify(value));
   atomicJSON(path.join(this.root,key(reference)+'.json'),{schemaVersion:1,ciphertext:encrypted.toString('base64')});
  }catch{throw unavailable();}
 }
}
