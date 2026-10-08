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
