import {createHash, randomUUID} from 'node:crypto';
// Bounded, transient cursors. A stale/foreign cursor falls back to an ordinary page.
const snapshots=new Map();
// Fields a client always needs to place a patch. The rest of a page (captured context,
// schedule and permissions, about 70 KB on a real chat) rarely changes while streaming.
const placementFields=new Set(['id','events','eventStart','eventCount','earlier','observedAt','status','updatedAt']);
const digest=value=>createHash('sha256').update(JSON.stringify(value)??'').digest('hex');
function unchangedFields(view,prior,omitUnchanged){
  const fieldHashes=Object.fromEntries(Object.keys(view).filter(key=>!placementFields.has(key)).map(key=>[key,digest(view[key])]));
  if(!omitUnchanged||!prior?.fieldHashes)return {fieldHashes,fields:view};
  const fields=Object.fromEntries(Object.entries(view).filter(([key])=>placementFields.has(key)||fieldHashes[key]!==prior.fieldHashes[key]));
  return {fieldHashes,fields,removedFields:Object.keys(prior.fieldHashes).filter(key=>!Object.hasOwn(fieldHashes,key))};
}
/** With omitUnchanged a client that merges by field receives only what changed. Every
 * cursor records field hashes, so the first push after an ordinary chat.get is small too. */
export function chatDelta(run, view, cursor, {omitUnchanged=false}={}){
  const prior=snapshots.get(cursor), hashes=view.events.map(event=>digest(event));
  const historyCursor=randomUUID(),continued=prior?.id===run.id,{fieldHashes,fields,removedFields}=unchangedFields(view,continued?prior:null,omitUnchanged);
  snapshots.set(historyCursor,{id:run.id,start:view.eventStart,hashes,fieldHashes});
  while(snapshots.size>64)snapshots.delete(snapshots.keys().next().value);
  if(!prior||prior.id!==run.id)return {...view,historyCursor};
  const eventPatches=[];
  view.events.forEach((event,index)=>{const position=view.eventStart+index;if(prior.hashes[position-prior.start]!==hashes[index])eventPatches.push({index:position,event});});
  return {...fields,events:[],eventPatches,historyCursor,...(omitUnchanged?{fieldDelta:true,...(removedFields?.length?{removedFields}:{})}:{})};
}
