const active = new Set(['queued', 'running', 'awaiting_input']);

// Read the same execution ownership used by the idle guard. Background slots
// are keyed by lane, so their values (not their keys) identify blocking chats.
export function updateIdleBlockers(engine, job, owner = [], building = null) {
 const running = new Set(engine.running?.keys() || []);
 const background = new Set([...engine.backgroundRuns?.values() || []].map(slot => slot.id).filter(Boolean));
 const runs = new Map(engine.listRuns().map(run => [run.id, run]));
 for (const id of [...running, ...background]) if (!runs.has(id)) runs.set(id, {id, status:'unknown'});
 const blockers = [];
 for (const run of runs.values()) {
  const reasons = [];
  if (active.has(run.status)) reasons.push({code:run.status, text:run.status === 'awaiting_input' ? 'Waiting for an answer or tool approval.' : run.status === 'queued' ? 'Queued work has not finished.' : 'A model turn is active.'});
  if (run.capacityRetry) reasons.push({code:'capacity-retry', text:'Automatic capacity retry is pending.', ...(Number.isFinite(Date.parse(run.capacityRetry.nextAttemptAt)) ? {nextAttemptAt:run.capacityRetry.nextAttemptAt} : {})});
  if (running.has(run.id)) reasons.push({code:'execution', text:'The execution process has not finished.'});
  if (background.has(run.id)) reasons.push({code:'background', text:'Background execution is still active.'});
  if (!reasons.length) continue;
  const coordinator = run.id === job.runId;
  blockers.push({kind:'chat', chatId:run.id, title:run.title || run.schedule?.name || 'Untitled chat', status:run.status, coordinator, reasons,
   nextStep:coordinator ? 'Let this update coordinator finish its turn; it also blocks restart while active.' : run.status === 'awaiting_input' ? 'Review the pending question or approval in this chat. Only the operator can decide a tool approval.' : 'Let this work finish. Opening its chat lets you inspect its progress.'});
 }
 if (building?.job?.running || building?.job?.phase === 'starting') blockers.push({kind:'build', title:'Windows release build', status:building.job.phase, reasons:[{code:'build', text:'The release build is still running.'}], nextStep:'Wait for the build to finish; inspect its build status for progress.'});
 for (const reason of owner) blockers.push({kind:'owner', title:'Application activity', reasons:[{code:'owner', text:String(reason)}], nextStep:'Let the named operation finish. If it appears stuck, inspect that operation before taking action.'});
 return blockers;
}

export const updateBlockerText = blocker => blocker.kind === 'chat'
 ? `${blocker.title} (Chat ${blocker.chatId}) is ${blocker.status}: ${blocker.reasons.map(reason => reason.text).join(' ')}`
 : blocker.reasons.map(reason => reason.text).join(' ');
