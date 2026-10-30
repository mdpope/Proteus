import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJSON,readJSON} from '../../shared/files.js';

// Incoming device grants and outgoing desktop credentials are separate. Managed
// mode closes only outgoing authority; task results return over the controller's
// existing incoming connection and never require a reciprocal pairing.
export class ComputerAccess extends EventEmitter{
 constructor(home){
  super();this.file=path.join(home,'computer-access.json');
  try{const stat=fs.lstatSync(this.file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)throw Error('Invalid computer access policy file. Original record preserved.');}catch(error){if(error.code!=='ENOENT')throw error;}
  this.value=readJSON(this.file,{schemaVersion:1,revision:randomUUID(),managed:false});
  if(this.value.schemaVersion!==1||typeof this.value.managed!=='boolean'||!/^[a-f0-9-]{36}$/i.test(this.value.revision||''))throw Error('Invalid computer access policy. The original record was preserved.');
 }
 get(){return {schemaVersion:1,revision:this.value.revision,managed:this.value.managed,outgoingAllowed:!this.value.managed};}
 assertOutgoing(){if(this.value.managed)throw Error('Outgoing computer access is disabled in managed-computer mode. Incoming management and originating task feedback remain available.');}
 set({managed,expectedRevision}){
  if(typeof managed!=='boolean')throw Error('Choose whether this is a managed computer.');
  if(expectedRevision!==this.value.revision)throw Error('Computer access changed. Refresh before saving.');
  if(managed===this.value.managed)return this.get();
  const next={...this.value,managed,revision:randomUUID()};atomicJSON(this.file,next);this.value=next;
  this.emit('change',this.get());return this.get();
 }
}
