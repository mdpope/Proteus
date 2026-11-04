// Absolute host event positions preserve loaded history during live updates and paging.
export function mergeChatHistory(previous, incoming) {
  if (!previous || previous.id !== incoming.id) return incoming;
  const events = new Map();
  for (const page of [...(previous.retainedHistory || []), previous, incoming])
    (page.events || []).forEach((event, index) => events.set((page.eventStart || 0) + index, event));
  for(const patch of incoming.eventPatches||[])events.set(patch.index,patch.event);
  const keys = [...events.keys()].sort((a,b) => a-b), pages = [];
  for (const key of keys) {
    let page = pages.at(-1);
    if (!page || page.eventStart + page.events.length !== key) pages.push(page = {eventStart:key,events:[]});
    page.events.push(events.get(key));
  }
  const latest = pages.pop() || {eventStart:0,events:[]};
  // A field delta carries only changed metadata, and an older page may still arrive after one.
  const incomingIsCurrent=(incoming.eventCount || 0) >= (previous.eventCount || 0);
  const metadata = !incoming.fieldDelta&&!previous.fieldDelta ? (incomingIsCurrent ? incoming : previous) : incomingIsCurrent ? {...previous,...incoming} : {...incoming,...previous};
  if(incomingIsCurrent)for(const key of incoming.removedFields||[])delete metadata[key];
  // Fusion attribution arrives per history window; keep turns for every retained page.
  // Newer projections of the same turn replace older ones; the set stays bounded.
  const turns = new Map();
  for (const turn of [...(previous.fusionTurns || []), ...(incoming.fusionTurns || [])]) if (turn?.fusionId) { turns.delete(turn.fusionId); turns.set(turn.fusionId, turn); }
  const fusion = turns.size ? {fusionTurns:[...turns.values()].slice(-400)} : {};
  return {...metadata, ...fusion, ...latest, earlier:latest.eventStart, retainedHistory:pages};
}

// Presentation budget is independent of the host's transport/cache page size.
const encoder=new TextEncoder();
export function chatHistoryWindowStart(events, before=events.length) {
  const end=Math.min(events.length,Math.max(0,before));let start=end,bytes=0,rows=0,lastActivity=false;
  // Count collapsed activity as a single row. Tool output is mounted only on
  // expansion, so it must not consume the visible-message byte budget.
  while(start>0&&end-start<100){
    const event=events[start-1],activity=!!(event.data?.tool||event.data?.permission?.automatic||event.data?.activity);
    const cost=activity&&lastActivity?0:1,size=activity?0:encoder.encode(String(event.text||'')).length;
    if(start<end&&(rows+cost>24||bytes+size>128*1024))break;
    bytes+=size;rows+=cost;lastActivity=activity;start--;
  }
  return start;
}

// Index once per update instead of scanning the entire preceding transcript for
// every assistant message. A streaming reply shares its completed turn's timer.
export function firstAssistantKeys(entries,events=[]) {
  const completed=new Set(events.filter(event=>event.role==='assistant').map(event=>event.data?.turnId));
  const seen=new Set(),keys=new Set();
  for(const entry of entries){
    if(entry.role!=='assistant')continue;
    const id=entry.data?.turnId;
    if(!seen.has(id)&&(!entry.streaming||!completed.has(id)))keys.add(entry.key);
    seen.add(id);
  }
  return keys;
}
