// Wire format for incremental owner state (`state.patch` v1). Shared by the owner
// and every JavaScript client; ios/ implements the same rules against
// test/fixtures/state-patch-vectors.json. A node is exactly one of:
//   {v:value}                     replace this value
//   {o:{key:node},d:[key]}        merge an object: recurse into o, delete d
//   {a:{ids,n:{id:value},u:{id:node}}}  array of objects with unique string ids:
//                                 ids (when present) is the complete new order
//                                 and membership; n adds items, u patches items
// Applying never mutates its input, and unchanged subtrees keep their identity.
const plainObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const unsafeKey=key=>key==='__proto__';
function idArray(value){
 if(!Array.isArray(value)||!value.length)return false;
 const seen=new Set();
 for(const item of value){
  if(!plainObject(item)||typeof item.id!=='string'||!item.id||unsafeKey(item.id)||seen.has(item.id))return false;
  seen.add(item.id);
 }
 return true;
}
const nonEmpty=value=>Object.keys(value).length>0;

/** Returns a patch node turning `before` into `after`, or undefined when equal. */
export function diffState(before,after){
 if(before===after)return undefined;
 if(plainObject(before)&&plainObject(after)){
  const beforeKeys=Object.keys(before),afterKeys=Object.keys(after);
  if(beforeKeys.some(unsafeKey)||afterKeys.some(unsafeKey))return {v:after};
  const o={},d=beforeKeys.filter(key=>!Object.hasOwn(after,key));
  for(const key of afterKeys){
   if(!Object.hasOwn(before,key)){o[key]={v:after[key]};continue;}
   const node=diffState(before[key],after[key]);if(node)o[key]=node;
  }
  if(!nonEmpty(o)&&!d.length)return undefined;
  return {...(nonEmpty(o)?{o}:{}),...(d.length?{d}:{})};
 }
 if(idArray(before)&&idArray(after)){
  const prior=new Map(before.map(item=>[item.id,item])),n={},u={};
  for(const item of after){
   if(!prior.has(item.id)){n[item.id]=item;continue;}
   const node=diffState(prior.get(item.id),item);if(node)u[item.id]=node;
  }
  const ids=after.map(item=>item.id),sameOrder=ids.length===before.length&&ids.every((id,index)=>id===before[index].id);
  if(sameOrder&&!nonEmpty(u))return undefined;
  return {a:{...(sameOrder?{}:{ids}),...(nonEmpty(n)?{n}:{}),...(nonEmpty(u)?{u}:{})}};
 }
 return JSON.stringify(before)===JSON.stringify(after)?undefined:{v:after};
}

/** Throws on a shape mismatch: the caller must resynchronize, never guess. */
export function applyStatePatch(value,node){
 if(!plainObject(node))throw new Error('Invalid state patch.');
 if(Object.hasOwn(node,'v'))return node.v;
 if(node.a){
  if(!Array.isArray(value))throw new Error('State patch does not match its baseline.');
  const added=node.a.n||{},updates=node.a.u||{},prior=new Map(value.map(item=>[item?.id,item]));
  return (node.a.ids||value.map(item=>item?.id)).map(id=>{
   if(Object.hasOwn(added,id))return added[id];
   if(!prior.has(id))throw new Error('State patch does not match its baseline.');
   return Object.hasOwn(updates,id)?applyStatePatch(prior.get(id),updates[id]):prior.get(id);
  });
 }
 if(!plainObject(value))throw new Error('State patch does not match its baseline.');
 const next={...value};
 for(const [key,child]of Object.entries(node.o||{})){
  if(unsafeKey(key))throw new Error('Invalid state patch.');
  next[key]=applyStatePatch(value[key],child);
 }
 for(const key of node.d||[])delete next[key];
 return next;
}
