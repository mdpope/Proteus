export const capacityFailure=text=>/^Selected model is at capacity(?:[.!]|$)/i.test(String(text||'').trim());
export function chatRecoveryState(run){
 const recoverable=['failed','interrupted'].includes(run.status),retry=run.capacityRetry;
 if(!recoverable&&!retry)return null;
 const events=run.events||[],turn=run.turns?.at(-1),tagged=[...events].reverse().find(event=>event.data?.failure&&(!recoverable||!turn?.startedAt||event.at>=turn.startedAt));
 const finish=run.failureEventAt||run.updatedAt;
 const event=tagged||[...events].reverse().find(event=>event.role==='system'&&!event.data?.tool&&!event.data?.permission&&(!finish||event.at<=finish)&&(!turn?.startedAt||event.at>=turn.startedAt));
 return {recoverable,retry,eventAt:event?.at,eventText:event?.text||'The chat was interrupted. Continue when you are ready.',allowance:event?.data?.failure?.kind==='allowance'||/^Claude rate_limit\b/i.test(event?.text||''),capacity:run.status==='failed'&&(event?.data?.failure?.kind==='capacity'||capacityFailure(event?.text)),failureEventAt:run.failureEventAt||run.updatedAt,queuedCount:run.queuedMessages?.length||0};
}
