export const capacityFailure=text=>/^Selected model is at capacity(?:[.!]|$)/i.test(String(text||'').trim());
export const activeTimeProviders=Object.freeze(['copilot','claude']);
export const activeTimeContinuationAvailable=run=>activeTimeProviders.includes(run.schedule?.provider)&&(!run.chatControls||(run.chatControls.activeTimeContinuationProviders||['copilot']).includes(run.schedule.provider));
// Older Claude records used a generic error. Recognize only the exact owner
// timeout text, never arbitrary connection/tool timeouts or provider failures.
const legacyClaudeLimit=(run,event)=>run.schedule?.provider==='claude'&&(!event?.data?.failure||event.data.failure.kind==='error')&&event?.text==='Claude exceeded the active execution time limit. Waiting for input was excluded.';
export function chatRecoveryState(run){
 const recoverable=['failed','interrupted'].includes(run.status),retry=run.capacityRetry;
 if(!recoverable&&!retry)return null;
 const events=run.events||[],turn=run.turns?.at(-1),tagged=[...events].reverse().find(event=>event.data?.failure&&(!recoverable||!turn?.startedAt||event.at>=turn.startedAt));
 const finish=run.failureEventAt||run.updatedAt;
 const event=tagged||[...events].reverse().find(event=>event.role==='system'&&!event.data?.tool&&!event.data?.permission&&(!finish||event.at<=finish)&&(!turn?.startedAt||event.at>=turn.startedAt));
 const failure=event?.data?.failure;
 return {recoverable,retry,incompatibleAgents:run.status==='failed'&&failure?.kind==='incompatible-agents'&&Array.isArray(failure.agents)?failure.agents:null,activeTimeLimit:activeTimeProviders.includes(run.schedule?.provider)&&run.status==='failed'&&(failure?.kind==='active-time-limit'||legacyClaudeLimit(run,event)),eventAt:event?.at,eventText:event?.text||'The chat was interrupted. Continue when you are ready.',allowance:event?.data?.failure?.kind==='allowance'||/^Claude rate_limit\b/i.test(event?.text||''),capacity:run.status==='failed'&&(event?.data?.failure?.kind==='capacity'||capacityFailure(event?.text)),failureEventAt:run.failureEventAt||run.updatedAt,queuedCount:run.queuedMessages?.length||0};
}
