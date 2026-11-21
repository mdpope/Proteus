const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const stable=value=>Array.isArray(value)?value.map(stable):object(value)
 ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])) : value;
const same=(left,right)=>JSON.stringify(stable(left))===JSON.stringify(stable(right));

// Reconcile at leaf fields for plain objects. Arrays are saved in their original
// order, so overlapping edits to an array are reviewed together.
export function rebaseSchedule(base,draft,saved,choices={}){
 const conflicts=[];
 const visit=(before,ours,theirs,path=[])=>{
  if(same(ours,theirs)||same(before,theirs))return ours;
  if(same(before,ours))return theirs;
  if(object(before)&&object(ours)&&object(theirs)){
   return Object.fromEntries([...new Set([...Object.keys(before),...Object.keys(ours),...Object.keys(theirs)])]
    .map(key=>[key,visit(before[key],ours[key],theirs[key],[...path,key])]).filter(([,value])=>value!==undefined));
  }
  const key=JSON.stringify(path);
  if(choices[key]==='draft')return ours;
  if(choices[key]==='saved')return theirs;
  conflicts.push({key,label:path.join(' / '),draft:ours,saved:theirs});
  return ours;
 };
 return {value:visit(base,draft,saved),conflicts};
}
