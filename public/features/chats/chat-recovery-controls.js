import {chatRecoveryState} from './chat-recovery-state.js';
import {bindRuntimeTimer,disposeRuntimeTimers} from './runtime.js';
export function mountChatRecovery(node,entry,run,options){
 const state=chatRecoveryState(run),show=options.recover&&['chat','manual','scheduled','schedule'].includes(run.trigger)&&state&&entry.role==='system'&&entry.at===state.eventAt&&entry.text===state.eventText;
 let controls=node.querySelector('.chat-recovery-controls');
 if(!show){if(controls){disposeRuntimeTimers(controls);controls.remove();}return;}
 if(!controls){controls=document.createElement('section');controls.className='chat-recovery-controls';node.append(controls);}
 const signature=JSON.stringify([state.recoverable,state.capacity,state.failureEventAt,state.retry,state.queuedCount]);
 if(controls.signature===signature)return;
 controls.signature=signature;disposeRuntimeTimers(controls);controls.replaceChildren();
 const note=document.createElement('p');note.className='note';note.textContent=state.queuedCount?`${state.queuedCount} queued message${state.queuedCount===1?' is':'s are'} waiting. Continue the interrupted chat; the queue will run after it finishes.`:'Continue this chat from where it left off.';controls.append(note);
 const actions=document.createElement('div');actions.className='actions';controls.append(actions);
 const button=(label,action)=>{const element=document.createElement('button');element.type='button';element.textContent=label;element.onclick=async()=>{for(const item of actions.querySelectorAll('button'))item.disabled=true;try{await options.recover(action,state.failureEventAt);}catch(error){options.notify?.(error.message);}finally{for(const item of actions.querySelectorAll('button'))item.disabled=false;}};actions.append(element);return element;};
 if(state.recoverable)button('Continue chat','continue').className='primary';
 if(state.retry){
  button('Stop retrying','stop-retry');const countdown=document.createElement('span');countdown.className='note';actions.append(countdown);
  bindRuntimeTimer(countdown,()=>state.retry.nextAttemptAt?'Next retry in '+Math.max(0,Math.ceil((Date.parse(state.retry.nextAttemptAt)-Date.now())/1000))+'s':'Retrying…',!!state.retry.nextAttemptAt);
 }else if(state.capacity)button('Retry every 60 seconds','retry');
 options.resize?.();
}
