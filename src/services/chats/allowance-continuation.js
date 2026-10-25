import {randomUUID} from 'node:crypto';
import {revision} from '../scheduling/schedules.js';
import {normalizeProviderUsage} from '../telemetry/usage.js';
import {chatRecoveryState} from '../../../public/features/chats/chat-recovery-state.js';
export const allowanceFailure=error=>['usageLimitExceeded','rateLimitExceeded','usage_limit_reached','rate_limit','quota_exceeded','session_quota_exceeded','user_weekly_rate_limited','user_global_rate_limited','user_model_rate_limited','rate_limited'].includes(error?.code)||/^(?:Claude\s+rate_limit\b)|(?:usage|allowance|premium requests?|quota) (?:limit (?:has been )?(?:reached|exceeded)|exhausted|exceeded|used up)|(?:you(?:'ve| have) (?:hit|reached) your (?:usage|rate) limit)|\b(?:exceeded|exhausted|used up)\b.{0,60}\b(?:quota|allowance|premium requests?)\b/i.test(error?.message||'');
const prompt='Continue this conversation from where the allowance-limited turn left off. Preserve completed work and do not repeat completed external actions. Finish the current work before queued follow-up messages.';
const failed=run=>['failed','interrupted'].includes(run.status)&&!run.archivedAt;
const applicable=(run,windows)=>{
 const model=run.modelCapabilities?.id||run.schedule.model,family=String(model).match(/opus|sonnet|haiku/i)?.[0].toLowerCase();
 return windows.filter(w=>!w.modelId||!model||model==='default'||w.modelId===model).filter(w=>run.schedule.provider!=='claude'||!family||!(/(?:opus|sonnet|haiku)/i.test(w.modelFamily||w.id)&&!(w.modelFamily||w.id).toLowerCase().includes(family)));
};
const fresh=(quota,now)=>quota?.available&&!quota.stale&&!quota.error&&(!quota.observedAt||Number.isFinite(Date.parse(quota.observedAt))&&Math.abs(now-Date.parse(quota.observedAt))<300000);
export function allowanceReset(run,quota,now){
 if(!fresh(quota,now))return null;
 const windows=applicable(run,quota.windows||[]),blocked=windows.filter(w=>w.remainingPercent===0&&!w.unlimited);
 if(!blocked.length||blocked.some(w=>!Number.isFinite(Date.parse(w.resetAt))||Date.parse(w.resetAt)<=now||w.resetSource&&w.resetSource!=='provider'))return null;
 return {resetAt:new Date(Math.max(...blocked.map(w=>Date.parse(w.resetAt)))).toISOString(),windowIds:blocked.map(w=>w.id)};
}
// One owner/runner persists intent and delivery in the same run record. A fresh
// quota check never performs a model turn. Timers scan UTC instants, so long waits,
// restart and sleep do not depend on a renderer or a platform timeout limit.
export class AllowanceContinuation {
 constructor(engine,{readQuota,intervalMs=1000,delayMs=5000}={}){
  Object.assign(this,{engine,delayMs,readQuota:readQuota||this.providerQuota.bind(this)});this.inflight=new Map();
  this.timer=setInterval(()=>void this.tick(),intervalMs);this.timer.unref?.();
 }
 now(){return Date.parse(this.engine.now());}
 fingerprint(run){const schedule=structuredClone(run.schedule);if(schedule.context)delete schedule.context.suppliedAt;const profile=this.engine.describePermissions(run),permissions={id:profile.id,mode:profile.mode,folders:profile.folders,rules:profile.rules,readOnlyTools:profile.readOnlyTools};return revision({schedule,sessionId:run.providerSessionId,permissions,chatPermissionRevision:run.chatPermissionRevision,chatPermission:run.chatPermission});}
 async providerQuota(run){
  const provider=this.engine.providers[run.schedule.provider];if(!provider?.quota)return {available:false};
  let timer;try{return normalizeProviderUsage(run.schedule.provider,await Promise.race([provider.quota(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Allowance check timed out.')),10000);timer.unref?.();})]),this.now());}finally{clearTimeout(timer);}
 }
 isAllowanceFailure(run){const state=chatRecoveryState(run);return !!state&&(run.events.some(e=>e.data?.failure?.kind==='allowance'&&e.at===state.eventAt)||allowanceFailure({message:state.eventText}));}
 onInput(run,messageId){const pending=run.allowanceContinuation?.pending;if(pending&&pending.id!==messageId&&!['delivered','cancelled'].includes(pending.state)){pending.state='cancelled';pending.reason='New input or manual continuation superseded this wait.';}}
 async command(id,{action,enabled,expectedFailureEventAt}={}){
  const run=this.engine.getRun(id);if(this.engine.stopping||this.engine.updateBarrier)throw Error('Wait for the current application transition.');this.engine.updateGuard?.();
  if(!['chat','manual','scheduled','schedule'].includes(run.trigger))throw Error('Open an eligible conversation before configuring allowance continuation.');
  run.allowanceContinuation??={enabled:false};const policy=run.allowanceContinuation;policy.version=(policy.version||0)+1;
  if(action==='allowance-auto'){
   if(typeof enabled!=='boolean')throw Error('Choose whether automatic allowance continuation is enabled.');policy.enabled=enabled;
   if(!enabled&&policy.pending)policy.pending.state='cancelled';this.engine.persist(run);
   if(enabled&&failed(run)&&this.isAllowanceFailure(run))await this.refresh(run,true);return run;
  }
  if(action==='allowance-cancel'){if(policy.pending)policy.pending.state='cancelled';this.engine.persist(run);return run;}
  if(!['allowance-arm','allowance-check'].includes(action)||!failed(run)||run.failureEventAt!==expectedFailureEventAt||!this.isAllowanceFailure(run))throw Error('The allowance failure changed. Refresh this chat before scheduling continuation.');
  await this.refresh(run,action==='allowance-arm');if(action==='allowance-arm'&&!['waiting','delivered'].includes(policy.pending?.state))throw Error(run.allowanceStatus?.note||'A provider-reported reset time is unavailable.');return run;
 }
 async refresh(run,arm=false){
  const failure=run.failureEventAt,signature=this.fingerprint(run),version=run.allowanceContinuation?.version,quota=await this.readQuota(run);
  if(this.engine.stopping||!failed(run)||run.failureEventAt!==failure||this.fingerprint(run)!==signature||run.allowanceContinuation?.version!==version)return;
  const reset=allowanceReset(run,quota,this.now());
  run.allowanceStatus={failureEventAt:failure,...reset,note:reset?null:'Provider-reported allowance reset is unavailable. Manual continuation is still available.',checkedAt:this.engine.now()};
  if(reset&&arm){
   run.allowanceContinuation??={enabled:false};const old=run.allowanceContinuation.pending;
   if(!old||old.failureEventAt!==failure||old.state==='cancelled')run.allowanceContinuation.pending={id:'allowance_'+randomUUID().replaceAll('-',''),state:'waiting',failureEventAt:failure,fingerprint:signature,...reset,nextAttemptAt:new Date(Date.parse(reset.resetAt)+this.delayMs).toISOString()};
  }
  this.engine.persist(run);
 }
 settled(run){if(failed(run)&&this.isAllowanceFailure(run)&&!this.engine.stopping)void this.once(run.id,()=>this.refresh(run,run.allowanceContinuation?.enabled===true));}
 once(id,fn){if(this.inflight.has(id))return this.inflight.get(id);const task=Promise.resolve().then(fn).catch(error=>{const run=this.engine.runs.get(id);if(run&&!this.engine.stopping){run.allowanceStatus={...run.allowanceStatus,note:error.message};try{this.engine.persist(run);}catch{}}}).finally(()=>this.inflight.delete(id));this.inflight.set(id,task);return task;}
 async tick(){
  if(this.engine.stopping||this.engine.updateBarrier)return;
  // Recover opt-in intent if shutdown interrupted discovery before a wait could
  // be saved. A cancelled wait for this failure is never silently re-armed.
  for(const run of this.engine.runs.values())if(run.allowanceContinuation?.enabled&&failed(run)&&run.allowanceContinuation.pending?.failureEventAt!==run.failureEventAt&&!this.inflight.has(run.id)&&(!run.allowanceStatus?.checkedAt||this.now()-Date.parse(run.allowanceStatus.checkedAt)>=60000)&&this.isAllowanceFailure(run))this.settled(run);
  await Promise.all([...this.engine.runs.values()].filter(run=>run.allowanceContinuation?.pending?.state==='waiting'&&Date.parse(run.allowanceContinuation.pending.nextAttemptAt)<=this.now()).map(run=>this.once(run.id,()=>this.attempt(run))));
 }
 async attempt(run){
  const pending=run.allowanceContinuation.pending;
  if(run.events.some(e=>e.data?.delivery?.id===pending.id)){pending.state='delivered';this.engine.persist(run);return;}
  if(!failed(run)||run.failureEventAt!==pending.failureEventAt||this.fingerprint(run)!==pending.fingerprint){pending.state='cancelled';pending.reason='Chat/session or permissions changed.';this.engine.persist(run);return;}
  const quota=await this.readQuota(run);
  // Manual input, permission/context changes and an update can arrive during I/O.
  if(this.engine.stopping||this.engine.updateBarrier)return;
  if(run.allowanceContinuation.pending!==pending||pending.state!=='waiting'||!failed(run)||run.failureEventAt!==pending.failureEventAt||this.fingerprint(run)!==pending.fingerprint)return;
  const windows=applicable(run,quota?.windows||[]),required=pending.windowIds.map(id=>windows.find(w=>w.id===id));
  const ready=fresh(quota,this.now())&&required.every(w=>w&&(w.unlimited||Number.isFinite(w.remainingPercent)&&w.remainingPercent>0))&&!windows.some(w=>w.remainingPercent===0&&!w.unlimited);
  if(!ready){const reset=allowanceReset(run,quota,this.now());Object.assign(pending,reset||{}, {nextAttemptAt:new Date(reset?Date.parse(reset.resetAt)+this.delayMs:this.now()+60000).toISOString(),reason:quota?.error||'Waiting for fresh available allowance.'});this.engine.persist(run);return;}
  pending.state='delivered';pending.dispatchedAt=this.engine.now();
  // A follow-up queued during the failed turn can select a different next model.
  // Recover this turn with its own options; queued messages retain their options.
  try{await this.engine.send(run.id,prompt,'queue',pending.id,run.schedule);}
  catch(error){pending.state='attention';pending.reason='Continuation delivery requires inspection: '+error.message;if(run.status==='queued')run.deferredStart=true;try{this.engine.persist(run);}catch{}throw error;}
 }
 close(){clearInterval(this.timer);return Promise.allSettled([...this.inflight.values()]);}
}
