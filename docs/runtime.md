# Active execution runtime

New turns persist a stable ID, completed active intervals, an active start, human waits and terminal
status. Waiting for input/approval closes the active interval; answering opens a new one. Queue
wait and time between turns are excluded. Tool/group timing intersects reported tool intervals
with active turn intervals and unions overlaps. This is orchestration runtime, not provider
inference latency or a billable usage estimate.

Desktop, web and native timers update once per second without announcing each tick to assistive
technology. Remote clients offset local clocks using the host observation timestamp. Offline
clients omit unverified live tails. A crash closes timing as partial without inventing its unknown
tail. Old chats without interval records show Unavailable; continuing an older chat marks the total
partial. Completed timing is persisted and never reconstructed from message spacing.

Question history persists the original text, offered options/descriptions, a Proteus request ID,
provider question ID when available, and the reply/cancellation status. New answer events link to
that ID. Older unanswered metadata cannot be reconstructed when the provider did not retain it.
