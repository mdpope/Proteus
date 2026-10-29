import { executionSafeguardMs } from '../../providers/execution-policy.js';
const meaningfulTools=run=>(run.events||[]).slice(-100).filter(event=>event.data?.tool).map(event=>event.data.tool);
export function startProgress(run,at){run.progress={startedAt:at,lastProgressAt:at,lastProviderEventAt:at,stage:'provider',stalled:false};}
/** A persisted user message is not evidence that a provider or tool is advancing. */
export function providerProgress(run,at,{observable=false}={}){
 if(!run.progress)return;
 const tools=meaningfulTools(run),activity=(run.events||[]).slice(-100).filter(event=>event.data?.activity).map(event=>event.data.activity);
 // Phase heartbeats advance only on received provider events, never on the UI
 // elapsed-time timer. Long observable reasoning must not look like a stall.
 const signature=JSON.stringify([tools.map(tool=>[tool.callId,tool.status,tool.finishedAt,tool.durationMs]),activity.map(row=>[row.id,row.status,row.finishedAt,row.lastObservedAt])]);
 if(observable||run.progress.toolSignature!==signature){run.progress.lastProgressAt=at;run.progress.stalled=false;delete run.progress.stalledSince;}
 run.progress.lastProviderEventAt=at;run.progress.toolSignature=signature;
 const running=tools.filter(tool=>tool.status==='running');
 run.progress.stage=running.length?'tool':'provider';
 run.progress.waitingTools=running.map(tool=>({id:tool.callId,name:tool.name,startedAt:tool.startedAt}));
}
export function checkProgress(run,at,{stallMs=5*60_000,timeoutMs=executionSafeguardMs}={}){
 if(run.status!=='running'||run.pending||!run.progress)return null;
 const elapsed=Date.parse(at)-Date.parse(run.progress.lastProgressAt);
 if(!Number.isFinite(elapsed)||elapsed<stallMs)return null;
 const changed=!run.progress.stalled;run.progress.stalled=true;run.progress.stalledSince||=at;
 return {changed,timedOut:elapsed>=timeoutMs,elapsed};
}
