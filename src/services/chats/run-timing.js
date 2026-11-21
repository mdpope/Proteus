import {randomUUID} from 'node:crypto';
import {turnDuration} from '../../../public/features/chats/runtime.js';

const usageMetrics = ['inputTokens', 'outputTokens'];
const count = value => Number.isSafeInteger(value) && value >= 0;

export function startTurn(run,at){
 if(!run.turns?.length&&run.events?.some(e=>e.role==='assistant'))run.timingPartial=true;
 const turn={id:randomUUID(),startedAt:at,activeSince:at,intervals:[],waits:[],status:'running',
  provider:run.schedule?.provider,model:run.schedule?.model};
 if(run.schedule?.provider!=='codex'||!run.providerSessionId||run.usage?.observed){
  turn.usageBaseline=Object.fromEntries(usageMetrics
   .filter(key=>run.usage?.[key]===undefined||count(run.usage[key]))
   .map(key=>[key,run.usage?.[key]??0]));
 }
 (run.turns??=[]).push(turn);
 return turn;
}

// Adapters call this only when the provider reports usage. Existing historical
// conversation totals are never reported as the latest turn's measurements.
export function recordTurnUsage(run, reported) {
 const turn=run.turns?.at(-1);
 if(!turn?.usageBaseline||turn.finishedAt)return;
 turn.usage=Object.fromEntries(usageMetrics.filter(key=>count(reported?.[key])&&count(run.usage?.[key])&&
  count(turn.usageBaseline[key])&&run.usage[key]>=turn.usageBaseline[key])
  .map(key=>[key,run.usage[key]-turn.usageBaseline[key]]));
}

export function operationTiming(run) {
 const turn=run.turns?.at(-1);
 const actions={queued:'Waiting to start',awaiting_input:'Waiting for your response',completed:'Turn completed',
  failed:'Turn failed',interrupted:'Turn interrupted',cancelled:'Turn cancelled'};
 const working=run.status==='running';
 const latestTool=run.progress?.waitingTools?.at(-1);
 const toolName=typeof latestTool?.name==='string'?latestTool.name.replace(/\s+/g,' ').trim().slice(0,80):'';
 const action=working?(run.progress?.stage==='tool'?(toolName?'Running '+toolName:'Running a tool'):'Working with provider'):actions[run.status];
 if(!action)return null;
 const timings=run.status==='queued'||!turn?{}:{
  turnId:turn.id,provider:turn.provider,model:turn.model,
  activeMs:turnDuration(turn,undefined,false),
  activeSince:working?turn.activeSince:null,
  inputTokens:turn.usage?.inputTokens??null,outputTokens:turn.usage?.outputTokens??null,
  partial:turn.incomplete===true,
 };
 return {
  ...timings,action,
  actionAt:working?(latestTool?.startedAt||run.progress?.stageAt||turn?.activeSince||turn?.startedAt)
   :run.status==='awaiting_input'?turn?.waits?.at(-1)?.startedAt
   :run.status==='queued'?undefined:turn?.finishedAt,
 };
}
export function pauseTurn(run,at,requestId){const turn=run.turns?.at(-1);if(!turn||turn.finishedAt)return;if(turn.activeSince){turn.intervals.push([turn.activeSince,at]);delete turn.activeSince;}turn.waits.push({requestId,startedAt:at});turn.status='waiting';}
export function resumeTurn(run,at){const turn=run.turns?.at(-1);if(!turn||turn.finishedAt)return;const wait=turn.waits.at(-1);if(wait&&!wait.finishedAt)wait.finishedAt=at;turn.activeSince=at;turn.status='running';}
export function finishTurn(run,at,status){const turn=run.turns?.at(-1);if(!turn||turn.finishedAt)return;if(turn.activeSince){turn.intervals.push([turn.activeSince,at]);delete turn.activeSince;}const wait=turn.waits.at(-1);if(wait&&!wait.finishedAt)wait.finishedAt=at;turn.finishedAt=at;turn.status=status;}
// After a crash, the unknown tail is excluded and explicitly marked incomplete.
export function interruptTiming(run){const turn=run.turns?.at(-1);if(!turn||turn.finishedAt)return;delete turn.activeSince;turn.status='interrupted';turn.incomplete=true;turn.finishedAt=run.updatedAt||turn.startedAt;}
