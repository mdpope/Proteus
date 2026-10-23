const cache = new WeakMap();
const active = new Set(['queued', 'running', 'awaiting_input']);

function calculate(run, events, managed) {
  let latest = Date.parse(run.createdAt) || 0;
  const unaccepted = new Set();
  const consider = value => { const at = Date.parse(value); if (Number.isFinite(at) && at > latest) latest = at; };
  for (const event of events || []) {
    if (event.role !== 'user') continue;
    const delivery = event.data?.delivery;
    if (!delivery?.state || ['queued', 'delivered', 'steered', 'removed'].includes(delivery.state)) consider(event.at);
    else if (delivery.id) unaccepted.add(delivery.id);
  }
  for (const message of run.queuedMessages || []) if (!unaccepted.has(message.id)) consider(message.at);
  const at = latest > 0 ? new Date(latest).toISOString() : null;
  cache.set(run, {status:run.status, updatedAt:run.updatedAt, createdAt:run.createdAt, at, managed});
  return at;
}

// Engine calls this while events are already resident, after every durable save.
// Summaries then need neither the transcript nor a second disk read after eviction.
export function primeChatActivity(run, events) { return calculate(run, events, true); }

export function chatActivityAt(run) {
  const saved = cache.get(run);
  if (saved && (saved.managed || !active.has(run.status)) && saved.status === run.status && saved.updatedAt === run.updatedAt && saved.createdAt === run.createdAt) return saved.at;
  return calculate(run, run.events, false);
}
