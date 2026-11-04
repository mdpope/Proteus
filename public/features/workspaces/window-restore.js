// Startup restoration for one app window. The saved session stays authoritative
// until restoration succeeds, because saves and owner sync are held until then.
// A step that fails or hangs must end in a retry or an explicit recoverable state,
// never a silent window that looks empty. Stages are fixed labels for diagnostics;
// no titles, URLs or error text leave this module.
export const restoreRetryDelays=[500,1500,4000,10000];
export const restoreStepTimeoutMs=20000;

export class RestoreStepError extends Error{
 constructor(stage,cause){super(cause?.message||'The saved window could not be restored.');this.name='RestoreStepError';this.stage=stage;this.cause=cause;}
}
/** Settle within `ms`. The step keeps running; the caller decides what a late result means. */
export function withDeadline(promise,ms,stage,timers=globalThis){
 let timer;
 const deadline=new Promise((_,reject)=>{timer=timers.setTimeout(()=>reject(new RestoreStepError(stage,new Error('Timed out restoring this window.'))),ms);});
 return Promise.race([promise,deadline]).finally(()=>timers.clearTimeout(timer));
}
export const step=(stage,run,ms=restoreStepTimeoutMs,timers=globalThis)=>withDeadline(Promise.resolve().then(run),ms,stage,timers).catch(error=>{throw error instanceof RestoreStepError?error:new RestoreStepError(stage,error);});

/**
 * Runs `attempt` until it succeeds, then stops. After the bounded delays the window
 * stays in `failed` until `retry()`. Concurrent starts share one running attempt.
 */
export function createWindowRestore({attempt,onChange=()=>{},report=()=>{},delays=restoreRetryDelays,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 let status='pending',stage=null,running=null,attempts=0,generation=0;
 const set=(next,failedStage=null)=>{status=next;stage=failedStage;onChange({status,stage,attempts});};
 async function run(mine){
  for(let index=0;;index++){
   attempts++;
   try{await attempt();if(mine!==generation)return;const recovered=attempts>1;set('restored');if(recovered)report({outcome:'recovered',attempts});return;}
   catch(error){
    if(mine!==generation)return;
    const failedStage=error?.stage||'unknown';report({outcome:'failed',stage:failedStage,attempts});
    if(index>=delays.length){set('failed',failedStage);return;}
    set('retrying',failedStage);await wait(delays[index]);if(mine!==generation)return;
   }
  }
 }
 return {
  start(){if(running)return running;const mine=++generation;running=run(mine).finally(()=>{if(mine===generation)running=null;});return running;},
  retry(){if(status==='restored')return Promise.resolve();generation++;running=null;attempts=0;set('pending');return this.start();},
  status:()=>({status,stage,attempts}),
  ready:()=>status==='restored',
 };
}
/** Browser children that could not be created are retained, never dropped from the session. */
export function failedChildInfo(tab,id=tab.id){
 return {id,url:tab.url||'',title:tab.label||'',history:tab.history,profileId:tab.profileId||'default',parentId:tab.parentId||null,hidden:tab.hidden===true,loaded:false,persist:tab.persist===true,audioMuted:tab.audioMuted===true,favicon:tab.favicon,openedAt:tab.openedAt,lastTouchedAt:tab.lastTouchedAt,lastActivityAt:tab.lastActivityAt,associationChatId:tab.associationChatId||null,navigationPending:tab.navigationPending===true};
}
/** Merge a restored session with tabs the human opened while the window was not ready. */
export function mergeOpenedTabs(restored,current){
 const known=new Set(restored.map(tab=>tab.id));
 return [...restored,...current.filter(tab=>tab.type!=='overview'&&!known.has(tab.id))];
}
