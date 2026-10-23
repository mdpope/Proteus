// Apply only a contiguous, owner-verified sequence. Failure leaves the previous
// full stack intact; a caller can request a fresh paged snapshot instead.
export function applyNavigationDelta(previous,response,expected){
 const delta=response.delta;
 if(!delta||delta.baseRevision!==previous.revision||response.revision!==expected.revision||response.currentEntryId!==expected.currentEntryId)throw Error('Browser navigation changed while loading history. Retry synchronization.');
 const entries=previous.entries.slice(),positions=new Map(entries.map((entry,index)=>[entry.id,index]));
 let revision=previous.revision;
 for(const change of delta.changes||[]){
  if(change.revision!==++revision||!Number.isSafeInteger(change.position)||change.position<0||change.position>entries.length||!change.entry?.id)throw Error('Browser history delta is incomplete.');
  if(change.truncate){for(const entry of entries.splice(change.position))positions.delete(entry.id);if(positions.has(change.entry.id))throw Error('Browser history contains duplicate entry identities.');entries.push(change.entry);positions.set(change.entry.id,change.position);}
  else {if(entries[change.position]?.id!==change.entry.id)throw Error('Browser history delta targets a different entry.');entries[change.position]=change.entry;}
 }
 const index=positions.get(response.currentEntryId)??-1;
 if(revision!==response.revision||entries.length!==response.total||response.total!==expected.total||index<0&&entries.length)throw Error('Browser history delta coverage is incomplete.');
 return {entries,index,currentEntryId:response.currentEntryId,revision};
}
