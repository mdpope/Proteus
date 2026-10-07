import {randomUUID} from 'node:crypto';
export function startTurn(run,at){if(!run.turns?.length&&run.events?.some(e=>e.role==='assistant'))run.timingPartial=true;const turn={id:randomUUID(),startedAt:at,activeSince:at,intervals:[],waits:[],status:'running'};(run.turns??=[]).push(turn);return turn;}
export function pauseTurn(run,at,requestId){const turn=run.turns?.at(-1);if(!turn||turn.finishedAt)return;if(turn.activeSince){turn.intervals.push([turn.activeSince,at]);delete turn.activeSince;}turn.waits.push({requestId,startedAt:at});turn.status='waiting';}
export function resumeTurn(run,at){const turn=run.turns?.at(-1);if(!turn||turn.finishedAt)return;const wait=turn.waits.at(-1);if(wait&&!wait.finishedAt)wait.finishedAt=at;turn.activeSince=at;turn.status='running';}
export function finishTurn(run,at,status){const turn=run.turns?.at(-1);if(!turn||turn.finishedAt)return;if(turn.activeSince){turn.intervals.push([turn.activeSince,at]);delete turn.activeSince;}const wait=turn.waits.at(-1);if(wait&&!wait.finishedAt)wait.finishedAt=at;turn.finishedAt=at;turn.status=status;}
// After a crash, the unknown tail is excluded and explicitly marked incomplete.
export function interruptTiming(run){const turn=run.turns?.at(-1);if(!turn||turn.finishedAt)return;delete turn.activeSince;turn.status='interrupted';turn.incomplete=true;turn.finishedAt=run.updatedAt||turn.startedAt;}
