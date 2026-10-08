import {createHash, randomUUID} from 'node:crypto';
// Bounded, transient cursors. A stale/foreign cursor falls back to an ordinary page.
const snapshots=new Map();
export function chatDelta(run, view, cursor){
  const prior=snapshots.get(cursor), hashes=view.events.map(event=>createHash('sha256').update(JSON.stringify(event)).digest('hex'));
  const historyCursor=randomUUID();
  snapshots.set(historyCursor,{id:run.id,start:view.eventStart,hashes});
  while(snapshots.size>64)snapshots.delete(snapshots.keys().next().value);
  if(!prior||prior.id!==run.id)return {...view,historyCursor};
  const eventPatches=[];
  view.events.forEach((event,index)=>{const position=view.eventStart+index;if(prior.hashes[position-prior.start]!==hashes[index])eventPatches.push({index:position,event});});
  return {...view,events:[],eventPatches,historyCursor};
}
