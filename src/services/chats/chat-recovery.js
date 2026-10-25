import {revision} from '../scheduling/schedules.js';
import {chatRecoveryState} from '../../../public/features/chats/chat-recovery-state.js';
const continuation='Continue this conversation from where the interrupted turn left off. Preserve completed work and do not repeat completed external actions. Finish the current work before processing queued follow-up messages.';
// Explicit per-chat opt-in, owned by the sole runner. Never restore timers on
// launch, replay a failed prompt, change model, or approve a pending request.
export class ChatRecovery {
 constructor(engine,{setTimer=setTimeout,clearTimer=clearTimeout,intervalMs=60000}={}){Object.assign(this,{engine,setTimer,clearTimer,intervalMs});this.policies=new Map();}
 fingerprint(run){return revision({schedule:run.schedule,chatPermissionRevision:run.chatPermissionRevision,chatPermission:run.chatPermission});}
 state(run,expected){
  const state=chatRecoveryState(run);
  if(!state?.recoverable||state.failureEventAt!==expected||this.engine.running.has(run.id)||[...this.engine.backgroundRuns.values()].some(slot=>slot.id===run.id))throw Error('This chat changed. Refresh before continuing.');
  return state;
 }
 stop(id,persist=true){const policy=this.policies.get(id);if(policy)this.clearTimer(policy.timer);this.policies.delete(id);const run=this.engine.runs.get(id);if(run?.capacityRetry){delete run.capacityRetry;if(persist)this.engine.persist(run);}return run;}
 command(id,{action,expectedFailureEventAt,modelOptions,enabled}={}){
  const run=this.engine.getRun(id);
  if(action?.startsWith('allowance-'))return this.engine.allowance.command(id,{action,enabled,expectedFailureEventAt});
  if(action==='stop-retry')return this.stop(id)||run;
  if(this.engine.stopping||this.engine.updateBarrier)throw Error('Wait for the current application update before continuing.');this.engine.updateGuard?.();
  const state=this.state(run,expectedFailureEventAt);
  if(run.archivedAt||!['chat','manual','scheduled','schedule'].includes(run.trigger))throw Error('Open an eligible conversation before continuing.');
  if(action==='continue'){
   this.stop(id,false);if(modelOptions)this.engine.applyModelOptions(run,modelOptions);
   return this.engine.resume(id,continuation);
  }
  if(action!=='retry'||!state.capacity)throw Error('Automatic retry is available only for a model-capacity failure.');
  if(this.policies.has(id))return run;
  const policy={fingerprint:this.fingerprint(run),sessionId:run.providerSessionId,attempts:0};this.policies.set(id,policy);this.schedule(run,policy);return run;
 }
 schedule(run,policy){
  this.clearTimer(policy.timer);run.failureEventAt||=run.updatedAt;policy.failureEventAt=run.failureEventAt;
  run.capacityRetry={nextAttemptAt:new Date(Date.parse(this.engine.now())+this.intervalMs).toISOString(),attempts:policy.attempts};
  this.engine.persist(run);policy.timer=this.setTimer(()=>this.attempt(run.id,policy),this.intervalMs);policy.timer?.unref?.();
 }
 attempt(id,policy){
  if(this.policies.get(id)!==policy||this.engine.stopping)return;
  const run=this.engine.runs.get(id);
  try{
   const state=run&&this.state(run,policy.failureEventAt);
   if(!state?.capacity||run.archivedAt||this.fingerprint(run)!==policy.fingerprint||policy.sessionId&&run.providerSessionId!==policy.sessionId)return void this.stop(id);
   if(this.engine.updateBarrier)throw Error('Update in progress.');this.engine.updateGuard?.();policy.attempts++;run.capacityRetry={nextAttemptAt:null,attempts:policy.attempts};
   this.engine.resume(id,continuation,{keepCapacityRetry:true});
  }catch{this.stop(id);}
 }
 settled(run){
  const policy=this.policies.get(run.id);if(!policy)return;
  if(!this.engine.stopping&&chatRecoveryState(run)?.capacity&&run.status==='failed'&&!run.archivedAt&&this.fingerprint(run)===policy.fingerprint&&(!policy.sessionId||policy.sessionId===run.providerSessionId)){policy.sessionId??=run.providerSessionId;this.schedule(run,policy);}
  else this.stop(run.id);
 }
 close(){for(const id of [...this.policies.keys()])this.stop(id);}
}
