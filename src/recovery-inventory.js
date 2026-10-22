import fs from 'node:fs';
import path from 'node:path';
import {atomicJSON} from './files.js';
import {ensurePrivateHome} from './private-paths.cjs';

// Only called for a newly created data home in a registered Windows installation.
// Existing homes require the operator's all-root inventory; never infer it is empty.
export function initializeFreshRecovery(file,{home,installation}){
 const root=path.dirname(file),parent=path.dirname(root);
 ensurePrivateHome(parent);
 for(const entry of fs.readdirSync(parent,{withFileTypes:true})){
  if(!entry.isDirectory()||entry.isSymbolicLink())throw Error('The existing update inventory needs inspection.');
  const directory=path.join(parent,entry.name),policy=path.join(directory,'recovery-policy.json');
  if(fs.existsSync(policy)){
   const value=JSON.parse(fs.readFileSync(policy,'utf8'));
   if(value.home===home||value.installation===installation)throw Error('Existing recovery generations require an operator inventory before updating.');
  }else if(fs.readdirSync(directory).length)throw Error('An unrecorded update directory requires an operator inventory before updating.');
 }
 ensurePrivateHome(root);
 atomicJSON(file,{schemaVersion:1,home,installation,auditedAt:new Date().toISOString(),audit:{kind:'new-windows-data-home',roots:[parent]},generations:[]});
}
