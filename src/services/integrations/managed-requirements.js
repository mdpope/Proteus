// Portable requirements contain no transport or credentials. The host resolves
// them in the captured workspace, never through a globally last-used account.
export function validateManagedRequirements(value=[]){
 if(!Array.isArray(value)||value.length>100)throw Error('Choose bounded named managed connections.');
 const names=new Set();
 for(const item of value){
  if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(k=>!['name','capabilities','required'].includes(k))||! /^[a-z][a-z0-9-]{0,63}$/.test(item.name||'')||names.has(item.name)||typeof item.required!=='boolean'||!Array.isArray(item.capabilities)||item.capabilities.length>100||item.capabilities.some(c=>typeof c!=='string'||! /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(c))||new Set(item.capabilities).size!==item.capabilities.length)throw Error('Use distinct logical names, semantic capabilities and an explicit required flag.');
  names.add(item.name);
 }
 return structuredClone(value);
}
