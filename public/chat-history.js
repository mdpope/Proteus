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
  const metadata = (incoming.eventCount || 0) >= (previous.eventCount || 0) ? incoming : previous;
  return {...metadata, ...latest, earlier:latest.eventStart, retainedHistory:pages};
}

// Presentation budget is independent of the host's transport/cache page size.
export function chatHistoryWindowStart(events, before=events.length) {
  const end=Math.min(events.length,Math.max(0,before));let start=end,bytes=0,rows=0,lastActivity=false;
  // Count collapsed activity as a single row. Tool output is mounted only on
  // expansion, so it must not consume the visible-message byte budget.
  while(start>0&&end-start<100){
    const event=events[start-1],activity=!!(event.data?.tool||event.data?.permission?.automatic);
    const cost=activity&&lastActivity?0:1,size=activity?0:new TextEncoder().encode(String(event.text||'')).length;
    if(start<end&&(rows+cost>24||bytes+size>128*1024))break;
    bytes+=size;rows+=cost;lastActivity=activity;start--;
  }
  return start;
}
